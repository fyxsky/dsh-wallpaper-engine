/**
 * component-visibility.js — 组件行**浏览器可见面**的声明单一真源（ADR-0013 D3②）。
 *
 * 回答的问题：**关掉一个组件行之后，浏览器半边的哪些渲染函数该整块不渲染**。
 * 这张表与**实现双向对账**（判据 `test/verify-component-visibility.mjs`）：声明了没 gate、
 * gate 了没声明，两个方向都红 —— 少了这份对账，两个方向都是静默通过，
 * 用户看到的是"关掉了却还显示"或"没声明的东西被顺手藏了"。
 *
 * ── 当前状态：**表是空的**（瘦身分支）──────────────────────────────────────────
 * 原来登记的两行 `about-notice`（关于页 / 更新公告）与 `mascot-avatar`（吉祥物立绘 / 会话头像）
 * 已随对应功能整体删除 ⇒ 可见面声明不再有落点。表**刻意保留**（连同下面的 gate 契约）：
 *   · `lib/index.js` 再导出本文件，`test/verify-reachability.mjs` 的「零不可达文件」棘轮
 *     要求它仍在 import 图上；
 *   · 将来再加组件行时，这一页仍是"组件名 → 浏览器渲染落点"的唯一声明处（D3②：浏览器侧
 *     不许再写第二份清单，状态面由宿主 `/inventory` 的 `components` 给）。
 *
 * ── 落点格式与 gate 契约（判据按这个文本形态认，改形态要同步改判据）──────────────
 *   `COMPONENT_VISIBILITY` = 组件名 → `[{ file, symbol }]`：
 *     · `file`   浏览器侧源文件（仓库相对路径，posix 分隔）；
 *     · `symbol` 该文件里**顶层具名函数**（`function NAME(` 或 `const NAME = (`）。
 *   每个 `(组件, file, symbol)` 三元组都必须满足：该函数体内出现一次
 *     `weComponentVisible(<提到 components 的表达式>, '<组件名>')`
 *   —— 第一个实参必须真的把状态面传进来（写死 `true` 会被判红），第二个实参必须是组件名字面量。
 *   `weComponentVisible` 的**唯一实现**在 `COMPONENT_GATE.file` 的 `COMPONENT_GATE.symbol`；
 *   它的失效口径由判据**真跑**（抽真源码 + 夹具），分两层且别混：
 *     · **整块** `components` 读不到 / 非对象 ⇒ 按"可用"渲染（D3③：探测失败不许让功能凭空消失）；
 *     · `components` 是对象时**只有 `'started'` 算可用** ⇒ **键缺席**（行被 disable 时键压根不出现）、
 *       `missing`、`failed:<…>` 一律不渲染。键缺席按"可用"会让"关掉一行"永远藏不掉。
 *
 * 纪律：本文件**零 import**（纯数据 + 契约描述），因此不可能与门面 / 组件入口成环。
 */

/**
 * 组件行 → 可见面落点（ADR-0013 D3② 的单一真源）。
 *
 * ⚠️ 瘦身分支：`about-notice` / `mascot-avatar` 两行连同功能一起删除 ⇒ **当前无登记项**。
 * 新增组件行时把它的浏览器渲染落点登记到这里（形状见文件头）。
 */
export const COMPONENT_VISIBILITY = {};

/**
 * 浏览器侧 gate 的**唯一判据**落点（名字与实现见 `src/client.js`）。
 *
 * 判据从该文件抽出这个函数的源码**真跑**一遍（三态夹具 + 两条负对照），所以它必须
 * **自包含**：只依赖自己的两个入参，不调模块级别的函数（否则真跑会抛 ReferenceError，
 * 判据如实报红并带上原因）。
 */
export const COMPONENT_GATE = { file: 'src/client.js', symbol: 'weComponentVisible' };

/**
 * **gate 的注入别名**（模块边界真实化）。
 *
 * 背景：某些浏览器侧模块必须能**单独 import**（判据要求"无 DOM 零抛错零副作用"），而
 * `COMPONENT_GATE.symbol`（唯一实现）住 `src/client.js` —— 两者只在**拼接**之后同作用域，
 * 单独 import 会 `ReferenceError`（实测真实回归）。这类模块改为**接收注入**，于是出现了
 * "同一 gate 的第二个调用名"。
 *
 * ⚠️ 别名必须**从规范 gate 注入而来**，判据强制：`GATE.file` 里必须存在
 * `<injectedBy>(<GATE.symbol>)` 的注入调用；否则别名就是"绕过 gate 的自由补丁"，判红。
 * ⚠️ 瘦身分支：两条别名都已随功能删除 —— `avatarComponentVisible`（`src/avatar-layer.js`）与
 *   `weComponentVisibleOf`（`src/panel-tabs.js` 里 gate 那两个页签渲染器）。⇒ **当前无别名**；
 *   规范 gate（`COMPONENT_GATE`）本身仍在 `src/client.js`，注入点在它的
 *   `globalThis.__weComponentVisible = weComponentVisible`。
 */
export const COMPONENT_GATE_ALIASES = [];
