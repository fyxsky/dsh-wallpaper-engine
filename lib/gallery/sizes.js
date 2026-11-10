/**
 * gallery/sizes.js — 把「一个图片地址」拆成**预览用小图**与**下载用最大图**。
 *
 * 已知图库的规则（都是实测出来的，不是猜的）：
 *   · Bing 每日图：`/th?id=…_1920x1080.jpg` ⇒ 小图 `_480x270.jpg`，最大图 `_UHD.jpg`；
 *   · Picsum：`/id/<id>/<w>/<h>` ⇒ 小图 `/480/320`，最大图保持接口给的尺寸；
 *   · 其它（Lolicon 的 pixiv 原图 / 自建图床 / 樱道直出）⇒ 两者同址，靠宿主代理 + 磁盘缓存兜。
 *
 * 约定：`full` 永远是**下载**用的那个，`thumb` 只用于网格预览。
 */

/** @returns {{ full: string, thumb: string }} */
export function splitSizes(rawUrl) {
  const url = String(rawUrl || '');
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (/(^|\.)bing\.com$/.test(host) && u.pathname === '/th') {
      const id = u.searchParams.get('id') || '';
      const base = id.replace(/_\d+x\d+\.(jpg|jpeg|png)$/i, '');
      if (base) {
        const mk = (suffix) => {
          const p = new URLSearchParams(u.searchParams);
          p.set('id', base + suffix);
          p.delete('rf');
          p.delete('pid');
          return u.origin + '/th?' + p.toString();
        };
        return { full: mk('_UHD.jpg'), thumb: mk('_480x270.jpg') };
      }
    }
    if (/^picsum\.photos$/.test(host)) {
      const m = /^\/(id|seed)\/([^/]+)\/(\d+)\/(\d+)$/.exec(u.pathname);
      if (m) return { full: url, thumb: u.origin + '/' + m[1] + '/' + m[2] + '/480/320' };
    }
  } catch { /* ignore */ }
  return { full: url, thumb: url };
}

