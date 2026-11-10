/**
 * gallery/index.js — 在线图库的**编排层**：抓预览 → 下载 → （可选）无损压缩 → 落进上传目录。
 *
 * 落盘位置是**上传目录本身（扁平）**：插件的自定义壁纸枚举（`enumerateUploadsP`）是平扫，
 * 放子目录会「下载成功但插件看不到」。文件名 `gallery-<url sha1 前 10 位>.<ext>` 天然去重。
 *
 * 缩略图这一层有三道保护（Picsum 的列表项是 5000×3333 原图，24 张并发会把代理打爆）：
 *   ① `thumbUrlFor()` 对已知图库改写小尺寸（Picsum /id|/seed 的 w/h 换成 480×320）；
 *   ② 磁盘缓存 `cache/gallery-thumbs/<sha1>.<ext>` —— 第二次打开页签直接命中；
 *   ③ 并发闸 4 + 单张 12MB / 25s 上限。
 */
import { createHash } from 'node:crypto';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeEndpoint, fetchWithLimit, extForContentType, sniffImageExt } from './net.js';
import { parseItems } from './parse.js';
import { compressLossless, compressLossy } from './compress.js';
import { resolveGalleryFfmpeg, spawnGalleryFfmpeg } from './ffmpeg.js';
import { configPath, pluginDataDir } from '../kernel/data-dir.js';

const MAX_ITEMS = 50;
/** 上传目录只认这几种扩展名（lib/upload-dir.js 的 UPLOAD_FILE_RE）：其它格式先转 PNG 再落盘。 */
const UPLOAD_ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png']);
/** 落盘文件名前缀必须匹配 up-[a-z0-9-]+，否则壁纸页枚举不到（上一版「下载了但看不见」就是这条）。 */
const UPLOAD_PREFIX = 'up-gallery-';
const MAX_ITEM_BYTES = 32 * 1024 * 1024;
const THUMB_BYTES = 12 * 1024 * 1024;

/** 上传目录解析链（与 lib/upload-dir.js 同序）：env → config.uploadDir → <数据目录>/uploads */
function resolveUploadDir() {
  const env = process.env.DSH_WE_UPLOAD_DIR;
  if (env) return env;
  try {
    const cfg = JSON.parse(readFileSync(configPath(), 'utf8'));
    if (cfg && typeof cfg.uploadDir === 'string' && cfg.uploadDir.trim()) return cfg.uploadDir.trim();
  } catch { /* ignore */ }
  return join(pluginDataDir(), 'uploads');
}

/** 缩略图缓存目录（不进媒体扫描面，纯缓存）。 */
function thumbCacheDir() { return join(pluginDataDir(), 'cache', 'gallery-thumbs'); }

/** 已知图库的**小图**改写（Picsum 列表项是原图尺寸）。 */
export function thumbUrlFor(url) {
  try {
    const u = new URL(String(url));
    if (/^picsum\.photos$/i.test(u.hostname)) {
      const m = /^\/(id|seed)\/([^/]+)\/\d+\/\d+$/.exec(u.pathname);
      if (m) return u.origin + '/' + m[1] + '/' + m[2] + '/480/320';
    }
  } catch { /* ignore */ }
  return String(url);
}

/** 简单并发闸。 */
function createLimiter(n) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= n || queue.length === 0) return;
    active += 1;
    const job = queue.shift();
    job.run().then(job.resolve, job.reject).finally(() => { active -= 1; next(); });
  };
  return (run) => new Promise((resolve, reject) => { queue.push({ run, resolve, reject }); next(); });
}

function parseHeaders(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  try {
    const v = JSON.parse(String(raw));
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    throw new Error('x');
  } catch { throw new Error('请求头必须是 JSON 对象，例如 {"Authorization":"Bearer xxx"}'); }
}

/** @param {{ log?: Function }} deps */
export function createGalleryKit(deps = {}) {
  const log = typeof deps.log === 'function' ? deps.log : null;
  const thumbLimit = createLimiter(4);

  async function preview(input) {
    const u = normalizeEndpoint(input.endpoint, { allowPrivate: input.allowPrivate === true });
    const headers = parseHeaders(input.headers);
    const res = await fetchWithLimit(u, { headers, accept: 'application/json, image/*' });
    if (!res.ok) throw new Error('接口返回 HTTP ' + res.status);
    const first = parseItems({ body: res.body, contentType: res.contentType, finalUrl: res.finalUrl, format: input.format, jsonPath: input.jsonPath, count: input.count });
    // 单图接口（樱道 / 随机图直出）只能给一张 ⇒ 重复拉取补足（随机图每次不同）。
    const want = Math.max(1, Math.min(24, Number(input.count) || 12));
    if (first.items.length >= want || (first.format !== 'image' && first.format !== 'json-single')) return first;
    const seen = new Set(first.items.map((it) => it.url));
    const items = first.items.slice();
    let misses = 0;
    while (items.length < want && misses < 6) {
      const need = Math.min(8, want - items.length);
      const batch = await Promise.all(Array.from({ length: need }, () => thumbLimit(async () => {
        try {
          const r = await fetchWithLimit(u, { headers, accept: 'application/json, image/*' });
          if (!r.ok) return null;
          const one = parseItems({ body: r.body, contentType: r.contentType, finalUrl: r.finalUrl, format: input.format, jsonPath: input.jsonPath, count: 1 });
          return one.items[0] || null;
        } catch { return null; }
      })));
      let added = 0;
      for (const it of batch) {
        if (!it || !it.url || seen.has(it.url)) continue;
        seen.add(it.url);
        items.push(it);
        added += 1;
        if (items.length >= want) break;
      }
      if (added === 0) misses += 1;
    }
    return { items, format: first.format, note: '单图接口 · 已重复拉取补足' };
  }

  async function probe(endpoint, allowPrivate) {
    const u = normalizeEndpoint(endpoint, { allowPrivate: allowPrivate === true });
    const res = await fetchWithLimit(u, { timeoutMs: 15000, maxBytes: 2 * 1024 * 1024, accept: 'application/json, image/*' });
    return { ok: res.ok, status: res.status, contentType: res.contentType, bytes: res.body.length, finalUrl: res.finalUrl };
  }

  async function thumb(url, allowPrivate) {
    const target = thumbUrlFor(url);
    const hash = createHash('sha1').update(target).digest('hex');
    const dir = thumbCacheDir();
    try { await mkdir(dir, { recursive: true }); } catch { /* ignore */ }
    for (const ext of ['jpg', 'png', 'webp', 'gif', 'avif', 'bmp']) {
      try {
        const buf = readFileSync(join(dir, hash + '.' + ext));
        if (buf && buf.length) return { body: buf, contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) };
      } catch { /* miss */ }
    }
    const res = await thumbLimit(() => fetchWithLimit(normalizeEndpoint(target, { allowPrivate: allowPrivate === true }), { timeoutMs: 25000, maxBytes: THUMB_BYTES, accept: 'image/*' }));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ext = extForContentType(res.contentType) || sniffImageExt(res.body);
    if (!ext) throw new Error('不是图片（content-type=' + res.contentType + '）');
    try { writeFileSync(join(dir, hash + '.' + ext), res.body); } catch { /* best-effort */ }
    return { body: res.body, contentType: res.contentType };
  }

  /** 把旧命名（gallery-xxx.ext，枚举不到）就地改成 up-gallery-xxx.ext。幂等。 */
  async function migrateLegacyNames(dir) {
    let renamed = 0;
    try {
      const fsp = await import('node:fs/promises');
      for (const name of await fsp.readdir(dir)) {
        const m = /^gallery-([a-z0-9]{6,16})\.(jpg|jpeg|png|webp|avif|gif|bmp)$/i.exec(name);
        if (!m) continue;
        const ext = m[2].toLowerCase();
        const next = UPLOAD_PREFIX + m[1] + '.' + (UPLOAD_ALLOWED_EXT.has(ext) ? ext : 'png');
        try { await fsp.rename(join(dir, name), join(dir, next)); renamed += 1; } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    return renamed;
  }

  async function download(input) {
    const items = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS) : [];
    if (items.length === 0) throw new Error('没有选中任何图片');
    const allowPrivate = input.allowPrivate === true;
    const mode = input.compress === 'off' ? 'off' : (input.compress === 'lossless' ? 'lossless' : 'lossy');
    const compress = mode !== 'off';
    const dir = resolveUploadDir();
    await mkdir(dir, { recursive: true });
    try { await migrateLegacyNames(dir); } catch { /* best-effort */ }
    const ffmpeg = compress ? resolveGalleryFfmpeg() : null;
    const out = { saved: 0, skipped: 0, failed: [], bytesBefore: 0, bytesAfter: 0, compressed: 0, compressMode: compress ? (ffmpeg ? mode : 'unavailable') : 'off' };
    for (const raw of items) {
      const url = typeof raw === 'string' ? raw : String((raw && raw.url) || '');
      if (!url) { out.failed.push({ url: '', error: '空地址' }); continue; }
      try {
        const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
        const res = await fetchWithLimit(normalizeEndpoint(url, { allowPrivate }), { maxBytes: MAX_ITEM_BYTES, accept: 'image/*' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let ext = extForContentType(res.contentType) || sniffImageExt(res.body);
        if (!ext) throw new Error('不是图片（content-type=' + res.contentType + '）');
        // 非 jpg/png（webp / avif / gif / bmp）⇒ 先转 PNG（无损），否则壁纸页枚举不到。
        if (!UPLOAD_ALLOWED_EXT.has(ext)) {
          const ff = ffmpeg || resolveGalleryFfmpeg();
          if (!ff) throw new Error('该格式需要转码，但 ffmpeg 不可用');
          const src = join(dir, UPLOAD_PREFIX + hash + '.src.' + ext);
          await writeFile(src, res.body);
          const dst = join(dir, UPLOAD_PREFIX + hash + '.png');
          await spawnGalleryFfmpeg(ff, ['-y', '-i', src, '-c:v', 'png', '-map_metadata', '-1', '-f', 'image2', dst], 60000);
          try { const fsp2 = await import('node:fs/promises'); await fsp2.rm(src, { force: true }); } catch { /* ignore */ }
          ext = 'png';
        }
        const file = join(dir, UPLOAD_PREFIX + hash + '.' + ext);
        try { await access(file); out.skipped += 1; continue; } catch { /* new */ }
        await writeFile(file, res.body);
        let after = res.body.length;
        out.bytesBefore += res.body.length;
        if (ffmpeg && mode === 'lossless') {
          const r = await compressLossless({ file, ext, ffmpeg, spawnFfmpeg: spawnGalleryFfmpeg, before: res.body.length });
          if (r.applied) { out.compressed += 1; after = r.after; }
        } else if (ffmpeg && mode === 'lossy') {
          // 有损档：统一转 JPEG（-q:v 2）。成功则删掉原文件、以 .jpg 命名落盘。
          const outFile = join(dir, UPLOAD_PREFIX + hash + '.jpg');
          const r = await compressLossy({ file, ext, ffmpeg, spawnFfmpeg: spawnGalleryFfmpeg, outFile });
          if (r && r.bytes < res.body.length) {
            try { const fsp3 = await import('node:fs/promises'); await fsp3.rm(file, { force: true }); } catch { /* ignore */ }
            out.compressed += 1;
            after = r.bytes;
          } else if (r) {
            try { const fsp4 = await import('node:fs/promises'); await fsp4.rm(outFile, { force: true }); } catch { /* ignore */ }
          }
        }
        out.bytesAfter += after;
        out.saved += 1;
      } catch (err) {
        out.failed.push({ url, error: String((err && err.message) || err) });
      }
    }
    if (log) log('gallery: saved=' + out.saved + ' skipped=' + out.skipped + ' failed=' + out.failed.length + ' mode=' + out.compressMode);
    return out;
  }

  return { preview, probe, thumb, download, MAX_ITEMS };
}
