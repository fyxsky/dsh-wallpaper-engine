/**
 * gallery/index.js — 在线图库的**编排层**：抓预览 → 下载 → （可选）无损压缩 → 落进上传目录。
 *
 * 落盘位置是**上传目录本身（扁平）**：插件的自定义壁纸枚举（`enumerateUploadsP`）是平扫，
 * 放子目录会「下载成功但插件看不到」。文件名 `gallery-<url sha1 前 10 位>.<ext>` 天然去重。
 */
import { createHash } from 'node:crypto';
import { writeFile, access, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeEndpoint, fetchWithLimit, extForContentType, sniffImageExt } from './net.js';
import { parseItems } from './parse.js';
import { compressLossless } from './compress.js';
import { resolveGalleryFfmpeg, spawnGalleryFfmpeg } from './ffmpeg.js';
import { configPath, pluginDataDir } from '../kernel/data-dir.js';

const MAX_ITEMS = 50;
const MAX_ITEM_BYTES = 32 * 1024 * 1024;

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

  async function preview(input) {
    const u = normalizeEndpoint(input.endpoint, { allowPrivate: input.allowPrivate === true });
    const res = await fetchWithLimit(u, { headers: parseHeaders(input.headers), accept: 'application/json, image/*' });
    if (!res.ok) throw new Error('接口返回 HTTP ' + res.status);
    return parseItems({ body: res.body, contentType: res.contentType, finalUrl: res.finalUrl, format: input.format, jsonPath: input.jsonPath, count: input.count });
  }

  async function probe(endpoint, allowPrivate) {
    const u = normalizeEndpoint(endpoint, { allowPrivate: allowPrivate === true });
    const res = await fetchWithLimit(u, { timeoutMs: 15000, maxBytes: 2 * 1024 * 1024, accept: 'application/json, image/*' });
    return { ok: res.ok, status: res.status, contentType: res.contentType, bytes: res.body.length, finalUrl: res.finalUrl };
  }

  async function thumb(url, allowPrivate) {
    const u = normalizeEndpoint(url, { allowPrivate: allowPrivate === true });
    const res = await fetchWithLimit(u, { timeoutMs: 20000, maxBytes: MAX_ITEM_BYTES, accept: 'image/*' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const ext = extForContentType(res.contentType) || sniffImageExt(res.body);
    if (!ext) throw new Error('不是图片（content-type=' + res.contentType + '）');
    return { body: res.body, contentType: res.contentType };
  }

  async function download(input) {
    const items = Array.isArray(input.items) ? input.items.slice(0, MAX_ITEMS) : [];
    if (items.length === 0) throw new Error('没有选中任何图片');
    const allowPrivate = input.allowPrivate === true;
    const compress = input.compress !== 'off';
    const dir = resolveUploadDir();
    await mkdir(dir, { recursive: true });
    const ffmpeg = compress ? resolveGalleryFfmpeg() : null;
    const out = { saved: 0, skipped: 0, failed: [], bytesBefore: 0, bytesAfter: 0, compressed: 0, compressMode: compress ? (ffmpeg ? 'lossless' : 'unavailable') : 'off' };
    for (const raw of items) {
      const url = typeof raw === 'string' ? raw : String((raw && raw.url) || '');
      if (!url) { out.failed.push({ url: '', error: '空地址' }); continue; }
      try {
        const hash = createHash('sha1').update(url).digest('hex').slice(0, 10);
        const res = await fetchWithLimit(normalizeEndpoint(url, { allowPrivate }), { maxBytes: MAX_ITEM_BYTES, accept: 'image/*' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ext = extForContentType(res.contentType) || sniffImageExt(res.body);
        if (!ext) throw new Error('不是图片（content-type=' + res.contentType + '）');
        const file = join(dir, 'gallery-' + hash + '.' + ext);
        try { await access(file); out.skipped += 1; continue; } catch { /* new */ }
        await writeFile(file, res.body);
        let after = res.body.length;
        out.bytesBefore += res.body.length;
        if (ffmpeg) {
          const r = await compressLossless({ file, ext, ffmpeg, spawnFfmpeg: spawnGalleryFfmpeg, before: res.body.length });
          if (r.applied) { out.compressed += 1; after = r.after; }
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
