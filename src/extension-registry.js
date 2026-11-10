/**
 * extension-registry.js — 跨包「层钩子 / 面板节」注册表（P-A 的首个跨包贡献点）。
 *
 * 为什么需要它：从 P-A 起，玻璃运行时与字体节都**不再住在主 bundle 里** ——
 * 它们各自是一个**独立包**，求值与主 bundle 的先后顺序**不保证**，唯一的共同作用域是宿主
 * 经 loader 的 `require` 提供的主 bundle 导出面（ADR-0014 S5.1 / S5.4「宿主注入显式键集」）。
 * 于是"谁登记了什么"必须落在一张**共享注册表**上，而不是一个按数组顺序 import 的静态清单：
 *   · panel-tabs 按 `panelId` 问 `wePanelSectionsOf(panelId)`（屏上顺序 = (order, 注册序)）；
 *   · client.js 的挂载期只问注册表（每层的 `sync` 接 store 订阅、`dispose` 交 fiber 拆卸）。
 *
 * ## 三条硬口径
 *   ① **缺什么就抛什么**（D3③「宁可显示，不可静默消失」）：id / 描述符 / sync+dispose 缺一即抛。
 *      静默 undefined 的失效模式在屏上是"这个功能根本不存在"—— 没有报错、也没有空态提示。
 *   ② **注册期不读译文**：描述符的 `title` 是 getter（渲染时才取词），所以这里只用
 *      `'title' in descriptor` 判**有没有**，绝不取值 —— 取值会把 `weT` 拉到 bundle 求值期
 *      （那时 i18n 表可能还没内联到位）。
 *   ③ **id 唯一**：重复注册 = 同一份 bundle 被求值两次（或两个包抢同一个 id），当场抛。
 *      HMR/重挂不会走这条路 —— loader 有模块缓存，工厂体一辈子只求值一次。
 *
 * 本文件必须**浏览器安全**（无 import / require / Node API），且**不得有顶层可执行语句**
 * 读 client.js 的 const（会被内联到 bundle 顶部，撞 TDZ）。
 * 挂载台（test/verify-scene-live.mjs）按文件 import 本模块，因此导出面**必须是真导出**。
 */
/** id → { sync, dispose }。 */
const weLayerHookTable = new Map();
/** 挂载期由 client.js 装上的「把某一层的 sync 接上 + 立刻对时」函数；未挂载时为 null。 */
let weLayerAttacher = null;
/** 挂载期由 client.js 装上的「注册表变了，重画面板」回调（迟到注册时用）。 */
let weRegistryListener = null;
/** 面板节注册表：panelId → Map(sectionId → { descriptor, seq })。 */
const wePanelSectionTable = new Map();
/** 面板节注册序（order 相同时按它 —— 同上，跨包求值顺序不是契约）。 */
let wePanelSectionSeq = 0;
/** 挂载期由 client.js 装上的「面板节注册表变了，重画面板」回调；未挂载时为 null。 */
let wePanelSectionListener = null;

/** 面板节的默认排序位（口径同上：没写 `order` 的节排在显式项之后，仍在注册序内稳定）。 */
const WE_PANEL_SECTION_DEFAULT_ORDER = 100;

function weRegistryFire() {
  if (typeof weRegistryListener === "function") {
    try { weRegistryListener(); } catch { /* 面板重画失败不许把注册链带崩 */ }
  }
}

/**
 * 登记一个**页签内的节**（P-C：外观页签的「全局字体」节搬进 packages/fonts 之后，
 * 屏上位置不能靠"主 bundle 里那个数组的第 6 项"来钉，只能靠注册表）。
 *
 * 三条硬口径与层钩子那套**逐条同形**（缺什么抛什么 / 注册期不读译文 / id 唯一），
 * 多出来的两条是本面特有的：
 *   · `render` **缺一即抛**：没有渲染器的节在屏上是"这一节凭空没了"—— 没有报错、也没有空态；
 *   · 顺序 = (order, 注册序)：跨包求值顺序不保证，所以顺序只能由描述符声明。
 *
 * @param {string} panelId 页签 id（如 "appearance"）
 * @param {string} sectionId 节 id（React key；也是同一页签内去重的键）
 * @param {{ id: string, title: string, order?: number, render: Function }} descriptor
 * @returns {object} 同一个描述符（便于链式写法）
 */
function weRegisterPanelSection(panelId, sectionId, descriptor) {
  if (typeof panelId !== "string" || panelId === "") {
    throw new Error("[wallpaper-engine] 面板节 panelId 必须是非空字符串");
  }
  if (typeof sectionId !== "string" || sectionId === "") {
    throw new Error("[wallpaper-engine] 面板节 sectionId 必须是非空字符串");
  }
  if (!descriptor || typeof descriptor !== "object") {
    throw new Error("[wallpaper-engine] 面板节 " + panelId + "/" + sectionId + " 的描述符必须是对象");
  }
  if (descriptor.id !== sectionId) {
    throw new Error("[wallpaper-engine] 面板节 id 不一致：注册 " + panelId + "/" + sectionId
      + "，描述符 id = " + JSON.stringify(descriptor.id));
  }
  if (!("title" in descriptor)) {
    throw new Error("[wallpaper-engine] 面板节 " + panelId + "/" + sectionId + " 缺 title（面板要拿它当节名）");
  }
  if (typeof descriptor.render !== "function") {
    throw new Error("[wallpaper-engine] 面板节 " + panelId + "/" + sectionId
      + " 缺 render 函数 —— 没有渲染器的节在屏上是「凭空消失」，不是空态");
  }
  let sections = wePanelSectionTable.get(panelId);
  if (!sections) {
    sections = new Map();
    wePanelSectionTable.set(panelId, sections);
  }
  if (sections.has(sectionId)) {
    throw new Error("[wallpaper-engine] 面板节重复注册：" + panelId + "/" + sectionId
      + "（同一份 bundle 求值两次，或两个包抢同一个 id）");
  }
  wePanelSectionSeq += 1;
  sections.set(sectionId, { descriptor, seq: wePanelSectionSeq });
  wePanelSectionFire();
  return descriptor;
}

/** 屏上顺序 = (order, 注册序)：跨包求值顺序不保证，所以顺序只能由描述符声明。 */
function wePanelSectionsOf(panelId) {
  const sections = wePanelSectionTable.get(panelId);
  if (!sections) return [];
  return Array.from(sections.values())
    .sort((a, b) => {
      const ao = typeof a.descriptor.order === "number" ? a.descriptor.order : WE_PANEL_SECTION_DEFAULT_ORDER;
      const bo = typeof b.descriptor.order === "number" ? b.descriptor.order : WE_PANEL_SECTION_DEFAULT_ORDER;
      return ao === bo ? a.seq - b.seq : ao - bo;
    })
    .map((e) => e.descriptor);
}

/** 面板节注册表的变更回调：专用的那个装了就用它，否则退回通用的（至少要有一次重画）。 */
function wePanelSectionFire() {
  const fn = typeof wePanelSectionListener === "function" ? wePanelSectionListener : weRegistryListener;
  if (typeof fn === "function") {
    try { fn(); } catch { /* 面板重画失败不许把注册链带崩 */ }
  }
}

/** 挂载期装上/摘下「面板节注册表变了 ⇒ 重画面板」的回调（同上，由 client.js 成对设置）。 */
function weSetPanelSectionListener(fn) {
  wePanelSectionListener = typeof fn === "function" ? fn : null;
}

/**
 * 登记一条**行为层**钩子（玻璃运行时这样的"活着的东西"）。
 * `sync` 与 `dispose` **缺一即抛**：只有 sync 的层会留在屏上，只有 dispose 的层从不显形。
 * 迟到注册（子包产物在插件挂载之后才求值）由 attacher 立刻补接，不用等下一次挂载。
 */
function weRegisterLayerHooks(id, hooks) {
  if (typeof id !== "string" || id === "") {
    throw new Error("[wallpaper-engine] 层钩子 id 必须是非空字符串");
  }
  if (!hooks || typeof hooks !== "object") {
    throw new Error("[wallpaper-engine] 层钩子 " + id + " 必须是对象");
  }
  if (typeof hooks.sync !== "function" || typeof hooks.dispose !== "function") {
    throw new Error("[wallpaper-engine] 层钩子 " + id + " 必须同时给 sync 与 dispose —— "
      + "缺一个就会留下一条只显形不收尾（或只收尾不显形）的层");
  }
  if (weLayerHookTable.has(id)) {
    throw new Error("[wallpaper-engine] 层钩子 id 重复注册：" + id);
  }
  weLayerHookTable.set(id, hooks);
  if (typeof weLayerAttacher === "function") {
    try { weLayerAttacher(id, hooks); } catch { /* 补接失败不许把注册链带崩（挂载期那次会再报） */ }
  }
  weRegistryFire();
  return hooks;
}

/** [id, hooks] 列表（挂载/拆卸期遍历用；顺序 = 注册序）。 */
function weLayerHooks() {
  return Array.from(weLayerHookTable.entries());
}

/** 挂载期装上/摘下「补接一条迟到的层钩子」的函数（由 client.js 在 ctx.effect 里成对设置）。 */
function weSetLayerAttacher(fn) {
  weLayerAttacher = typeof fn === "function" ? fn : null;
}

/** 挂载期装上/摘下「注册表变了 ⇒ 重画面板」的回调（同上，由 client.js 成对设置）。 */
function weSetRegistryListener(fn) {
  weRegistryListener = typeof fn === "function" ? fn : null;
}

export {
  weRegisterPanelSection,
  wePanelSectionsOf,
  weSetPanelSectionListener,
  weRegisterLayerHooks,
  weLayerHooks,
  weSetLayerAttacher,
  weSetRegistryListener,
};
