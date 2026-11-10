/**
 * glass-presets-store.js — 整机配置快照族的**存储层**（2026-11-07 从 `routes/presets.js`
 * 纯搬移折出：常量 + 磁盘读写 + 消毒 + 资产段编解码 + 资产落盘；零行为改动）。
 *
 * 语义与理由仍以 `routes/presets.js` 文件头为准（ADR-0011 四段语义、两层存储、墓碑、
 * 重名策略、旧版本作废、base64 只在宿主侧进出）；本文件只保证实现落点可读：
 *   · `readPresetAt` / `resolvePreset` / `listPresets` —— 读（两层优先级 + 墓碑遮蔽）；
 *   · `writePreset` / `writeTombstone` —— 写（原子、只落用户层）；
 *   · `publicAssets` —— 对外元数据白名单（GET / create 回包）。
 *
 * ⚠️ 瘦身分支：吉祥物 / 头像两个**图片资产段**（连同 `mascot-avatar` 组件行）已删除 ⇒
 * 资产段只剩**字体段**（值住 `fontsets/<id>.json`，不带图片字节）。原来的
 * `landImage` / `sameFamilyFile` / `clearFamily` / `sanitizePresetPoint` 与
 * `currentMascotSegment` / `currentAvatarSegment` 全部随功能删除。
 *
 * 路由侧（`routes/presets.js`）只留 HTTP 面：端点解析、状态码、`DEPS` 契约与调用点。
 * 拆分纪律：先纯搬移（CODE-STRUCTURE §4.2）—— 本刀不顺手改任何行为。
 */

import { readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  PROFILE_PRESET_SCHEMA_TAG, GLASS_PRESET_TOMBSTONE_TAG, isGlassPresetId,
  sanitizePresetValues, sanitizePresetAssets, sanitizeFontset,
} from './settings-schema.js';

/**
 * 一份**无资产**预设正文的上限（settings 段的键集由 `../settings-schema.js` 给出 ⇒ 下方 `PRESET_MAX_BYTES` 已极宽松）。
 * 用于 `create` —— 那条路只收 settings 段与 `embed` **名单**（不收字节，见文件头）。
 */
export const PRESET_MAX_BYTES = 128 * 1024;
/**
 * **历史上单份资产**的独立字节闸（**解码后**的原始字节数）。
 *
 * ⚠️ 瘦身分支：吉祥物 / 头像两个图片资产段已删除、字体段本来不带字节 ⇒ 这道闸**不再有落点**。
 * 常量留着唯一用途是让下面 `PRESET_IMPORT_MAX_BYTES` 继续按"旧版预设可能内嵌图片"的量级放行
 * （读到不认得的段一律忽略，不静默截断、也不因为文件大就 413）。
 */
const PRESET_ASSET_MAX_BYTES = 8 * 1024 * 1024;
/**
 * `import` 的收体上限：**按"最多携带三项资产"重算**，不沿用旧的 128 KiB（承 Context 第 8 条）。
 * 由「三项 × base64(单份上限)」**推出来**而不是写死一个数字 —— 单份闸一改，这里自动跟上：
 * base64 把 3 字节编成 4 字符 ⇒ 一项 8 MB 的图落进 JSON 约 10.7 MB，三项约 32 MB，
 * 再加上正文本身的余量。
 */
export const PRESET_IMPORT_MAX_BYTES = PRESET_MAX_BYTES + 3 * (Math.ceil(PRESET_ASSET_MAX_BYTES / 3) * 4);
/** 显示名长度上限（与设置面板一行宽度相称，与字体集名同一条）。 */
export const PRESET_NAME_MAX = 60;
/** 预设数量上限（用户口径：见下方 `PRESET_TOTAL_MAX`）。按**活跃**预设计 ——
 *  随包 + 用户层去重后的清单长度；被删除（墓碑）的出厂预设**不占位**
 *（删除正是用户腾位的手段）。清单扫描沿用同族常数做无界读护栏（另留墓碑余量）。 */
export const PRESET_TOTAL_MAX = 16;
/** 单层文件扫描上限（无界读护栏；墓碑也住用户层，给足余量）。 */
const PRESET_SCAN_MAX = 32;
/** 资产段的段名（白名单：`embed` 名单与 `assets=` 查询参数都只认它）。
 *  ⚠️ 瘦身分支：只剩字体段（`mascot` / `avatar` 随功能删除）。 */
export const ASSET_SEGMENTS = ['font'];

/** `glass-presets/<id>.json` —— id 已过白名单，所以这是**单段**文件名。 */
export function presetPath(dir, id) { return join(dir, id + '.json'); }

/** 目录包含性（第二道网，第一道是 id 白名单）—— 口径与 fontsets.js 一致。 */
function insideDir(dir, abs) {
  const rel = relative(resolve(dir), resolve(abs));
  return Boolean(rel) && !rel.startsWith('..') && !isAbsolute(rel);
}

/** 用户层目录（可写）/ 随包层目录（**只读**：任何写路径都不得指向它）。 */
export function userDir(c) { return c.glassPresetsDir(); }
export function builtinDir(c) { return c.glassPresetsBuiltinDir; }

/** 文件名 → id；不合白名单的（手放进去的怪名字）不进列表、也永不被写。 */
function listPresetIds(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const ids = [];
  for (const e of entries) {
    if (typeof e.isFile !== 'function' || !e.isFile()) continue;
    if (!e.name.endsWith('.json')) continue;
    const id = e.name.slice(0, -'.json'.length);
    if (!isGlassPresetId(id)) continue;
    ids.push(id);
    if (ids.length >= PRESET_SCAN_MAX) break;
  }
  return ids.sort();
}

/**
 * 读**某一层**里的预设。返回 `{ ok: true, doc }` 或 `{ ok: false, reason }`，
 * reason ∈ `missing` / `bad-json` / `bad-shape` / `version-obsolete` / `unsafe-path`。
 * 名字的截断与兜底与 fontsets.js 同形；正文由 `sanitizePresetValues` 重建
 *（缺键补默认值 —— 存盘的每一份都是完整快照，读出来也必须还是），资产段由
 * `sanitizePresetAssets` 重建（**缺席的段不写键**，绝不用空对象占位）。
 */
export function readPresetAt(dir, id) {
  const abs = presetPath(dir, id);
  if (!insideDir(dir, abs)) return { ok: false, reason: 'unsafe-path' };
  let text;
  try { text = readFileSync(abs, 'utf8'); } catch { return { ok: false, reason: 'missing' }; }
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, reason: 'bad-json' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, reason: 'bad-shape' };
  // ⚠️ 墓碑**先判**：它的 tag 是墓碑自己的（与正文版本无关），必须在下面那条
  //    "tag 不是当前版本 ⇒ 版本作废"之前认出来，否则会让删过的出厂预设复活（D6）。
  if (parsed.$schema === GLASS_PRESET_TOMBSTONE_TAG) return { ok: false, reason: 'deleted' };
  // 旧 tag 一律作废：reason 点明是**版本**问题 —— 面板按它给"重新保存一份"的出路。
  if (parsed.$schema !== PROFILE_PRESET_SCHEMA_TAG) return { ok: false, reason: 'version-obsolete' };
  const name = typeof parsed.name === 'string' && parsed.name.trim()
    ? parsed.name.trim().slice(0, PRESET_NAME_MAX) : id;
  const assets = sanitizePresetAssets(parsed.assets);
  return {
    ok: true,
    doc: {
      $schema: PROFILE_PRESET_SCHEMA_TAG,
      id,
      name,
      values: sanitizePresetValues(parsed.values),
      ...(Object.keys(assets).length ? { assets } : {}),
    },
  };
}

/** 两层优先级解析：用户层胜。用户层读不懂照样遮住随包层（理由见文件头）。 */
export function resolvePreset(c, id) {
  const user = readPresetAt(userDir(c), id);
  if (user.ok) return { ok: true, doc: user.doc, origin: 'user' };
  if (user.reason !== 'missing') {
    return {
      ok: false, reason: user.reason, origin: 'user',
      shadowsBuiltin: readPresetAt(builtinDir(c), id).ok,
    };
  }
  const builtin = readPresetAt(builtinDir(c), id);
  if (builtin.ok) return { ok: true, doc: builtin.doc, origin: 'builtin' };
  // ⚠️ 随包层的失败原因**原样保留**，不塌缩成 missing（#188）：升级窗口期里磁盘上的
  //    随包文件已是新版 tag（`version-obsolete`），而宿主内存里还是旧路由代码 ——
  //    塌缩会让路由回 404 "unknown preset"，绕过同一条 GET 上**已经本地化**的 422
  //    "版本作废" 文案（那段在随包层曾是死代码）。真·不存在（文件读不到）仍是
  //    `missing` ⇒ 404 语义不变；只有"文件在、读不懂"才落到 422。
  return {
    ok: false, reason: builtin.reason,
    origin: builtin.reason === 'missing' ? null : 'builtin',
  };
}

/** 用户层里的墓碑 id 集（= 已被删除的出厂预设 —— 删除即永久，无恢复通道）。 */
function tombstonedIds(c) {
  const set = new Set();
  for (const id of listPresetIds(userDir(c))) {
    if (readPresetAt(userDir(c), id).reason === 'deleted') set.add(id);
  }
  return set;
}

/**
 * 清单：随包在前，用户层在后；**被删除的出厂预设不进清单**（墓碑遮蔽即永久 ——
 * 没有"已隐藏"的可见形态，也没有恢复通道）。用户层墓碑本身也不是预设，同样跳过。
 * 用户口径：出厂预设可删、预设总数上限 16（4×4 格；本 fork 把出厂预设加到 9 套，留 7 格给用户），删除的不占位。
 */
export function listPresets(c) {
  const tomb = tombstonedIds(c);
  const builtinIds = listPresetIds(builtinDir(c));
  const userIds = listPresetIds(userDir(c));
  const rows = [];
  for (const id of builtinIds) {
    if (tomb.has(id)) continue; // 墓碑 = 这套出厂预设已被（永久）删除
    const read = readPresetAt(builtinDir(c), id);
    rows.push(read.ok
      ? { id, name: read.doc.name, origin: 'builtin' }
      : { id, name: id, origin: 'builtin', broken: read.reason });
  }
  for (const id of userIds) {
    if (tomb.has(id)) continue; // 墓碑不是预设
    const read = readPresetAt(userDir(c), id);
    rows.push(read.ok
      ? { id, name: read.doc.name, origin: 'user' }
      : { id, name: id, origin: 'user', broken: read.reason });
  }
  return rows.slice(0, PRESET_TOTAL_MAX);
}

/** 归一化名字（重名判定的唯一口径 —— 见文件头"重名"一节）。 */
export function normalizeName(name) { return String(name).trim().toLowerCase(); }

/** 全部**活跃**预设的归一化名字集合 —— 新建时的对比域（已删除的出厂名已放开）。 */
export function takenNames(c) {
  const taken = new Set();
  for (const row of listPresets(c)) {
    if (!row.broken) taken.add(normalizeName(row.name));
  }
  return taken;
}

/**
 * 给**导入**的预设起一个不撞名的名字（**自动顺延**，`暗夜釉色` → `暗夜釉色 (2)`）。
 *
 * 为什么 import 不像 create 那样 409（captain 冻结的口径，两种策略并存不矛盾）：
 *   · **import 走自动顺延** —— 面板没有重命名功能，导入者拿到 409 就是"拿到手却改不了"
 *     （只能删掉已有那份或去手改 JSON，在应用内无法解决）；顺延让清单里两份都进、
 *     名字可区分（判据：清单不出现无法区分的同名项 —— 两种策略满足的是同一条判据）。
 *   · **create 仍 409** —— 保存对话框里用户能直接改名字，报错即时可行动。
 * 顺延规则：原样名可用就原样用；否则追加 ` (2)`、`(3)`…（显示名截断在 `PRESET_NAME_MAX`，
 * 追加后超长会先截断再查 —— 所以循环里每次都重新走 `normalizeName` 对比）。
 * @returns 不撞名的显示名（一定非空 —— `fallback` 空时由调用方先拒）
 */
export function uniqueImportName(c, wanted) {
  const taken = takenNames(c);
  const base = String(wanted || '').trim().slice(0, PRESET_NAME_MAX) || '导入的预设';
  if (!taken.has(normalizeName(base))) return base;
  for (let i = 2; i <= PRESET_TOTAL_MAX * 4; i++) {
    const suffix = ' (' + i + ')';
    const candidate = base.slice(0, PRESET_NAME_MAX - suffix.length) + suffix;
    if (!taken.has(normalizeName(candidate))) return candidate;
  }
  return base.slice(0, PRESET_NAME_MAX - 7) + ' ' + Date.now().toString(36);
}

// ── 资产段：本机 ⇄ 预设正文 ────────────────────────────────────────────────────
// 瘦身分支：只剩**字体段**（值住 `fontsets/<id>.json`，不带图片字节）⇒ 这一节里原来的
// base64 编解码与"落图 / 清同族"那套（mascot / avatar）全部删除。

/** 当前**活动字体集**的正文（字体段的载体）。迁移前（`fontSetId` 为空）退回 settings。 */
function currentFontSegment(c) {
  const id = typeof c.readFontSetId === 'function' ? c.readFontSetId() : '';
  if (id && typeof c.fontSetsDir === 'function') {
    try {
      const parsed = JSON.parse(readFileSync(join(c.fontSetsDir(), id + '.json'), 'utf8'));
      return { name: typeof parsed.name === 'string' ? parsed.name.slice(0, 64) : id, values: sanitizeFontset(parsed.values) };
    } catch { /* 活动集读不出 ⇒ 退回 settings 那份（可能已是迁移前的形状） */ }
  }
  const settings = typeof c.readSettings === 'function' ? c.readSettings() : null;
  return { name: id || '', values: sanitizeFontset(settings) };
}

/** 按段名从**当前本机**取一段（内嵌 / 导出补段共用）。瘦身分支只剩 `font`。 */
export function currentSegment(c, seg) {
  if (seg === 'font') return currentFontSegment(c);
  return null;
}

/**
 * 落盘（原子，**只落用户层**）：正文永远由消毒产物构造，不照抄未信任输入。
 * 资产段过 `sanitizePresetAssets` ⇒ 形状走与 settings 同一条消毒路径，且**缺席的段不写键**。
 */
export async function writePreset(c, id, name, values, assets) {
  const dir = userDir(c);
  c.ensureDirOnce(dir);
  const assetSegs = sanitizePresetAssets(assets);
  const doc = {
    $schema: PROFILE_PRESET_SCHEMA_TAG,
    id,
    name: String(name).trim().slice(0, PRESET_NAME_MAX),
    values: sanitizePresetValues(values),
    ...(Object.keys(assetSegs).length ? { assets: assetSegs } : {}),
  };
  await c.atomicWriteFileP(presetPath(dir, id), JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

/** 落一份墓碑（原子，**只落用户层**）：出厂预设的"删除"就是这个文件。 */
export async function writeTombstone(c, id) {
  const dir = userDir(c);
  c.ensureDirOnce(dir);
  const doc = { $schema: GLASS_PRESET_TOMBSTONE_TAG, id };
  await c.atomicWriteFileP(presetPath(dir, id), JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

/** 取一个未被占用的 id：客户端给的就用它，真撞了顺延 `-2`、`-3` …（不给用户看细节）。 */
export function freePresetId(c, wanted) {
  const taken = new Set([...listPresetIds(userDir(c)), ...listPresetIds(builtinDir(c))]);
  if (isGlassPresetId(wanted) && !taken.has(wanted)) return wanted;
  const base = isGlassPresetId(wanted) ? wanted : 'preset';
  for (let i = 2; i <= PRESET_TOTAL_MAX * 4; i++) {
    const id = (base + '-' + i).slice(0, 64);
    if (isGlassPresetId(id) && !taken.has(id)) return id;
  }
  return null;
}

/**
 * 资产段的**对外形态**（GET 单份 / create 回包）：元数据 + 字体段数值，**不含图片字节**。
 * 形状与 `sanitizePresetAssets` 一致，只是逐段摘掉 `data`（`font` 段本来就没有字节）。
 * `null`（**显式声明无**）**原样回显** —— 调用方要能看出"这一族被声明成无"，与"没带这一段"
 * （键根本不出现）区分开。
 */
export function publicAssets(assets) {
  const out = {};
  const f = assets.font;
  if (f === null) out.font = null;
  else if (f && typeof f === 'object') out.font = { name: f.name, values: f.values };
  // 主题段：**纯元数据**（两个档位之一），没有字节可落 ⇒ 原样回显。
  // ⚠️ 这份函数是**白名单**：新增一段就必须在这里加一条。漏了的话客户端收不到那一段、
  // `applyPreset` 里对应那一腿静默不执行 —— 实测事故：作者自用声明了 dark，但宿主 GET
  // 时 theme 被丢掉 ⇒ 套用预设永远不切深色（而且不报错）。判据见 test/verify-presets.mjs
  // 的「theme 段能穿过宿主 publicAssets 白名单」。
  const th = assets.theme;
  if (th && typeof th === 'object' && !Array.isArray(th) && typeof th.preference === 'string') {
    out.theme = { preference: th.preference };
  }
  return out;
}

/**
 * 把预设内嵌的资产段落盘到本机（**应用半边**）。
 *
 * ⚠️ **缺席的段什么都不做，且不出现在 `applied` 里** —— 那是 D4 的核心语义
 * （"不带它"≠"把它清空"）。
 * ⚠️ **`null` = 「显式声明无」（D4 的三态）**：字体没有文件可删，直接回一份**默认值**
 * （客户端照旧经 `landPresetFontSet` 落进预设专用槽）。
 *
 * 瘦身分支：吉祥物 / 头像两个图片段（以及它们的"落图 / 清同族 / 两阶段预检"）已删除 ⇒
 * 这里只剩字体段，不再有 unlink 与原子写图。
 *
 * @returns {Promise<{font?: object}>}
 */
export async function installAssets(c, assets) {
  const applied = {};
  const font = assets.font;
  if (font === null) {
    // 「声明无」的字体段 = 回落默认字体集：没有文件可删，给默认值让客户端照常落专用槽。
    applied.font = { name: '', values: sanitizeFontset(null) };
  } else if (font && typeof font === 'object' && font.values) {
    applied.font = { name: typeof font.name === 'string' ? font.name : '', values: sanitizeFontset(font.values) };
  }
  return applied;
}
