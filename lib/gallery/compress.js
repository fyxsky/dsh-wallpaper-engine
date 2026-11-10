/**
 * gallery/compress.js — 下载后的**无损压缩**（复用插件自带的 ffmpeg 供给链，不引新依赖）。
 *
 * 口径（与设置里 `galleryCompress: 'lossless'` 一致）：
 *   · PNG  —— 重编码 `-c:v png -compression_level 100`：PNG 本身无损，重编码只改熵编码，
 *            典型 -10%~-30%；
 *   · JPEG —— **不重编码**，只 `-c copy -map_metadata -1` 去掉 EXIF/ICC：字节级无损，
 *            典型 -3%~-10%（重编码 JPEG 一定是有损，所以本档绝不做）；
 *   · WebP / AVIF / GIF —— 同上 `-c copy` 去元数据。
 *
 * 安全阀：产物不小于原图（或 ffmpeg 不可用）⇒ 保留原图，绝不把图压坏/压大。
 */

/** 该后缀对应的 ffmpeg 参数；返回 null = 不处理。 */
export function planCompressArgs(ext, src, dst) {
  const e = String(ext || '').toLowerCase();
  if (!e) return null;
  // ⚠️ 输出名必须**带图片后缀**：ffmpeg 靠扩展名选 muxer，`.tmp` 会直接 "Unable to find a suitable output format"。
  if (e === 'png') return ['-y', '-i', src, '-c:v', 'png', '-compression_level', '100', '-map_metadata', '-1', '-f', 'image2', dst];
  if (e === 'jpg' || e === 'jpeg' || e === 'webp' || e === 'gif' || e === 'avif' || e === 'bmp') {
    return ['-y', '-i', src, '-c', 'copy', '-map_metadata', '-1', '-f', 'image2', dst];
  }
  return null;
}

/**
 * 就地无损压缩一个文件。
 * @param {{ file: string, ext: string, ffmpeg: string, spawnFfmpeg: Function, budgetMs?: number }} c
 * @returns {Promise<{ applied: boolean, mode: string, before: number, after: number, reason?: string }>}
 */
export async function compressLossless(c) {
  const before = c.before != null ? Number(c.before) : 0;
  const tmpName = c.file + '.lossless.tmp.' + String(c.ext || 'bin');
  const args = planCompressArgs(c.ext, c.file, tmpName);
  if (!args) return { applied: false, mode: 'skip', before, after: before, reason: '该格式不处理' };
  if (!c.ffmpeg) return { applied: false, mode: 'skip', before, after: before, reason: 'ffmpeg 不可用' };
  const tmp = tmpName;
  try {
    await c.spawnFfmpeg(c.ffmpeg, args, c.budgetMs || 60000);
    const st = await fsStat(tmp);
    if (!st || st.size === 0) { await rmQuiet(tmp); return { applied: false, mode: 'skip', before, after: before, reason: 'ffmpeg 未产出' }; }
    if (st.size >= before) { await rmQuiet(tmp); return { applied: false, mode: 'skip', before, after: before, reason: '压缩无收益' }; }
    await rename(tmp, c.file);
    return { applied: true, mode: c.ext === 'png' ? 'png-reencode' : 'strip-metadata', before, after: st.size };
  } catch (err) {
    await rmQuiet(tmp);
    return { applied: false, mode: 'skip', before, after: before, reason: String(err && err.message ? err.message : err) };
  }
}

import { stat as fsStat, rename, rm } from 'node:fs/promises';
async function rmQuiet(p) { try { await rm(p, { force: true }); } catch { /* ignore */ } }

/**
 * 有损压缩：统一转 JPEG（`-q:v 2`，视觉接近原图）+ 去元数据。
 * 返回输出文件路径（可能与输入不同名：扩展名变成 .jpg）。
 * 失败或体积无收益 ⇒ 返回 null，调用方保留原文件。
 * ⚠️ PNG 带透明通道时会丢 alpha（壁纸场景罕见）；需要 alpha 就用「无损」档。
 * @param {{ file: string, ext: string, ffmpeg: string, spawnFfmpeg: Function, outFile: string, budgetMs?: number }} c
 */
export async function compressLossy(c) {
  if (!c.ffmpeg) return null;
  const args = ['-y', '-i', c.file, '-q:v', '5', '-map_metadata', '-1', '-f', 'image2', c.outFile];
  try {
    await c.spawnFfmpeg(c.ffmpeg, args, c.budgetMs || 90000);
    const st = await fsStat(c.outFile);
    if (!st || st.size === 0) { await rmQuiet(c.outFile); return null; }
    return { file: c.outFile, bytes: st.size };
  } catch {
    await rmQuiet(c.outFile);
    return null;
  }
}