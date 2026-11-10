/**
 * gallery/parse.js — 把图库接口的响应**归一成条目列表**（纯函数，无 I/O）。
 *
 * 三种形态（设置里的 `galleryFormat`）：
 *   · `json-list`   —— JSON 里有数组（Picsum / Bing 每日 / 自建图床）
 *   · `json-single` —— JSON 里只有一个图片地址（樱道 dmoe.cc 的 {code,imgurl}）
 *   · `image`       —— 响应本身就是图片（随机图接口，如 picsum.photos/1920/1080）
 *   · `auto`（默认）—— 按 content-type 与结构猜
 *
 * `jsonPath` 支持三种写法（用户填在设置里）：
 *   · `a[].b`  —— 取 a 数组每一项的 b 字段（最常见）
 *   · `a.b`    —— 取嵌套字段（值可以是字符串或数组）
 *   · `a[0].b` —— 取下标
 * 留空 ⇒ 按常见字段名猜（download_url / imgurl / url / src / image …）。
 */

const URL_KEYS = ['download_url', 'imgurl', 'largeImageURL', 'image', 'src', 'url', 'preview', 'thumb', 'full', 'raw', 'path'];

/** 极简路径求值：支持 a.b / a[0].b / a[].b。 */
export function pickByPath(root, jsonPath) {
  const p = String(jsonPath || '').trim();
  if (!p) return undefined;
  const tokens = p.replace(/\[\s*\]/g, '.[]').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = root;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (cur == null) return undefined;
    if (t === '[]') {
      if (!Array.isArray(cur)) return undefined;
      const rest = tokens.slice(i + 1);
      if (rest.length === 0) return cur;
      return cur.map((it) => pickByPath(it, rest.join('.'))).flat().filter((v) => v != null);
    }
    cur = cur[t];
  }
  return cur;
}

/** 从一个对象里按常见字段名找图片地址。 */
function urlOfObject(o) {
  if (typeof o === 'string') return o;
  if (!o || typeof o !== 'object') return '';
  for (const k of URL_KEYS) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && typeof v.url === 'string') return v.url.trim();
  }
  return '';
}

/** 深度优先找第一个字符串数组（兜底用）。 */
function firstStringArray(node, depth = 0) {
  if (depth > 4 || node == null) return null;
  if (Array.isArray(node)) {
    if (node.every((x) => typeof x === 'string')) return node;
    if (node.some((x) => x && typeof x === 'object')) return node;
    return null;
  }
  if (typeof node !== 'object') return null;
  for (const v of Object.values(node)) {
    const found = firstStringArray(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/** 相对地址补全（Bing 的 /th?id=… 这种）。 */
function absolutize(u, baseUrl) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return 'https:' + s;
  try { return new URL(s, baseUrl).toString(); } catch { return ''; }
}

/**
 * @param {{ body: Buffer, contentType: string, finalUrl: string, format?: string, jsonPath?: string, count?: number }} input
 * @returns {{ items: { url: string, title?: string, author?: string, width?: number, height?: number }[], format: string, note?: string }}
 */
export function parseItems(input) {
  const count = Math.max(1, Math.min(50, Number(input.count) || 12));
  const ct = String(input.contentType || '').toLowerCase();
  const fmt = String(input.format || 'auto');
  const looksImage = ct.startsWith('image/') || /^(jpg|jpeg|png|webp|avif|gif|bmp)$/.test(ct);
  if (fmt === 'image' || (fmt === 'auto' && looksImage)) {
    return { items: [{ url: input.finalUrl }], format: 'image', note: '接口直接返回图片（随机图模式）' };
  }
  let json;
  try { json = JSON.parse(input.body.toString('utf8')); } catch { throw new Error('接口返回的不是 JSON（content-type=' + ct + '）'); }

  let raw;
  if (input.jsonPath) {
    raw = pickByPath(json, input.jsonPath);
  } else {
    raw = firstStringArray(json);
  }
  if (raw == null) raw = json;
  const list = Array.isArray(raw) ? raw : [raw];

  const out = [];
  const seen = new Set();
  for (const it of list) {
    if (out.length >= count) break;
    let url = '';
    if (typeof it === 'string') url = absolutize(it, input.finalUrl);
    else url = absolutize(urlOfObject(it), input.finalUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const o = it && typeof it === 'object' ? it : {};
    out.push({
      url,
      title: typeof o.title === 'string' ? o.title : (typeof o.author === 'string' ? o.author : undefined),
      author: typeof o.author === 'string' ? o.author : undefined,
      width: Number(o.width) || undefined,
      height: Number(o.height) || undefined,
    });
  }
  if (out.length === 0) throw new Error('接口返回里没找到图片地址（可填「取图路径」，例如 images[].url）');
  return { items: out, format: fmt === 'auto' ? 'json-list' : fmt };
}
