/**
 * routes/gallery.js — 在线图库族：`<BASE>/gallery` 一个前缀下的四个端点。
 *
 *   POST /preview   { endpoint, format, jsonPath, headers, count, allowPrivate }
 *                   → { items:[{url,title,author,width,height}], format, note }
 *   POST /download  { items:[url...], compress:'lossless'|'off', allowPrivate }
 *                   → { saved, skipped, failed[], bytesBefore, bytesAfter, compressed, compressMode }
 *   GET  /thumb?url=…   → 图片字节（代理：绕开 CORS / 防盗链；只允许图片类型）
 *   GET  /probe?url=…   → { ok, status, contentType, bytes, finalUrl }（设置里的「测试」按钮）
 *
 * 抓取与落盘都在宿主（见 lib/gallery/），本文件只做 HTTP 面：参数校验、状态码、错误文案。
 * 安全边界（内网/协议白名单）在 lib/gallery/net.js，本文件不重复实现。
 */
import { bodyReader } from '../http-body.js';
import { sendJson } from '../json-response.js';

export const DEPS = ['disposers', 'base', 'gallery', 'lingerClose', 'armBodyIdleTimeout', 'log'];

const PREVIEW_BODY_MAX = 16 * 1024;
const DOWNLOAD_BODY_MAX = 256 * 1024;

export function registerGalleryRoutes(webServer, c) {
  const { disposers, base: BASE, gallery } = c;

  function withJsonBody(req, res, maxBytes, onBody) {
    let settled = false;
    const fail = (code, payload) => {
      if (settled) return;
      settled = true;
      sendJson(res, code, payload);
      c.lingerClose(req, res);
    };
    c.armBodyIdleTimeout(req, () => fail(408, { error: 'request timeout' }));
    const reader = bodyReader(req, {
      maxBytes,
      shouldStop: () => settled,
      onOverflow: () => fail(413, { error: 'payload too large' }),
    });
    req.on('data', reader.onData);
    req.on('end', () => {
      if (settled) return;
      settled = true;
      let parsed;
      try { parsed = JSON.parse(reader.text() || '{}'); } catch { sendJson(res, 400, { error: 'invalid JSON body' }); return; }
      Promise.resolve(onBody(parsed)).catch((err) => {
        try { sendJson(res, 500, { error: String((err && err.message) || err) }); } catch { /* ignore */ }
      });
    });
    req.on('error', () => fail(400, { error: 'request error' }));
  }

  disposers.push(webServer.register({
    kind: 'prefix',
    path: BASE + '/gallery',
    handler: async (req, res) => {
      const method = (req.method || 'GET').toUpperCase();
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const sub = url.pathname.slice((BASE + '/gallery').length).replace(/^\//, '');
      const q = url.searchParams;
      const fail = (code, message) => sendJson(res, code, { error: message });

      if (sub === 'preview' && method === 'POST') {
        withJsonBody(req, res, PREVIEW_BODY_MAX, async (body) => {
          if (!body || typeof body.endpoint !== 'string' || !body.endpoint.trim()) return fail(400, '缺少接口地址');
          try {
            const out = await gallery.preview({
              endpoint: body.endpoint,
              format: body.format,
              jsonPath: body.jsonPath,
              headers: body.headers,
              count: body.count,
              allowPrivate: body.allowPrivate === true,
            });
            sendJson(res, 200, out);
          } catch (err) { fail(502, String((err && err.message) || err)); }
        });
        return;
      }

      if (sub === 'download' && method === 'POST') {
        withJsonBody(req, res, DOWNLOAD_BODY_MAX, async (body) => {
          try {
            const out = await gallery.download({
              items: body && body.items,
              compress: body && body.compress,
              allowPrivate: body && body.allowPrivate === true,
            });
            sendJson(res, 200, out);
          } catch (err) { fail(400, String((err && err.message) || err)); }
        });
        return;
      }

      if (sub === 'thumb' && method === 'GET') {
        const target = q.get('url') || '';
        if (!target) return fail(400, '缺少 url');
        try {
          const out = await gallery.thumb(target, q.get('allowPrivate') === '1');
          res.writeHead(200, { 'content-type': out.contentType || 'image/jpeg', 'content-length': out.body.length, 'cache-control': 'private, max-age=600' });
          res.end(out.body);
        } catch (err) { fail(502, String((err && err.message) || err)); }
        return;
      }

      if (sub === 'probe' && method === 'GET') {
        const target = q.get('url') || '';
        if (!target) return fail(400, '缺少 url');
        try {
          sendJson(res, 200, await gallery.probe(target, q.get('allowPrivate') === '1'));
        } catch (err) { fail(400, String((err && err.message) || err)); }
        return;
      }

      fail(404, 'not found');
    },
  }));
}
