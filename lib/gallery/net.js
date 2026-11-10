/**
 * gallery/net.js — 在线图库的**抓取层**（只在宿主里跑）。
 *
 * 为什么放在宿主而不是浏览器：① 绕开 CORS 与防盗链（Referer）；② 允许自定义
 * Authorization 头而**不把它发给渲染进程**；③ 下载与落盘必须是宿主的活。
 *
 * ⚠️ 安全边界（本模块存在的理由之一）：接口地址由用户填写 ⇒ 宿主会去抓任意 URL。
 * 所以这里强制 ① 只允许 http/https；② 默认**拒绝内网/本机**（10/8、172.16/12、
 * 192.168/16、127/8、169.254/16、::1、*.local），除非用户在设置里显式打开
 * 「允许内网」（自建图床 / 局域网 NAS 的场景）。没有这道闸，插件就等于一个
 * 任意 URL 抓取器（SSRF）。
 */

const PRIVATE_HOST_RES = [
  /^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^0\.0\.0\.0$/, /^\[?::1\]?$/, /\.local$/i,
];

/** @param {string} host @returns {boolean} 是否为内网/本机主机名 */
export function hostIsPrivate(host) {
  const h = String(host || '').toLowerCase();
  return PRIVATE_HOST_RES.some((re) => re.test(h));
}

/**
 * 归一 + 校验用户填的接口地址。
 * @param {unknown} raw
 * @param {{ allowPrivate?: boolean }} [opts]
 * @returns {URL}
 * @throws {Error} 非法协议 / 内网被拒
 */
export function normalizeEndpoint(raw, opts = {}) {
  let u;
  try { u = new URL(String(raw == null ? '' : raw).trim()); } catch { throw new Error('接口地址不是合法 URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('只支持 http / https 接口');
  if (!opts.allowPrivate && hostIsPrivate(u.hostname)) {
    throw new Error('默认禁止访问内网/本机地址（需要时在设置里打开「允许内网」）');
  }
  return u;
}

/**
 * 抓一次（跟随重定向、带超时与体积上限）。
 * @param {string|URL} url
 * @param {{ headers?: Record<string,string>, timeoutMs?: number, maxBytes?: number, accept?: string }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, contentType: string, body: Buffer, finalUrl: string }>}
 */
/** 需要带 Referer 的站点（防盗链）。命中时补上，避免 403。 */
const REFERER_HOSTS = [['qhimg.com', 'http://wallpaper.apc.360.cn/'], ['apc.360.cn', 'http://wallpaper.apc.360.cn/']];
function refererFor(host) {
  const h = String(host || '').toLowerCase();
  for (const [suffix, ref] of REFERER_HOSTS) if (h === suffix || h.endsWith('.' + suffix)) return ref;
  return '';
}

export async function fetchWithLimit(url, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 30000;
  const maxBytes = Number(opts.maxBytes) > 0 ? Number(opts.maxBytes) : 32 * 1024 * 1024;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    let host = '';
    try { host = new URL(String(url)).hostname; } catch { /* ignore */ }
    const autoReferer = refererFor(host);
    const headers = {
      'user-agent': 'dsh-wallpaper-engine/gallery (+local)',
      ...(autoReferer ? { referer: autoReferer } : {}),
      ...(opts.accept ? { accept: opts.accept } : {}),
      ...(opts.headers && typeof opts.headers === 'object' ? opts.headers : {}),
    };
    const res = await fetch(String(url), { redirect: 'follow', signal: ac.signal, headers });
    const ct = String(res.headers.get('content-type') || '');
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > maxBytes) throw new Error('响应过大（' + Math.round(declared / 1048576) + ' MB，上限 ' + Math.round(maxBytes / 1048576) + ' MB）');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) throw new Error('响应过大（超过 ' + Math.round(maxBytes / 1048576) + ' MB）');
    return { ok: res.ok, status: res.status, contentType: ct, body: buf, finalUrl: res.url || String(url) };
  } finally {
    clearTimeout(timer);
  }
}

/** 响应类型 → 落盘后缀（认不出的按内容嗅探兜底）。 */
export function extForContentType(ct) {
  const t = String(ct || '').toLowerCase();
  if (t.includes('image/jpeg')) return 'jpg';
  if (t.includes('image/png')) return 'png';
  if (t.includes('image/webp')) return 'webp';
  if (t.includes('image/avif')) return 'avif';
  if (t.includes('image/gif')) return 'gif';
  if (t.includes('image/bmp')) return 'bmp';
  if (t.includes('image/svg')) return 'svg';
  return '';
}

/** 按文件头嗅探图片后缀（content-type 缺失/不可信时用）。 */
export function sniffImageExt(buf) {
  if (!buf || buf.length < 12) return '';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.slice(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (buf.slice(4, 12).toString('latin1') === 'ftypavif') return 'avif';
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
  return '';
}
