/**
 * dsh-wallpaper-engine — client (browser) half source.
 *
 * CANONICAL source; `scripts/build-client.mjs` emits `lib/client.js`. Edit this
 * file, run `npm run build`. Do not hand-edit `lib/client.js`.
 *
 * The plugin:
 *   1. Fetches the wallpaper inventory from the host half's same-origin route
 *      (GET /wallpaper-engine/inventory); "刷新" refetches on demand.
 *   2. Renders the selected wallpaper BEHIND the DSH GUI: a `position:fixed;
 *      z-index:-1` child of `document.body` + a readability scrim (frame + sidebar transparent).
 *   3. Applies four user-adjustable effects, each with its own slider:
 *      - 壁纸模糊 (wallpaper blur) → `--we-media-filter`（blur() 项）
 *      - 暗化 (scrim strength)      → `--we-scrim-color`
 *      - 边框 (border emphasis)     → `--dsw-alias-border-l1/l2` alpha
 *      - 玻璃 (glass blur on panels)→ `--we-blur` + frosted-glass backgrounds
 *   4. Automatic rotation over USER-DEFINED carousel lists (轮播列表): any number
 *      of lists, each with its own interval and order, persisted with the rest of
 *      the settings (schema key `rotationGroups` → the host's config.json) — never
 *      depends on WE's own config.json playlist paths (an import source only). An
 *      imported playable WE playlist seeds the first list on first run.
 */

const React = require("react");
// Portal for the wallpaper picker modal. react-dom is registered in the DSH
// client module loader (see @deepseek-ai/dsh-client-web), so out-of-tree client
// bundles can require it just like "react".
const ReactDOM = require("react-dom");

const SETTINGS_KEY = "dsh-wallpaper-engine:selection";
// Host-sourced settings: the same-origin route the browser half uses to read
// and write its persisted settings. The host stores them in a plain file
// (~/.dsh-wallpaper-engine/config.json), which is PORT-INDEPENDENT — unlike
// localStorage, which is origin-scoped and therefore reset whenever DSH
// Desktop restarts on a new random --port 0 loopback port.
const SETTINGS_URL = "/wallpaper-engine/settings";
// 「壁纸属性」面板：host 把项目目录的 project.json 解析成 UI 描述后从这里取。
const PROPS_URL = "/wallpaper-engine/props";
const INVENTORY_URL = "/wallpaper-engine/inventory";
// ── 组件行状态面（ADR-0013 D3②/D3③）────────────────────────────────────────
// 「关掉一个组件行 ⇒ 该组件的浏览器可见面整块不渲染」的**唯一判据**。状态面就是宿主行状态
// （`/inventory` 的 `components` 字段，产出点见 lib/routes/inventory.js）：浏览器半边**只读**，
// 不写第二份"组件名 → UI"清单 —— 可见面落点由宿主侧的声明表 + 对账守卫双向钉住。
// 三态口径（顺序即优先级）：
//   ① `components` 整块读不到（字段缺席 / 不是对象：老宿主、探针没起来）⇒ **可用**
//      —— 宁可显示、不可静默消失（D3③）；
//   ② 该组件的键取不到（两个面都没这一行）⇒ **不可用**；
//   ③ 值不是 `started` ⇒ **不可用**（`missing` 包含"行被 disable"这一支，`failed:<文案>` 是
//      apply 抛错那一支）。
// ②③ 合成一句 `=== "started"`：唯一算"可用"的值只有它。
function weComponentVisible(components, name) {
  if (!components || typeof components !== "object") return true;
  return components[name] === "started";
}

/* ── 玻璃行停用后的残留回收（主包侧）────────────────────────────────────────
 * 为什么必须由主包做：清理玻璃的函数 `disposeGlassLayer` 住在 `packages/glass`，
 * 而行被停用后**那个 bundle 根本不求值** —— 「清理者」与「需要被清理的残留」恰好
 * 在同一侧，谁也够不着谁。实测症状：关掉 `wallpaper-engine-glass` 行后**左侧栏
 * 仍是玻璃**（`data-we-glass-page` 与 `--we-*` 变量留在 body 上，主包样式里挂在
 * 那个门下的规则照旧命中），只有刷新页面才好。
 *
 * 主包永远加载 ⇒ 由它当回收站。判据源复用 `/inventory` 已透传的 `components`
 * （与 weComponentVisible 同一份、同一口径），不新开路由、不引第二个真源。
 * ⚠️ 只撤**玻璃专属**的门控/变量：`data-we-wallpaper`、`data-we-ui-color` 等主包
 * 自有门控与玻璃行正交，各有各的状态机，不在此列。
 * 幂等：行活着时一次 `components.glass !== "started"` 判定就返回，零 DOM 走访。 */
const GLASS_RESIDUE_ATTRS = [
  "data-we-glass-page", "data-we-glass-chat", "data-we-glass-window", "data-we-glass-floaters",
  "data-we-left-sidebar", "data-we-left-sidebar-radius", "data-we-right-sidebar-radius",
  "data-we-left-sidebar-square", "data-we-right-sidebar-square",
  "data-we-titlebar-glass", "data-we-thinking-glass", "data-we-thinking-native",
  "data-we-sidebar-follow", "data-we-sidebar-glass", "data-we-sidebar-fullclear",
  "data-we-floater-solid", "data-we-glass-fallback",
];
const GLASS_RESIDUE_VARS = [
  "--we-blur", "--we-saturate", "--we-glass-brightness", "--we-glass-alpha", "--we-glass-color",
  "--we-surface-tint-light", "--we-surface-tint-dark",
  "--we-surface-tint-rgb-light", "--we-surface-tint-rgb-dark",
  "--we-left-sidebar-radius", "--we-right-sidebar-radius",
  "--we-sidebar-blur", "--we-sidebar-saturate", "--we-sidebar-sheen",
  "--we-sidebar-color", "--we-sidebar-tint",
  "--we-content-surface-alpha", "--we-content-surface-color",
  "--we-settings-window-blur", "--we-settings-window-alpha",
  "--we-left-sidebar-blur", "--we-left-sidebar-alpha",
  "--we-titlebar-blur", "--we-titlebar-alpha",
  "--we-floaters-blur", "--we-floaters-alpha",
  "--we-chat-glass-fidelity", "--we-chat-surface-tint-light", "--we-chat-surface-tint-dark",
  "--we-chat-surface-tint-rgb-light", "--we-chat-surface-tint-rgb-dark",
];

/**
 * 玻璃行停用 ⇒ 撤玻璃门控与变量（幂等；健康态零 DOM 走访）。
 * @param {unknown} components `/inventory` 的 components 表
 * @returns {boolean} 本轮是否真的清了东西
 */
function reclaimGlassResidue(components) {
  try {
    if (typeof document === "undefined" || !document.body) return false;
    // 缺 `glass` 键 = 探针没给结论（老宿主 / 探针没起）⇒ 按可用处理，与 weComponentVisible 同口径
    if (!components || typeof components !== "object" || !("glass" in components)) return false;
    if (components.glass === "started") return false;   // 行活着，玻璃归它自己管
    const body = document.body;
    const hasAttr = GLASS_RESIDUE_ATTRS.some((a) => body.hasAttribute(a));
    const hasVar = GLASS_RESIDUE_VARS.some((v) => body.style.getPropertyValue(v) !== "");
    const glassSheet = document.querySelector('style[data-plugin-css="dsh-wallpaper-engine/glass"]');
    if (!hasAttr && !hasVar && !glassSheet) return false; // 已经干净：不写任何东西
    for (const a of GLASS_RESIDUE_ATTRS) body.removeAttribute(a);
    for (const v of GLASS_RESIDUE_VARS) body.style.removeProperty(v);
    if (glassSheet) glassSheet.remove();
    for (const el of document.querySelectorAll("[data-we-titlebar-anchor]")) el.removeAttribute("data-we-titlebar-anchor");
    return true;
  } catch { return false; } // 回收失败不外抛：下一次 inventory 加载再对时
}

// 把可见面判据**注入全局**：可单独 import / 可独立求值的模块（panel-tabs 的页签函数）
// 通过 `globalThis.__weComponentVisible` 取用它，而不裸引用本作用域里的符号（那些模块单独求值时会 ReferenceError）。
// 契约与 `selection` / `apiUrl` 一致：模块输入一律走 globalThis。
globalThis.__weComponentVisible = weComponentVisible;
// 玻璃残留回收同理注入全局：`src/effects.js`（applyEffects 每次设置变动都会跑）要用它，
// 但它单独求值时看不到本作用域 ⇒ 经 globalThis 桥接，缺席时那边静默跳过。
globalThis.__weReclaimGlassResidue = reclaimGlassResidue;
// Body attribute set while a wallpaper is active; CSS uses it to make the frame
// background transparent so the behind-body layer shows through.
const ACTIVE_ATTR = "data-we-wallpaper";
const LAYER_ID = "dsh-wallpaper-engine-layer"; // 壁纸层单例：全仓唯一声明点（verify-layer-ownership P1）
const SCRIM_ID = "dsh-wallpaper-engine-scrim"; // 可读性 scrim 单例：同上
// **层所有权契约（P-D S4，ADR-0013 D12）**：壁纸层与 scrim 是
// **进程内单例 DOM 节点**，所有权 = 主包渲染内核独占 —— `src/live-layer.js` 建层/领养/退役，
// `src/client.js` 的 fiber cleanup 摘净。子包（`packages/media-bridge` 浏览器半边）**不得**建层/退层，
// 也不许持 `#layer` 引用：它只经 host 键面拿渲染器与状态（`selection` 等活别名）。
// 判据：`test/verify-layer-ownership.mjs`（P1 声明/id 赋值点 · P2 body 挂载白名单 ·
// P3 拆卸零残留 · P4 iframe 父链）。改这两行或这两条路径 = 改契约，必须同步守卫。

// ── Defaults ─────────────────────────────────────────────────────────────────
// scrim default is intentionally LOW now: iOS liquid glass needs the wallpaper
// colour to pass through the glass, so we no longer crush it behind a near-black
// scrim. Users can raise it back via the 暗化 slider for busy wallpapers.
// 默认值来自**唯一真源** `lib/settings-schema.js`：构建期由 scripts/build-client.mjs
// 把该文件内联进本 bundle 的工厂作用域（缺标记即构建失败），所以 `DEFAULTS` / `KINDS` /
// 各枚举白名单在这里**直接可用、且不得重复声明**（重复即 SyntaxError，构建脚本会拦）。
// 每个键的语义注释也随默认值一起迁到了 schema。

// 白名单常量（过滤器取值 / 形态 / 帧率档 / 转场 / 字体族 / scale 上下限）由 schema 预置：
// 它们随 lib/settings-schema.js 在构建期内联到本作用域，本文件不再声明（重复即构建失败）。
// 字体族按钮数据（白名单 FONT_FAMILY_VALUES 在 schema 里；inherit = 跟随 dsh 原生字体栈）：
// label 显示名 + stack 应用/预览字体栈。stack 里保留中文
// fallback 链（行楷缺字体时退楷体、等宽用系统等宽栈），预览与应用同源，
// 用户在按钮上看到的就是应用后的效果。
// 华文行楷 STXingkai 随 Office 安装，缺失时退 KaiTi；macOS 走 "Xingkai SC"。
const FONT_FAMILY_STACKS = {
  inherit: "inherit",
  "Microsoft YaHei": '"Microsoft YaHei", sans-serif',
  KaiTi: 'KaiTi, serif',
  SimSun: 'SimSun, serif',
  SimHei: 'SimHei, sans-serif',
  STXingkai: '"STXingkai", "Xingkai SC", KaiTi, serif',
  monospace: 'ui-monospace, Consolas, "Courier New", monospace',
};
const FONT_FAMILY_LABELS = [
  { v: "inherit", get label() { return weT("默认"); } },
  { v: "Microsoft YaHei", get label() { return weT("雅黑"); } },
  { v: "KaiTi", get label() { return weT("楷体"); } },
  { v: "SimSun", get label() { return weT("宋体"); } },
  { v: "SimHei", get label() { return weT("黑体"); } },
  { v: "STXingkai", get label() { return weT("行楷"); } },
  { v: "monospace", get label() { return weT("等宽"); } },
];
// 依持久化值取应用字体栈。取值域有两类**族键**（都只存键、不存栈）：
//   · 内置键：FONT_FAMILY_STACKS 里的那些（栈写死在这里，含中文 fallback 链）；
//   · 本机字体键 `sys:<族名>`：清单来自宿主枚举（src/system-fonts.js），栈在这里现拼。
// 另有一类**历史值**：组件字体可能存的是"解析后的 CSS 栈"（见 onComponentFamily 的注释）
// —— 那种值原样可用，因此解析侧两条都认（老字体集零迁移）。
const FONT_FAMILY_BY_STACK = Object.create(null);
for (const [key, stack] of Object.entries(FONT_FAMILY_STACKS)) FONT_FAMILY_BY_STACK[stack] = key;
// 本机字体栈的**最后一道**兜底链：只有 `--we-host-font-family`（宿主原字族的快照）也拿不到时
// 才用到。之所以优先用快照：fallback 链是 DSH 的决定（中文/等宽的退路都在里面），抄一份到这里
// 就会在下一次 DSH 调整时漏改。
const FONT_STACK_FALLBACK = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif';
/**
 * **每条非 `inherit` 的栈都以它收尾**：先用自己的族名，再退回 **DSH 原来那条字族链的运行时快照**。
 *
 * 为什么内置族键也要收尾（**现场教训**）：内置那几条栈是**给 Windows 写的**（`KaiTi` / `SimSun` /
 * `STXingkai` …）。在 macOS 上它们**一个都不存在**（实测 `KaiTi` / `STXingkai` 都匹配不上）——
 * 不收尾时 `--dsw-font-family: KaiTi, serif` 会把**整个界面**压到 `serif`（Times），比"没生效"更糟。
 * 收尾之后，匹配不上的族名只是"这一档不起作用"，后面的 DSH 原链照常接管（中文 / emoji / 等宽都在）。
 */
const FONT_STACK_TAIL = ', var(--we-host-font-family, ' + FONT_STACK_FALLBACK + ')';
/** `sys:` 键 → `"<族名>"`（族名一律加引号：空格、连字符、中文名都安全）。 */
function systemFontStack(key) {
  const name = systemFontNameOf(key);
  return name ? '"' + name + '"' : "";
}
/** 族键 / 历史栈 → 可用的 CSS 栈；空、`inherit`、未知一律 `inherit`（= 不覆盖官方外观）。 */
function fontFamilyStack(v) {
  const key = typeof v === "string" ? v.trim() : "";
  if (!key || key === "inherit") return "inherit";
  const base = FONT_FAMILY_STACKS[key] || (isSystemFontKey(key) ? systemFontStack(key) : (FONT_FAMILY_BY_STACK[key] || ""));
  if (!base || base === "inherit") return "inherit";
  return base + FONT_STACK_TAIL;
}
/** 反查：存下来的值（族键或历史栈）→ 下拉该选哪一项（空串 = 跟随 / 认不出的历史栈）。 */
function fontFamilyKeyOf(v) {
  const key = typeof v === "string" ? v.trim() : "";
  if (!key) return "";
  if (FONT_FAMILY_STACKS[key] || isSystemFontKey(key)) return key;
  return FONT_FAMILY_BY_STACK[key] || "";
}
/**
 * **摊平**成具体字体列表（没有 `var()`）—— 给"会被当成字体名列表**字符串**用掉"的下游。
 *
 * 为什么需要它：`fontFamilyStack` 给本机字体拼的是 `"<族名>", var(--we-host-font-family, …)`，
 * 那是给**CSS 声明**用的（`var()` 由浏览器替换）。但 dsh-ssh 的终端面板是把
 * `--dsh-ssh-terminal-font` 的值**当字符串读走再交给 xterm 的 `fontFamily` 选项**
 * （xterm 的 DOM/画布渲染器都不认 `var()`，`ctx.font` 里它就是个字面量 ⇒ 整条字体列表失效）。
 * 所以喂给它的那一份必须**当场摊平**：快照取不到就退回那条保底链。
 */
function fontFamilyStackConcrete(v) {
  const stack = fontFamilyStack(v);
  if (stack.indexOf("var(") < 0) return stack;
  let snapshot = "";
  // 读的是 documentElement 上的**内联**属性（`snapshotHostFontDefaults` 写在那儿）——
  // 内联读不触发样式重算（不像 getComputedStyle 那样强制布局）。
  try { snapshot = document.documentElement.style.getPropertyValue("--we-host-font-family").trim(); } catch { /* 拿不到就用保底 */ }
  return stack.replace(/var\(--we-host-font-family,\s*([^)]*)\)/, snapshot || "$1");
}
// 帧率上限 options (fps); 0 = 无限制. Mirror of the host whitelist.
// 场景实时渲染（WebWallGL）帧率上限档位。Mirror of lib/settings-schema.js 的 FPS_CAP_VALUES.

// 配色 presets for the settings-page liquid-glass theme. The accent drives
// buttons/sliders/selected cards/badges and the glass sheen via --we-accent;
// users can also pick any color with the native <input type="color">.
const ACCENT_PRESETS = [
  "#4f8cff", // 经典蓝 (default)
  "#67DCE7", // 冰青 (summer-liquid-glass primary)
  "#DD8FAC", // 玫瑰粉 (summer-liquid-glass brand)
  "#F3B75F", // 琥珀金
  "#F1717F", // 珊瑚红
  "#CBE77D", // 黄绿 (success)
];

// 玻璃颜色 presets for the settings-window glass BASE tint (--we-surface-tint-light/dark).
// The first two are the stock-look defaults (white in light mode, deep navy in
// dark); picking any preset (or a custom color) tints the glass in BOTH themes.
const GLASS_COLOR_PRESETS = [
  "#ffffff", // 白（浅色默认）
  "#0d1524", // 深夜蓝（深色默认）
  "#67DCE7", // 冰青
  "#DD8FAC", // 玫瑰粉
  "#F3B75F", // 琥珀金
  "#F1717F", // 珊瑚红
];

// 输入光标颜色 presets：光标要在壁纸/玻璃底上「跳出来」，高对比的
// 黑白最常用，其余给想让光标带主题色的用户；任意色可用后面的自定义取色器。
const CARET_COLOR_PRESETS = [
  "#ffffff", // 白（深色/深色壁纸）
  "#000000", // 黑（浅色壁纸）
  "#4f8cff", // 经典蓝（默认 accent）
  "#67DCE7", // 冰青
  "#DD8FAC", // 玫瑰粉
  "#F1717F", // 珊瑚红
];

// ── Persisted selection ─────────────────────────────────────────────────────


// 设置规范化：白名单与每个键的校验规则**全部**来自 lib/settings-schema.js（唯一真源）。
// 宿主侧调用同一个函数（side='host'，不收 CLIENT_ONLY 的键），因此两侧不可能再漂。
function sanitizeSettings(o) {
  return sanitizeFromSchema(o, "client");
}

// `readPersisted()` 已随持久化层抽到 src/persistence.js（store 初始化仍在下面调用它）。

// ── Shared selection store (React + DOM layer share it) ────────────────────
const selection = {
  // ① 视图态默认值（`DEFAULTS_ONLY`）：它们**不在持久化白名单里** ⇒ `readPersisted()` 与本地缓存都
  //    不会提供，不显式铺这一层就是 `undefined`。默认 false 的键侥幸无事，**默认 true 的会静默失效**
  //    （`themeTypeOnly` 就这样失效过：代码声称默认开、界面上却是关的）。
  ...panelDefaults(),
  ...readPersisted(),
  // 字体值走**另一条**通道：真源是 `fontsets/<活动 id>.json`。
  // ⚠️ 顺序是承重的，两行都不能少：
  //   ① `fontValueDefaults()` —— 那些键已不在 settings 白名单里，`readPersisted()` **不再提供**它们，
  //      而字体集是异步载入、还可能失败。缺这份兜底 ⇒ selection 里根本没有 themeColors 等键，
  //      面板「字体自定义」门控的配色区会在打开开关那一刻抛 TypeError（整个面板崩掉）。
  //   ② `readCachedFontSetValues()` —— 有缓存就用缓存那份（首帧即用户字体，不出现默认值→用户值跳变）；
  //      没有时它返回的就是①那份兜底。宿主回了真值再由 loadFontSet() 覆盖。
  ...fontValueDefaults(),
  ...readCachedFontSetValues(),
  // 本机字体清单（src/system-fonts.js）：**首帧就用缓存那份** —— 否则一个已选中的本机字体
  // 在下拉里会先显示成"跟随"，等宿主回话才跳回来。`systemFontsAt: 0` 让它照样算过期，
  // 打开字体设置时该重扫还是会重扫（缓存只是"先有个能显示的名字"）。
  systemFonts: readCachedSystemFonts(),
  // Transient: becomes true once loadPersisted() has applied the host-side
  // settings (the port-independent source of truth).
  hostLoaded: false,
  // Transient（本机字体清单）：来源永远是宿主那次进程扫描 ⇒ 不落盘、不进字体集。
  //   systemFontsAt   上次取到的时刻（TTL 判据）
  //   systemFontsApproximate  宿主是**按文件名推测**出来的（面板要说出来）
  //   systemFontsLoading / systemFontsError  在途 / 可判定失败文案
  systemFontsAt: 0,
  systemFontsApproximate: false,
  systemFontsLoading: false,
  systemFontsError: "",
  // Transient: 活动字体集那一次加载的失败原因（面板据此显示可判定文案；空串 = 没问题）。
  fontSetError: "",
  // Transient（字体集编辑器）：
  //   fontSetOpen  子分支开关（视图态，defaults-only；这里显式给一份，缓存路径下也确定）
  //   fontSets     宿主清单（来源永远是宿主 ⇒ 只做瞬态，不落盘）
  //   fontSetActive 活动集 id（宿主的 `active`）
  //   fontSetLoading 清单在途
  //   fontSetEditing/fontSetDraftName  正在改名的那一行 + 输入框内容
  fontSetOpen: false,
  fontSets: [],
  fontSetActive: "",
  fontSetLoading: false,
  fontSetEditing: "",
  fontSetDraftName: "",
  // Transient（玻璃预设）：清单与失败原因来自宿主（不落盘）；saving/draftName 是保存
  // 对话框第一行（名字）的视图态；busy 是任何在途动作（应用/保存/导入/删除/清单）；
  // assetChecks 是保存对话框的资产勾选态（ADR-0011 D4：字体默认勾）；
  // note 是导入成功这类一次性提示（成功与失败不同屏）。
  // store 见 src/preset-store.js。
  glassPresets: [],
  glassPresetError: "",
  glassPresetBusy: false,
  glassPresetSaving: false,
  glassPresetDraftName: "",
  glassPresetNote: "",
  // 对话框用途（"save" = 存进预设栏 / "export" = 导出为文件；"" = 关着）。保存与导出
  // 共用同一组资产勾选项，导出时这是"对哪一份导出"的 id 载体（glassPresetTargetId）。
  glassPresetSaveTarget: "",
  glassPresetTargetId: "",
  glassPresetAssetChecks: { font: true, fontAvailable: false },
  url: null,
  type: null,
  previewUrl: null,
  // Transient: real container suffix of the media (host inventory `mediaExt`, e.g. "mp4").
  // The media URL is token-shaped (`/media/<base64url>`) with no extension, so the
  // "browser can play this natively" decision (see src/video-layer.js) needs this field.
  mediaExt: null,
  // Transient: 图片 / 幻灯片壁纸的图集入口（host inventory `slidesUrl`，形如
  // `/wallpaper-engine/slides/<token>`；只有图集 ≥2 张时才给）。`buildMedia` 据此在底层
  // 封面图上叠交叉淡化层；`slideIntervalMs` 是 WE 项目里声明的那一档（`imageswitchtimes`），
  // 用户设置 `pictureSlideSeconds` 非 0 时以用户为准。两者都不落盘 —— 它们随壁纸变。
  slidesUrl: null,
  slideIntervalMs: null,
  // Transient: scene wallpaper animation MP4 URL (host /scene-video route).
  // When present the scene plays as a hardware-decoded <video>; on load error
  // it is nulled and the layer rebuilds as a still image (the frame URL:
  // live-backfilled GPU frame / user-imported custom frame / empty state).
  sceneVideo: null,
  // Transient: WebWallGL 实时渲染 token（host /scene-files 路由的 src 参数）。
  // 场景取 sceneLiveSrc（主文件 token：pkg 容器或松散入口 json），网页取 webLiveSrc（入口 HTML）；
  // 存在且开关开启且无失败记忆时以 live iframe 形态播放
  //（buildMedia 最高优先级，见 liveRenderEnabled）。
  sceneLiveSrc: null,
  webLiveSrc: null,
  // Transient: 「壁纸属性」面板入口（host /props/<token>，仅场景/网页壁纸有）。
  propsUrl: null,
  // Transient: live 渲染心跳已确认出帧（startLiveWatch）。音频互斥（live 时
  // WebWallGL 自播包内音频，不再启动外置 <audio>）与卡片状态用。
  sceneLiveActive: false,
  // Transient: 场景包内独立音频（mp3/ogg 等，host /scene-audio 路由）。与
  // sceneVideo 互斥使用 —— 内嵌 MP4 时视频自带音轨；无内嵌视频时由独立
  // <audio> 元素播放，音量/开关复用 videoVolume / videoAudioEnabled。
  sceneAudioUrl: null,
  sceneHasAudio: false,
  // Transient: source media metadata ({ width, height, codec, fps }) from
  // /media-info (host moov probe, cached).
  mediaInfo: null,
  // Transient: whether dsh-better-sidebar is installed & enabled (host reports
  // it via the settings GET response). Gates the 侧栏玻璃 control group in the
  // picker — the knobs are meaningless without the sidebar, so they only show
  // when it is actually there.
  sidebarPresent: false,
  // Transient: 抽帧转码 lifecycle — "idle" | "working" | "ready" | "fallback"
  // | "skipped" (see maybeUpgradeToTranscoded).
  transcodeState: "idle",
  // Transient: { phase: "download"|"transcode"|"done"|"error", percent, source }
  // polled from /transcode-progress while "working" (progress bar).
  transcodeProgress: null,
  playing: true,
  // 真实播放态（transient）: `playing` 是「用户意图」，这里是 <video>
  // 元素的真实状态。play() 可能被拒（自动播放策略 / 浏览器解不了自上传视频的
  // 编码 / 被紧接着的 src 切换打断），只信意图的话面板会一直写「播放中」、
  // 卡片上唯一的按钮是「暂停」—— 壁纸冻在首帧（看上去就是空白）而用户找不到
  // 「继续」。见 syncVideoState / applyVideoPlayback。
  videoPlaying: true,
    // 播放失败原因（transient，"" = 正常）。非空时当前壁纸卡片显示一句
  // 可读原因，提示用户重试或换编码。
  videoError: "",
  // 选择被拒原因（transient）: applySelection 没能应用该 id（被内容分级 /
  // 类型过滤排除，或文件已消失）—— 卡片上给出一句可操作的说明。
  blockedNote: "",
  loading: false,
  rotationTimer: null,
  // Draft of the rotation group currently being created/edited in the picker
  // (null when the editor is closed). Mutated live; committed on 保存.
  editing: null,
  // Transient picker UI state (NOT persisted): batch hide/restore selection
  // mode, the open/closed state of the wallpaper picker MODAL and its active
  // view ("normal" | "hidden"). The hidden section used to be inline; it now
  // lives as a tab inside the modal (see WallpaperPicker).
  batchMode: false,
  batchSelected: [],
  page: 0,
  hiddenPage: 0,
  editorPage: 0,
  hiddenOpen: false,
  pickerOpen: false,
  // Transient: 库视图的用途开关 —— true = 轮播编辑器的「选择壁纸」下钻
  //（点卡片 = 加入/移出草稿，不切当前壁纸）；false = 普通下钻（点卡片即应用）。
  pickerDraft: false,
  modalView: "normal",
  // Transient: picker-modal title search (not persisted).
  search: "",
  // Transient: 快捷播放面板自己的搜索词（与库视图互不影响；不落盘）。
  // 类型筛选与设置页共用持久化键 `typeFilter`（"两处同步、不做单独的"是用户口径）。
  qpSearch: "",
  // Transient: 侧栏底栏的深链请求 —— "打开设置页后停在哪一页"（`""` = 无请求）。
  // 由 WallpaperPicker 的一个 effect 消费一次即清（见 src/sidebar-right.js 的
  // openSettingsSection 与 client.js 的「侧栏深链」段）。
  settingsTabRequest: "",
  // 破坏性动作的「面板内确认」令牌 —— **所有族共用这一个真源**（`""` = 没有动作待确认）。
  // 形态 `<族>:<id>`（族内带 id 的动作）或 `<族>`（整块动作）。机制与三条不变量见
  // `armConfirm` 那一段（本文件，"破坏性动作的面板内确认"）。**不是** picker 私有字段：
  // 轮播列表 / 移除自定义壁纸 / 批量隐藏 / 全部恢复 / 删字体集 五处共用它。
  armedConfirm: "",
  // Custom-upload UI state (transient): in-flight flag + last error message.
  uploading: false,
  // ── 在线图库（本 fork 新增）的瞬态态：拉取结果 / 已选 url / 忙碌 / 错误 / 提示 / 下载结果 ──
  galleryItems: [],
  gallerySel: [],
  galleryBusy: false,
  galleryError: "",
  galleryNote: "",
  galleryResult: null,
  uploadError: "",
  uploadNote: "",
  // Upload-directory editor (transient): open state + draft path.
  editingUploadDir: false,
  uploadDirDraft: "",
  // 缓存位置编辑器（transient）：开态 + 草稿路径 + 上次错误。**生效值由 inventory.cacheDir
  // 携带**（host 是唯一真相）—— 它给的是解析链的答案，设了 `DSH_WE_CACHE_DIR` 时这个答案
  // 和用户填的值不同，界面据此提示"当前由环境变量覆盖"。
  editingCacheDir: false,
  cacheDirDraft: "",
  cacheDirBusy: false,
  cacheDirError: "",
  cacheDirNote: "",
  // 缓存位置目录浏览器（transient）：null=关。列表条目是宿主给的 { name, path } ——
  // path 原样回传问下一级，客户端**不做任何路径拼接**（分隔符/盘符大小写都是宿主的口径）；
  // display 是地址栏草稿（可手输，Enter 跳转），选中即把它填进 cacheDirDraft 走既有保存链。
  cacheDirBrowse: null,
  // WE 官方资源路径编辑器（transient）：开态 + 草稿路径 + 上次错误。
  // 生效状态（目录/可用性）由 inventory 携带（host 是唯一真相）。
  editingWeAssetsDir: false,
  weAssetsDirDraft: "",
  weAssetsError: "",
  inventory: { installDir: null, uploadDir: null, cacheDir: null, weAssetsDir: null, weAssetsAvailable: false, sceneMediaBase: "", wallpapers: [], total: 0, portableCount: 0, playlists: [], error: null },
  loaded: false,
};

const listeners = new Set();
function emit() { for (const fn of [...listeners]) fn(); }
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ── 皮肤中心（dsh-skins）互操作：皮肤在台上 ⇒ 我方整族退场 ─────────────────────
// 对立面已由对方实现（只读 `body[data-we-wallpaper]`：壁纸应用时皮肤整体停画）；这里补
// **反向**——皮肤试穿 / 应用时我方让路。信号只有一条腿，只读、绝不写对方任何状态：
//   `html[data-dsh-skin]` = 对方"皮肤在台上 / 皮肤要求上台"的公开标记。dsh-skins#49 起，
//   对方的**显式**试穿 / 应用会让这一次激活照常上台并重写该属性（同值 setAttribute 也产生
//   mutation record ⇒「重复应用同一款」同样可见）；对方另给了那条让路信号 1500ms 上限，
//   我们不接时它会自己退回普通停画。早先为补"应用"这条腿做的轻轮询
//   （`GET /api/skin-center/v2/active`）已随该契约落地整体删除 —— 纯事件、无网络。
// 退场 = 清当前壁纸（若设过；层 / 遮罩 / `body[data-we-wallpaper]` 随 `selection.url` 一起退）
//        + 玻璃整族门控整组不匹配（与旧「要不要玻璃 = 关」同语义；落点在 applyGlass 与
//        effects 的两个门控点）
//        + **主题放回**（`themeFollowRelease`，随清空路径自动走到）：我方为这张壁纸改过主题
//        才放回原值；别人改过（让位标记 / 现值对不上）就一个字节都不碰 —— "退干净"与
//        "不硬覆盖回去"两条在这里合流。没设壁纸时前半条是空操作，但玻璃让路照常 —— 玻璃与
//        壁纸正交（data-we-glass-page 恒挂），皮肤在台上时它不该盖在皮肤上。
// 复位 = 持续不在台上（滞回，见下）才做：按记忆放回壁纸与轮播开关；用户期间手动选过壁纸
//        就不抢（手动重选那条路会**立刻**退让路，见 src/media-prep.js 的钩子）。放回壁纸时
//        主题评估走 `fromSkinRestore`（不复位让位标记）：皮肤在台期间用户改过的主题活过这次
//        放回，不被打回壁纸判决。
// ⚠️ 轮播会把"空 id"当信号自动补位（`rotationEnabled && !id` ⇒ 取候选第一张），所以退场
//    必须连轮播一起按停，否则刚清掉的壁纸会被自己补回来。
const SKIN_YIELD_EXIT_GRACE_MS = 2600; // 复位宽限：对方 refresh 会先把标记摘掉再补回，瞬时摘不算退场
const SKIN_YIELD_ENTER_GRACE_MS = 450; // 退场宽限：对方的**启动上妆**是瞬时翻转（随后被它自己的 refresh 自纠），
                                       // 真实动作会持续 ≥1.5s（它的让路宽限）⇒ 只认"过一拍还在"的出现
let skinYielded = false;
let skinYieldMemory = null;        // { id, rotationEnabled }：退场前的用户选择
let skinYieldExitTimer = null;     // 复位要「持续不在台上」才执行（对方 refresh 的瞬时空窗不算退场）
let skinYieldEnterTimer = null;    // 退场要「过一拍还在台上」才执行（对方启动上妆的瞬时翻转不算动作）

/** 让路态是否生效（glass / effects 的门控点读它）。try 防 TDZ：prelude 早于 client 主体执行。 */
function skinYieldActive() {
  try { return skinYielded === true; } catch { return false; }
}

/** 皮肤上台 ⇒ 退场（幂等）。 */
function enterSkinYield(reason) {
  if (skinYielded) return;
  skinYielded = true;
  skinYieldMemory = { id: String(selection.id || ""), rotationEnabled: selection.rotationEnabled === true };
  // 记忆**落盘**（skinYieldRestoreId / skinYieldRestoreRotation，schema 两枚无界面键）：
  // 让路态跨重启后模块记忆归零、盘上只剩"清空后的现状" —— 认领与启动复位要靠这两枚
  // 键把退场前的选择拿回来，否则重启一次记忆就丢、之后退皮肤永远放不回来。
  setSetting("skinYieldRestoreId", skinYieldMemory.id);
  setSetting("skinYieldRestoreRotation", skinYieldMemory.rotationEnabled);
  if (selection.rotationEnabled) setSetting("rotationEnabled", false);
  applySelection("");        // 清层：url=null ⇒ syncLayers 摘层 / 遮罩 / data-we-wallpaper
  persistSelection();
  applyEffects();            // 让路态里玻璃门控整族摘除
  emit();
  reportClientDiag("skin-yield", "enter · " + reason + " · restore=" + (skinYieldMemory.id || "-"));
}

/** 皮肤退场 ⇒ 复位（幂等）。`opts.skipRestore` = 调用点自带新选择（手动重选那条路）。 */
function exitSkinYield(reason, opts) {
  if (!skinYielded) return;
  const skipRestore = !!(opts && opts.skipRestore);
  skinYielded = false;
  const mem = skinYieldMemory || {};
  skinYieldMemory = null;
  if (!skipRestore && !selection.id && mem.id) {
    // `fromSkinRestore`：这次应用是"皮肤退场后的放回"—— 主题评估据此**不复位让位标记**，
    // 皮肤在台期间用户改过的主题不被这次放回盖掉（"切换过主题不硬覆盖回去"）。
    applySelection(mem.id, { fromSkinRestore: true });
  }
  if (mem.rotationEnabled && selection.rotationEnabled !== true) setSetting("rotationEnabled", true);
  // 落盘记忆已消费（放回，或被用户新选择取代）⇒ 清掉 —— 别留给下一次启动当陈旧依据。
  setSetting("skinYieldRestoreId", "");
  setSetting("skinYieldRestoreRotation", false);
  persistSelection();
  applyEffects();
  emit();
  reportClientDiag("skin-yield", "exit · " + reason);
}

/**
 * 排定一次退场：对方**启动上妆**（它的运行时在我们的标记到达前先按持久化选择上妆）会在自己的
 * `refresh()` 里被自纠，是一次**瞬时翻转**；而用户显式动作（#49）会一直亮着（它的让路宽限 1.5s
 * 才回收）。所以只认"过一拍还在"的出现：宽限结束时 DOM 仍带标记、且我方确实有要退的东西
 * （壁纸在台 ⇒ 清层；或**无壁纸**且设置已就位 ⇒ 只剩玻璃要让）⇒ 才是动作。
 * ⚠️ 450ms 必须显著短于对方的 1500ms 宽限，否则真实动作会在我们确认前被它回收。
 */
function scheduleSkinYieldEnter(reason) {
  if (skinYieldEnterTimer !== null || skinYielded) return;
  const fire = () => {
    skinYieldEnterTimer = null;
    try {
      if (!document.documentElement.hasAttribute("data-dsh-skin")) return; // 瞬时翻转：已自纠
      // 「我方在台上」有两条腿（竞态注见 syncSkinYield）：
      //   · 壁纸腿：标记在场 ⇒ 有层要让。它兼防启动竞态 —— 标记不在场时，只有"设置已
      //     就位且 id 为空"（真·无壁纸）才放行；设置在途（!loaded）或壁纸在册但层还没建
      //     （id 非空）都可能是竞态窗口，一律不算动作（实测报障：有壁纸时刷新掉壁纸）。
      //   · 无壁纸腿：没有层可清、也没有竞态可防，但玻璃整族仍盖在皮肤上（玻璃与壁纸
      //     正交，data-we-glass-page 恒挂）⇒ 这条腿也要进，否则无壁纸用户中途试穿 /
      //     应用皮肤永远摘不掉玻璃（安装期的 adopt 只管启动那一拍）。
      const wallMarkerOn = !!(document.body && document.body.hasAttribute("data-we-wallpaper"));
      if (!wallMarkerOn && (selection.id || !selection.loaded)) return;
      enterSkinYield(reason + "/dom");
    } catch { /* ignore */ }
  };
  try {
    if (typeof window === "undefined" || typeof window.setTimeout !== "function") { fire(); return; }
    skinYieldEnterTimer = window.setTimeout(fire, SKIN_YIELD_ENTER_GRACE_MS);
  } catch { fire(); }
}

/** 撤销已排定的退场（标记又消失了 / 卸载）。 */
function cancelSkinYieldEnter() {
  if (skinYieldEnterTimer === null) return;
  try { if (typeof window !== "undefined" && typeof window.clearTimeout === "function") window.clearTimeout(skinYieldEnterTimer); } catch { /* ignore */ }
  skinYieldEnterTimer = null;
}

/** 撤销已排定的复位（皮肤又回来了 / 卸载）。 */
function cancelSkinYieldExit() {
  if (skinYieldExitTimer === null) return;
  try { if (typeof window !== "undefined" && typeof window.clearTimeout === "function") window.clearTimeout(skinYieldExitTimer); } catch { /* ignore */ }
  skinYieldExitTimer = null;
}

/**
 * 排定一次复位：必须**持续**不在台上才真的复位 —— 对方 refresh（withheld 翻转）会先把
 * `html[data-dsh-skin]` 摘掉再补回，瞬时摘若直接复位，壁纸会被抢回来把皮肤顶掉。
 * 宽限结束时再合一次数；对方那条让路信号只有 1500ms 上限，2.6s 的宽限天然晚于它。
 */
function scheduleSkinYieldExit(reason) {
  if (skinYieldExitTimer !== null) return;
  const fire = () => {
    skinYieldExitTimer = null;
    try {
      if (document.documentElement.hasAttribute("data-dsh-skin")) return; // 又回来了
      exitSkinYield(reason + "/cleared");
    } catch { /* ignore */ }
  };
  try {
    if (typeof window === "undefined" || typeof window.setTimeout !== "function") { fire(); return; }
    skinYieldExitTimer = window.setTimeout(fire, SKIN_YIELD_EXIT_GRACE_MS);
  } catch { fire(); }
}

/** 合议当前状态：皮肤"要求上台"且我方确实在台上 ⇒ 退场；持续不在台上则排定复位。 */
function syncSkinYield(reason) {
  try {
    if (document.documentElement.hasAttribute("data-dsh-skin")) {
      cancelSkinYieldExit();
      // ⚠️ 「我方在台上」有两条腿：壁纸在台（标记在场 ⇒ 有层要让）与无壁纸（设置已就位
      //    且 id 为空 ⇒ 只剩玻璃要让）。启动竞态只长在壁纸腿上——对方运行时会先于我们的
      //    标记上妆（他们的首屏预判只管**交付文档**，管不到运行时那次同步读；那时
      //    `body[data-we-wallpaper]` 还没挂，因为我们的层是启动链解析完才建的），把它当
      //    动作会清掉壁纸（实测报障：有壁纸时刷新掉壁纸）。正确的收场是：让我们的层建起来
      //    → 标记挂上 → 对方 watcher 自行 withhold 撤掉皮肤。无壁纸腿没有竞态（没有层可清），
      //    随宽限进即可。不是立即退场：先排定一次"过一拍再确认"（见 scheduleSkinYieldEnter）。
      scheduleSkinYieldEnter(reason);
      return;
    }
    cancelSkinYieldEnter();
    if (skinYielded) scheduleSkinYieldExit(reason);
  } catch { /* 互操作是增强：任何异常都不波及壁纸主路径 */ }
}

/** 装上互操作（单腿：DOM 观察）；返回幂等 teardown。 */
function installSkinInterop() {
  if (typeof document === "undefined" || !document.documentElement) return () => {};
  let observer = null;
  try {
    observer = new MutationObserver(() => syncSkinYield("dom"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-dsh-skin"] });
  } catch { observer = null; }
  // 启动期的「认领」：只认领现状，不当作动作。认定条件：
  //   · 皮肤在台上（文档交付时 tap 已画）+ 我方**没有**选中的壁纸 ⇒ 本来就该在让路态
  //     （玻璃退场）——认领，不清层；记忆从**盘上落的那份**拿（enter 写的
  //     skinYieldRestoreId / skinYieldRestoreRotation），没落过盘才退回空记忆；
  //   · 皮肤在台上 + 我方有选中的壁纸 ⇒ 壁纸赢（对方的 withhold 会处理皮肤），不动；
  //   · 皮肤**已不在**台上 + 我方没有壁纸 + 盘上留着让路记忆 ⇒ 启动复位：按记忆放回
  //     （应用关闭期间皮肤被移除 / 卸载的那条路 —— 没有它，记忆落了盘也无人消费）。
  // ⚠️ 认领必须等**宿主设置到位**（`selection.loaded`）：本地缓存可能过期（本窗口缓存空、
  //    宿主却有壁纸）——那时认领会留下"壁纸在画 + 我们却在让路态"的错位。
  let adoptPending = true;
  const adoptOnLoaded = () => {
    if (!adoptPending || !selection.loaded) return;
    adoptPending = false;
    try {
      if (document.documentElement.hasAttribute("data-dsh-skin") && !selection.id) {
        const rid = String(selection.skinYieldRestoreId || "");
        skinYielded = true;
        skinYieldMemory = {
          id: rid,
          rotationEnabled: rid ? selection.skinYieldRestoreRotation === true : selection.rotationEnabled === true,
        };
        applyEffects(); // 认领即刻摘玻璃门控（首次 applyEffects 可能已经跑过）
        reportClientDiag("skin-yield", "adopt · install/dom");
      } else if (!document.documentElement.hasAttribute("data-dsh-skin") && !selection.id
        && String(selection.skinYieldRestoreId || "")) {
        skinYielded = true;
        skinYieldMemory = {
          id: String(selection.skinYieldRestoreId || ""),
          rotationEnabled: selection.skinYieldRestoreRotation === true,
        };
        exitSkinYield("boot-restore"); // 借 exit 的消费路径：放回 + 清落盘记忆 + 落盘 + 诊断行
      }
    } catch { /* 互操作是增强：任何异常都不波及壁纸主路径 */ }
  };
  const unsubAdopt = subscribe(adoptOnLoaded);
  adoptOnLoaded(); // remount / 已加载：立刻判一次
  return () => {
    try { if (observer) observer.disconnect(); } catch { /* ignore */ }
    cancelSkinYieldExit();
    cancelSkinYieldEnter();
    try { unsubAdopt(); } catch { /* ignore */ }
    skinYielded = false;
    skinYieldMemory = null;
  };
}

// ── 「终端字体」抢跑一次（**时机问题**，不是优化）────────────────────────────
// dsh-ssh 的终端面板**只在构造终端的那一刻**读 `--dsh-ssh-terminal-font`，之后只有它自己的设置
// 变化才重读（见 src/font/apply.js 里 `applyTerminalHostVar` 的注释）。而我们的权威值要等宿主把
// 设置与字体集**异步**读回来 —— 终端常常在那之前就建好了（现场症状："重启了还是口"）。
// 这里用**同步可读**的那份缓存（localStorage 里的字体集 + 设置缓存）先把值写上，抢在别的插件
// 构造终端之前；宿主回话后由 applyEffects → applyComponentFonts 再写一遍权威值。
// ⚠️ 必须是正文里的**顶层语句**：内联模块被注入在正文之前，模块顶层读 selection 会撞 TDZ。
applyTerminalHostVar();

// ── 出图来源：场景壁纸「这张画面从哪来」（beta 渲染不参与）───────────────
// 值域的**真源**在宿主侧 `packages/media-bridge/lib/routes/scene-frame.js`（它把非法值 clamp 掉）——本表要与它一致，
// 只剩两档：
//   0 = 自动（求链头：实时抓帧 → 自定义画面 → 空态）
//   4 = 强制自定义画面（用户导入的截屏）
// ⚠️ UI **只能给出上面这两档**：别的值到了宿主一律被 clamp 成 0，点了等于"没反应"。
// ⚠️ 表里存的是**档位值**（进 ?v=），不是下标；值域有洞（0 与 4）⇒ 推进不能用取模。
const FRAME_VARIANTS = [
  { id: 0, get label() { return weT("实时画面"); } },
  { id: 4, get label() { return weT("自定义画面"); } },
];
// 卡片类型徽标（卡片左上角）：与「类型」筛选的四类一一对应。
const CARD_TYPE_LABELS = {
  get video() { return weT("视频"); },
  get web() { return weT("网页"); },
  get image() { return weT("图片"); },
  get scene() { return weT("场景"); },
};
// 开启「壁纸音轨」时，音量若为 0 自动提升到的默认可听值（0–1）。
// 默认音量是 0（静音起步），而音轨开关只翻总开关不动音量 —— 不自动提音量的话，
// 用户点「音乐开」开关状态变了却依然无声，看起来就是「音量开/关都不生效」
//（注意勿误读：语义见 onToggleAudio）。
const DEFAULT_AUDIO_VOLUME = 0.5;
// 当前壁纸可用档位数：未导入自定义画面时只剩「自动」一档（切过去会被宿主 422）。
function frameVariantCount(selLike, wid) {
  const cf = selLike.customFrames || {};
  const inv = (selLike.inventory && selLike.inventory.wallpapers) || [];
  const wp = inv.find((w) => String(w.id) === wid);
  return (cf[wid] === true || (wp && wp.hasCustomFrame)) ? FRAME_VARIANTS.length : 1;
}
function frameUrlWithVariant(frameUrl, v) {
  if (!frameUrl) return frameUrl;
  const base = String(frameUrl).split("?")[0];
  return v > 0 ? base + "?v=" + v : base;
}
// ── React hook for the picker UI ────────────────────────────────────────────
function useStore() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  return selection;
}

// ── 改 store 的三个入口────────────────────────────
// "赋值 + persistSelection()" 必须成对，而手抄这份成对关系时**漏掉 persist 就是静默失效**
// （"改了不生效 / 刷新后回退"，且没有任何判据会红）。收成三个入口后：
//   · setSetting(field, value)   改**设置**并落盘（唯一入口）
//   · setFontValues(patch)       改**字体值**并落盘（唯一入口；真源是 fontsets/<id>.json，
//     见 src/fontset-store.js —— 这些键已退出 settings 的持久化白名单）
//   · setTransient(field, value) 改**瞬态**字段（上传中/编辑中/加载中…），不落盘 ——
//     它们不在 schema 白名单里，落盘只会白跑一次 debounce。
// 页签（src/panel-tabs.js）通过 ctx 拿到前两个入口，因此**完全不碰** `selection`。
//
// ⚠️ 已知边界（守卫 ①e 的上界棘轮盯着，只许下降）：`src/media-prep.js` / `src/effects.js` /
// `src/live-layer.js` 手上只有 `selection`（没有入口可调），对**已知瞬态字段**仍有 11 处裸直写
// （`url` / `blockedNote` / `videoPlaying` / `videoError`）。要收掉得先把这三个入口注入进去 ——
// 在那之前，新增一处就会被判红，收掉一处要把上界一起下调（余量空转同样会被判红）。
function setSetting(field, value) {
  selection[field] = value;
  persistSelection();
  return value;
}
function setTransient(field, value) {
  selection[field] = value;
  return value;
}
// ── 拖动期的「看得见的那部分」（live）──────────────────────────────────────
// 拖动类控件（色板 / 滑块）在 input 上**每格**都发事件 —— 原生颜色轮盘一次拖动可以上百次。
// 若每格都 `setSetting + emit()`：emit 让整棵面板（设置页那棵最重）重渲染，而 emit 的
// 订阅者里那次全量 applyEffects 还会重建字体样式表、同步场景音频、并读出一次**强制同步
// 样式计算**（壁纸透明度 > 0 时）—— 拖动因此发涩（用户实测）。故分两档：
//   · live（input / 拖动中）：写值 + `applyEffects({ live: true })`（跳过与本次改动无关的
//     重活，样式变量照旧全量写），**不 emit** —— 面板不重渲染，数值回显由控件自己就地更新
//     （SliderRow 的 --we-fill / 原生色块的自身外观）；
//   · 抬手（change）：走完整的一次 —— `emit()`（applyEffects 是它的订阅者，全量那一次照旧）。
// 与「壁纸属性」面板的 silent 拖动同一条口径（src/picker-props-panel.js 的 onPropInput）。
// 拖动期的中间值**照样会落盘**（setSetting → debounce 200ms），所以中途关窗也不丢最后一次值。
function commitLiveSetting(field, value, live) {
  setSetting(field, value);
  if (live) applyEffects({ live: true });
  else emit();
}
/**
 * 同一套两档口径，但写给**瞬态**字段（`setTransient`，不落盘）。
 *
 * 为什么需要它：瞬态也有"拖动中每格都来"的场景（上传裁切的拖拽与缩放），而那些值同样
 * 只需要"看得见的那部分"跟手、**不需要**整棵面板重渲染。与 `commitLiveSetting` 同形成对 ——
 * 面板处理器写 store 必须能通知到（本仓既有判据），走这个入口就自动满足。
 */
function commitLiveTransient(field, value, live) {
  setTransient(field, value);
  if (live) applyEffects({ live: true });
  else emit();
}

/**
 * schema 的**取值域**（与 `readOne` 的 `num` 档同源；`min` / `max` 允许写成 `CONSTS` 的名字）。
 *
 * 为什么必须有它：滑块一类的处理器要自己钳一次（控件值可能来自键盘 / 粘贴），而**手写**那对
 * 数字会与 `KINDS` 漂移。⚠️ 这不是理论风险 —— 把刻度改成 0–100 时改了 `KINDS` 与面板量程，
 * 漏了这里手写的四处；后果比"钳错"更糟：`clampNum` 是**越界即回落到默认值**，于是一旦拖过旧上限，
 * 滑块就**跳回默认值**（用户实测：「玻璃透明度」最多只能拉到 20% —— 20 正是默认值）。
 * ⇒ 取值域只从 schema 取，不在这里出现数字。守卫 `verify-client` 对账这两者。
 */
const schemaRange = (key) => {
  const m = KINDS[key] || {};
  const lo = typeof m.min === "string" ? CONSTS[m.min] : m.min;
  const hi = typeof m.max === "string" ? CONSTS[m.max] : m.max;
  return [lo, hi];
};

// ── 破坏性动作的「面板内确认」（**唯一机制**，五个动作共用）─────────────────────
// 为什么禁用原生模态（`window.confirm` / `alert`）：本插件跑在**同一个渲染页**里，原生
// 对话框会把焦点交给它自己的窗口，后果三重的 ——
//   ① `blur` 立刻命中「窗口失焦时暂停」（`pauseOnBlur`，用户可开）⇒ 壁纸停住；
//   ② 模态在时渲染线程**被同步阻塞** ⇒ 输入框收不到键，壁纸即便焦点回来也恢复不了；
//   ③ 关闭时回来那个 `focus` 事件**不保证送达** ⇒ 遮挡判定卡在"窗口失焦"，只剩重载能救。
// 客户端另有 3s 低频复核（`OCCLUSION_RECHECK_MS`）把③自愈，但那是**兜底**：≤3s 的停摆
// 仍会发生，且②在原生模态下无解 ⇒ 本族一个 `window.confirm` 都不许有（守卫按 0 钉住）。
//
// 三条不变量：
//   1. **唯一令牌**：同一时刻最多一个动作待确认（`selection.armedConfirm` 是单值）⇒ 结构上
//      不可能同时挂着两个问句，也不可能"确认"到用户没看见的那个对象上。
//   2. **破坏性动作只由「确认」发起**：第一下点击只置令牌；真正的写操作是问句行里那枚
//      「确认」的回调 —— 不是"按钮里套一个 if"。置令牌与落地因此可以被分别断言。
//   3. **瞬态 + 上下文切换必清**：令牌不落盘；关模态框 / 换模态视图 / 退批量 / 换轮播列表 /
//      切页签都必须 `disarmConfirm()` —— 留着它会让问句跨上下文残留（用户在新上下文里看到
//      一个针对旧对象的问句）。
const armConfirm = (token) => { setTransient("armedConfirm", token); emit(); };
// **总是通知**（没有令牌也 emit）：这两个函数经常被拿来**顶替一句 `emit()`**（"换上下文 ⇒ 顺手清令牌"），
// 一旦这里在"本来就没有令牌"时静默返回，那条路径就**丢了重渲染** —— 视图停在上一个状态，直到用户
// 碰了别的控件才一起兑现（实测：收起「字体集预设」子分支时开关不动、再点别的按钮才连带收起）。
// 多一次幂等重渲比丢一次重渲便宜得多，所以这里不做"没变就不发"的优化。
const disarmConfirm = () => { setTransient("armedConfirm", ""); emit(); };
/** 该族当前待确认项的 id（没有 = `""`）。令牌形态 `<族>:<id>`；整块动作不带 id。 */
const armedIdOf = (family) => {
  const t = typeof selection.armedConfirm === "string" ? selection.armedConfirm : "";
  return t.indexOf(family + ":") === 0 ? t.slice(family.length + 1) : "";
};
/**
 * 「待确认」那一行：问句在左、两枚按钮（`确认` / `取消`）在右。不匹配令牌 ⇒ 返回 `null`。
 *
 * `armed` 是**读值**，`onConfirm` / `onDisarm` 是**回调** —— 由组件经 ctx 交给渲染器，
 * 渲染器自己不写 `selection`（两个渲染器的文件头契约）。问句文本由**调用点**现算（"选中的
 * N 张"这类计数跟着当前状态走），所以渲染器不许把它当常量缓存。
 * 4 处使用点（src/panel-tabs.js 两处 / src/picker-modal.js 两处）共用这一份标记：抄四份会让
 * "两字的按钮等宽""置灰不塌位"这类形态约束各走各的。
 *
 * ⚠️ `!token` 这一支是**必须的**，不是防御性编程：令牌由当前对象现算，对象没了就退化成 `""`
 * —— 那与"没有动作待确认"的 `""` **相等**，于是刚删掉的那个列表会留下一个指向空对象的问句行
 *（实测：删光列表后问句行不收起）。空令牌的语义是"这一处没有可确认的对象"，永不渲染。
 */
function renderConfirmRow(armed, token, question, onConfirm, onDisarm) {
  if (!token || armed !== token) return null;
  return React.createElement("div", { className: "we-picker__row we-picker__confirm-row" },
    React.createElement("span", { className: "we-picker__hint we-picker__confirm-ask" }, question),
    React.createElement("button", {
      className: "we-picker__btn", type: "button", onClick: onConfirm,
      title: weT("就这么办（不可撤销）"),
    }, weT("确认")),
    React.createElement("button", {
      className: "we-picker__btn", type: "button", onClick: onDisarm,
      title: weT("算了"),
    }, weT("取消")),
  );
}

// ── 设置持久化（debounce / 迁移 / 重试 / 启动加载）────────────────────────────
// 这一族的实现已抽到 **src/persistence.js**。构建期内联回本作用域，
// 调用点（persistSelection / flushPersist / onPageHideFlush / …）无需改动。
// 契约：8 个出向依赖的清单、入口与不变量 —— 见该文件头。
// ⚠️ **字体值不走这条通道**：那些键住 `fontsets/<活动 id>.json`，通道在
// **src/fontset-store.js**（同形的 debounce + 脏标记 + 重试，但真源、键集与失败语义都不同）。

// Concurrency guard: 刷新 / 上传完成 / 移除 / 改目录 all call loadInventory(),
// and two overlapping requests used to resolve in arbitrary order — an older,
// slower response could clobber a newer inventory. The last caller wins;
// superseded requests drop their result entirely.
/**
 * 把"请求失败"的两种情形翻成**同一句可读原因**（**唯一一处**）：
 *   · `status === 0` ⇒ 请求没完成（宿主不可达）—— 不是"宿主返回了 0"；
 *   · 其余 ⇒ 宿主有响应但非 2xx，优先用宿主给的原因（`{ error }`，需 `parse: "always"`）。
 * 面板与错误行都靠这句话告诉用户"到底哪一步不对"，所以不许各自手写。
 */
function hostFailureReason(res) {
  if (!res || !res.status) return weT("宿主不可达（请求未完成）");
  const data = res.data;
  return (data && data.error) || weT("宿主返回 {status}", { status: res.status });
}
let inventorySeq = 0;
/**
 * 启动预取：`/inventory` 与设置无关，启动链却把它排在 settings → fontsets → fontsets/<id>
 * 之后（见 apply 末尾的链）。apply 一开始就发出这一次请求，等链走到 inventory 时通常已经回来
 * （trace 2026-10-30：inventory 请求 971→1036ms，纯串行浪费）。
 * 只预取一次；`loadInventory` 消费后清空，手动刷新 / 轮播补拉仍走自己的请求。
 *
 * **预取只加速成功路径**：`apiFetch` 不抛错，网络瞬断会以 `{ ok:false, status:0 }` 的
 * 已兑现 promise 留在这里。若启动链直接消费这份失败结果，原本排在 settings/fontset 之后
 * （那时宿主通常已就绪）的那次请求就永远不发了 —— 启动反而更坏。所以消费前先看 `ok`：
 * 预取没成功就照旧发一次自己的请求。
 */
let inventoryBootPrefetch = null;
function prefetchInventoryOnce() {
  if (inventoryBootPrefetch) return inventoryBootPrefetch;
  try { inventoryBootPrefetch = apiJson(INVENTORY_URL); } catch { inventoryBootPrefetch = null; }
  return inventoryBootPrefetch;
}
async function loadInventory() {
  const seq = ++inventorySeq;
  setTransient("loading", true);
  emit();
  let next;
  const prefetched = inventoryBootPrefetch;
  inventoryBootPrefetch = null;
  try {
    let pre = null;
    try { pre = prefetched ? await prefetched : null; } catch { pre = null; }
    const res = pre && pre.ok ? pre : await apiJson(INVENTORY_URL);
    // 两种失败（宿主不可达 / 非 2xx）由 hostFailureReason 统一翻译，面板那一行据此显示。
    if (!res.ok) throw new Error(hostFailureReason(res));
    const data = res.data || {};
    next = {
      installDir: data.installDir,
      uploadDir: data.uploadDir || null,
      cacheDir: data.cacheDir || null,
      weAssetsDir: data.weAssetsDir || null,
      weAssetsAvailable: Boolean(data.weAssetsAvailable),
      // 场景载荷的源（独立壁纸媒体源的 origin；空串 = 回落应用源，见 live-layer 的 liveRenderUrl）。
      sceneMediaBase: typeof data.sceneMediaBase === "string" ? data.sceneMediaBase : "",
      wallpapers: data.wallpapers || [],
      total: data.total || 0,
      portableCount: data.portableCount || 0,
      playlists: Array.isArray(data.playlists) ? data.playlists : [],
      // 组件行状态面（ADR-0013 D3②）：原样透传，**不做归一化** —— 判据与失效口径都在
      // `weComponentVisible` 一处（字段缺席 / 形状不对 ⇒ 按可用渲染）。失败分支（下面的
      // catch）**有意不带这个键**：宿主不可达时可见面照常渲染，不许静默消失（D3③）。
      components: data.components,
      error: null,
    };
    // 玻璃行停用时回收残留（新开面板 / 手动刷新 / 上传完成都会走到这里）。
    // 放在"拿到新 components"之后、写 store 之前：门控与变量必须先撤干净，
    // 随后这次 render 才不会在"行已停用但玻璃还在"的中间态上画一帧。
    reclaimGlassResidue(data.components);
  } catch (err) {
    next = {
      installDir: null,
      uploadDir: null,
      cacheDir: null,
      weAssetsDir: null,
      weAssetsAvailable: false,
      sceneMediaBase: "",
      wallpapers: [],
      total: 0,
      portableCount: 0,
      playlists: [],
      error: String(err && err.message ? err.message : err),
    };
  }
  if (seq !== inventorySeq) return; // superseded by a newer loadInventory()
  setTransient("inventory", next);
  setTransient("loading", false);
  setTransient("loaded", true);
  // 宿主一次不可达 ≠ 库空了（#295）：上面 catch 造的是一份**全空**的 next，只够让面板显示
  // 「未检测到…」+「重试」。拿它继续跑下面的播种 / 列表校验 / 轮播开关，等于把"这次没读到"
  // 当成"用户把壁纸全删了"——首载失败会先烧掉 `rotationSeeded` 再播种（下次真加载反而不播种），
  // 并把 `rotationEnabled` 永久置 false 落盘（重启后仍是关着的）。轮播那一组状态因此整块跳过；
  // 仍需 `revalidateSelection()` 按这一版库存重算「当前壁纸还在不在」（空库落到未选择态，
  // 重试成功后会被再校验回填），然后只刷一次 UI，把错误态交给面板。
  if (next.error) {
    revalidateSelection();
    emit();
    return;
  }
  // Fresh inventory → reset pagination, but ONLY when the wallpaper id set
  // actually changed: an upload/remove/refresh that keeps the same list must
  // not kick the user back to page 1.
  const prevIds = selection._invIds || "";
  const nextIds = next.wallpapers.map((w) => w.id).join("\u0001");
  if (prevIds !== nextIds) {
    setTransient("_invIds", nextIds);
    setTransient("editorPage", 0);
  }

  // Rotation groups: validate the active one and seed a first group from a
  // playable Wallpaper Engine playlist when the user has none yet (so the
  // rotation feature starts working out of the box, using ids the host already
  // resolved — no WE config.json path matching involved). Seeding happens once
  // (`rotationSeeded`), so deleting every list stays respected on refresh.
  if (!selection.rotationGroups.length && !selection.rotationSeeded) {
    selection.rotationSeeded = true;
    seedGroupsFromPlaylists();
    persistSelection();
  }
  if (selection.rotationGroupId && !activeRotationGroup()) {
    setSetting("rotationGroupId", "");
  }
  if (selection.rotationEnabled) {
    if (!selection.rotationGroupId) {
      const usable = firstUsableGroup();
      if (usable) selection.rotationGroupId = usable.id;
      else selection.rotationEnabled = false;
    } else if (rotationCandidates().length < 2) {
      const usable = firstUsableGroup();
      if (usable && usable.id !== selection.rotationGroupId) selection.rotationGroupId = usable.id;
      else if (!usable) selection.rotationEnabled = false;
    }
    persistSelection();
  }

  // Re-validate the selection against the refreshed inventory + filters (also
  // covers the rating/type filters): drop vanished/no-longer-matching
  // selections, then restore rotation state.
  revalidateSelection();
  scheduleSceneVideoResync();
}

// ── sceneVideo 诚实化的时序补拉 ────────────────────────────────────────────────
// 宿主侧 sceneVideo 是**真探测**的结果（遍历 .tex 找内嵌 MP4）：未命中缓存时
// 先给 null（不猜）并把探测投到后台（整库约 1–3 秒出定论），不用 hasFrame
// 冒充。而客户端只在启动 / 手动刷新 / 目录变更后重拉 inventory ⇒ **首次加载**时
// 真正内嵌 MP4 的场景会先落到静态帧（本机实测 3/35 个场景，探测本身 ~0.9s）。
// 这里对每一批「新的场景集合」补拉一次，把窗口收掉：只在库里有场景壁纸时补、
// 每批只补一次（补拉结果不会自触发成轮询）。
const SCENE_VIDEO_RESYNC_MS = 3000;
let sceneVideoResyncTimer = null;
let sceneVideoResyncedKey = ""; // 已补拉过的场景 id 集合指纹
function sceneVideoResyncKey() {
  const list = (selection.inventory && selection.inventory.wallpapers) || [];
  const ids = [];
  for (const w of list) if (w.type === "scene") ids.push(String(w.id));
  return ids.sort().join(",");
}
function scheduleSceneVideoResync() {
  if (typeof window === "undefined" || typeof window.setTimeout !== "function") return;
  const key = sceneVideoResyncKey();
  if (!key || key === sceneVideoResyncedKey) return; // 没有场景壁纸 / 这批已补过
  if (sceneVideoResyncTimer) return; // 已在等待
  sceneVideoResyncTimer = window.setTimeout(() => {
    sceneVideoResyncTimer = null;
    sceneVideoResyncedKey = key; // 先记账：这次补拉不会再排一个定时器
    loadInventory().catch(() => { /* 失败保持现状，用户仍可手动刷新 */ });
  }, SCENE_VIDEO_RESYNC_MS);
}

// ── Content-rating + type filters ───────────────────────────────────────────
// 判定本身（`ratingOf` / `matchesRatingFilter` / `matchesTypeFilter` /
// `isPlayableType` / `isRotatableWallpaper` / `isHiddenWallpaper`）与它们的分级正则已抽到
// **src/picker-model.js** —— 网格、轮换编辑器、轮换候选、自动选择与两个下拉的计数共用
// 同一份判定，判定留在本文件就会长出第二个真源。这里是**调用点**：两个过滤档从
// `selection` 显式传入，模型自己不读任何模块级状态。

// 选择被拒 / 被丢弃时的可读原因（`""` = 没有可解释的原因，正常应用）：壁纸层不渲染、
// 播放按钮因 !sel.url 变灰时，卡片上至少给出原因。类型档不在原因表里：它只筛选择器网格
// 的显示，不拦播放、也不影响轮播与「下一张」（keepPlayingWallpaper / isRotationEligible）。
function selectionBlockedNote(w) {
  if (!w) return weT("当前壁纸已不在列表里（可能已被移除或隐藏）");
  if (!isPlayableType(w)) return weT("这张壁纸没有可播放的媒体文件");
  if (!matchesRatingFilter(w, selection.contentRatingFilter)) return weT("这张壁纸的内容分级不在勾选的分级里 —— 在「内容分级」里勾上它所在的档即可播放");
  return "";
}

function playableInventory() {
  return playableWallpapers(
    selection.inventory.wallpapers, selection.contentRatingFilter, selection.typeFilter, selection.hiddenIds,
  );
}

// 「下一张」在轮播关闭时的池：与轮播候选同一份入选判据（内容安全 ∧ 可播放，不读类型档），
// 免得「类型档只筛显示」这条口径在轮播关闭的分支里漏掉一处。
function rotationPoolAll() {
  return selection.inventory.wallpapers.filter((w) =>
    isRotationEligible(w, selection.contentRatingFilter)
    && !isHiddenWallpaper(w.id, selection.hiddenIds));
}

// Re-validate the active selection against the current inventory + filters.
// Called after a refresh AND after changing the rating/type filter. 丢弃闸门是
// keepPlayingWallpaper：分级是内容闸门（勾选集合：勾上的档才允许播）；类型档只筛选择器
// 网格的**显示**，既不得把正在应用的壁纸干掉，也不得改变轮播成员与「下一张」（用户口径
// 2026-10-30 / issue #294）。轮播在场时拿不到候选就换下一张；当前壁纸被勾选集合挡掉
// 时**立即换台**（用户口径 2026-10-30：「换得了就换，换不了才提示」）。
function revalidateSelection() {
  // 被过滤条件丢弃的选择要留下原因：先取下来，applySelection("") 会清掉
  // blockedNote，故在其之后写回 —— 否则用户改一次过滤条件，壁纸就无声变空白。
  let droppedNote = "";
  const cur = selection.id ? selection.inventory.wallpapers.find((w) => w.id === selection.id) : null;
  const keepCurrent = keepPlayingWallpaper(cur, selection.contentRatingFilter);
  // 「被勾选集合挡掉」这一支要区分于「壁纸被移除 / 已不在列表」：只有前者才自动换台。
  const droppedByRating = Boolean(cur) && isPlayableType(cur)
    && !matchesRatingFilter(cur, selection.contentRatingFilter);
  if (selection.id && !keepCurrent) {
    droppedNote = selectionBlockedNote(cur);
    setSetting("id", "");
  }
  // 轮播在场时：当前壁纸不在候选里就换下一张。候选判据（isRotationEligible：可播放 ∧
  // 勾选集合）不含类型档 ⇒ 切类型档既不会把人踢下台，也不会改变轮播成员与「下一张」。
  if (selection.rotationEnabled && selection.id
    && !rotationCandidates().some((w) => w.id === selection.id)) {
    const first = rotationCandidates()[0];
    setSetting("id", first ? first.id : "");
  }
  if (!selection.id && selection.rotationEnabled) {
    const first = rotationCandidates()[0];
    if (first) selection.id = first.id;
  }
  // 收窄分级档把当前壁纸挡掉 ⇒ 立即换到当前档内第一张可播候选（轮播分支上面已接手，
  // 这里兜「轮播关闭」与「轮播在场但候选为空」两种）；一张都找不到才留提示。
  if (!selection.id && droppedByRating) {
    const first = playableInventory()[0];
    if (first) selection.id = first.id;
  }
  applySelection(selection.id);
  // 仍然没有可播壁纸 → 把被排除的原因显示出来（有接手则不打扰）。
  if (droppedNote && !selection.id) setTransient("blockedNote", droppedNote);
  emit();
}

// ── Rotation groups (user-defined carousel lists) ───────────────────────────
function activeRotationGroup() {
  return selection.rotationGroups.find((g) => g.id === selection.rotationGroupId) || null;
}

// byId lookup cache: groupWallpapers() is called from render, revalidate,
// rotation scheduling and firstUsableGroup() — rebuilding a full Map per call
// was O(N) × O(calls) on every emit. Keyed by the inventory ARRAY REFERENCE,
// so a fresh loadInventory() (which replaces the array) invalidates it.
let byIdCache = null;
let byIdRef = null;
function wallpaperById() {
  const list = selection.inventory.wallpapers;
  if (byIdRef !== list) {
    byIdRef = list;
    byIdCache = new Map(list.map((w) => [w.id, w]));
  }
  return byIdCache;
}

function groupWallpapers(group) {
  if (!group || !Array.isArray(group.wallpaperIds)) return [];
  const byId = wallpaperById();
  return group.wallpaperIds
    .map((id) => byId.get(id))
    .filter((w) => w
      && isRotationEligible(w, selection.contentRatingFilter)
      && !isHiddenWallpaper(w.id, selection.hiddenIds));
}

function rotationCandidates() {
  return groupWallpapers(activeRotationGroup());
}

function firstUsableGroup() {
  return selection.rotationGroups.find((g) => groupWallpapers(g).length >= 2) || null;
}

// First run / upgrade path: turn the first playable Wallpaper Engine playlist
// into a rotation group so existing setups keep working without any WE-side
// configuration. Returns true when a group was created.
function seedGroupsFromPlaylists() {
  const playable = selection.inventory.playlists.filter((p) => (p.portableCount || 0) >= 2);
  const source = playable[0];
  if (!source) return false;
  const ids = Array.isArray(source.wallpaperIds) ? source.wallpaperIds.slice() : [];
  if (!ids.length) return false;
  selection.rotationGroups.push({
    id: nextGroupId(),
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : weT("轮播列表"),
    interval: DEFAULTS.rotationInterval,
    order: source.order === "random" ? "random" : "sequence",
    trigger: "interval",
    wallpaperIds: ids,
  });
  selection.rotationGroupId = selection.rotationGroups[selection.rotationGroups.length - 1].id;
  return true;
}

function nextGroupId() {
  return "grp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// 轮换锚点 = 当前【实际显示】的壁纸（按 selection.url / sceneFrameUrl 反查），
// 而非裸 selection.id：storage 跨窗同步只改 id 不重建层，id 可能与上屏内容
// 脱节，以其为锚点会把"正在显示的"当作下一张再切回去（A→B→A→B 乒乓）。
// scene 的 selection.url 是 frameUrl 的变体形态（?v= 档位），按 sceneFrameUrl
// 反查才命中。
function rotationAnchorWallpaper() {
  const byId = wallpaperById();
  const sel = byId.get(selection.id);
  const matches = (w) => {
    if (!w) return false;
    if (w.media && w.media === selection.url) return true;
    if (w.frameUrl && (w.frameUrl === selection.url
      || (selection.type === "scene" && w.frameUrl === selection.sceneFrameUrl))) return true;
    return false;
  };
  if (matches(sel)) return sel;
  const displayed = selection.inventory.wallpapers.find(matches);
  return displayed || sel || null;
}

// 候选选择：排除锚点（当前显示）与已失败 id；sequence 从锚点位置向后取第一个
// 可用者，random 随机取。全部排除完返回 null（调用方 re-arm，下轮重新评估）。
function rotationNextCandidate(excluded) {
  const full = rotationCandidates();
  const anchor = rotationAnchorWallpaper();
  const anchorId = anchor ? anchor.id : selection.id;
  const usable = full.filter((w) => w.id !== anchorId && !(excluded && excluded.has(w.id)));
  if (!usable.length) return null;
  const group = activeRotationGroup();
  let pick = null;
  if (group && group.order === "random") {
    pick = usable[Math.floor(Math.random() * usable.length)] || null;
  } else {
    const cur = full.findIndex((w) => w.id === anchorId);
    for (let i = 1; i <= full.length; i++) {
      const w = full[(cur + i + full.length) % full.length];
      if (w && usable.indexOf(w) !== -1) { pick = w; break; }
    }
    if (!pick) pick = usable[0];
  }
  return pick;
}

function clearRotationTimer() {
  if (selection.rotationTimer === null) return;
  if (typeof window !== "undefined" && typeof window.clearTimeout === "function") {
    window.clearTimeout(selection.rotationTimer);
  }
  setTransient("rotationTimer", null);
}

function syncRotationTimer() {
  clearRotationTimer();
  if (!selection.rotationEnabled || !selection.id) return;
  if (rotationCandidates().length < 2) return;
  const group = activeRotationGroup();
  // 「当前视频播完就换」档（issue #230 后续诉求）：**不计时** —— 推进由视频的 ended
  // 事件驱动（watchVideoState 里那一支）。这里只把上一次留下的计时收掉（上面已调
  // clearRotationTimer），于是切回「按间隔」档时由下一次 sync 重新 arm。
  const trigger = group && group.trigger === "videoEnd" ? "videoEnd" : "interval";
  if (trigger === "videoEnd") {
    liveLog("rotation-arm", "跟随视频播放结束（不计时，候选 " + rotationCandidates().length + " 张）");
    return;
  }
  if (typeof window === "undefined" || typeof window.setTimeout !== "function") return;
  const minutes = group ? group.interval : DEFAULTS.rotationInterval;
  // 开发/测试覆盖钩子：localStorage.weRotationTestSec（秒）可临时缩短轮换
  // 间隔（冒烟测试与手动预览用）；未设置时按组间隔正常运转（缺省值见 lib/settings-schema.js
  // 的 rotationInterval —— 本行不复述那个数，避免与真源漂成两份）。
  let delayMs = minutes * 60 * 1000;
  try {
    const testSec = Number(localStorage.getItem("weRotationTestSec"));
    if (testSec > 0) delayMs = Math.max(1000, Math.round(testSec * 1000));
  } catch { /* ignore */ }
  setTransient("rotationTimer", window.setTimeout(() => {
    setTransient("rotationTimer", null);
    if (!selection.rotationEnabled || !selection.id) return;
    // 就绪后切换：不再到点即 applySelection —— 先在后台把下一张壁纸准备到
    // 完全 ready（live 渲染页首帧 / 实时抓帧就绪 / 视频可播放 / 图片解码
    // 完成），就绪才落实切换并做交叉淡化。准备期间旧壁纸原样保持。
    beginRotationPrepare(new Set());
  }, delayMs));
  liveLog("rotation-arm", Math.round(delayMs / 1000) + "s 后（候选 " + rotationCandidates().length + " 张）");
}

// ── Rotation prepare pipeline (就绪后切换 + 渐变) ───────────────────────────
// 到点 → beginRotationPrepare：后台探测下一张壁纸的就绪信号，ready 才 commit
// （applySelection + 交叉淡化），fail 则跳过该候选链式尝试下一个（有界于候选
// 数，全灭则 re-arm 定时器下轮重来）。手动切换/关闭轮换会取消进行中的准备。
let rotationPrep = null; // { id, fromId, excluded, cancelled, settled, timers, staged, probeMedia, readyEl, kind }
let pendingRotationFade = false; // commit 置位，syncLayers 消费后清零
// eslint-disable-next-line prefer-const -- 跨片段写入：layer-core.js 与 live-layer.js 的 `fadingLayerNode`
let fadingLayerNode = null;      // 正在淡出的旧壁纸层（渐变结束移除）
// iframe 类媒体（live 渲染页 / 旧链网页壁纸）的「节点级领养」通道：同源 iframe
// 在同文档内 reparent 会重载文档（Chromium 实测：appendChild 移动 iframe =
// 浏览上下文销毁重建，首帧 15s 预算重启，大包必超时）—— 所以 live/web 探测
// 的 staging 容器在 commit 时【整体转为新层】，iframe 全程不移动，渲染状态
// 零扰动。img/video 无此问题，仍走元素级领养（preparedMediaEl）。
let pendingStagedLayerNode = null;
// 已就绪、等待被 buildMedia 领养进新层的媒体元素（img/video）。就绪态随元素
// 走：探测用的就是最终上屏的元素，杜绝"探测就绪了但层里另建空白元素重新
// 加载"的黑屏闪烁。
let preparedMediaEl = null;
const ROTATION_PREP_TIMEOUT_MS = 20000; // 单阶段就绪探测上限（超时走兜底，不卡死轮换）
// 交叉淡化时长（新层淡入 + 旧层宽限移除的基准）。切换过场表（SWITCH_TRANSITIONS）
// 里 fade 的基准毫秒直接引用本常量，所以「调交叉淡化时长」只需要改这里一处。
const ROTATION_FADE_MS = 1800;
// ── 切换过场（手动点选与自动轮播共用）──────────────────────────────────────
// 每种过场只动 transform / opacity / clip-path —— 全是合成器友好属性。（本插件在
// <video> 与 live <iframe> 上踩过 mask / filter 掉出合成层的坑，故一律不用。）
// 所有过场都守同一条铁律：**旧层保持不透明垫在新层之下**，新层在它之上入场 ——
// 玻璃的 backdrop-filter 采样到透明背景会静默失效（见 applyEffects 内注释），
// 所以这里没有「淡到黑再淡出」那种中间态透明的方案。
// ms = 基准毫秒 × 速度档乘子（SWITCH_SPEEDS）。基准在快档也不为 0，避免「点了没反应」。
const SWITCH_TRANSITIONS = [
  { id: "cut", get label() { return weT("硬切"); }, ms: 0 },
  { id: "fade", get label() { return weT("交叉淡化"); }, ms: ROTATION_FADE_MS },
  { id: "push", get label() { return weT("推移"); }, ms: 700 },
  { id: "wipe", get label() { return weT("擦除"); }, ms: 700 },
  { id: "iris", get label() { return weT("光圈"); }, ms: 800 },
  { id: "zoom", get label() { return weT("缩放"); }, ms: 900 },
  { id: "bars", get label() { return weT("条带"); }, ms: 800 },
];
const SWITCH_SPEEDS = [
  { id: "fast", get label() { return weT("快"); }, factor: 0.6 },
  { id: "normal", get label() { return weT("标准"); }, factor: 1 },
  { id: "slow", get label() { return weT("慢"); }, factor: 1.6 },
];
const SWITCH_DIR_LABELS = {
  get left() { return weT("左"); },
  get right() { return weT("右"); },
  get up() { return weT("上"); },
  get down() { return weT("下"); },
};
// 只有方向型过场听 switchTransitionDir（条带用它决定竖条 / 横条）。
const SWITCH_DIRECTIONAL = ["push", "wipe", "bars"];
// 条带（百叶窗）：板数。横向过场时是 N 块横板，纵向时是 N 块竖板；板数决定缝的
// 密度 —— 5 块太粗、9 块以上在 4K 上偏碎，7 块实测最像百叶窗。点数恒定
// （4N+1），polygon() 才可插值 → 动画连续。
const SWITCH_BARS_TEETH = 7;

/** 当前生效的过场（类型 + 方向 + 实测算出的毫秒）。cut = 不动画。 */

/** 擦除的起始 inset：从新画面「进入」的那一侧长出来（left = 新画面自右进入）。 */
function wipeInset(dir) {
  if (dir === "right") return "inset(0 100% 0 0)";
  if (dir === "up") return "inset(100% 0 0 0)";
  if (dir === "down") return "inset(0 0 100% 0)";
  return "inset(0 0 0 100%)"; // left
}

/**
 * 条带 / 百叶窗：N 块**独立的板**从「进入侧」一起长出来，板间留缝 —— 这才看得出是条带。
 * ⚠️ 必须是独立板（有缝、两端不收拢）：实测做成连续锯齿扫过时，肉眼与「擦除」
 * 分不出来，等于白做。
 *
 * 记法：outer = 进入侧（left/up 取 1，right/down 取 0），t 轴是与扫过方向垂直的轴
 * （left/right 时板是**横板**，up/down 时是竖板）。每块板厚 slat = p/N，深度
 * depth = p：p=0 时全塌在进入侧边缘（零面积），p=1 时板厚刚好铺满一个周期
 * （slat = period）→ 缝隙闭合、合成完整矩形。
 *
 * ⚠️ clip-path: polygon() 只能画**一个连通区域**，而 N 块板彼此不相连 —— 用一条
 * 贴在进入侧边缘、宽度 spine（≤0.4%，且随 depth 从 0 一起长起）的「脊」把板串起来。
 * 脊落在已经露出新画面的那一侧，所以视觉上完全看不出来。
 *
 * 点数恒定（4N+1），polygon() 才能平滑插值。
 */
// ── 轮换 / 媒体生命周期助手已按族搬出（构建期内联在正文之前，同一扁平作用域）────────────
// 声明在 src/client/rotation.js：过场几何（barsPolygon / switchFrames）、探测元素的领养与释放、
// 隐藏期轮换推迟与可见时补做。LIVE_FIRST_FADE_MS 与两个隐藏态标记随声明一起搬走（初始化式不读模块状态）。

// ── 媒体准备（预准备 / 构建 / 选中项落地）────────────────────────────────────
// 这一族的实现已抽到 **src/media-prep.js**（跨三个不相邻区段：预准备与轮换预挂载、
// applySelection、buildMedia）。构建期内联回本作用域，调用点无需改动。
// 契约：出向依赖清单 / 入口 / 不变量 —— 见该文件头（清单只在那里维护，此处不复述数量）。

function commitRotationSwitch(prep) {
  rotationPrep = null;
  for (const t of prep.timers) { try { clearTimeout(t); } catch { /* ignore */ } }
  prep.timers = [];
  releaseProbeMedia(prep);
  const staged = prep.staged;
  prep.staged = null;
  const w = wallpaperById().get(prep.id);
  const valid = selection.rotationEnabled && selection.id === prep.fromId
    && w && isRotationEligible(w, selection.contentRatingFilter)
    && !isHiddenWallpaper(w.id, selection.hiddenIds);
  liveLog("rotation-commit", "wid=" + prep.id + " from=" + prep.fromId + " kind=" + (prep.kind || "-")
    + " valid=" + valid + " " + liveStateBrief());
  if (!valid) {
    if (staged) { try { staged.div.remove(); } catch { /* ignore */ } }
    if (prep.readyEl) disposeMediaEl(prep.readyEl);
    syncRotationTimer();
    return;
  }
  // 就绪元素随提交走，分两条通道：
  // - iframe 类（live 渲染页 / 旧链网页）：staging 容器整体转为新层（节点级
  //   领养）—— 同源 iframe 同文档 reparent 会重载文档，绝不能让 iframe 移动；
  // - img/video：元素级领养，buildMedia 直接收编进新层。
  if ((prep.kind === "live" || prep.kind === "web") && staged && staged.div && prep.readyEl) {
    pendingStagedLayerNode = staged.div;
    prep.readyEl = null; // iframe 留在容器里，不拆散
  } else {
    preparedMediaEl = prep.readyEl || null;
    prep.readyEl = null;
    if (staged) { try { staged.div.remove(); } catch { /* ignore */ } }
  }
  pendingRotationFade = true;
  applySelection(prep.id, { fromRotation: true, kind: prep.kind });
  // 领养保险丝：applySelection 的 emit 未消费节点级领养（理论上不可达 ——
  // 准备期前提与领养条件一致，此处仅兜底）时 staging 容器不能泄漏。
  if (pendingStagedLayerNode) {
    const div = pendingStagedLayerNode;
    pendingStagedLayerNode = null;
    try {
      const f = div.querySelector && div.querySelector("iframe");
      if (f) disposeMediaEl(f);
    } catch { /* ignore */ }
    try { div.remove(); } catch { /* ignore */ }
  }
}

// ── Rotation group CRUD (draft-based editor) ────────────────────────────────
function startEditGroup(id) {
  const group = selection.rotationGroups.find((g) => g.id === id);
  if (!group) return;
  setTransient("editing", JSON.parse(JSON.stringify(group)));
  emit();
}

function startCreateGroup() {
  setTransient("editing", {
    id: nextGroupId(),
    name: weT("轮播列表 {index}", { index: selection.rotationGroups.length + 1 }),
    interval: DEFAULTS.rotationInterval,
    order: "sequence",
    trigger: "interval",
    wallpaperIds: [],
  });
  emit();
}

function saveEditingGroup() {
  const draft = selection.editing;
  if (!draft) return;
  const idx = selection.rotationGroups.findIndex((g) => g.id === draft.id);
  const cleaned = {
    id: draft.id,
    name: typeof draft.name === "string" && draft.name.trim() ? draft.name.trim() : weT("轮播列表"),
    interval: clampNum(draft.interval, ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX, DEFAULTS.rotationInterval),
    trigger: draft.trigger === "videoEnd" ? "videoEnd" : "interval",
    order: draft.order === "random" ? "random" : "sequence",
    wallpaperIds: Array.isArray(draft.wallpaperIds)
      ? draft.wallpaperIds.filter((x) => typeof x === "string" && x)
      : [],
  };
  if (idx >= 0) selection.rotationGroups[idx] = cleaned;
  else selection.rotationGroups.push(cleaned);
  selection.rotationGroupId = cleaned.id;
  setTransient("editing", null);
  // 列表成员可能已变：进行中的轮换准备候选作废，下轮按新成员重评。
  cancelRotationPrepare();
  if (selection.rotationEnabled && !rotationCandidates().some((w) => w.id === selection.id)) {
    const first = rotationCandidates()[0];
    applySelection(first ? first.id : "");
    return;
  }
  persistSelection();
  syncRotationTimer();
  emit();
}

function cancelEditGroup() {
  setTransient("editing", null);
  emit();
}

function deleteGroup(id) {
  const idx = selection.rotationGroups.findIndex((g) => g.id === id);
  if (idx < 0) return;
  selection.rotationGroups.splice(idx, 1);
  // 列表结构变化：进行中的轮换准备候选可能已不在活动列表 → 取消，下轮重评。
  cancelRotationPrepare();
  if (selection.rotationGroupId === id) {
    selection.rotationGroupId = "";
    if (selection.rotationEnabled) {
      const fallback = firstUsableGroup();
      if (fallback) selection.rotationGroupId = fallback.id;
      else selection.rotationEnabled = false;
    }
  }
  if (selection.editing && selection.editing.id === id) setSetting("editing", null);
  // 删除是**结构变更**，必须落盘：原来只 `splice` 内存、不调 persistSelection ⇒ 删掉的列表
  // 重启后「复活」（#292）。与 saveEditingGroup 同一条纪律：改完列表就 persist。
  persistSelection();
  syncRotationTimer();
  emit();
}

function importPlaylistIntoDraft(playlist) {
  if (!selection.editing || !playlist || !Array.isArray(playlist.wallpaperIds)) return;
  selection.editing.wallpaperIds = playlist.wallpaperIds.slice();
  emit();
}


// ── Hidden wallpapers (soft delete / restore, localStorage only) ───────────
// Hiding is a pure status flag: no source file is touched, and a hidden
// wallpaper that is currently playing keeps playing (it only leaves the
// lists). Rotation candidates exclude hidden ids via groupWallpapers(), so a
// hidden wallpaper can never be auto-selected by the carousel. The membership
// test itself lives in **src/picker-model.js**（`isHiddenWallpaper(id, hiddenIds)`）——
// 隐藏集合从调用点显式传入。

function hideWallpapers(ids) {
  const added = ids.filter((id) => id && !selection.hiddenIds.includes(id));
  if (!added.length) return;
  for (const id of added) selection.hiddenIds.push(id);
  persistSelection();
  syncRotationTimer(); // 候选可能跌破 2 个 → 停表；恢复时重新 arm
  emit();
}

function restoreWallpapers(ids) {
  const set = new Set(ids.filter(Boolean));
  if (!set.size) return;
  const before = selection.hiddenIds.length;
  selection.hiddenIds = selection.hiddenIds.filter((id) => !set.has(id));
  if (selection.hiddenIds.length !== before) {
    persistSelection();
    syncRotationTimer(); // 候选恢复到 ≥2 → 重新 arm 轮播
    emit();
  }
}

// ── Custom uploads (read-A storage) ─────────────────────────────────────────
// The HOST writes the uploaded bytes to its plugin-managed directory and
// serves them through the same token/media/preview routes as WE media; the
// client only POSTs the file, then refreshes the (already-merged) inventory.
const UPLOAD_URL = "/wallpaper-engine/upload";
const REMOVE_URL = "/wallpaper-engine/remove";
const UPLOAD_TYPES = ["image/jpeg", "image/png", "video/mp4"];

// `isUploadedWallpaper(w)` / `isDirWallpaper(w)`（id 前缀判定）住在
// **src/picker-model.js** —— ratingOf 的宽松分级与上传管理列表共用同一对判定。

async function uploadWallpaperFile(file) {
  const ctype = (file.type || "").toLowerCase();
  if (!UPLOAD_TYPES.includes(ctype)) {
    setTransient("uploadError", weT("仅支持 JPG / PNG 图片与 MP4 视频"));
    emit();
    return;
  }
  if (!/\.(jpe?g|png|mp4)$/i.test(file.name)) {
    setTransient("uploadError", weT("文件扩展名需为 .jpg / .png / .mp4"));
    emit();
    return;
  }
  setTransient("uploading", true);
  setTransient("uploadError", "");
  setTransient("uploadNote", "");
  emit();
  try {
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
    const res = await apiFetch(UPLOAD_URL + "?title=" + encodeURIComponent(title), {
      method: "POST",
      headers: { "Content-Type": ctype },
      body: file,
      parse: "always", // 失败时也要读宿主给的原因（4xx/5xx 的 {error}）
    });
    const data = res.data || {};
    if (!res.ok) throw new Error(hostFailureReason(res));
    // Host dedup: uploading the same file again returns the existing entry
    // (data.duplicate) instead of storing a second copy.
    if (data.duplicate) {
      setTransient("uploadNote", weT("已存在相同内容的壁纸，已直接选择原有的那张"));
    }
    await loadInventory();
    applySelection(data.id);
  } catch (err) {
    setTransient("uploadError", weT("上传失败：{error}", { error: weT(err && err.message ? err.message : err) }));
  }
  setTransient("uploading", false);
  emit();
}

async function removeUploadWallpaper(id) {
  if (!id) return;
  setTransient("uploading", true);
  setTransient("uploadError", "");
  emit();
  try {
    const res = await apiPostJson(REMOVE_URL, { id }, { parse: "always" });
    if (!res.ok) throw new Error(hostFailureReason(res));
    if (selection.id === id) applySelection("");
    await loadInventory();
  } catch (err) {
    setTransient("uploadError", weT("移除失败：{error}", { error: weT(err && err.message ? err.message : err) }));
  }
  setTransient("uploading", false);
  emit();
}

const UPLOAD_DIR_URL = "/wallpaper-engine/upload-dir";

// Change where custom uploads are stored. The host persists the choice to its
// config file (survives restarts) and migrates existing files by default —
// users can point uploads at a non-system drive without touching config files.
async function changeUploadDir(dir, migrate) {
  if (!dir || !String(dir).trim()) {
    setTransient("uploadError", weT("请输入存储位置路径"));
    emit();
    return;
  }
  setTransient("uploading", true);
  setTransient("uploadError", "");
  emit();
  try {
    const res = await apiPostJson(UPLOAD_DIR_URL,
      { dir: String(dir).trim(), migrate: migrate !== false }, { parse: "always" });
    if (!res.ok) throw new Error(hostFailureReason(res));
    setTransient("editingUploadDir", false);
    setTransient("uploadDirDraft", "");
    await loadInventory();
  } catch (err) {
    setTransient("uploadError", weT("更改失败：{error}", { error: weT(err && err.message ? err.message : err) }));
  }
  setTransient("uploading", false);
  emit();
}

const CACHE_DIR_URL = "/wallpaper-engine/cache-dir";
const CACHE_DIR_BROWSE_URL = "/wallpaper-engine/cache-dir/browse";

// Change where regenerable caches live (transcoded wallpapers / faststart variants /
// scene frames / video previews / media-bridge). The host persists the choice to its
// config file (survives restarts) and moves the known cache subdirectories by default —
// the point is not making users edit config files, and not letting a multi-GB cache
// pile up on the system drive. Nothing here is user-authored data: worst case the
// moved-away cache is rebuilt on demand.
async function changeCacheDir(dir, migrate) {
  if (!dir || !String(dir).trim()) {
    setTransient("cacheDirError", weT("请输入缓存位置路径"));
    emit();
    return;
  }
  setTransient("cacheDirError", "");
  setTransient("cacheDirNote", "");
  setTransient("cacheDirBusy", true);
  emit();
  try {
    const res = await apiPostJson(CACHE_DIR_URL,
      { dir: String(dir).trim(), migrate: migrate !== false }, { parse: "always" });
    if (!res.ok) throw new Error(hostFailureReason(res));
    const moved = Number((res.data && res.data.migrated) || 0);
    const skipped = Number((res.data && res.data.skipped) || 0);
    setTransient("editingCacheDir", false);
    setTransient("cacheDirDraft", "");
    setTransient("cacheDirBrowse", null);
    // 生效值一律以 host 的解析链为准（重新拉清单回显）—— 设了 DSH_WE_CACHE_DIR 时
    // 保存成功但生效值仍是环境变量那个目录，这条提示就是给那种情形看的。
    setTransient("cacheDirNote", skipped > 0
      ? weT("已迁移 {moved} 个缓存文件，{skipped} 个跳过", { moved, skipped })
      : weT("已迁移 {moved} 个缓存文件", { moved }));
    await loadInventory();
  } catch (err) {
    setTransient("cacheDirError", weT("更改失败：{error}", { error: weT(err && err.message ? err.message : err) }));
  }
  setTransient("cacheDirBusy", false);
  emit();
}

const WE_ASSETS_DIR_URL = "/wallpaper-engine/we-assets-dir";

// Set / clear the WE official-assets directory (host-persisted). Scene live
// rendering then serves official pixels via /api/local-assets instead of the
// renderer's programmatic recreations. Empty input clears the setting.
// 保存后刷新 inventory（weAssetsAvailable 进 syncLayers key）→ live 渲染页
// 带新参数重建，官方像素即刻生效。
async function changeWeAssetsDir(dir) {
  setTransient("weAssetsError", "");
  emit();
  try {
    const res = await apiPostJson(WE_ASSETS_DIR_URL,
      { dir: String(dir || "").trim() }, { parse: "always" });
    if (!res.ok) throw new Error(hostFailureReason(res));
    setTransient("editingWeAssetsDir", false);
    setTransient("weAssetsDirDraft", "");
    await loadInventory();
    syncLayers(); // 可用性变化进 key → live iframe 带/去 localAssets=1 重建
  } catch (err) {
    setTransient("weAssetsError", weT("保存失败：{error}", { error: weT(err && err.message ? err.message : err) }));
  }
  emit();
}

// ── Behind-body layer: wallpaper + scrim (plain DOM, NOT a slot) ───────────
// Edge (and only Edge) paints its own floating "下载/投屏" media-overlay toolbar
// over any VISIBLE <video> element, and it ignores pointer-events / controlsList /
// disableRemotePlayback; there is no browser switch to turn it off. The only
// reliable way to keep it off the wallpaper is to never paint a visible video
// element, so on Edge video wallpapers are drawn onto a <canvas> instead:
//   * Edge-only (UA-gated): Chrome/Firefox/other engines keep the native <video>
//     path untouched — zero cost and zero behaviour change outside Edge.
//   * Event-driven: requestVideoFrameCallback() redraws only when the video
//     presents a NEW frame (video framerate, not display refresh rate; paused or
//     background-tab → no callbacks → zero work). Falls back to rAF if absent.
//   * The canvas bitmap is capped at the video's native resolution (never
//     upscaled), then CSS scales it to the viewport — ~1/4 the pixels of a
//     dpr-2 fullscreen canvas.
// The <video> stays in the DOM (offscreen, invisible) purely as the decoder
// source for drawImage; play/pause/playbackRate still work on it.
const IS_EDGE = typeof navigator !== "undefined" && /Edg\//.test(navigator.userAgent);

// ── 画布/媒体/GPU 帧助手已按族搬出（构建期内联在正文之前，同一扁平作用域）──────────────
// 助手声明在 src/client/media-frame.js：它们自带的模块级变量（媒体计时器、GPU 帧 pin、画布 ctx 句柄…）
// 与各自的赋值点同处一文件；本文件保留「壁纸属性」的开关与快照状态（propsPanelOpen / propsState），
// 因为改这两个状态的处理器（openUserPropsPanel / closeUserPropsPanel）仍在本文件。
// ── 壁纸属性（WE 用户属性）──────────────────────────────────────────────────
// 「壁纸属性」按钮 → 面板：读 host `/props/<token>`（把 project.json 的
// general.properties 解析成 UI 描述），改动即时 `__wp.updateWebProps` 热更新到
// 正在跑的壁纸，并写进设置（`userProps`，按 token 存）—— 刷新/重启后网页壁纸由
// host 并进 HTML 种子、场景壁纸由 applyStoredUserProps 在就绪后回放。
//
// 条件求值器已抽到 src/we-cond.js（纯计算、零外界依赖；构建期由 build-client.mjs
// 内联回本作用域，因此下面的 weEvalCondition(...) 调用点无需改动，见该文件头的契约）。

// 面板状态：token 变了就重新拉一次（换壁纸/换目录）。
let propsPanelOpen = false;
let propsState = { token: "", loading: false, error: "", props: [], remote: false };


/** 打开发送（侧栏下钻的入口）：先落状态再拉定义 —— 判据是"该有属性了"。 */
function openUserPropsPanel() {
  propsPanelOpen = true;
  loadUserPropDefs(propTokenOf(selection), true);
  emit();
}

/** 收起：只翻开关（定义留着，下次开不必重拉）。 */
function closeUserPropsPanel() {
  propsPanelOpen = false;
  cancelUserPropsCommit(); // 面板关了：拖动期剩下的那次提交不再有意义
  emit();
}

/** 当前 live 渲染 iframe（属性热更新与心跳读的是同一个）。 */

/** token（propsUrl 末段；同时是设置里 userProps 的键）。 */
function propTokenOf(selLike) {
  const url = String((selLike && selLike.propsUrl) || "");
  const i = url.lastIndexOf("/");
  return i >= 0 ? url.slice(i + 1) : "";
}

function storedUserPropsOf(token) {
  const all = selection.userProps;
  const v = all && typeof all === "object" ? all[token] : null;
  return v && typeof v === "object" && !Array.isArray(v) ? { ...v } : {};
}

/** 覆盖值写入设置（与默认值相同 = 删除该覆盖项）。 */
function saveUserProp(token, name, value, isDefault) {
  if (!token) return;
  const all = { ...(selection.userProps || {}) };
  const cur = { ...(all[token] || {}) };
  if (isDefault) delete cur[name];
  else cur[name] = value;
  if (Object.keys(cur).length) all[token] = cur;
  else delete all[token];
  setSetting("userProps", all);
}

/** 热更新到正在跑的壁纸（渲染页 __wp.updateWebProps → 场景对象脚本 / 网页 shim）。 */
function applyUserProps(wire) {
  const frame = liveFrameEl();
  if (!frame) return false;
  try {
    const wp = frame.contentWindow && frame.contentWindow.__wp;
    if (!wp || typeof wp.updateWebProps !== "function") return false;
    wp.updateWebProps(wire);
    return true;
  } catch {
    return false;
  }
}

function loadUserPropDefs(token, force) {
  if (!token) return;
  if (!force && (propsState.token === token && (propsState.props.length || propsState.loading))) return;
  const url = PROPS_URL + "/" + encodeURIComponent(token);
  propsState = { token, loading: true, error: "", props: propsState.token === token ? propsState.props : [], remote: true };
  apiJson(url)
    .then((res) => {
      const d = res.data;
      // ⚠️ 这条 message 会被渲染进「壁纸属性」面板（见 picker-props-panel.js 的 error 分支），
      //    所以它是**面向用户**的文案，尽管包在 Error 里。裸中文字面量会被 i18n-scan 的
      //    Error 豁免放过 —— 用 weT 包住，改文案时才有词表口径可循。
      if (!d || !d.ok) throw new Error((d && d.error) || weT("读取失败"));
      if (propsState.token !== token) return; // 期间换了壁纸：丢弃
      // 值以渲染页的实时表为准（场景壁纸的默认值在 scene.json 快照里，可能和
      // project.json 不同 —— 上游 getProperties 正是为此存在）；拿不到就用宿主值。
      let live = null;
      try {
        const frame = liveFrameEl();
        const wp = frame && frame.contentWindow && frame.contentWindow.__wp;
        live = wp && typeof wp.getProperties === "function" ? wp.getProperties() : null;
      } catch { live = null; }
      const props = (d.props || []).map((p) => {
        if (!live || !(p.name in live)) return p;
        return { ...p, value: live[p.name], overridden: Boolean(d.overrides && p.name in d.overrides) };
      });
      propsState = { token, loading: false, error: "", props, remote: false };
      emit();
    })
    .catch((e) => {
      if (propsState.token !== token) return;
      propsState = { token, loading: false, error: String((e && e.message) || e), props: [], remote: false };
      emit();
    });
}

/**
 * 「壁纸属性」拖动期的提交窗口（毫秒）：最后一次 input 之后安静这么久，才算这次拖动结束。
 *
 * 为什么需要这个定时器：面板对 color / slider 只能送 silent 的 input（见
 * src/picker-props-panel.js 的 renderUserPropRow）—— **React 的 onChange 对
 * `<input type="range">` / `<input type="color">` 是逐格触发的 input 事件**，不是原生
 * change 的"抬手"。把它当抬手（旧实现）等于拖动中每格 `emit()` 一次：emit 的订阅者里
 * 有全量 `applyEffects`（重建字体样式表 / 同步场景音频 / 强制同步样式计算）和整棵设置
 * 面板的重渲染 —— 原生颜色轮盘一次拖动上百格，正是用户报的「拖颜色时异常卡顿缓慢」
 * （与 commitLiveSetting 注释里那次用户实测同一条口径；场景/网页引擎侧的单次热更新
 * 实测只有 ~0.1ms，不是这里的量级）。
 *
 * 取值：180ms 比持久化写去抖（200ms）略短、又不与它同值 —— 两个窗口各管一件事（一个
 * 决定面板什么时候回显刷新，一个决定什么时候落盘），同值会让"只测其一"的守卫分不开它们。
 * 这是"拖动停下到回显跟上"的观感上限；改大没有收益，改小会让慢速拖动（每格间隔大于
 * 阈值）中途也各提交一次。
 */
const USER_PROPS_COMMIT_MS = 180;
let userPropsCommitTimer = null;
/** 取消挂起的拖动提交（面板关闭 / 恢复默认 / 卸载）。 */
function cancelUserPropsCommit() {
  if (userPropsCommitTimer !== null && typeof clearTimeout === "function") clearTimeout(userPropsCommitTimer);
  userPropsCommitTimer = null;
}
/**
 * 拖动期的尾部提交：连续 input 只留最后一次的定时器，到点才 `emit()` 一次。
 * 无定时器设施（验证环境）退化为立即 emit —— 与 persistSelection 同一条退化口径。
 */
function scheduleUserPropsCommit() {
  cancelUserPropsCommit();
  if (typeof setTimeout !== "function") { emit(); return; }
  userPropsCommitTimer = setTimeout(() => {
    userPropsCommitTimer = null;
    emit();
  }, USER_PROPS_COMMIT_MS);
}

/** 一次属性改动：本地状态 + 热更新 + 持久化（silent = 拖动中，不 emit，尾部提交一次）。 */
function onUserPropInput(def, value, silent) {
  // 同一格可能被上报两次（React 对 range/color 会同时派发 onInput 与 onChange 两路
  // 处理器，它们都是 silent 的）：值没变就没有热更新可做，也不该多安排一次提交。
  // 只对 silent 早退 —— 显式提交（失焦 / 回车 / 组合框）即使值没变也必须走完，否则
  // "把值选成当前显示值" 这种显式选择不会落进覆盖表（旧行为如此，别改）。
  if (silent && sameUserPropValue(value, def.value)) return;
  def.value = value;
  def.overridden = !sameUserPropValue(value, def.default);
  applyUserProps({ [def.name]: { value } });
  saveUserProp(propsState.token, def.name, value, !def.overridden);
  if (silent) scheduleUserPropsCommit();
  else { cancelUserPropsCommit(); emit(); }
}

function sameUserPropValue(a, b) {
  if (a === b) return true;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return false;
}

/** 恢复默认：清掉这张壁纸的全部覆盖值，并把默认值热更新回渲染页。 */
function resetUserProps() {
  const token = propsState.token;
  if (!token) return;
  cancelUserPropsCommit(); // 拖动期的尾部提交已无意义（下面这次 emit 就是最后一次）
  const wire = {};
  for (const p of propsState.props) {
    p.value = p.default;
    p.overridden = false;
    if (p.default !== null) wire[p.name] = { value: p.default };
  }
  applyUserProps(wire);
  const all = { ...(selection.userProps || {}) };
  delete all[token];
  setSetting("userProps", all);
  emit();
}

/** 就绪后回放覆盖值：网页壁纸由 host 并进 HTML 种子，场景壁纸没有种子通道。 */
function applyStoredUserProps(selLike) {
  if (!selLike) return;
  const token = propTokenOf(selLike);
  if (!token) return;
  const ov = storedUserPropsOf(token);
  const names = Object.keys(ov);
  if (!names.length) return;
  const wire = {};
  for (const [k, v] of Object.entries(ov)) wire[k] = { value: v };
  applyUserProps(wire);
}

/** Web 颜色 "r g b"（0–1 浮点）↔ #rrggbb */
function weColorToHex(v) {
  if (typeof v !== "string") return "#000000";
  const parts = v.trim().split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return "#000000";
  const hex = parts.slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, "0"))
    .join("");
  return "#" + hex;
}
function weHexToColor(hex) {
  const h = String(hex || "").replace(/^#/, "");
  if (h.length !== 6) return "0 0 0";
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b].map((n) => Math.round(n * 1000) / 1000).join(" ");
}

let weBattery = null; // BatteryManager from navigator.getBattery (if available)
/**
 * `pauseOnHidden` 的**持续期防抖**（issue #288）。
 *
 * 宿主在虚拟桌面切换 / 焦点变化期间会瞬时把 `document.hidden` 误判为 true（Chromium 遮挡跟踪
 * 竞态，2–3 秒后被复查纠正）。旧逻辑对 `document.hidden` **零防抖、照单全收** ⇒ 一次瞬时抖动就
 * 走「暂停 → 拆页 → 重建 → 重新解析整个 scene 包（实测 6.4MB / 首帧 2001ms）」，用户看到黑屏
 * 约 2 秒；可见性快速振荡时反复付这个代价。
 *
 * 现在只有隐藏**持续 ≥ HIDDEN_PAUSE_DEBOUNCE_MS** 才把 `hiddenHoldActive` 置真（由 apply 里
 * 的 `applyHiddenHold` 维护，随 fiber 注销）；瞬时翻转不改变播放状态、也就不触发任何冷重载。
 * 判定源仍只有一个：`occlusionReason()` 读这个布尔，`occlusionActive()` 由它派生。
 */
const HIDDEN_PAUSE_DEBOUNCE_MS = 1200;
let hiddenHoldActive = false;
// 遮挡原因（可读文案；空串 = 没被遮挡）。occlusionActive 由它派生，保证「是谁把
// 渲染页停掉的」只有一个判定源 —— 诊断日志直接引用；失焦档再经适配目标门控（桌面壳失焦时壁纸多半仍整块可见，按失焦暂停会定格**可见**画面，见 adapterCaps）。
function occlusionReason() {
  if (selection.pauseOnHidden && hiddenHoldActive) return weT("标签页隐藏(pauseOnHidden)");
  if (adapterCaps().blurPause && selection.pauseOnBlur && typeof document !== "undefined"
    && typeof document.hasFocus === "function" && !document.hasFocus()) return weT("窗口失焦(pauseOnBlur)");
  if (selection.pauseOnBattery && weBattery && !weBattery.charging) return weT("电池供电(pauseOnBattery)");
  return "";
}
function occlusionActive() {
  return occlusionReason() !== "";
}
/**
 * 遮挡判定的**复核周期**（毫秒）。事件之外还得自己看一遍：原生模态会抢焦点，而回来时的
 * `focus` 事件不保证送达 —— 只靠事件的话判定会永久卡在「窗口失焦」。3s 是"用户感觉不到、
 * 又不至于让省电白做"的折中（复核只在判定变化时 emit）。
 */
const OCCLUSION_RECHECK_MS = 3000;
// 「live 渲染页为什么没在出帧」的一句话原因：用户暂停与遮挡都算 —— 两者都会让
// applyLiveControls 把渲染页 pause() 掉，而暂停中的渲染页 __wpStats.frame()
// 恒为 {fps:0, running:false}（渲染器实现：paused → running:false）。
function livePauseReason() {
  if (selection.playing) {
    // 遮挡暂停（X11 矩形遮挡 ⇒ 渲染器 pause 档）也是"故意不出帧"：必须让看护
    //（首帧预算 / stall 计数 / 载荷延迟）与 UI 归因都看见它，否则全遮挡下轮播
    // 换页会把故意暂停误判成传输停滞并自动回退（实测事故）。
    if (occlusionRendererPaused()) return weT("窗口被完全遮挡(pauseOnOcclusion)");
    return occlusionReason();
  }
  return weT("用户暂停");
}
function isEffectivelyPlaying() {
  // 标签页隐藏（`document.hidden`）必须显式算进来：Chromium 对隐藏页**冻结 rAF**，
  // 出帧物理上不可能，而首帧预算与运行期 stall 两条判据都以"有帧"为唯一证据。
  // 少了这一项，收拍期间窗口被最小化 / 切到别的标签页 ⇒ 渲染页被冻结 ⇒ 看护按
  // `LIVE_FIRST_FRAME_MAX_MS` 判 timeout；而 `liveFailCauseOf` 在"本窗口内确有整包
  // 完成证据"时会归成渲染侧并**落盘**（实测事故 2026-10-27：一张 29.7MB 的场景壁纸
  // 在隐藏期被判 timeout 写进 sceneLiveFailures，此后六天多每次启动都直接降级静态帧，
  // 直到下一次管线变更才被 migrateStaleLiveFailures 清掉）。
  // 运行期 stall 规则此前已有同款守卫（看护心跳的 `!isEffectivelyPlaying()` 分支），
  // 首帧预算这一侧必须与其对称 —— 否则"隐藏"在两个判据里有两种语义。
  if (typeof document !== "undefined" && document.hidden) return false;
  return selection.playing && !occlusionActive() && !occlusionRendererPaused();
}

// ── 真实播放态回写────────────────────────────────────────────────────
// `selection.playing` 是用户意图；<video> 是否真的在播是另一回事 —— 自动播放
// 策略可能拒绝、浏览器可能解不了自上传视频的编码（HEVC / 10-bit 等）、play()
// 也可能被紧接着的 src 切换打断（AbortError）。只信意图的话面板会一直写「播放中」，
// 卡片上唯一的按钮是「暂停」，而壁纸冻在首帧（看上去就是空白）—— 用户没有任何
// 「继续」可点。这里把元素的真实状态同步进 store：按钮于是总能回到「播放」
// （可点的继续），失败时还附带一句原因；播放成功后原因自动清掉。
function videoPlaybackError(video) {
  const err = video && video.error;
  if (!err) return "";
  // MediaError: 1 ABORTED / 2 NETWORK / 3 DECODE / 4 SRC_NOT_SUPPORTED
  if (err.code === 4) return weT("浏览器无法解码这段视频（自上传建议改用 H.264 编码的 MP4）");
  if (err.code === 3) return weT("视频解码失败（文件可能已损坏）");
  if (err.code === 2) return weT("视频读取失败（文件可能已被移动或删除）");
  return weT("视频加载失败");
}
// 拒绝的性质（记在元素的 dataset 上）: AbortError = play() 被 pause() / load() /
// 换源打断，属瞬时失败 —— 媒体就绪后重试即可自愈，不该当「真拒绝」堵住重试。
// 其余（NotAllowedError / NotSupportedError …）视为真拒绝，等用户显式点「播放」。
function playRefusalBlocks(video) {
  const r = video && video.dataset ? video.dataset.wePlayRefused : "";
  return Boolean(r) && r !== "AbortError";
}
// 把元素真实状态写进 store（仅在变化时 emit —— play/pause/error 监听器会在
// 每次浏览器驱动的状态切换时被调用，不能每次都触发整树重渲染）。
function syncVideoState(video) {
  const playing = Boolean(video) && !video.paused && !video.ended && !video.error;
  // 拒绝原因只在「确实没在播」时报：转码替换 src 打断 play() 会让标记留下，
  // 而随后 loadedmetadata 里补的 play() 成功时标记没人清 —— 不判 playing 的话
  // 面板会同时显示「播放中」和「浏览器拒绝了播放请求」。
  const reason = videoPlaybackError(video)
    || (!playing && playRefusalBlocks(video) ? weT("浏览器拒绝了播放请求") : "");
  if (selection.videoPlaying === playing && selection.videoError === reason) return;
  setTransient("videoPlaying", playing);
  setTransient("videoError", reason);
  emit();
}
// 每个元素只挂一次状态监听（切壁纸会新建 <video>，故标记挂在元素上）。
function watchVideoState(video) {
  if (!video || !video.dataset || video.dataset.weStateWatched === "1") return;
  video.dataset.weStateWatched = "1";
  for (const t of ["play", "playing", "pause", "ended", "error", "emptied"]) {
    try { video.addEventListener(t, () => syncVideoState(video)); } catch { /* ignore */ }
  }
  // 「当前视频播完就换下一张」（issue #230 后续诉求）：轮播组选了 `trigger: 'videoEnd'`
  // 时，壁纸视频的 ended 就是轮换信号 —— 与计时器二选一（syncRotationTimer 在该档不计时）。
  // 只认**当前层**那个 <video>：预热 / 探测元素也走 watchVideoState，它们播完不代表壁纸播完。
  // `loop` 会把 ended 吞掉，所以按 trigger 在建层时关掉 loop（见 video-layer 的
  // loop 分支）—— 这里再加一道 `video.loop` 判断，防止旧层残留的 ended 误触。
  try {
    video.addEventListener("ended", () => {
      if (video.loop) return;
      if (!selection.rotationEnabled || !selection.id) return;
      const group = activeRotationGroup();
      if (!group || group.trigger !== "videoEnd") return;
      const cur = (selection.inventory && selection.inventory.wallpapers || []).find((w) => w && w.id === selection.id);
      // 只对**视频**壁纸生效：场景内嵌视频播完不等于场景结束（它可能还有别的动画）；
      // 图片 / 网页壁纸没有 ended 语义，真出现了也按"不是这个档该管的事"跳过。
      if (!cur || cur.type !== "video") return;
      if (video.currentSrc && selection.url && video.currentSrc.indexOf(String(selection.url).split("?")[0]) < 0) return;
      if (rotationCandidates().length < 2) return;
      liveLog("rotation-video-end", "视频播完 → 换下一张（候选 " + rotationCandidates().length + " 张）");
      beginRotationPrepare(new Set());
    });
  } catch { /* ignore */ }
  // 媒体就绪后按意图自动补一次播放：play() 最常见的失败是被紧接着的 src 切换
  // （转码替换 / 换源）打断 —— 那一刻元素已经 paused，用户看到的就是冻在首帧
  // 的静止画面。就绪事件里重试即可自愈；真的被拒过时由 wePlayRefused 兜底，
  // 不会无限重试。
  for (const t of ["loadeddata", "canplay"]) {
    try { video.addEventListener(t, () => applyVideoPlayback(video)); } catch { /* ignore */ }
  }
}
// 应用期望的播放态，语义是「可重试 + 不说谎」：
//   * 意图 = 暂停            → pause()；
//   * 意图 = 播放但没在播    → 再次 play()（幂等；这正是让卡片上的「播放」
//                              成为真正的重试、而不是一个没反应的按钮）；
//   * 真拒绝记在元素上        → emit / UI tick 不会无限重试 play()，只有用户
//                              显式点击「播放」才清掉重来（见 onTogglePlay）；
//                              AbortError（被换源打断）不算真拒绝，见
//                              playRefusalBlocks。
// ── 壁纸音轨（volume / 总开关）───────────────────────────────────────────
// 期望音量：总开关关闭 → 0；否则取 videoVolume（钳到 0–1）。
// 把最终决策收成一个函数，避免 buildMedia / applyVideoPlayback / UI tick
// 三处各自判断而漂移。
function weAudioVolume() {
  try {
    if (selection.videoAudioEnabled === false) return 0;   // 总开关关闭 → 静音
    return clampNum(selection.videoVolume, 0, 1, 0);
  } catch { return 0; }
}
// ── 音频 / 播放桥已按族搬出（构建期内联在正文之前，同一扁平作用域）────────────────
// 声明在 src/client/audio-playback.js：期望音量与元素音量写入、轮换音频闸、层内媒体元素枚举、
// live iframe 音量与场景包 BGM 的起停、播放状态应用；三个顶层状态随声明一起搬走。


// ── Effect application: push the knobs into CSS variables ───────────────────
// 效果应用层（设置 → DOM）已抽到 src/effects.js：applyEffects / clearEffects 及其字体、
// 光标、壁纸淡出底色助手都在那里；构建期由 build-client.mjs 内联回本作用域，
// 因此下面这些 applyEffects() / clearEffects() 调用点无需改动（契约见该文件头）。

// ── Picker tabs ─────────────────────────────────────────────────────────────
// 调节面板的信息架构：四个页签互斥展示（壁纸库 / 外观 / 播放 / 系统）。最后停留的页签记在
// localStorage（仅 UI 状态，不进 config.json，也不需要 sanitize / serialize）。
const PICKER_TAB_KEY = "dsh-wallpaper-engine:picker-tab";
const PICKER_TABS = [
  { id: "library", get label() { return weT("壁纸库"); } },
  { id: "appearance", get label() { return weT("外观"); } },
  { id: "playback", get label() { return weT("播放"); } },
  { id: "system", get label() { return weT("系统"); } },
  { id: "gallery", get label() { return weT("在线图库"); } },
];
// 旧页签 id → 新 id 的迁移（「字体」并入「外观」）：别把老用户甩回第一页。
const PICKER_TAB_LEGACY = {
  wallpaper: "library", font: "appearance", effects: "playback",
  audio: "playback", mascot: "system", advanced: "system",
};
// ── 可见页签表（ADR-0013 D3① 的"页签安全" + P-D S5e 的 D-6(b) 收口）──────────
// 口径：**整页**都归某个子包浏览器半边的页签，只有在那一半真的在台上时才进导航。为什么必须
// gate：页签内容全部来自面板节注册表（`wePanelSectionsOf`）；子包浏览器半边缺席时注册表里
// 没有那个 panelId 的节，页签会渲染成一块**空白面板** —— 没有报错、也没有空态提示，用户只
// 看到"点进去什么都没有"。所以"可见"不能是静态表，必须是**注册表现存性**的现算。
//
// 为什么用注册表现存性当"dsh.client 存在性"的可观测代理：浏览器侧拿不到构建期的 dsh.client
// 元数据（那是宿主/打包器的信息），但它能看见**注册表里有没有这个 panelId 的节** —— 节是
// 子包浏览器半边在求值时登记的，缺席 ⇒ 零节。这个代理不需要第二套"谁在场"的探测通道，也不
// 会像 DOM/全局探测那样被加载时序骗过去。
//
// ⚠️ **不要**在这里接一张"组件名 → 页签"的表：那是浏览器侧的第二份可见面映射，D3② 明文禁止
// （判据见 test/verify-component-visibility.mjs 的双向对账）。`TAB_SECTION_OWNER` 只写
// "页签 id → 面板节注册表 id"（同一套 id 空间），不写组件名。将来某页整页归新子包时**只改
// TAB_SECTION_OWNER 一行**，其余页签没有 owner ⇒ 恒可见。
const TAB_SECTION_OWNER = { library: "library" };
// 每次渲染现算、**不缓存**注册表快照：注册表是子包浏览器半边求值时写入的，可能晚于首次渲染
// （求值 → 注册 → 监听器触发重画），缓存会把"晚到"永久判成"缺席"。
function visiblePickerTabs() {
  return PICKER_TABS.filter((t) => {
    const owner = TAB_SECTION_OWNER[t.id];
    if (!owner) return true;
    return wePanelSectionsOf(owner).length > 0;
  });
}
// 生效页签 = 存着的那个（旧 id 迁移 + `PICKER_TABS` 校验照旧）若不在可见表里 ⇒ 回落第一个可见。
// 空表（一个可见页签都没有）理论上不可达；真出现也不把 activeTab 设成空值，退回存着的 id。
function resolvePickerTab(id) {
  const tabs = visiblePickerTabs();
  if (tabs.some((t) => t.id === id)) return id;
  return tabs.length ? tabs[0].id : id;
}
function readSavedPickerTab() {
  try {
    let v = localStorage.getItem(PICKER_TAB_KEY);
    if (v && PICKER_TAB_LEGACY[v]) v = PICKER_TAB_LEGACY[v];
    if (v && PICKER_TABS.some((t) => t.id === v)) return v;
  } catch { /* ignore */ }
  return "library";
}

// ── 设置页「全局字体」节的折叠态（ADR-0008 D4 三次修订）──────────────
// 那个节**两档都画**（侧栏 + 设置页），但两档各有自己的开合状态 —— 与 `qp-tab` /
// `picker-tab` 同一条"每档各自的 UI 状态"口径。只存 localStorage，**不进 config.json**
// （它不是设置，是视图状态）。
// ⚠️ 二次修订：设置页**默认全展开**（用户口径「设置页则是全部开启但也支持隐藏」）。
//    存储语义：只在用户真的点过时才写 "1"/"0" ⇒ 读到 "0" 必定是"他主动收起过"，必须尊重；
//    读到 null（从没点过）才用默认值 —— 这样改默认值不会覆盖用户的选择。
const PICKER_FONT_OPEN_KEY = "dsh-wallpaper-engine:picker-font-open";
function readSavedPickerFontOpen() {
  try {
    const v = localStorage.getItem(PICKER_FONT_OPEN_KEY);
    if (v === null) return true;          // 没表过态 ⇒ 设置页默认展开
    return v === "1";
  } catch { /* ignore */ }
  return true;
}
function writeSavedPickerFontOpen(on) {
  try { localStorage.setItem(PICKER_FONT_OPEN_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

// ── 设置页「全局 UI 配色」节的折叠态（同批二次修订为默认展开）──────────
const PICKER_UI_COLOR_OPEN_KEY = "dsh-wallpaper-engine:picker-ui-color-open";
function readSavedPickerUiColorOpen() {
  try {
    const v = localStorage.getItem(PICKER_UI_COLOR_OPEN_KEY);
    if (v === null) return true;          // 没表过态 ⇒ 设置页默认展开
    return v === "1";
  } catch { /* ignore */ }
  return true;
}
function writeSavedPickerUiColorOpen(on) {
  try { localStorage.setItem(PICKER_UI_COLOR_OPEN_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

// ── 设置页「细节 / 玻璃 UI / 侧边栏圆角 / 主题预设」四节的折叠态（二次修订）──────────
// 用户口径：「侧边栏保证后面三个默认隐藏；设置页全部开启但也支持隐藏」⇒
// 这几节在**设置页**默认展开（侧边栏那侧由 quick-panel 的 readQpOpen 给各自的默认值）。
// 「主题预设」只在设置页画（侧栏档整节不渲染 ⇒ 没有 QP 侧的孪生键），并入本组共用一条读法。
// 与上面两个键同一条存储语义（没表过态才吃默认值）。
const PICKER_DETAIL_OPEN_KEY = "dsh-wallpaper-engine:picker-detail-open";
const PICKER_GLASS_UI_OPEN_KEY = "dsh-wallpaper-engine:picker-glass-ui-open";
const PICKER_CORNERS_OPEN_KEY = "dsh-wallpaper-engine:picker-corners-open";
const PICKER_PRESETS_OPEN_KEY = "dsh-wallpaper-engine:picker-presets-open";
/** 设置页这三个门共用一条读法（都默认展开）；写各用各的键。 */
function readSavedPickerOpen(key) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return true;          // 没表过态 ⇒ 设置页默认展开
    return v === "1";
  } catch { /* ignore */ }
  return true;
}
function writeSavedPickerOpen(key, on) {
  try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* ignore */ }
}

// 滑杆右侧那格「数值区」的可输入形态（SliderRow 的 opts.numberEdit 用它）。
//
// 为什么单独一个组件、并且**编辑期不受控**：受控写法（value 由设置渲染、每敲一键就写设置）
// 在"删空重打"这一路会自锁 —— 退格把框清成空串，空串不是合法值 ⇒ 不写设置 ⇒ React 又把旧值
// 渲回去，用户看到的是"数字删不掉"（实测反馈原话：「我在输入框里不能删除已有数字」）。所以：
//   · 未编辑（聚焦前）：value = 设置值，跟着滑杆拖动 / 别处改动同步显示；
//   · 编辑中：自己管自己（defaultValue + 本地 draft），**空串也是合法中间态**，随便删；
//   · 回车 / 失焦：夹取到 [min, max] 后交给同一个处理器（第二参 false = 完整路径），并收起
//     draft 回到受控 —— 值真被拒（越界回落默认）时也能立刻看到真实值。
// draft 只在编辑期覆盖显示，"删空 + 回车"于是回落设置值，而不是把 0 写进去。
function NumberValueInput(props) {
  const { label, min, max, step, unit, value, onCommit, title } = props;
  const [draft, setDraft] = React.useState(null);
  const editing = draft !== null;
  const commit = (raw) => {
    setDraft(null);
    const s = String(raw == null ? "" : raw).trim();
    if (s === "") return;                       // 空 = 放弃这次编辑，保留原值
    const n = Number(s);
    if (!Number.isFinite(n)) return;
    onCommit(Math.max(Number(min), Math.min(Number(max), n)));
  };
  return React.createElement("input", {
    className: "we-picker__value-input", type: "number",
    min: String(min), max: String(max), step: String(step),
    title: title || undefined,
    "aria-label": label + " " + unit,
    ...(editing ? { defaultValue: draft } : { value: String(value) }),
    onFocus: () => { if (!editing) setDraft(String(value)); },
    onInput: (e) => setDraft(e.currentTarget.value),
    onBlur: (e) => commit(e.currentTarget.value),
    onKeyDown: (e) => {
      if (e.key === "Enter") { commit(e.currentTarget.value); e.currentTarget.blur(); }
    },
  });
}

// ── Settings picker ─────────────────────────────────────────────────────────
// `key` is only needed when a SliderRow sits inside a conditionally-rendered
// ARRAY (the sidebar-glass group) — React requires keys there.
function SliderRow(label, min, max, step, value, onInput, suffix, key, opts) {
  opts = opts || {};
  const unit = suffix == null ? "" : String(suffix);
  // ⚠️ 两种调用口径必须并存：
  //   · **裸单位**（"px" / "%" / "s" / "ms"…，#135 新滑杆的口径）⇒ 回显 = 值 + 单位；
  //   · **预格式化整串**（如 `sel.glassAlpha + "%"`）⇒ 整串**原样**显示，
  //     绝不能再去拼值（否则 35 显示成 "3535%"、拖动期还会叠出陈旧单位）。
  // 判别看串里有没有数字：预格式化口径传的一定含值，裸单位一定不含。
  const preformatted = /\d/.test(unit);
  const readout = (v) => (v == null || v === ""
    ? ""
    : (preformatted ? unit : String(v) + unit));
  // `opts.numberEdit`：右侧数值区改成**可取数**的输入框（数值 + 单位同处一个胶囊）。
  // 与滑块走同一个处理器：键入即时生效，回车 / 失焦提交并夹取到本控件的 min..max；
  // 打字中途的空串**不写值**（`Number("") === 0` 会让退格那一下把画面弹到最小值）。
  // #255⑤：**默认可输入**（只有显式传 false 或预格式化口径才退回只读回显）——「滑杆右侧
  // 那格数字只能看不能改」是用户报障的那条；预格式化口径（整串含数字）仍保持只读，
  // 因为那种调用点传的已经是「值+单位」的完整串，拆不出裸值。
  const numberEdit = opts.numberEdit !== false && !preformatted;
  // 拖动期的轨道填充与**数值回显**：就地改这一行的 --we-fill 与右侧数值文本
  //（**局部 DOM 写，不触发 React 渲染**）。抬手那一次仍走完整 emit（含落盘），
  // 于是慢帧下也不会出现"数字跟不上滑块"的空档。
  const liveFill = (el) => {
    try {
      const lo = Number(el.min); const hi = Number(el.max); const v = Number(el.value);
      const pct = hi > lo ? Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)) : 0;
      el.style.setProperty("--we-fill", pct + "%");
      const row = el.parentNode;
      // #255⑤：numberEdit 行的右侧是 <input>（.we-picker__value-input）——拖动期必须**只改
      // input.value**；写父级 .we-picker__value 的 textContent 会把 React 的输入框子树抹掉，
      // 下一次 emit 就崩（用户报障的「拖动几下输入框没了」）。
      const input = row && typeof row.querySelector === "function" ? row.querySelector(".we-picker__value-input") : null;
      if (input) { input.value = String(el.value); return; }
      const out = row && typeof row.querySelector === "function" ? row.querySelector(".we-picker__value") : null;
      // 预格式化口径不做拖动期就地改写 —— 保持原有的既有观感
      //（放手后的 emit 重渲染会给出正确文本）。缺元素 / 预格式化整串：什么都不做。
      if (out && !preformatted) out.textContent = readout(el.value);
    } catch { /* 回显是增强，失败不影响取值 */ }
  };
  // 键入提交住在 NumberValueInput 里（编辑期不受控 + 回车 / 失焦提交），这里只剩滑杆。
  return React.createElement("div", { className: "we-picker__row we-picker__slider-row", key: key },
    React.createElement("span", {
      className: "we-picker__hint we-picker__label",
      title: opts.tooltip || undefined,
      // 可选手势：双击标签回默认（位置行回中心、缩放行回 100%）。只有传了它的行会挂，
      // 且挂上时禁掉文字选择 —— 双击否则会先把标签选中，"回默认"看着像没反应。
      onDoubleClick: opts.onLabelDoubleClick || undefined,
      style: opts.onLabelDoubleClick ? { userSelect: "none" } : undefined,
    }, label),
    React.createElement("input", {
      className: "we-picker__slider", type: "range",
      min: String(min), max: String(max), step: String(step),
      value: String(value),
      // accent 填充进度：track 左段着 accent 色（macOS/Linear 式滑块质感），
      // --we-fill 由当前值算出，emit 重渲染时同步更新（拖动中由 liveFill 就地更新）。
      style: { "--we-fill": Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100)) + "%" },
      // The visible label is a <span> (not a <label>), so expose it to AT.
      "aria-label": label,
      // 拖动档（第二个实参 live=true）：处理器只写值 + 应用样式，不 emit（见 commitLiveSetting）；
      // 抬手那一次由 onChange 走完整路径。
      onInput: (e) => { liveFill(e.currentTarget); onInput(Number(e.target.value), true); },
      // onChange stays as a final commit fallback (some engines only fire it
      // on release); onInput above is what makes the knob feedback instant.
      onChange: (e) => onInput(Number(e.target.value), false),
    }),
    // 右侧数值 = 当前值 + 单位（用户口径："滑动条右侧显示数值"）。它是**回显**，
    // 真值永远在设置里；liveFill 在拖动中就地把这行文本换成同一个格式
    //（仅裸单位口径；预格式化口径见上面 readout 的说明）。
    numberEdit
      ? React.createElement("span", { className: "we-picker__hint we-picker__value" },
        React.createElement(NumberValueInput, {
          label, min, max, step, unit,
          value,
          title: opts.valueTooltip || undefined,
          // 完整路径（第二参 false）：与滑杆抬手同一条口径 —— 写值 + emit。
          onCommit: (n) => onInput(n, false),
        }),
        React.createElement("span", { className: "we-picker__value-unit" }, unit),
      )
      : React.createElement("span", { className: "we-picker__hint we-picker__value" }, readout(value)),
  );
}

// ── Row builders for the tabbed picker ──────────────────────────────────────
// 设置行统一语法：左「标签(+一句话说明)」、右控件；长说明走 title tooltip，
// 不再整行铺陈强调色文字 —— 面板降噪的第一步。行内文字颜色一律走主题墨色
// token（.we-picker 上的 --we-ink*），强调色只留给选中态与控件激活态。

// 行左则：标签 + 可选一句话说明。
function ctlText(label, hint, tooltip) {
  return React.createElement("div", { className: "we-picker__ctl-text" },
    React.createElement("span", {
      className: "we-picker__ctl-label",
      title: tooltip || undefined,
    }, label),
    hint ? React.createElement("span", { className: "we-picker__ctl-hint" }, hint) : null,
  );
}

// 胶囊开关：统一替换原生 checkbox（原生勾选框是面板里最廉价的控件）。
// input 视觉隐藏但可聚焦，焦点环落在 track 上（键盘可达）。
function Toggle(props) {
  return React.createElement("label", { className: "we-picker__switch", title: props.title },
    React.createElement("input", {
      type: "checkbox",
      checked: props.checked,
      disabled: props.disabled === true,
      onChange: props.onChange,
      "aria-label": props.label,
    }),
    React.createElement("span", { className: "we-picker__switch-track" },
      React.createElement("span", { className: "we-picker__switch-thumb" }),
    ),
  );
}

// 开关行：标签(+说明)在左，胶囊开关在右。
function switchRow(label, checked, onChange, opts) {
  opts = opts || {};
  return React.createElement("div", { className: "we-picker__ctl", key: opts.key },
    ctlText(label, opts.hint, opts.tooltip),
    Toggle({ checked: checked, onChange: onChange, label: label, title: opts.tooltip, disabled: opts.disabled }),
  );
}

// 色板行：标签在左，预设圆点 + 自定义取色在右（窄容器自动换行）。
// aria-label 保持「<标签> <hex>」格式（verify 断言依赖）；opts.auto 用于
// 「跟随主题」这类重置项，opts.colorValue 允许自定义取色器的回退显示值。
function swatchRow(label, presets, value, onPick, opts) {
  opts = opts || {};
  return React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key: opts.key },
    ctlText(label, opts.hint, opts.tooltip),
    React.createElement("div", { className: "we-picker__swatches", role: "group", "aria-label": label },
      opts.auto || null,
      presets.map((hex) => React.createElement("button", {
        key: hex,
        className: "we-picker__swatch" + (value === hex ? " we-picker__swatch--active" : ""),
        type: "button",
        style: { background: hex },
        title: hex,
        onClick: () => onPick(hex),
        "aria-label": label + " " + hex,
      })),
      React.createElement("label", { className: "we-picker__swatch-custom" },
        React.createElement("input", {
          type: "color",
          value: opts.colorValue || value || "#ffffff",
          // 拖动色盘：每格都发 input（原生颜色轮盘一次拖动可以上百次）⇒ 拖动档只写值 +
          // 应用样式、**不 emit**（见 commitLiveSetting）；抬手那一次（change）走完整路径。
          onInput: (e) => onPick(e.target.value, true),
          onChange: (e) => onPick(e.target.value, false),
          title: weT("自定义{label}", { label: weT(label) }),
        }),
        React.createElement("span", { className: "we-picker__hint" }, weT("自定义")),
      ),
    ),
  );
}

// ── Vinyl record (黑胶唱片) ─────────────────────────────────────────────────
// A rotating record disc showing the SELECTED wallpaper's cover as the label —
// the "CD player" presentation the author liked. Pure presentational: cover =
// the current wallpaper's preview URL (or null), playing drives the spin.
// Shown in BOTH settings layouts and in the picker modal head.
// 旋转是挂在 backdrop-filter 玻璃面上的无限动画: 页面不可见时 (后台标签/最小化)
// 它仍会驱动合成器反复重绘 backdrop。document.hidden 期间不转 — 元素此刻本来
// 就看不见, visibilitychange (apply 的 occlusion 监听 → emit) 会立刻转回来。
function vinylSpinVisible() {
  return typeof document === "undefined" || document.hidden !== true;
}
function VinylRecord(props) {
  const cover = props.cover;
  const title = props.title || weT("未选择壁纸");
  const playing = props.playing === true;
  const sm = props.sm === true;
  return React.createElement("div", {
    className: "we-vinyl" +
      (playing ? " we-vinyl--playing" : "") +
      (sm ? " we-vinyl--sm" : ""),
    title: title,
  },
    React.createElement("div", { className: "we-vinyl__cover" },
      cover
        ? React.createElement("img", {
            src: cover, alt: "", loading: "lazy",
            onError: (e) => { e.target.style.display = "none"; },
                            onLoad: (e) => { e.target.style.opacity = "1"; },
          })
        : React.createElement("span", { className: "we-vinyl__empty" }, "▦"),
    ),
    React.createElement("span", { className: "we-vinyl__hole" }),
  );
}

// ── Library-view a11y helpers ────────────────────────────────────────────────
// pickerOpener: the「选择壁纸」button — focus returns here when the library
// view closes. pickerFocusPending: one-shot flag so the view's initial focus
// lands exactly once on open (an inline ref callback would re-fire every render).
let pickerOpener = null;
// eslint-disable-next-line prefer-const -- 跨片段写入：src/panel-tabs/effects.js 的 `customFrameInput`
let customFrameInput = null;
let pickerFocusPending = false;
// GPU 抓帧缓存状态（面板展示用）：wid 对应当前面板壁纸，pinned=缓存里已有
// <key>_gpu.png。GPU 帧优先于「出图来源」的自动档（按用户决策），因此
// 想切档位/换回 CPU 生成的画面必须先清掉它 —— 面板据此给出提示与清除入口。
const gpuFrameUi = {
  wid: "", pinned: false, busy: false, probedAt: 0, error: "",
  // 实时帧预览用：抓帧的像素尺寸（宿主 HEAD 的 X-WE-GPU-W/H）+ 手动重抓是否在途。
  w: 0, h: 0, recapturing: false,
};
const GPU_FRAME_PROBE_TTL_MS = 30000;
function gpuFrameToken(frameUrl) {
  const src = String(frameUrl || "");
  if (src.indexOf("/scene-frame/") === -1) return "";
  return String(src.split("/scene-frame/").pop() || "").split("?")[0];
}
function markGpuFrameProbed(wid, pinned) {
  gpuFrameUi.wid = String(wid || "");
  gpuFrameUi.pinned = Boolean(pinned);
  gpuFrameUi.probedAt = Date.now();
}

// ── 壁纸库页签的处理器（渲染器只读值 + 调这些）────────────────────────────────
// `src/panel-tabs.js` 的契约是「只读 + 组装 React 树」：**写设置 / 改状态 / 发通知都归这里**。
// 下面这些处理器是 ctx 的**供给方**（同模态框 / 属性面板那条契约）：渲染器只读值 + 调它们，
// 本身不引用 `selection` / `emit`，也不写本文件模块作用域的 `propsPanelOpen` /
// `pickerFocusPending` / `pickerOpener`（**别人的状态**）。
// 判据：`test/verify-client.mjs` 的接缝判据（页签与那两个渲染器同一条口径）。
function setPickerOpener(el) { pickerOpener = el; }
function onTogglePropsPanel() {
  propsPanelOpen = !propsPanelOpen;
  if (propsPanelOpen) loadUserPropDefs(propTokenOf(selection), true);
  emit();
}
/** 两个「选择壁纸」入口只差草稿标志：普通下钻（点卡片即应用）与轮播编辑器的草稿下钻。 */
function openPicker(draft) {
  setTransient("pickerOpen", true);
  setTransient("pickerDraft", draft);
  setTransient("modalView", "normal");
  pickerFocusPending = true; // 打开后焦点落入下钻视图（见 modalInitialFocus）
  emit();
}
function onOpenPicker() { openPicker(false); }
function onOpenPickerDraft() { openPicker(true); }
// 轮播列表编辑器的**草稿**（住在 selection.editing；保存才由 saveEditingGroup 落盘）。
function onEditName(e) {
  if (selection.editing) { selection.editing.name = e.target.value; emit(); }
}
function onEditInterval(e) {
  if (!selection.editing) return;
  // ⚠️ 取值域用 ROTATION_INTERVAL_MIN/MAX 而不是 schemaRange("rotationInterval")：
  // `rotationInterval` 是 DEFAULTS_ONLY 键（**不在 KINDS 里**）⇒ 问 KINDS 得到的是
  // [undefined, undefined] ⇒ clampNum 恒回落默认值 30，界面上"选任何时间都无效"
  // （issue #230 的根因）。真源见 lib/settings-schema.js 的那对常量。
  selection.editing.interval = clampNum(Number(e.target.value), ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX, DEFAULTS.rotationInterval);
  emit();
}
function onEditTrigger(e) {
  if (!selection.editing) return;
  selection.editing.trigger = e.target.value === "videoEnd" ? "videoEnd" : "interval";
  emit();
}
function onEditOrder(e) {
  if (selection.editing) { selection.editing.order = e.target.value; emit(); }
}
// 两个可编辑路径（上传目录 / 官方资源路径）的**草稿**状态 —— 都在 selection 的瞬态字段里。
function onStartEditUploadDir() {
  setTransient("editingUploadDir", true);
  setTransient("uploadDirDraft", selection.inventory.uploadDir || "");
  emit();
}
function onUploadDirDraft(e) { setTransient("uploadDirDraft", e.target.value); emit(); }
function onCancelEditUploadDir() { setTransient("editingUploadDir", false); emit(); }
function onCacheDirDraft(e) { setTransient("cacheDirDraft", e.target.value); emit(); }
// 缓存位置（高级页签）的草稿态 —— 与上传目录同口径：生效值从 inventory 取。
// 「更改」= 打开草稿行（保留确认/迁移提示那一步）**并**弹出目录浏览器 —— 网页拿不到
// 原生选择框（给不了绝对路径），这块面板就是等价物：宿主列目录、用户点着进出。
function onStartEditCacheDir() {
  setTransient("editingCacheDir", true);
  setTransient("cacheDirDraft", selection.inventory.cacheDir || "");
  setTransient("cacheDirError", "");
  setTransient("cacheDirNote", "");
  openCacheDirBrowse(selection.inventory.cacheDir || "");
  emit();
}
function openCacheDirBrowse(path) {
  setTransient("cacheDirBrowse", {
    path: path || "", display: path || "", dirs: [], parent: null,
    home: "", truncated: false, loading: true, error: "",
  });
  browseCacheDir(path);
}
function onCloseCacheDirBrowse() { setTransient("cacheDirBrowse", null); emit(); }
function onCacheDirBrowseInput(e) {
  const b = selection.cacheDirBrowse;
  if (b) setTransient("cacheDirBrowse", { ...b, display: e.target.value });
  emit();
}
function onCacheDirBrowseGo() {
  const b = selection.cacheDirBrowse;
  if (b) browseCacheDir(b.display);
}
function onCacheDirBrowseEnter(entryPath) { browseCacheDir(entryPath); }
function onCacheDirBrowseUp() {
  const b = selection.cacheDirBrowse;
  if (b && b.parent) browseCacheDir(b.parent);
}
// 选中：地址栏草稿（改了没跳转也算数）填进 cacheDirDraft，收起浏览器 —— 保存/迁移
// 语义仍在草稿行那一步（与上传目录同族口径：选完还要按保存）。
function onPickCacheDir() {
  const b = selection.cacheDirBrowse;
  const picked = b ? String(b.display || b.path || "").trim() : "";
  if (picked) setTransient("cacheDirDraft", picked);
  setTransient("cacheDirBrowse", null);
  setTransient("editingCacheDir", true);
  emit();
}
// 拉一级目录列表（根视图传空）。失败**保住旧列表**只亮错误行：浏览是辅助，
// 不能因为一次读失败把用户已经走到的位置丢掉。
async function browseCacheDir(path) {
  const prev = selection.cacheDirBrowse || {};
  setTransient("cacheDirBrowse", { ...prev, path: path || "", loading: true, error: "" });
  emit();
  try {
    const q = path ? "?path=" + encodeURIComponent(path) : "";
    const res = await apiJson(CACHE_DIR_BROWSE_URL + q, { parse: "always" });
    if (!res.ok) throw new Error(hostFailureReason(res));
    const d = res.data || {};
    setTransient("cacheDirBrowse", {
      path: d.current || "",
      display: d.current || "",
      home: d.home || "",
      dirs: Array.isArray(d.dirs) ? d.dirs : [],
      parent: d.parent || null,
      truncated: d.truncated === true,
      loading: false,
      error: "",
    });
  } catch (err) {
    setTransient("cacheDirBrowse", {
      ...prev,
      loading: false,
      error: weT("无法读取该目录：{error}", { error: weT(err && err.message ? err.message : err) }),
    });
  }
  emit();
}
function onCancelEditCacheDir() {
  setTransient("editingCacheDir", false);
  setTransient("cacheDirBrowse", null);
  setTransient("cacheDirError", "");
  emit();
}
function onStartEditWeAssetsDir() {
  setTransient("editingWeAssetsDir", true);
  setTransient("weAssetsDirDraft", selection.inventory.weAssetsDir || "");
  setTransient("weAssetsError", "");
  emit();
}
function onWeAssetsDirDraft(e) { setTransient("weAssetsDirDraft", e.target.value); emit(); }
function onCancelEditWeAssetsDir() {
  setTransient("editingWeAssetsDir", false);
  setTransient("weAssetsError", "");
  emit();
}

// ── 外观 / 播放 / 系统页签的处理器（同上一条：渲染器只读值 + 调这些）────────────
function onLeftSidebarGlass(e) { setSetting("leftSidebarGlass", e.target.checked); emit(); }

// ── 侧边栏四角圆角 / 直角（外观 → 侧边栏圆角）────────────────────────────────
// 键名表**只此一份**：面板按 (side, corner) 调，批量化也读它 —— 手抄第二份必然漂。
const SIDEBAR_CORNER_KEYS = {
  left: { tl: "leftSidebarSquareTL", tr: "leftSidebarSquareTR", br: "leftSidebarSquareBR", bl: "leftSidebarSquareBL" },
  right: { tl: "rightSidebarSquareTL", tr: "rightSidebarSquareTR", br: "rightSidebarSquareBR", bl: "rightSidebarSquareBL" },
};
const SIDEBAR_RADIUS_KEYS = { left: "leftSidebarCornerRadius", right: "rightSidebarCornerRadius" };
/** 统一档（'native' | '6' | '12' | '20'）：写 border-radius 简写的那一半。 */
function onSidebarCornerRadius(side, value) {
  const key = SIDEBAR_RADIUS_KEYS[side];
  if (key) setSetting(key, value);
  emit();
}
/** 单角直角开关：true = 这一角强制 0px（覆盖统一档）。 */
function onSidebarCornerSquare(side, corner, square) {
  const key = SIDEBAR_CORNER_KEYS[side] && SIDEBAR_CORNER_KEYS[side][corner];
  if (key) setSetting(key, square === true);
  emit();
}
/** 批量：四角一起直角 / 一起回到统一档（只 emit 一次，别让四个键各刷一遍）。 */
function onSidebarAllCorners(side, square) {
  const table = SIDEBAR_CORNER_KEYS[side];
  if (table) for (const key of Object.values(table)) setSetting(key, square === true);
  emit();
}
// 标题栏液态玻璃（titlebarGlass）：与左侧栏同一形状的**乙类**总开关 —— 门控属性挂在
// 玻璃后端（现 packages/glass/src/glass.js，ADR-0016 第三刀出户；本文件只翻存储键，切换不重建任何东西）。
function onTitlebarGlass(e) { setSetting("titlebarGlass", e.target.checked); emit(); }
// 「思考块液态玻璃」三挡分段（关 / 液态玻璃 / 原生）：一次写两键 —— 原生挡赢过玻璃挡的
// 互斥由 glass-layer.js 的门控属性保证（thinkingNative ⇒ 不挂 data-we-thinking-glass），
// 这里让存储两键与所选拍始终一致（不留给手改 config 4 种组合里的矛盾态）。
function onThinkingMode(mode) {
  setSetting("thinkingGlass", mode === "glass");
  setSetting("thinkingNative", mode === "native");
  emit();
}
// 胶囊雾化（行内代码 / 新会话 / 导航按钮）：与 thinkingGlass 同族 —— 消费它的规则
// 全部挂在 data-we-thinking-glass 门下，所以滑杆也只在该开关打开时渲染（glass-panel）。
const onCapsuleBlur = (px, live) =>
  commitLiveSetting("capsuleBlur", clampNum(px, ...schemaRange("capsuleBlur"), DEFAULTS.capsuleBlur), live);
// 胶囊釉色：与 onSidebarColor 同形（hex 白名单校验 + live 落效）。
const onCapsuleColor = (hex, live) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  commitLiveSetting("capsuleColor", hex, live);
};

// ── 以下处理器模块级 —— 快捷播放面板（src/quick-panel.js）与设置页**共用同一批处理器**。
//    ⚠️ 分档（ADR-0008 D4）：侧栏档只画**简化配置**（全局四件套 + 各面总开关），
//    高级行的处理器在那份 ctx 里是"取用即抛错"的占位器 —— 所以这里给的是**全量**模块级处理器，
//    "哪一档真的用到哪些"由 quick-panel 的 provided 对象与 QP_CTX_SETTINGS_ONLY 名单决定。
//    依赖（setSetting / commitLiveSetting / clampNum / schemaRange / selection /
//    persistSelection / applyEffects / emit）全部模块级。
// 侧栏玻璃（dsh-better-sidebar）：独立于会话玻璃的一套细粒度控制，各自立即
// 生效并持久化（--we-sidebar-blur / --we-sidebar-alpha / --we-sidebar-color）。
const onSidebarBlur = (px, live) =>
  commitLiveSetting("sidebarBlur", clampNum(px, ...schemaRange("sidebarBlur"), DEFAULTS.sidebarBlur), live);
// 跟随全局：只切一个门（body 属性 + 一组变量指向），不重建任何东西。
function onSidebarFollowGlobal(e) { setSetting("sidebarFollowGlobal", e.target.checked); emit(); }
const onSidebarAlpha = (pct, live) =>
  commitLiveSetting("sidebarAlpha", clampNum(pct, ...schemaRange("sidebarAlpha"), DEFAULTS.sidebarAlpha), live);
const onSidebarColor = (hex, live) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  commitLiveSetting("sidebarColor", hex, live);
};


// 内容面（编辑器/终端）近不透明玻璃底：透明度滑块 + 底色（空 = 跟随主题）。
const onSidebarContentAlpha = (pct, live) =>
  commitLiveSetting("sidebarContentAlpha", clampNum(pct, ...schemaRange("sidebarContentAlpha"), DEFAULTS.sidebarContentAlpha), live);
const onSidebarContentColor = (hex, live) => {
  if (hex === "") {
    // 跟随主题面板色：清键 + 落盘（拖动档不会走到这里 —— 色盘的「跟随」是按钮）。
    selection.sidebarContentColor = "";
    persistSelection();
    if (live) applyEffects({ live: true }); else emit();
    return;
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  commitLiveSetting("sidebarContentColor", hex, live);
};


// 输入光标颜色："" = 跟随 dsh 原生（自动档），hex = 立即注入并持久化。
const onCaretColor = (hex, live) => {
  if (hex === "") {
    commitLiveSetting("caretColor", "", live);
    return;
  }
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  commitLiveSetting("caretColor", hex, live);
};

function onSidebarGlass(e) { setSetting("sidebarGlass", e.target.checked); emit(); }
// 侧栏全透明（issue #137）：显式放弃可读性下限。与 onSidebarGlass 同形 —— 门控属性
//（data-we-sidebar-fullclear）由 applyGlass 挂/摘，CSS 那组规则只认属性。
function onSidebarFullClear(e) { setSetting("sidebarFullClear", e.target.checked); emit(); }

// #277：第三方表面实底底板（默认开）。与上面同形 —— 门控属性 data-we-floater-solid
// 由玻璃包的 applyGlass 挂/摘（值与门正交），玻璃包的 CSS 那组规则只认属性。
function onFloaterSolidBase(e) { setSetting("floaterSolidBase", e.target.checked); emit(); }

// ── 「玻璃 UI」各子项的「独立配置」开关（写的是**模式**）───────────────────
// ⚠️ 只有 `glassMode` 一个键：能读自己的值这件事，由"注册表 params ↔ 接线点"（守卫 ④）
//    与"写了必须被 CSS 读到"（⑬）保证。
function onToggleChildIndependent(id, on) {
  const next = Object.assign({}, selection.glassMode);
  if (on) next[id] = "custom"; else delete next[id];
  setSetting("glassMode", next);
  emit();
}
/** 某一个子项的「独立配置」是否已开（**只看模式**）。 */
function childIndependentOn(id) {
  return !!(selection.glassMode && selection.glassMode[id] === "custom");
}
// 子 UI 独立参数：直接写它自己的键（键名由 childGlassKey 生成，与 schema 同源）。
function onGlassChildParam(id, param, value) { setSetting(childGlassKey(id, param), value); emit(); }
// 场景 / 网页实时渲染的总开关就是**显式重试入口**：除写设置外还要清空全部失败记忆
//（含**会话内**的传输类软失败 —— 它不在设置里），并重建层与音频互斥态。
// 五件事必须一起发生，所以它是一个处理器，而不是渲染器里的五行。
function onToggleSceneLive(e) {
  setSetting("sceneLive", e.target.checked);
  setSetting("sceneLiveFailures", {});
  prepareLiveTimeouts.clear(); // 准备期 live 超时冷却一并清零
  clearLiveSessionFailures();  // 会话内的传输类软失败同样要清
  syncLayers();                // key 的 live 段变化 → 层重建（升级/降级）
  syncSceneAudio(selection);   // 音频互斥状态随形态切换
  emit();
}
function onLiveBootDelay(secs) { setSetting("liveBootDelay", secs); emit(); }
function onSceneLiveFps(f) { setSetting("sceneLiveFps", f); syncLayers(); emit(); }
// 自动画质开关：值进渲染页 URL（autoq=0）⇒ 必须重建层（syncLayers）。
function onSceneAutoQuality(v) { setSetting("sceneAutoQuality", v === true); syncLayers(); emit(); }
function onPlaybackRate(rate) { setSetting("playbackRate", rate); emit(); }
function onFpsCap(cap) {
  // 用户主动改上限：这一轮抽帧升级允许当场换源（自动触发的那一轮不允许，见 upgradeByUser）。
  try { noteFpsCapChange(); } catch { /* ignore */ }
  setSetting("fpsCap", cap);
  refreshMediaInfo(true);
  emit();
}
function onFlip(e) { setSetting("flip", e.target.checked); emit(); }
function onAdapterTarget(e) { setSetting("adapterTarget", e.target.value); emit(); }
function onPauseOnHidden(e) { setSetting("pauseOnHidden", e.target.checked); emit(); }
function onPauseOnBlur(e) { setSetting("pauseOnBlur", e.target.checked); emit(); }
function onPauseOnBattery(e) { setSetting("pauseOnBattery", e.target.checked); emit(); }
function onToggleLiveDiag() { toggleLiveDiag(); emit(); }

/**
 * 适配方式（覆盖 / 填充 / 居中 / 拉伸）：除写设置外，Edge 的 canvas 渲染路径把 fit 存在
 * `weDrawCtx` 上，而 `syncLayers` 的 same-canvas 守卫不会重建 draw loop ⇒ 这里要直接更新并重绘。
 */
function onObjectFit(mode) {
  setSetting("objectFit", mode);
  emit();
  if (weDrawCtx) {
    weDrawCtx.fit = mode;
    weDrawFrame();
  }
}
// 面板上「当前壁纸实时帧」微缩预览的 URL：与层里正在用的那个 URL **同源**（同一
// 画面档位；scene-frame 路由在有 _gpu.png 时优先服务它），所以预览看到什么、切换
// 途中与 live 首帧前显示的就是什么。尾上挂一个缓存破坏参数：probedAt 一变（重抓/
// 清除后的复检）URL 就变 → <img> 会重新取图，预览立刻跟上。
function framePreviewSrc(selLike) {
  const v = Number(selLike && selLike.frameVariants && selLike.frameVariants[String(selLike && selLike.id)]) || 0;
  const base = frameUrlWithVariant(selLike && selLike.sceneFrameUrl, v);
  if (!base) return "";
  return base + (base.indexOf("?") === -1 ? "?" : "&") + "we-prev=" + (gpuFrameUi.probedAt || 0);
}
// 探测当前壁纸的抓帧槽位状态（HEAD，纯磁盘探测，绝不触发任何生成）。带 TTL
// 去重：syncLayers 调用频繁，同一壁纸 30s 内只探一次；force 用于清除后复检。
function probeGpuFrameState(frameUrl, force) {
  const wid = String(selection.id || "");
  const token = gpuFrameToken(frameUrl);
  if (!wid || !token) return;
  if (!force && gpuFrameUi.wid === wid && Date.now() - gpuFrameUi.probedAt < GPU_FRAME_PROBE_TTL_MS) return;
  const at = Date.now();
  gpuFrameUi.wid = wid;
  gpuFrameUi.probedAt = at;
  const wasPinned = gpuFrameUi.pinned;
  // 探测 = 读主帧在不在 + 几何（W/H 头），面板的「已抓帧/未抓帧」读数、清除与
  // 重抓动作作用在同一份主帧上，读行动作一致。
  apiHead("/scene-frame/" + encodeURIComponent(token))
    .then((res) => {
      if (gpuFrameUi.wid !== wid || gpuFrameUi.probedAt !== at) return; // 期间切了壁纸
      const rh = res.response;
      const pinned = Boolean(res.ok && rh && rh.headers && typeof rh.headers.get === "function"
        && rh.headers.get("x-we-gpu") === "1");
      gpuFrameUi.pinned = pinned;
      // 存帧像素尺寸（预览窗口展示用；旧宿主没有这两个头 → 保持 0，预览只显示图）。
      const gw = pinned ? Number(rh.headers.get("x-we-gpu-w")) : 0;
      const gh = pinned ? Number(rh.headers.get("x-we-gpu-h")) : 0;
      gpuFrameUi.w = Number.isFinite(gw) && gw > 0 ? gw : 0;
      gpuFrameUi.h = Number.isFinite(gh) && gh > 0 ? gh : 0;
      gpuFrameUi.busy = false;
      if (pinned !== wasPinned) { try { emit(); } catch { /* ignore */ } }
    })
    .catch(() => { /* 探测失败保持现状，30s 后再试 */ });
}
function modalInitialFocus(el) {
  if (el && pickerFocusPending) {
    pickerFocusPending = false;
    try { el.focus(); } catch { /* ignore */ }
  }
}
// Keyboard activation for the div[role="button"] wallpaper cards
// (Enter / Space → click), shared by the normal / hidden / close cards.
function cardKeyDown(e) {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); }
}

// ── 播放控制处理器（模块级）─────────────────────────────────────────────────
// 设置页与快捷播放面板（quick-panel.js，官方侧栏 tab 与低版本抽屉共用）调用**同一份实现**
// （语义唯一真源，不是两份手抄）—— 它们改的也是同一批设置键。
function playbackIsVideoLike(selLike) {
  const isLiveScene = (selLike.type === "scene" || selLike.type === "web") && liveRenderEnabled(selLike);
  return !isLiveScene && (selLike.type === "video"
    || (selLike.type === "scene" && Boolean(selLike.sceneVideo)));
}
// 播放/暂停: 意图 =「播放」但元素并没有真的在播时（被拒 / 解码失败 /
// 被浏览器暂停），点击必须【重试播放】而不是把意图翻成 false —— 否则这个
// 按钮在冻住状态下等于没反应，用户没有可用的「继续」。
function onTogglePlay() {
  if (selection.playing && playbackIsVideoLike(selection) && !selection.videoPlaying) {
    const layer = document.getElementById(LAYER_ID);
    const v = layer && layer.querySelector("video");
    if (v && v.dataset) delete v.dataset.wePlayRefused; // 清掉拒绝标记才能重试
    setTransient("videoError", "");
    emit(); // syncLayers → applyVideoPlayback 会重新 play()
    return;
  }
  setTransient("playing", !selection.playing);
  emit();
}
// 音乐开关：只翻总开关，不动 videoVolume —— 关掉再打开能恢复原音量。
// 例外：**开启时若音量为 0**（默认值），自动提到默认可听音量 —— 否则开关
// 打开了却依然无声，用户把这条读作「音量开/关都不生效」（实测）。
function onToggleAudio() {
  const enabling = selection.videoAudioEnabled === false;
  selection.videoAudioEnabled = enabling;
  if (enabling && clampNum(selection.videoVolume, 0, 1, 0) <= 0) {
    selection.videoVolume = DEFAULT_AUDIO_VOLUME;
  }
  const layer = document.getElementById(LAYER_ID);
  const v = layer && layer.querySelector("video");
  if (v) weApplyAudio(v);
  syncSceneAudio(selection);
  if (sceneAudioEl && selection.videoAudioEnabled !== false && weAudioVolume() > 0) {
    const p = sceneAudioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => { /* ignore */ });
  }
  persistSelection();
  emit();
}
// 音量滑块（0–100%）：视频 / 场景内嵌 MP4 / 场景包内音频共用同一 videoVolume。
// 拖动档（live）照样即时改音量（听得见），只是不 emit —— 见 commitLiveSetting。
function onVideoVolume(pct, live) {
  selection.videoVolume = clampNum(Number(pct) / 100, 0, 1, 0);
  const layer = document.getElementById(LAYER_ID);
  const vid = layer && layer.querySelector("video");
  if (vid) weApplyAudio(vid);
  syncSceneAudio(selection);
  if (sceneAudioEl && selection.videoAudioEnabled !== false && weAudioVolume() > 0) {
    const p = sceneAudioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => { /* ignore */ });
  }
  persistSelection();
  if (!live) emit();
}
function onClear() {
  // 清掉壁纸 = 这张的属性面板也失去对象：顺手把「壁纸属性」收起来。不收的话开关会
  // 「挂着」，下次随便选一张带属性的壁纸时面板会**自动弹开**（用户没点过它）。
  propsPanelOpen = false;
  applySelection("");
}
// 手动点开一张壁纸 = 明确想看它：作废它的 live 失败记忆（sceneLiveFailures，持久
// 降级），让实时渲染重试一次（真失败会自动回退并重新记账）。没有这条路时，一张
// 「某次首帧超时」的壁纸会被**永久**降级到无音频桥形态 —— 音频驱动的壁纸（如
// 音域回响）就此黑屏且用户无路可走（实测）。只清手动路径：轮换提交不清。
function clearLiveFailure(id) {
  const k = String(id || "");
  const m = selection.sceneLiveFailures;
  if (!k || !m || !m[k]) return;
  const next = Object.assign({}, m);
  delete next[k];
  setSetting("sceneLiveFailures", next);
}
function onGroupChange(e) {
  // 换列表 ⇒ 清掉待确认（不变量 3）：否则"删除「A」？"会跟着新选中的 B 一起显示。
  disarmConfirm();
  const nextGroupId = e.target.value;
  selection.rotationGroupId = nextGroupId;
  // 选「— 选择轮播列表 —」（空值）= 不轮播：停在当前壁纸、停掉轮转、取消进行中的准备，
  // **不切图**。原来空值也会走下面的 applySelection(候选第一张)，而空列表时 candidates 退化成
  // "全部可播放" ⇒ 一选空就被当成"换了一组"，壁纸当场被换掉。
  if (!nextGroupId) {
    selection.rotationEnabled = false;
    cancelRotationPrepare();
    persistSelection();
    syncRotationTimer();
    emit();
    return;
  }
  if (selection.rotationEnabled) {
    const first = rotationCandidates()[0];
    if (first) applySelection(first.id);
    else applySelection("");
    return;
  }
  persistSelection();
  syncRotationTimer();
  emit();
}
function onToggleRotation() {
  selection.rotationEnabled = !selection.rotationEnabled;
  // 关闭轮换：进行中的准备（staging/探测元素）一并取消，不再落实切换。
  if (!selection.rotationEnabled) cancelRotationPrepare();
  if (selection.rotationEnabled) {
    if (!selection.rotationGroupId) {
      const usable = firstUsableGroup();
      if (usable) selection.rotationGroupId = usable.id;
    }
    if (!rotationCandidates().some((w) => w.id === selection.id)) {
      const first = rotationCandidates()[0];
      if (first) {
        applySelection(first.id);
        return;
      }
    }
  }
  persistSelection();
  syncRotationTimer();
  emit();
}
// 「下一张」（快捷面板）：轮播开着按活动列表推进、关着按可播放网格推进；
// 锚点是【实际显示】的那张（与轮换同一锚点判定，避免 A→B→A 乒乓）。
function onNextWallpaper() {
  const list = selection.rotationEnabled ? rotationCandidates() : rotationPoolAll();
  if (list.length < 2) return;
  const anchor = rotationAnchorWallpaper();
  const anchorId = anchor ? anchor.id : selection.id;
  const cur = list.findIndex((w) => w.id === anchorId);
  const next = list[(cur + 1 + list.length) % list.length];
  if (next && next.id !== anchorId) applySelection(next.id, { fromManual: true });
}

// ── 外观 / 画面处理器（模块级）──────────────────────────────────────────────
// 与上面那批播放控制处理器同源理由：快捷播放面板的「外观」「播放」两页与设置页
// 同名页签**共用同一批渲染器**（renderAppearanceTab / renderEffectsTab 的
// ctx.surface 分支），而渲染器的回调必须在模块级才组得进侧栏的 ctx。
// 这几支的取值单位与落盘路径与设置页逐字相同（照原样搬出组件闭包）。统一的写法是
// commitLiveSetting：非拖动档 = 写设置 + emit（applyEffects 是 emit 的订阅者，一趟里
// 更新 CSS 变量与数值回读）；拖动档 = 写设置 + 只应用样式、不 emit（见该函数的说明）。
//   · 画面组：scrim / wallpaperOpacity / wallpaperBlur / background{Brightness,Contrast,Saturate}
//   · 外观组：accent / glassColor / glassAlpha / border / blur（雾化）
//   · 主题随壁纸开关（打开时立刻按当前壁纸补判一次）
const onScrim = (pct, live) => commitLiveSetting("scrim", pct / 100, live);
  // 壁纸透明度：存 %，applyEffects 换算成 element opacity（可拖范围见 clampNum 的实参，真源是 lib/settings-schema.js 的 KINDS）。
const onWallpaperOpacity = (pct, live) =>
  commitLiveSetting("wallpaperOpacity", clampNum(pct, ...schemaRange("wallpaperOpacity"), DEFAULTS.wallpaperOpacity), live);
const onBorder = (pct, live) => commitLiveSetting("border", pct / 100, live);
const onBlur = (px, live) => commitLiveSetting("blur", px, live);
const onWallpaperBlur = (px, live) => commitLiveSetting("wallpaperBlur", px, live);
const onBackgroundBrightness = (pct, live) => commitLiveSetting("backgroundBrightness", pct, live);
const onBackgroundContrast = (pct, live) => commitLiveSetting("backgroundContrast", pct, live);
const onBackgroundSaturate = (pct, live) => commitLiveSetting("backgroundSaturate", pct, live);
// 壁纸层取景（位置 / 缩放，对应 WE 壁纸属性面板的 水平 / 垂直 / 缩放）：整屏百分比偏移
// （50 = 居中）与缩放百分比（100 = 原大小）。量程一律走 schemaRange，不在这里写数字 ——
// 手写那对数字会与 KINDS 漂移，而 clampNum 越界即回落默认值（用户实测过"拉到头跳回默认"）。
const onLayerPositionX = (pct, live) =>
  commitLiveSetting("layerPositionX", clampNum(pct, ...schemaRange("layerPositionX"), DEFAULTS.layerPositionX), live);
const onLayerPositionY = (pct, live) =>
  commitLiveSetting("layerPositionY", clampNum(pct, ...schemaRange("layerPositionY"), DEFAULTS.layerPositionY), live);
const onLayerScale = (pct, live) =>
  commitLiveSetting("layerScale", clampNum(pct, ...schemaRange("layerScale"), DEFAULTS.layerScale), live);
// 三条行的"回到默认"手势（双击标签）：面板没有通用的恢复默认行，而把滑块精确拖回
// 50 / 100 很难。走完整 emit（含落盘），一步到位。
const onLayerReset = (key) => {
  const field = key === "x" ? "layerPositionX" : key === "y" ? "layerPositionY" : "layerScale";
  setSetting(field, DEFAULTS[field]);
  emit();
};

// ── 模块级 / 页签级 / 全局重置（issue #192）────────────────────────────────────
// 键集一律取自 lib/settings-schema.js 的 `RESET_MODULES`（模块级）/ `RESET_TABS`（页签级）/
// `PROFILE_PRESET_KEYS`（全局）—— 都在那一侧定义，这一侧不手抄键表。
// ⚠️ 必须是**整批赋值 + 一次 persistSelection + 一次 emit**：逐键走 `setSetting` 会发 N 次
// debounce、N 次整棵面板重渲染（本仓"写必成对"纪律，同 src/fontset-store.js 的注释）。
/**
 * 把给定的键整批写回默认值，返回真正改动的键数。
 * 只碰"确实有默认值"的键：缺默认值的键原样留着，免得把 `undefined` 写进 store ——
 * 那会被宿主 sanitize 折成默认值，看着像"重置生效了"，实际是绕了一圈的静默改写。
 */
function resetKeysToDefault(keys) {
  let touched = 0;
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, k)) continue;
    if (selection[k] === DEFAULTS[k]) continue;
    selection[k] = DEFAULTS[k];
    touched += 1;
  }
  if (touched) persistSelection();
  return touched;
}
/**
 * 模块级重置（**无需确认**：单模块代价低 —— 用户口径见 issue #192）。
 * 覆盖外观页签的六个模块（theme / detail / glass / corners / uiColor / font）—— 同一个
 * 入口，键集由模块名查表。
 */
const onResetModule = (groupName) => {
  const keys = (typeof RESET_MODULES === "object" && RESET_MODULES && RESET_MODULES[groupName]) || [];
  if (!keys.length) return;
  resetKeysToDefault(keys);
  emit();
};
/**
 * 页签级重置（issue #192 用户口径：「每个选项卡后面加重置，重置指定选项卡」）。
 * 键集取自 `RESET_TABS`（schema 里手写并由守卫对账的完整划分）。
 * 走两步确认 ⇒ 这个函数只负责"确认之后真的做"，确认由面板用 armConfirm 上膛。
 */
const onResetTab = (tabId) => {
  const keys = (typeof RESET_TABS === "object" && RESET_TABS && RESET_TABS[tabId]) || [];
  resetKeysToDefault(keys);
  disarmConfirm(); // 确认行自己收掉（它内部会 emit）
};
/**
 * 全局重置（**必须二次确认**）：确认由面板走既有 `armConfirm` 两步确认构件完成
 * （`selection.armedConfirm` 是单值 ⇒ 结构上同一时刻只有一个动作待确认，见那段注释），
 * 这里只负责"确认之后真的做"。
 * 范围 = `PROFILE_PRESET_KEYS`（全部会持久化的设置键）；**不含导入的资产文件**
 * （头像图 / 吉祥物立绘 / 字体集住各自的目录，删不删是另一件事 —— 重置设置不该顺手删用户的图）。
 */
const onResetAll = () => {
  resetKeysToDefault(PROFILE_PRESET_KEYS);
  disarmConfirm(); // 确认行自己收掉（它内部会 emit）
};
// 配色 (accent color) + 玻璃透明度 (glass transparency) + 玻璃颜色 (glass base
// tint): applied instantly through applyEffects() (--we-accent /
// --we-glass-alpha / --we-surface-tint-light/dark), persisted so the settings page keeps
// its custom look across reloads.
const onAccent = (hex, live) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  commitLiveSetting("accent", hex, live);
};
// ── 全局 UI 配色（用户口径）────────────────────────────────────────
// 「UI 配色自定义」总开关：与 fontCustom 同形（默认关）。开启后「全局配色」不再生效、改由
// 五个元素键分别决定（面板那一行会被禁用，见 panel-tabs 的 renderAppearanceUiColorSection）。
const onToggleUiColorCustom = (v) => {
  setSetting("uiColorCustom", !!v);
  applyEffects();
  emit();
};
// 五个元素各自的颜色。⚠️ 空串 = **跟随「全局配色」**（不是"回宿主原生"）—— effects.js 里
// `selection[k] || selection.accent` 就是这条语义的实现处；面板的「跟随」按钮写空串。
const onUiColorElement = (field, hex, live) => {
  if (hex !== "" && !/^#[0-9a-f]{6}$/i.test(hex)) return;
  if (UI_COLOR_KEYS.indexOf(field) < 0) return; // 只认那五个键（渲染器传错名字时不静默写脏）
  commitLiveSetting(field, hex, live);
};
// #159②：玻璃颜色**内部永远是一对** `{light, dark}`（见 lib/settings-schema.js 的 readGlassColors）。
// 色板行只写"当前在设的那一侧"；开关关着时两侧写同一个色 —— 与颜色角色的 onThemeColor 同构。
// 读那一对用 `panelGlassPair`（家在 lib/settings-schema.js，ADR-0016 第二刀归位；**自带归一、不引用工厂作用域里的兄弟**，
// 因为 test/verify-scene-live.mjs 把 glass-panel.js 当真模块 import；这里不另存一份口径，
// 免得"读的一侧"和"画的一侧"漂开（走到这儿的值可能仍是标量：老预设定档直传 / 台架 selection）。
const onGlassColor = (mode, hex, live) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  const cur = panelGlassPair(selection);
  // 缺的那一侧用本次选的色补上 —— **绝不写半对**：半对在另一配色下会退化成兜底色，
  // 用户的观感就是"没染上"（readGlassColors 也会把它补回另一侧，但那要等下一次 sanitize）。
  const next = { light: cur.light || hex, dark: cur.dark || hex };
  if (selection.glassDarkSeparate === true) next[mode === "dark" ? "dark" : "light"] = hex;
  else { next.light = hex; next.dark = hex; }
  commitLiveSetting("glassColor", next, live);
};
// 「深色单独设置」开关（玻璃色那一行）：关掉时把两侧**收敛到浅色那一侧** —— 这就是"一个颜色
// 同时用于两套"的字面含义。不做收敛的话，关掉后深色还留着上一次的深色值，再打开会突然跳回旧值。
// 与 onThemeDarkSeparate（字体角色那一个）同构：开关本身不改任何渲染，只是面板的显隐 + 写入口径。
const onGlassDarkSeparate = (v) => {
  const on = v === true;
  setSetting("glassDarkSeparate", on);
  if (!on) {
    const cur = panelGlassPair(selection);
    const light = cur.light || cur.dark;
    if (light) setSetting("glassColor", { light, dark: light });
  }
  applyEffects(); emit();
};
const onGlassAlpha = (pct, live) =>
  commitLiveSetting("glassAlpha", clampNum(pct, ...schemaRange("glassAlpha"), DEFAULTS.glassAlpha), live);
// 玻璃保真度（默认 100 = 完整可读性红线）：唯一的「颜色 vs 可读」权衡旋钮，
// 数学入口在 effects.js 的 weClampSurfaceColor 第三参 + --we-glass-fidelity。
const onGlassFidelity = (pct, live) =>
  commitLiveSetting("glassFidelity", clampNum(pct, ...schemaRange("glassFidelity"), DEFAULTS.glassFidelity), live);
// 额外补雾化的选择器（#200）：值是一串 CSS 选择器（逗号 / 换行分隔，最多 8 条）。
// 消毒只走 settings-schema 的 sanitizeExtraGlassSelectors —— 读侧（sanitizeFromSchema）
// 与本模块生成侧（glass-extra.js）**共用同一份**判据，所以用户敲到一半的非法串既不会进
// 规则、也不会被"修剪"成另一个选择器。**不做防抖**：只有清单真的变了才会重写 <style>
// （glass-extra 里那句内容比对），且一次只写一条文本节点，代价与拖滑杆同量级。
const onGlassSurfacePolicy = (id, policy) => {
  if (!["left-sidebar", "right-sidebar", "settings-window", "content", "declared", "extra"].includes(id)
    || !["auto", "native"].includes(policy)) return;
  setSetting("glassSurfacePolicy", { ...selection.glassSurfacePolicy, [id]: policy });
  applyEffects(); emit();
};
const onExtraGlassSelectors = (text) => {
  setSetting("extraGlassSelectors", text == null ? "" : String(text));
  applyEffects();
  emit();
};
// 对话栏玻璃保真度（默认 100）：独立于全局的第二把尺子，只作用对话栏玻璃面
// （气泡 / 输入卡片 / 对话内 markdown 家族 —— styles.js 消费 --we-chat-readability-*）。
const onChatGlassFidelity = (pct, live) =>
  commitLiveSetting("chatGlassFidelity", clampNum(pct, ...schemaRange("chatGlassFidelity"), DEFAULTS.chatGlassFidelity), live);
// 主题随壁纸（**默认关**）：开关本身只写设置；**打开时**立刻按当前壁纸补判一次，
// 不等下一次换壁纸（补判走与换壁纸同一条入口；关时那条入口整体空转，不写主题）。
const onToggleThemeFollow = (v) => {
  setSetting("themeFollow", !!v); themeFollowOnWallpaper(selection); emit();
};

// ── 字体 / 主题处理器 + 三个 ctx 构造器 ──────────────────────────────────────
// 它们只读模块级单例 `selection`、只调模块级函数（setFontValues / applyEffects / emit /
// ensureSystemFonts / fontset-store 与 preset-store 一族），**不需要组件作用域** ——
// 声明在模块级即可，不必随每次渲染重建一份（身份会变）。
// 与上面「播放控制处理器」「外观 / 画面处理器」两段同源：渲染器只读值 + 调这些。
/**
 * 新集的**默认名字**（面板不再让用户先取名 —— 名字之后随时能用「重命名」改）：
 * 「我的字体集」/「我的字体集 2」… 取第一个没被占用的后缀。**确定性**（同样的清单给同样的名字），
 * 因此可以当判据断言；碰撞只可能发生在 999 个同名前缀之后，那时退回时间戳。
 */
function nextFontSetName() {
  const base = weT("我的字体集");
  const taken = new Set((selection.fontSets || []).map((r) => r && r.name).filter(Boolean));
  if (!taken.has(base)) return base;
  for (let i = 2; i <= 999; i++) {
    const name = base + " " + i;
    if (!taken.has(name)) return name;
  }
  return base + " " + Date.now().toString(36);
}

// ── 字体集编辑器的一屏：**显式 ctx**，面板完全不碰 selection ──────
// 各字段的含义见 packages/fonts/src/fontset-editor.js 的文件头。这里只做三件事：状态从 selection 取、
// 动作用 fontset-store 发、完事 emit()。（删除的 confirm 门控在**面板**里 —— 问那一句的地方
// 就是按钮那儿，与轮换列表 / 移除自定义壁纸同形。）
function fontSetCtx() {
  const rowOf = (id) => (selection.fontSets || []).find((r) => r && r.id === id) || { id };
  const done = () => { setTransient("fontSetLoading", false); emit(); };
  const busy = (promise) => { setTransient("fontSetLoading", true); emit(); promise.then(done, done); };
  return {
    open: selection.fontSetOpen === true,
    onOpen: (v) => {
      setTransient("fontSetOpen", v === true);
      if (selection.fontSetOpen) busy(refreshFontSets()); // 打开就拉一次清单（来源永远是宿主）
      else disarmConfirm(); // 收起子分支 ⇒ 待确认状态一起清掉（不变量 3）
    },
    fontSets: selection.fontSets,
    activeId: selection.fontSetActive,
    // 「使用中」的判据是**值仍然一致**，不是"宿主指针指着它"：手动改过字体值 ⇒ 标记让位给「已改」。
    // 注意 `activeId` 仍按指针给 —— 能力判定（活动集不可删、先切走）必须与宿主一致，不能受漂移影响。
    inUseId: fontSetDrifted() ? "" : selection.fontSetActive,
    loading: selection.fontSetLoading === true,
    error: selection.fontSetError,
    editingId: selection.fontSetEditing,
    draftName: selection.fontSetDraftName,
    armedId: armedIdOf("fontset"),
    exportUrl: (id) => exportFontSetUrl(id),
    onImport: (file) => busy(importFontSet(file)),
    onActivate: (id) => busy(activateFontSet(id)),
    onRefresh: () => busy(refreshFontSets()),
    onDelete: (id) => { disarmConfirm(); busy(deleteFontSet(id)); },
    // 删除的**面板内确认**：走与轮播列表 / 移除自定义画面同一套令牌（`armConfirm`）。
    // 第一下只"待确认"，点问句行里的「确认」才发请求。
    onArm: (id) => armConfirm("fontset:" + id),
    onDisarm: () => disarmConfirm(),
    onEdit: (id) => {
      setTransient("fontSetEditing", id);
      setTransient("fontSetDraftName", rowOf(id).name || "");
      emit();
    },
    onDraftName: (v) => { setTransient("fontSetDraftName", String(v == null ? "" : v)); emit(); },
    onRenameCommit: (id) => busy(renameFontSet(id, selection.fontSetDraftName).then((ok) => {
      if (ok) { setTransient("fontSetEditing", ""); setTransient("fontSetDraftName", ""); }
    })),
    onCancelEdit: () => { setTransient("fontSetEditing", ""); setTransient("fontSetDraftName", ""); emit(); },
    // 先把挂起的编辑落地（否则新集可能拿到旧值），再以**当前外观**建一份并切过去。
    // 名字由 `nextFontSetName()` 生成（面板不问；行内「重命名」随时可改）。
    onCreate: () => busy(flushFontSetNow()
      .then(() => createFontSet(nextFontSetName()))
      .then(() => { emit(); })),
  };
}

// ── 玻璃预设的接线（渲染器只读 ctx、动作经 on*；store 与失败语义见 src/preset-store.js）──
// 与 fontSetCtx 同形：清单/错误是宿主投影，busy 是在途标记，删除走 armConfirm 两步确认。
// 应用预设会**整机快照覆盖**（settings 段 + 勾选的资产段）⇒ 动作前先清掉挂着的删除确认
//（上下文切换必清，同字体集）。
/**
 * 保存对话框的**资产可用位 + 默认勾**（ADR-0011 D4，三态）：
 *   · 默认勾：字体；
 *   · available = 本机现在**有**那份资产 —— **只决定提示文案**（勾上是"带过去"还是"声明无"），
 *     **不再禁用开关、也不再把勾选钳成 false**（那样用户就没法声明"这一族是无"）：
 *     字体段的可带判据 = 活动字体集至少改过一个颜色角色（全默认的字体集没有个性）。
 * 纯函数、零副作用：调用点（打开保存对话框时）把产物经 setTransient 存进 glassPresetAssetChecks。
 */
function presetAssetChecksNow() {
  const fontValues = (() => {
    const out = {};
    for (const key of FONTSET_KEYS) out[key] = selection[key];
    return sanitizeFontset(out);
  })();
  const fontAvailable = Boolean(fontValues.themeColors
    && typeof fontValues.themeColors === "object"
    && Object.keys(fontValues.themeColors).length > 0);
  const prev = (selection.glassPresetAssetChecks && typeof selection.glassPresetAssetChecks === "object")
    ? selection.glassPresetAssetChecks : {};
  return {
    // 用户上一轮的勾选保留（重开对话框不丢他的选择）；available 位每次现算，**只决定提示文案**。
    // ⚠️ 勾选**不再**被 available 钳住：勾上 = "按本机现状声明这一族" —— 本机没有
    //    字体 ⇒ 宿主落 `null`（**显式声明「无」**，套用它的人回到内置），这是用户有权做的声明；
    //    不勾 = 不动对方。旧版把勾选钳成 false + 行禁用 ⇒ 用户自存预设永远无法声明「无」。
    font: prev.font !== false,
    fontAvailable,
  };
}

function glassPresetCtx() {
  const done = () => { setTransient("glassPresetBusy", false); emit(); };
  const busy = (promise) => { setTransient("glassPresetBusy", true); emit(); promise.then(done, done); };
  // 待确认的动作（应用 / 真保存 / 导入 / 删除）共用 busy；错误行由 store 内部的
  // setPresetError 收口。
  return {
    presets: selection.glassPresets,
    loading: selection.glassPresetBusy === true,
    error: selection.glassPresetError,
    note: selection.glassPresetNote,
    saving: selection.glassPresetSaving === true,
    // 对话框用途："save"（存进预设栏）/ "export"（导出为文件）/ ""（关着）。
    // 渲染器据此画名字行 + 勾选 +「保存预设」，或只画勾选 +「下载 .json」。
    saveTarget: selection.glassPresetSaveTarget,
    // 导出的目标预设 id（对话框里那个下拉的当前值）。与 saveTarget 同住一个瞬态字段组：
    // 保存用 ""，导出用"选中的那一份"。
    exportTargetId: selection.glassPresetTargetId,
    draftName: selection.glassPresetDraftName,
    armedId: armedIdOf("gpreset"),
    assetChecks: selection.glassPresetAssetChecks,
    // 勾选/取消只改视图态 —— 真正的名单在「保存预设」那一下才交给 store。
    onAssetToggle: (kind, on) => {
      const next = Object.assign({}, selection.glassPresetAssetChecks);
      next[kind] = on === true;
      setTransient("glassPresetAssetChecks", next);
      emit();
    },
    onApply: (id) => {
      disarmConfirm();
      busy(applyPreset(id));
    },
    onOpenSave: () => {
      setTransient("glassPresetSaving", true);
      setTransient("glassPresetSaveTarget", "save");
      setTransient("glassPresetTargetId", "");
      setTransient("glassPresetDraftName", "");
      setTransient("glassPresetError", "");
      setTransient("glassPresetNote", "");
      // 可用位在打开对话框那一刻现算（字体集/立绘/头像可能刚被改过）。
      setTransient("glassPresetAssetChecks", presetAssetChecksNow());
      disarmConfirm();
      emit();
    },
    // 导出（ADR-0011 D7 + 用户口径）：入口**独立成一行**（网格下方与
    // 保存 / 导入并列），不再逐格挂键 —— 所以这里不再收 id，默认选中清单里
    // **第一份读得出来的**（broken 的没有可导出的正文，宿主对它 422）。
    // 仍是"先弹同一组资产勾选对话框，确认后才发起下载"。
    onOpenExport: () => {
      const first = (Array.isArray(selection.glassPresets) ? selection.glassPresets : [])
        .find((r) => !r.broken);
      setTransient("glassPresetSaving", true);
      setTransient("glassPresetSaveTarget", "export");
      setTransient("glassPresetTargetId", first ? first.id : "");
      setTransient("glassPresetError", "");
      setTransient("glassPresetNote", "");
      // 可用位在这里现算，但**勾选默认重置**成 D4 默认值：导出的对象是"那一份预设"，
      // 不是当前 selection —— 沿用上一轮为"保存"勾过的状态反而容易带错东西。
      setTransient("glassPresetAssetChecks", Object.assign(presetAssetChecksNow(), { font: true }));
      disarmConfirm();
      emit();
    },
    // 换"导出哪一份"：只改目标 id。资产勾选与可用位**不动** —— 可用位回答的是
    // "本机现在有没有这份资产"，与选中的是哪一份预设无关。
    onExportTargetChange: (id) => {
      setTransient("glassPresetTargetId", String(id == null ? "" : id));
      emit();
    },
    // 导出的确认步：普通链接导航（宿主带 Content-Disposition: attachment 应答）——
    // 不引入 blob / showSaveFilePicker / window.confirm。勾选名单走 ?assets= 查询参数。
    onExportCommit: () => {
      const id = selection.glassPresetTargetId;
      if (!isGlassPresetId(id)) return;
      const checks = selection.glassPresetAssetChecks || {};
      const embeds = ["font"].filter((k) => checks[k] === true);
      setTransient("glassPresetSaving", false);
      setTransient("glassPresetSaveTarget", "");
      setTransient("glassPresetTargetId", "");
      emit();
      const a = document.createElement("a");
      a.href = exportGlassPresetUrl(id, embeds);
      a.download = id + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    onDraftName: (v) => { setTransient("glassPresetDraftName", String(v == null ? "" : v)); emit(); },
    // 对话框第一步的「下一步」/ 名字框里的 Enter：只做最小校验（名字非空 ——
    // 空名字在保存时也会被 store 拦，但提前拦能让错误行贴着输入框出现）。
    onSaveCommit: () => {
      if (!String(selection.glassPresetDraftName || "").trim()) {
        setPresetError(weT("先给预设起个名字"));
        return;
      }
      emit();
    },
    // 对话框第二步的「保存预设」：勾选名单此刻才交给 store（saveGlassPreset 内部会做
    // 资产前置校验 —— 勾了但本机没有的组合给可判定原因）。成功后收起对话框。
    onSaveCommit2: () => {
      const checks = selection.glassPresetAssetChecks || {};
      const embeds = ["font"].filter((k) => checks[k] === true);
      busy(saveGlassPreset(selection.glassPresetDraftName, embeds).then((id) => {
        if (id) { setTransient("glassPresetSaving", false); setTransient("glassPresetDraftName", ""); }
        emit(); // 收起输入行的分支写完 store 必须通知（渲染纪律判据）
      }));
    },
    onCancelSave: () => {
      setTransient("glassPresetSaving", false);
      setTransient("glassPresetSaveTarget", "");
      setTransient("glassPresetTargetId", "");
      setTransient("glassPresetDraftName", "");
      emit();
    },
    onArmDelete: (id) => armConfirm("gpreset:" + id),
    onDisarm: () => disarmConfirm(),
    onDelete: (id) => { disarmConfirm(); busy(deleteGlassPreset(id)); },
    // 导出对话框的确认步在上面（onExportCommit —— 普通链接，宿主附件应答）。
    onImportFile: (file) => { disarmConfirm(); busy(importGlassPreset(file)); },
  };
}

// 角色色。默认「单色」—— 一个色同时写进 light/dark 两套（内部始终存两套，
// 因为令牌服务的值必须是 {light,dark} 对，缺一套在另一套配色下会不可读）。
// G4 字族（角色级）：空 = 回官方字族。存**族键**（CSS 栈由 fontFamilyStack 在模块侧解析）。
const onThemeFamily = (role, key) => {
  const next = Object.assign({}, selection.themeFamily);
  if (!key) delete next[role];
  else next[role] = key;
  setFontValues({ themeFamily: next }); applyEffects(); emit();
};

// **全局字族**：空 = 跟随 DSH。它是**默认**而不是强制 —— 角色级（themeFamily）与组件级
// （componentFonts）写在它上面（见 src/font/typography.js 的 buildTypePayload：
// 「该角色自己设了就用它，否则用全局」），DSH 的字族层次不会被压平。
// 值是族键（内置键或 `sys:` 键），消毒走共享内核 —— 与本机字体清单同一条值域。
const onGlobalFamily = (key) => {
  setFontValues({ globalFamily: sanitizeFamilyKey(key) });
  applyEffects(); emit();
};

// 面板上的「重新扫描」：跳过 TTL 再要一次本机字体清单（用户刚装完字体时的出路）。
const onRefreshSystemFonts = () => { ensureSystemFonts(true); };

// F2/G4 字号（角色级，**绝对值**）：空 = 用 DSH 官方值（角色表的 defaultPx 即面板显示的默认）。
const onThemeSize = (role, raw) => {
  const next = Object.assign({}, selection.themeSize);
  const num = raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(num)) delete next[role];
  else next[role] = Math.round(num);
  setFontValues({ themeSize: next }); applyEffects(); emit();
};

// G4 字重（角色级）：空/0 = 回官方字重（组合式里的字面量前缀）。
const onThemeWeight = (role, raw) => {
  const next = Object.assign({}, selection.themeWeight);
  const num = raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(num)) delete next[role];
  else next[role] = Math.round(num);
  setFontValues({ themeWeight: next }); applyEffects(); emit();
};

// G3/G4：组件级字体。空/删键 = 回官方值（**官方值作初始值**）。
const onComponentFont = (prefix, prop, raw) => {
  const next = Object.assign({}, selection.componentFonts);
  const one = Object.assign({}, next[prefix]);
  const num = raw === "" ? NaN : Number(raw);
  if (!Number.isFinite(num)) delete one[prop];
  else one[prop] = Math.round(num);
  if (Object.keys(one).length) next[prefix] = one;
  else delete next[prefix];
  setFontValues({ componentFonts: next }); applyEffects(); emit();
};

const onThemeColor = (role, mode, hex, separate) => {
  const cur = selection.themeColors[role] || { light: "", dark: "" };
  const next = { light: cur.light || "", dark: cur.dark || "" };
  if (separate) next[mode] = hex;
  else { next.light = hex; next.dark = hex; }
  // ⚠️ 深浅分开只填一边 ⇒ 另一侧留空 = **半对**。半对过不了任何一层消毒
  //（readThemeColors / buildTokenPayload 都是"缺一套整角色丢弃"）⇒ 颜色**落不了盘、
  // 也不会生效**，面板却显示着已选 —— 用户重启后看到的就是"保存的颜色没了"（实测反馈）。
  // 补齐规则：另一侧 = 当前官方色（主题服务不可达时退回同色，与"没分开时两态同色"
  // 的既有语义一致）—— pair 永远完整，不落消毒黑洞。
  if (separate) {
    const other = mode === "light" ? "dark" : "light";
    if (!next[other]) {
      const tokens = (THEME_COLOR_ROLES.find((r) => r.id === role) || {}).tokens;
      next[other] = (tokens && officialColorOf(tokens)) || hex;
    }
  }
  setFontValues({ themeColors: Object.assign({}, selection.themeColors, { [role]: next }) }); applyEffects(); emit();
};
const onThemeColorClear = (role) => {
  const next = Object.assign({}, selection.themeColors);
  delete next[role];
  setFontValues({ themeColors: next }); applyEffects(); emit();
};
// 视图开关（defaults-only，不持久化）：只列调过的角色，便于收尾核对。
const onThemeTypeOnly = (v) => {
  setTransient("themeTypeOnly", v);
  emit();
};

const onThemeDarkSeparate = (v) => {
  setFontValues({ themeDarkSeparate: v }); applyEffects(); emit();
};
// 颜色角色的「当前 DSH 默认值」：宿主墨色快照（snapshotHostFontDefaults 写在 documentElement
// 上）转为 #rrggbb 供 <input type="color"> 用。取不到就返回空串 —— 面板会退回显示"跟随"，
// 不影响覆盖能力。这样色块本身显示的就是当前实际生效的颜色，而不是占位字样。
const toHexColor = (v) => {
  const s = String(v || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  const m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return "";
  const h = (n) => Number(n).toString(16).padStart(2, "0");
  return "#" + h(m[1]) + h(m[2]) + h(m[3]);
};
const officialColorOf = (tokens) => {
  try {
    const es = document.documentElement.style;
    for (const t of tokens || []) {
      const hex = toHexColor(es.getPropertyValue("--we-host-" + t.slice(2)));
      if (hex) return hex;
    }
  } catch { /* ignore */ }
  return "";
};

// ── 在线图库（本 fork 新增）：接口地址 / 取图路径 / 压缩档 / 内网开关 + 拉取、测试、下载 ──
// ── 图库预设：默认**优先二次元/卡通**（用户口径），其余按需切换 ──
const GALLERY_PRESETS = [
  { id: 'lolicon', label: '二次元 · Lolicon（多张）', endpoint: 'https://api.lolicon.app/setu/v2?num=20&r18=0', format: 'auto', jsonPath: 'data[].urls.original' },
  { id: 'alcy', label: '二次元 · 樱道（随机单张）', endpoint: 'https://t.alcy.cc/pc', format: 'image', jsonPath: '' },
  { id: '360', label: '卡通 · 360 壁纸（动漫分类）', endpoint: 'http://wallpaper.apc.360.cn/index.php?c=WallPaper&a=getAppsByCategory&cid=26&start=0&count=20', format: 'json-list', jsonPath: '' },
  { id: 'bing', label: 'Bing 每日 8 张', endpoint: 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN', format: 'json-list', jsonPath: 'images[].url' },
  { id: 'picsum', label: 'Picsum 随机 30 张', endpoint: 'https://picsum.photos/v2/list?page=1&limit=30', format: 'auto', jsonPath: '' },
];
const onGalleryPreset = (id) => {
  const p = GALLERY_PRESETS.find((x) => x.id === id);
  if (!p) return;
  setSetting('galleryEndpoint', p.endpoint);
  setSetting('galleryFormat', p.format);
  setSetting('galleryJsonPath', p.jsonPath);
  emit();
};

const onGalleryEndpoint = (e) => { setSetting('galleryEndpoint', String((e && e.target && e.target.value) || '')); emit(); };
const onGalleryJsonPath = (e) => { setSetting('galleryJsonPath', String((e && e.target && e.target.value) || '')); emit(); };
const onGalleryCompress = (v) => { setSetting('galleryCompress', v === 'lossless' ? 'lossless' : (v === 'off' ? 'off' : 'lossy')); emit(); };
const onGalleryAllowPrivate = (v) => { setSetting('galleryAllowPrivate', !!v); emit(); };
/** 缩略图走宿主代理（绕开 CORS / 防盗链）；内网开关要一起带上。 */
function galleryThumbUrl(url) {
  return apiUrl('/gallery/thumb?url=' + encodeURIComponent(String(url || '')) + (selection.galleryAllowPrivate ? '&allowPrivate=1' : ''));
}
function galleryFail(message) { setTransient('galleryError', String(message || '')); setTransient('galleryBusy', false); emit(); }
async function onGalleryProbe() {
  const endpoint = String(selection.galleryEndpoint || '').trim();
  if (!endpoint) return;
  setTransient('galleryBusy', true); setTransient('galleryError', ''); setTransient('galleryNote', ''); emit();
  try {
    const res = await apiFetch(apiUrl('/gallery/probe?url=' + encodeURIComponent(endpoint) + (selection.galleryAllowPrivate ? '&allowPrivate=1' : '')), { parse: 'always' });
    if (res.ok && res.data) {
      setTransient('galleryNote', weT('接口可用') + ' · HTTP ' + res.data.status + ' · ' + String(res.data.contentType || '?') + ' · ' + res.data.bytes + ' B');
      setTransient('galleryBusy', false); emit();
    } else galleryFail((res.data && res.data.error) || ('HTTP ' + res.status));
  } catch (err) { galleryFail(err && err.message ? err.message : err); }
}
async function onGalleryFetch() {
  const endpoint = String(selection.galleryEndpoint || '').trim();
  if (!endpoint) return;
  setTransient('galleryBusy', true); setTransient('galleryError', ''); setTransient('galleryNote', ''); setTransient('galleryResult', null); emit();
  try {
    const res = await apiPostJson(apiUrl('/gallery/preview'), {
      endpoint,
      format: selection.galleryFormat || 'auto',
      jsonPath: selection.galleryJsonPath || '',
      headers: selection.galleryHeaders || '',
      count: 24,
      allowPrivate: selection.galleryAllowPrivate === true,
    });
    if (res.ok && res.data && Array.isArray(res.data.items)) {
      setTransient('galleryItems', res.data.items);
      setTransient('gallerySel', []);
      setTransient('galleryNote', weT('拉到 {n} 张').replace('{n}', String(res.data.items.length)));
      setTransient('galleryBusy', false); emit();
    } else galleryFail((res.data && res.data.error) || ('HTTP ' + res.status));
  } catch (err) { galleryFail(err && err.message ? err.message : err); }
}
function onGalleryToggle(url) {
  const cur = Array.isArray(selection.gallerySel) ? selection.gallerySel.slice() : [];
  const i = cur.indexOf(url);
  if (i >= 0) cur.splice(i, 1); else cur.push(url);
  setTransient('gallerySel', cur); emit();
}
function onGallerySelectAll(on) {
  const all = (Array.isArray(selection.galleryItems) ? selection.galleryItems : []).map((it) => it && it.url).filter(Boolean);
  setTransient('gallerySel', on ? all : []); emit();
}
async function onGalleryDownload() {
  const items = Array.isArray(selection.gallerySel) ? selection.gallerySel.slice() : [];
  if (items.length === 0) return;
  setTransient('galleryBusy', true); setTransient('galleryError', ''); emit();
  try {
    const res = await apiPostJson(apiUrl('/gallery/download'), {
      items,
      compress: selection.galleryCompress || 'lossy',
      allowPrivate: selection.galleryAllowPrivate === true,
    });
    if (res.ok && res.data) {
      setTransient('galleryResult', res.data);
      setTransient('gallerySel', []);
      setTransient('galleryBusy', false); emit();
      loadInventory().catch(() => { /* 失败保持现状 */ });
    } else galleryFail((res.data && res.data.error) || ('HTTP ' + res.status));
  } catch (err) { galleryFail(err && err.message ? err.message : err); }
}

// 字体自定义：总开关 + 颜色/字重/字体族，各项立即生效并持久化。
// 打开开关时**顺手**去要一次本机字体清单（宿主那次扫描很贵，只在用户真的进这一区时才发生；
// 清单本身不参与字体值，拿不到也不影响任何别的功能 —— 见 src/system-fonts.js）。
const onToggleFontCustom = (v) => {
  setSetting("fontCustom", !!v); applyEffects(); emit();
  if (v) ensureSystemFonts(false);
};

// 全局字重与全局字体族都已移除：字重/字族都按角色与按组件细化（见 src/font/）。
// 「高级字体设置」视图开关（defaults-only，不持久化）。
const onFontAdvanced = (v) => {
  setTransient("fontAdvanced", v);
  emit();
};

// 组件字体族：存 **族键**（内置键或 `sys:<本机字体>`），解析成 CSS 栈是 apply 那一侧的事
// （components.js 的 buildComponentCss / buildDslBlocks 经 resolveFamily 拿栈）。
// ⚠️ 另一种历史值是**解析后的栈**（fontFamilyStack）—— 解析侧照样认，故老字体集不必迁移；
//    "选中项反查"两种形态都能处理（fontFamilyKeyOf）。
const onComponentFamily = (prefix, key) => {
  const next = Object.assign({}, selection.componentFonts);
  const one = Object.assign({}, next[prefix]);
  const family = sanitizeFamilyValue(key);
  if (!family) delete one.family;
  else one.family = family;
  if (Object.keys(one).length) next[prefix] = one;
  else delete next[prefix];
  setFontValues({ componentFonts: next }); applyEffects(); emit();
};

// 「恢复默认」：所有字体自定义项清回 DSH 默认值（空 = 不覆盖；字体族回跟随）。
// 这些容器 + themeDarkSeparate + globalFamily 是**字体集正文**的键 ⇒ 整批赋值后走
// persistFontSet()（它们已不在 settings 白名单里，`setSetting` 那条通道不会把它们写出去）。
// ⚠️ 这是字体键**唯一**允许出现字面直写的地方（逐键走 `setFontValues` 会发一整串 PUT）；
//    判据：`verify-fontset` ⑦ 的字面直写棘轮 —— 别处的直写会让它变红。
const onFontResetAll = () => {
  selection.themeColors = {};
  selection.themeSize = {};
  selection.themeWeight = {};
  selection.themeFamily = {};
  selection.globalFamily = "";
  selection.componentFonts = {};
  selection.themeDarkSeparate = false;
  // 「只看改过的」是**视图**状态，不归"恢复默认"管：它清的是字体值，不该顺手把用户选的筛选
  // 也翻掉（那会让"恢复默认"改掉界面的看法）。判据钉住这一点。
  persistFontSet();
  // `fontAdvanced` 是**仅默认值**键（不在持久化白名单里）⇒ 走**瞬态**入口。走 `setSetting` 会顺手
  // `persistSelection()`，把一个永远不会被写出去的键送进 debounce 队列 —— 白跑一次宿主 PUT。
  // 判据：`verify-client` ⑤d ①c（DEFAULTS_ONLY 键不得经落盘通道写，键集从 schema 派生）。
  setTransient("fontAdvanced", false); applyEffects(); emit();
};

// ── 壁纸库 / 库视图处理器 ────────────────────────────────────────────────────
const onRefresh = () => loadInventory();
// Filter changes: persist + re-validate so wallpapers outside the selected
// categories drop out of the grid/rotation immediately.
// 内容分级是**多档勾选**（v7 起值是数组）：切某一档 = 往集合里加/删，且不允许把最后一档
// 取消（一个都不勾等于全库空白，用户只会以为坏了）。
const onRatingFilterToggle = (tier, on) => {
  const cur = Array.isArray(selection.contentRatingFilter) ? selection.contentRatingFilter : [];
  const next = RATING_TIERS.filter((t) => (t === tier ? on : cur.indexOf(t) !== -1));
  if (!next.length) return;
  setSetting("contentRatingFilter", next);
  revalidateSelection();
};
// 类型筛选也是**多档勾选**（v8 起值是数组，与内容分级同款）：不允许取消最后一档
//（一个都不勾等于网格空白）。类型只筛列表与「下一张」候选，不拦正在播的壁纸。
const onTypeFilterToggle = (tier, on) => {
  const cur = Array.isArray(selection.typeFilter) ? selection.typeFilter : [];
  const next = TYPE_TIERS.filter((t) => (t === tier ? on : cur.indexOf(t) !== -1));
  if (!next.length) return;
  setSetting("typeFilter", next);
  revalidateSelection();
};
// Card style: classic (CD-rack) vs fixed (overlap-proof).
const onLayoutChange = (value) => {
  setSetting("pickerLayout", value);
  emit();
};
// Edge 兼容渲染开关：关闭后任何浏览器都走原生 <video>。改的是渲染模式，
// syncLayers 的 wantKey 已并入模式，emit 会重建壁纸层并立即按新路径生效。
const onEdgeCompatChange = (checked) => {
  setSetting("edgeCompat", checked);
  emit();
};
// Per-group interval: writes straight into the active group so each rotation
// list keeps its own switch cadence.
function onGroupInterval(e) {
  const group = activeRotationGroup();
  if (!group) return;
  group.interval = clampNum(Number(e.target.value), ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX, DEFAULTS.rotationInterval);
  persistSelection();
  syncRotationTimer();
  emit();
};
/**
 * 轮播推进方式（「按间隔」/「当前视频播完就换」）。写进**当前列表**（与 interval 同口径：
 * 每个列表记自己的节奏），然后重排计时器 —— 视频结束档要在建层时关掉 loop，而已经上屏
 * 的那一层不会自己变，所以这里额外触发一次层同步。
 */
const onGroupTrigger = (e) => {
  const group = activeRotationGroup();
  if (!group) return;
  group.trigger = e.target.value === "videoEnd" ? "videoEnd" : "interval";
  persistSelection();
  syncRotationTimer();
  // 已经上屏的视频层要跟着换 loop 语义（否则"切到视频结束档"要等下一次换壁纸才生效）。
  const layer = typeof document !== "undefined" && document.getElementById ? document.getElementById(LAYER_ID) : null;
  const media = layer && typeof layer.querySelector === "function" ? layer.querySelector("video") : null;
  if (media && "loop" in media) {
    try { media.loop = group.trigger !== "videoEnd"; } catch { /* ignore */ }
  }
  emit();
};
// 图内过场周期（图片 / 幻灯片壁纸内部多张图之间的切换间隔）。单位是**秒**，0 = 跟随 WE
// 项目里声明的 `imageswitchtimes`；与 rotationInterval（壁纸之间、分钟）是两件事。
// 改完原地重装过场层：图片档的层键只有 type+url，改设置不会触发 syncLayers 重建。
const onPictureSlideSeconds = (e) => {
  const seconds = clampNum(Number(e.target.value), ...schemaRange("pictureSlideSeconds"), DEFAULTS.pictureSlideSeconds);
  setSetting("pictureSlideSeconds", seconds);
  if (selection.type === "image") refreshImageSlideshow(selection);
  emit();
};
// 「删除」按钮**只置令牌**；真正的删除在问句行的「确认」里（不变量 2）。两件事分开的
// 好处：守卫可以分别断言"第一下不删"与"确认才删"，而不是只验一个 if。
const onArmDeleteGroup = () => {
  const group = activeRotationGroup();
  if (!group) return;
  armConfirm("group:" + group.id);
};
const onDeleteGroup = () => {
  const group = activeRotationGroup();
  if (!group) return;
  disarmConfirm();
  deleteGroup(group.id);
};

// 切换过场（类型 / 方向 / 速度）：只写选择 —— 下一次换壁纸（手动点选或轮换提交）
// 生效，不需要重建当前层。
const onSwitchTransition = (id) => {
  if (!SWITCH_TRANSITION_VALUES.includes(id)) return;
  setSetting("switchTransition", id); emit();
};
const onSwitchTransitionDir = (dir) => {
  if (!SWITCH_DIRS.includes(dir)) return;
  setSetting("switchTransitionDir", dir); emit();
};
const onSwitchTransitionSpeed = (id) => {
  if (!SWITCH_SPEED_VALUES.includes(id)) return;
  setSetting("switchTransitionSpeed", id); emit();
};
// 当前 live 渲染页的 iframe（面板「重新截」的抓帧源）。
// livePointerFrame 由 syncLayers 每次挂上 live 层时更新；切到非 live 壁纸后它可能
// 仍指向已移除的旧元素，所以再用 DOM 查一次兜底。
const currentLiveFrame = () => {
  const ref = livePointerFrame;
  if (ref && (!("isConnected" in ref) || ref.isConnected)) return ref;
  try {
    const node = document.getElementById(LAYER_ID);
    const f = node && typeof node.querySelector === "function" ? node.querySelector("iframe.we-live-iframe") : null;
    if (f) return f;
  } catch { /* ignore */ }
  return null;
};

// 自定义画面（截屏导入）：从 WE 等处截图后导入，成为该壁纸的「自定义画面」档
// （?v=4）显示源。
const setCustomFrameLocal = (wid, on) => {
  const m = Object.assign({}, selection.customFrames || {});
  if (on) m[wid] = true; else delete m[wid];
  selection.customFrames = m;
};

// Close the picker library view (ESC / 返回 button share this path).
const closePicker = () => {
  // 关库视图 ⇒ 清掉待确认（不变量 3）：否则重新打开时会看到一个针对上次那个对象的问句。
  disarmConfirm();
  setTransient("pickerOpen", false);
  setTransient("pickerDraft", false);
  setTransient("batchMode", false);
  setTransient("batchSelected", []);
  emit();
  // Focus restore: return focus to the「选择壁纸」button that opened the
  // view (WCAG focus management).
  if (pickerOpener && pickerOpener.isConnected) {
    try { pickerOpener.focus(); } catch { /* ignore */ }
  }
};

const INTERVALS = [1, 5, 10, 30, 60, 120];

// ── Pagination row: big libraries must not render every card at once (hundreds
//    of thumbnails per emit make the picker lag). The slicing itself is the
//    model's (`pageSlice` in src/picker-model.js); 这里只画「上一页 / 下一页」。──
const pagerRow = (count, page, pages, onPrev, onNext) =>
  React.createElement("div", { className: "we-picker__pager" },
    React.createElement("span", { className: "we-picker__hint" },
      weT("共 {count} 个 · 第 {page} / {pages} 页", { count, page: page + 1, pages })),
    React.createElement("button", {
      className: "we-picker__btn", type: "button",
      disabled: page <= 0,
      onClick: onPrev,
    }, weT("‹ 上一页")),
    React.createElement("button", {
      className: "we-picker__btn", type: "button",
      disabled: page >= pages - 1,
      onClick: onNext,
    }, weT("下一页 ›")),
  );

// ── 模态框交互的接线 ───────────────────────────────────────────────────────
// 契约：渲染器（`src/picker-modal.js`）**不写 `selection`、不自己发通知** ⇒
// 「改状态 + 发通知」的动作一律留在这里（模块级），经 `ctx` 交给渲染器；标记里只剩
// `onClick: onShowNormalView` 这样的引用。判据是接缝那几条（同 `panel-tabs` / 属性面板口径）。
const onShowNormalView = () => { disarmConfirm(); setTransient("modalView", "normal"); emit(); };
const onShowHiddenView = () => { disarmConfirm(); setTransient("modalView", "hidden"); setTransient("batchMode", false); setTransient("batchSelected", []); emit(); };
const onToggleBatchMode = () => { disarmConfirm(); setTransient("batchMode", !selection.batchMode); setTransient("batchSelected", []); emit(); };
// 「批量隐藏」按钮只置令牌；落地在问句行的「确认」（不变量 2）。
const onArmBatchHide = () => armConfirm("batchHide");
const onBatchHide = () => {
  disarmConfirm();
  hideWallpapers(selection.batchSelected.slice());
  setTransient("batchMode", false);
  setTransient("batchSelected", []);
  emit();
};
const onBatchCancel = () => { disarmConfirm(); setTransient("batchMode", false); setTransient("batchSelected", []); emit(); };
const onSearchInput = (e) => { setTransient("search", e.target.value); emit(); };
const onPickCard = (w) => {
  // 轮播编辑器的下钻（pickerDraft）：点卡片 = 加入/移出**草稿**，不切当前壁纸；
  // 草稿对象被就地增删（与 importPlaylistIntoDraft / 面板编辑器同一口径），
  // 「保存」时才由 saveEditingGroup 落盘。
  if (selection.pickerDraft && selection.editing) {
    const ids = selection.editing.wallpaperIds;
    const i = ids.indexOf(w.id);
    if (i >= 0) ids.splice(i, 1);
    else ids.push(w.id);
    emit();
    return;
  }
  if (selection.batchMode) {
    const i = selection.batchSelected.indexOf(w.id);
    if (i >= 0) selection.batchSelected.splice(i, 1);
    else selection.batchSelected.push(w.id);
    emit();
  } else {
    applySelection(w.id, { fromManual: true });
  }
};

function WallpaperPicker() {
  useWeLocale(); // 设置页壁纸库：语言切换 → 整棵选择器（含 render* 渲染器）重渲染
  const sel = useStore();
  // ── 组件行状态面（ADR-0013 D3②/D3③）──────────────────────────────────────
  // 宿主行状态（`/inventory` 的 `components`，透传见 loadInventory）在这里读**一次**，之后
  // 经 ctx 传进各渲染器（渲染器不得直接读 selection）；判定只有一处实现 —— 本文件的
  // `weComponentVisible`。可见页签表（D3① 的"页签安全"）另见 visiblePickerTabs。
  const components = sel.inventory && sel.inventory.components;
  const visibleTabs = visiblePickerTabs();
  // 视频类壁纸（原生视频 + 内嵌 MP4 场景）: 只有它们有
  // 「真实播放态」的概念。实时渲染（live iframe）形态必须排除在外：它没有
  // <video> 元素可回写真实状态，且 sceneVideo 在 live 形态下非空（降级备用），
  // 沿用视频类判定会让 playbackLive 恒为 videoPlaying=true —— 「暂停」后按钮
  // 永不变「播放」（实测）。
  const isLiveScene = (sel.type === "scene" || sel.type === "web") && liveRenderEnabled(sel);
  const isVideoLike = !isLiveScene && (sel.type === "video"
    || (sel.type === "scene" && Boolean(sel.sceneVideo)));
  // 卡片上显示/按钮用的播放态: 视频类壁纸以 <video> 元素的真实状态为准。
  // 意图为「播放」但元素被拒/解码失败时，面板必须说「已暂停」并把按钮显示成
  // 「播放」，否则用户面对一张冻住的壁纸却只有「暂停」可点 —— 没有「继续」。
  const playbackLive = isVideoLike ? sel.videoPlaying : sel.playing;
  // 播放/暂停 / 音轨 / 音量 / 关闭 / 轮播切换 / 换列表：处理器见「播放控制处理器」段
  //（快捷播放面板共用同一份实现）。

  // 画面滑块（暗化 / 壁纸透明度 / 壁纸模糊 / 亮度 / 对比度 / 饱和度）与外观细调
  //（配色 / 玻璃颜色 / 玻璃透明度 / 边框 / 雾化）：处理器见「外观 / 画面处理器」段
  //（快捷播放面板共用同一份实现）。
  // 主题随壁纸的开关处理器同「外观 / 画面处理器」段。

  // 出图来源：当前场景壁纸在「自动 ⇄ 自定义画面」之间切换（按壁纸记忆）。
  // 只有一档可切（没导入自定义画面）时**不动** —— 避免"点了没反应"。
  const onRefreshFrame = () => {
    if (sel.type !== "scene" || !sel.sceneFrameUrl) return;
    const wid = String(sel.id);
    const total = frameVariantCount(sel, wid);
    if (total < 2) return;
    // 推进**下标**、存**档位值**：值域有洞（0 与 4），取模会造出 1/2/3 这种退役档位。
    const cur = Number(sel.frameVariants && sel.frameVariants[wid]) || 0;
    const idx = Math.max(0, FRAME_VARIANTS.findIndex((f) => f.id === cur));
    const next = FRAME_VARIANTS[(idx + 1) % total].id;
    const map = Object.assign({}, selection.frameVariants || {});
    map[wid] = next;
    selection.frameVariants = map;
    // 切换作用于出图来源：把层切到该档的画面。
    setSetting("url", frameUrlWithVariant(sel.sceneFrameUrl, next)); syncLayers(); emit();
  };
  // 清除 GPU 抓帧缓存（<key>_gpu.png）：按用户决策 GPU 帧优先于全部档位，
  // 所以「切档位 / 换回 CPU 生成画面」的前置动作就是先删掉它。删除后立刻按
  // 当前档位重挂静态帧（scene-frame 响应带 no-store，重挂即重新取图）。
  const onClearGpuFrame = () => {
    if (sel.type !== "scene" || !sel.sceneFrameUrl || gpuFrameUi.busy) return;
    const wid = String(sel.id || "");
    const token = gpuFrameToken(sel.sceneFrameUrl);
    if (!wid || !token) return;
    gpuFrameUi.wid = wid;
    gpuFrameUi.busy = true;
    emit();
    // 清除 = 删主帧（单主帧语义）。这是共享资源：清掉后其他窗口在下一次回填点
    // 各自按自己的画布尺寸重抓——与旧单槽时代一致，用户显式点「清除」即此意。
    apiDelete("/scene-frame-cache/" + encodeURIComponent(token), { parse: true })
      .then((r) => {
        // 真·失败只有一种：宿主 500（unlink 被权限/占用挡住）。`removed:false`
        //（200）= 主帧本来就没有 —— 目标态已达成，按成功走：探测读数本来就说
        // 没有帧，两面一致。
        if (!r.ok) {
          gpuFrameUi.busy = false;
          gpuFrameUi.error = weT("清除失败：宿主返回 {status}", { status: r.status });
          emit();
          return;
        }
        gpuFrameUi.error = "";
        markGpuFrameProbed(wid, false);
        forgetGpuFramePin(token);
        // 请求期间用户可能已经切走：槽位状态属于发起时那张壁纸，URL 重写/渲染恢复
        // 只对「还是它」的情况做（同 A4 的身份校验；否则会把当前壁纸的 URL 改写成
        // 「当前帧 URL + 旧壁纸的档位」→ 画面与面板读数不一致）。
        if (String(selection.id || "") !== wid) { gpuFrameUi.busy = false; emit(); return; }
        gpuFrameUi.busy = false;
        const variant = Number(selection.frameVariants && selection.frameVariants[wid]) || 0;
        setSetting("url", frameUrlWithVariant(sel.sceneFrameUrl, variant)); syncLayers(); emit();
      })
      .catch(() => {
        gpuFrameUi.busy = false;
        gpuFrameUi.error = weT("清除失败：请求未完成");
        emit();
      });
  };
  // 「重新截」：实时渲染**开着时也要能用** —— GPU 实时帧就是切换途中 / live 首帧
  // 之前给用户看的那张静帧，构图或时机不对时（黑帧、旧视口、切走时那张）用户必须
  // 能立刻重抓，而不是先关掉实时渲染再回来。
  // 走的是自动回填那条同一条安全路径（先抓帧 + 内容门禁 → 成功后才清旧帧 → PUT），
  // 所以抓不到时**不会**把原来那张删掉；失败原因直接显示在面板上。
  const onRecaptureGpuFrame = () => {
    if (sel.type !== "scene" || !sel.sceneFrameUrl || gpuFrameUi.recapturing) return;
    const live = currentLiveFrame();
    if (!live) {
      gpuFrameUi.error = weT("拿不到实时画面（实时渲染没在运行）→ 想抓实时帧请先开「场景实时渲染」");
      emit();
      return;
    }
    gpuFrameUi.recapturing = true;
    gpuFrameUi.error = "";
    emit();
    // force：即使槽里已有 GPU 帧也重抓一张（用户显式要求换一张）。
    scheduleLiveFrameBackfill(live, { force: true });
  };
  const onCustomFrameFile = (e) => {
    const file = e.target.files && e.target.files[0];
    try { e.target.value = ""; } catch { /* ignore */ }
    if (!file || sel.type !== "scene" || !sel.id) return;
    const wid = String(sel.id);
    const ctype = (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")
      ? file.type : "image/png";
    apiFetch("/custom-frame/" + encodeURIComponent(wid), {
      method: "POST",
      headers: { "Content-Type": ctype },
      body: file,
    }).then((r) => {
      if (!r.ok) throw new Error("宿主返回 " + r.status);
      setCustomFrameLocal(wid, true);
      const map = Object.assign({}, selection.frameVariants || {});
      map[wid] = 4;
      selection.frameVariants = map;
      // 上传可能花掉秒级（截屏多 MB）：期间用户切走就只记账到发起时那张壁纸，
      // 不改当前壁纸的 URL（否则当前壁纸会被套上旧壁纸的档位 4）。
      if (String(selection.id || "") !== wid) { persistSelection(); emit(); return; }
      // 落盘只能挂在这条分支上（不能挂在下面那个 `if` 里）：`setSetting("url", …)` 只在有
      // `sceneFrameUrl` 时才发，而上面刚写的 `customFrames` / `frameVariants` 是**客户端持久化字段**
      // —— 漏掉 persist 就是"导入的自定义画面刷新后不见了"（同族缺陷的另一头）。
      if (sel.sceneFrameUrl) setSetting("url", frameUrlWithVariant(sel.sceneFrameUrl, 4));
      else persistSelection();
      syncLayers(); emit();
    }).catch(() => { /* 导入失败保持现状 */ });
  };
  const onClearCustomFrame = () => {
    if (!sel.id) return;
    const wid = String(sel.id);
    apiDelete("/custom-frame/" + encodeURIComponent(wid))
      .then((r) => {
        if (!r.ok) throw new Error("宿主返回 " + r.status);
        setCustomFrameLocal(wid, false);
        const map = Object.assign({}, selection.frameVariants || {});
        const cur = Number(map[wid]) || 0;
        if (cur === 4) map[wid] = 0;
        selection.frameVariants = map;
        if (String(selection.id || "") !== wid) { persistSelection(); emit(); return; }
        if (cur === 4 && sel.sceneFrameUrl) {
          setTransient("url", frameUrlWithVariant(sel.sceneFrameUrl, 0));
          syncLayers();
        }
        persistSelection(); emit();
      }).catch(() => { /* ignore */ });
  };

  // ESC anywhere closes the library view. Capture phase + stopPropagation so the
  // shell's own ESC handling (which may close the whole settings panel) never
  // sees the key while the view is open.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && selection.pickerOpen) {
        e.stopPropagation();
        closePicker();
      }
    };
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("keydown", onKey, true);
      return () => { window.removeEventListener("keydown", onKey, true); };
    }
  }, []);

  // ── 页签状态：调节面板分四个页签（壁纸库/外观/播放/系统），每份实例独立记忆（设置页与
  //    仓库抽屉互不影响）；只存 localStorage，不进 config.json。
  //    useState 必须在下方早退分支之前调用（Rules of Hooks）。 ──
  const [activeTab, setActiveTab] = React.useState(() => resolvePickerTab(readSavedPickerTab()));
  const switchTab = (id) => {
    // 校验走**可见页签表**（不是 PICKER_TABS）：子包浏览器半边缺席时被 gate 掉的页签不该再能被
    // 切进去（那正是"点进一块空面板"的来源）。
    if (!visibleTabs.some((t) => t.id === id) || id === activeTab) return;
    // 切页签 ⇒ 清掉待确认（不变量 3）：问句行随页签一起离屏，不能留着它等回来。
    disarmConfirm();
    // 下钻的库视图也随页签一起退出：否则切走再切回来，看到的还是库而不是该页内容。
    if (selection.pickerOpen) setTransient("pickerOpen", false);
    setTransient("pickerDraft", false);
    setActiveTab(id);
    try { localStorage.setItem(PICKER_TAB_KEY, id); } catch { /* ignore */ }
  };
  // 页签安全（ADR-0013 D3① + D-6(b)）：可见页签表变了（面板节注册表变化 / 组件行状态随
  // inventory 轮询回到本地）而当前页签不在表里 ⇒ 回落到第一个可见页签，自愈、不用用户自己点走。
  // 表为空（空表意味着一个页签都没有，理论不可达）时什么都不做 —— 绝不把 activeTab 设成空值。
  // deps 用 `[activeTab, components]`：`visibleTabs` 每次渲染都是新数组，拿它当依赖会每帧触发；
  // 而 `components` 只在 inventory 重新落地时换引用（`setTransient("inventory", next)`）。
  // 注册表变更是"只增"（子包浏览器半边求值时登记，没有反注册 API）⇒ 可见集只会变大，晚到的节
  // 最多让某页签从"缺席"变"可见"，不会把已选中的页签挤出表 ⇒ 不需要把注册表版本写进依赖。
  React.useEffect(() => {
    if (!visibleTabs.length || visibleTabs.some((t) => t.id === activeTab)) return;
    switchTab(visibleTabs[0].id);
  }, [activeTab, components]);

  // ── 外观页各节的折叠态（本档 = 设置页）──────────────────────────────────────────
  //    用户口径（二次修订）：「设置页则是**全部开启**但也支持隐藏」⇒
  //    下面五个门在本档**默认都展开**，但每个都能点节头收起（与侧边栏同一套构件）。
  //    与侧边栏那一侧同序：细节 / 玻璃 UI / 侧边栏圆角 / 全局 UI 配色 / 全局字体。
  //    hook 必须在早退分支之前调用（Rules of Hooks），与 activeTab 相邻。
  const [pickerFontOpen, setPickerFontOpen] = React.useState(readSavedPickerFontOpen);
  const togglePickerFontSection = () => {
    setPickerFontOpen((prev) => {
      const next = !prev;
      writeSavedPickerFontOpen(next);
      return next;
    });
  };
  const [pickerUiColorOpen, setPickerUiColorOpen] = React.useState(readSavedPickerUiColorOpen);
  const togglePickerUiColorSection = () => {
    setPickerUiColorOpen((prev) => {
      const next = !prev;
      writeSavedPickerUiColorOpen(next);
      return next;
    });
  };
  // 「细节 / 玻璃 UI / 侧边栏圆角」三节（二次修订：设置页也支持隐藏）。
  // ⚠️ 与上面两个同形，但三者共用一条读法（都默认展开）—— 所以抽成一个**自定义 hook**
  //    生成，避免把同一段"读-写-翻转"抄三遍（抄三遍就一定会有一处漏写 localStorage）。
  //    名字必须以 `use` 开头：它内部调 `React.useState`，React 的规则要求 hook 只能从
  //    组件或**另一个 hook** 里以固定顺序调用（三次调用顺序恒定 ⇒ 合法）。
  const usePickerSectionOpen = (key) => {
    const [open, setOpen] = React.useState(() => readSavedPickerOpen(key));
    const toggle = () => setOpen((prev) => {
      const next = !prev;
      writeSavedPickerOpen(key, next);
      return next;
    });
    return [open, toggle];
  };
  const [pickerDetailOpen, togglePickerDetailSection] = usePickerSectionOpen(PICKER_DETAIL_OPEN_KEY);
  const [pickerGlassUiOpen, togglePickerGlassUiSection] = usePickerSectionOpen(PICKER_GLASS_UI_OPEN_KEY);
  const [pickerCornersOpen, togglePickerCornersSection] = usePickerSectionOpen(PICKER_CORNERS_OPEN_KEY);
  const [pickerPresetsOpen, togglePickerPresetsSection] = usePickerSectionOpen(PICKER_PRESETS_OPEN_KEY);

  // 本机字体清单的触发点**两处都有**（三次修订）：字体节回到设置页之后，
  // 这里也要一份 —— 否则「全局字族」那排下拉在本档是空的死旋钮（清单由宿主现扫描）。
  // 三条门与侧栏那侧同形：停在外观页 + 字体节展开 + 字体自定义打开；TTL 内是空操作。
  React.useEffect(() => {
    if (activeTab === "appearance" && pickerFontOpen && sel.fontCustom) ensureSystemFonts(false);
  }, [activeTab, pickerFontOpen, sel.fontCustom]);

  // 侧栏深链（快捷播放面板底栏的「更多外观设置 ›」/「更多播放设置 ›」）：请求"打开
  // 设置页后停在哪一页"。打开对话框由 src/sidebar-right.js 的 DOM 路径负责，这里只管
  // 落地 —— 走**同一个 switchTab**（清待确认 / 退出下钻 / 写 localStorage 这些副作用
  // 一处不落），落地后把请求清掉（一次性；否则用户几分钟后自己开设置会被旧请求劫持）。
  // 组件没挂载时请求就先躺在 store 里，挂载后这一趟 effect 消费它 —— 两条路都覆盖。
  React.useEffect(() => {
    const req = selection.settingsTabRequest;
    if (!req) return;
    if (req === activeTab || !visibleTabs.some((t) => t.id === req)) {
      setTransient("settingsTabRequest", "");
      return;
    }
    switchTab(req);
  }, [sel.settingsTabRequest, activeTab]);

  // 库视图虚拟滚动的窗口（机制与几何见 src/picker-modal.js 顶注）：hooks 必须长在组件
  // 里（renderPickerModal 是纯渲染器），经 ctx 传下去。classic CD 架不虚拟化 ⇒ 渲染侧
  // 不把 gridRef 挂到网格上，测量 effect 拿不到元素就整体空转。count 给**上界**（正常 /
  // 隐藏两个列表 + 关闭卡都 ≤ 库存 + 1；无滚动容器时窗口 = count，渲染侧按真实列表
  // 长度钳），viewTag 戳这份窗口量自哪个形态 —— 换形态 / 开关下钻的一帧按未测量处理
  // （首窗 + 零占位），测量 effect 随 tag 进 deps 立刻跟上。
  const pickerGridRef = React.useRef(null);
  const pickerRootRef = React.useRef(null);

  const pickerViewTag = sel.pickerOpen
    ? (sel.modalView === "hidden" ? "hidden" : (sel.pickerDraft ? "draft" : "normal"))
    : "closed";
  const pickerVwin = qpVirtWindow(pickerGridRef, (sel.inventory.wallpapers || []).length + 1,
    PICKER_CARD_H, PICKER_CARD_GAP, true, pickerViewTag);

  if (!sel.loaded) {
    return React.createElement("div", { className: "we-picker" },
      React.createElement("span", { className: "we-picker__hint" }, weT("扫描 Wallpaper Engine…")));
  }
  if (sel.inventory.error) {
    return React.createElement("div", { className: "we-picker" },
      React.createElement("div", { className: "we-picker__error" },
        weT("未检测到 Wallpaper Engine：{error}", { error: weT(sel.inventory.error) })),
      React.createElement("button", {
        className: "we-picker__btn", type: "button", onClick: onRefresh, disabled: sel.loading,
      }, sel.loading ? weT("刷新中…") : weT("重试")));
  }

  const list = sel.inventory.wallpapers;
  // 派生数据 + 分页全部由 **src/picker-model.js** 算（`pickerModel`）：可播放网格、两个
  // 过滤下拉的分档计数、隐藏列表，以及三个列表各自的当页切片。搜索是大小写不敏感的
  // 标题子串匹配（空查询 = 不过滤），每页 24 张，页号越界自动 clamp。这里只把状态喂
  // 进去、把结果取出来 —— 组件体不再就地算这些（分级/类型/隐藏的判定也在那边）。
  const {
    query, playableList, basePlayable, ratingCounts, typeCounts, hiddenList,
    editorPageView,
  } = pickerModel({
    wallpapers: list,
    hiddenIds: selection.hiddenIds,
    search: sel.search,
    ratingFilter: sel.contentRatingFilter,
    typeFilter: sel.typeFilter,
    editorPage: sel.editorPage,
  });
  // CD-rack mode: compact one-page grid (no pagination, no virtualization —
  // aspect-ratio cards with overlapping rows don't fit the fixed-pitch model).
  const cdMode = sel.pickerLayout === "classic";
  const current = list.find((w) => w.id === sel.id) || null;
  const uploadedList = list.filter((w) => isUploadedWallpaper(w) && !isDirWallpaper(w));
  const groups = sel.rotationGroups;
  const group = activeRotationGroup();
  const candidates = rotationCandidates();
  const playableCount = candidates.length;
  const editing = sel.editing;

  // ── 壁纸属性面板的接线────────────────────────────────────
  // 面板标记搬去了 `src/picker-props-panel.js`（构建期内联回本作用域）。这里只做**组装**：
  // 面板状态（开关 / token / 加载态 / 错误 / 属性表 / 实时渲染是否接管）与三个动作
  // （该重拉时重拉、改一个属性、恢复默认）都留在本文件 —— 状态与处理器是 ctx 的**供给方**，
  // 渲染器只拿值 + 回调（同模态框那条契约）。判定就一句：
  // token 变了且不在加载中才重拉。
  // ── 页签面板内容（函数声明提升，renderActiveTab 在 return 里先调用）──────
  // 四页签 = 单渲染器（「外观」）+ 两个合并渲染器（「播放」= 效果 + 声音，「系统」= 高级）
  // + 壁纸库。
  const renderActiveTab = () => {
    if (activeTab === "gallery") return renderGalleryTab({
      sel: selection,
      gallery: {
        items: selection.galleryItems,
        sel: selection.gallerySel,
        busy: selection.galleryBusy,
        error: selection.galleryError,
        note: selection.galleryNote,
        result: selection.galleryResult,
      },
      galleryThumbUrl, galleryPresets: GALLERY_PRESETS, onGalleryPreset,
      onGalleryEndpoint, onGalleryJsonPath, onGalleryCompress, onGalleryAllowPrivate,
      onGalleryFetch, onGalleryProbe, onGalleryToggle, onGallerySelectAll, onGalleryDownload,
    });
if (activeTab === "appearance") return renderAppearanceTab({
      setSetting, setTransient,
      fontSet: fontSetCtx(),
      glassPresets: glassPresetCtx(),
      // 「全局字体」节的折叠态（ADR-0008 D4 三次修订）：设置页也画那一节 ⇒ 本档自己一份
      // 开合状态（picker-font-open），展开后字体清单由上面的 effect 去要。
      fontOpen: pickerFontOpen, onToggleFontSection: togglePickerFontSection,
      // 「全局 UI 配色」节（含原「输入光标」节的光标颜色行）：同样本档自己一份开合状态；
      // 处理器是模块级的（onAccent / onCaretColor / onToggleUiColorCustom / onUiColorElement）。
      uiColorOpen: pickerUiColorOpen, onToggleUiColorSection: togglePickerUiColorSection,
      onToggleUiColorCustom, onUiColorElement,
      onGlassSurfacePolicy, surfaceStatus: weGlassSurfaceStatus(),
      officialColorOf, onAccent, onCapsuleBlur, onCapsuleColor, onBlur, onBorder, onCaretColor, onChatGlassFidelity, onComponentFamily, onComponentFont, onExtraGlassSelectors, onFontAdvanced, onFontResetAll, onGlassAlpha, onGlassColor, onGlassDarkSeparate, onGlassFidelity, onGlobalFamily, onLeftSidebarGlass, onTitlebarGlass, onRefreshSystemFonts, onSidebarAllCorners, onSidebarAlpha, onSidebarBlur, onSidebarColor, onSidebarContentAlpha, onSidebarContentColor, onSidebarCornerRadius, onSidebarCornerSquare, onSidebarFollowGlobal, onSidebarGlass, onSidebarFullClear, onFloaterSolidBase, onThemeColor, onThemeColorClear, onThemeDarkSeparate, onThemeFamily, onThemeSize, onThemeTypeOnly, onThemeWeight, onThinkingMode, onToggleFontCustom, onToggleThemeFollow, sel,
      // 玻璃 UI 子项开关 + 独立配置 + 独立参数（见 onToggleChildIndependent 那段注释）
      onToggleChildIndependent, onGlassChildParam, childIndependentOn,
      // 二次修订：设置页也**支持隐藏**这几节（默认全展开）——
      // 「细节 / 玻璃 UI / 侧边栏圆角」三个门是本档新增的，与「全局 UI 配色 / 全局字体」
      // 那两个同形。顺序与侧边栏同序（两侧都走 renderAppearanceTab 这一处装配）。
      // 「主题预设」：与其他节同口径升折叠节 —— 只在设置页画 ⇒ 没有侧栏半边。
      detailOpen: pickerDetailOpen, onToggleDetailSection: togglePickerDetailSection,
      glassUiOpen: pickerGlassUiOpen, onToggleGlassUiSection: togglePickerGlassUiSection,
      cornersOpen: pickerCornersOpen, onToggleCornersSection: togglePickerCornersSection,
      // 模块级重置（issue #192）：外观页签下每个模块（主题 / 细节 / 玻璃 UI / 侧边栏圆角 /
      // 全局 UI 配色 / 全局字体）节头右端各一枚 ↺。
      onResetModule,
      presetsOpen: pickerPresetsOpen, onTogglePresetsSection: togglePickerPresetsSection,
    });
    if (activeTab === "playback") return React.createElement(React.Fragment, null,
      renderEffectsTab({
        setSetting, setTransient,
        onBackgroundBrightness, onBackgroundContrast, onBackgroundSaturate, onClearCustomFrame, onClearGpuFrame, onCustomFrameFile, onFlip, onFpsCap, onLayerPositionX, onLayerPositionY, onLayerReset, onLayerScale, onLiveBootDelay, onObjectFit, onOpenPicker, onPlaybackRate, onRecaptureGpuFrame, onRefreshFrame, onSceneAutoQuality, onSceneLiveFps, onScrim, onToggleSceneLive, onWallpaperBlur, onWallpaperOpacity, sel, setPickerOpener,
      }),
      renderAudioTab({
        setSetting, setTransient,
        onToggleAudio, onVideoVolume, sel,
      }),
    );
    if (activeTab === "system") return React.createElement(React.Fragment, null,
      renderAdvancedTab({
        setSetting, setTransient,
        onAdapterTarget, onEdgeCompatChange, onLayoutChange, onPauseOnBattery, onPauseOnBlur, onPauseOnHidden, onToggleLiveDiag, sel,
        onStartEditCacheDir, onCancelEditCacheDir, onCacheDirDraft,
        onCacheDirBrowseInput, onCacheDirBrowseGo, onCacheDirBrowseEnter, onCacheDirBrowseUp, onPickCacheDir, onCloseCacheDirBrowse,
      }),
    );
    return renderWallpaperTab({
      setSetting, setTransient,
      INTERVALS, armedConfirm: sel.armedConfirm, cdMode, current, editing, editorPageView, group, groups, isLiveScene, onArmConfirm: armConfirm, onArmDeleteGroup, onCancelEditUploadDir, onCancelEditWeAssetsDir, onClear, onDeleteGroup, onDisarmConfirm: disarmConfirm, onEditInterval, onEditName, onEditOrder, onEditTrigger, onGroupChange, onGroupInterval, onGroupTrigger, onPictureSlideSeconds, onOpenPicker, onOpenPickerDraft, onRefresh, onStartEditUploadDir, onStartEditWeAssetsDir, onSwitchTransition, onSwitchTransitionDir, onSwitchTransitionSpeed, onToggleAudio, onTogglePlay, onTogglePropsPanel, onToggleRotation, onUploadDirDraft, onWeAssetsDirDraft, pagerRow, playableCount, playableList, playbackLive, propsPanelOpen, renderUserPropsPanel, sel, setPickerOpener, uploadedList,
    });
  };
  const tabIdx = Math.max(0, visibleTabs.findIndex((t) => t.id === activeTab));

  return React.createElement("div", { className: "we-picker", "data-we-cards": sel.pickerLayout, ref: pickerRootRef },
    // ── Card header (mirrors the skin-center's pluginCard header): plugin
    //    name + live wallpaper count badge + description. ──
    React.createElement("div", { className: "we-picker__card-head" },
      React.createElement("span", { className: "we-picker__card-name" }, weT("壁纸引擎")),
      React.createElement("span", { className: "we-picker__card-badge" }, String(playableList.length)),
      React.createElement("span", { className: "we-picker__card-desc" }, weT("本地 Wallpaper Engine 壁纸 · 液态玻璃主题")),
    ),
    // ── 页签栏（分段式）：六个页签互斥展示，替代三十控件的单列长滚动。
    //    指示胶囊随 activeTab 平移（transform 合成器属性，不引发布局）；宽度按
    //    **可见页签表**的长度现算 ⇒ 加页签只改那张表、组件行关闭只改可见性，这里零改动。 ──
    React.createElement("div", { className: "we-tabs", role: "tablist", "aria-label": weT("壁纸引擎设置分区") },
      React.createElement("span", {
        className: "we-tabs__pill",
        "aria-hidden": "true",
        style: {
          width: "calc((100% - 6px) / " + visibleTabs.length + ")",
          transform: "translateX(" + tabIdx * 100 + "%)",
        },
      }),
      visibleTabs.map((t) => React.createElement("button", {
        key: t.id,
        type: "button",
        role: "tab",
        "aria-selected": activeTab === t.id ? "true" : "false",
        className: "we-tabs__tab" + (activeTab === t.id ? " we-tabs__tab--active" : ""),
        onClick: () => switchTab(t.id),
      }, t.label)),
    ),
    React.createElement("div", { className: "we-tabpanel", role: "tabpanel" },
      // 库视图是**页内下钻**：pickerOpen 时页签面板整区切换成
      // 壁纸网格，ESC / 顶部「返回」退出，切页签也会退出（见 switchTab）。
      sel.pickerOpen ? renderPickerModal({
        sel, closePicker, current, playbackLive, playableList, hiddenList,
        cdMode, query, basePlayable, ratingCounts, typeCounts,
        gridRef: pickerGridRef, vwin: pickerVwin,
        armedConfirm: sel.armedConfirm, onArmConfirm: armConfirm, onDisarmConfirm: disarmConfirm,
        onClear, onTogglePlay, onRatingToggle: onRatingFilterToggle, onTypeToggle: onTypeFilterToggle,
        onShowNormalView, onShowHiddenView,
        onToggleBatchMode, onArmBatchHide, onBatchHide, onBatchCancel, onSearchInput, onPickCard,
      }) : React.createElement(React.Fragment, null,
        // 页签内容 → **每个页签末尾一个重置**（issue #192 用户口径：重置指定选项卡）→
        // 全局重置（只在「系统」页签末尾，即设置页里最接近"最底部"的位置）。
        renderActiveTab(),
        renderTabReset({
          armedConfirm: sel.armedConfirm, onArmConfirm: armConfirm,
          onDisarmConfirm: disarmConfirm, onResetTab,
        }, activeTab),
        activeTab === "system"
          ? renderResetSection({
              armedConfirm: sel.armedConfirm, onArmConfirm: armConfirm,
              onDisarmConfirm: disarmConfirm, onResetAll,
            })
          : null,
      )),
  );
}

// ── Settings section wrapper (first-level page) ─────────────────────────────
// Mirrors the skin-center's sectionList > pluginCard structure: the picker is
// rendered inside a liquid-glass card shell so the whole settings page reads
// as one frosted surface over the wallpaper. Owner props ({ close }) are
// intentionally ignored — this section never leaves settings.
function WallpaperPickerSection() {
  // 语言切换：顶层组件订阅一次，整棵子树（含 render* 那些纯渲染器）跟着重渲染。
  useWeLocale();
  return React.createElement("ul", { className: "we-picker__section-list" },
    React.createElement("li", { className: "we-picker__card-shell" },
      React.createElement(WallpaperPicker, null),
    ),
  );
}

// ── 首次安装：自动套用「深色 + 作者自用」（用户口径，取代原来的推广弹窗）──────
// 口径：新装默认就是作者在用的那套观感，不再弹窗问"要不要试试"。
// 触发点只有一个 —— `src/persistence.js` 的 `loadPersisted()` 发现**宿主没有存档
// 且本机也没有本地存档**（真正第一次）。升级用户、重装宿主但本地存档还在的用户，
// 一概不受影响；套用后存档被写出，下次启动走宿主分支，天然只触发一次。
//
// 三条不变量：
//   · **失败不回滚**：预设应用是一整批操作，主题这一腿或某段资产失败时只记错误文案，
//     不把已经落好的部分撤掉（撤一半比不套用更难解释）。
//   · **不阻塞启动**：异步跑，不 await —— 启动链（settings → fontset → inventory）不该
//     等一次预设应用。
//   · **主题腿要等服务**：宿主 `theme` 服务在启动早期拿不到（实测 7ms 时还没有、325ms 才有），
//     而 `applyPreset` 里的 `themeFollowApplyPreference` 拿到空句柄会静默跳过。
//     所以这里先套预设（设置 + 资产），主题留给服务就绪后补一次 —— 见下面的 `pending`。
//     补写只有一次，且**只补主题**，不重跑整份预设（重跑会把用户这几百毫秒里的改动盖掉）。
let firstRunAuthorPending = false;
function firstRunAdopt() {
  try {
    applyPreset("factory-dracula-pro").then((ok) => {
      if (ok) return;
      // 失败静默：新装用户不该一上手就看见一条红字。诊断行留给排障。
      try { liveLog && liveLog("首次安装套用作者自用失败：" + String(selection.glassPresetError || "")); } catch { /* ignore */ }
    });
    // 主题补写：服务可能还没就绪 ⇒ 交给主题层 onReady 那次回调（见 armFirstRunThemeFlush）。
    firstRunAuthorPending = true;
    flushFirstRunAuthorTheme();
  } catch { /* 首装美化是增强：任何异常都不该阻断启动 */ }
}

/** 主题服务就绪后把首装的主题腿补上（可被 onReady 与定时重试两处调，幂等）。 */
function flushFirstRunAuthorTheme() {
  if (!firstRunAuthorPending) return;
  try {
    if (themeFollowApplyPreference("dark")) firstRunAuthorPending = false;
  } catch { /* 服务异常：留给下一次 */ }
}

// Bumped v3: tabbed picker IA + unified control chrome (sliding segmented tab
// bar, pill switches everywhere, ink-token labels, 30px control heights).
// Forces a fresh <style> injection even when a page still carries the
// old stylesheet tag from a previous bundle (TAG_ID dedupes the injection; a
// static id would leave stale CSS rules active and new rules missing).
const TAG_ID = "dsh-wallpaper-engine/styles-v3";
// 本次 bundle 求值的代际标记: cleanup 只移除自己这一代的 <style>, 于是 HMR 的
// "新代已挂载、旧代才卸载"顺序下不会误删新代仍在用的样式表。
const CSS_GEN = Date.now() + ":" + Math.random().toString(36).slice(2);
// 注入抽成函数: fiber cleanup (见 apply) 会移除这个 <style>, 所以 effect 挂载时
// 必须能再注入一次 — 否则同一页面内 disable→enable 后整个界面无样式。
function ensurePluginCss() {
  if (typeof document === "undefined") return null;
  let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]");
  if (tag === null) {
    tag = document.createElement("style");
    tag.dataset.plugin = "dsh-wallpaper-engine";
    tag.dataset.pluginCss = TAG_ID;
    document.head.appendChild(tag);
  }
  // 同 id 的旧标签可能带的是上一个 bundle 的 CSS → 按当前 bundle 的内容刷新
  if (tag.textContent !== CSS) tag.textContent = CSS;
  tag.dataset.pluginCssGen = CSS_GEN;
  return tag;
}
ensurePluginCss();

// ── Plugin exports ──────────────────────────────────────────────────────────
const inject = ["slots"];

// ── Mica 能力探测 ──────────────────────────────────────────────────────────
// 「增强模式」下 DSH 桌面外壳把左侧工作区 (.dshDesktopSidebarSurface) 交给系统
// 材质：有 Mica 时保持透明（壁纸透出），没有 Mica 时改用 --dsw-alias-bg-layer-1
// 实心绘制，左侧工作区的背景因此与壁纸无关。Mica 只在 Windows build ≥ 22621
// （Win11 22H2+）存在，Win10 永远拿不到。桌面外壳已按 os.release() 的 build 号
// 算好结果，并写进渲染 URL 的 dsh-desktop-mica 查询参数（1/0）——这是页面能拿到
// 的最准信号，同步读取、零成本。参数缺失（普通浏览器 / 非增强模式）时退回 UA：
// UA 几乎总是不带 build 号，平台不是 Windows 就完全不动作（非 Windows 行为不变），
// 是 Windows 但解析不出 build 则按「不支持」处理（安全侧，宁可给确定性底色也不
// 赌系统材质）。结果只探测一次并缓存 —— applyEffects 每次设置变动都会调用它。
// 全程用 try/catch 吞掉异常，绝不抛出，也绝不因探测本身改变页面行为。
const MICA_MIN_BUILD = 22621;
let micaSupport; // undefined = 未探测 · null = 非 Windows（不适用）· false = 无 Mica
function detectMicaSupport() {
  if (micaSupport !== undefined) return micaSupport;
  micaSupport = null;
  try {
    let marker = null;
    if (typeof location !== "undefined" && location && typeof location.search === "string") {
      marker = new URLSearchParams(location.search).get("dsh-desktop-mica");
    }
    if (marker === "1") {
      micaSupport = true;
    } else if (marker === "0") {
      micaSupport = false;
    } else {
      const ua = (typeof navigator !== "undefined" && navigator && navigator.userAgent) || "";
      if (/Windows/i.test(ua)) {
        const build = /Windows NT 10\.0\.(\d+)/.exec(ua);
        micaSupport = !!build && Number(build[1]) >= MICA_MIN_BUILD;
      }
    }
  } catch { /* 探测异常：保持 null（不适用）→ 不改任何既有行为 */ }
  return micaSupport;
}

// ── 玻璃饱和度解耦（?we-saturate）─────────────────────────────────────────────
// **不变量**：`--we-saturate` 是常量材料属性，不随 玻璃 滑块（模糊深度）变化。
// 随它线性上升（1.15 + blur*0.028 ⇒ 0px→1.15 … 60px→2.83）等于让一个滑块同时改两件
// 语义无关的事：毛玻璃深度（--we-blur）和背景「色彩融化」强度 —— 高模糊 + 高饱和会把
// 玻璃后残留的壁纸文字放大成 荧光/彩色鬼影，而不是中性雾面。取 1.25–1.4 液态玻璃区间
// 的低端 1.3，且低于样式表自身 1.8 的回退默认值。
// A/B 逃生舱（与 dsh-desktop-mica 同风格）：
//   ?we-saturate=legacy → 完全恢复旧的耦合公式（逐字节等值）
//   其余（缺省 / 垃圾值 / 大小写混写）→ 新的常量行为
// 只解析一次并缓存 —— applyEffects 每次设置变动都会读它。
// 全程 typeof 守卫 + try/catch：非浏览器 / 验证沙箱里绝不抛出，也绝不改变行为。
// 不挂任何 DOM 属性，所以 dispose 没有额外清理（--we-saturate 本身已在
// clearEffects 里移除）。
const GLASS_SATURATE = 1.3;
let legacySaturateCoupling; // undefined = 未解析 · true = 旧耦合 · false = 常量
function useLegacySaturateCoupling() {
  if (legacySaturateCoupling !== undefined) return legacySaturateCoupling;
  legacySaturateCoupling = false;
  try {
    if (typeof location !== "undefined" && location && typeof location.search === "string") {
      let raw = "";
      if (typeof URLSearchParams === "function") {
        raw = new URLSearchParams(location.search).get("we-saturate") || "";
      } else {
        const m = /[?&]we-saturate=([^&]*)/.exec(location.search);
        raw = m ? decodeURIComponent(m[1]) : "";
      }
      legacySaturateCoupling = String(raw).toLowerCase() === "legacy";
    }
  } catch { /* 解析异常：保持新行为（常量），绝不抛出 */ }
  return legacySaturateCoupling;
}

function apply(ctx) {
  // 0. i18n：把插件文案接上宿主的 locale 服务（`ctx.get("locale")`，可选服务 + 短轮询 ——
  //    缺服务时静默停在默认语言，见 src/i18n/i18n.js）。放在最前面：界面首次渲染就要按当前
  //    语言取词；服务通常已在（dsh-web-app 的 base bundle 自带），轮询只是兜底。
  if (ctx.effect) ctx.effect(() => weI18nAttach(ctx) || undefined);

  // 0b. 启动预取：inventory / 字体集清单与设置无关，启动链却要等 settings 之后才发。
  //     在这里先发出去，链走到它们时通常已经回来（只预取一次；失败不影响启动链）。
  try {
    prefetchInventoryOnce();
    prefetchFontSetList();
  } catch { /* 预取失败走原路径（启动链各步自己会发请求） */ }

  // 0c. 玻璃行停用时的残留回收（见 reclaimGlassResidue 的注释：清理函数住在玻璃子包，
  //     行停用后那个 bundle 不求值 ⇒ 只能由永远加载的主包来收）。
  //     ⚠️ **不发额外请求**：早先版本在这里 `setTimeout` + `apiJson(INVENTORY_URL)` 自探一次，
  //     结果在 vm 沙箱（live-frame-backfill-smoke）里与夹具的 fetch 桩抢时序，把
  //     "有画面 + 体积达标 ⇒ PUT 回填" 那一档整个压掉（实测 11 条判据连锁红）。
  //     结论：回收只挂在**本来就有的数据流**上 —— `loadInventory` 拿到新 components 时
  //     即时回收（见那里），再加上本函数在每次 `emit` 里对**已缓存的** components 复核一次。
  //     页面刷新后什么都不点的情况由 `loadInventory` 的启动链覆盖（它本来就会跑一次）。

  // 1. Mount the behind-body wallpaper + scrim layers and keep them in sync
  //    with the selection store. ctx.effect gives fiber-lifetime cleanup.
  if (ctx.effect) {
    ctx.effect(() => {
      const unsub = subscribe(syncLayers);
      const unsubEffects = subscribe(applyEffects);
      // 「扩展」页签的那几层（P-A 起统一走注册表）：接法与壁纸层同形 —— 每次 emit 重判一次
      // "该不该活"。三层各自的性质不同（画布层内容驱动、视差层收敛驱动、头像层改宿主 DOM），
      // 但**接法只有一个**：注册表说有哪些层，这里就 subscribe 谁的 sync；参数不在这里传，
      // 每一层自己每帧现读 `selection`。三项里两项住在自己的包里，本 bundle 的作用域里
      // 根本没有它们的函数名 —— 这正是这张注册表存在的理由。
      const layerUnsubs = new Map();
      const attachLayer = (layerId, hooks) => {
        if (layerUnsubs.has(layerId)) return;
        layerUnsubs.set(layerId, subscribe(hooks.sync));
      };
      // 迟到注册（子包产物在挂载之后才求值）：补订阅 + 立刻对时 + emit 一次让面板把新模块画上。
      weSetLayerAttacher((layerId, hooks) => {
        attachLayer(layerId, hooks);
        try { hooks.sync(); } catch { /* 单层启动失败不许带崩挂载 */ }
        emit();
      });
      // 注册表本身变了也要重画（迟到登记的扩展模块描述符 —— 与层钩子同一次 bundle 求值）。
      weSetRegistryListener(() => emit());
      for (const [layerId, hooks] of weLayerHooks()) attachLayer(layerId, hooks);
      // 启动对时：挂载后的第一次 emit 由 applySelection 触发，但「轮播开关 / 场景实时
      // 渲染 / 帧率档 / 播放倍速」这族键不在 emit 订阅链里（syncRotationTimer /
      // syncSceneAudio 需显式调用）—— preset-store 的 reapplyAll() 只在应用预设时跑。
      // 这里补一次对时，让挂载那一刻就按真实设置运转（幂等：按当前值重排定时器 / 音频）。
      try { reapplyAll(); } catch { /* 挂载期静默：无媒体层时是空操作 */ }
      // Occlusion pause: re-apply the effective playing state whenever the
      // page hides/shows or the window loses/gains focus (see occlusionActive).
      // Fires syncLayers → play/pause on the video; decode drops to 0 while
      // minimized / covered by another app, exactly like desktop WE.
      // #288：pauseOnHidden 的持续期防抖。瞬时 hidden（虚拟桌面切换 / 焦点竞态）直接忽略，
      // 只有持续 ≥ HIDDEN_PAUSE_DEBOUNCE_MS 才置 hiddenHoldActive 并 emit（走正常暂停管线）；
      // 回来时立刻清状态并 emit。绑定随 fiber 注销（下面的 cleanup）。
      let hiddenDebounce = 0;
      let hiddenHoldBound = false;
      const applyHiddenHold = () => {
        const hidden = typeof document !== "undefined" && document.hidden === true;
        if (!hidden) {
          if (hiddenDebounce) { clearTimeout(hiddenDebounce); hiddenDebounce = 0; }
          if (hiddenHoldActive) { hiddenHoldActive = false; emit(); }
          return;
        }
        if (hiddenHoldActive || hiddenDebounce) return;
        hiddenDebounce = setTimeout(() => {
          hiddenDebounce = 0;
          if (typeof document !== "undefined" && document.hidden === true) {
            hiddenHoldActive = true;
            emit();
          }
        }, HIDDEN_PAUSE_DEBOUNCE_MS);
      };
      applyHiddenHold();
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", applyHiddenHold);
        hiddenHoldBound = true;
      }
      const onOcclusionChange = () => emit();
      const ocListeners = [];
      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        for (const t of ["visibilitychange", "blur", "focus"]) {
          window.addEventListener(t, onOcclusionChange);
          ocListeners.push(t);
        }
      }
      // 视频壁纸的**提交前预热**：指针按到/停在卡片上时就把它预到元数据（见 src/video-layer.js
      // 的 warmVideoUrl）—— 点击发生在抬手，按下→抬手、以及鼠标停在卡片上的这段时间都是白捡的
      // 窗口（手动点选没有准备链）。capture + passive：不拦事件、不进冒泡链。
      const onWarmPointerDown = (ev) => { try { warmVideoForPointer(ev, true); } catch { /* ignore */ } };
      const onWarmPointerOver = (ev) => { try { warmVideoForPointer(ev, false); } catch { /* ignore */ } };
      let warmBound = false;
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("pointerdown", onWarmPointerDown, { capture: true, passive: true });
        document.addEventListener("pointerover", onWarmPointerOver, { capture: true, passive: true });
        warmBound = true;
      }
      // 可见性恢复（最小化 → 还原 / 页面从 bfcache 回来）：**只在"隐藏 → 可见"这一个方向**
      // 做两件事 —— 一次两帧的复合成微推（见 nudgeWallpaperRepaint）与"画面真的回到屏上了吗"
      // 的留痕（见 probeWallpaperOnScreen）。普通 focus（用户点回窗口）不做，否则每次点窗口
      // 都要动一次层；两件事都是事件级、不进热路径。
      const onBackVisible = () => {
        if (typeof document !== "undefined" && document.hidden) return;   // 还在隐藏态
        try { nudgeWallpaperRepaint(); } catch { /* ignore */ }
        try { probeWallpaperOnScreen("back-visible"); } catch { /* ignore */ }
      };
      let backVisBound = false, pageShowBound = false;
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", onBackVisible);
        backVisBound = true;
      }
      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("pageshow", onBackVisible);
        pageShowBound = true;
      }
      // 客户端 JS 异常的**留痕**：这台机器打不开 DevTools ⇒ 没有这一条，一次渲染期异常就只剩
      // "UI 崩了"这句转述（实测过：面板白屏时诊断缓冲里什么也没有）。只**记录**、不改行为；
      // 与其它监听器一样随 fiber 注销（HMR 重挂不会叠）。
      const onClientError = (ev) => {
        try {
          const err = ev && (ev.error || ev.reason);
          const type = (ev && ev.type) ? ev.type : "error";
          const msg = String((err && err.message) || (ev && ev.message) || err || ev || "").slice(0, 240);
          const where = (err && err.stack) ? " @ " + String(err.stack).split("\n").slice(0, 3).join(" <- ") : "";
          liveLog("client-error", type + ": " + msg + where);
        } catch { /* 连记录都失败就放弃，绝不在错误处理里再抛 */ }
      };
      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("error", onClientError);
        window.addEventListener("unhandledrejection", onClientError);
      }
      // 遮挡判定**不能只靠事件**：原生模态（`window.confirm` / `alert`）会把焦点交给自己的窗口，
      // 而**回来时的 focus 事件不保证送达** —— 判定就会一直停在「窗口失焦」，壁纸从此不恢复
      // （真机形态：删除确认弹窗之后壁纸停住、输入框也收不到键，只剩重载能救）。
      // 事件之外再**低频复核**一次，且只在判定**变了**时 emit ⇒ 常态零代价、不 churn。
      let lastOcclusion = occlusionReason();
      let ocWatch = 0;
      if (typeof setInterval === "function") {
        ocWatch = setInterval(() => {
          const now = occlusionReason();
          if (now === lastOcclusion) return;
          lastOcclusion = now;
          // 留痕：这条日志是"事件丢了、靠复核补上"的唯一事后证据（真机排查时缺的就是它）。
          try { liveLog("play-state", liveStateBrief("occlusion-recheck")); } catch { /* ignore */ }
          emit();
        }, OCCLUSION_RECHECK_MS);
      }
      // 持久化监听器: pagehide → 立即 flush 未落盘的设置; visibilitychange →
      // 页面回到前台时重试失败过的 PUT。注册在这里 (而不是模块作用域) 才能随
      // fiber 注销 — 否则每次插件重载/HMR 都会在同一页面再叠一对, 永不释放。
      // 字体集是**另一条**通道（src/fontset-store.js），同形但各自记自己的脏标记 ⇒ 各自注册。
      let pageHideBound = false, visBound = false;
      let fontPageHideBound = false, fontVisBound = false;
      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("pagehide", onPageHideFlush);
        pageHideBound = true;
        window.addEventListener("pagehide", onPageHideFlushFontSet);
        fontPageHideBound = true;
      }
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", onVisibilityResyncPersist);
        visBound = true;
        document.addEventListener("visibilitychange", onVisibilityResyncFontSet);
        fontVisBound = true;
      }
      // 样式标签也按 fiber 生命周期注入 (dispose 会移除, 见下方 cleanup)
      ensurePluginCss();
      // Battery optimization (省电暂停): navigator.getBattery is deprecated but
      // still functional in Chromium; feature-detected so other engines just
      // no-op. 'chargingchange' covers plug/unplug; onOcclusionChange re-applies
      // the effective playing state.
      let batteryCleanup = null;
      let disposed = false;
      if (typeof navigator !== "undefined" && typeof navigator.getBattery === "function") {
        navigator.getBattery().then((bm) => {
          // The plugin effect may have been torn down (disable / HMR) while
          // this promise was pending — registering listeners then would leak.
          if (disposed) return;
          weBattery = bm;
          bm.addEventListener("chargingchange", onOcclusionChange);
          batteryCleanup = () => bm.removeEventListener("chargingchange", onOcclusionChange);
          emit(); // already on battery → pause immediately
        }).catch(() => { /* battery API unavailable: no-op */ });
      }
      syncLayers();
      applyEffects();
      // 每一层挂载后的第一次对时（幂等）：注册表里有哪层就对哪层，没有的不调用。
      for (const [, hooks] of weLayerHooks()) {
        try { hooks.sync(); } catch { /* 单层对时失败不许带崩挂载 */ }
      }
      return () => {
        disposed = true;
        unsub();
        unsubEffects();
        weSetLayerAttacher(null);
        weSetRegistryListener(null);
        for (const [, unsubLayer] of layerUnsubs) unsubLayer();
        layerUnsubs.clear();
        if (ocWatch) { try { clearInterval(ocWatch); } catch { /* ignore */ } ocWatch = 0; }
        if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
          for (const t of ocListeners) window.removeEventListener(t, onOcclusionChange);
          if (pageShowBound) window.removeEventListener("pageshow", onBackVisible);
          window.removeEventListener("error", onClientError);
          window.removeEventListener("unhandledrejection", onClientError);
          if (pageHideBound) window.removeEventListener("pagehide", onPageHideFlush);
          if (fontPageHideBound) window.removeEventListener("pagehide", onPageHideFlushFontSet);
        }
        if (backVisBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("visibilitychange", onBackVisible);
        }
        if (warmBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("pointerdown", onWarmPointerDown, { capture: true });
          document.removeEventListener("pointerover", onWarmPointerOver, { capture: true });
        }
        if (visBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("visibilitychange", onVisibilityResyncPersist);
        }
        // #288：防抖状态与监听随 fiber 一起收（模块级 hiddenHoldActive 必须复位，
        // 否则禁用期间页面若是隐藏的，重挂后会带着旧态直接暂停）。
        if (hiddenHoldBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("visibilitychange", applyHiddenHold);
        }
        if (hiddenDebounce) { clearTimeout(hiddenDebounce); hiddenDebounce = 0; }
        hiddenHoldActive = false;
        if (fontVisBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("visibilitychange", onVisibilityResyncFontSet);
        }
        if (batteryCleanup) { batteryCleanup(); batteryCleanup = null; }
        weBattery = null;
        clearRotationTimer();
        // 卸载/禁用要收掉「进行中的准备」与「领养槽位」：否则 staged iframe 继续
        // 跑 rAF/WebGL、探测 <video> 以无句柄后台解码器的形态活到页面关闭，
        // 而且 prep 的兜底定时器之后仍会 commit（往已卸载的插件里建层）。
        cancelRotationPrepare();
        disposePreparedMedia();
        // 预热槽位同一条纪律：留着就是一个没有句柄的解复用器（页面关闭前不会自己走）。
        disposeWarmVideo();
        // 每一层的收尾都归它自己：画布层摘节点 + 解绑监听与 rAF；视差层摘监听、rAF 与 body
        // 上的 CSS 变量/开关属性（否则重挂会残留上一份位移）；头像层摘注入节点与行标记、
        // 断开观察者、撤开关属性（"关掉 = 逐字节回原生"在卸载路径上的同一个动作）。
        // 逐层包 try/catch：某一层收尾抛错不许把后面的层留在屏上。
        for (const [layerId, hooks] of weLayerHooks()) {
          try { hooks.dispose(); } catch (err) {
            try { reportClientDiag("layer-dispose-failed:" + layerId, String((err && err.message) || err)); } catch { /* 诊断本身不许再抛 */ }
          }
        }
        // 关掉音频闸并退役渐变中的旧层：禁用/重挂时旧层不能被留在屏上等退役定时器
        // （≤1.3s 的可见残留），闸也不该跨过一次重挂活着（准备链的 BGM 起播会被它
        // 推迟到那个定时器触发为止）。这两条收尾本身是正确性要求：跨过一次重挂活着的闸
        // 会让准备链的 BGM 起播被推迟，而留在屏上的旧层要等退役定时器（≤1.3s 可见残留）。
        // 先清闸、再退役渐变层：卸载不是「渐变结束」，走放行会 restoreNodeAudio →
        // syncSceneAudio → play()，刚被闸压住的场景 BGM 反而在禁用时响一下（smoke 场景 H
        // 锁定）。清掉闸后 retireFadingLayer 内部的
        // releaseRotationAudioGateFor 直接早退；场景音频元素也一并拆掉 —— 不拆的话
        // 禁用后正在播的 BGM 不会停止。
        rotationAudioGate = null;
        retireFadingLayer();
        stopSceneAudioEl();
        cancelLiveFrameBackfill(); // 卸载后不得再发 HEAD/PUT（少这一步就漏一次）
        stopLiveWatch();
        cancelLiveMount("unload"); // 延迟期那个正在预热的渲染页也要终止（否则卸载后仍在后台跑）
        abortTranscodeUpgrade(); // 含 clearUpgradePoll + AbortController.abort（否则卸载后 500ms 轮询永久泄漏）
        cancelPendingPersist(); // 模块级 persistTimer 不属于 fiber：不取消则 200ms 后仍会写一次
        cancelPendingFontSet(); // 字体集那条通道的 timer 同理（各自一个模块级 timer）
        cancelUserPropsCommit(); // 「壁纸属性」拖动期的尾部提交也是模块级 timer（同上）
        // media-info 探测的 AbortController 也要断开 (token 可能永远不再变化)
        abortMediaInfoProbe();
        // sceneVideo 时序补拉: 卸载后不该再拉 inventory (也不该钉住本次求值的闭包)
        if (sceneVideoResyncTimer && typeof window !== "undefined" && typeof window.clearTimeout === "function") {
          window.clearTimeout(sceneVideoResyncTimer);
        }
        sceneVideoResyncTimer = null;
        weStopDraw();
        const node = document.getElementById(LAYER_ID);
        if (node) { releaseLayerMedia(node); node.remove(); }
        const scrim = document.getElementById(SCRIM_ID);
        if (scrim) scrim.remove();
        clearEffects();
        setWallpaperActive(false);
        // 主样式标签: 每次 bundle 求值都会注入一份 (HMR 后旧 <style>
        // 永久留在 <head>), 故只移除本次求值这一代, 重挂载由 ensurePluginCss() 补回。
        if (typeof document !== "undefined" && typeof document.querySelector === "function") {
          const cssTag = document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]");
          if (cssTag && cssTag.dataset && cssTag.dataset.pluginCssGen === CSS_GEN
              && typeof cssTag.remove === "function") cssTag.remove();
        }
      };
    });
  }

  // 1b. 「文字颜色角色」令牌层：后台轮询 theme 服务（启动竞态：实测 7ms 时还没有、
  //     325ms 才有），拿到后按设置给每个角色上色；拿不到就**什么都不做** —— 全局
  //     令牌层是**唯一**的上色通道：`#we-font-patch` 那类全局回落通道已不存在，
  //     所以拿不到服务时角色色就是不上色，而不是换一条腿顶上。
  //     - 不声明 `inject: ["theme"]`：缺服务时声明式依赖会让插件 park。
  //     - 首次写入前先取宿主墨色基线，否则退出契约会把我们的颜色当宿主原值快照。
  //     - 不监听配色变化重注册：值给的是 {light,dark} 对，配色切换由服务自己换值。
  if (ctx.effect && typeof ctx.get === "function" && typeof document !== "undefined") {
    ctx.effect(() => {
      let layer = null;
      // 排版层：**必须独立 source** —— 同 source 再注册会整层替换，会把颜色层顶掉。
      // 它不碰 --dsw-alias-label-*，因此与宿主墨色基线（onBeforeFirstWrite）无关。
      let typeLayer = null;
      let unsub = null;
      const cancelPoll = pollThemeService(ctx, {
        intervalMs: 250,
        timeoutMs: 6000,
        onReady: (theme) => { themeFollowAttach(theme, ctx);   // 主题随壁纸：同一个服务句柄，接上即补评一次（开关默认关，关着时这次补评整体空转）
          // 首装的主题腿：applyPreset 若跑得比服务就绪早，那一次写会因句柄为空而静默跳过
          // ⇒ 这里补一次（幂等；非首装时 firstRunAuthorPending 为假，零开销）。
          try { flushFirstRunAuthorTheme(); } catch { /* 增强腿，不阻断主题层 */ }
          try {
            const available = scanThemeTokens(document);
            // 样式表扫描是清单的权威来源（active.tokens 为空、exportInspectTokens 只有 14 条）；
            // 再叠一层 computed 存在性探测，跨源样式表读不到 cssRules 时也能判定。
            const hasToken = (t) => available.has(t)
              || (typeof getComputedStyle === "function"
                && getComputedStyle(document.body).getPropertyValue(t).trim() !== "");
            layer = createThemeLayer({
              theme,
              // 绑在「字体自定义」总开关下：关闭 = 连颜色一起恢复原生（与面板文案一致）。
              // `|| {}` 是第二道：这几个 getter 会在**订阅回调**里被调到，而订阅回调不在 try 里 ——
              // 数据侧已有兜底（selection 初始化必带字体键），这里再挡一次，免得"某个键缺失"
              // 升级成"改一下设置整块面板崩"。
              getColors: () => (selection.fontCustom ? (selection.themeColors || {}) : {}),
              isAvailable: hasToken,
              onBeforeFirstWrite: () => { try { snapshotHostFontDefaults(); } catch { /* 基线失败不阻断上色 */ } },
            });
            typeLayer = createThemeLayer({
              theme,
              source: THEME_TYPE_SOURCE,
              // 全局字族也在这一层生效（作为**每个角色的默认**）。本机字体的栈里要拼
              // `var(--we-host-font-family, …)`，那是"开写之前"的宿主快照 ⇒ 本层也挂一次
              // onBeforeFirstWrite（它是幂等的"已快照则跳过"，与颜色层共用同一份快照）。
              onBeforeFirstWrite: () => { try { snapshotHostFontDefaults(); } catch { /* 基线失败不阻断字体 */ } },
              buildPayload: () => buildTypePayload(
                selection.fontCustom ? (selection.themeSize || {}) : {},
                hasToken,
                selection.fontCustom ? (selection.themeWeight || {}) : {},
                selection.fontCustom ? (selection.themeFamily || {}) : {},
                fontFamilyStack,
                selection.fontCustom ? (selection.globalFamily || "") : ""),
            });
            layer.sync();
            typeLayer.sync();
            // 订阅回调必须自己收异常：它跑在 emit() 里，抛出去就是"改一下设置整个面板崩"。
            unsub = subscribe(() => {
              try { if (layer) layer.sync(); if (typeLayer) typeLayer.sync(); } catch { /* 令牌层是增强 */ }
            });
          } catch { /* 主题层是增强：任何异常都不该影响壁纸主路径 */ }
        },
      });
      return () => {
        try { if (unsub) unsub(); } catch { /* ignore */ }
        try { if (cancelPoll) cancelPoll(); } catch { /* ignore */ }
        // 交给服务的 disposer 把令牌还原（实测干净）；这里只保证调用一次
        try { if (layer) layer.dispose(); } catch { /* ignore */ }
        try { if (typeLayer) typeLayer.dispose(); } catch { /* ignore */ }
      };
    });
  }

  // 2. Settings page as a FIRST-LEVEL settings section (mirrors the skin-center
  //    in dsh-web-ui-all: its own nav entry, rendered inside the panel content
  //    column). The picker renders inside the liquid-glass card shell.
  //    `label` 用 **thunk**（官方 SlotLabel 支持"每次读取时求值"）：语言切换后设置导航里
  //    的那一行跟着换文字，不需要重注册座位。nav-icon.js / sidebar-right.js 的 DOM 锚点
  //    认的就是这个词的当前译文。
  if (ctx.slots) {
    ctx.slots.inject("settings.section", () =>
      ctx.slots.register(
        { name: "settings.section", id: "wallpaper-engine", order: 500, label: () => weT("壁纸引擎") },
        () => React.createElement(WallpaperPickerSection),
      ),
    );
  }

  // 2b. 设置导航图标：官方 nav 的图标是 shell 里 navIcon(id) 的硬编码映射，第三方
  //     section 一律拿兜底齿轮 —— 用 DOM 补丁把「壁纸引擎」那格换成自绘 SVG
  //    （src/nav-icon.js；补丁失败 = 保留齿轮，不抛、不重试）。
  if (ctx.effect && typeof document !== "undefined") {
    ctx.effect(() => installWeNavIcon() || undefined);
  }

  // 2c. 官方右侧栏接入（harness ≥0.1.5）：能力门在 src/sidebar-right.js —— 座位
  //     声明则面板融进右侧栏 tab，未声明则保持抽屉态。低版本宿主上回调永远不跑，
  //     插件也不会 park（可选服务全靠 ctx.get，不写进 inject）。
  if (ctx.effect && typeof document !== "undefined") {
    ctx.effect(() => installSidebarRight(ctx) || undefined);
  }

  // 2d. 壁纸侧栏快捷键（官方桌面默认 Cmd/Ctrl+Alt+W）：注册进宿主的 shortcuts 服务
  //     （可选服务 + 短轮询，缺服务安静跳过），命令在宿主快捷键编辑器里可改键。
  if (ctx.effect && typeof document !== "undefined") {
    ctx.effect(() => installWallSidebarShortcut(ctx) || undefined);
  }

  // 2e. 这些副作用**必须挂 fiber**（已在 `src/live-layer.js` 与本文件的轮换恢复监听两处收口）：
  //     诊断留痕（加载即留痕 / 窗口失焦·隐藏 / 60s 心跳）与「重启恢复」档的交互即退出监听
  //     （pointerdown/keydown，once），以及「隐藏期轮换推迟到可见时补做」的
  //     visibilitychange/focus 两条监听。理由：宿主每次 revision 变化
  //     都会 tearDownEntryFiber 后用新模块体重跑一遍，不挂 fiber ⇒ 旧实例的定时器
  //     与监听器永不释放（实测同一 document 214 个页 id、一次 window blur 被 117 份实例各记一条）。
  //     与官方契约一致（原文与现场见 src/live-layer.js 的 installLiveDiagnostics）。
  //     焦点交还（#148 宿主半）同理由同形态：document/window 级监听器，拆除函数交给 fiber。
  if (ctx.effect && typeof document !== "undefined") {
    ctx.effect(() => installLiveDiagnostics() || undefined);
    ctx.effect(() => installLiveBootRestore() || undefined);
    ctx.effect(() => installRotationResumeListeners() || undefined);
    ctx.effect(() => installFocusHandback() || undefined);
  }

  // 3b. 皮肤中心互操作（皮肤在台上 ⇒ 我方整族退场）：只读对方两条公开信号，
  //     见文件顶部互操作块。随 fiber 注销（卸载即摘下观察器与轮询）。
  if (ctx.effect && typeof document !== "undefined") {
    ctx.effect(() => installSkinInterop() || undefined);
  }

  // Settings first (host file, port-independent), then the ACTIVE FONTSET (its values live in
  // fontsets/<id>.json — a different store on the same host), then inventory — so the
  // selection restore inside loadInventory()'s revalidateSelection() sees the persisted id
  // and can resolve its media URL, and the first paint already has the user's fonts.
  //
  // ⚠️ 终止 `.catch` 是**必须**的：这条链上任何一步 reject，后面的 `loadInventory` 就永不执行 ——
  // 选择器永久停在「扫描 Wallpaper Engine…」，一次性提示也不收敛（用户只能靠刷新或禁用插件自救）。
  // 各步内部已各自消化可预期的失败（宿主不可达 / 存储被拒 / 坏 JSON），这一条兜的是"没预料到的那次抛"。
  loadPersisted().then(loadFontSet).then(loadInventory).then(loadGlassPresets).catch((err) => {
    // 链断在任何一步都可能留下没被消费的启动预取；它们属于**这一次**启动链，
    // 不能留到用户后来的手动刷新 / 切字体集时冒充新响应（陈旧库存/清单）。
    inventoryBootPrefetch = null;
    try { cancelFontSetListPrefetch(); } catch { /* 模块未内联时也不许二次抛 */ }
    try { reportClientDiag("boot-chain-failed", String((err && err.message) || err)); } catch { /* 诊断本身不许再抛 */ }
  });
}

exports.apply = apply;
exports.inject = inject;

// ── 跨包浏览器半边通道（ADR-0014 S5.1 / S5.4「宿主注入显式键集」）────────────────────
// 显式键集表已独立到 `src/host-bridge.js`（契约真源；构建期内联在本正文之前，同处一个
// 扁平工厂作用域 ⇒ 正文里的活绑定照旧以 getter 形式给出去，产物行为逐字不变）。
// 搬走的原因：这张表是跨包契约，改一个键要同时对账 6 处 `} = host;` 解构名单（判据见
// test/verify-subpackage-client-half.mjs 的 D-7；产物里的申报表由构建期从解构派生），不该埋在 6,000+ 行正文深处。
// 窄键常量 `ROTATION_INTERVAL_DEFAULT` 只服务键表，随表一起搬走。
// ── 玻璃运行时状态门面（ADR-0016 第三刀）────────────────────────────────────
// weGlassSurfaceStatus（表面策略诊断投影）的真实现住 packages/glass 的 glass-surfaces.js ——
// 本 bundle 的作用域里没有那个函数名。外观 ctx 的组装点要它 ⇒ 「门面 + 缓冲登记」：
// 真实现经桥键 registerGlassStatus 由玻璃包在求值期送进来；缺席（玻璃行没装 / 被关）时返回 []，
// 面板的状态列表空着 —— 缺的是那一节的状态，不是页面。迟到登记由玻璃包同一次求值里的
// registerLayerHooks 触发注册表 listener ⇒ emit() 重画，状态自然补上。
let glassStatusApi = null;
function weGlassSurfaceStatus() {
  return glassStatusApi ? glassStatusApi.status() : [];
}
/** 子包登记入口（桥键 registerGlassStatus）：入槽即可 —— 状态是纯投影，无补做动作。 */
function glassStatusRegister(api) {
  glassStatusApi = api;
  return api;
}

// HOST_BRIDGE_BINDINGS / HOST_BRIDGE_KEYS / exports.hostBridgeKeys 见 src/host-bridge.js。
return module.exports;
