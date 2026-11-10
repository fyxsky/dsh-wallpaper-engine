/**
 * gallery/ffmpeg.js — 压缩用的 ffmpeg 解析 + 最小 spawn（自带解析链，不依赖内核）。
 *
 * 解析顺序与插件既有供给链一致：`DSH_WE_FFMPEG` → 数据目录下的 ffmpeg/ → 包内 ffmpeg/ → PATH。
 * 找不到 ⇒ 压缩**静默跳过**（下载照常完成），由调用方在结果里说明原因。
 * ⚠️ 与 `lib/media/transcode.js` 的差别：这里不触发自动下载（一次后台任务不值得为此拉 100MB），
 * 只用已经在那儿的二进制。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pluginDataDir } from '../kernel/data-dir.js';

const EXE = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

/** @returns {string|null} */
export function resolveGalleryFfmpeg() {
  const env = process.env.DSH_WE_FFMPEG;
  if (env && env.trim()) return env.trim();
  const candidates = [join(pluginDataDir(), 'ffmpeg', EXE)];
  try { candidates.push(join(new URL('../../', import.meta.url).pathname.replace(/^\//, ''), 'ffmpeg', EXE)); } catch { /* ignore */ }
  for (const c of candidates) { try { if (existsSync(c)) return c; } catch { /* ignore */ } }
  return EXE;
}

/**
 * 跑一次 ffmpeg（detached + windowsHide：DSH 宿主的受限 spawn 上下文需要这个组合）。
 * @returns {Promise<void>} code 0 才 resolve
 */
export function spawnGalleryFfmpeg(ff, args, budgetMs = 60000) {
  return new Promise((resolve, reject) => {
    let child;
    const timer = setTimeout(() => { try { child && child.kill(); } catch { /* ignore */ } reject(new Error('ffmpeg 超时')); }, budgetMs);
    try {
      child = spawn(ff, args, { detached: true, windowsHide: true, stdio: 'ignore' });
    } catch (err) { clearTimeout(timer); reject(err); return; }
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(); else reject(new Error('ffmpeg exit ' + code));
    });
  });
}
