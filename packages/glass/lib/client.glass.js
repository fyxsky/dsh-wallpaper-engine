window.__ModuleLoader__.load({
	id: "dsh-we-slim-glass",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const host = require("dsh-we-slim");
				// ── 内联模块：packages/glass/src/glass-css.js —— 玻璃样式表（ADR-0016 第四刀）：ADR-0016 第四刀迁入：CSS_GLASS 由入口的 ensureGlassCss() 在求值期注入独立 <style data-plugin-css> 标签（主包 sheet 之后）（构建期注入；勿手改本段）──
				/**
				 * glass-css.js —— 玻璃样式表（ADR-0016 第四刀：玻璃 CSS 随包走）。
				 *
				 * 内容 = 原主包 styles 域模块（含已出户的 styles-sidebar.js）里的**全部玻璃段**，按原层叠顺序拼接：
				 *   可读性下限常量 → 玻璃域 body 变量块（地板 / follow-tint / 釉光）→ 页面玻璃总锚点（--dsw-*
				 *   令牌映射 + markdown 家族）→ mica 近不透明接管 → iOS 液态玻璃（对话区 / 思考块 / composer /
				 *   轨迹 / 吸顶条 / 正文原生挡）→ 左栏 / 四角圆角 / 标题栏 / better-sidebar / 官方右栏 / 内容面 →
				 *   declared 面 + 设置整窗玻璃 + 插件源浮层霜 → 软件渲染回退 → 侧栏全透明。
				 * 模板内容 = CSS_GLASS；注入顺序（主包 sheet 之后）决定层叠关系，规则本身不再复制到主包。
				 *
				 * 注入（packages/glass/src/client.js）：求值期 ensureGlassCss() 写独立 <style data-plugin-css>
				 * 标签。主 bundle 先求值、本包后求值 ⇒ 玻璃 sheet 排在主包 sheet **之后**，与搬移前的层叠关系
				 * 同构（回退块压配方、配方压令牌映射的相对顺序不变）；玻璃行停用 ⇒ 本 bundle 不被加载 ⇒
				 * 玻璃 sheet 整体消失 = 宿主回原生（ADR-0016 D2 的完整语义）。
				 *
				 * 拼装契约：本文件只有一个模板 CSS_GLASS（守卫的 cssBodyOf 按「主产物 + 玻璃产物」双工件
				 * 拼接读取，顺序 = 本文件在玻璃包配方 inline[] 里的位置）。浏览器安全、纯数据、无顶层副作用
				 * （注入动作在入口，不在这里）。
				 */
				// ── Text-surface readability floor (upstream #82) ───────────────────────────
				// The wallpaper may be dimmed/blended so it "does not dominate", but TEXT MUST
				// STAY READABLE. IDEA's background-image feature has ONE knob (image opacity)
				// and still "just works" because the image always sits BEHIND the editor /
				// tool-window surfaces, which keep a background of their own
				// (https://www.jetbrains.com/help/idea/setting-background-image.html). This
				// plugin lacked exactly that structural property: every text-bearing surface
				// was painted as glass colour @ --we-glass-alpha, and in dark mode that alpha
				// is additionally multiplied by 0.4 — worst case 0.03 × 0.4 = 0.012, i.e. no
				// frost at all, so conversation text scrolling behind the composer read
				// straight through.
				//
				// The floor is a THEME-BASE LAYER composited OVER that glass tint at a fixed
				// weight no slider can lower: the tint's alpha only scales the other operand,
				// so the effective coverage is floor + a·(1−floor) ≥ floor. Clamping the tint
				// alpha itself with max() cannot work here — in dark mode the tint is a WHITE
				// glaze, so over the brightest plausible wallpaper pixel the surface composites
				// to white at ANY alpha and white body text keeps exactly 1.00:1 (the measured
				// before row below). In light mode such a clamp would work but would have to
				// sit at 0.44, above every alpha the slider can reach (max 0.25) — it would
				// flatten the slider completely. The theme-base layer fixes both themes and
				// keeps the slider alive above the floor.
				//
				// Both values come from measurement (test/verify-readability.mjs recomputes
				// the same grid): 玻璃透明度 {0,15,30,45,60} × theme {light,dark} ×
				// 壁纸透明度 {0,50,90}, theme text colour (light #000 / dark #fff) against the
				// surface composited onto the worst-case backdrop (light: darkest plausible
				// wallpaper pixel #000; dark: brightest #fff):
				//   light  exact 0.44194 → 0.45   worst case 4.63:1  (bubble @ 玻璃透明度=60)
				//   dark   exact 0.58136 → 0.59   worst case 4.63:1  (settings layer-3 @ 0)
				// The floor is independent of 壁纸透明度: it never reads --we-wallpaper-opacity,
				// which keeps affecting .we-layer only. Values are interpolated into the CSS
				// below so the stylesheet and this comment can never drift apart.
				const READABILITY_FLOOR = 0.45;
				const READABILITY_FLOOR_DARK = 0.59;

				const CSS_GLASS = `

				  /* ── 文字面可读性下限 (text-surface readability floor, #82) ───────────────
				     动机、IDEA 模型与 4.5:1 目标见 JS 的 READABILITY_FLOOR 注释（数值的唯一
				     来源，下面用模板插值注入，二者不会漂移）。写法：每个承载文字的面都从
				         <原玻璃色 @ 原 alpha>
				     变成
				         color-mix(in srgb, <主题底色> floor%, <原玻璃色 @ 原 alpha> (1-floor)%)
				     —— color-mix 在预乘空间按权重插值，权重会乘上操作数自身的 alpha，
				     所以这条声明恰好等于「主题底色 @floor 压在 原玻璃色 之上」：
				         effective alpha = floor + a_glass × (1 − floor) ≥ floor
				     玻璃透明度 与 暗主题的 ×0.4 只改 a_glass（另一项权重），floor 这一项
				     固定不动 —— 下限因此不可能被滑杆削弱；floor 之上仍是原来的玻璃配方，
				     只是压了一层主题底色（壁纸在亮/暗极端像素处不再吃掉文字）。
				     --we-wallpaper-opacity 不参与本层：壁纸透明度仍只作用于 .we-layer。 */
				  /* 染色地板：--we-readability-base 是玻璃色经亮度钳制后的按主题版本
				     （effects.js 的 weClampSurfaceColor 计算、--we-surface-tint-* 注入）
				     —— 色相跟随用户选择，亮度钳制保住 #82 的 ≥4.5:1 正文判据。缺省回落原值。
				     玻璃保真度（glassFidelity，默认 100）：--we-readability-floor = floor 常量
				     × --we-glass-fidelity（glass-layer.js 注入 0–1，缺省 1 = 现状、任何旧设置文件
				     无此键时也不变）。拉低保真度 = 地板覆盖度同比例减薄 + 釉色向用户原色回退
				     （回退在 effects.js 的 weClampSurfaceColor 第三参），颜色更贴用户原色、
				     正文可读性让位 —— 这是唯一的权衡旋钮。 */
				  body {
				    --we-readability-floor-base: ${READABILITY_FLOOR};
				    --we-readability-floor: calc(var(--we-readability-floor-base) * var(--we-glass-fidelity, 1));
				    --we-readability-base: var(--we-surface-tint-light, #ffffff);
				    /* 对话栏专属的一对（独立保真度旋钮 chatGlassFidelity）：**只**被对话栏的框架
				       玻璃面消费 —— 气泡（--dsw-specific-bubble）与输入卡片（--dsw-specific-input-major，
				       含读同一 token 的工具弹卡）。正文里的 markdown 内容面（代码块 / 行内代码 /
				       标签 / 引用）**不**跟本旋钮：它们是内容渲染面，与侧边栏一起跟全局保真度
				       （用户口径：代码块不和输入框一起）。缺省 1 = 与全局完全同值。 */
				    --we-chat-readability-floor: calc(var(--we-readability-floor-base) * var(--we-chat-glass-fidelity, 1));
				    --we-chat-readability-base: var(--we-chat-surface-tint-light, #ffffff);
				    /* ⚠️ 这两条必须排在 --we-readability-base **之后**：verify-readability 的 F1c 按
				       "floor 紧跟 base" 的正则取这两条声明（插在中间会让整条可读性网格读到 null）。
				       侧栏「跟随全局」用的玻璃色：与其余面板**同一个**按主题钳制后的染色地板值 ——
				       内联写死会盖掉"按主题"，所以由样式表给；effects 里只写 var(--we-follow-tint)。
				       侧栏的釉（镜面渐变三档）也收在这里：原生左栏与 dsh-better-sidebar 两侧栏共用同一道，
				       否则"跟随全局"之后两侧栏仍会差一层白釉。 */
				    --we-follow-tint: var(--we-surface-tint-light, #ffffff);
				    --we-panel-sheen-a: 0.10; --we-panel-sheen-b: 0.03; --we-panel-sheen-c: 0.05;
				  }
				  body[data-ds-dark-theme] {
				    --we-readability-floor-base: ${READABILITY_FLOOR_DARK};
				    --we-readability-floor: calc(var(--we-readability-floor-base) * var(--we-glass-fidelity, 1));
				    --we-readability-base: var(--we-surface-tint-dark, #0d1524);
				    --we-chat-readability-floor: calc(var(--we-readability-floor-base) * var(--we-chat-glass-fidelity, 1));
				    --we-chat-readability-base: var(--we-chat-surface-tint-dark, #0d1524);
				    --we-follow-tint: var(--we-surface-tint-dark, #0d1524);
				    --we-panel-sheen-a: 0.07; --we-panel-sheen-b: 0.02; --we-panel-sheen-c: 0.03;
				  }

				  /* ── 页面玻璃总锚点（data-we-glass-page）——**与有没有壁纸无关** ───────────────
				     由 packages/glass/src/glass.js 恒挂（插件启用即挂，与 data-we-glass-chat / -window / -floaters
				     同族）。壁纸只是玻璃的**背景来源**之一，不是玻璃的前提：没有壁纸时玻璃面照旧
				     拿到地板色 / 霜 / 釉光 / 发丝边，压在宿主自己的基色与内容之上（用户口径：
				     「页面玻璃效果不设置壁纸也要生效」）。
				     ⚠️ 本锚点**不**等于 data-we-wallpaper：后者是"页面让开、露出壁纸层"，前者是
				     "玻璃配方生效"。两者正交 —— 壁纸在场时同时成立，无壁纸时只有本锚点。
				     raise border alpha for visibility, and apply the frosted-glass effect to
				     opaque surfaces. */
				  body[data-we-glass-page] {
				    /* ── 表面令牌（#80）——在**令牌源头**接管，不逐面补选择器 ────────────────────
				       宿主的对话框 / 面板 / 抬高按钮面读的都是别名层：--dsw-alias-bg-layer-1/2/3 是
				       面板梯度（浅色三层同为白；深色 bluish-875/850/800 逐层抬亮），
				       --dsw-alias-button-elevated-fill 是「抬高按钮」的实色（侧栏「新建会话」、
				       工作区重命名输入框 —— 上游 #71 报的那类没玻璃的按钮）。它们保持宿主实色时，
				       壁纸既透不出来、也没有自己的模糊，只有设置窗口那三档被接管过。
				       这里套用**与设置窗口同一张配方表**：主题底色压可读性下限 + --we-surface-tint-light/dark
				       按 --we-glass-alpha 混合，三档沿用 0.9 / 1.0 / 1.1 的层权重，抬高按钮再高半档
				       （深色主题下必须比 layer-3 更亮，否则按钮与容器压平成同一块玻璃）。于是
				       玻璃透明度 / 玻璃颜色 对 harness 自带的面同样生效，无需知道任何 CSS 模块哈希。
				       代码块家族（--dsw-alias-markdown-code-block(-banner)）与行内代码 / 标签 / 分段
				       同属下面「markdown 代码块 / 行内代码」那段映射 —— 裁定档案 harness-ui-surfaces.json 同源。
				       ⚠️ 作用域是**整个页面玻璃锚点**，不是聊天流：宿主自己的侧栏按钮、右栏页签栏、
				       设置窗内的卡片都读这一族令牌。5cabb9e1 的「表面所有权」重构曾把这里收窄成
				       :where([data-chat-flow])，这些面于是全部退回宿主实底（用户原话：「这些我用红色
				       矩形框选的类型的组件的玻璃效果又丢失了」）。已恢复为页面级；第三方插件的可读性
				       由每条 color-mix 里的 --we-readability-floor 兜住，不是"无下限透明"。 */
				    --dsw-alias-bg-layer-1: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-2: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-3: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-elevated-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    /* ── 全表面玻璃（issue #71 的 glass-patch.css 收编）─────────────────────────
				       覆盖壳层**其余**能画出实色面的别名 token（浮起按钮、弹层、工具条、引用块、
				       占位图…），治的是「个别面仍是突兀实色块」。层权重沿用那份补丁的角色分档，
				       但**每条都包上可读性下限**（补丁的裸 rgba 在花壁纸上会把菜单文字直接露给
				       壁纸 —— 与 #82 同一条教训）。语义状态色（button-info-fill 等）与 accent 系
				       按补丁原文**保持原生**。 */
				    --dsw-alias-bg-overlay: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.3 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-module-platform: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-multi-select: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.2 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-floating-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-ghost-active-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-tool-bar-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-interactive-bg-active: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-interactive-bg-hover-solid: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-citation: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.9)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-placeholder: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 1.1)) calc((1 - var(--we-readability-floor)) * 100%));
				    /* ── markdown 代码块 / 行内代码（"重点文字"）的底：与气泡**同一张配方表** ──────────
				       用户口径（现场要求）："代码块和重点文字背景也需要和对话框背景一样进行玻璃化覆盖"。
				       把底**纳入同一条可读性下限**（不能只做透明化：代码块底是 shiki 固定配色的画布，
				       直接透出壁纸会让注释 / 字符串掉到不可读的对比）：
				       底 = 主题底色@下限 + 玻璃色@玻璃透明度，而 shiki 的**前景色一个都不动** ——
				       玻璃感进来了，最坏情况的对比仍由下限兜住（与气泡 / 输入卡片逐字同一条公式；
				       下限的数学与实测见 test/verify-readability.mjs 的文件头）。
				       ⚠️ 宿主这几条别名不是层令牌的派生（实测是 --dsw-static-neutral-bluish-50/900
				       这类**静态**调色板），"映射层令牌"那条路对它们无效，两者不重叠。
				       层权重：**代码块与标题条 = 气泡那一档（0.8 / 0.4）**（用户要的就是"和对话框一样"）；
				       **行内代码 / 标签 / 未选中的分段 = 高一档（1.0 / 0.5）** —— 小色块要"比底稍亮"
				       才留得住"这是一枚 chip"的读法（与抬高按钮高半档同一条层权重规矩）。 */
				    --dsw-alias-markdown-code-block: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.8)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-code-block-banner: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.8)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-inline-code: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-tag: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-code-segment-unselected: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    /* 选中的分段（代码卡的多文件页签）：**再高一档（1.15，与抬高按钮同档）** ——
				       选中态靠"比未选中的那枚更亮"读出来，而不是靠回到实色（实色在这张玻璃卡上像一块白板）。 */
				    --dsw-alias-markdown-code-segment-selected: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 1.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    /* Border emphasis: neutral gray so it reads on both light and dark themes;
				       alpha is driven by the "边框" slider through --we-border-alpha. */
				    --dsw-alias-border-l1: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l2: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l2-darkmode-thin: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    /* #255④：l3/l4 此前没纳入「边框」滑杆（宿主用它们画次级/浮层描边）⇒ 滑杆只“管到一部分边框”。 */
				    --dsw-alias-border-l3: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l4: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				  }
				  /* DSH rc.7+ injects the theme palette (design-platform.css) as a plugin-owned
				     stylesheet appended to <head> AFTER this one, so in dark mode the shell's
				     body[data-ds-dark-theme] rules (equal specificity 0,1,1, later in the
				     document) win the cascade and repaint the app frame / sidebar / borders
				     with their opaque dark colors — hiding the wallpaper behind them. Repeat
				     the transparency + border-emphasis overrides under the higher-specificity
				     dark selector (0,2,1) so the wallpaper always wins regardless of stylesheet
				     order. */

				  /* 深色档的**页面玻璃**映射：与上面那块逐条同形（同一张配方表、同一组层权重），
				     只有玻璃色的**缺省值**不同：深色玻璃底色是深海军蓝。 */
				  body[data-ds-dark-theme][data-we-glass-page] {
				    --dsw-alias-bg-layer-1: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-2: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-3: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-elevated-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    /* 全表面玻璃的深色档（issue #71，与浅色逐条同形；层权重见浅色块的注释）。 */
				    --dsw-alias-bg-overlay: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.3 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-module-platform: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-multi-select: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.2 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-floating-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-ghost-active-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-button-tool-bar-fill: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-interactive-bg-active: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-interactive-bg-hover-solid: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.5) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-citation: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) * 0.9)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-placeholder: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) * 1.1)) calc((1 - var(--we-readability-floor)) * 100%));
				    /* ── markdown 代码块家族的深色档 ──────────────────────────────────────────
				       与浅色档逐条同形（公式 / 层权重逐字一致，只有 tint 换 --we-surface-tint-rgb-dark）：
				       深色模式下宿主的静态黑画布会按级联赢回（浅色档 0,1,1 撞不过宿主
				       body[data-ds-dark-theme] 的后置同权重规则），代码块整块黑底 ⇒ 必须在此逐条覆盖。 */
				    --dsw-alias-markdown-code-block: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) * 0.8)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-code-block-banner: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) * 0.8)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-inline-code: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-tag: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-code-segment-unselected: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-markdown-code-segment-selected: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) * 1.15)) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-border-l1: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l2: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l2-darkmode-thin: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    /* #255④：l3/l4 此前没纳入「边框」滑杆（宿主用它们画次级/浮层描边）⇒ 滑杆只“管到一部分边框”。 */
				    --dsw-alias-border-l3: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    --dsw-alias-border-l4: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				  }
				  /* ── 浮层不吃页面玻璃那张令牌映射（issue #161 的漏网形态）─────────────────────────
				     上面两处在令牌源头把面板梯度改成「底色压可读性下限 + 玻璃色」的半透明配方：对面板
				     正确（背后只有壁纸），对浮层错误 —— 浮层背后是界面自己的正文，任何 < 100% 的覆盖
				     都会让底下那行字透上来，表现成「两行字叠在一起」的重影。#161 只豁免了气泡那几条
				     填色规则、没豁免令牌映射，本组补的就是这道缺的豁免。
				     判据不能只取 role（dsh-context 只在部分浮层实例上写 role：趋势图与耗时时间轴的
				     tip 都没写）⇒ 同时认浮层的命名约定。子串匹配有意不区分大小写：宿主哈希类名是
				     camelCase（KZf9OG_brokenTip），只匹配 -tip 会漏；误伤面（multiply 这类）的后果
				     只是令牌在它上面被重声明，只有它真拿该令牌当底才有观感差异。
				     底色取 --we-panel-color（主题感知），一条规则同时覆盖深浅两主题，且与浮层文字
				     （宿主与第三方都读 --dsw-alias-label-primary）维持原生配对。不要改借宿主 Tooltip
				     那对专用令牌 —— 那是「深底 + 固定近白字」，浅色主题下浮层会变成黑底黑字。 */
				  body[data-we-glass-page] [role="tooltip"],
				  body[data-we-glass-page] [role="menu"],
				  body[data-we-glass-page] [role="listbox"],
				  body[data-we-glass-page] [class*="tip" i],
				  body[data-we-glass-page] [class*="hint" i],
				  body[data-we-glass-page] [class*="float" i],
				  body[data-we-glass-page] [class*="popover" i],
				  body[data-we-glass-page] [class*="hovercard" i],
				  body[data-we-glass-page] [class*="dropdown" i],
				  body[data-we-glass-page] [class*="popup" i] {
				    --dsw-alias-bg-layer-1: color-mix(in srgb, var(--we-panel-color, #1e1f26) 96%, transparent);
				    --dsw-alias-bg-layer-2: color-mix(in srgb, var(--we-panel-color, #1e1f26) 96%, transparent);
				  }
				  /* 第二类漏网：既没有 role、类名也不含浮层约定词的面板浮层（dsh-market 的 .opPanel、
				     @linxin666 插件管理器的更新面板）。判据取源码级属性优先（[data-update-panel]），
				     CSS Module 名只作兜底（[class*="opPanel"]：哈希前缀随构建变，语义后缀才稳）。
				     这里不给令牌、直接给不透明实底：三步探针证明选择器命中、该元素也是视觉容器，但
				     令牌赋值在这两个元素上不落地（92% / 96%、带不带 !important 都试过）。浮层本来
				     就不该玻璃化（#161 的口径），实底既满足可读性又少一层不确定性 —— 别把这两条
				     「优化」回令牌或 alpha 写法，否则它们会重新变透。
				     [data-install-registry]（插件源 fieldset）不放进本组：它属于「浮层玻璃」面的成员，
				     W5 要求整面同锚点（data-we-glass-floaters），混进来会让 verify-glass-surfaces 判红；
				     它的底色归 floaters 面那条既有规则管（见 lib/client.js 的 #156② 注释）。 */
				  body[data-we-glass-page] [data-update-panel],
				  body[data-we-glass-page] [class*="opPanel" i] {
				    background-color: #ffffff !important;
				  }
				  body[data-ds-dark-theme][data-we-glass-page] [data-update-panel],
				  body[data-ds-dark-theme][data-we-glass-page] [class*="opPanel" i] {
				    background-color: #1e1f26 !important;
				  }
				  /* #73 增强模式 + Win10（无 Mica）：桌面外壳只在系统材质可用时让左侧工作区
				     (.dshDesktopSidebarSurface) 保持透明（壁纸透出）；material 回退 off 时它改用
				     --dsw-alias-bg-layer-1 实心绘制该区域，并把内部 sidebar 的
				     --dsw-specific-sidebar-fill 也改成实心色 —— 壁纸在这里完全不生效，只剩一块与
				     系统材质绑定的死底色。detectMicaSupport() 把「无 Mica」作为稳定钩子挂到
				     body[data-we-mica="off"]，这里用插件自己的近不透明玻璃面接管该区域：配方与
				     无 backdrop-filter 的内容面回退完全一致（主题面板色 + --we-content-surface-alpha，
				     由「内容面透明度 / 内容面底色」控制，默认 70% 不透明，壁纸仍有一层微光），
				     同时放行内部 fill token，让这块面重新与壁纸 + 暗化层同步。Mica 可用时该属性
				     不存在，本规则不参与匹配，行为与今天逐字节相同。
				     整条规则再经 [data-we-adapter^="desktop-"] 门控：壳层材质只可能是桌面壳的
				     事，原生浏览器形态（body[data-we-adapter="browser"]）不参与匹配。 */
				  body[data-we-adapter^="desktop-"][data-we-mica="off"][data-we-wallpaper] .dshDesktopSidebarSurface {
				    --dsw-specific-sidebar-fill: transparent !important;
				    background-color: color-mix(in srgb, var(--we-content-surface-color, var(--we-panel-color, #1e1f26)) max(calc(var(--we-readability-floor) * 100%), var(--we-content-surface-alpha, 88%)), transparent) !important;
				  }
				  /* ── iOS liquid glass ──────────────────────────────────────────────────────
				     The opaque conversation surfaces become translucent glass. The recipe is
				     Apple-like, not a plain blur:
				       - LARGE-radius blur + a modest constant saturation + brightness/contrast
				         lift, so the wallpaper colour melts into a soft glow instead of a gray
				         smear (saturation is DECOUPLED from the blur radius — see GLASS_SATURATE
				         in applyEffects — so a big radius no longer amplifies the residual
				         wallpaper text into a colour ghost);
				       - a top-weighted specular gradient (background-image) — the sheen is
				         what makes the surface read as "wet glass", not a flat tint;
				       - a light, low-alpha base (not a dark one) so the wallpaper shows through;
				       - a 1px top refraction highlight + 0.5px hairline + soft elevation
				         shadow for "thick glass";
				       - --we-blur drives the blur radius (the 玻璃 slider's one job now) and
				         --we-saturate is a flat material constant, so composer, bubbles AND the
				         better-sidebar shell stay in one uniform liquid look at every radius.

				     Transparency is driven through the design tokens the surfaces already read
				     (--dsw-specific-input-major on the composer card, --dsw-specific-bubble on
				     message bubbles) rather than through class selectors: CSS-module class
				     names are build hashes and change whenever the shell frontend is rebuilt,
				     which silently kills the effect. backdrop-filter cannot be expressed as a
				     token, so the blur itself still needs an element selector — [data-composer-card]
				     is authored in the shell source and survives rebuilds. Bubbles carry no such
				     attribute, so they fall back to the module-CSS suffix convention; if that
				     ever stops matching the bubble stays translucent, just without the blur.
				     Both tokens carry text, so both go through the readability floor (the
				     composer card AND the tool popups that read --dsw-specific-input-major). */
				  body[data-we-glass-page] {
				    --dsw-specific-input-major: color-mix(in srgb,
				      var(--we-chat-readability-base) calc(var(--we-chat-readability-floor) * 100%),
				      rgba(var(--we-chat-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15)) calc((1 - var(--we-chat-readability-floor)) * 100%));
				    --dsw-specific-bubble: color-mix(in srgb,
				      var(--we-chat-readability-base) calc(var(--we-chat-readability-floor) * 100%),
				      rgba(var(--we-chat-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.8)) calc((1 - var(--we-chat-readability-floor)) * 100%));
				  }
				  body[data-ds-dark-theme][data-we-glass-page] {
				    /* The ×0.4 / ×0.33 factors below only scale the TINT operand; the floor
				       keeps its own weight, so the dark-theme undercut cannot happen. */
				    --dsw-specific-input-major: color-mix(in srgb,
				      var(--we-chat-readability-base) calc(var(--we-chat-readability-floor) * 100%),
				      rgba(var(--we-chat-surface-tint-rgb-dark, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.4)) calc((1 - var(--we-chat-readability-floor)) * 100%));
				    --dsw-specific-bubble: color-mix(in srgb,
				      var(--we-chat-readability-base) calc(var(--we-chat-readability-floor) * 100%),
				      rgba(var(--we-chat-surface-tint-rgb-dark, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) * 0.33)) calc((1 - var(--we-chat-readability-floor)) * 100%));
				  }
				  /* Chat glass is explicitly transparent: use the user's tint alpha once.
				     Shared host tokens retain their floors for popups and other app surfaces. */
				  body[data-we-glass-page] {
				    --we-chat-glass-fill: rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), var(--we-glass-alpha, 0.15));
				    --we-capsule-glass-fill: rgba(var(--we-capsule-tint-rgb, 255, 255, 255), var(--we-inline-code-alpha, 0.10));
				    --we-tool-glass-fill: rgba(var(--we-surface-tint-rgb-light, 255, 255, 255), calc(var(--we-glass-alpha, 0.15) + 0.06));
				    /* 历史上这里还有一条 #156③ 的 --we-composer-seat-fill（输入座位底板）；该底板已按
				       用户口径**整条撤回**（见下面 seat 那段的注释），令牌一并清掉 —— 不留死声明。
				       它进了 test/verify-glass-surfaces.mjs 的 REAPED_VARS 名单，被重新消费即红。 */
				    /* #156① 宿主 Modal 的遮罩本来就自己画 backdrop-filter: var(--dsw-mask-blur)，
				       但主题把这条令牌定义成**裸 body** 上的 none（即宿主默认无霜）⇒ 玻璃面板背后是
				       一张没被模糊的壁纸。这里在特异度更高的 body[data-we-glass-page] 上重声明它，
				       宿主自己的遮罩规则就会取到插件的霜 —— 一次覆盖该通道上的**所有**宿主浮层
				       （设置对话框、图片灯箱、各类 role=dialog 面板），不必逐个选择器补。
				       这是宿主**自有**的模糊通道，不是去猜它的 CSS 模块哈希。 */
				    --dsw-mask-blur: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    /* #157 滚动条拇指并入插件取色：宿主把拇指色写成四个**静态中性色**
				       （浅色 neutral-200/300、深色 neutral-700/600/550），与插件的玻璃色相无关，
				       压在玻璃面板上就显得突兀。这里在 body[data-we-glass-page] 上重声明底层四个
				       --dsw-alias-scrollbar-* 令牌 —— 宿主各处滚动容器的局部重声明写的都是
				       var(--dsw-alias-scrollbar-bg-l2) 这一层间接（自定义属性按元素解析，不是按
				       声明处解析），所以一次覆盖全应用，不需要逐个锚点补，也不碰任何类名哈希。
				       色阶仍沿用宿主那一级（可视性不变），只把中性色的**色相**换成用户选的玻璃
				       底色；浅色下取更暗一级的静态中性色，抵掉混色带来的提亮。
				       ⚠️ 权重 40% → 65%：40% 玻璃色 + 60% 灰阶在**深色低饱和**玻璃色
				       （如藏青 #0d1524）下色相被灰阶洗光 —— 拇指复算 ≈#525659，与宿主原生灰
				       （neutral-600 #545557）不可分，观感等于退回 #157 修复前（用户实测报回归）。
				       65% 让色相在任何玻璃色下都存活；亮度台阶仍由中性色锚定档决定，锚不变。 */
				    --dsw-alias-scrollbar-bg-l1: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 65%, var(--dsw-static-neutral-300, #d4d4d4));
				    --dsw-alias-scrollbar-bg-l2: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 65%, var(--dsw-static-neutral-300, #d4d4d4));
				    --dsw-alias-scrollbar-hover-l1: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 65%, var(--dsw-static-neutral-400, #a2a4a6));
				    --dsw-alias-scrollbar-hover-l2: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 65%, var(--dsw-static-neutral-400, #a2a4a6));
				  }
				  body[data-ds-dark-theme][data-we-glass-page] {
				    --we-chat-glass-fill: rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), var(--we-glass-alpha, 0.15));
				    --we-tool-glass-fill: rgba(var(--we-surface-tint-rgb-dark, 13, 21, 36), calc(var(--we-glass-alpha, 0.15) + 0.06));
				    /* 滚动条（#157）：暗主题宿主取 neutral-700/600（静态）与 600/550（悬停），混色会把整体
				       压暗，所以每档都往亮一级取，混完仍落在宿主原来的亮度台阶上（宿主 l2 与 hover-l1 同值，
				       这里同样同值）。权重 65% 同浅色档（见上：深色低饱和玻璃色的色相存活）。 */
				    --dsw-alias-scrollbar-bg-l1: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 65%, var(--dsw-static-neutral-600, #545557));
				    --dsw-alias-scrollbar-bg-l2: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 65%, var(--dsw-static-neutral-500, #7f8287));
				    --dsw-alias-scrollbar-hover-l1: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 65%, var(--dsw-static-neutral-500, #7f8287));
				    --dsw-alias-scrollbar-hover-l2: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 65%, var(--dsw-static-neutral-400, #a2a4a6));
				  }
				  /* ⚠️ 这组「气泡直接读 --we-chat-glass-fill」是**思考玻璃功能的一部分**，必须挂
				     [data-we-thinking-glass] 门 —— 否则默认态会改掉气泡的底色、并绕开「对话栏玻璃保真度」
				     的令牌契约。关 = 逐字节现状。
				     ⚠️ **输入框（[data-composer-card]）退出思考玻璃作用域**：输入卡不铺这层 fill 接管，
				     开关开 = 输入框与关着时逐位相同（只受基础对话栏玻璃与「对话框玻璃·独立配置」管）。
				     守卫：verify-glass-surfaces「思考玻璃门下不得出现 data-composer-card」。
				     ⚠️ **宿主 Tooltip 也是 *_bubble**（issue #161）：宿主把悬浮提示的元素类名编译成
				     _bubble_ + 哈希 + 序号（dsh-client-ui-primitives 的 Tooltip），与对话气泡共享
				     [class*="_bubble"] 这个后缀约定，但它是**独立浮层**：底色读 --dsw-alias-tooltip-bg
				     （浅色 #2c2c2e 实色，深色 #43454a），文字固定 --dsw-static-neutral-bluish-00（近白），
				     且**位置不受 [data-chat-flow] 约束**（可能渲染在触发元素旁）。这层 fill 覆盖上去后
				     深底变浅底、白字不变 ⇒ 白字压浅底（实测 1.07–1.13:1，见 #161）。
				     判据取宿主自己写在气泡上的 role="tooltip"（全 asar 仅出现一次，就是这一处），
				     它同时免疫类名哈希漂移与浮层 DOM 位置，比 [data-chat-flow] 作用域更可靠。
				     ⇒ **本文件所有 [class*="_bubble"] 规则都必须带这道豁免**，
				     守卫：verify-readability「F2dN 每条 _bubble 规则都必须带 role="tooltip" 豁免」——
				     这条判据以前还接受"头里有 [data-chat-flow] 就放行"，于是把某条的 :not(...) 摘掉仍全绿；
				     作用域（在对话流里）与豁免（不是宿主 Tooltip 那个 _bubble）是两件事，现在分别钉住。 */
				  body[data-we-glass-page][data-we-thinking-glass] [class*="_bubble"]:not([role="tooltip"]) {
				    background-color: var(--we-chat-glass-fill) !important;
				  }
				  /* ── 三挡的一半：「关」挡的交付物文件卡是**半透明**（用户实测回归）─────────────
				     「思考块液态玻璃」三挡的产品语义是 **关 = 半透明 / 液态玻璃 = 磨砂玻璃 / 原生 = 实色**。
				     气泡与输入框在「关」挡下本来就吃 --we-chat-glass-fill（下面那组里带
				     :not([data-we-thinking-native]) 的规则），但**宿主交付物卡片（data-presented-file）漏了
				     这一档**：它只在 data-we-thinking-glass 门下才被清成 transparent，于是「关」挡下保留
				     宿主不透明的 --deliverable-fill（暗色主题 = --dsw-static-neutral-850）⇒ 屏上一块
				     实心深色卡，与旁边半透明气泡不是同一种材质（用户原话："关闭挡位时应该是半透明的"）。
				     这里补的就是缺的那一档：**同一份 chat 釉、不加霜**（"关" = 无磨砂）。
				     · 液态玻璃挡不受影响：那条 background: transparent !important 在更后面（同权重后胜），
				       仍然是既有的"清底"形态。
				     · 原生挡不匹配（:not([data-we-thinking-native])）⇒ 卡片保持宿主实色，正是该挡的定义。
				     · 宿主 hover 档（--deliverable-hover）在本挡会被 !important 压住、卡片悬停不变色 ——
				       刻意的取舍：底色正确优先（材质一致性 + 可读性），悬停反馈由边框/光标承担。
				     ⚠️ 本段不许出现反引号：整套样式文本是模板字符串（构建期拼接）。 */
				  body[data-we-glass-chat][data-we-glass-page]:not([data-we-thinking-glass]):not([data-we-thinking-native]) [data-presented-file] {
				    background-color: var(--we-chat-glass-fill) !important;
				    background-image: none !important;
				    -webkit-backdrop-filter: none;
				    backdrop-filter: none;
				  }
				  /* ⚠️ 正文原生挡（data-we-thinking-native，见文件下方「正文原生挡」块）：只有**气泡**
				     这一条带 :not() —— 原生挡下气泡退出霜釉（正文原生 = 无玻璃装饰）；**输入卡与工具
				     弹卡不豁免**（用户口径：输入对话框保留玻璃），照旧吃霜/釉。
				     气泡这条还带第二道 :not([role="tooltip"])：这一组是**恒挂**的（默认就生效），
				     不加豁免就会给宿主 Tooltip 抹上白釉 + 模糊（#161），详见上面那条注释。 */
				  body[data-we-glass-chat][data-we-glass-page] [data-composer-card],
				  body[data-we-glass-chat][data-we-glass-page]:not([data-we-thinking-native]) [class*="_bubble"]:not([role="tooltip"]),
				  /* Interactive tool popup cards read the SAME --dsw-specific-input-major
				     token as the composer (question / plan-review / approval), so they turn
				     translucent along with it — but unlike the composer they had NO
				     backdrop-filter, so at high transparency the popup's own text sits
				     directly on the busy wallpaper → 文字重叠 (#66). Each popup renders its
				     surface as a css-module *_card child of a STABLE, source-authored
				     container attribute: [data-question-key] (ask_user_question),
				     [data-plan-review-key] (plan review / exit_plan_mode panel) and
				     [data-approval-key] (tool-permission approval card). We scope _card
				     inside those containers instead of a broad [class*="_card"] (which would
				     also blur nested *_cardBody / hovercard surfaces). */
				  body[data-we-glass-chat][data-we-glass-page] [data-question-key] [class*="_card"],
				  body[data-we-glass-chat][data-we-glass-page] [data-plan-review-key] [class*="_card"],
				  body[data-we-glass-chat][data-we-glass-page] [data-approval-key] [class*="_card"] {
				    /* Specular sheen: a top-weighted white gradient turns a flat translucent
				       tint into "wet glass" — kept faint so the wallpaper stays 通透 (clear)
				       instead of glaring. */
				    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05) 38%, rgba(255, 255, 255, 0.02));
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    box-shadow:
				      inset 0 1px 0 rgba(255, 255, 255, var(--we-glass-highlight, 0.32)),
				      inset 0 -1px 0 rgba(255, 255, 255, 0.08),
				      inset 0 0 0 0.5px rgba(255, 255, 255, 0.08),
				      0 12px 40px rgba(0, 0, 0, var(--we-glass-shadow, 0.12));
				  }
				  /* ── 思考触发条（TurnTriggerNodeView，DOM 锚点 section[data-turn-trigger]）──────────
				     ⚠️ 门 = 上游 #134 的「思考块液态玻璃」（属性 data-we-thinking-glass，默认关）：这一面是它
				     **门下的**一员 —— 开关关着时下面整组不生效（宿主令牌不被接管、模糊不挂）⇒ 「关 = 逐字节
				     现状」。与推理面不同：推理面「清底 + 无霜」（见上面那组），触发条**不清底、吃玻璃**
				     （用户口径：触发条要玻璃，不要纯透明），并给它自己的「独立配置」。
				     宿主给它一个**专属底色令牌** --dsw-alias-turn-trigger-bg（回退到代码块底色）—— 我们接管它，
				     于是宿主自己那条 background: 直接解析成玻璃（**不是**去改宿主的哈希类名）。
				     ⚠️ 用**全局**那对可读性变量（--we-readability-base / -floor + --we-surface-tint-*）：
				     这一面在登记表里是 tier: 'global'（内容块一类），而对话栏那对是**专属**给气泡/输入框的
				     —— 判据 verify-readability 的 F2c 会按"消费点计数"当场判出用错（实测踩过一次）。
				     配方与上面的 --dsw-alias-bg-layer-1 同形，层权重取 0.9。
				     ⚠️ -hover 必须一起接管：宿主 :hover 会换用它（回退是 --dsw-alias-interactive-bg-hover
				     那种不透明灰）⇒ 不接管的话鼠标一悬停就盖掉玻璃。这里给它**同一配方、权重略高**
				     （1.15，仍远不到不透明）⇒ 既保住玻璃又保留"可点"的悬停反馈。 */
				  body[data-we-thinking-glass][data-we-glass-page] {
				    --dsw-alias-turn-trigger-bg: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-thinking-trigger-alpha, var(--we-glass-alpha, 0.5)) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-turn-trigger-bg-hover: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-thinking-trigger-alpha, var(--we-glass-alpha, 0.5)) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				  }
				  /* 深色档同形，只是釉色改用深色那一支（--we-surface-tint-dark）。多一层属性选择器
				     （0,3,1）才顶得掉上面那条浅色定义 —— 与文件里其余「深色孪生」的做法一致。 */
				  body[data-ds-dark-theme][data-we-thinking-glass][data-we-glass-page] {
				    --dsw-alias-turn-trigger-bg: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #000000) calc(var(--we-thinking-trigger-alpha, var(--we-glass-alpha, 0.5)) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-turn-trigger-bg-hover: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #000000) calc(var(--we-thinking-trigger-alpha, var(--we-glass-alpha, 0.5)) * 1.15 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				  }
				  /* 模糊载体：宿主组件只有 header/body 两段文字，**不含** position:fixed 后代 ⇒ 模糊可以留在
				     元素本身（与气泡 / 工具弹卡同形；不必像 [data-composer-card] 那样搬到 ::before）。
				     底色走上面接管的 --dsw-alias-turn-trigger-bg（含 hover 档），所以这里只补
				     "釉面高光 + 模糊" 两件事 —— 语法与上面那族逐字相同，读同一批 --we-* 变量。 */
				  body[data-we-thinking-glass][data-we-glass-page] [data-turn-trigger] {
				    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05) 38%, rgba(255, 255, 255, 0.02));
				    -webkit-backdrop-filter: blur(var(--we-thinking-trigger-blur, var(--we-blur, 16px))) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-thinking-trigger-blur, var(--we-blur, 16px))) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  /* ── 输入座位（composer seat）：**不铺底板**（#156③ 于启用后撤回）─────────────
				     宿主把「输入卡 + dock 行（统计行 / 模型按钮 / ContextMeter）」一起装进
				     [data-composer-seat] 这条**整宽**的 sticky 座位（实测 110–130px 高），并给它画一条
				     「透明 → --dsw-alias-bg-base」的渐变当底板。宿主那块之所以看不出来，是因为它的
				     颜色就是**页面底色**（原生不透明 ⇒ 与整页同色、天然隐形）；插件把
				     --dsw-alias-bg-base 置成 transparent（好让壁纸透出来）之后，同一块面积就不再隐形
				     ⇒ #156③ 曾在这里补一条插件配方（独立令牌 --we-composer-seat-fill），但**几何照抄
				     宿主**（0px 渐显之后铺满整个座位）在壁纸上读成「一条很高的灰色遮罩条」（用户口径）；
				     收窄成"只铺贴底 48px 的渐隐 + 按 70% 稀释"之后，用户仍认为那一条多余 ⇒ **整条撤回**，
				     座位回到无底板（宿主那条渐变继续因为令牌被置成 transparent 而画不出东西）。
				     代价（有意接受）：最下面那条 dock 带自己没有底色，直接压在壁纸上 —— 撤回后的用户
				     口径优先于 #156③ 的"统计行需要底板"，而且这正是宿主原生模式下的观感（那边只是
				     恰好与页面同色）。
				     ⚠️ 撤回之后**不许**再把底板加回来：verify-glass-surfaces 第 ⑯ 组钉住"座位不铺任何
				     背景、也不挂霜"，已清理的 --we-composer-seat-fill 同时进了同文件的 REAPED_VARS
				     名单（被重新消费即红）。要重开这个话题，先回到用户口径确认，而不是回到 #156③ 的
				     原文（它的"症状"在这个产品口径下不算症状）。
				     ⚠️ 座位也**不许挂霜**：座位里就有 [data-composer-card]，而它内部有 position:fixed
				     后代（AI 浏览器座位，#89，见下面那段）—— 在座位上挂 backdrop-filter 会把那些
				     fixed 后代重新锚到座位上（掉约 522px）。输入卡自己那层 ::before 霜照旧。
				     ⚠️ 锚点取宿主源码里写死的 data-composer-seat / data-conversation-region
				     （conversation 包 composerSeat 的 JSX），不猜 CSS 模块哈希；[data-chat-flow] 在这
				     一面**不可用**（座位是 ChatView 那一列的兄弟节点，不在会话流里）。 */
				  /* ── composer card: the blur must not live on the card itself ─────────────
				     [data-composer-card] contains position:fixed descendants: @dsh-external/
				     dsh-webui mounts the "AI 浏览器" seat (.dsh-browser-seat-wrap) inside it with a
				     hard-coded position:fixed. A non-none backdrop-filter makes the element a
				     containing block for its fixed descendants, so that button stops being
				     viewport-anchored and drops ~522px below the card. The seat then carries
				     543px of phantom overflow, which becomes extra scrollable content in the
				     conversation scroller: by the time you reach the bottom the sticky travel is
				     already spent, so the composer is left stranded above it (#89).
				     Hosting the blur on ::before fixes it — a pseudo-element has no DOM
				     descendants, so it can never become a containing block. Same blur radius,
				     same --we-* tokens, same inset/radius → visually identical.
				     把模糊改由 ::before 伪元素承载：伪元素没有 DOM 后代，不会成为 fixed 后代的包含块。 */
				  body[data-we-glass-chat][data-we-glass-page] [data-composer-card] {
				    -webkit-backdrop-filter: none;
				    backdrop-filter: none;
				  }
				  body[data-we-glass-chat][data-we-glass-page] [data-composer-card]::before {
				    content: "";
				    position: absolute;
				    inset: 0;
				    border-radius: inherit;
				    pointer-events: none;
				    z-index: -1;
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  /* ⚠️ 用户口径：**输入框整族退出思考玻璃** ——「+」按钮回到宿主原样，
				     --dsw-specific-selector 令牌不再被插件改写。
				     守卫：verify-glass-surfaces「思考玻璃门下不得出现 data-composer-card / _add」。 */

				  /* ── 轨迹（trajectory）视图的内容区：补**霜** ──────────────────────────────
				     现场口径："轨迹内容区域也同样做玻璃化"。实测根因**不是**"没映射令牌"：轨迹模块的内容容器
				     读的就是 --dsw-alias-bg-layer-1（.rkta1W_split / _overviewPreview / _programPanel 都是），
				     而那条我们早就映射成玻璃配方了 —— 所以它其实**已经半透明**。真正缺的是**霜**：整个轨迹
				     模块**一条 backdrop-filter 都没有**（实测 289 条规则里零条），于是它在花壁纸上只是
				     "平涂的一层纱"，读起来就是"没玻璃化"（与侧栏面板当初那圈"黑框"同一类问题，只是这次缺霜不缺底）。
				     这里**只补霜 + 镜面釉，不再叠一层底**：父层已经拿到玻璃配方，再叠一层会让两层下限相乘、
				     越叠越不透明 —— 那正好把这次想要的那点通透又收回去。
				     选择器只用**轨迹模块独有**的类名子串（实测 _tablePane / _overviewPreview / _programPanel
				     全宿主只有轨迹模块在用；_details / _split 别的模块也有 ⇒ 不碰：宁可少盖一层，也不误伤别处）。
				     CSS 模块哈希是构建产物，稳定的是 "_<类名>" 这半边（与 [class*="_bubble"] / [class*="_panel"]
				     同一手法）。
				     ⚠️ 实测该模块里没有 position:fixed ⇒ 在这些元素上加 backdrop-filter 不会让 fixed 后代改锚
				     （#89 那类问题）；模糊挂在滚动区上与侧栏面板同一条政策。回退档不需要额外处理：那一条
				     --dsw-alias-bg-layer-1 已经被钉回不透明面板色，底下不再是壁纸。 */
				  body[data-we-glass-page] [class*="_tablePane"],
				  body[data-we-glass-page] [class*="_overviewPreview"],
				  body[data-we-glass-page] [class*="_programPanel"] {
				    /* 与侧栏面板同一档镜面釉（比气泡那档再淡一点：这是大片内容区，太亮会发白）。 */
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, 0.14),
				      rgba(255, 255, 255, 0.04) 38%,
				      rgba(255, 255, 255, 0.01));
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    box-shadow:
				      inset 0 1px 0 rgba(255, 255, 255, 0.32),
				      inset 0 -1px 0 rgba(255, 255, 255, 0.08),
				      inset 0 0 0 0.5px rgba(255, 255, 255, 0.06);
				  }
				  /* Note (anti-flicker): the composer/bubbles keep ONLY the backdrop-filter
				     glass — no always-on transform/will-change/contain layers, which add
				     compositing layers without stopping the white flash. The flash came from a
				     permanent CSS filter on a composited layer, so these surfaces carry none. */

				  /* Reasoning and file bars are fully clear; message fences and tool
				     results use glass plates. Inner bodies never stack another background. */
				  body[data-we-glass-page][data-we-thinking-glass] {
				    --dsw-alias-markdown-inline-code: var(--we-capsule-glass-fill);
				  }
				  /* ⚠️ [data-turn-trigger]（思考触发条）**不在本组**：本仓把它做成了一个吃玻璃、可独立配置的
				     面（见上面「思考触发条」那一节 —— 接管宿主专属令牌 + 模糊载体，同在 data-we-thinking-glass
				     门下）。两者"门共用、这面例外" ⇒ 推理面清底、触发条吃玻璃。 */
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-reasoning],
				  body[data-we-glass-page][data-we-thinking-glass] [data-changed-files],
				  body[data-we-glass-page][data-we-thinking-glass] [data-presented-file] {
				    background: transparent !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block,
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] > div > div:has(> pre > code):has(> div > button[title="复制代码"]) {
				    background: var(--we-chat-glass-fill) !important;
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-reasoning-body] {
				    background: transparent !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* 行内胶囊：十成白雾，**不带自己的霜**。
				     宿主的内边距 / 圆角 / 文字颜色原样保留；围栏（pre > code）不在范围内。

				     霜是被有意去掉的：backdrop-filter 载体会把胶囊背后的壁纸**重新采样并
				     重绘** —— 采样区越大、重绘结果被降采样得越厉害，壁纸自己的细节（终端
				     文字、细线）就变成横贯胶囊的糊条，读起来像「代码文字被模糊了」。载体
				     跨行盒时还会断裂（宿主的 compact 变体把 chip 渲染成 display:inline），
				     画出的区域是所有行盒的外接矩形、糊成一条盖住同行普通文字的横板 ——
				     那正是 #197 记下的症状。没有载体，胶囊就是一层薄雾铺在下面那层**已经
				     糊过**的表面上：代码文字保持清晰，壁纸也不会被采样两次。

				     雾底与边框都留着；saturate / brightness 带不出来 —— 它们是
				     backdrop-filter 的函数，没有载体就没有可滤的背景。 */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] :not(pre) > code,
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] :not(pre) > code {
				    background: var(--dsw-alias-markdown-inline-code) !important;
				    background-image: none !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				    border-color: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.14)) !important;
				  }
				  /* ── Markdown 表格 ───────────────────────────────────────────────────────
				     两个各自的毛病，在纯色背景上都看不出来：
				       ① 表格是承载文字的面，自己却没有面 —— 壁纸直接透过单元格画出来，
				          于是单元格文字的对比度跟着那一行背后的壁纸亮度起伏；
				       ② 宿主用 .5px 发丝线（--dsw-alias-border-l2/l3）画网格，表头行也没有
				          任何强调 ⇒ 整张表读起来像一堆悬空的字。
				     修法：表格拿到代码块同款的可读性下限底面（单元格文字不再随壁纸起
				     伏），表头给一条中性灰的抬起带，两级边框都抬到 1px 并落在插件自己的边框
				     族上（「边框」滑杆继续管 alpha；中性灰在浅色 / 深色两个主题下都读得出；
				     封顶 0.8 是为了不让滑杆拉满时变成一条全不透明的硬线）。
				     底面**直接写配方**而不读 --dsw-alias-markdown-code-block：那条令牌会被
				     工具结果面的清底规则置成 transparent（那里不该叠第二层面），表格要是
				     读了它，在工具结果体内就会退化成一张没有底的网格。
				     锚点只用语义元素（table / th / td）+ 宿主写死的 [data-chat-flow] /
				     [data-vcp-rawhtml]：宿主的表格类名带构建哈希，docs/CODE-STRUCTURE.md §13
				     判其稳定性为低，不许把用户可见行为挂在它上面。
				     这条规则不加霜 ⇒ 不需要 glass-fallback 的孪生规则（回退模式要同一张网格）。 */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] table,
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] table {
				    background: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.15) * 0.8 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				  }
				  body[data-ds-dark-theme][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] table,
				  body[data-ds-dark-theme][data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] table {
				    background: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.15) * 0.8 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] table th,
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] table th {
				    background-color: rgba(180, 180, 180, calc(var(--we-border-alpha, 0.35) * 0.45)) !important;
				    border-bottom: 1px solid rgba(180, 180, 180, min(0.8, calc(var(--we-border-alpha, 0.35) * 1.7))) !important;
				    color: var(--dsw-alias-label-primary) !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] table td,
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] table td {
				    border-bottom: 1px solid rgba(180, 180, 180, calc(var(--we-border-alpha, 0.35) * 0.9)) !important;
				  }
				  /* The two chat navigation buttons reuse capsule mist and frost.
				     Local fill tokens preserve native hover/disabled states and hit areas. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-dsh-navbar] > button[data-vlln-load-older],
				  body[data-we-glass-page][data-we-thinking-glass] [data-slot="conversation.view"] button[class*="_toBottom"] {
				    --dsw-alias-bg-layer-2: var(--we-capsule-glass-fill);
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-capsule-glass-fill) 96%, white);
				    --dsw-alias-button-floating-fill: var(--we-capsule-glass-fill);
				    --dsw-alias-button-floating-hover: color-mix(in srgb, var(--we-capsule-glass-fill) 96%, white);
				    -webkit-backdrop-filter: blur(var(--we-inline-code-blur, 8px)) saturate(var(--we-saturate, 1.3)) brightness(var(--we-glass-brightness, 1.04));
				    backdrop-filter: blur(var(--we-inline-code-blur, 8px)) saturate(var(--we-saturate, 1.3)) brightness(var(--we-glass-brightness, 1.04));
				  }
				  /* The sidebar's new-session button uses the same thin capsule glass.
				     Scope the expanded button; keep its label, shortcut and collapsed state. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-slot="sidebar"] :not([class*="_collapsed"]) > button[class*="_newSession"] {
				    background: var(--we-capsule-glass-fill) !important;
				    border-color: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.14)) !important;
				    -webkit-backdrop-filter: blur(var(--we-inline-code-blur, 8px)) saturate(var(--we-saturate, 1.3)) brightness(var(--we-glass-brightness, 1.04));
				    backdrop-filter: blur(var(--we-inline-code-blur, 8px)) saturate(var(--we-saturate, 1.3)) brightness(var(--we-glass-brightness, 1.04));
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-slot="sidebar"] :not([class*="_collapsed"]) > button[class*="_newSession"]:hover {
				    background: color-mix(in srgb, var(--we-capsule-glass-fill) 96%, white) !important;
				  }
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-slot="sidebar"] :not([class*="_collapsed"]) > button[class*="_newSession"],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-dsh-navbar] > button[data-vlln-load-older],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-slot="conversation.view"] button[class*="_toBottom"] {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* Seven inline tool-result bodies: one plate, six percentage points
				     more coverage than a bubble. Root-local tokens clear headers/copy buttons
				     without touching diff line highlights, syntax colours or sidebar tools. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-chat-flow-kind="context"] [data-context-injection-body],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"]:has([data-sample="bash"]) [data-terminal],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="read"] [data-read],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="grep"] [data-search="matches"],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-variant="others"] [class*="_ioCard"],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="glob"] [data-search="paths"],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="write"] [data-diff] {
				    --dsw-alias-markdown-code-block: transparent;
				    --dsw-alias-markdown-code-block-banner: transparent;
				    --dsl-code-block-background: transparent;
				    background-color: var(--we-tool-glass-fill) !important;
				    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05) 38%, rgba(255, 255, 255, 0.02));
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-chat-flow-kind="context"] [data-context-injection-body],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"]:has([data-sample="bash"]) [data-terminal],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="read"] [data-read],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="grep"] [data-search="matches"],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-variant="others"] [class*="_ioCard"],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="glob"] [data-search="paths"],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [data-slot="tool.call.toolview"] [data-tool="write"] [data-diff] {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }

				  /* Navbar history/message tips share one portal; native turn previews have
				     their own root. Both reuse the tool plate without frosting child text. */
				  body[data-we-glass-page][data-we-thinking-glass] > [data-vlln-preview],
				  body[data-we-glass-page][data-we-thinking-glass] [data-slot="conversation.view"] [class*="_preview"]:has(> [class*="_previewPrompt"]) {
				    background: var(--we-tool-glass-fill) !important;
				    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05) 38%, rgba(255, 255, 255, 0.02)) !important;
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] > [data-vlln-preview],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-slot="conversation.view"] [class*="_preview"]:has(> [class*="_previewPrompt"]) {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* Chromium's native scrollbar does not paint backdrop blur (stripe probe).
				     Tint only this thumb, avoiding inherited tokens on nested scroll areas. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-conversation-scroll]::-webkit-scrollbar-thumb {
				    background-color: rgba(var(--we-capsule-tint-rgb, 255, 255, 255), var(--we-inline-code-alpha, 0.10));
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-conversation-scroll]::-webkit-scrollbar-thumb:hover,
				  body[data-we-glass-page][data-we-thinking-glass] [data-conversation-scroll]::-webkit-scrollbar-thumb:active {
				    background-color: rgba(255, 255, 255, calc(var(--we-inline-code-alpha, 0.10) + 0.04));
				  }

				  /* Native fences include assistant markdown, not just user bubbles. Keep
				     Shiki token foregrounds and clear all host background painting nodes. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block {
				    --dsl-code-block-background: transparent;
				    --dsl-code-block-banner-background-color: transparent;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block > :has(> [data-code-block-banner]),
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block [data-code-block-banner],
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block pre,
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block pre > code {
				    background: transparent !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* ── 吸顶条（宿主 .bannerWrap）重铺底板（#156④）──────────────────────────────
				     宿主 CodeBlock.module.css 里真正的 sticky 载体是 .bannerWrap
				     （position: sticky; top: 0; z-index: 6），它的底板写成
				     background-color: var(--dsw-alias-bg-base)；本插件把 --dsw-alias-bg-base 置成
				     transparent（好让壁纸透出来），上面那条清底规则又给同一个载体写了
				     background: transparent !important ⇒ 代码块一滚动，吸顶的 header / 复制按钮
				     就直接压在正文上，连一块板都没有（症状④）。
				     修法：在清底规则**之后**再声明一次 background-color + 霜（同特异度、同为
				     !important、后写胜），配方与工具面同族、同样压可读性下限；几何（sticky/top/
				     z-index/圆角）全部归宿主，一个字不改。
				     ⚠️ 只重铺 sticky 载体，不动 .banner 内部的 --dsl-code-block-banner-background-color
				     （那条仍是 transparent）：板只有一层，正文里不出现第二条吸顶带。
				     判据锚点仍是 [data-code-block-banner]（宿主源码写死的属性，已在登记册
				     「会话流面」那一行里认领），作用域留在 [data-chat-flow] 内。 */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block > :has(> [data-code-block-banner]) {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-glass-alpha, 0.15) * 0.6 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				    -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01) !important;
				    backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01) !important;
				  }
				  body[data-ds-dark-theme][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block > :has(> [data-code-block-banner]) {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-glass-alpha, 0.15) * 0.6 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				  }
				  /* 无模糊内核：同一条「近不透明 + 摘霜」政策也要落到这条吸顶带上。 */
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block > :has(> [data-code-block-banner]) {
				    background-color: color-mix(in srgb, var(--we-readability-base) 92%, transparent) !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* A user bubble already supplies the single glass plate and frost. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-chat-flow] [class*="_bubble"]:not([role="tooltip"]) .md-code-block {
				    background: transparent !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* VCP uses inline fixed colours; its plain text follows the theme once its
				     opaque canvas is removed. Native Shiki foregrounds above stay untouched. */
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] > div > div:has(> pre > code):has(> div > button[title="复制代码"]) > pre {
				    background: transparent !important;
				    color: var(--dsw-alias-label-primary) !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] > div > div:has(> pre > code):has(> div > button[title="复制代码"]) > div {
				    background: transparent !important;
				    color: var(--dsw-alias-label-secondary) !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] > div > div:has(> pre > code):has(> div > button[title="复制代码"]) > div > button {
				    color: inherit !important;
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-changed-files] {
				    --changes-fill: transparent;
				    --changes-hover: rgba(255, 255, 255, 0.05);
				  }
				  body[data-we-glass-page][data-we-thinking-glass] [data-changed-files] > button {
				    background: transparent !important;
				  }

				  /* ── 正文原生挡（「思考块液态玻璃」三挡之三：thinkingNative，默认关）────────────
				     用户口径：**只有正文内容**（消息气泡 / 代码块与行内代码 / 标签 / 分段 / 引用等
				     markdown 家族）恢复 DSH 原生不透明实色；**输入框与对话画布保留玻璃**（输入卡吃
				     --dsw-specific-input-major 与霜釉照旧、画布 bg-base 照旧透明透壁纸）。作用域因此收成
				     **正文子树**：锚点 [data-chat-flow]（消息流，气泡 / markdown / 工具结果都在其内）与
				     [data-vcp-rawhtml]（VCP 直出块，可与 chat-flow 平级）—— 输入区的
				     --dsw-specific-input-major、画布的 bg-base、霜/釉元素规则**全部不碰**（把整列都钉回原生
				     会让 composerSeat 的渐变底衬拿到原生值、屏上出现"输入区一条黑楔"）。:not() 豁免只保留在
				     气泡那条上（见上面那组）。
				     原生值全部是宿主 --dsw-static-* 静态调色板的 var 引用（从
				     @deepseek-ai/dsh-client-ui-theme 的 design-platform 串逐条提取，浅/深两主题
				     各一套）；字面量兜底防宿主改令牌名 —— 缺了它令牌无值会退成透明，正好是
				     原生挡的反面。
				     ⚠️ 门控属性由 glass-layer.js 写/撤（thinkingNative，赢过 thinkingGlass 的互斥见那边）；
				     皮肤让路态整族摘门控时随 glass-layer.js 同批摘除。 */
				  body[data-we-thinking-native] [data-chat-flow],
				  body[data-we-thinking-native] [data-vcp-rawhtml] {
				    --dsw-specific-bubble: var(--dsw-static-deepseek-50, #edf3fe);
				    --dsw-alias-markdown-code-block: var(--dsw-static-neutral-bluish-50, #f9fafb);
				    --dsw-alias-markdown-code-block-banner: var(--dsw-static-neutral-bluish-50, #f9fafb);
				    --dsw-alias-markdown-inline-code: var(--dsw-static-neutral-50, #fafafa);
				    --dsw-alias-markdown-tag: var(--dsw-static-neutral-bluish-75, #f1f3f5);
				    --dsw-alias-markdown-code-segment-unselected: var(--dsw-static-neutral-bluish-75, #f1f3f5);
				    --dsw-alias-markdown-code-segment-selected: var(--dsw-static-neutral-bluish-00, #fff);
				    --dsw-alias-markdown-citation: var(--dsw-static-neutral-bluish-100, #ebeef2);
				    --dsw-alias-markdown-placeholder: var(--dsw-static-neutral-bluish-60, #f5f6f7);
				  }
				  /* 深色档同形（原生值取宿主深色主题那一套；多一层属性选择器顶掉浅色定义，
				     与文件里其余「深色孪生」同一做法）。 */
				  body[data-ds-dark-theme][data-we-thinking-native] [data-chat-flow],
				  body[data-ds-dark-theme][data-we-thinking-native] [data-vcp-rawhtml] {
				    --dsw-specific-bubble: var(--dsw-static-neutral-bluish-850, #2c2c2e);
				    --dsw-alias-markdown-code-block: var(--dsw-static-neutral-bluish-900, #1b1b1c);
				    --dsw-alias-markdown-code-block-banner: var(--dsw-static-neutral-bluish-850, #2c2c2e);
				    --dsw-alias-markdown-inline-code: var(--dsw-static-neutral-800, #292929);
				    --dsw-alias-markdown-tag: var(--dsw-static-neutral-bluish-850, #2c2c2e);
				    --dsw-alias-markdown-code-segment-unselected: var(--dsw-static-neutral-bluish-900, #1b1b1c);
				    --dsw-alias-markdown-code-segment-selected: var(--dsw-static-neutral-bluish-800, #353638);
				    --dsw-alias-markdown-citation: var(--dsw-static-neutral-bluish-800, #353638);
				    --dsw-alias-markdown-placeholder: var(--dsw-static-neutral-bluish-850, #2c2c2e);
				  }
				  /* ── 左侧栏液态玻璃（宿主原生左栏的玻璃接管，默认关）────────────────────────────
				     原生左栏（会话列表 / 工作区那一列）在壁纸下只是**透明的洞**（本插件把
				     --dsw-specific-sidebar-fill 置为 transparent），没有霜、没有底色 —— 主题那套
				     「配色 / 玻璃颜色 / 玻璃透明度 / 雾化 / 边框」一个都到不了它。开关
				     （body[data-we-left-sidebar]，设置键 leftSidebarGlass，默认关）给它挂上**与其余面板
				     同一张配方表**：玻璃颜色（钳制后可读性底色）@ 玻璃透明度 压在可读性下限之上 +
				     雾化（--we-blur）+ 边框（竖分割线）+ 配色（选中 / 悬停行、徽标、焦点环的高亮映射）。
				     ⚠️ 门控是「页面玻璃锚点 + 本开关」两个：配方与有没有壁纸无关（无壁纸时这一列压着的
				     是宿主自己的基色，同一张配方表照旧算出可读底色），壁纸在场只是让它重新"透出画面"。

				     锚点：这一列**只有 CSS 模块哈希类名**（构建哈希，跨版本漂移，不得使用）。可钉的是
				     **座位锚**：slot 渲染器给每个出口盖章 data-slot="<slotKey>"，左栏那个座位的出口
				     div[data-slot="sidebar"] 正是这一列的**直接子元素** ⇒ 用 :has() 反向选中父元素。
				     ⚠️ 不能把玻璃画在出口锚自己身上：它带 display:contents（座位渲染器的 ANCHOR_STYLE），
				     **不生成盒子**，背景 / 模糊 / 边框全都画不出来。
				     ⚠️ 子选择器（>）是刻意的：写宽一档会连带匹配到"任何祖先链里有该锚点"的元素。

				     ── 兼容层：独立装饰载体 ─────────────────────────────────────────────
				     旧版为负层伪元素给宿主列增加定位和 z-index:0，虽避开 fixed 包含块，仍会把
				     第三方模态困在侧栏层叠上下文。现在只有管理器验证区域后才接管底色；模糊移到
				     根级装饰叶节点，宿主列不新增定位、层叠或包含块。不安全区域不盖运行标记，保留原生。 */
				  body[data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				    /* 宿主列不再承担定位或层叠；模糊只由根级装饰叶节点承担。 */
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-left-sidebar-alpha) * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    /* 顶层白光釉：与设置窗口同一道镜面渐变。它同时**顶掉**壳层 darwin 那条
				       「淡蓝渐变 + fill 混色」的左栏背景（background-image 是同一长属性）。 */
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 0%,
				      rgba(255, 255, 255, var(--we-panel-sheen-b)) 38%,
				      rgba(255, 255, 255, var(--we-panel-sheen-c)) 100%);
				    /* 模糊由根级装饰叶节点承担，不改变这一列的 fixed 包含块。 */
				    /* 边框：这一列**内部**的描边（「新建会话」按钮、焦点环等）读 --dsw-alias-border-l3 ——
				       #255④ 起壁纸令牌映射也接管 l1–l4（见上面两块映射），这里仍就地重声明 l3：让本列内的
				       描边与「边框」滑杆同源、不依赖 body 上那块映射的级联位置（这一条**保留**）。
				       ⚠️ 这一列**自己的竖分割线不画**（现场口径："左侧边栏右边框线不要显示，即使全局设置了
				       边框拉到了90%"）：这一列已经是一整块玻璃，再画一条竖线就把它与会话区切成两半。
				       ⚠️ 必须是**显式 none**，不能只是删掉那行声明：非 darwin 壳层自己有一条读
				       --dsw-alias-border-l3 的边框，删声明会让它在别的平台上回来。判据见
				       verify-glass-compositing 的 S2（含"种回发丝线即判红"的负对照）。 */
				    --dsw-alias-border-l3: rgba(180, 180, 180, var(--we-border-alpha, 0.35));
				    border-right: none;
				    /* 配色：与设置窗口同一组 accent 映射（选中 / 悬停行 = interactive-bg-hover，
				       业务状态点 = state-business-primary，链接与强调文字 = brand-*），
				       作用域只在这一列 —— 自定义属性沿 DOM 继承，出不去这一列的子树。 */
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-accent, #4f8cff) 14%, transparent);
				    --dsw-alias-interactive-bg-hover-accent: color-mix(in srgb, var(--we-accent, #4f8cff) 18%, transparent);
				    --dsw-alias-state-business-primary: var(--we-accent, #4f8cff);
				    --dsw-alias-brand-primary: var(--we-accent, #4f8cff);
				    --dsw-alias-brand-text: var(--we-accent, #4f8cff);
				  }
				  /* 根级容器只含本插件的装饰叶节点，永远位于内容下方，不包裹宿主组件。 */
				  [data-we-surface-root] {
				    position: fixed;
				    inset: 0;
				    z-index: -1;
				    pointer-events: none;
				    -webkit-app-region: initial !important;
				  }
				  [data-we-surface-plate] {
				    position: absolute;
				    pointer-events: none;
				  }
				  body[data-we-glass-page][data-we-left-sidebar] [data-we-surface-plate="left-sidebar"] {
				    -webkit-backdrop-filter: blur(var(--we-left-sidebar-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-left-sidebar-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  body[data-we-glass-page][data-we-sidebar-glass] [data-we-surface-plate="right-sidebar"] {
				    -webkit-backdrop-filter: blur(var(--we-sidebar-blur)) saturate(var(--we-sidebar-saturate)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-sidebar-blur)) saturate(var(--we-sidebar-saturate)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  /* 深色：同一张表、同一组层权重，只有玻璃色缺省与高亮mix 不同（与设置窗口深色那条同形）。 */
				  body[data-ds-dark-theme][data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-left-sidebar-alpha) * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 0%,
				      rgba(255, 255, 255, var(--we-panel-sheen-b)) 38%,
				      rgba(255, 255, 255, var(--we-panel-sheen-c)) 100%);
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-accent, #4f8cff) 14%, rgba(255, 255, 255, 0.04));
				  }
				  /* 无 backdrop-filter：同一政策 —— 近不透明玻璃，文字绝不直接落在壁纸上
				     （模糊被关掉后，半透明 + 无霜等于把左侧栏文字放到花壁纸上）。 */
				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    body[data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				      background-color: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent);
				      background-image: none;
				    }
				    body[data-ds-dark-theme][data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				      background-color: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 92%, transparent);
				    }
				  }
				  /* ── issue #272：窄视口（手机远程适配层 / 折叠抽屉）下的不依赖模糊的兜底 ─────────
				     宿主在 <1100px 把侧栏折叠成抽屉、用 transform 做位移；此时装饰板的 backdrop-filter
				     要么采样不到有效矩形、要么被祖先的 transform/filter 静默废掉 ⇒ 抽屉全透明、正文直接
				     压在壁纸上。这里按「#95：文字绝不直接落在壁纸上」的同一政策给近不透明底（92%），
				     并把不会生效的模糊显式关掉 —— 与软件光栅回退那组逐字同口径。
				     ⚠️ 只影响窄视口；桌面布局（≥1100px）逐字节不变。 */
				  @media (max-width: 1100px) {
				    body[data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				      background-color: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent) !important;
				      background-image: none !important;
				    }
				    body[data-ds-dark-theme][data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				      background-color: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 92%, transparent) !important;
				    }
				    body[data-we-glass-page] [data-we-surface-plate] {
				      -webkit-backdrop-filter: none !important;
				      backdrop-filter: none !important;
				    }
				  }

				  /* ── 侧边栏四角圆角 / 直角（外观 → 侧边栏圆角）────────────────────────────────────
				     左右两条侧栏各自一套：**统一档**（6 / 12 / 20 px）写 border-radius 简写，四角开关
				     写 border-*-radius 长属性覆盖它。设置真源见 lib/settings-schema.js 的
				     leftSidebarCornerRadius / rightSidebarCornerRadius 与两族 Square* 键；属性由
				     glass.js 的 applyGlass 写出。

				     ⚠️ **顺序即语义**：简写会一次性设置四个角 ⇒ 四角规则必须排在简写规则**之后**，
				        否则被简写覆盖（dsh-myskin 的同款教训，见其 regions.ts 的 hoistShorthand）。
				     ⚠️ 左栏锚点与「左侧栏液态玻璃」同一条：座位出口 div[data-slot="sidebar"] 带
				        display:contents、**不生成盒子**，背景 / 圆角都画不出来 ⇒ 只能 :has() 反向选父元素。
				     ⚠️ 右栏锚点**必须**带 [data-sidebar-right-open]：容器收起时仍挂在布局里（只把子元素
				        visibility:hidden），裸锚会给收起态留一块板子（#107，与右栏玻璃同一条护栏）。
				     ⚠️ 默认（统一档 = 跟随原生、四角都不直角）时 body 上没有任何属性 ⇒ 本块全部不生效，
				        逐字节等于今天。
				     ⚠️ 宿主原生左栏与右栏面板都**不带圆角**（*_sidebarCol 只有底色 + 右分割线；
				        右栏面板的圆角长在内部 pane 上）⇒「圆角」靠统一档给 px 值才看得见。 */
				  body[data-we-left-sidebar-radius] div:has(> [data-slot="sidebar"]) {
				    border-radius: var(--we-left-sidebar-radius) !important;
				  }
				  body[data-we-left-sidebar-square~="tl"] div:has(> [data-slot="sidebar"]) { border-top-left-radius: 0 !important; }
				  body[data-we-left-sidebar-square~="tr"] div:has(> [data-slot="sidebar"]) { border-top-right-radius: 0 !important; }
				  body[data-we-left-sidebar-square~="br"] div:has(> [data-slot="sidebar"]) { border-bottom-right-radius: 0 !important; }
				  body[data-we-left-sidebar-square~="bl"] div:has(> [data-slot="sidebar"]) { border-bottom-left-radius: 0 !important; }
				  body[data-we-right-sidebar-radius] [data-sidebar-right-panel][data-sidebar-right-open] {
				    border-radius: var(--we-right-sidebar-radius) !important;
				  }
				  body[data-we-right-sidebar-square~="tl"] [data-sidebar-right-panel][data-sidebar-right-open] { border-top-left-radius: 0 !important; }
				  body[data-we-right-sidebar-square~="tr"] [data-sidebar-right-panel][data-sidebar-right-open] { border-top-right-radius: 0 !important; }
				  body[data-we-right-sidebar-square~="br"] [data-sidebar-right-panel][data-sidebar-right-open] { border-bottom-right-radius: 0 !important; }
				  body[data-we-right-sidebar-square~="bl"] [data-sidebar-right-panel][data-sidebar-right-open] { border-bottom-left-radius: 0 !important; }
				  /* 圆角一开，右栏左边缘那条**竖直分割线**（dockkit 拖拽手柄的 ::before：0.5px 宽、
				     top:0/bottom:0 全高）就成了"圆角旁边的一道直角"（用户实测截图）。修法 = 让它跟着
				     圆角缩进：上面那个角是圆的 ⇒ 线从半径处开始；下面那个角是圆的 ⇒ 线到半径处结束；
				     对应的角标了直角 ⇒ 那条边不动（线照旧顶到边）。
				     ⚠️ **不再要求它住在面板里**（第一版按"面板内"限定，用户第二轮实测那条线仍在 ⇒ 它可能挂在
				        面板的兄弟节点上）；仍然排除 pane 内部的 split 分割线（那是别的布局，缩进它会画错）。
				     ⚠️ 手柄本体（可拖拽的命中区）不动，只是那条线变短 —— 拖拽能力一点没少。
				     ⚠️ 兜底：--we-right-sidebar-radius 与门控属性由 glass.js 同批写出（零兜底读取）。 */
				  body[data-we-right-sidebar-radius]:not([data-we-right-sidebar-square~="tl"]) [data-dockkit-divider]:not([data-dockkit-pane] *)::before {
				    top: var(--we-right-sidebar-radius) !important;
				  }
				  body[data-we-right-sidebar-radius]:not([data-we-right-sidebar-square~="bl"]) [data-dockkit-divider]:not([data-dockkit-pane] *)::before {
				    bottom: var(--we-right-sidebar-radius) !important;
				  }
				  /* 宿主第二处画同一条线的地方：**第一列 dock 的 tab host 上的 border-left**（0.5px、
				     颜色同 --dsw-alias-border-l4，见前端包 _tabCell_[data-dockkit-host=dock][data-dockkit-column="0"]
				     > ._tabHost_ 那条规则）。它画在那个元素**自己**的边上，不跟着面板的圆角走 ⇒ 圆角一开就是
				     一道直角。锚点用"第一列 dock 的直接子元素"这个**结构事实**：宿主给它的是 CSS-module 哈希
				     类名，不能当锚点（跨构建会漂）。 */
				  body[data-we-right-sidebar-radius] [data-sidebar-right-panel][data-sidebar-right-open] [data-dockkit-host="dock"][data-dockkit-column="0"] > * {
				    border-left: none !important;
				  }

				  /* ── 标题栏液态玻璃（壳层顶栏的玻璃接管，默认关）────────────────────────────────
				     开关（body[data-we-titlebar-glass]，设置键 titlebarGlass，默认关）把顶栏改挂**与其余
				     面板同一张配方表**，且与左侧栏那条**逐条同形**。

				     ⚠️ **锚点**：Windows 形态的顶栏不是元素，而是 AppFrame 那条 grid 容器的**伪元素**
				        （content 空、height = --dsh-windows-titlebar-height、app-region: drag、
				        background = --dsw-specific-sidebar-fill）—— 它是顶栏唯一的那一层，也是"文字下方
				        那块底"的全部来源 ⇒ 玻璃必须画在**这个伪元素**上，直接替换它的 background。
				        壳层类名 .dshDesktopFrameTitlebar / .dshDesktopFrame / --dsh-desktop-frame-fill
				        在当前 DSH Desktop 里**都不存在**（app.asar 字面扫描命中 0 次），不得用作锚点。
				     ⚠️ **锚点为什么不用 [data-sidebar-collapsed]**：AppFrame 只在**收起**时才渲染该属性
				        ⇒ 把条件属性写进选择器会让本块在默认展开态**恒不生效**。data-rightbar-* 同理。
				     ⚠️ **锚点只用一条**：运行时锚点 [data-we-titlebar-anchor] 由玻璃层探针写在顶栏容器上
				        （glass-layer.js 的 findTitlebarFrame：座位祖先链 → 含侧栏/对话列兜底 → ≥70% 视口的
				        单类 *_frame 兜底），不看宿主构建哈希 ⇒ 宿主换构建也不会静默失效；运行时实测
				        n1=1 / n3=1。两条硬门是 [data-windows-titlebar]（壳层写进 <html>，只在 Windows
				        Electron 形态；实测 winTB=1）与 body[data-we-adapter^="desktop-"]（本插件自己挂；
				        实测 ad=desktop-official）。教训两条：
				        ⇒ 结论一：**绝不把"未经本引擎验证的选择器"与"已验证的"放进同一个逗号列表** —— CSS
				          选择器列表一损俱损（一个不被接受，整条规则连同能命中的一起被丢弃，表现为"变量全对、
				          背景与模糊都没算出来"，与"锚点没选对"的现象完全一样，极易误判）；要并存必须拆成
				          两条独立规则（一条失效只丢它自己）。
				        ⇒ 结论二：**嵌套 :has()**（:has() 里再套 :has()）本壳层的 Chromium 不接受（会抛异常）；
				          左栏那条能用是因为它是**单层** :has(> [data-slot="sidebar"]) —— 别把左栏的经验外推。
				        探针失效的兜底将来若要加，必须**另起一条规则**，不得并进逗号列表。
				     ⚠️ **本块的结构分工**：底色 / 釉光 / accent 在下面这条 ::before；模糊在紧随其后的
				        ::after —— 为什么必须分两层、绘制顺序、以及 issue #131 的 fixed 包含块，见那条规则的注释。
				     ⚠️ **"不要有任何色差"是本块的第一约束**：底色的 color-mix 权重与五条 accent 映射与左侧栏
				        **逐字相同**（判据 TB4）。釉光**刻意不同**（判据 TB4a）—— 停靠点是百分比，装进两个高度差
				        27.8 倍的盒子会算出不同值，见 ::before 那条注释。两面都**不画分割线**（本面判据 TB6，
				        左栏判据 S2）。⚠️ 任何调色改动都必须**同时**改这两块，否则色差立刻出现。
				     ⚠️ **可覆盖性**：本块用 !important —— 壳层那条 :before 声明同特异度但写在别的样式表里，
				        靠加载顺序取胜不可靠；伪元素只此一层，覆盖它没有副作用。 */
				  html[data-windows-titlebar] body[data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				    /* 底色：压掉壳层那条 background: var(--dsw-specific-sidebar-fill)，换成与左侧栏
				       **逐条同形**的配方（只有面变量 --we-titlebar-alpha 替 --we-left-sidebar-alpha）。
				       ⚠️ 必须写成 background-color + background-image 两条**分开的**声明（不是
				       background 简写）——简写会把同名的 background-* 长属性一次性重置，而本块与
				       左侧栏的"逐条同形"判据（verify-glass-compositing）正是按声明对声明比对的。 */
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-titlebar-alpha) * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				    /* 顶层白光釉 —— **必须是恒定值，不能沿用左栏那条三段渐变**（实测）：
				       渐变的停靠点是**百分比**（0% / 38% / 100%），同一条声明装进两个高度差 27.8 倍的
				       盒子里会算出**完全不同**的白釉强度 ——
				         · 标题栏 ::before 高 **40px**：0.10 →(15px) 0.03 →(40px) 0.05，整段均值 0.0495；
				         · 侧栏列高 **1111.33px**：0.10 →(422px) 0.03，其顶部 40px 均值 0.0967。
				       交界处台阶 = 0.10 − 0.05 = **0.05 白釉**，整段差 **0.047** ⇒ 肉眼可见的色差。
				       而 TB4 判据比的是**声明文本**（两条逐字相同 ⇒ PASS），完全看不见这个 ——
				       因为差异出在**盒子尺寸**上，不在配方上。"声明逐字相同 ⇒ 无色差"对**盒子相对**的
				       声明（百分比停靠点）是**不成立**的，这条注释就是那个反例。
				       修法：本面只用 sheen-a 一个停靠点（恒定 0.10）。左栏顶部 40px 实际是
				       0.10 → 0.0934（只漂 0.0066，远低于感知阈值），所以恒定值与之等效。
				       ⚠️ 判据见 verify-glass-compositing 的 TB4a（改回三段渐变会被判红）。 */
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 0%,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 100%) !important;
				    /* ⚠️ 模糊**不在这里**，在紧随其后的 ::after 上（理由见那条规则的注释）。 */
				    /* ⚠️ **不画底分割线**（现场口径）：左栏按 S2 判据是**显式 border-right: none**
				       （"这一列已经是一整块玻璃，再画一条线就把它切成两半"）—— 同一条政策必须两面一致，
				       否则那条线本身就是色差。
				       ⚠️ 判据见 verify-glass-compositing 的 TB6（把线种回去会被判红）。 */
				    /* 配色：与左栏**同一组** accent 映射（已由上方 CSS-ENGINE 判据验证逐条 SAME）。 */
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-accent, #4f8cff) 14%, transparent);
				    --dsw-alias-interactive-bg-hover-accent: color-mix(in srgb, var(--we-accent, #4f8cff) 18%, transparent);
				    --dsw-alias-state-business-primary: var(--we-accent, #4f8cff);
				    --dsw-alias-brand-primary: var(--we-accent, #4f8cff);
				    --dsw-alias-brand-text: var(--we-accent, #4f8cff);
				  }
				  /* ── 标题栏的**模糊层**：另起一个 ::after ─────────────────────────────────────
				     为什么必须是两个伪元素：左栏是「底色在**元素**、模糊在其 ::before（绘制在底色**之上**）」
				     ⇒ 结果 = F(壁纸 ⊕ 底色)，底色**经过** saturate(1.8) / brightness(1.04) 滤镜；若把底色
				     与模糊写在**同一个** ::before 上 ⇒ 结果 = 底色 ⊕ F(壁纸)，底色**不经过**滤镜 ⇒ 两面在
				     数值完全相同的情况下仍出色差。修法：底色留在壳层的 ::before（上一条规则），模糊另起
				     ::after（::before 先、::after 后绘制 ⇒ ::after 的 backdrop 恰好**含** ::before 的底色，
				     与左栏逐像素同构）。
				     ⚠️ 几何必须与壳层那条 ::before 完全一致（inset:0 0 auto + 标题栏高度），否则两层错位露边。
				     ⚠️ ::after 没有后代 ⇒ 永不成为 position:fixed 的包含块（issue #131 同一理由）；
				        pointer-events:none ⇒ 不挡壳层 ::before 的 app-region 拖拽区，也不挡壳层 z-index:30 的固定按钮。
				     ⚠️ 不写 z-index（保持 auto）：这样才能在 ::before **之上**按树序绘制；写成 -1 会掉到
				        frame 底色之下，甚至跑到壁纸后面。 */
				  html[data-windows-titlebar] body[data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::after {
				    content: "";
				    position: absolute;
				    inset: 0 0 auto;
				    height: var(--dsh-windows-titlebar-height, 40px);
				    pointer-events: none;
				    -webkit-backdrop-filter: blur(var(--we-titlebar-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01) !important;
				    backdrop-filter: blur(var(--we-titlebar-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01) !important;
				  }
				  /* 深色：同一张表、同一组层权重，只有玻璃色缺省与高亮 mix 不同（与左栏深色那条同形）。
				     ⚠️ 釉光必须**和浅色那条一样恒定**（单停靠点 sheen-a）：照抄左栏三段渐变就会重现
				        那个"盒尺寸色差" —— 40px 与 1111px 两个盒子会算出不同白釉强度。
				        TB4a 对深浅两条都跑。 */
				  html[data-windows-titlebar] body[data-ds-dark-theme][data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-titlebar-alpha) * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 0%,
				      rgba(255, 255, 255, var(--we-panel-sheen-a)) 100%) !important;
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-accent, #4f8cff) 14%, rgba(255, 255, 255, 0.04));
				  }
				  /* 无 backdrop-filter：同一政策 —— 近不透明玻璃，顶栏文字绝不直接落在壁纸上。 */
				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    html[data-windows-titlebar] body[data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				      background: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent) !important;
				    }
				    html[data-windows-titlebar] body[data-ds-dark-theme][data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				      background: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 92%, transparent) !important;
				    }
				    /* 模糊层整个不存在：本档不支持 backdrop-filter，留着 ::after 只会多一层
				       什么都画不出来的绝对定位块（含 pointer-events:none 的空层）。 */
				    html[data-windows-titlebar] body[data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::after {
				      content: none;
				    }
				  }
				  /* 侧栏的釉取哪一份：跟随全局 ⇒ 与左栏同一道（--we-panel-sheen-*）；
				     自定义 ⇒ "随透明度衰减"曲线（--we-sidebar-sheen）。两档都只定义变量，
				     面板规则本身不必分叉。 */
				  body[data-we-sidebar-follow] {
				    --we-sidebar-sheen-a: var(--we-panel-sheen-a);
				    --we-sidebar-sheen-b: var(--we-panel-sheen-b);
				    --we-sidebar-sheen-c: var(--we-panel-sheen-c);
				  }
				  body[data-we-sidebar-glass]:not([data-we-sidebar-follow]) {
				    --we-sidebar-sheen-a: calc(var(--we-sidebar-sheen) * 0.14);
				    --we-sidebar-sheen-b: calc(var(--we-sidebar-sheen) * 0.04);
				    --we-sidebar-sheen-c: calc(var(--we-sidebar-sheen) * 0.01);
				  }

				  /* ── dsh-better-sidebar glass ──────────────────────────────────────────────
				     The sidebar shell is portalled onto <body> under a stable host attribute
				     "data-dsh-better-sidebar" (set by the plugin's own mount code), so we can
				     target the whole tree without depending on its CSS-module hashes. Its root
				     panels read the opaque --dsw-alias-bg-layer-1 token (hence the "black
				     frame") — give them the SAME clear liquid-glass recipe as the
				     composer/bubbles (faint specular sheen + gentle frosted melt).
				     Unlike the conversation surfaces, the sidebar glass is FULLY independent
				     from the active wallpaper: it can tint and frost the stock DSH surface or
				     any other background source without pretending a plugin wallpaper exists.
				     The master switch body[data-we-sidebar-glass] (侧栏液态玻璃) gates the whole
				     adaptation, and blur / saturation / transparency / base tint each have
				     their own knob (--we-sidebar-blur / --we-sidebar-saturate /
				     --we-sidebar-alpha / --we-sidebar-color, from 侧栏模糊 / 侧栏透明度 /
				     侧栏玻璃颜色), so the sidebar can be blurrier, clearer, more transparent
				     or tinted however you like without touching the 玻璃 / 玻璃透明度 sliders.
				     Inner chrome surfaces that paint the same opaque tokens get a translucent
				     base too; the blur lives on the root panels (one blur per shell). */
				  /* 未知 better-sidebar 内部布局保留原生，官方停靠区域由统一表面管理识别。 */

				  /* ── Official right sidebar ────────────────────────────────────────────────
				     The right column lives in the NATIVE sidebar: better-sidebar registers its
				     tabs into it and only keeps its own bottom dock. The native panel paints
				     background: var(--dsw-alias-bg-base) — the EXACT token WE set to
				     transparent while a wallpaper is active — so without adaptation the whole
				     right column would be fully see-through with no frost. The panel is
				     addressed via its stable data attributes
				     (data-sidebar-right-panel="push"|"fullscreen"; CSS-module hashes like
				     P3OORG_panel drift between harness builds and must not be used). The
				     侧栏液态玻璃 master switch gates the SAME frosted recipe and the SAME
				     侧栏模糊/透明度/玻璃颜色 knobs as the better-sidebar glass; with the
				     switch off, the panel falls back to the theme's opaque layer colour so
				     「关闭则恢复原生外观」keeps holding there too.

				     Collapse mechanics (#107): the CONTAINER stays mounted with its full width
				     (reserved for the slide animation, pointer-events:none) and only its
				     CHILDREN hide via "visibility:hidden", gated on the
				     "data-sidebar-right-open" attribute the host writes only while expanded.
				     The container itself has no background of its own — so any plate we paint
				     on the bare "[data-sidebar-right-panel]" selector stays VISIBLE over the
				     wallpaper while the panel is closed (the 「右栏关了还是一块灰/玻璃」
				     report). Every container-painting rule below is therefore scoped to
				     "[data-sidebar-right-open]", plus an explicit closed-state clear so a
				     stale painted background can never linger.
				     ⚠️ 同类陷阱：凡是"宿主容器留在布局里、只靠子元素隐藏"的元素都不能无条件上色；
				     护栏见 test/verify-host-paint-scope.mjs（另见 #91 的 body * { !important } 修复）。 */
				  body[data-we-glass-page] [data-sidebar-right-panel][data-sidebar-right-open] {
				    /* 侧栏玻璃总开关关闭时的兜底：面板必须**不透明**（否则文字直接压在壁纸上）。
				       --dsw-alias-bg-layer-* 在壁纸下已被改写成玻璃配方 ⇒ 这里读插件自己的面板色。 */
				    background-color: var(--we-panel-color, #1e1f26);
				  }
				  /* #150（dockkit 层级体系）：backdrop-filter 让本面板自成层叠
				     上下文（z=auto 档）。宿主的层级设计是「面板内部的 dock 单元消费
				     --dsh-dockkit-dock-layer（常态 10 / 右栏全屏 40）」——层叠上下文一成，这个 z
				     被困在面板内部，整个面板作为原子跌回 z=auto，被会话列里宿主自己的更高层内容
				     （hero 输入卡 z=1 / composerSeat z=7，同为根层叠上下文里的 flex 项）反压：
				     push / 收起态没有空间重叠所以看不出来，唯独「右栏全屏」面板与对话列重叠时，
				     输入卡与 hero 标题会穿透玻璃面板叠在侧栏上（issue #150 截图形态）。
				     修法 = 玻璃开着时把面板本身抬到宿主为它设计的同一层——该 var 就声明在面板上，
				     全屏时自动解析为 40，与内部 dock 单元原生取得的层完全一致；玻璃关着（主开关
				     兜底只上不透明底色）与软件光栅回退档（backdrop-filter 显式 none）都不成层叠
				     上下文，保持原生绘制顺序，无需此抬升。 */
				  body[data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-sidebar-color) var(--we-sidebar-tint), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				    background-image: linear-gradient(180deg,
				      rgba(255, 255, 255, var(--we-sidebar-sheen-a)),
				      rgba(255, 255, 255, var(--we-sidebar-sheen-b)) 38%,
				      rgba(255, 255, 255, var(--we-sidebar-sheen-c))) !important;
				    /* 模糊在独立叶节点，宿主 dock 内容仍按其原生层级绘制。
				       #237：外沿描边不画（左栏玻璃也不画）—— 宿主 inset 三明治由
				       body[data-we-sidebar-glass] 的 box-shadow:none 规则兜住。 */
				  }
				  body[data-ds-dark-theme][data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-sidebar-color) calc(var(--we-sidebar-tint) * 0.65), transparent) calc((1 - var(--we-readability-floor)) * 100%)) !important;
				  }
				  /* fullscreen 是宿主明确声明的前景 dock 模式；只抬面板自身，不改共享祖先或第三方节点。 */
				  body[data-we-glass-page] [data-sidebar-right-panel="fullscreen"][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    z-index: var(--dsh-dockkit-dock-layer, 40);
				  }
				  /* ── issue #237：右侧栏不画外沿描边（与左栏玻璃同一政策）──────────────────
				     旧「去边框」规则门控在圆角档上：圆角=跟随原生时整段不匹配。这里把门控搬到玻璃开关本身：
				     只要右栏是玻璃面，就不再留宿主原生描边 / 竖线；关掉玻璃后宿主外观逐字节恢复。
				     ⚠️ 面板那条沿用玻璃面自己的运行时锚点（:where([data-we-surface-runtime="right-sidebar"])）——
				        没被表面管理认领的面不画玻璃，也就不清描边（保持原生外观）。 */
				  body[data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    box-shadow: none !important;
				  }
				  body[data-we-sidebar-glass] [data-dockkit-divider]:not([data-dockkit-pane] *)::before {
				    border: none !important;
				    background: none !important;
				  }
				  body[data-we-sidebar-glass] [data-dockkit-host="dock"][data-dockkit-column="0"],
				  body[data-we-sidebar-glass] [data-dockkit-host="dock"][data-dockkit-column="0"] > * {
				    border-left: none !important;
				    box-shadow: none !important;
				  }
				  /* Closed state: the host's own container carries no background — keep ours
				     off too, whatever the master-switch state (#107). */
				  body[data-we-glass-page] [data-sidebar-right-panel]:not([data-sidebar-right-open]) {
				    background: none !important;
				    background-image: none !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				    box-shadow: none !important;
				  }
				  /* No backdrop-filter support: near-opaque tinted plate, same policy as the
				     better-sidebar glass above. */
				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    body[data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				      background-color: color-mix(in srgb, var(--we-sidebar-color) 92%, transparent) !important;
				      backdrop-filter: none !important;
				      -webkit-backdrop-filter: none !important;
				    }
				  }

				  /* ── dsh-better-sidebar CONTENT surfaces: near-opaque tinted glass ─────────
				     The editor (CodeMirror) surface is transparent by design, and the terminal
				     background reads --dsw-alias-bg-base — which we must keep transparent so
				     the wallpaper shows through. Their fixed content palettes (syntax
				     highlighting / ANSI colors) are designed for an OPAQUE backdrop (One
				     Dark/Light, xterm themes): on the fully frosted composite the mid-gray
				     comments etc. lose all contrast (实测注释灰 1.7–2.3:1，看不清).
				     Fully opaque surfaces fix readability but kill the glass look. Balance:
				     a NEAR-OPAQUE TINTED glass plate — the theme's opaque panel color
				     (--dsw-alias-bg-layer-1) at 88% keeps the wallpaper glow bleeding through
				     (still reads as glass) while the composite stays dark/light enough for the
				     the designed content palettes. Tune via the 内容面透明度 / 内容面底色 controls
				     (--we-content-surface-alpha / --we-content-surface-color; color empty =
				     follow the theme panel color). The sidebar master switch gates these
				     surfaces too, so turning it off restores the complete native sidebar even
				     when a wallpaper remains active. .cm-editor / .xterm are library-global
				     class names (stable across the sidebar's builds).
				     The editor / preview tabs render inside the NATIVE right sidebar
				     ([data-sidebar-right-panel]) — extend the same plate to content surfaces
				     there, or 内容面透明度 / 内容面底色 stop responding for those tabs. */
				  body[data-we-sidebar-glass] :where([data-we-surface-runtime="content"]) {
				    background-color: color-mix(in srgb, var(--we-content-surface-color, var(--we-panel-color, #1e1f26)) max(calc(var(--we-readability-floor) * 100%), var(--we-content-surface-alpha, 88%)), transparent) !important;
				  }
				  /* 阅读文件页的**兜底底板**（同一张内容面配方）：表面策略系统在"认领失败"时会把
				     data-we-surface-runtime 撤掉（preserve / hidden / 多实例不猜），那时这一页就完全
				     没有底色 —— 而它是最需要稳定阅读底的一张。这条规则按**锚点**直接给底，
				     与上面那条策略规则同配方、同可读性地板 ⇒ 两套都在时观感一致，策略接管时覆盖它。
				     ⚠️ 只作用于打开态右栏（与官方右栏那组同一纪律，见上方 #107 的注释）。 */
				  body[data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open] [data-document-preview] {
				    background-color: color-mix(in srgb, var(--we-content-surface-color, var(--we-panel-color, #1e1f26)) max(calc(var(--we-readability-floor) * 100%), var(--we-content-surface-alpha, 88%)), transparent) !important;
				  }

				  body[data-we-glass-page] [data-we-surface-runtime="declared"]::before {
				    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit;
				    background-color: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-panel-color, #fff) calc(var(--we-glass-alpha, .15) * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    -webkit-backdrop-filter: blur(var(--we-blur, 14px));
				    backdrop-filter: blur(var(--we-blur, 14px));
				  }
				  body[data-we-glass-fallback] [data-we-surface-runtime="declared"]::before {
				    background: var(--we-panel-color, #fff); -webkit-backdrop-filter: none; backdrop-filter: none;
				  }
				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    body[data-we-glass-page] [data-we-surface-runtime="declared"]::before { background: var(--we-panel-color, #fff); }
				  }

				  /* ── WHOLE native settings window → liquid glass.
				     Keyed on body[data-we-glass-window] —— 该属性由 applyGlass **恒挂**，**不**对应任何开关
				     （「设置窗口液态玻璃」总开关与 glassWindow 键均已删除）；属性本身保留，
				     因为它是 CSS 侧"这组规则画玻璃"的**证书**，守卫 ⑨/⑬ 靠它判断）。The settings dialog is the shell's
				     div[role="dialog"] containing the settings.section outlet anchor
				     (data-slot="settings.section" — stamped by the slot renderer, same anchor
				     the skin-center's semantic layer uses). The dialog reads inherited shell
				     tokens (panel background = --dsw-alias-bg-layer-2, nav active/hover =
				     --dsw-specific-sidebar-nav-item-*, close hover = --dsw-alias-interactive-bg-hover,
				     accents = --dsw-alias-brand-primary), so overriding those tokens ON the
				     dialog element restyles the ENTIRE window — left nav, content header and
				     every native section (General / Models / Plugins / …) — in one shot:
				     translucent glass base + backdrop blur + specular sheen + inner highlight,
				     with the accent color remapped to --we-accent (配色) and all surface alphas
				     driven by --we-glass-alpha (玻璃透明度). Off = stock shell look. ── */
				  /* ⚠️ 令牌声明必须在**对话框本体**上，不能只写在 ::before 装饰叶：
				     ::before 没有子元素，声明在它上面的变量**没有任何后代能继承** ⇒ 窗内所有读
				     --dsw-alias-bg-layer-* 的宿主卡片 / 页签 / 导航全部退回宿主实底（用户口径：
				     「这些我用红色矩形框选中的组件玻璃效果又丢失了」）。变量只是继承值，不建立
				     层叠上下文、不改盒模型，与 ADR-0015 D2 不冲突。
				     会建立包含块/层叠上下文的那几样（backdrop-filter、底色、釉光、阴影）仍然只写在
				     下面的 ::before 装饰叶上。 */
				  body[data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				    /* Glass surface alphas (light scheme): the base tint is --we-surface-tint-light/dark
				       (玻璃颜色) mixed with transparent at the 玻璃透明度-driven alpha, so the
				       whole window glass can be tinted to any color. Default (no custom color)
				       = white glass, the stock look. 这三层同样是文字面（导航 + 原生分区），
				       所以每层都压在可读性下限的主题底色之下。 */
				    --dsw-alias-bg-layer-1: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-settings-window-alpha) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-2: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-settings-window-alpha) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-3: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-light, #ffffff) calc(var(--we-settings-window-alpha) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    /* Nav + interactive states tinted with the accent. */
				    --dsw-specific-sidebar-nav-item-active: color-mix(in srgb, var(--we-accent-src, #4f8cff) 26%, rgba(255, 255, 255, 0.08));
				    --dsw-specific-sidebar-nav-item-hover: color-mix(in srgb, var(--we-accent-src, #4f8cff) 13%, rgba(255, 255, 255, 0.05));
				    --dsw-alias-interactive-bg-hover: color-mix(in srgb, var(--we-accent-src, #4f8cff) 14%, transparent);
				    --dsw-alias-interactive-bg-hover-accent: color-mix(in srgb, var(--we-accent-src, #4f8cff) 18%, transparent);
				    /* Whole-dialog accent remap: every native control (links, primary buttons,
				       switches, active tabs, slider fills) follows the 配色 control.
				       ⚠️ 块内消费一律读 --we-accent-src：本块末尾把 --we-accent 掐成 initial
				      （issue #127），同名 var() 在**同一元素**上会解析成 guaranteed-invalid、
				      全部塌进兜底蓝 —— src 是 body 上的原件，继承不受掐掉影响。 */
				    --dsw-alias-brand-primary: var(--we-accent-src, #4f8cff);
				    --dsw-alias-brand-text: var(--we-accent-src, #4f8cff);
				    --dsw-alias-button-primary-fill: var(--we-accent-src, #4f8cff);
				    --dsw-alias-button-primary-hover: color-mix(in srgb, var(--we-accent-src, #4f8cff) 88%, var(--we-accent-ink, #fff));
				    --dsw-alias-button-primary-dimmed: color-mix(in srgb, var(--we-accent-src, #4f8cff) 22%, transparent);
				    --dsw-alias-state-business-primary: var(--we-accent-src, #4f8cff);
				    /* issue #127（文字与背景同色）：填充一旦变成**任意亮度**的用户配色，宿主的
				       主题静态墨（label-primary-foreground：浅色主题 = 白、深色主题 = 近黑）就不再
				       保证可读 —— primitives 的 primary 按钮契约是「填充 × 反色墨」成对翻转的。
				       这里把墨一并按 accent 亮度重选（effects.js 的 weAccentInk）。
				       hover 同理：混白对亮 accent 是把底往墨的反方向推，改为往墨色混。 */
				    --dsw-alias-label-primary-foreground: var(--we-accent-ink, #fff);
				    /* issue #127 的另一半：第三方 settings 分区若拿 var(--we-accent) 当**文字色**
				       （无兜底），落在我们重映射成 accent 的填充上就是逐像素同色（黄底黄字 ——
				       实测按钮内部 8250 像素全部是同一个 #FFCF4D）。--we-accent 是本插件的名字
				       空间，不该泄漏给窗内第三方分区：在窗内把它掐掉（initial = guaranteed-invalid，
				       var() 无兜底时回落继承色 = 它们在原生外观下的颜色）；我们自己的 picker 子树
				       由 .we-picker 根重新别名（--we-accent-src），消费面不变。 */
				    --we-accent: initial;
				  }
				  body[data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"])::before {
				    /* 滤镜 / 底色 / 釉光 / 阴影只属于装饰叶：它们会建立包含块与层叠上下文，
				       不能落到窗口本体上（ADR-0015 D2）。 */
				    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
				    border-radius: inherit;
				    background-color: var(--dsw-alias-bg-layer-2);
				    /* Frosted finish — the SAME recipe as the conversation surfaces (composer
				       card / bubbles): the blur radius comes from the 玻璃 slider (--we-blur
				       0–60px), the saturation melt is a flat material constant (--we-saturate,
				       see the composer note above) and brightness is pinned — so the settings
				       window glass tracks the conversation-bar blur range exactly. Plus a
				       specular sheen + inner edge highlight + diffuse shadow (panel rounds at 24px). */
				    -webkit-backdrop-filter: blur(var(--we-settings-window-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-settings-window-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    background-image: linear-gradient(
				      180deg,
				      rgba(255, 255, 255, 0.1) 0%,
				      rgba(255, 255, 255, 0.03) 38%,
				      rgba(255, 255, 255, 0.05) 100%
				    );
				    box-shadow:
				      inset 0 1px 0 rgba(255, 255, 255, 0.22),
				      inset 0 0 0 1px rgba(255, 255, 255, 0.06),
				      0 24px 80px rgba(0, 7, 18, 0.35);
				  }
				  /* 逐面策略「保留原生」（glassSurfacePolicy['settings-window'] = 'native'）：
				     表面管理器不认领这个对话框 ⇒ 上面两条（带 :where 运行标记的）都不匹配。
				     但页面级令牌映射仍在 body 上被继承 ⇒ 必须在这里把令牌钉回**不透明面板色**，
				     否则「保留原生」会变成"没有霜、但底色仍然半透明"的半成品档。
				     用插件自己的主题面板色（--we-panel-color：浅 #fff / 深 #1e1f26），
				     与右侧栏主开关关闭时的兜底口径一致。 */
				  body[data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):not(:where([data-we-surface-runtime="settings-window"])) {
				    --dsw-alias-bg-layer-1: var(--we-panel-color, #ffffff);
				    --dsw-alias-bg-layer-2: var(--we-panel-color, #ffffff);
				    --dsw-alias-bg-layer-3: var(--we-panel-color, #ffffff);
				    --dsw-alias-button-elevated-fill: var(--we-panel-color, #ffffff);
				  }
				  /* Dark scheme: deep translucent base instead of white. The default glass
				     color is deep navy; a user-picked 玻璃颜色 overrides it in both themes. */
				  /* 深色令牌同样必须在**对话框本体**上（理由见上方浅色那条）：装饰叶上的变量
				     没有后代可以继承 ⇒ 窗内卡片会退回宿主深色实底。釉光渐变留在下面的 ::before。 */
				  body[data-ds-dark-theme][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				    /* 设置窗口的整块面板（导航 + 每个原生分区）都承载文字 → 同样过下限。 */
				    --dsw-alias-bg-layer-1: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-settings-window-alpha) * 0.9 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-2: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-settings-window-alpha) * 1.0 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-alias-bg-layer-3: color-mix(in srgb,
				      var(--we-readability-base) calc(var(--we-readability-floor) * 100%),
				      color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) calc(var(--we-settings-window-alpha) * 1.1 * 100%), transparent) calc((1 - var(--we-readability-floor)) * 100%));
				    --dsw-specific-sidebar-nav-item-active: color-mix(in srgb, var(--we-accent-src, #4f8cff) 30%, rgba(255, 255, 255, 0.06));
				    --dsw-specific-sidebar-nav-item-hover: color-mix(in srgb, var(--we-accent-src, #4f8cff) 14%, rgba(255, 255, 255, 0.04));
				  }
				  body[data-ds-dark-theme][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"])::before {
				    background-image: linear-gradient(
				      180deg,
				      rgba(255, 255, 255, 0.07) 0%,
				      rgba(255, 255, 255, 0.02) 38%,
				      rgba(255, 255, 255, 0.03) 100%
				    );
				  }
				  /* No backdrop-filter support: fall back to near-opaque glass so text stays
				     readable (same policy as the skin's patches.css). */
				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    /* 回退档的令牌同样写在对话框本体（装饰叶没有继承者）。 */
				    body[data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				      --dsw-alias-bg-layer-1: var(--we-surface-tint-light, #ffffff);
				      --dsw-alias-bg-layer-2: var(--we-surface-tint-light, #ffffff);
				      --dsw-alias-bg-layer-3: var(--we-surface-tint-light, #ffffff);
				    }
				    body[data-ds-dark-theme][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				      --dsw-alias-bg-layer-1: var(--we-surface-tint-dark, #0d1524);
				      --dsw-alias-bg-layer-2: var(--we-surface-tint-dark, #0d1524);
				      --dsw-alias-bg-layer-3: var(--we-surface-tint-dark, #0d1524);
				    }
				    /* 同一个「无 backdrop-filter ⇒ 近不透明」政策也要覆盖**整窗**那层表面令牌：
				       玻璃配方在没有模糊的内核上等于「半透明 + 无霜」，文字会直接落在壁纸上。
				       浅色选择器写成与映射规则同特异度（0,1,1），深色那条 (0,2,1) 顶掉深色映射。 */
				    body[data-we-glass-page],
				    body[data-ds-dark-theme][data-we-glass-page] {
				      --dsw-alias-bg-layer-1: var(--we-panel-color, #ffffff);
				      --dsw-alias-bg-layer-2: var(--we-panel-color, #ffffff);
				      --dsw-alias-bg-layer-3: var(--we-panel-color, #ffffff);
				      --dsw-alias-button-elevated-fill: var(--we-panel-color, #ffffff);
				      /* markdown 代码块 / 行内代码也在这张回退表里：没有模糊时半透明 = 文字直接压在
				         花壁纸上，代码注释／字符串首当其冲（与上面 .cm-editor / .xterm 同一条政策）。 */
				      --dsw-alias-markdown-code-block: var(--we-panel-color, #ffffff);
				      --dsw-alias-markdown-code-block-banner: var(--we-panel-color, #ffffff);
				      --dsw-alias-markdown-inline-code: var(--we-panel-color, #ffffff);
				      --dsw-alias-markdown-tag: var(--we-panel-color, #ffffff);
				      --dsw-alias-markdown-code-segment-unselected: var(--we-panel-color, #ffffff);
				      --dsw-alias-markdown-code-segment-selected: var(--we-panel-color, #ffffff);
				    }
				  }

				  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
				    body[data-we-glass-page],
				    body[data-ds-dark-theme][data-we-glass-page] {
				      --we-chat-glass-fill: color-mix(in srgb, var(--we-readability-base) 92%, transparent);
				      --we-tool-glass-fill: var(--we-chat-glass-fill);
				      --we-capsule-glass-fill: var(--we-chat-glass-fill);
				    }
				  }

				  /* ── 插件源浮层（plugin-manager · 宿主自己的浮层）→ 补霜 ─────────────────────
				     #156②：data-install-registry 是 dsh-client-ui-plugin-manager 写在 fieldset 上的
				     源码级布尔属性（「插件源」注册表视图）。宿主把它 portal 到 body（是 body 的直接
				     子节点，不在 [data-chat-flow] 里），宿主规则本身是实底色 --dsw-alias-bg-layer-2 +
				     大阴影，**没有 backdrop-filter**，也不走宿主的半透明菜单通道 —— 那套菜单令牌声明在
				     [data-menu-material] 元素选择器上，子树里裸读 var() 会在 computed-value 阶段整条失效。
				     于是玻璃开着时它仍是一块不透明板。这里只补霜，底色仍归宿主（不重声明
				     --dsw-alias-bg-layer-2，免得与注册表内部那些面板色打架）。
				     模糊半径读「浮层玻璃」这条子项的私有量 --we-floaters-blur（glass.js 的浮层接线无条件写出，
				     取不到时退回全局模糊），与 .we-repo-panel 同档。 */
				  body[data-we-glass-floaters] [data-install-registry] {
				    -webkit-backdrop-filter: blur(var(--we-floaters-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				    backdrop-filter: blur(var(--we-floaters-blur)) saturate(var(--we-saturate, 1.8)) brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);
				  }
				  /* 无模糊内核：同一条「近不透明 / 摘霜」政策在这里也要收口，否则浮层是半透明无霜，
				     文字直接压在壁纸上。 */
				  body[data-we-glass-fallback][data-we-glass-floaters] [data-install-registry] {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }

				  /* 配色 swatches: circular preset buttons + native color picker. The active
				     swatch gets an accent ring so the current choice is obvious at a glance. */
				  /* ── 软件渲染回退（upstream #95，运行时探测）───────────────────────────────
				     有些第三方桌面外壳（增强 / 扩展窗口模式，通常走软件合成）根本不执行
				     backdrop-filter，但属性语法是认的 —— 所以上面那些
				     @supports not ((backdrop-filter: blur(1px)) or (…)) 回退永远为真、永不启用，
				     玻璃面板只剩全透明（「过透」）。detectSoftwareRender() 在运行时探测软件光栅器
				     并把结果挂到 body[data-we-glass-fallback]，下面把同一批回退配方原样再挂一次：
				     相同的 --we-* token、相同的 color-mix 近不透明声明（不新增任何 token /
				     机制），只多一条显式的 backdrop-filter: none（语法检查通过时 @supports
				     做不到这件事）。选择器与上面 @supports 回退逐条对应，并保留各自的总开关
				     (data-we-sidebar-glass / data-we-glass-window)，所以关掉开关仍然是原生外观。
				     输入框卡片按上游 #94 的 ::before 载体单独覆盖（见下方规则）。
				     手动覆盖：?we-glassfallback=on|off（见 detectSoftwareRender）。 ── */
				  body[data-we-glass-fallback][data-we-sidebar-glass] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    background-color: color-mix(in srgb, var(--we-sidebar-color) 92%, transparent) !important;
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  /* 左侧栏液态玻璃（leftSidebarGlass）：软件光栅器下模糊被静默忽略 ⇒ 与上面各条同一配方，
				     钉成 92% 近不透明玻璃并把不会生效的 backdrop-filter 显式关掉。深色那条多一层
				     [data-ds-dark-theme]，与浅色声明同特异度时后写者赢（顺序即优先级）。 */
				  body[data-we-glass-fallback][data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				    background-color: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent) !important;
				    background-image: none !important;
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  /* issue #131：模糊已搬到列自身的 ::before 上；软件光栅器下同样要显式关掉
				     （同一政策：不会生效的 backdrop-filter 不留着）。一条覆盖深浅两色。 */
				  body[data-we-glass-fallback][data-we-glass-page][data-we-left-sidebar] [data-we-surface-plate="left-sidebar"] {
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  body[data-ds-dark-theme][data-we-glass-fallback][data-we-glass-page][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]) {
				    background-color: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 92%, transparent) !important;
				  }
				  /* 标题栏液态玻璃（titlebarGlass）：与上面左栏那两条**同一政策** —— 软件光栅器下模糊被
				     静默忽略，钉成 92% 近不透明玻璃并把不会生效的 backdrop-filter 显式关掉；深色那条多
				     一层 [data-ds-dark-theme]，与浅色声明同特异度时后写者赢（顺序即优先级）。
				     ⚠️ 锚点与主块同口径（含 html[data-windows-titlebar] 那道门）：软件渲染时壁纸层
				        往往没走 GPU 合成，这条是那批形态唯一的兜底。 */
				  html[data-windows-titlebar] body[data-we-glass-fallback][data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				    background: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent) !important;
				  }
				  /* ⚠️ 模糊现在住在 ::after 上（见主块的两条规则）⇒ 软件光栅器下要关的是**它**，
				     不是 ::before —— 关错对象就等于没关（不留不会生效的声明）。 */
				  html[data-windows-titlebar] body[data-we-glass-fallback][data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::after {
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  html[data-windows-titlebar] body[data-ds-dark-theme][data-we-glass-fallback][data-we-glass-page][data-we-titlebar-glass][data-we-adapter^="desktop-"] [data-we-titlebar-anchor]::before {
				    background: color-mix(in srgb, var(--we-surface-tint-dark, #0d1524) 92%, transparent) !important;
				  }
				  body[data-we-glass-fallback][data-we-glass-page] [data-we-surface-plate] {
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  /* 内容面（编辑器/终端）本来就是近不透明底板（--we-content-surface-alpha，兜底
				     88%），这里把同一条声明再挂一遍，让软件渲染下三块侧栏区域落在同一个规则块里。 */
				  body[data-we-glass-fallback][data-we-sidebar-glass] :where([data-we-surface-runtime="content"]) {
				    background-color: color-mix(in srgb, var(--we-content-surface-color, var(--we-panel-color, #1e1f26)) max(calc(var(--we-readability-floor) * 100%), var(--we-content-surface-alpha, 88%)), transparent) !important;
				  }
				  /* 设置窗口：把三层面板 token 钉回实色（@supports 回退里的同一条 token 覆写），
				     并显式关掉不会生效的 backdrop-filter。
				     ⚠️ 令牌写在**对话框本体**（装饰叶没有后代可继承），只有 backdrop-filter 那条
				     落在 ::before 上 —— 它才是会建立包含块的那一半。 */
				  body[data-we-glass-fallback][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				    --dsw-alias-bg-layer-1: var(--we-surface-tint-light, #ffffff);
				    --dsw-alias-bg-layer-2: var(--we-surface-tint-light, #ffffff);
				    --dsw-alias-bg-layer-3: var(--we-surface-tint-light, #ffffff);
				  }
				  body[data-we-glass-fallback][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"])::before {
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  body[data-ds-dark-theme][data-we-glass-fallback][data-we-glass-window] [role="dialog"]:has([data-slot="settings.section"]):where([data-we-surface-runtime="settings-window"]) {
				    --dsw-alias-bg-layer-1: var(--we-surface-tint-dark, #0d1524);
				    --dsw-alias-bg-layer-2: var(--we-surface-tint-dark, #0d1524);
				    --dsw-alias-bg-layer-3: var(--we-surface-tint-dark, #0d1524);
				  }
				  /* 软件光栅器（data-we-glass-fallback）下同样把**整窗**的表面令牌钉回实色：
				     玻璃配方在这一档等于「半透明 + 无霜」（模糊被下面的回退规则关掉），
				     宿主的面板/对话框/按钮面必须回到不透明面板色，否则文字压在壁纸上。
				     深色那条选择器多一层 (0,3,1)，才能顶掉 body[data-ds-dark-theme][data-we-glass-page]
				     上的玻璃映射。 */
				  body[data-we-glass-fallback][data-we-glass-page],
				  body[data-ds-dark-theme][data-we-glass-fallback][data-we-glass-page] {
				    --dsw-alias-bg-layer-1: var(--we-panel-color, #ffffff);
				    --dsw-alias-bg-layer-2: var(--we-panel-color, #ffffff);
				    --dsw-alias-bg-layer-3: var(--we-panel-color, #ffffff);
				    --dsw-alias-button-elevated-fill: var(--we-panel-color, #ffffff);
				    --dsw-specific-selector: var(--we-panel-color, #ffffff);
				  }
				  /* 思考触发条（本仓新增面，见上面「思考触发条」那一节）：它的底色**本来就**由宿主读那个
				     专属令牌 ⇒ 回退档把令牌钉回不透明面板色（--we-panel-color 是主题感知的：浅 #ffffff /
				     深 #1e1f26），模糊没了也不会"过透"。hover 档一并钉回同色 —— 与上面三个 layer 令牌在
				     回退档统一成同一色的口径一致（降级档不保留悬停反馈，优先保可读）。
				     ⚠️ 与主规则同门（data-we-thinking-glass）+ 多一层 fallback 属性：特异性 (0,3,1) 高于
				     主规则的 (0,2,1)（深色档 (0,4,1) 高于深色主规则 (0,3,1)）⇒ 覆盖成立。 */
				  body[data-we-glass-fallback][data-we-thinking-glass][data-we-glass-page],
				  body[data-ds-dark-theme][data-we-glass-fallback][data-we-thinking-glass][data-we-glass-page] {
				    --dsw-alias-turn-trigger-bg: var(--we-panel-color, #ffffff);
				    --dsw-alias-turn-trigger-bg-hover: var(--we-panel-color, #ffffff);
				  }
				  /* 输入框卡片（issue #95 报「过透」的那块界面）：上游 #94 已把模糊从卡片本体搬到
				     [data-composer-card]::before 载体（卡片上的 backdrop-filter 会成为 fixed 后代的
				     包含块，#89）——载体上没有背景，卡片自身的底色只有 --we-glass-alpha（默认 15%），
				     所以只关掉 backdrop-filter 仍然过透。这里让 ::before 自己变成近不透明底板：
				     载体是同一块表面，模糊没了就由它兜住底色，配方与上面 .we-repo-panel 逐字相同
				     （同一个 --we-surface-tint-light/dark / 92%，未新增 token 或机制）。 */
				  body[data-we-glass-fallback][data-we-glass-page] [data-composer-card]::before {
				    background-color: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent);
				    backdrop-filter: none !important;
				    -webkit-backdrop-filter: none !important;
				  }
				  /* A near-opaque canvas is only the no-frost fallback, never normal chat. */
				  body[data-we-glass-fallback][data-we-glass-page],
				  body[data-ds-dark-theme][data-we-glass-fallback][data-we-glass-page] {
				    --we-chat-glass-fill: color-mix(in srgb, var(--we-readability-base) 92%, transparent);
				    --we-tool-glass-fill: var(--we-chat-glass-fill);
				    --we-capsule-glass-fill: var(--we-chat-glass-fill);
				  }
				  /* ⚠️ 这条与上面 92% 不透明的思考玻璃填充配套，挂同一道门 —— 否则关着思考玻璃的
				     fallback 模式也会被摘掉气泡的 backdrop-filter。
				     带 :not([role="tooltip"]) 与上面三条同办（#161）：宿主 Tooltip 从来不吃插件霜釉，
				     清它不是修 bug 而是保持「一条规则只谈气泡」的可读性 + 让守卫按同一判据数。 */
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [class*="_bubble"]:not([role="tooltip"]) {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-turn-trigger],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-vcp-reasoning],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-changed-files],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-presented-file],
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-chat-flow] .md-code-block,
				  body[data-we-glass-fallback][data-we-glass-page][data-we-thinking-glass] [data-vcp-rawhtml] > div > div:has(> pre > code):has(> div > button[title="复制代码"]) {
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }
				  /* 仓库抽屉：与 @supports 回退逐字相同的 92% 近不透明配方。 */
				  body[data-we-glass-fallback] .we-repo-panel {
				    background-color: color-mix(in srgb, var(--we-surface-tint-light, #ffffff) 92%, transparent);
				    backdrop-filter: none;
				    -webkit-backdrop-filter: none;
				  }
				  @media (prefers-reduced-motion: reduce) {
				    .we-repo-panel { transition: none !important; }
				  }

				  /* ── 侧栏全透明（issue #137，设置键 sidebarFullClear，默认关）──────────────
				     用户口径：其他面都能调透，唯独侧栏被可读性下限锁死 —— 地板（浅 0.45 / 深 0.59）
				     以带 !important 的 color-mix 恒定掺入，侧栏透明度拉满也绕不过。本组规则在
				     **壁纸激活**时把插件画在侧栏上的底色层整块撤掉，让用户主动放弃下限换全透：
				       · 第一条按**容器**就地归零六个变量（地板 / 色染 / 釉光三组）：面板规则里的
				         color-mix 与白釉渐变在元素上解析时取到的就是 0 ⇒ 玻璃开着时的全部侧栏上色
				         规则（深浅两色、@supports 无霜兜底、软件渲染兜底 —— 这些都读这几个变量）
				         一起透掉；**以后新增读这些变量的侧栏规则也自动被接管**。自定义属性沿 DOM
				         继承 ⇒ 生效与规则书写顺序无关。
				       · 右栏第二条与左列第三条是**显式接管**：玻璃关着时右栏兜底读插件面板色、左列
				         的浅深与兜底写死 92% 釉色（都不走上面的变量）⇒ 把这两处的底色与釉光直接画
				         透。落盘位置晚于全部既有侧栏规则 ⇒ 同特异度后写者赢（含软件渲染深色那档）。
				     保留：backdrop-filter 照旧 —— 模糊 / 饱和仍由侧栏模糊与全局雾化旋钮管（要彻底
				     清晰就把模糊调 0）；内容面（编辑器 / 终端底板）不归本开关管，仍有自己的透明度
				     旋钮。只在壁纸下生效：无壁纸时侧栏压着的是聊天界面，全透不可读。 */
				  body[data-we-wallpaper][data-we-sidebar-fullclear] [data-dsh-better-sidebar],
				  body[data-we-wallpaper][data-we-sidebar-fullclear] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    --we-readability-floor: 0;
				    --we-sidebar-tint: 0%;
				    --we-sidebar-color: transparent;
				    --we-sidebar-sheen: 0;
				    --we-sidebar-sheen-a: 0;
				    --we-sidebar-sheen-b: 0;
				    --we-sidebar-sheen-c: 0;
				  }
				  body[data-we-wallpaper][data-we-sidebar-fullclear] [data-sidebar-right-panel][data-sidebar-right-open]:where([data-we-surface-runtime="right-sidebar"]) {
				    background-color: transparent !important;
				    background-image: none !important;
				  }
				  body[data-we-wallpaper][data-we-sidebar-fullclear][data-we-left-sidebar] div:has(> [data-slot="sidebar"]):where([data-we-surface-runtime="left-sidebar"]),
				  body[data-ds-dark-theme][data-we-wallpaper][data-we-sidebar-fullclear][data-we-left-sidebar] div:has(> [data-slot="sidebar"]) {
				    background-color: transparent !important;
				    background-image: none !important;
				  }

				  /* ── 第三方插件表面的实底底板（issue #277）──────────────────────────────────
				     症状：装了带弹窗 / 自带框架页的第三方插件后，那些面是**半透明**的 ——
				     背后的页面内容、兄弟弹窗一起透上来，叠成一团看不清。

				     根因（真 Chromium 实测）：本插件把宿主的层令牌
				     --dsw-alias-bg-layer-1/2/3、--dsw-alias-bg-base、--dsw-alias-bg-overlay
				     **重映射成玻璃配方**（半透明 + 染色地板），而宿主自己的面各有专门规则把底补回来
				     （设置窗 :has([data-slot])、插件管理器 [data-install-registry]、输入卡、气泡…）。
				     第三方写的容器**一个都不匹配**这些锚点 ⇒ 它们读到的就是玻璃配方 ⇒
				     「半透明且没有 backdrop-filter」= 后面的东西直接透出。

				     实测（深色档，本包的 CSS_GLASS + 宿主令牌替身）：
				       宿主设置窗                      α = 1.000（有专门规则）
				       role="dialog" 第三方弹窗         α = 0.656、backdrop-filter: none
				       tooltip / listbox               α = 0.675 / 0.662
				       无 role 的 body 直系框架层        α = 0.656
				       无 role 的 _header 吸顶条         α = 0.649
				       宿主自己的确认框 / 审批卡 / 问答卡  α = 0.656~0.662（同一个洞的受害者）
				       宿主设置窗**本体**                α = 0（玻璃画在 ::before 上，见下面的排除项）

				     为什么只做 ARIA 这一层（#277 评论里的意见我采纳了一半，另一半**明确不做**）：
				       评论指出「吸顶条 / 整页框架层不带 role，只认 ARIA 覆盖不到」—— 这是对的，
				       真机实测也确认了（α≈0.65 仍透）。但那类面**没有稳定锚点**：宿主不给它们
				       data-* 属性，第三方插件的类名又是哈希，唯一可用的识别方式是「body 直系」
				       或「类名含 sticky/header」这类**结构猜测**。
				       本仓纪律明确禁止猜哈希；而 structure-guess 会误伤宿主自己的框架层（那是壁纸
				       该透出来的地方）。所以本 PR **只落地可被稳定识别的 ARIA 浮层**，
				       并在 PR 正文里把「无 role 面」作为**已知边界**交给维护者裁决（要么宿主加锚点，
				       要么明确接受这些面半透明）。
				       这样做的好处：射程可验证、零误伤、不与 W5 的锚点门控纪律冲突。

				     ⚠️ 实底只能靠「在浮层作用域里重声明层令牌」落地，**不能**直接涂
				        background-color，更不能摘 backdrop-filter（用户截图回归：ContextMeter /
				        Token 用量 / 会话统计 三个宿主锚定浮层都是 portal 到 body 的 role="dialog"，
				        自带菜单材质 background: var(--dsw-specific-menu) + blur(40px) 的霜；
				        一刀切涂底 + 摘霜会把它们刷成不透明板，用户口径就是「玻璃组件丢失」）。
				        令牌重声明只影响读 --dsw-alias-bg-layer-* 的浮层（正是 #277 的受害者），
				        读菜单材质令牌的浮层一个字节都不碰：它们的底与霜都是宿主自己的玻璃。

				     ⚠️ 门控 = data-we-floater-solid（设置项 floaterSolidBase，默认开）。
				        摘掉属性整组失效 ⇒ W5「关 ⇒ 回退干净」成立。
				     ⚠️ 令牌值取 --we-readability-base（本包按主题钳制过的染色地板）⇒ 跟着主题与
				        用户选的玻璃色走，不是硬编码另一种灰。
				     ⚠️ 只重声明三层背景令牌，不碰 border / 圆角 / 阴影，也不碰霜。
				     ⚠️ **必须显式排除宿主自己的对话框**（三个 :not）：
				        设置窗在真实 DOM 里**就是** role="dialog" —— 它的玻璃画在 ::before（z-index:-1）上、
				        本体透明。本组规则若命中本体，会给它涂一层不透明底把玻璃整个盖掉
				        （实测：门开 ⇒ 设置窗完全不透，与"壁纸该透出来"直接冲突）。
				        · :not([data-we-surface-runtime]) —— 本插件认领过的面（玻璃开着时都带这个标记），
				          它们各有自己的底板规则，这里一个都不许碰。
				        · :not([data-we-host-dialog]) —— 覆盖「保留原生」档：那一档 glass-surfaces.js
				          会把 data-we-surface-runtime **摘掉**，只用上面那一个 :not 挡不住
				          （实测：宿主面板色 rgb(30,31,38) 被改成 --we-readability-base）。
				          这个标记由同一个运行时在识别设置窗时无条件打上，与玻璃开不开无关。
				        · :not([class*="_dialog"]) —— 宿主 primitives 的 Modal（role="dialog" +
				          CSS Module 语义后缀 _dialog：「添加插件」安装对话框、确认框、审批卡…
				          首例见用户截图）。它们的遮罩**自己就画** backdrop-filter:
				          var(--dsw-mask-blur)，而本包在 body 上把这条通道换成了模糊配方
				          （见上面 #156① 那段）⇒ 卡片背后已经是模糊的页面，读层令牌就是半透明玻璃，
				          没有"两行字叠在一起"的重影风险；1.4.2 发布版本来就是这种玻璃观感。
				          本组最初一刀切实底化，用户口径是「添加插件界面玻璃丢失」。
				          ⚠️ 用类名后缀而不是 aria-modal：宿主 Modal 的 dialog 类名恒定带 _dialog
				          （Modal.module.css 的 .dialog），第三方浮层用 dshMarketOverlay /
				          typeFilterPanel 这类名字，照旧命中实底。
				        ⚠️ 不写 :has([data-slot="settings.section"]) 之类的宿主锚点排除：会被 ② 组判成
				          "未登记的玻璃面"，且会让本组规则被算进 settings-window 面而使 W5 判红（都实测踩过）。
				          三个排除项里两个 data-we-* 是本插件自己的标记，anchorsOf() 按前缀跳过，不参与枚举；
				          class 子串不是 data-* 锚点，也不参与。 */
				  body[data-we-glass-page][data-we-floater-solid] :where([role="dialog"], [aria-modal="true"]):not([class*="_dialog"]):not([data-we-surface-runtime]):not([data-we-host-dialog]) {
				    --dsw-alias-bg-layer-1: var(--we-readability-base, #ffffff);
				    --dsw-alias-bg-layer-2: var(--we-readability-base, #ffffff);
				    --dsw-alias-bg-layer-3: var(--we-readability-base, #ffffff);
				  }
				  body[data-we-glass-page][data-we-floater-solid] :where([role="alertdialog"]):not([class*="_dialog"]):not([data-we-surface-runtime]):not([data-we-host-dialog]) {
				    --dsw-alias-bg-layer-1: var(--we-readability-base, #ffffff);
				    --dsw-alias-bg-layer-2: var(--we-readability-base, #ffffff);
				    --dsw-alias-bg-layer-3: var(--we-readability-base, #ffffff);
				  }
				  /* #315：无 role 浮层的可声明实底（#277 的剩余边界第一步）。
				     上面两条只认 ARIA 面；没有 role 的框架层 / 吸顶条 / 第三方容器没有稳定锚点，
				     按类名或结构猜会误伤宿主自己的框架层（壁纸该透出来的地方），也会被对方改类名
				     静默失效。这里给「用户显式声明过的额外选择器」一条确定出路：运行时在
				     resolver 判定该面**只能退回原生**（无法安全玻璃化）时打上 data-we-solid-base，
				     本规则据此补实底 —— 观感从「半透明且无霜」变成「实底可读」。
				     ⚠️ 只认锚点：没被声明的面不匹配本规则；锚点由 glass-surfaces.js 的
				        weSurfaceSolid/weSurfaceUnsolid 成对写入/还原，随退出枚举、退回可玻璃化档位、
				        行级重挂与 dispose 一并清掉。
				     ⚠️ 与上面一组同门（floaterSolidBase，默认开）：摘掉 body 门整组回退。
				     ⚠️ 不写 background-image、不碰 border/圆角/阴影，保持与 #277 实底同一口径。 */
				  body[data-we-glass-page][data-we-floater-solid] [data-we-solid-base]:not([data-we-host-dialog]) {
				    background-color: var(--we-readability-base, #ffffff) !important;
				    -webkit-backdrop-filter: none !important;
				    backdrop-filter: none !important;
				  }

				  /* ── 上下文占用环（ContextMeter）：轨道不得吃「边框」滑杆 ────────────────────
				     症状（用户截图）：底栏上下文占用的小圈"总是像满了"，进度弧看不出来。
				     根因：#255④ 把 --dsw-alias-border-l3 一起接进「边框」滑杆；宿主
				     ContextMeter 的轨道圆环（circle class="*_track"）正是用它画的，进度弧
				     （circle class="*_fill"）用 --dsw-alias-label-tertiary。用户配置 border=0.9 时
				     轨道合成到 ~#a6a6a6，比弧（#979da6）还亮 ⇒ 整圈都像已占用。
				     修法：轨道改由文字三档色稀释而来（与进度弧同源，恒比它淡），不新增令牌、
				     不碰弧、也不改边框滑杆的其它消费者。锚点取 CSS Module 的语义后缀 _track
				     （哈希前缀随构建变、后缀稳定；宿主里只有 ContextMeter 用 circle._track）。 */
				  body[data-we-glass-page] circle[class*="_track"] {
				    stroke: color-mix(in srgb, var(--dsw-alias-label-tertiary, #979da6) 32%, transparent);
				  }

				`;

				// ── 内联模块：packages/glass/src/glass-surfaces.js —— 统一表面策略、安全载体、动态几何与可撤销生命周期（ADR-0016 迁入）；weGlassSurfaceStatus 经入口的 registerGlassStatus 登记回主包（外观 ctx 的诊断投影）（构建期注入；勿手改本段）──
				/**
				 * glass-surfaces.js — 表面策略与可撤销运行管理。
				 * 参数沿用 glass.js 写出的变量；只给已验证页面区域放置根级背景叶节点。
				 * 不改变共享祖先的定位、层叠、滤镜或宿主内容树；不安全的区域完整保留原生背景。
				 * 额外选择器仅借用原生已有的定位/层叠上下文，不为其制造上下文。
				 * sync/dispose 经 glass-extra 接入既有 effects 生命周期；静止时不安排循环帧。
				 */
				function weResolveSurface(id, selection, facts) {
				  const native = (reason) => ({ mode: "native", reason });
				  if (selection && selection.glassSurfacePolicy && selection.glassSurfacePolicy[id] === "native") return native("policy-native");
				  if (facts.preserve) return native("preserve");
				  if (!facts.enabled) return native("disabled");
				  if (!facts.visible) return native("hidden");
				  if (facts.nativeBlur) return native("native-blur");
				  if (facts.occupied) return native("carrier-busy");
				  if (id === "content") return { mode: "content", reason: "known-canvas" };
				  if (id === "settings-window" || id === "declared") return facts.safeLocal
				    ? { mode: "local", reason: "native-context" } : native("unsafe-local-carrier");
				  if (id === "extra") {
				    // 拒绝次序不放宽：unsafe-local-carrier 仍先于软渲档 —— 非安全上下文照旧完整原生。
				    if (!facts.safeLocal) return native("unsafe-local-carrier");
				    // 软渲档显式回退（G6）：resolver 打出 extra-fallback 标记 ⇒ glass-extra 的无霜
				    // 不透明底色规则（body[data-we-glass-fallback] 组）才有着力点；非安全上下文不进这里。
				    if (facts.software) return { mode: "extra-fallback", reason: "software-fallback" };
				    return { mode: "local", reason: "native-context" };
				  }
				  if (!facts.safeRoot) return native("unsafe-root-geometry");
				  return { mode: facts.software ? "plate" : "root", reason: facts.software ? "software-fallback" : "page-region" };
				}

				let weSurfaceRuntime = null;
				const WE_SURFACE_MARKER = "data-we-surface-runtime";
				// #277：浮层实底底板**不得命中**的宿主面标记。与 WE_SURFACE_MARKER 分开是为了覆盖
				// 「保留原生」档 —— 那一档 weSurfaceUnmark 会把 data-we-surface-runtime 摘掉，
				// 于是仅靠 :not([data-we-surface-runtime]) 挡不住设置窗（实测：底色被从宿主面板色
				// rgb(30,31,38) 改成插件的 --we-readability-base）。本标记只在**本插件认领的宿主面
				// 是 ARIA 浮层**时打上，且不随 native 摘除 —— 它表达的是"这是宿主自己的对话框，
				// 不是第三方浮层"，与玻璃开不开无关。
				const WE_HOST_FLOATER_MARKER = "data-we-host-dialog";
				// 不随模块实例重置的页面级登记：HMR / 行重挂后的新实例靠它找到并拆掉旧实例
				// 的观察者与装饰根，避免同一 target 被多份 backdrop-filter 同时认领。
				const WE_SURFACE_RUNTIME_KEY = "__dshWallpaperGlassSurfaceRuntime";
				// #315：无 role 浮层的**可声明实底锚点**。只在「用户显式声明的额外选择器」这一组
				// 生效：resolver 判这块面无法安全玻璃化（退回原生）时，给它一个本插件自己的稳定
				// 锚点，CSS 侧据此补实底 —— 否则这类面是「半透明且没有霜」，背后内容直接透上来。
				// 刻意不按类名/结构猜第三方面：锚点由声明产生，没声明的面继续维持原生观感。
				const WE_SOLID_MARKER = "data-we-solid-base";

				function weSurfaceOwnNode(node) {
				  const el = node && (node.nodeType === 1 ? node : node.parentElement);
				  return !!(el && el.closest && el.closest("[data-we-surface-root], style[data-plugin-css]"));
				}

				function weSurfaceUnmark(record) {
				  // 摘除判值用本 record 实际写过的标记值（markValue），不能假定它等于 record.id：
				  // 软渲档把 extra 面标记跟走为 "extra-fallback"，按 id 判会永久摘不掉。
				  const markValue = record.markValue || record.id;
				  if (record.marked && record.target.getAttribute(WE_SURFACE_MARKER) === markValue) {
				    if (record.before === null) record.target.removeAttribute(WE_SURFACE_MARKER);
				    else record.target.setAttribute(WE_SURFACE_MARKER, record.before);
				  }
				  for (const [node, before] of record.layouts || []) {
				    if (node.getAttribute("data-we-layout-runtime") !== record.id) continue;
				    if (before === null) node.removeAttribute("data-we-layout-runtime");
				    else node.setAttribute("data-we-layout-runtime", before);
				  }
				  record.layouts = new Map();
				  record.marked = false;
				  // #315：实底锚点与 markValue 同生命周期 —— 退回原生/退出枚举/重挂时必须还原，
				  // 否则用户把选择器删掉后那块面仍带着实底（且下次声明会读到错的 before 值）。
				  if (record.solidBefore !== undefined) {
				    if (record.solidBefore === null) record.target.removeAttribute(WE_SOLID_MARKER);
				    else record.target.setAttribute(WE_SOLID_MARKER, record.solidBefore);
				    record.solidBefore = undefined;
				  }
				  if (record.plate) record.plate.remove();
				  record.plate = null;
				}

				/** 给「声明了、但只能退回原生」的 extra 面打实底锚点（幂等；before 只记第一次）。 */
				function weSurfaceSolid(record) {
				  if (record.solidBefore !== undefined) return;
				  record.solidBefore = record.target.getAttribute(WE_SOLID_MARKER);
				  record.target.setAttribute(WE_SOLID_MARKER, "extra");
				}

				/** 摘掉实底锚点并还原声明前的值（回到可玻璃化的档位时用）。 */
				function weSurfaceUnsolid(record) {
				  if (record.solidBefore === undefined) return;
				  if (record.solidBefore === null) record.target.removeAttribute(WE_SOLID_MARKER);
				  else record.target.setAttribute(WE_SOLID_MARKER, record.solidBefore);
				  record.solidBefore = undefined;
				}

				function weSurfaceGeometry(target, id, owned) {
				  const win = target.ownerDocument.defaultView;
				  const style = win.getComputedStyle(target), rect = target.getBoundingClientRect();
				  // 合成微推（client.js nudgeGlassPlateLayers）会在宿主右栏面板上做两帧
				  // translateZ(0)/will-change；这两帧内只对 target 自身豁免，否则 safeRoot 被自家
				  // 微推判死，行切换后右栏退回纯色。data-we-nudge 由微推会话成对写入/摘除，不常驻。
				  const nudged = typeof target.hasAttribute === "function" && target.hasAttribute("data-we-nudge");
				  const visible = target.isConnected && rect.width > 0 && rect.height > 0
				    && style.display !== "none" && style.visibility === "visible" && Number(style.opacity) > 0;
				  const nativeBlur = [style.backdropFilter, style.webkitBackdropFilter].some(v => v && v !== "none");
				  const root = target.ownerDocument.documentElement;
				  const rootStyle = root && win.getComputedStyle(root);
				  // 根平移同时作用于宿主与装饰叶；在共同坐标系内验界，不把哈气位移误判为越界。
				  const translated = rootStyle && rootStyle.translate && rootStyle.translate !== "none";
				  const origin = translated ? root.getBoundingClientRect() : { left: 0, top: 0 };
				  const x = translated ? origin.left + (win.scrollX || 0) : 0;
				  const y = translated ? origin.top + (win.scrollY || 0) : 0;
				  let safeRoot = visible && rect.left >= x && rect.top >= y
				    && rect.right <= x + win.innerWidth + 1 && rect.bottom <= y + win.innerHeight + 1;
				  // 宿主明确声明的 push/fullscreen 才进入右栏安全几何路径；未知模式继续原生回退。
				  if (id === "right-sidebar" && !['push', 'fullscreen'].includes(target.getAttribute("data-sidebar-right-panel"))) safeRoot = false;
				  // ── 正在跑的有限动画 / 过渡 ≠ 不安全 ──────────────────────────────────────
				  // 宿主开合右栏时在**整个 frame** 上做 `grid-template-columns` 过渡
				  // （AppFrame.module.css：`.frame[data-animating]{transition:grid-template-columns …}`），
				  // 而 frame 是左右两侧栏共同的祖先。旧判据把"祖先链上有任何 getAnimations()"当成
				  // unsafeRoot ⇒ 动画期间两侧玻璃同时退回原生、底板被撤掉、动画结束才回来
				  // （用户原话："侧边栏弹出时会出现丢失左右两侧的玻璃效果…只出现在过程中"）。
				  // 口径改为：**有限**的动画/过渡 ⇒ 记录 moving，逐帧跟住载体几何（见 weSurfaceRefresh
				  // 末尾的 follow 调度）；无限动画不跟（防常驻 rAF）、静态 transform 仍不安全。
				  // 这条通用口径取代了本基线原先只认「该侧栏直接所属网格的列宽过渡 + html 纯 translate」
				  // 的窄豁免：窄豁免只管放行，不管几何，过渡期间底板会停在起点；现在统一由 moving
				  // 驱动 follow 循环，左栏（没有 data-rightbar-col 锚）也能一并覆盖。
				  let moving = false;
				  for (let el = target; el; el = el.parentElement) {
				    if (!el.getAnimations) continue;
				    const finite = el.getAnimations().filter((a) => {
				      if (a.playState !== "running" && a.playState !== "pending") return false;
				      const timing = a.effect && typeof a.effect.getComputedTiming === "function" ? a.effect.getComputedTiming() : null;
				      return !timing || Number.isFinite(timing.endTime);
				    });
				    if (finite.length) { moving = true; break; }
				  }
				  for (let el = target; safeRoot && el; el = el.parentElement) {
				    const cs = win.getComputedStyle(el);
				    // 正在做**有限** transform 动画时才放行 transform（几何由 follow 循环跟住）；
				    // 静态 / 无动画 / 无限旋转的 transform 仍按旧纪律回退原生（守卫有负对照）。
				    const running = el.getAnimations
				      ? el.getAnimations().filter((a) => a.playState === "running" || a.playState === "pending")
				      : [];
				    const transformMotion = running.some((a) => {
				      const timing = a.effect && typeof a.effect.getComputedTiming === "function" ? a.effect.getComputedTiming() : null;
				      if (timing && !Number.isFinite(timing.endTime)) return false;
				      return a.transitionProperty === "transform"
				        || (a.effect && typeof a.effect.getKeyframes === "function"
				            && a.effect.getKeyframes().some((k) => k.transform !== undefined));
				    });
				    const ownNudge = nudged && el === target;
				    if (Number(cs.opacity) < 1 || (cs.transform !== "none" && !transformMotion && !ownNudge) || cs.perspective !== "none"
				      || cs.filter !== "none" || (cs.backdropFilter && cs.backdropFilter !== "none")
				      || cs.isolation === "isolate" || cs.mixBlendMode !== "normal" || cs.contain !== "none"
				      || (!ownNudge && /transform|filter|opacity|perspective|contain/.test(cs.willChange))
				      // 根平移（哈气/抖动）同时作用于宿主与装饰叶，weSurfaceRefresh 会换算到叶本地坐标，
				      // 因此根自身不算"静态 transform"；其余元素上的静态 transform 仍一律不安全。
				      || [el === root ? "none" : cs.translate, cs.rotate, cs.scale].some(v => v && v !== "none")
				      || el.closest('[role="dialog"], dialog, [aria-modal="true"]')) safeRoot = false;
				    if (el !== target && (el.scrollTop || el.scrollLeft || /auto|scroll/.test(cs.overflow + cs.overflowX + cs.overflowY))) safeRoot = false;
				    const clip = el.getBoundingClientRect();
				    // 亚像素容差：`getBoundingClientRect()` 返回的是分数值，布局取整会让"贴合同一
				    // 网格边缘"的两个盒子差出零点几像素。实测（DPR 1.25）宿主 AppFrame 右边缘 =
				    // 1281.5999755859375、右栏面板右边缘 = 1281.6000366210938，相差 0.000061px；
				    // 严格 `>` 于是把右栏判成"被祖先裁掉" ⇒ safeRoot 恒假 ⇒ 永不认领 ⇒ 右栏退回
				    // `--we-panel-color` 实色（非全屏下玻璃丢失，且是确定性的、不会自愈）。
				    // 视口边界那一条早就带了 +1 的同款容差；裁剪这一条此前漏了。取 0.5 CSS px：
				    // 真被裁掉半像素以上才判不安全，浮点/取整噪声一律放过。
				    const CLIP_EPSILON = 0.5;
				    if (el !== target && /hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)
				      && (rect.left < clip.left - CLIP_EPSILON || rect.top < clip.top - CLIP_EPSILON
				        || rect.right > clip.right + CLIP_EPSILON || rect.bottom > clip.bottom + CLIP_EPSILON)) safeRoot = false;
				  }
				  const pseudo = ["extra", "settings-window", "declared"].includes(id) ? win.getComputedStyle(target, "::before") : null;
				  return {
				    visible, safeRoot, nativeBlur, rect, radius: style.borderRadius, moving,
				    safeLocal: style.position !== "static" && style.zIndex !== "auto" && Number(style.opacity) === 1
				      && style.filter === "none" && style.transform === "none" && style.isolation !== "isolate",
				    occupied: !!(pseudo && pseudo.content !== "none" && pseudo.content !== "normal"
				      && !(owned && pseudo.content === '\"\"')),
				    preserve: !!target.closest("[data-we-surface-preserve]"),
				  };
				}

				function weSurfaceCandidates(state) {
				  const entries = new Map(), doc = state.doc;
				  const add = (target, id, enabled) => {
				    if (!entries.has(target) && !weSurfaceOwnNode(target)) entries.set(target, { target, id, enabled });
				  };
				  const left = doc.querySelectorAll('div:has(> [data-slot="sidebar"])');
				  // 唯一宿主区域才可认领；双侧栏/嵌套未知布局不猜测。
				  for (const target of left) add(target, "left-sidebar", left.length === 1 && state.selection.leftSidebarGlass === true);
				  const right = doc.querySelectorAll("[data-sidebar-right-panel]");
				  // ⚠️ 宿主会为**每个被保留的会话**各渲染一份右栏面板（ui-sidebar-right 的 RightbarRoot
				  //    按 useViews() 逐会话挂一份 SidebarPanel，非当前会话那份由 `.session[hidden]` 包住），
				  //    所以 DOM 里常年有多份 [data-sidebar-right-panel]，但**真正参与布局的只有当前会话那份**。
				  //    旧判据数的是 NodeList 长度 ⇒ 用户只要开过第二个会话的右栏，接管资格就永远为假，
				  //    右侧栏整块退回原生不透明底（"我的右侧侧边栏玻璃效果被改没了"）。
				  //    判据改成"在布局里的面板中，**展开的**恰好一份"：hidden 子树的兄弟不参与，
				  //    可见但未展开的其他面板（fullscreen/push 或旧会话残留）也不否定当前展开的那份。
				  const rightLive = [...right].filter((panel) => !panel.closest("[hidden]") && panel.getClientRects().length > 0);
				  // 宿主可能同时保留**不止一份在布局里的**面板（未隐藏的旧会话 / fullscreen 与 push 并存），
				  // 但真正展开的只有一份：判据看「open 的面板恰好一份」，不要被另一份可见但收起的面板否掉
				  // （旧写法数 rightLive.length===1 会整块退回原生纯色）。
				  const rightOpen = rightLive.filter((panel) => panel.hasAttribute("data-sidebar-right-open"));
				  for (const target of right) {
				    const sole = rightOpen.length === 1 && rightOpen[0] === target;
				    add(target, "right-sidebar", sole && state.selection.sidebarGlass === true);
				  }
				  for (const target of doc.querySelectorAll('[role="dialog"]:has([data-slot="settings.section"])')) {
				    add(target, "settings-window", doc.body.hasAttribute("data-we-glass-window"));
				    // #277：这是**宿主自己的**对话框，不是第三方浮层 ⇒ 浮层实底底板规则必须让路。
				    // 用独立标记而不是 data-we-surface-runtime：后者在「保留原生」档会被摘掉
				    // （见 WE_HOST_FLOATER_MARKER 处的说明），而这条排除在全部档位下都要成立。
				    target.setAttribute(WE_HOST_FLOATER_MARKER, "settings-window");
				  }
				  for (const target of doc.querySelectorAll('[data-we-surface="v1"]')) add(target, "declared", true);
				  // ⚠️ 阅读文件页（`[data-document-preview]`，宿主 dsh-client-ui-sidebar-documentpreview 的
				  // TextPreview 根节点）也是**内容面**：它此前不在这一组里 ⇒ 「内容面透明度 / 内容面底色」
				  // 在那一页从来不生效（用户以为设置被删了）。
				  // 与上面同一条纪律：只认在布局里的面板，hidden 子树里保留的旧会话不参与。
				  for (const panel of rightLive) {
				    if (!panel.hasAttribute("data-sidebar-right-open")) continue;
				    for (const target of panel.querySelectorAll(".cm-editor,.xterm,[data-document-preview]"))
				      add(target, "content", state.selection.sidebarGlass === true);
				  }
				  for (const selector of state.selectors) {
				    for (const target of doc.querySelectorAll(selector)) {
				      if (entries.size >= 32) break;
				      if (target !== doc.body && target !== doc.documentElement) add(target, "extra", true);
				    }
				  }
				  return entries;
				}

				function weSurfaceLayouts(record) {
				  for (const [node, before] of record.layouts || []) {
				    if (node.getAttribute("data-we-layout-runtime") === record.id) {
				      if (before === null) node.removeAttribute("data-we-layout-runtime");
				      else node.setAttribute("data-we-layout-runtime", before);
				    }
				  }
				  record.layouts = new Map();
				  const selector = record.id === "settings-window" ? '[data-slot="settings.section"]' : '[data-we-surface-layout]';
				  for (const node of record.target.querySelectorAll(selector)) {
				    if (node.closest('[data-we-surface-preserve]')) continue;
				    const owner = node.closest('[data-we-surface="v1"]');
				    if (record.id === "declared" ? owner !== record.target : owner !== null) continue;
				    const before = node.getAttribute("data-we-layout-runtime");
				    if (before !== null) continue;
				    record.layouts.set(node, before);
				    node.setAttribute("data-we-layout-runtime", record.id);
				  }
				}

				function weSurfaceModalState(state) {
				  const blocked = [...state.doc.querySelectorAll('[aria-modal="true"],dialog[open],[role="alertdialog"]')].some(node => {
				    if (node.closest('.we-picker__modal,.we-preset-intro,[data-we-owned-modal]')) return false;
				    const style = state.win.getComputedStyle(node), rect = node.getBoundingClientRect();
				    return style.display !== "none" && style.visibility === "visible" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
				  });
				  const body = state.doc.body;
				  if (blocked && !body.hasAttribute("data-we-modal-blocked")) { body.setAttribute("data-we-modal-blocked", ""); state.modalOwned = true; }
				  if (!blocked && state.modalOwned) { body.removeAttribute("data-we-modal-blocked"); state.modalOwned = false; }
				}

				function weSurfaceRefresh(state) {
				  if (state !== weSurfaceRuntime || state.doc.hidden) return;
				  if (!state.doc.body.hasAttribute("data-we-glass-page")) { disposeGlassSurfaces(); return; }
				  // 装饰根可能被另一份模块实例的 prune/清理摘掉；记录表里的 plate 还会指向断开的
				  // 旧节点，必须把 root+plate 一起作废，下面才会重建（marker 保留即可重新挂）。
				  if (state.root && !state.root.isConnected) {
				    state.root = null;
				    for (const record of state.records.values()) record.plate = null;
				  }
				  weSurfaceModalState(state);
				  const entries = weSurfaceCandidates(state), win = state.win;
				  for (const [target, record] of state.records) {
				    if (!entries.has(target)) { weSurfaceUnmark(record); state.records.delete(target); }
				  }
				  // ── 读/写分相 ───────────────────────────────────────────────────────────
				  // `weSurfaceGeometry` 每轮要沿祖先链做 getComputedStyle + 对目标 getBoundingClientRect；
				  // 原来紧跟着在同一个循环里写 marker / plate 样式 ⇒ 下一轮读又被自己的写强制布局。
				  // trace 2026-10-30：启动期 6 次 sync 的几何测量全是这种「读—写—读」抖动。
				  // 先把失配记录摘掉、把所有 target 的几何一次读完（本段不做任何 DOM 写），
				  // 写完的循环再统一写 —— 读阶段不会被自己的写打断。
				  for (const [target, entry] of entries) {
				    const record = state.records.get(target);
				    if (record && record.id !== entry.id) { weSurfaceUnmark(record); state.records.delete(target); }
				  }
				  const factsByTarget = new Map();
				  for (const [target, entry] of entries) {
				    let record = state.records.get(target);
				    if (!record) {
				      record = { ...entry, before: target.getAttribute(WE_SURFACE_MARKER), marked: false, plate: null };
				      state.records.set(target, record);
				    }
				    factsByTarget.set(target, weSurfaceGeometry(target, entry.id, record.marked));
				  }
				  const observed = new Set();
				  let moving = false;
				  for (const [target, entry] of entries) {
				    const record = state.records.get(target);
				    const facts = factsByTarget.get(target);
				    if (facts.moving) moving = true;
				    facts.enabled = entry.enabled;
				    facts.software = state.doc.body.hasAttribute("data-we-glass-fallback")
				      || !(win.CSS && (win.CSS.supports("backdrop-filter", "blur(1px)") || win.CSS.supports("-webkit-backdrop-filter", "blur(1px)")));
				    const resolved = record.before !== null && !record.marked ? { mode: "native", reason: "foreign-owner" }
				      : weResolveSurface(entry.id, state.selection, facts);
				    Object.assign(record, resolved);
				    if (resolved.mode === "native") {
				      weSurfaceUnmark(record);
				      // #315：显式声明过的额外面若只能退回原生，至少要可读 —— 打实底锚点让 CSS 补底。
				      if (entry.id === "extra") weSurfaceSolid(record);
				    } else {
				      weSurfaceUnsolid(record);
				      // 标记值跟走 resolver（t9-001）：软渲档把 extra 面标记从 "extra" 切到
				      // "extra-fallback"，解除时切回；weSurfaceUnmark 按 record.markValue 判摘。
				      // 不跟走时软渲专属 CSS 规则（:where([data-we-surface-runtime="extra-fallback"])）
				      // 永不匹配，无霜不透明可读底色落空。
				      const markValue = resolved.mode === "extra-fallback" ? "extra-fallback" : entry.id;
				      if (!record.marked) {
				        target.setAttribute(WE_SURFACE_MARKER, markValue);
				        record.markValue = markValue;
				        record.marked = true;
				      } else if (target.getAttribute(WE_SURFACE_MARKER) !== markValue) {
				        target.setAttribute(WE_SURFACE_MARKER, markValue);
				        record.markValue = markValue;
				      }
				      if (entry.id === "settings-window" || entry.id === "declared") weSurfaceLayouts(record);
				      // extra/extra-fallback 只借用目标原生定位/层叠上下文的 ::before，不建 plate
				      // （契约：不为其制造上下文/节点；plate 属于页面区域根叶形态）。
				      if (resolved.mode !== "local" && resolved.mode !== "content" && entry.id !== "extra") {
				        if (!state.root) {
				          state.root = state.doc.createElement("div");
				          state.root.setAttribute("data-we-surface-root", "v1");
				          state.root.setAttribute("aria-hidden", "true");
				          state.root.setAttribute("inert", "");
				          state.doc.body.appendChild(state.root);
				        }
				        if (!record.plate) {
				          record.plate = state.doc.createElement("div");
				          record.plate.setAttribute("data-we-surface-plate", entry.id);
				          state.root.appendChild(record.plate);
				        }
				        const r = facts.rect, origin = state.root.getBoundingClientRect();
				        // 共同根平移已经作用于装饰叶，viewport 测量须换算到该叶的本地坐标。
				        // 只维护几何属性；cssText 会清掉联动持有的 clip-path，造成展开中漏底。
				        const geometry = { left: (r.left - origin.left) + "px", top: (r.top - origin.top) + "px",
				          width: r.width + "px", height: r.height + "px", borderRadius: facts.radius };
				        for (const [name, value] of Object.entries(geometry)) {
				          if (record.plate.style[name] !== value) record.plate.style[name] = value;
				        }
				      }
				    }
				    for (let el = target; el; el = el.parentElement) observed.add(el);
				  }
				  for (const el of state.observed) if (!observed.has(el)) state.resize.unobserve(el);
				  for (const el of observed) if (!state.observed.has(el)) state.resize.observe(el);
				  state.observed = observed;
				  if (state.root && !state.root.children.length) { state.root.remove(); state.root = null; }
				  // ── 动画跟随（宿主开合侧栏时的 grid-template-columns 过渡）──────────────────
				  // 过渡期间目标的 border-box 尺寸可能不变、只是位置在动（右栏贴着右边缘，
				  // 轨道加宽时它整体平移）⇒ ResizeObserver 不会触发。既然已经决定"有限动画期间
				  // 继续接管"，就必须逐帧重算载体矩形，否则底板会停在动画开始时的位置。
				  // ⚠️ 只在真有 running/pending 的**有限**动画时才续帧；静止后立即停（守卫
				  //    「静止不持续安排帧扫描」有断言），并有 MAX_FOLLOW_FRAMES 兜底防死循环。
				  state.moving = moving;
				  if (moving && state.followFrames < 600) {
				    state.followFrames += 1;
				    state.schedule();
				  } else {
				    state.followFrames = 0;
				  }
				  // 每次 refresh 都收口：旧实例/旧轮次留下的根与 plate 一律只留当前 state.root
				  // 那一份。多层同几何 plate 的 backdrop-filter 会叠加 saturate/brightness/contrast，
				  // 观感就是“右栏对应位置壁纸对比度/饱和度异常”。
				  pruneGlassSurfaces();
				}

				/** 只保留当前 state.root 及其 plate；顺手清掉上一版微推泄漏的、没有 data-we-nudge
				 *  归属的 translateZ(0)+will-change 内联样式（否则 safeRoot 会被永远判死）。 */
				function pruneGlassSurfaces() {
				  if (typeof document === "undefined" || !document.body) return;
				  // keep 必须取**页面级登记**里的 owner：HMR/行重挂后的旧实例也被调用方（探测/微推）
				  // 调进 prune，它的模块变量 weSurfaceRuntime 可能是 null；若按模块变量算 keep，
				  // 旧实例会把当前实例的装饰根当孤儿删掉，留下“有 marker 但没有 plate”的纯色右栏。
				  const shared = document[WE_SURFACE_RUNTIME_KEY];
				  const owner = shared && shared.doc === document ? shared : weSurfaceRuntime;
				  const keep = owner && owner.root && owner.root.isConnected ? owner.root : null;
				  for (const node of document.querySelectorAll("[data-we-surface-root]")) {
				    if (node !== keep) node.remove();
				  }
				  for (const plate of document.querySelectorAll("[data-we-surface-plate]")) {
				    if (keep === null || !keep.contains(plate)) plate.remove();
				  }
				  for (const el of document.querySelectorAll("[data-sidebar-right-panel]")) {
				    if (el.hasAttribute("data-we-nudge")) continue;
				    const style = el.style;
				    if (/^translateZ\(0(?:px)?\)$/i.test(style.transform) && style.willChange === "transform") {
				      style.removeProperty("transform");
				      style.removeProperty("will-change");
				    }
				  }
				}

				function syncGlassSurfaces(selection) {
				  if (typeof document === "undefined" || !document.body || !document.defaultView) return;
				  const win = document.defaultView;
				  // 缺少可验证的几何能力就保留原生，不走定时轮询。
				  if (!win.ResizeObserver || !win.MutationObserver || !win.requestAnimationFrame) return;
				  if (!document.body.hasAttribute("data-we-glass-page")) { disposeGlassSurfaces(); return; }
				  pruneGlassSurfaces();
				  // 同一页面可能因为 HMR / 行重挂而出现**多份本模块实例**：每份都有自己的
				  // weSurfaceRuntime。仅靠模块内变量清不掉其他实例的根，backdrop-filter 会一层层
				  // 叠加（实测 9 个同几何右栏 plate ⇒ 饱和度/对比度爆表）。共享 document 上的
				  // 运行时登记 + 每轮 prune 是跨实例的唯一收口。
				  const shared = document[WE_SURFACE_RUNTIME_KEY];
				  if (shared !== undefined && shared !== weSurfaceRuntime) {
				    if (shared && shared.doc === document) {
				      try { disposeSurfaceState(shared); } catch { /* 下一轮 prune 兜底 */ }
				    } else {
				      try { delete document[WE_SURFACE_RUNTIME_KEY]; } catch { /* ignore */ }
				    }
				  }
				  let state = weSurfaceRuntime;
				  if (state && state.doc !== document) { disposeGlassSurfaces(); state = null; }
				  if (!state) {
				    // 行级开关不会重载页面：上个实例/上一轮状态若留下装饰根或运行标记，先清掉，
				    // 否则新一轮会叠出第二层 backdrop-filter 底板（右栏最明显，刷新才恢复）。
				    for (const node of document.querySelectorAll('[data-we-surface-root]')) node.remove();
				    for (const node of document.querySelectorAll('[data-we-surface-runtime]')) node.removeAttribute('data-we-surface-runtime');
				    for (const node of document.querySelectorAll('[data-we-host-dialog]')) node.removeAttribute('data-we-host-dialog');
				    for (const node of document.querySelectorAll('[data-we-solid-base]')) node.removeAttribute('data-we-solid-base');
				    for (const node of document.querySelectorAll('[data-we-layout-runtime]')) node.removeAttribute('data-we-layout-runtime');
				    state = { doc: document, win, selection, selectors: [], records: new Map(), observed: new Set(), root: null, frame: null, moving: false, followFrames: 0, listeners: [] };
				    weSurfaceRuntime = state;
				    try { document[WE_SURFACE_RUNTIME_KEY] = state; } catch { /* ignore */ }
				    state.schedule = () => {
				      if (state !== weSurfaceRuntime || state.doc.hidden || state.frame !== null) return;
				      state.frame = win.requestAnimationFrame(() => { state.frame = null; weSurfaceRefresh(state); });
				    };
				    state.resize = new win.ResizeObserver(state.schedule);
				    state.mutations = new win.MutationObserver(changes => {
				      const selectors = ['div:has(> [data-slot="sidebar"])', '[data-sidebar-right-panel]', '[data-we-surface]', '[data-we-surface-layout]', '[data-we-surface-root]', '[data-slot="settings.section"]', '[role="dialog"]', '[aria-modal]', 'dialog', '[role="alertdialog"]', '.cm-editor', '.xterm', ...state.selectors].join(",");
				      // 装饰根即使是本插件节点也要能触发刷新：另一份模块实例刚插进来的孤儿根
				      // 必须被 prune 掉，否则多层 backdrop-filter 会叠加成“滤镜爆表”。
				      const relevant = node => node && node.nodeType === 1
				        && (node.matches('[data-we-surface-root]') || (!weSurfaceOwnNode(node)
				          && (node.matches(selectors) || node.querySelector(selectors))));
				      for (const change of changes) {
				        if (weSurfaceOwnNode(change.target)) continue;
				        if (change.type === "childList") {
				          if ([...change.addedNodes, ...change.removedNodes].some(relevant)) { state.schedule(); break; }
				        } else if (change.target === state.doc.body || change.target === state.doc.documentElement
				          || change.attributeName === "data-we-surface-preserve" || change.attributeName === "data-we-surface-layout"
				          || [...state.records.keys()].some(el => el === change.target || change.target.contains(el))
				          || change.target.matches(selectors)) { state.schedule(); break; }
				      }
				    });
				    state.mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true,
				      attributeFilter: ["class", "style", "hidden", "open", "data-sidebar-right-open", "data-sidebar-right-panel",
				        "data-we-surface", "data-we-surface-layout", "data-we-surface-preserve", "role", "aria-modal", "data-we-glass-window", "data-we-glass-page", "data-we-glass-fallback", "data-ds-dark-theme", "data-dsh-skin"] });
				    const listen = (target, name, callback, options) => {
				      target.addEventListener(name, callback, options); state.listeners.push(() => target.removeEventListener(name, callback, options));
				    };
				    for (const event of ["resize", "scroll", "transitionrun", "transitionend", "animationstart", "animationend"])
				      listen(win, event, state.schedule, { capture: true, passive: true });
				    listen(document, "visibilitychange", () => {
				      if (document.hidden) {
				        if (state.frame !== null) win.cancelAnimationFrame(state.frame);
				        state.frame = null;
				        for (const record of state.records.values()) weSurfaceUnmark(record);
				        state.resize.disconnect(); state.observed.clear();
				        if (state.root) { state.root.remove(); state.root = null; }
				      } else state.schedule();
				    });
				  }
				  state.selection = selection || {};
				  const list = typeof sanitizeExtraGlassSelectors === "function" ? sanitizeExtraGlassSelectors(state.selection.extraGlassSelectors) : "";
				  state.selectors = (list ? list.split(", ") : []).filter(selector => {
				    try { document.querySelector(selector); return true; } catch { return false; }
				  });
				  if (state.frame !== null) { win.cancelAnimationFrame(state.frame); state.frame = null; }
				  weSurfaceRefresh(state);
				}

				function disposeGlassSurfaces() {
				  const state = weSurfaceRuntime;
				  if (state) {
				    weSurfaceRuntime = null;
				    disposeSurfaceState(state);
				  }
				  // state 缺失也要兜底扫一遍：HMR/行重挂可能留下另一份实例的根与标记，
				  // 不扫掉就会在下次启用时叠成多层滤镜。
				  if (typeof document !== "undefined" && document.body) {
				    for (const node of document.querySelectorAll("[data-we-surface-root]")) node.remove();
				    for (const node of document.querySelectorAll(`[${WE_SURFACE_MARKER}]`)) node.removeAttribute(WE_SURFACE_MARKER);
				    for (const node of document.querySelectorAll(`[${WE_HOST_FLOATER_MARKER}]`)) node.removeAttribute(WE_HOST_FLOATER_MARKER);
				    for (const node of document.querySelectorAll(`[${WE_SOLID_MARKER}]`)) node.removeAttribute(WE_SOLID_MARKER);
				    for (const node of document.querySelectorAll("[data-we-layout-runtime]")) node.removeAttribute("data-we-layout-runtime");
				    try { delete document[WE_SURFACE_RUNTIME_KEY]; } catch { /* ignore */ }
				  }
				}

				function disposeSurfaceState(state) {
				  if (!state) return;
				  try { if (state.doc[WE_SURFACE_RUNTIME_KEY] === state) delete state.doc[WE_SURFACE_RUNTIME_KEY]; } catch { /* ignore */ }
				  if (state.frame !== null && state.win) state.win.cancelAnimationFrame(state.frame);
				  try { state.mutations.disconnect(); } catch { /* ignore */ }
				  try { state.resize.disconnect(); } catch { /* ignore */ }
				  if (state.modalOwned) state.doc.body.removeAttribute("data-we-modal-blocked");
				  for (const stop of state.listeners) stop();
				  for (const record of state.records.values()) weSurfaceUnmark(record);
				  if (state.root) state.root.remove();
				  // 兜底：记录表与 DOM 万一不同步（行级开关不重载页面，旧实例可能先被清空状态），
				  // 仍要把运行标记与装饰根全部摘掉；否则回注样式后会多出一层旧滤镜。
				  for (const node of state.doc.querySelectorAll('[data-we-surface-root]')) node.remove();
				  for (const node of state.doc.querySelectorAll(`[${WE_SURFACE_MARKER}]`)) node.removeAttribute(WE_SURFACE_MARKER);
				  for (const node of state.doc.querySelectorAll(`[${WE_SOLID_MARKER}]`)) node.removeAttribute(WE_SOLID_MARKER);
				  for (const node of state.doc.querySelectorAll('[data-we-layout-runtime]')) node.removeAttribute('data-we-layout-runtime');
				  state.records.clear(); state.observed.clear();
				}

				/** 高级兼容信息的数据源：不含宿主文本、DOM 引用或任意样式值。 */
				function weGlassSurfaceStatus() {
				  return weSurfaceRuntime ? [...weSurfaceRuntime.records.values()].map(({ id, mode, reason }) => ({ id, mode, reason })) : [];
				}

				// ── 内联模块：packages/glass/src/glass.js —— 玻璃后端：取值解析 / 各面釉层变量 / 门控属性（无条件写，值槽位与开关正交；ADR-0016 第三刀迁入）（构建期注入；勿手改本段）──
				/**
				 * glass.js — **玻璃后端的唯一落点**：取值解析 + 各面釉层变量 + 门控属性。
				 *
				 * 为什么单开一个文件：它的**输入输出是封闭的** —— 只需要 `selection` 与
				 * `document.body.style`，外加两个纯函数（`weClampSurfaceColor` 顶层共享、`toRgbTriple` 本文件）。
				 * 于是 ⑪/⑫/⑬ 三组守卫读的"写了什么"有了**单一归属**。
				 *
				 * 契约（三条，都是实测换来的，推导过程属历史，见 CHANGELOG 与 git 历史）：
				 *   ① **每档都算出值并写出**（`applyGlass` 里没有任何 `removeProperty`）——"不写"永远不等于
				 *      "撤销"：CSS 的 `var(--x, 兜底)` 只在 `--x` **未定义**时取兜底，而写到 body 上的变量
				 *      一直是"已定义"的。
				 *   ② **门控属性恒挂**（`data-we-glass-page` / `-chat` / `-window` / `-floaters` **不可关**；`data-we-left-sidebar`、
				 *      `data-we-titlebar-glass`、`data-we-sidebar-glass`），与"用谁的值"**正交**：关掉只是让那组规则整组不匹配。
				 *   ③ **读谁只在这里决定**：`glassValue(面, 参数, 自己的键, 全局的键)`；UI 只翻开关，不动接线。
				 *
				 * ⚠️ 本文件**不读** `selection` 以外的状态。`norm` / `denorm` / `toRgbTriple` 是本文件内的
				 *    工具；`weClampSurfaceColor` 经主包显式键集从 host 取（玻璃是独立 bundle，不存在主包工厂
				 *    作用域 —— 裸符号会运行期 ReferenceError；见 packages/glass/src/client.js 的解构）。
				 */

				// RGB 三元组：给 rgba() 槽位用（消息气泡 / 输入框的白釉染色）。
				// ⚠️ 下标 [0,2,4] —— 6 位 hex 不带 '#'，[1,3,5] 是带 '#' 时代的错位写法。
				// （本函数同时服务 `effects.js` 的全局 `--we-surface-tint-rgb-*`，所以放在顶层而不是 applyGlass 里。）
				const toRgbTriple = (hex) => {
				  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ""));
				  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(", ") : "255, 255, 255";
				};

				/** 每次 applyEffects 调用一次：把每个玻璃面的值算出来并写出，再挂/摘门控属性。 */
				function applyGlass(selection, s) {
				  // ── 「皮肤在台上」的让路态：整族门控摘掉、本函数一概不挂（互操作块见 src/client.js）──
				  // 这里是唯一会整族摘门控的路径。
				  if (typeof skinYieldActive === "function" && skinYieldActive()) {
				    for (const attr of ["data-we-glass-page", "data-we-glass-chat", "data-we-glass-window",
				      "data-we-left-sidebar", "data-we-titlebar-glass", "data-we-sidebar-glass", "data-we-sidebar-fullclear", "data-we-glass-floaters",
				      "data-we-floater-solid"]) {
				      document.body.removeAttribute(attr);
				    }
				    return;
				  }
				  // ── 页面玻璃总锚点：**恒挂**（插件在跑 = 玻璃在算值 ⇒ 配方该生效）───────────────
				  // glass-css.js 里全部"整页接管"的玻璃规则（表面令牌映射 / 对话栏 / 轨迹 / 左栏 /
				  // 右栏面板 / 两档回退）都挂在这个属性下 —— 它与 `data-we-wallpaper`（壁纸层在场、
				  // 页面让开）**正交**：壁纸只是玻璃的背景来源之一，不是玻璃的前提 —— 否则不设壁纸时
				  // 玻璃参数全是死旋钮（用户报障：「页面玻璃效果只有设置壁纸后才生效」）。卸载路径在
				  // 玻璃行为层的 disposeGlassLayer 成对撤除（与 -chat / -window / -floaters 同批）。
				  document.body.setAttribute("data-we-glass-page", "on");
				  // ── 玻璃面 × 参数的取值解析（**两态**，由 `glassMode` 说读谁）────────────────────
				  //
				  // 模型：每个玻璃面的每个参数只有**一个**取值来源 ——
				  //   · 该面处于 `'custom'` ⇒ 读它**自己**的键
				  //   · 否则（`'inherit'`，**默认**）⇒ 读**全局**键
				  // 所以"继承"与"独立"不是两条并行的接线，而是同一条线上的两个来源。
				  //
				  // ⚠️ **必须定义在第一个使用点之前**（本函数内 `const` 有 TDZ）：否则会直接抛
				  //   `Cannot access 'glassValue' before initialization`。
				  //
				  // ⚠️ 解析发生在**此处（JS）**、不是靠 CSS 变量缺省值：侧栏那条 CSS 用
				  //   color-mix(var(--we-sidebar-color) … var(--we-sidebar-tint) …)，变量一旦缺失整条
				  //   声明会被丢弃（侧栏变全透明），所以回退路径必须是"写另一个值"，不是"不写"。
				  //
				  // ⚠️ **只有这里**决定"读全局还是读自己"；UI 开关只需翻 `glassMode`，不需要再动接线。
				  //
				  // ⚠️ `param` 仍然要传：它是**声明**而非运行期分支 —— 守卫第 ④ 组拿这些调用点与注册表的
				  //   `params` 逐参数对账（"注册表声明了却没接线"= 死旋钮）。能力由这条对账 + 第 ⑬ 组
				  //   "写了必须被 CSS 读到"共同保证，不靠手抄的能力表。
				  const glassModeOn = (surface) => {
				    const rec = selection.glassMode;
				    return !!(rec && typeof rec === 'object' && rec[surface] === 'custom');
				  };
				  /** 面 × 参数 → 取值：**模式是 custom** 读 profile，否则读全局。
				   *
				   *  ⚠️ custom 档上**没设过值**（undefined / null / 空串）时仍回落全局（#324）：
				   *  `conversationColor` 这类键在 schema 里没有默认值，用户只翻开关、没点色板时它
				   *  是 undefined；旧写法直接把它交给 `weClampSurfaceColor`，颜色一缺就掉到主题常量
				   *  （深色 #0d1524 / 浅色 #ffffff），面板上看着"跟随全局"、实际画的是另一块板。
				   *  回落判据按"有没有值"而不是真假：0 / false 都是合法取值。 */
				  const hasOwnValue = (v) => v !== undefined && v !== null && v !== '';
				  const glassValue = (surface, param, profileValue, globalValue) =>
				    (glassModeOn(surface) && hasOwnValue(profileValue) ? profileValue : globalValue);

				  // ── 设置窗口这个玻璃面的**按面**釉层变量 ────────────────────────────────────────
				  // 该面的 CSS 现在读 `var(--we-settings-window-<x>, <原全局表达式>)`（见 glass-css.js 的
				  // 「设置窗口」4 条规则）⇒ 这一组变量就是它的来源，"读全局还是读自己"由 `glassValue` 决定。
				  //
				  // ⚠️ **两项能做到，两项做不到**（取证结论）：
				  //   ✅ 模糊 / 透明度 —— 判据对它们要么无锚定，要么是**子串判定**
				  //      （G5 的 `readsBoth` 只要求 `var(--we-blur` 出现，内层兜底保留了它）。
				  //   ❌ 保真度与下限覆盖度 —— F2a 的面纱形要求声明**以** `var(--we-readability-base)`
				  //      开头，且 F1c 要求 `body{}` 里那条 floor 声明原样在 ⇒ 这一面的地板永远来自全局。
				  //      所以本面**没有** `settingsWindowFidelity`（给了也接不通）。
				  //   ⚪ 饱和度 / 亮度 —— 它们**不是可配置参数**（全局 `--we-saturate` 是常量
				  //      `GLASS_SATURATE`、brightness 在设置窗口被钉在 1.04）⇒ 不纳入逐面独立，
				  //      否则会给用户一个登记表里不存在的旋钮。
				  //
				  // ── **单一解析 + 无条件写入** ────────────────────────────────────────────────
				  // 原则：**"不写"永远不等于"撤销"** —— CSS 的 `var(--we-x, 兜底)` 只在 `--we-x`
				  // **未定义**时才取兜底，而变量一旦被写到 `document.body.style` 上，它就一直是"已定义"的
				  //（实测：关掉独立配置后旧值继续生效，用户看到的是"没接受全局配置"）。
				  // ⇒ 每档都算出正确的值并写出：独立档 = 本面的键，跟随档 = 全局的键（由 `glassValue` 决定
				  //   读谁）。"该撤没撤"于是**在结构上无法发生**。
				  // ⚠️ 跟随档写出的值 == CSS 兜底本来会取到的值
				  //   （`--we-blur` 就是 `blur + "px"`；`--we-glass-alpha` 与本面的 alpha 曲线同形），
				  //   等价性要求：有效取值零差异。
				  // "要不要玻璃"仍由**门控属性**管（层叠机制），与"用谁的值"正交。
				  {
				    // 本面的透明度曲线：与全局**同形**（滑杆 0–100 → 0.25…0.10，数值越大越透）。
				    const pct = Number(glassValue("settingsWindow", "transparency", selection.settingsWindowTransparency, selection.glassAlpha)) || 0;
				    s.setProperty("--we-settings-window-blur",
				      glassValue("settingsWindow", "blur", selection.settingsWindowBlur, selection.blur) + "px");
				    s.setProperty("--we-settings-window-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
				  }

				  // - 对话栏玻璃保真度：并入「对话框玻璃·独立配置」—— 两个旋钮控同一件事，只留一个（用户口径）。
				  //   存储键**复用** `chatGlassFidelity`（不新建平行键），所以老配置的值不丢。
				  //   ⚠️ 取值的"读谁"判定经 `glassValue`：开了「对话框玻璃·独立配置」才读它自己的键，
				  //   否则**继承全局**的 `glassFidelity`。
				  //   只喂对话栏的**框架**玻璃面（气泡 / 输入卡片含工具弹卡 —— glass-css.js 里消费
				  //   --we-chat-readability-* 的那批声明）。正文里的 markdown 内容面（代码块 / 行内代码 /
				  //   引用等）刻意**不**跟本档：内容渲染面与侧边栏一起跟全局保真度（用户口径：代码块不和
				  //   输入框一起）。tint 钳制与地板权重都按本档单独算（同源不变量）。
				  const chatFidRaw = glassValue("conversation", "fidelity", selection.chatGlassFidelity, selection.glassFidelity);
				  const chatFidNum = Number(chatFidRaw);
				  const chatGlassFidelity = Number.isFinite(chatFidNum) ? Math.min(1, Math.max(0, chatFidNum / 100)) : 1;
				  s.setProperty("--we-chat-glass-fidelity", String(chatGlassFidelity));
				  // 釉色也按同一判定：开了独立配置就用它**自己**的颜色，否则用全局玻璃色。
				  // #159②：全局那一侧**分主题取** —— 「玻璃颜色」存的是 `{light, dark}` 一对（见
				  // lib/settings-schema.js 的 readGlassColors），这里按主题各取一半；`conversationColor`
				  // 是「对话栏玻璃·独立配置」的单值，不分主题（与保真度那条同构）。
				  const chatColorLight = glassValue("conversation", "color", selection.conversationColor, glassColorOf(selection, "light"));
				  const chatColorDark = glassValue("conversation", "color", selection.conversationColor, glassColorOf(selection, "dark"));
				  s.setProperty("--we-chat-surface-tint-light", weClampSurfaceColor(chatColorLight, "light", chatGlassFidelity));
				  s.setProperty("--we-chat-surface-tint-dark", weClampSurfaceColor(chatColorDark, "dark", chatGlassFidelity));
				  s.setProperty("--we-chat-surface-tint-rgb-light", toRgbTriple(weClampSurfaceColor(chatColorLight, "light", chatGlassFidelity)));
				  s.setProperty("--we-chat-surface-tint-rgb-dark", toRgbTriple(weClampSurfaceColor(chatColorDark, "dark", chatGlassFidelity)));

				  // ── 思考触发条的**按面**釉层变量 ──────────────────────────────────────────────
				  // 该面的 CSS 读 `var(--we-thinking-trigger-<x>, <原全局表达式>)`（glass-css.js 里那条
				  // **接管宿主令牌**的规则）⇒ 这一组变量就是它的来源，"读全局还是读自己"由 `glassValue` 决定。
				  // ⚠️ 只写**两项**（模糊 / 透明度）：与 `settingsWindow` / `floaters` 同一口径 ——
				  //    共享面纱 ⇒ 保真度不可达；本面的 CSS 不消费颜色 ⇒ 不给 `color`。
				  // ⚠️ 曲线与其余面**同形**（0–60 / 0–100 一把刻度）：透明度是位置量，越大越透。
				  {
				    const pct = Number(glassValue("thinkingTrigger", "transparency", selection.thinkingTriggerTransparency, selection.glassAlpha)) || 0;
				    s.setProperty("--we-thinking-trigger-blur",
				      String(glassValue("thinkingTrigger", "blur", selection.thinkingTriggerBlur, selection.blur)) + "px");
				    s.setProperty("--we-thinking-trigger-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
				  }
				  // ── 没有「要不要玻璃」这个选项（用户口径）────────────────────────────────────
				  // 不能靠"关掉就摘属性"回到原生：这些面上还有一批**不挂门控**的令牌改写（壁纸激活即生效），
				  // 关掉只得到半玻璃而非原生纯色，要做到"关得像样"得连令牌层一起回退，复杂度远超收益。
				  // ⇒ 本面**恒挂**门控属性；每个子面唯一的开关是「独立配置」（读自己 vs 跟全局）。
				  //   属性保留是因为 CSS 侧的门控是**证书式**的（守卫 ⑨/⑬ 靠它判断"哪些规则画玻璃"），
				  //   删属性要动几十条选择器并把两条判据的前提改掉。
				  document.body.setAttribute("data-we-glass-chat", "on");

				  // 「设置窗口液态玻璃」这个**显示开关**同样不提供（用户口径）：功能由「设置窗口玻璃·独立配置」
				  // 接管，行为与开启时逐位一致（本面恒挂门控属性）—— "...都能到原生"的语义重叠随之消失。
				  // ── 同 `data-we-glass-chat`：本面**恒挂**门控属性 ──────────────────────────────
				  document.body.setAttribute("data-we-glass-window", "on");

				  // 左侧栏液态玻璃：原生左栏（会话列表 / 工作区那一列）默认只是"透明的洞"——壁纸原样
				  // 透出，没有霜、也不吃玻璃参数。打开后 CSS 给那一列刷上与其余面板同一张配方表
				  // （配色 / 玻璃颜色 / 玻璃透明度 / 雾化 / 边框），关掉即逐字节恢复。
				  // 变量与开关节点的落点同玻璃窗口：body 属性 + 样式表规则，切换不需要重建任何东西。
				  if (selection.leftSidebarGlass) document.body.setAttribute("data-we-left-sidebar", "on");
				  else document.body.removeAttribute("data-we-left-sidebar");

				  // ── 侧边栏四角圆角 / 直角（外观 → 侧边栏圆角）────────────────────────────────
				  // 与玻璃无关的一对属性 + 一个变量（CSS 见 glass-css.js 同名块）：左栏锚点 = 座位出口的
				  // **父元素**（出口带 display:contents、不生成盒子），右栏锚点必须带
				  // [data-sidebar-right-open]（容器收起时仍挂在布局里，裸锚会给收起态留一块板子）。
				  // 默认（统一档 'native'、四角都不直角）时**一个属性都不挂** ⇒ 规则不生效、逐字节等于今天。
				  {
				    const px = (v) => (v === "6" || v === "12" || v === "20") ? v + "px" : "";
				    const tokens = (tl, tr, br, bl) => [tl && "tl", tr && "tr", br && "br", bl && "bl"].filter(Boolean).join(" ");
				    const leftR = px(selection.leftSidebarCornerRadius);
				    const rightR = px(selection.rightSidebarCornerRadius);
				    if (leftR) { s.setProperty("--we-left-sidebar-radius", leftR); document.body.setAttribute("data-we-left-sidebar-radius", "on"); }
				    else document.body.removeAttribute("data-we-left-sidebar-radius");
				    if (rightR) { s.setProperty("--we-right-sidebar-radius", rightR); document.body.setAttribute("data-we-right-sidebar-radius", "on"); }
				    else document.body.removeAttribute("data-we-right-sidebar-radius");
				    const leftSq = tokens(selection.leftSidebarSquareTL, selection.leftSidebarSquareTR, selection.leftSidebarSquareBR, selection.leftSidebarSquareBL);
				    const rightSq = tokens(selection.rightSidebarSquareTL, selection.rightSidebarSquareTR, selection.rightSidebarSquareBR, selection.rightSidebarSquareBL);
				    if (leftSq) document.body.setAttribute("data-we-left-sidebar-square", leftSq);
				    else document.body.removeAttribute("data-we-left-sidebar-square");
				    if (rightSq) document.body.setAttribute("data-we-right-sidebar-square", rightSq);
				    else document.body.removeAttribute("data-we-right-sidebar-square");
				  }

				  // ── 左侧栏的**按面**釉层变量 ─────────────────────────────────────────────────
				  // 该面的 CSS 读 `var(--we-left-sidebar-<x>, <原全局表达式>)`（glass-css.js 的
				  // 「左侧栏液态玻璃」规则）⇒ 这一组变量就是它的来源。
				  //
				  // ⚠️ 门控与「玻璃 UI」的子项**不同**（这是乙类的特征）：
				  //   · 子项：`glassMode[面] === 'custom'`（"独立配置"开关）
				  //   · 本面：它**自身**就是那个"独立配置" —— 没开 `leftSidebarGlass`（左侧栏液态玻璃）时它
				  //     连玻璃都不吃；开了就是"用自己那套覆盖全局"。所以门控是
				  //     `glassMode.leftSidebar === 'custom'`（耦合在「左侧栏液态玻璃」下的那个开关）。
				  //
				  // ⚠️ 只写**两项**（模糊 / 透明度）：`--we-saturate` / `--we-glass-brightness` 不是可配置
				  //    参数（常量）、`--we-surface-tint-*` 是 E2 配方文本、`--we-readability-*` 被判据锁定
				  //     ⇒ 其余项逐面独立在"判据不变"下不可达。
				  // ── 同上，**无条件写入** ────────────────────────────────────────────────────
				  // 本面的"要不要玻璃"是 `leftSidebarGlass`（门控属性），与"用谁的值"正交 ⇒
				  // 值这一侧不看任何开关，恒写出解析结果。
				  {
				    const pct = Number(glassValue("leftSidebar", "transparency", selection.leftSidebarTransparency, selection.glassAlpha)) || 0;
				    s.setProperty("--we-left-sidebar-blur",
				      String(glassValue("leftSidebar", "blur", selection.leftSidebarBlur, selection.blur)) + "px");
				    s.setProperty("--we-left-sidebar-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
				  }

				  // 标题栏液态玻璃：壳层顶栏（AppFrame 那个 grid 容器，锚点是**运行时探针**打的
				  // `data-we-titlebar-anchor` —— 宿主类名是 CSS-module 构建哈希、跨构建漂移，写死必然在
				  // 下次升级静默失效（#235）；探针见 glass-layer.js 的 findTitlebarFrame）默认只是那条不透明的
				  // 底色（上面主包 src/styles/shell.js 的「外壳画布底」把外壳画布清成 transparent 之后，这一层是唯一
				  // 必须保留底色的面）。
				  // 打开后 CSS 把它换成**与其余面板同一张配方表**，且与左侧栏那条**逐条同形**
				  // （唯一差别是锚点；**不画**底分割线，理由见 glass-css.js）。
				  // 变量与开关节点的落点同玻璃窗口：body 属性 + 样式表规则，切换不需要重建任何东西。
				  if (selection.titlebarGlass) document.body.setAttribute("data-we-titlebar-glass", "on");
				  else document.body.removeAttribute("data-we-titlebar-glass");

				  // ── 标题栏的**按面**釉层变量 ───────────────────────────────────────────────────
				  // 该面的 CSS 读 `var(--we-titlebar-<x>, …)`（glass-css.js 的「标题栏液态玻璃」规则）
				  // ⇒ 这一组变量就是它的来源。
				  //
				  // ⚠️ 门控与左侧栏**完全同形**（同是乙类）：
				  //   · 侧栏：门控属性 = `leftSidebarGlass`（`data-we-left-sidebar`），
				  //     "用谁的值" = `glassMode.leftSidebar`（「左侧栏玻璃·独立配置」）。
				  //   · 本面：门控属性 = `titlebarGlass`（`data-we-titlebar-glass`），
				  //     "用谁的值" = `glassMode.titlebar`（「标题栏玻璃·独立配置」）。
				  //
				  // ⚠️ 只写**两项**（模糊 / 透明度）：`--we-saturate` / `--we-glass-brightness` 不是可配置
				  //    参数（常量）、`--we-surface-tint-*` 是 E2 配方文本、`--we-readability-*` 被判据锁定
				  //     ⇒ 其余项逐面独立在"判据不变"下不可达。
				  // ── 同上，**无条件写入** ────────────────────────────────────────────────────
				  // 本面的"要不要玻璃"是 `titlebarGlass`（门控属性），与"用谁的值"正交 ⇒
				  // 值这一侧不看任何开关，恒写出解析结果。
				  // ⚠️ **曲线逐字照抄左栏**（`0.25 − pct/100 × 0.15`，下限 0.10）：两条面共用同一把观感
				  //    刻度，用户把左侧栏调到满意的透明度时，标题栏**同一数值**必然是同一观感 ——
				  //    这正是"标题栏与左侧栏不要有色差"在取值侧的保证。
				  {
				    const pct = Number(glassValue("titlebar", "transparency", selection.titlebarTransparency, selection.glassAlpha)) || 0;
				    s.setProperty("--we-titlebar-blur",
				      String(glassValue("titlebar", "blur", selection.titlebarBlur, selection.blur)) + "px");
				    s.setProperty("--we-titlebar-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
				  }

				  // dsh-better-sidebar 液态玻璃：一套独立于会话玻璃的细粒度控制（侧栏模糊 /
				  // 侧栏透明度 / 侧栏玻璃颜色 + 总开关）。变量只作用于 [data-dsh-better-sidebar]
				  // 子树（CSS 见下），关闭总开关时侧栏恢复原生外观。
				  // 每个参数都经 `glassValue` 解析 —— 默认档（`glassMode.sidebar === 'inherit'`）取
				  // **侧栏自己的键**；把某一项关掉才会回落到全局那一个键。
				  // ── 量纲统一 ────────────────────────────────────────────────────────────────
				  // 各面现在共用**同一把规范刻度**：
				  //   · 模糊 **0–60 px**（与全局雾化一致）—— 直接当 px 用，**无曲线**
				  //   · 透明度 **0–100 %**             —— 位置量，各面用自己的**表达曲线**映到观感
				  // 于是"继承"就是"读另一个键的那个数字"，**不需要归一化**（没有 `norm` / `denorm` 这对工具）。
				  //
				  // ⚠️ 这是一次**有意的存储刻度迁移**（用户已授权）：旧档由 `settingsVersion` 4 换算到新刻度
				  //   （见 settings-schema.js 的 migrateSettings），使观感**逐点不变**。换算分两类，别搞混：
				  //   位置量按**占比**换算；**模糊类是直接量，只钳制不换算**（对它换算等于改观感）。
				  // ⚠️ 曲线的分母必须与 KINDS 的上界一致 —— 那是"同一个数字 = 同一个位置"的唯一保证。
				  // 侧栏模糊：本面量程 0–60（与全局雾化同刻度）。
				  const sidebarBlur = Number(glassValue("sidebar", "blur", selection.sidebarBlur, selection.blur)) || 0;
				  s.setProperty("--we-sidebar-blur", sidebarBlur + "px");
				  // 上界就是 60 ⇒ 饱和度补偿项无需 `Math.min(x, 60)` 钳制（钳制是冗余的）。
				  s.setProperty("--we-sidebar-saturate", String(1.15 + sidebarBlur * 0.028));
				  // 侧栏透明度：本面量程 0–100。语义"越大越透"。
				  const sidebarAlphaPct = Number(glassValue("sidebar", "transparency", selection.sidebarAlpha, selection.glassAlpha)) || 0;
				  const sidebarAlpha = Math.max(0.015, 0.32 - (sidebarAlphaPct / 100) * 0.305);
				  // ⚠️ 这里**不写** `--we-sidebar-alpha`：它是死变量（实测：整份样式表里
				  //   精确出现 1 次、且那次在注释里，没有任何 CSS 消费者）。真正接线的是它的两个下游
				  //   派生物 —— `--we-sidebar-sheen`（釉光，12 处消费）与 `--we-sidebar-tint`
				  //   （染色权重，6 处）—— 两者都在下面写出。
				  s.setProperty("--we-sidebar-sheen", String(Math.min(1, sidebarAlpha / 0.2236)));
				  // #159②：这里**只取浅色那一侧**，侧栏不做深浅分离（有意取舍）——
				  // 侧栏的消费者把颜色混进**主题解析出来的底**上（color-mix … var(--we-readability-base)），
				  // 规则里没有 data-ds-dark-theme 孪生；要分两套得给那批声明加暗色孪生，而 --we-sidebar-color
				  // 是 body 行内样式、样式表重声明压不过它。等侧栏有了暗色孪生再把这一半也分主题。
				  s.setProperty("--we-sidebar-color", glassValue("sidebar", "color", selection.sidebarColor, glassColorOf(selection, "light")));
				  // 侧栏玻璃颜色的混入强度（%）：**独立于 alpha 的可见性曲线** —— alpha 在高透档
				  // 趋近 0，混色若跟着 alpha 走，颜色滑杆在最高档就等于失效（低于可感知阈值）。
				  // 因此随透明度滑杆线性映射 20%–48%：最透档也有可感知色染，往实调颜色越来越浓。
				  const sidebarTint = 20 + (100 - Math.min(Math.max(sidebarAlphaPct, 0), 100)) / 100 * 28;
				  s.setProperty("--we-sidebar-tint", sidebarTint.toFixed(1) + "%");
				  if (selection.sidebarGlass) document.body.setAttribute("data-we-sidebar-glass", "on");
				  else document.body.removeAttribute("data-we-sidebar-glass");
				  // 侧栏全透明（issue #137）：独立于「要不要玻璃」的第三态门控 —— 玻璃开着时它把
				  // 地板/色染/釉光三组变量在侧栏子树里就地归零，玻璃关着时它接管右栏那条原生
				  // 不透明兜底。与 data-we-sidebar-glass 一样是"值与门正交"的属性；配对的卸载
				  // 撤除在玻璃行为层的 disposeGlassLayer（漏撤 ⇒ 插件卸载后规则组照旧生效）。
				  if (selection.sidebarFullClear) document.body.setAttribute("data-we-sidebar-fullclear", "on");
				  else document.body.removeAttribute("data-we-sidebar-fullclear");

				  // ── #277：第三方插件表面的实底底板（设置键 floaterSolidBase，默认开）────────────
				  // 与上一行同形：值与门正交的属性；配对的卸载撤除在 disposeGlassLayer（漏撤 ⇒
				  // 插件卸载后第三方弹窗仍被拍成实底，宿主原生观感回不去）。
				  // 规则本体在 glass-css.js 的「第三方插件表面的实底底板」段，只做 ARIA 这一层
				  // （role=dialog / role=alertdialog）；无 role 的框架层、吸顶条没有稳定锚点，暂不覆盖。
				  // 整组都挂在这个门上 ⇒ W5「关 ⇒ 回退干净」成立。
				  if (selection.floaterSolidBase !== false) document.body.setAttribute("data-we-floater-solid", "on");
				  else document.body.removeAttribute("data-we-floater-solid");

				  // ── 插件自身浮层的**按面**釉层变量 ───────────────────────────────────────────
				  // 该面的 CSS 现在读 `var(--we-floaters-<x>, <原全局表达式>)`（src/styles/quick.js 的
				  // `.we-repo-panel--open` 规则）⇒ 这一组变量就是它的来源。
				  // 瘦身分支：原先另一处玻璃面「更新提示」随 one-shot notice 一起移除，只剩**壁纸仓库抽屉**。
				  //
				  // ⚠️ 只写**两项**（模糊 / 透明度）：`--we-saturate` / `--we-glass-brightness` 不是可配置
				  //    参数（常量）、`--we-surface-tint-*` 是 E2 配方文本、`--we-readability-*` 被判据锁定
				  //    ⇒ 其余项逐面独立在"判据不变"下不可达。
				  document.body.setAttribute("data-we-glass-floaters", "on");
				  // ── **无条件写入** ───────────────────────────────────────────────────────────
				  {
				    const pct = Number(glassValue("floaters", "transparency", selection.floatersTransparency, selection.glassAlpha)) || 0;
				    s.setProperty("--we-floaters-blur",
				      String(glassValue("floaters", "blur", selection.floatersBlur, selection.blur)) + "px");
				    s.setProperty("--we-floaters-alpha", String(Math.max(0.10, 0.25 - pct / 100 * 0.15)));
				  }
				  // 内容面（编辑器/终端）近不透明玻璃底：透明度滑块 **0–100** → 不透明度 100%–20%
				  // （越大越透，与玻璃透明度同语义；低于 ~40% 不透明度注释可读性会再次变差，
				  // 留给用户自行权衡）；底色空 = 跟随主题面板色，选定后自定义。
				  // 注意 color-mix 的百分比槽位要求带单位的 token —— 变量值必须含 "%"，
				  // 否则整个 color-mix 失效、底色规则被丢弃（编辑器回退到纯透明毛玻璃）。
				  // ⚠️ 本面与全局**同刻度** ⇒ 既不需要归一化、也不需要各写一套量程：
				  //    映射是"整段 0–100 → 100%–20%"，即 `100 − pct × 0.8`（pct=100 ⇒ 20%）。
				  const contentAlphaPct = Number(glassValue("sidebarContent", "transparency", selection.sidebarContentAlpha, selection.glassAlpha)) || 0;
				  s.setProperty("--we-content-surface-alpha", Math.max(20, 100 - contentAlphaPct * 0.8) + "%");
				  // 内容面底色：自有键为**空**时表示"跟随主题面板色"（由 CSS 的 var 兜底表达），
				  // 所以这里保留既有的 set/remove 语义，只把来源经解析器选过一遍。
				  const contentColor = glassValue("sidebarContent", "color", selection.sidebarContentColor, "");
				  if (contentColor) s.setProperty("--we-content-surface-color", contentColor);
				  else s.removeProperty("--we-content-surface-color");
				}

				// ── 内联模块：packages/glass/src/glass-extra.js —— 「额外补雾化的选择器」（#200）：把用户点名的选择器编译成 ::before 载体规则，写进本通道自己的 <style>（ADR-0016 迁入）（构建期注入；勿手改本段）──
				/**
				 * glass-extra.js — 「额外补雾化的选择器」（上游 issue #200）的唯一落点。
				 *
				 * 为什么单开一个文件：本插件的注入样式表是**构建期常量**（主包 7 个样式域模块，纯数据、零分支），
				 * 而这一段是**运行期由设置拼出来的** —— 两者的注入路径与归属都不同。混在一起会让
				 * "样式表是纯数据"这条契约失效（守卫也从那份常量里按行首锚点取样式表）。
				 *
				 * 为什么用 `::before` 载体（照抄 glass-css.js 左侧栏那条**已验证**的形态）：伪元素**没有后代**
				 * ⇒ 不会成为 `position: fixed` 后代的包含块。本仓 #89 的坑正在这里：在元素**自身**上加
				 * backdrop-filter 会让它内部那些定位弹层改锚 —— 而第三方插件的面板里恰好常挂定位弹层
				 * （codearts 的徽标弹层就是挂在按钮上的 `position: absolute`）。
				 *
				 * 契约：
				 *   · `weExtraGlassCss(selection)` —— 纯函数：清单 → CSS 文本（空清单 ⇒ 空串）；
				 *   · `syncExtraGlassCss(selection)` —— 唯一的写入口（内容没变就不碰 DOM，与 client.js
				 *     的 `ensurePluginCss` 同一手法）；
				 *   · `disposeExtraGlassCss()` —— 卸载路径（由玻璃行为层的 `disposeGlassLayer` 成对调用）。
				 * 消毒：**只**走 settings-schema 的 `sanitizeExtraGlassSelectors`（白名单 + 限条数 + 限长），
				 * 这里**不另写一套** —— 存进去的与拼进规则的共用同一份判据，两端不会分叉。
				 *
				 * ⚠️ 本文件不得出现反引号（本仓守卫会在产物里做裸反引号计数）：字符串一律用双引号。
				 */

				/** 本通道自己的 <style> 标记（与主样式表的 styles-v3 并列，互不覆盖）。 */
				const EXTRA_GLASS_TAG_ID = "dsh-wallpaper-engine/extra-glass";

				/**
				 * 清单 → 规则文本。**空清单返回空串**（= 一条规则都不生成 ⇒ 与未接本功能时逐字节一致）。
				 *
				 * 每个选择器生成 **4 条规则**（2 档主题 × 正常/软渲两档所有权）：
				 *   · 浅色正常档 = 霜（backdrop-filter 读全局 --we-blur 滑杆）+ 完整两段 color-mix 底色
				 *     （glass-css 设置窗同一张配方表：tint×alpha 段 + (1 - readability-floor) 地板段）；
				 *   · 深色正常档 = 只覆盖底色（tint-dark），霜从浅色规则**级联**（两档同时匹配同一 ::before，
				 *     深色规则特异性更高 ⇒ 底色深色赢、霜无人覆盖照旧）；
				 *   · 软渲两档（resolver 打 data-we-surface-runtime="extra-fallback" 时才匹配）= 无霜、
				 *     不透明可读底色（tint 满量，形态同 glass-css 的 @supports 回退别名），浅色档显式
				 *     backdrop-filter:none，深色档靠级联继承 none —— 软渲环境不保留也不会生效的模糊。
				 *
				 * 组前缀（四把门）：
				 *   · `data-we-glass-page`：与其余玻璃规则同一道"玻璃在算值"闸门（皮肤让路态下整族摘属性，
				 *     本通道跟着一起失效 —— 不留"别人让路了、这层还在画"的半截状态）；
				 *   · 正常档 `:not([data-we-glass-fallback])` / 软渲档 `[data-we-glass-fallback]`：
				 *     与 #95 同政策 —— 不会生效的 backdrop-filter 不留在软渲环境里白付合成代价，
				 *     但底色可读性仍由 extra-fallback 规则兜住（不是整组裸奔）；
				 *   · `body[data-ds-dark-theme]`：深色配方分叉（tint/base/floor 全套换深色值）。
				 */
				function weExtraGlassCss(selection) {
				  const list = typeof sanitizeExtraGlassSelectors === "function"
				    ? sanitizeExtraGlassSelectors(selection && selection.extraGlassSelectors)
				    : "";
				  if (!list) return "";
				  const gate = "body[data-we-glass-page]:not([data-we-glass-fallback]) ";
				  const darkGate = "body[data-ds-dark-theme][data-we-glass-page]:not([data-we-glass-fallback]) ";
				  const softGate = "body[data-we-glass-page][data-we-glass-fallback] ";
				  const softDarkGate = "body[data-ds-dark-theme][data-we-glass-page][data-we-glass-fallback] ";
				  const base = " content: \"\"; position: absolute; inset: 0; border-radius: inherit;"
				    + " z-index: -1; pointer-events: none;";
				  // 霜只在浅色正常档声明一次（深色/软渲靠级联）⇒ 产物里 blur( 恒为每前缀一份。
				  const frost = " -webkit-backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8))"
				    + " brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);"
				    + " backdrop-filter: blur(var(--we-blur, 16px)) saturate(var(--we-saturate, 1.8))"
				    + " brightness(var(--we-glass-brightness, 1.04)) contrast(1.01);";
				  // 完整两段配方：地板段 readability-floor + tint 段（权重 0.9 与 chrome 设置窗 layer-1 同值）。
				  const mixLight = " background-color: color-mix(in srgb, var(--we-readability-base, #ffffff)"
				    + " calc(var(--we-readability-floor, 0.45) * 100%),"
				    + " color-mix(in srgb, var(--we-surface-tint-light, #ffffff)"
				    + " calc(var(--we-settings-window-alpha, 0.15) * 0.9 * 100%), transparent)"
				    + " calc((1 - var(--we-readability-floor, 0.45)) * 100%));";
				  const mixDark = " background-color: color-mix(in srgb, var(--we-readability-base, #0d1524)"
				    + " calc(var(--we-readability-floor, 0.59) * 100%),"
				    + " color-mix(in srgb, var(--we-surface-tint-dark, #0d1524)"
				    + " calc(var(--we-settings-window-alpha, 0.15) * 0.9 * 100%), transparent)"
				    + " calc((1 - var(--we-readability-floor, 0.59)) * 100%));";
				  // 软渲回退底色 = tint 满量（glass-css @supports 回退同形态），恒不透明、恒可读。
				  const opaqueLight = " -webkit-backdrop-filter: none; backdrop-filter: none;"
				    + " background-color: var(--we-surface-tint-light, #ffffff);";
				  const opaqueDark = " background-color: var(--we-surface-tint-dark, #0d1524);";
				  // 拼接处的**前置不变量**：list 由 sanitizeExtraGlassSelectors 产出，只可能是"整条白名单
				  // 选择器 + ', ' 分隔"（逗号不在单条白名单里，所以 ", " 只可能是分隔符）⇒ 这里按 ", " 拆出来
				  // 的每一段都是**完整**选择器，不存在半截（总量上限与"超限整体作废"见 lib/settings-schema.js
				  // 的 EXTRA_GLASS_SELECTORS_MAX 注释：旧版 400 字上限的 slice 会在这里切出半截选择器）。
				  const ownExtra = ":where([data-we-surface-runtime=\"extra\"])::before {";
				  const ownFallback = ":where([data-we-surface-runtime=\"extra-fallback\"])::before {";
				  const rules = [];
				  for (const sel of list.split(", ")) {
				    rules.push(
				      gate + sel + ownExtra + base + frost + mixLight + " }",
				      darkGate + sel + ownExtra + base + mixDark + " }",
				      softGate + sel + ownFallback + base + opaqueLight + " }",
				      softDarkGate + sel + ownFallback + base + opaqueDark + " }",
				    );
				  }
				  // ⚠️ 这条注释**只许用 ASCII**：它落在 JS 字符串字面量里（不是 styles.js 的模板），
				  //    i18n 判据要求"字符串里的中文必须包 weT(...)"—— 生成出来的 CSS 注释不是 UI 文案，
				  //    塞中文只会让守卫判红（实测踩过：`每条中文都进了 weT` 报 packages/glass/src/glass-extra.js 那一行）。
				  return "/* extra frost targets for user-named selectors (upstream #200) */\n" + rules.join("\n") + "\n";
				}

				/** 把生成结果同步进本通道自己的 <style>（清单为空 ⇒ 撤掉那个标签）。 */
				function syncExtraGlassCss(selection) {
				  if (typeof syncGlassSurfaces === "function") syncGlassSurfaces(selection);
				  if (typeof document === "undefined") return;
				  const css = weExtraGlassCss(selection);
				  let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(EXTRA_GLASS_TAG_ID) + "]");
				  if (!css) {
				    if (tag) tag.remove();
				    return;
				  }
				  if (tag === null) {
				    tag = document.createElement("style");
				    tag.dataset.plugin = "dsh-wallpaper-engine";
				    tag.dataset.pluginCss = EXTRA_GLASS_TAG_ID;
				    document.head.appendChild(tag);
				  }
				  // 内容没变就不碰 DOM：设置面板每敲一个字符都会走到这里，无脑重写会让<style>整篇重算。
				  if (tag.textContent !== css) tag.textContent = css;
				}

				/** 卸载：移除本通道的 <style>（fiber cleanup 与 glass-layer 的 disposeExtraGlassCss 成对调用）。 */
				function disposeExtraGlassCss() {
				  if (typeof disposeGlassSurfaces === "function") disposeGlassSurfaces();
				  if (typeof document === "undefined") return;
				  const tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(EXTRA_GLASS_TAG_ID) + "]");
				  if (tag) tag.remove();
				}

				// ── 内联模块：packages/glass/src/glass-layer.js —— 玻璃行为层（ADR-0016 第三刀新落点）：主包 src/effects.js 的玻璃段（全局玻璃量 / 染色地板写入 / 思考块门控 / 胶囊 / 侧栏跟随 / 软渲染钩子）+ clearEffects 的玻璃摘除清单逐字迁入，组成 registerLayerHooks('glass') 的 sync/dispose；detectSoftwareRender（#95）随之从主包 src/client.js 迁入（构建期注入；勿手改本段）──
				/**
				 * glass-layer.js —— 玻璃**行为层**（ADR-0016 第三刀）：主包 `src/effects.js` 里那批玻璃段
				 * 的承接收（原段逐字搬来），经 `registerLayerHooks('glass', { sync, dispose })` 挂进主包的
				 * 既有节拍：主包 `subscribe(applyEffects)` 同一条 emit 链上，注册表把本层 sync 也 subscribe
				 * 上（src/client.js 的 attachLayer）⇒ **每次设置变动本函数重跑一次**，与搬迁前 applyEffects
				 * 里的执行时机逐位等价（订阅序：syncLayers → applyEffects → glass）。
				 *
				 * 与 fonts / media-bridge 的层同形：sync 无参、现读 `selection`（host 键是活绑定）。
				 * sync 幂等 —— 全部写入都是"按当前 selection 重算"的 setProperty / setAttribute，
				 * 迟到注册（attacher 立刻补接 + emit）与重复 emit 都安全。
				 *
				 * 输入（全部经主 bundle 的显式键集，见 packages/glass/src/client.js 的 GLASS_HOST_REQUIRED）：
				 *   selection                    ← 设置 store（活绑定）
				 *   skinYieldActive()            ← 皮肤让路态（src/client.js）
				 *   weClampSurfaceColor(...)     ← 染色地板钳制（src/effects.js 顶层共享，与 verify-readability 同源）
				 *   glassColorOf(...)            ← #159② 分主题取色（src/effects.js）
				 *   GLASS_SATURATE / useLegacySaturateCoupling() ← 饱和耦合常量与 A/B 旧斜坡（src/client.js）
				 * 兄弟文件（同工厂作用域，本包 client.build.json 的 inline[]）：
				 *   glass.js（applyGlass / toRgbTriple）· glass-surfaces.js（经 glass-extra 间接）
				 *   glass-extra.js（syncExtraGlassCss / disposeExtraGlassCss）
				 *
				 * detectSoftwareRender（#95）随之从主包 src/client.js 迁入：它是玻璃域的探测（软渲染 ⇒
				 * backdrop-filter 被静默忽略），唯一消费者就是下面 sync 里的 data-we-glass-fallback 挂载，
				 * 守卫（verify-softrender）按产物提取执行。
				 */

				// ── 软件光栅化探测 ─────────────────────────────────────────────────────────
				// 某些第三方桌面外壳（增强 / 扩展窗口模式，通常是软件合成）里 `backdrop-filter`
				// 被静默忽略：属性语法仍然被接受，所以 `@supports not (backdrop-filter: …)`
				// 永远为真 —— 那条回退根本不会启用，玻璃面板就变成「过透」（全透）。因此这里做
				// 运行时探测：真的去建一个 WebGL 上下文并读渲染器字符串，如果它是软件光栅器
				// （或连上下文都建不出来），就把 body[data-we-glass-fallback] 挂上，让 CSS 用
				// 既有的近不透明配方接管（见 CSS 里那一段）。
				// 手动覆盖（用户排障 / 维护者无 GPU 环境复现）：
				//   ?we-glassfallback=on|1  → 强制回退 · off|0 → 强制关闭 · 其他值 = 自动探测
				// 只探测一次并缓存 —— 玻璃层 sync 每次设置变动都会读它。
				// 全程 typeof 守卫 + try/catch：非浏览器 / 验证沙箱里绝不抛出，也绝不改变行为。
				const SOFT_RENDER_RE = /swiftshader|software|llvmpipe|softpipe|microsoft basic render|angle \(software|stack-gl/i;
				let softRenderFallback; // undefined = 未探测 · true = 软件/无 WebGL · false = 硬件
				function detectSoftwareRender() {
				  if (softRenderFallback !== undefined) return softRenderFallback;
				  softRenderFallback = false;
				  try {
				    // 手动覆盖优先于一切探测（缓存最终决定）。
				    if (typeof location !== "undefined" && location && typeof location.search === "string") {
				      let raw = "";
				      if (typeof URLSearchParams === "function") {
				        raw = new URLSearchParams(location.search).get("we-glassfallback") || "";
				      } else {
				        const m = /[?&]we-glassfallback=([^&]*)/.exec(location.search);
				        raw = m ? decodeURIComponent(m[1]) : "";
				      }
				      const flag = String(raw).toLowerCase();
				      if (flag === "on" || flag === "1") return (softRenderFallback = true);
				      if (flag === "off" || flag === "0") return (softRenderFallback = false);
				    }
				    if (typeof document === "undefined" || !document
				        || typeof document.createElement !== "function") return softRenderFallback;
				    const canvas = document.createElement("canvas");
				    if (!canvas || typeof canvas.getContext !== "function") return (softRenderFallback = true);
				    let gl = null;
				    try { gl = canvas.getContext("webgl"); } catch { /* ignore */ }
				    if (!gl) { try { gl = canvas.getContext("experimental-webgl"); } catch { /* ignore */ } }
				    // 连 WebGL 上下文都拿不到 → 没有硬件合成，backdrop-filter 必定不生效。
				    if (!gl) return (softRenderFallback = true);
				    let renderer = "";
				    let vendor = "";
				    try {
				      const dbg = typeof gl.getExtension === "function" && gl.getExtension("WEBGL_debug_renderer_info");
				      if (dbg && typeof gl.getParameter === "function") {
				        renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "";
				        vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || "";
				      }
				      // 没有调试扩展（或被隐私设置屏蔽）时退回公开的 RENDERER / VENDOR。
				      if (!renderer && typeof gl.getParameter === "function" && gl.RENDERER !== undefined) {
				        renderer = gl.getParameter(gl.RENDERER) || "";
				      }
				      // VENDOR 只是同一判定的第二个可读串（实测：本仓库自带的 supreium-headless-gl
				      // 是软件光栅器，但 RENDERER 只报裸 "ANGLE"，软件线索只出现在 VENDOR="stack-gl"，
				      // 且它不暴露 WEBGL_debug_renderer_info）—— 浏览器硬件链路不会因此误判。
				      if (!vendor && typeof gl.getParameter === "function" && gl.VENDOR !== undefined) {
				        vendor = gl.getParameter(gl.VENDOR) || "";
				      }
				    } catch { /* 读不到渲染器字符串：不判定为软件渲染 */ }
				    softRenderFallback = SOFT_RENDER_RE.test(String(renderer) + " " + String(vendor));
				    // 礼貌释放：只探测一次，但也不给页面永久占一个 WebGL 槽位。
				    try {
				      const lose = typeof gl.getExtension === "function" && gl.getExtension("WEBGL_lose_context");
				      if (lose && typeof lose.loseContext === "function") lose.loseContext();
				    } catch { /* ignore */ }
				  } catch { /* 探测异常：保持 false（不改变既有行为） */ }
				  return softRenderFallback;
				}

				// ── 标题栏容器锚点：运行时探针，不写死宿主构建哈希（#235）─────────────────────
				// 宿主 AppFrame 是那条整页 grid 容器的类名（随机哈希前缀 + 固定 local 名 frame），前缀是
				// CSS-module 的构建哈希：宿主每换一次构建就可能变一次。写进选择器 ⇒ 宿主一升级，标题栏
				// 玻璃（含软件渲染回退两条）就静默失效；而两道硬门都还成立 ⇒ 现场表现是「开关怎么点都
				// 没反应」。锚点只能依赖宿主稳定属性或本插件运行时打的标记（本块）。
				// 探针随玻璃层 sync 重跑（幂等）：开 ⇒ 只给当前顶栏容器打 [data-we-titlebar-anchor]，
				// 旧节点残留一并摘掉；关 / 让路（skinYield）⇒ 全部摘掉（不在宿主 DOM 上留本插件的属性）。
				const WE_TITLEBAR_FRAME_CLASS = /(?:^|\s)[A-Za-z0-9_-]*_frame(?:\s|$)/;

				function weIsTitlebarFrame(el) {
				  return !!(el && el.nodeType === 1 && typeof el.className === "string"
				    && WE_TITLEBAR_FRAME_CLASS.test(el.className));
				}

				function findTitlebarFrame() {
				  // ① 座位祖先链：顶栏容器是整页 grid 的根，侧栏列一定落在它里面（布局事实，与类名无关）。
				  const seat = document.querySelector('[data-slot="sidebar"]');
				  for (let el = seat && seat.parentElement; el && el !== document.body; el = el.parentElement) {
				    if (weIsTitlebarFrame(el)) return el;
				  }
				  // ② 座位缺席时：扫所有 div，取「含侧栏或对话列」的那个 —— 仍只认宿主语义属性。
				  for (const el of document.querySelectorAll("div[class]")) {
				    if (weIsTitlebarFrame(el) && el.querySelector('[data-slot="sidebar"], [data-slot="conversation"]')) return el;
				  }
				  // ③ 语义座位全缺席时：只认单类名、_frame 收尾且宽度覆盖视口 70% 以上的元素。
				  const viewport = (typeof window !== "undefined" && window && Number(window.innerWidth)) || 0;
				  if (!viewport || !document.body || !document.body.children) return null;
				  let best = null;
				  let bestArea = 0;
				  const consider = (el) => {
				    if (!el || el.nodeType !== 1 || typeof el.className !== "string") return;
				    if (!/^[A-Za-z0-9_-]+_frame$/.test(el.className)) return;
				    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
				    if (!rect || rect.width < viewport * 0.7) return;
				    const area = rect.width * rect.height;
				    if (area <= bestArea) return;
				    best = el;
				    bestArea = area;
				  };
				  for (const root of document.body.children) {
				    consider(root);
				    for (const child of root.children || []) consider(child);
				  }
				  return best;
				}

				/** 幂等：开 ⇒ 只给当前顶栏容器打标记（旧节点残留一并摘掉）；关 ⇒ 全部摘掉。 */
				function syncTitlebarAnchor(on) {
				  if (typeof document === "undefined" || !document
				    || typeof document.querySelector !== "function"
				    || typeof document.querySelectorAll !== "function") return;
				  const frame = on ? findTitlebarFrame() : null;
				  for (const el of document.querySelectorAll("[data-we-titlebar-anchor]")) {
				    if (el !== frame) el.removeAttribute("data-we-titlebar-anchor");
				  }
				  if (frame && !frame.hasAttribute("data-we-titlebar-anchor")) {
				    frame.setAttribute("data-we-titlebar-anchor", "");
				  }
				}

				/**
				 * 玻璃层 sync（ADR-0016 迁移）。
				 * 主包 emit ⇒ 本函数重跑：全局玻璃量 → 染色地板 → applyGlass 逐面釉层 → 额外补雾化 →
				 * 思考块门控 → 胶囊 → 侧栏跟随 → 软渲染钩子。
				 */
				function applyGlassLayer() {
				  const s = document.body.style;
				  // Glass blur strength in px (0 disables the frosted-glass effect).
				  s.setProperty("--we-blur", selection.blur + "px");
				  // iOS liquid glass: the backdrop "colour melt" (saturation) is a CONSTANT
				  // material property, DECOUPLED from the blur radius — the 玻璃 slider now
				  // drives ONE thing (frost depth, --we-blur). Rationale: --we-saturate amplifies
				  // whatever chroma the backdrop still carries, and blur is what smears the
				  // residual wallpaper text into that chroma; the coupled ramp therefore
				  // magnified exactly the signal the owner reads as 荧光/彩色鬼影, worst at the
				  // top of the slider where the amplification met the most smearing. A flat value
				  // kills the runaway at high radii while keeping the "wet glass" chroma lift at
				  // every radius. GLASS_SATURATE is deliberately BELOW the stylesheet's own 1.8
				  // fallback (what applies before this variable is first written), so the
				  // steady-state glass is milder than the pre-write default rather than stronger.
				  //   blur px:     0      15     30     45     60
				  //   old:       1.15   1.57   1.99   2.41   2.83   (1.15 + blur*0.028)
				  //   new:       1.30   1.30   1.30   1.30   1.30   (constant; 6.1x less chroma
				  //                                                  amplification at 60px)
				  // ?we-saturate=legacy restores the old coupled ramp byte-for-byte (A/B
				  // escape hatch, see useLegacySaturateCoupling).
				  s.setProperty("--we-saturate", useLegacySaturateCoupling()
				    ? String(1.15 + selection.blur * 0.028)
				    : String(GLASS_SATURATE));
				  s.setProperty("--we-glass-brightness", "1.04");
				  // - --we-glass-alpha: white-overlay alpha of the glass surfaces. The 玻璃透明
				  //   度 slider semantics: higher = MORE transparent (clearer wallpaper shows
				  //   through), lower = closer to solid. 0% → ~0.25 (frosted, solid-ish),
				  //   60% → ~0.10 (轻霜 —— 染色地板下限不再让颜色在拉满端消失，旧值 0.03 会让
				  //   玻璃色份额塌到 ~1%、只剩主题底色 = 用户报的"拉满变黑/变白")。
				  const glassAlpha = Math.max(0.10, 0.25 - (selection.glassAlpha / 100) * 0.15);
				  s.setProperty("--we-glass-alpha", String(glassAlpha));
				  // ── ⚠️ 这个变量**不许删**：它没有 CSS 消费者（配方早改读下面钳制出来的
				  // `--we-surface-tint-light/dark`），但 `test/compat-harness-pages.mjs` 把它当**页面观察量**
				  // 断言（`getComputedStyle(body)` 读它、要求非空 + DSH 的设置窗口 token 与之同源）。那个
				  // harness 不在任何 npm 脚本里（要浏览器页面）⇒ 无法在此验证改动它的结局 —— 先删写入 = 静默
				  // 破坏一个未经验证的观察者。正确顺序：先把 harness 的观察点改成 `--we-surface-tint-light`，
				  // 再删这里的写入；在那之前它由守卫第 ⑭ 组的 `OBSERVED_ONLY` 登记表**显式豁免**。
				  //   那行注释说明了它为何暂时不能删。这里写**浅色那一侧**：它是这个色板的"基准色"，
				  //   而观察者只要求非空。（改分主题取色后它仍是标量 —— 观察量的形状没变。）
				  s.setProperty("--we-glass-color", glassColorOf(selection, "light"));
				  // - 玻璃保真度（0–100，默认 100 = 完整红线）：同一标量喂两处消费 —— styles.js
				  //   的 --we-readability-floor（地板覆盖度）与 weClampSurfaceColor（釉色向原色
				  //   的回退幅度）。两处必须同源，滑杆才是一个旋钮。
				  const fidNum = Number(selection.glassFidelity);
				  const glassFidelity = Number.isFinite(fidNum) ? Math.min(1, Math.max(0, fidNum / 100)) : 1;
				  s.setProperty("--we-glass-fidelity", String(glassFidelity));
				  // - 染色地板：按主题把玻璃色钳制进可读亮度带，供样式表的
				  //   --we-readability-base（地板层）与全部 frost 槽位消费 —— 对话框/侧栏等
				  //   宿主表面由此拿到**用户的色相**而非主题白/黑，正文对比度判据不变。
				  //   保真度 < 100 时釉色向原色线性回退（见 weClampSurfaceColor 第三参）。
				  //   #159②：两侧各取自己那一半（glassColorOf），于是「深色单独设置」一开，
				  //   同一份 settings 在浅/深两套配色下给出两个不同的釉色 —— 这正是本项的交付。
				  const glassTintLight = glassColorOf(selection, "light");
				  const glassTintDark = glassColorOf(selection, "dark");
				  s.setProperty("--we-surface-tint-light", weClampSurfaceColor(glassTintLight, "light", glassFidelity));
				  s.setProperty("--we-surface-tint-dark", weClampSurfaceColor(glassTintDark, "dark", glassFidelity));
				  // RGB 三元组形式：给 rgba() 槽位用（消息气泡 / 输入框的白釉染色）。
				  s.setProperty("--we-surface-tint-rgb-light", toRgbTriple(weClampSurfaceColor(glassTintLight, "light", glassFidelity)));
				  s.setProperty("--we-surface-tint-rgb-dark", toRgbTriple(weClampSurfaceColor(glassTintDark, "dark", glassFidelity)));

				  // ── 玻璃管线：取值解析 / 各面釉层变量 / 门控属性（glass.js）+ 运行期样式通道（glass-extra）。
				  applyGlass(selection, s);
				  // 额外补雾化的选择器（上游 #200）：玻璃面算完之后同步这条**运行期**样式通道。
				  // 静态样式表是构建期常量（styles.js），而这份规则由设置拼出来 ⇒ 单独一个 <style>
				  // 标签（见 glass-extra.js；空清单时它一条规则都不生成、标签也撤掉）。
				  syncExtraGlassCss(selection);
				  // 思考块液态玻璃：默认关，保持宿主黑底方便阅读。打开后 CSS 清掉思考条
				  // 与推理面的实心底，切到会话同一套雾化。本门控仍在玻璃层就地写 ——
				  // 它不是玻璃量，不进 applyGlass 的取值管线。
				  // 让路态（皮肤中心互操作，见主包 src/client.js）：玻璃整族退场 —— 这里与下面 sidebar-follow
				  // 是 applyGlass 之外仅剩的两处玻璃门控点，一并摘。
				  const skinYield = typeof skinYieldActive === "function" && skinYieldActive();
				  // 三挡的第二半：正文原生挡（thinkingNative）。它**赢过**玻璃挡 —— 开着时不挂
				  // data-we-thinking-glass（互斥在门控层保证，UI 的三挡分段只是维持两键一致）。
				  // 原生挡的 CSS 语义见样式表「正文原生挡」块：正文子树（气泡 / markdown 家族）
				  // 令牌退回宿主原生值，画布与输入框不碰。
				  if (selection.thinkingNative && !skinYield) document.body.setAttribute("data-we-thinking-native", "on");
				  else document.body.removeAttribute("data-we-thinking-native");
				  if (selection.thinkingGlass && !selection.thinkingNative && !skinYield) document.body.setAttribute("data-we-thinking-glass", "on");
				  else document.body.removeAttribute("data-we-thinking-glass");
				  // 标题栏容器锚点（#235）：顶栏玻璃那一族 CSS 只认 [data-we-titlebar-anchor]，不再写死宿主
				  // 构建哈希 —— 探针判据与理由见本文件 findTitlebarFrame 的注释。关掉标题栏玻璃 / 皮肤让路
				  // = 这一面整组不生效，标记也一并摘掉（`&& !skinYield` 正是让路早退路径的摘锚点）。
				  syncTitlebarAnchor(selection.titlebarGlass === true && !skinYield);
				  // 文字胶囊一族的雾化（新会话 / 「加载更早历史」「回到底部」；行内代码胶囊已不带霜）：
				  // #134 落地时是写死的 8px CSS 兜底（--we-inline-code-blur 无生产者 ⇒ 用户实测"调不了"），
				  // 现在接成旋钮（capsuleBlur，默认 8 = 原观感）。与上面的门控属性同处声明 ——
				  // 这族变量只被 data-we-thinking-glass 门下的规则消费（样式表 ⑥ 条）。
				  const capBlurNum = Number(selection.capsuleBlur);
				  s.setProperty("--we-inline-code-blur", String(Number.isFinite(capBlurNum) ? capBlurNum : 8) + "px");
				  // 胶囊釉色：三元组形式给 rgba() 槽位（fill 令牌 + 滚动条拇指）。刻意不过
				  // weClampSurfaceColor —— 10% 雾底不是正文面，不进可读性下限（理由见 schema）。
				  s.setProperty("--we-capsule-tint-rgb", toRgbTriple(
				    /^#[0-9a-f]{6}$/i.test(String(selection.capsuleColor)) ? selection.capsuleColor : "#ffffff"));

				  // dsh-better-sidebar 液态玻璃：一套独立于会话玻璃的细粒度控制（侧栏模糊 /
				  // 侧栏透明度 / 侧栏玻璃颜色 + 总开关）。变量只作用于 [data-dsh-better-sidebar]
				  // 子树（CSS 见样式表），关闭总开关时侧栏恢复原生外观。
				  // 跟随全局（sidebarFollowGlobal，默认开）：把侧栏那一套变量**指向**全局玻璃三件套。
				  // var() 是惰性替换 ⇒ 这里写进去的是引用而不是拷贝：改「玻璃 / 玻璃透明度」两侧栏一起变。
				  // 色相那一份走样式表里的 --we-follow-tint（按主题取钳制后的玻璃色）—— 不能在这里写死，
				  // 内联值会盖掉"按主题"这件事。
				  // ⚠️ 合并 #132 口径：跟随关着时**不覆盖** —— 按面值由 applyGlass 的 glassValue 单一
				  //    取值路径供给（inherit→全局键 / custom→「独立配置」自己的键）；/200 刻度这类旧曲线
				  //    早已随规范刻度退役，不许再回来。UI 上跟随开着时「独立配置」收起，
				  //    两套机制不会同时生效。
				  if (selection.sidebarFollowGlobal) {
				    s.setProperty("--we-sidebar-blur", "var(--we-blur)");
				    s.setProperty("--we-sidebar-saturate", "var(--we-saturate)");
				    s.setProperty("--we-sidebar-tint", "calc(var(--we-glass-alpha) * 100%)");
				    s.setProperty("--we-sidebar-color", "var(--we-follow-tint)");
				    s.setProperty("--we-sidebar-sheen", "1");
				  }
				  // 跟随态另挂一个属性：样式表用它决定"侧栏的釉"取共享那一份还是侧栏专用那一份。
				  if (selection.sidebarGlass && selection.sidebarFollowGlobal && !skinYield) document.body.setAttribute("data-we-sidebar-follow", "on");
				  else document.body.removeAttribute("data-we-sidebar-follow");

				  // 软件渲染钩子（#95，见本文件头部 detectSoftwareRender）：@supports 只做语法检查，软件
				  // 合成下 backdrop-filter 被静默忽略时它依然为真，所以近不透明回退必须靠运行时
				  // 探测来挂载。命中时 CSS（body[data-we-glass-fallback]）让面板/侧栏/内容面/
				  // 弹层改用与 @supports 回退完全相同的配方，并显式 backdrop-filter: none。
				  if (detectSoftwareRender()) document.body.setAttribute("data-we-glass-fallback", "1");
				  else document.body.removeAttribute("data-we-glass-fallback");
				}

				/**
				 * 玻璃层 dispose（ADR-0016 迁移）。
				 * 主包拆卸期对本层调用（attachLayer 的 unsubscribe 对面），卸载 / 禁用后 DOM 上不留玻璃态。
				 */
				function disposeGlassLayer() {
				  const s = document.body.style;
				  s.removeProperty("--we-blur");
				  s.removeProperty("--we-saturate");
				  s.removeProperty("--we-glass-brightness");
				  s.removeProperty("--we-glass-alpha");
				  s.removeProperty("--we-glass-color");
				  s.removeProperty("--we-surface-tint-light");
				  s.removeProperty("--we-surface-tint-dark");
				  s.removeProperty("--we-surface-tint-rgb-light");
				  s.removeProperty("--we-surface-tint-rgb-dark");
				  document.body.removeAttribute("data-we-glass-window");
				  // 页面玻璃总锚点（glass.js 恒挂）：漏撤 ⇒ 插件禁用 / HMR 卸载后整页的玻璃
				  // 令牌映射与对话栏那一族规则照旧生效（"插件已卸载，玻璃还在"）。与下面三个同批。
				  document.body.removeAttribute("data-we-glass-page");
				  document.body.removeAttribute("data-we-left-sidebar");
				  // 侧边栏四角圆角 / 直角（glass.js 的 applyGlass 写出）：同批清理 —— 漏撤 ⇒ 插件
				  // 卸载 / 禁用后宿主侧栏仍停在上次的圆角上（"插件没了，侧栏还是圆的"）。
				  document.body.removeAttribute("data-we-left-sidebar-radius");
				  document.body.removeAttribute("data-we-right-sidebar-radius");
				  document.body.removeAttribute("data-we-left-sidebar-square");
				  document.body.removeAttribute("data-we-right-sidebar-square");
				  s.removeProperty("--we-left-sidebar-radius");
				  s.removeProperty("--we-right-sidebar-radius");
				  // 标题栏液态玻璃门（与上面那个同批）：漏撤 ⇒ 插件卸载 / 禁用后，顶栏仍挂着玻璃底与
				  // 雾化层，而壳层自己的不透明底色被压住 —— 表现为"插件没了，标题栏还是玻璃的"。
				  document.body.removeAttribute("data-we-titlebar-glass");
				  // 标题栏容器的锚点标记（#235，挂在**宿主元素**上而非 body）：同批摘掉 —— 它是本插件
				  // 打到宿主 DOM 上的属性，插件禁用 / HMR 卸载后不能留在页面上。
				  if (typeof document !== "undefined" && document
				      && typeof document.querySelectorAll === "function") {
				    for (const el of document.querySelectorAll("[data-we-titlebar-anchor]")) el.removeAttribute("data-we-titlebar-anchor");
				  }
				  // 思考块液态玻璃门（PR #130 引入）：同批的卸载残留口径 —— 漏撤 ⇒ 插件卸载后
				  // 宿主思考条的规则组照旧生效。合并 #132 时补上（第 ⑨ 组清理对称判据的要求）。
				  // 三挡的另一半（对话区原生挡）同批：漏撤 ⇒ 卸载后对话区令牌仍被钉回原生值。
				  document.body.removeAttribute("data-we-thinking-glass");
				  document.body.removeAttribute("data-we-thinking-native");
				  // ⚠️ W5 新增的三个门控属性**也必须在这里撤掉**（与上面两个同批）：
				  //    漏掉它们 ⇒ 插件被禁用 / HMR 卸载后，宿主 DOM 上仍留着 `data-we-glass-chat` /
				  //    `data-we-glass-floaters`，而挂在这些属性上的规则组**照旧生效** ——
				  //    表现为"插件已卸载，但玻璃还在"。这类残留只有卸载路径才暴露，日常切换看不出来。
				  document.body.removeAttribute("data-we-glass-chat");
				  document.body.removeAttribute("data-we-glass-floaters");
				  document.body.removeAttribute("data-we-sidebar-follow");
				  s.removeProperty("--we-sidebar-blur");
				  s.removeProperty("--we-sidebar-saturate");
				  s.removeProperty("--we-sidebar-sheen");
				  s.removeProperty("--we-sidebar-color");
				  s.removeProperty("--we-sidebar-tint");
				  document.body.removeAttribute("data-we-sidebar-glass");
				  document.body.removeAttribute("data-we-sidebar-fullclear");
				  // #277：第三方表面实底底板门（与 glass.js 的 applyGlass 成对；漏撤 ⇒ 插件卸载后
				  // 第三方插件的弹窗 / 框架层 / 吸顶条仍被拍成实底，宿主原生观感回不去）。
				  document.body.removeAttribute("data-we-floater-solid");
				  document.body.removeAttribute("data-we-glass-fallback"); // #95 软件渲染回退钩子随层注销
				  s.removeProperty("--we-content-surface-alpha");
				  s.removeProperty("--we-content-surface-color");
				  // ⚠️ W2–W4 新增的**按面釉层变量**同样要撤（否则卸载后残留的变量值会继续被
				  //    那几条规则读到 —— 与属性残留是同一类问题）。逐面列出，不用循环：
				  //    它们分散在三个面、名字不同，显式列出比"一个前缀循环"更不容易漏。
				  for (const v of [
				    "--we-settings-window-blur", "--we-settings-window-alpha",
				    "--we-left-sidebar-blur", "--we-left-sidebar-alpha",
				    "--we-titlebar-blur", "--we-titlebar-alpha",
				    "--we-floaters-blur", "--we-floaters-alpha",
				    // ⚠️ 对话栏那一族（`--we-chat-*`）**提交态就没在撤** —— 既有缺陷，本次一并补上：
				    //    它们是对话栏专属釉层变量，卸载后残留同样会被那几条规则读到。
				    //    （判据"清理对称性"把这一组和上面 6 个一起抓了出来。）
				    "--we-chat-glass-fidelity", "--we-chat-surface-tint-light", "--we-chat-surface-tint-dark",
				    "--we-chat-surface-tint-rgb-light", "--we-chat-surface-tint-rgb-dark",
				  ]) s.removeProperty(v);
				  // 额外补雾化通道（#200）：这一份是**运行期生成的** <style>，不在静态样式表里 ⇒
				  // 必须显式撤标签（与上面那批 body 属性 / 变量成对，理由同"清理对称性"）。
				  disposeExtraGlassCss();
				}

				// ── 内联模块：packages/glass/src/glass-presets-panel.js —— 「主题预设」独立节的渲染器（2026-11-07 从 glass-panel.js 纯搬移折出）：出厂名字走词表、破坏性动作两步确认、坏预设禁用但可删、资产勾选对话框；只画界面，数据与网络全经 gp ctx。（构建期注入；勿手改本段）──
				/**
				 * glass-presets-panel.js — 「主题预设」独立节的渲染器（2026-11-07 从 glass-panel.js 纯搬移折出）。
				 *
				 * 为什么单独一层：预设块的形态纪律（出厂名字走词表、破坏性动作两步确认、坏预设「禁用但可删」、
				 * 资产勾选对话框）与「玻璃 UI」节的四件套旋钮是**两类东西** —— 前者是整机快照的读写入口，
				 * 后者是玻璃参数。玻璃子包按 inline 模块拼接进同一个 bundle 作用域（无 import），因此这里只放
				 * 函数与模块级 ref，跨文件引用靠打包期同作用域；独立 import 的场景由测试按真入口同形挂全局
				 * （verify-scene-live / verify-fontset 的 prelude）。零行为改动。
				 */

				/**
				 * 「主题预设」节 + 「玻璃 UI」节 —— 预设升为整机快照（ADR-0011）后自成一节，玻璃节只留玻璃。
				 *
				 * 结构：
				 *   主题预设（独立节，仅设置页）
				 *   └─ 预设方案：卡片网格 + 保存 / 导出 / 导入
				 *   玻璃 UI
				 *   ├─ 全局：玻璃颜色 · 玻璃透明度 · 雾化 · 玻璃保真度
				 *   └─ 子 UI 独立配置（不进简化配置）
				 *      └─ 每个子面一个开关：[独立配置] ⇒ 打开后展开它自己的参数行
				 *
				 * ⚠️ **没有"要不要玻璃"的开关**（用户口径）：玻璃是恒要的 —— 实测一个"关"并**不能**如愿恢复
				 *    原生黑/白纯色（那些面上还有一批不挂门控的令牌改写，见本包 `glass.js` 的退役说明）⇒ 这一节
				 *    剩下的**唯一**问题就是"读自己 还是 跟全局"。
				 * ⚠️ 「左侧栏液态玻璃」**不在**本节的子项里：它的"关"是**恢复背景**（那列回到壁纸原样），
				 *    语义不同 —— 它是乙类，独立成项留在「细节」，本节的 `panelOff` 过滤就是为它。
				 */
				/**
				 * 「预设方案」块（「主题预设」独立节的正文，先于「玻璃 UI」节）。
				 *
				 * 为什么放在最顶上：这一节的调节粒度太细（全局四件套 + 每面独立配置 + 侧栏族），
				 * 预设是"不想逐项调"的用户的主路 —— 进门第一眼就该是它。它与下面的旋钮**读写同一批键**：
				 * 应用 = 整机配置快照合并（ADR-0011：settings 段总带 + 资产段按勾选，键集见
				 * `PROFILE_PRESET_KEYS`），应用完下面所有滑块跟着变（同一 selection）。
				 *
				 * 形态纪律（承 fontset-editor.js，均有守卫）：
				 *   · **出厂预设的名字走词表**（`FACTORY_PRESET_CN` 就地包 weT ⇒ 文本扫描看得见），
				 *     用户预设显示原名 —— 随包文件里的 name 是数据，扫描看不见，所以映射表必须是字面量；
				 *   · **破坏性动作两步确认**且不用原生对话框（复用 client.js 的 armConfirm / renderConfirmRow）；
				 *   · **出厂预设的删除 = 永久删除**（两步确认点明不可恢复；宿主落墓碑遮蔽，无恢复通道）；
				 *   · **读不懂的预设禁用但保留删除**（删掉坏文件是唯一出路）：「禁用」指**应用键**
				 *     （`disabled: Boolean(broken)`）；「保留删除」指删除键与**两步确认行对坏行照常渲染**
				 *     （此前的 `!armedRow.broken` 把确认行挡掉 ⇒ 坏行点了 `×` 没反应、永远删不掉，t7 配套修复）。
				 *     `broken` 的文案按 origin 分：出厂 = **版本作废**口径（旧 tag 已作废，出路是"从预设栏
				 *     重新保存一份"），用户层 = 文件坏了/被清空了；不能只给笼统的"读不出来"（ADR-0011 D6）；
				 *   · 失败态给**可判定原因**（selection.glassPresetError，宿主原话 + weT 查英文表）。
				 *
				 * 保存 / 导出的**资产勾选对话框**（ADR-0011 D4，非模态）：每个勾选项带一行
				 * **不勾的后果**说明 —— 不勾字体 ⇒ 回落接收方当前那份。数值键（开关/尺寸/圆角）恒在 settings 段，
				 * 不受勾选影响。默认值：字体 ✅。（瘦身分支：吉祥物立绘 / 会话头像两族随组件一起移除，
				 * 只剩字体一族。）勾选状态是视图态（ctx.assetChecks + onAssetToggle）。
				 * **保存与导出都先过这道对话框**（ADR 修订版第③条）：保存 = 名字行 → 勾选 → 「保存预设」；
				 * 导出 = 每行「导出」→ 同一组勾选 → 「下载 .json」。勾选的每一项只在**本机确实有那份
				 * 资产**时才可勾（宿主按名单内嵌，没有的东西内嵌不出段；行的说明会写明）。
				 * 本渲染器**只画**：网络与状态全部经 ctx（store 在 src/preset-store.js，接线在 client.js 的
				 * glassPresetCtx）。
				 */
				/**
				 * 导入用的隐藏 file input 的**模块级 ref**（与 packages/fonts/src/fontset-editor.js 同形：模块级变量 +
				 * 按钮去 `.click()`；⚠️ 名字不能撞 —— fontset-editor 已占 `importInput`，平铺进 bundle
				 * 后是同一作用域，撞名 = SyntaxError，构建期会红）。只做"选文件"，读文件与三道
				 * 本地预检在 `importGlassPreset`（src/preset-store.js）。
				 */
				let gpImportInput = null;

				function renderGlassPresetsBlock(gp) {
				  const {
				    presets, loading, error, note, saving, draftName, armedId,
				    saveTarget, exportTargetId, assetChecks, onAssetToggle, onExportCommit, onSaveCommit2,
				    onApply, onOpenSave, onOpenExport, onExportTargetChange, onDraftName, onSaveCommit, onCancelSave,
				    onArmDelete, onDisarm, onDelete,
				    onImportFile,
				  } = gp || {};
				  if (!presets) return null; // ctx 缺席时不画（渲染器不抛，也不画半个块）
				  const rows = Array.isArray(presets) ? presets : [];
				  // 可导出的 = 清单里**读得出来**的那几份。broken 的没有可导出的正文（宿主对它 422），
				  // 故不进选择器 —— 画一个选了必然失败的下拉项等于骗用户。
				  const exportable = rows.filter((r) => !(typeof r.broken === "string" && r.broken));
				  // 出厂预设名字的词表：**就地包 weT**（渲染函数内，理由见本文件 CHILD_CN 同款注释 ——
				  // i18n 判据是文本扫描，只认 weT("…") 字面量；数据里的名字扫描看不见）。
				  // 两侧靠 id 对齐；漏了的出厂 id 回落显示文件里的原名（渐进式，不炸）。
				  const FACTORY_PRESET_CN = {
				    "factory-default": weT("黑客绿(Fish)"), "purple-mood": weT("紫色心情"), "factory-frosted": weT("重磨砂"), "factory-night": weT("暗夜釉色"), "factory-vivid": weT("原色直出"), "factory-readable": weT("可读优先"), "factory-author": weT("作者自用"),
				  };
				  const labelOf = (row) => (row.origin === "builtin" && FACTORY_PRESET_CN[row.id])
				    ? FACTORY_PRESET_CN[row.id]
				    : (row.name || row.id);
				  const checks = assetChecks || {};
				  const has = (k) => checks[k] === true;
				  // ── 资产勾选对话框的行（保存与导出共用同一组勾选项与后果说明；非模态、就地展开）──
				  // 每行 = 胶囊开关（复用 switchRow）+ 一行**三态后果**（D4）。
				  // 口径：**勾上 = 按本机现状声明这一族**（有就带上；没有就**显式声明「无」**），
				  // **不勾 = 不动对方的这一族**。所以开关**不再按 available 禁用** —— 旧版禁用导致"本机没有
				  // 自定义字体"的用户永远无法声明「无」，那一族只能靠出厂预设的 null 来清（本次缺陷的客户端半边）。
				  // available 只决定提示文案（说清"勾上会存成无"还是"勾上会把这份带过去"）。
				  // 瘦身分支（slim/remove-extra-features）：立绘（rope）与会话头像两个组件整体移除 ⇒
				  // 它们的勾选项、以及「吉祥物 · 指向」第四态段（只对 `ROPE_FORM_VALUES` 有意义）一并删掉，
				  // 资产勾选只剩**字体**一族。
				  const fontAvailable = checks.fontAvailable === true;
				  const assetRows = React.createElement(React.Fragment, null,
				    switchRow(weT("字体"), has("font"), (e) => onAssetToggle("font", e.target.checked), {
				      key: "pa-font",
				      hint: fontAvailable
				        ? weT("勾上：把当前字体带进预设（不勾 = 不动对方的字体，保持它当前那份）")
				        : weT("本机字体还是全默认 —— 勾着存 = 声明「无」，套用它的人回到内置字体（不勾 = 不动对方的字体）"),
				      tooltip: weT("把当前活动字体集的颜色角色 / 排版 / 字族 / 组件字体一并存进预设"),
				    }),
				    React.createElement("div", { className: "we-picker__hint", key: "pa-note" },
				      weT("数值配置（开关 / 尺寸 / 圆角 / 颜色等）总是完整保存，不受勾选影响 —— 勾选只决定图片与字体要不要一并带走；不勾的那一族一个字都不动对方，勾了而本机没有 = 声明「无」（对方回到内置）。")),
				  );
				  // 两行四列的圆角表格（用户口径）：每格 = 预设名（点击应用，占满）
				  // + 右侧固定删除键；不足 8 个的格子画虚框空位 —— 上限 8 直接看得见。
				  // ⚠️ armedId 是 **裸 id**（armedIdOf("gpreset") 已把族前缀剥掉，与 fontset-editor
				  //    同一口径）—— 拿它和带前缀的令牌串比较永远不等 ⇒ 确认行永远不渲染
				  //    （实测："点删除没反应"就是这个）。行为守卫：verify-presets ④。
				  const cells = [];
				  for (let i = 0; i < 8; i++) {
				    const row = rows[i];
				    if (!row) {
				      cells.push(React.createElement("div", {
				        key: "empty-" + i, className: "we-picker__preset-cell we-picker__preset-cell--empty",
				      }, React.createElement("span", { className: "we-picker__hint" }, weT("空预设位"))));
				      continue;
				    }
				    const broken = typeof row.broken === "string" && row.broken;
				    const isUser = row.origin === "user";
				    const armed = armedId === row.id;
				    // ⚠️ broken 文案按 **origin** 分口径（ADR-0011 D6）：
				    //   · 出厂 = **版本作废**：旧 tag 的预设正文已被作废、不做兼容 —— 出路是
				    //     "重新保存一份"（对出厂即"从预设栏按当前配置再存一份同名预设"）；
				    //   · 用户层 = 文件读不出（坏文件/被清空）—— 出路同样是删掉重存。
				    //   不能只给笼统的"读不出来"：用户看到的是"该重存"，不是"预设没了"。
				    const brokenTitle = isUser
				      ? weT("这份预设读不出来：{reason}（删掉它，重新保存一份）", { reason: broken })
				      : weT("这份出厂预设的版本已作废：{reason}（旧格式不再兼容 —— 从预设栏重新保存一份即可）", { reason: broken });
				    cells.push(React.createElement("div", {
				      key: row.id,
				      className: "we-picker__preset-cell" + (armed ? " we-picker__preset-cell--armed" : ""),
				    },
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button",
				        disabled: Boolean(broken) || loading === true,
				        title: broken
				          ? brokenTitle
				          : weT("应用「{name}」：整机配置快照立即生效（观感 / 行为 / 勾选的字体与图片），之后可以继续微调", { name: labelOf(row) }),
				        onClick: () => onApply(row.id),
				      }, labelOf(row)),
				      // ⚠️ 这里**没有**导出的格子键（用户口径）：导出已独立成网格下方的
				      //    「导出预设…」入口 —— 导出是**对"哪一份"**的动作，逐格挂一排同名键既挤格子
				      //    又和"导出自己想要的那份"重复；独立入口 + 对话框里选目标，一处就够。
				      // ⚠️ 删除键对**所有格**都有（用户口径：出厂预设可删，删除即永久、
				      //    不可恢复），统一固定在每格最右侧；文案按 origin 分。
				      React.createElement("button", {
				        className: "we-picker__btn we-picker__preset-del", type: "button",
				        disabled: loading === true,
				        title: armed
				          ? weT("已经问过你了 —— 在下面那一行选「确认」或「取消」")
				          : (isUser
				            ? weT("删除这个预设（会再问一次）")
				            : weT("删除这个出厂预设（不可恢复）")),
				        onClick: () => { if (!armed) onArmDelete(row.id); },
				      }, "×"),
				    ));
				  }
				  const chipRow = React.createElement("div", { className: "we-picker__preset-grid", key: "gp-grid" }, cells);
				  // 网格下方的**动作行**（不在格子里 —— 格子属于预设本身）：保存 / 导出 / 导入。
				  //   · 保存：满 8 个禁用并指路（删除腾位）；
				  //   · 导出：**独立入口**（用户口径）—— 对话框里再选"导出哪一份"；
				  //   · 导入：隐藏 file input + 按钮。
				  const openSaveRow = saving
				    ? null
				    : React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key: "gp-save-open" },
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button",
				        disabled: loading === true || rows.length >= 8,
				        title: rows.length >= 8
				          ? weT("已达预设上限（8 个）—— 删除不需要的预设后再存")
				          : weT("把当前这套整机配置存成一份你自己的预设（之后从预设行一键取回）"),
				        onClick: () => onOpenSave(),
				      }, weT("保存当前为预设…")),
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button", key: "gp-export-open",
				        disabled: loading === true || exportable.length === 0,
				        title: exportable.length === 0
				          ? weT("没有可导出的预设 —— 先保存一份，或先删掉读不出来的那份")
				          : weT("把已有预设导出成 .json（可分享 / 可再导入）—— 先选导出哪一份，再选带哪些资产"),
				        onClick: () => onOpenExport(),
				      }, weT("导出预设…")),
				      // 导入：隐藏 file input + 按钮（与字体集导入同形；三道本地预检在 store）。
				      // ⚠️ 这里的 ref 回调在渲染期执行，属 React 托管行为，不是顶层副作用。
				      React.createElement("input", {
				        className: "we-picker__file", type: "file", key: "gp-import-input",
				        accept: ".json,application/json",
				        style: { display: "none" },
				        ref: (el) => { gpImportInput = el; },
				        onChange: (e) => {
				          const f = e.target.files && e.target.files[0];
				          try { e.target.value = ""; } catch { /* ignore */ }
				          if (f) onImportFile(f);
				        },
				      }),
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button", key: "gp-import-btn",
				        disabled: loading === true,
				        title: weT("从「导出」得到的 .json 导入一份预设（导入后不会立刻应用 —— 去列表里点它）"),
				        onClick: () => { if (gpImportInput && typeof gpImportInput.click === "function") gpImportInput.click(); },
				      }, weT("导入预设…")),
				    );
				  // 删除的两步确认行（令牌族 "gpreset:"；`!token` 退化不渲染 —— renderConfirmRow 的不变量）。
				  // ⚠️ **坏行也要渲染**（t7 配套修复）：文件头的「读不懂的预设禁用但保留删除 —— 删掉坏文件是
				  //    唯一出路」指的正是这条确认行。此前的 `!armedRow.broken` 把它挡掉，用户点 `×` 的观感是
				  //    "点了没反应"（令牌置了、确认行不来），坏预设从界面上永远删不掉；ADR-0011 D6 让旧 tag
				  //    统一作废后每份旧预设都命中这条。禁用的只是**应用键**（上面的 `disabled: Boolean(broken)`），
				  //    删除键与确认行对所有行（含 broken）同形。令牌判据仍由 renderConfirmRow 自己守
				  //   （armedId 找不到对应行 ⇒ armedRow 为 null ⇒ 不渲染）。
				  const armedRow = armedId ? rows.find((r) => r.id === armedId) : null;
				  const armedQuestion = armedRow && (armedRow.origin === "user"
				    ? weT("删除预设「{name}」？此操作不可恢复。", { name: labelOf(armedRow) })
				    : weT("删除出厂预设「{name}」？此操作不可恢复。", { name: labelOf(armedRow) }));
				  const confirmRow = armedRow
				    ? renderConfirmRow(armedId, armedId, armedQuestion, () => onDelete(armedRow.id), () => onDisarm())
				    : null;
				  // ── 保存 / 导出对话框（非模态，同一组资产勾选项；ADR 修订版第③条：两处都先问）────
				  //   · saveTarget === "save"   → 名字行 + 勾选 + 「保存预设」（真正落盘）；
				  //   · saveTarget === "export" → **选目标** + 勾选 + 「下载 .json」。导出是"对某一份"的
				  //     动作，而入口已独立成一行（用户口径）⇒ 目标由这里的下拉选，值经
				  //     `onExportTargetChange` 落进 `glassPresetTargetId`。下载走普通链接导航（宿主带
				  //     Content-Disposition 应答），导出**不走**改名/正文路径 —— 正文由宿主读到的值重建。
				  //   取消把对话框与名字行一起收起。
				  const exportRow = saving && saveTarget === "export"
				    ? React.createElement(React.Fragment, { key: "gp-export" },
				      React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key: "gp-export-target" },
				        ctlText(weT("导出哪一份"), weT("从当前已有的预设里选一份（正文由宿主按读到的值重建，不是照抄磁盘字节）")),
				        React.createElement("select", {
				          className: "we-picker__select",
				          value: exportTargetId || "",
				          disabled: loading === true || exportable.length === 0,
				          onChange: (e) => onExportTargetChange(e.target.value), "aria-label": weT("导出哪一份"),
				        },
				          exportable.length === 0
				            ? React.createElement("option", { key: "__none", value: "" }, weT("没有可导出的预设"))
				            : exportable.map((r) => React.createElement("option", { key: r.id, value: r.id }, labelOf(r))),
				        ),
				      ),
				      assetRows,
				      React.createElement("div", { className: "we-picker__ctl", key: "gp-export-commit" },
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          // 没有目标就没有可下载的正文（目标清空 ⇒ 禁用，而不是发起一次必然 404 的导航）。
				          disabled: loading === true || !exportTargetId,
				          title: weT("按上面勾选的资产，把这份预设下载成 .json（可分享 / 可再导入）"),
				          onClick: () => onExportCommit(),
				        }, weT("下载 .json")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button", onClick: () => onCancelSave(),
				        }, weT("取消")),
				      ),
				    )
				    : null;
				  // ── 保存对话框（非模态）：名字行 + 资产勾选 + 「保存预设」────────────────────
				  // Enter 在名字框里 = 「下一步」（进入资产勾选那一段）。取消把两段一起收起。
				  const saveRow = saving && saveTarget === "save"
				    ? React.createElement(React.Fragment, { key: "gp-save" },
				      React.createElement("div", { className: "we-picker__ctl" },
				        React.createElement("input", {
				          className: "we-picker__file", type: "text", value: draftName || "",
				          placeholder: weT("预设名字，回车进入下一步"),
				          onChange: (e) => onDraftName(e.target.value),
				          onKeyDown: (e) => { if (e && e.key === "Enter") onSaveCommit(); },
				        }),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button", disabled: loading === true,
				          onClick: () => onSaveCommit(),
				        }, weT("下一步")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button", onClick: () => onCancelSave(),
				        }, weT("取消")),
				      ),
				      assetRows,
				      React.createElement("div", { className: "we-picker__ctl", key: "gp-save-commit" },
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button", disabled: loading === true,
				          title: weT("以当前整机配置 + 上面勾选的资产，保存为一份新预设"),
				          onClick: () => onSaveCommit2(),
				        }, weT("保存预设")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button", onClick: () => onCancelSave(),
				        }, weT("取消")),
				      ),
				    )
				    : null;
				  return React.createElement(React.Fragment, null,
				    React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap" },
				      ctlText(weT("预设方案"), weT("一键套用整套配置（出厂七套 + 你自己存的，上限 8 个）：观感、行为与勾选的字体一起生效，应用后可继续微调")),
				    ),
				    loading ? React.createElement("div", { className: "we-picker__hint" }, weT("正在处理…")) : null,
				    // ⚠️ reason 必须再过一次 weT：它可能来自宿主回包（lib/routes/presets.js 的中文 error），
				    //    原样塞进去会让英文界面露出中文 —— 与 fontset-editor 的 error 行同款纪律。
				    error ? React.createElement("div", { className: "we-picker__hint" }, weT("预设不可用：{reason}", { reason: weT(error) })) : null,
				    note ? React.createElement("div", { className: "we-picker__hint" }, weT(note)) : null,
				    rows.length === 0 && !loading
				      ? React.createElement("div", { className: "we-picker__hint" }, weT("还没有任何预设 —— 出厂那几套加载失败或宿主未重挂。"))
				      : null,
				    chipRow,
				    confirmRow,
				    openSaveRow,
				    saveRow,
				    exportRow,
				  );
				}

				// ── 内联模块：packages/glass/src/glass-panel.js —— 「玻璃 UI」节的渲染器外壳（ADR-0016 迁入；S3 起「主题预设」块在 glass-presets-panel.js）：四件套旋钮 + 外观节组装、注册表驱动（GLASS_CHILDREN + childGlassKey）、只读 ctx、动作经 on* 处理器（构建期注入；勿手改本段）──
				/**
				 * glass-panel.js — 「玻璃 UI」节的**渲染器**（纯渲染 + 显式 ctx）。
				 *
				 * 为什么单开一个文件：它只共享宿主注入的纯助手 —— React / SliderRow / switchRow / swatchRow / weT /
				 * GLASS_COLOR_PRESETS 都是 packages/glass/src/client.js 从**显式键集**解构来的，本渲染器只接 ctx 画界面
				 * （玻璃是独立 bundle，不存在主包工厂作用域）。
				 *
				 * 契约（与 `src/panel-tabs.js` 文件头同一条，不在此重复解释）：
				 *   · **只读** ctx —— 不得写 `selection` / ctx 别名指向的东西 / 模块级状态；
				 *   · **动作经具名处理器** —— 写设置一律走 `on*`（由 `src/client.js` 提供），本文件只回答"画什么"；
				 *   · 浏览器安全（无 import / require / Node API），且不得有顶层可执行语句读 client.js 的 const。
				 *
				 * 渲染源是**注册表驱动**的：`GLASS_CHILDREN`（`lib/settings-schema.js` 的登记表）+ `childGlassKey()`
				 * 决定每个子项有哪些参数、叫什么 ⇒ 这里**不硬编码四项**（硬编码正是"面板渲染死旋钮"的来源）。
				 */


				function renderGlassSurfaceControls(ctx) {
				  const surfaces = [
				    ["left-sidebar", weT("左侧栏")], ["right-sidebar", weT("右侧栏")],
				    ["settings-window", weT("设置窗口")], ["content", weT("编辑与终端")],
				    ["declared", weT("声明式表面")], ["extra", weT("额外选择器")],
				  ];
				  return React.createElement("details", { className: "we-picker__surface-policy" },
				    React.createElement("summary", null, weT("玻璃兼容")),
				    ...surfaces.map(([id, label]) => React.createElement("label", { className: "we-picker__ctl", key: id },
				      React.createElement("span", null, label),
				      React.createElement("select", { className: "we-picker__select", "data-we-policy": id,
				        value: ctx.sel.glassSurfacePolicy?.[id] || "auto",
				        onChange: event => ctx.onGlassSurfacePolicy(id, event.target.value) },
				      React.createElement("option", { value: "auto" }, weT("自动适配")),
				      React.createElement("option", { value: "native" }, weT("保留原生"))))),
				    React.createElement("ul", null, ...(ctx.surfaceStatus || []).map(({ id, mode, reason }, index) =>
				      React.createElement("li", { key: id + index }, id + ": " + mode + " · " + reason))),
				  );
				}

				function renderAppearanceGlassSection(ctx) {
				  const {
				    onBlur, onGlassAlpha, onGlassChildParam, onGlassColor, onGlassDarkSeparate, onExtraGlassSelectors, onGlassFidelity,
				    onToggleChildIndependent, childIndependentOn, sel, surface, onResetModule,
				    onCapsuleBlur, onCapsuleColor,
				    onLeftSidebarGlass, onTitlebarGlass, onSidebarAlpha, onSidebarBlur, onSidebarColor,
				    onSidebarContentAlpha, onSidebarContentColor, onSidebarGlass,
				    onSidebarFollowGlobal, onSidebarFullClear, onFloaterSolidBase,
				    onThinkingMode, glassDetailOpen, onToggleGlassDetail, glassUiOpen, onToggleGlassUiSection,
				    presetsOpen, onTogglePresetsSection,
				  } = ctx;
				  // ── 简化配置 vs 高级配置（ADR-0008 **D4**，用户口径修订）────────────
				  //   · **简化配置**（侧栏档 + 设置页都画）：全局四件套（玻璃颜色 / 玻璃透明度 / 雾化 /
				  //     玻璃保真度）、"要不要这一面吃玻璃"的**总开关**（思考块液态玻璃 / 侧栏液态玻璃 /
				  //     侧栏全透明 / 侧栏玻璃跟随全局 / 左侧栏液态玻璃）；
				  //   · **高级配置**（**只在侧栏档画，且默认收起** —— 节尾「详细玻璃调节」开关门控）：
				  //     每个面的「独立配置」层**及其子项参数**，以及挂在总开关下面的**细调行**
				  //     （思考块门下的胶囊雾化 / 胶囊颜色）。动因：设置页对话框挡住主页面、调完看不到
				  //     实时效果 ⇒ 迁侧栏；调节项太多 ⇒ 默认收起（开合住 localStorage，见 quick-panel）。
				  //   · **预设方案仍只在设置页画**（`!sidebarSurface` 门不动）：整快照覆盖无撤销，属高阶
				  //     动作，不进随手可点的窄面板 —— 这一条**没有**随本次迁移改变。
				  //   判定一律走 `ctx.surface`（quick-panel 传 "sidebar"）+ 折叠态 `glassDetailOpen`。
				  //   ⚠️ 分档口径以 **ADR-0008 D4** 为准，上面这张表就是它的实现。
				  //   ⚠️ 与 D4 配套的 quick-panel 占位器现在只剩「预设方案」与播放页专属字段
				  //   （高级行处理器已随迁移**移出**占位器名单、改为真值接线）。判据见 verify-scene-live
				  //   的「侧栏 ctx 覆盖」与两档标签序列。
				  const sidebarSurface = surface === "sidebar";
				  const children = ((typeof GLASS_CHILDREN !== "undefined" && GLASS_CHILDREN) || [])
				    // ⚠️ 排除 `panelOff` 的子项：乙类（左侧栏）**不进这一层** ——
				    //    它已有自己的总开关「左侧栏液态玻璃」，而它的"独立配置"耦合在那一项下面
				    //    （见本文件「细节」节）。它留在登记表里只为生成 schema 键。
				    .filter((c) => !c.panelOff);
				  // i18n 词表：**就地包 weT(...)** —— 不能用 `weT(cn.label)` 那种属性访问。
				  // i18n 判据是**文本扫描**：它只认出现在 `weT(` 实参里的中文；属性访问看不见 ⇒
				  // 词条会全成孤儿、文本也进不了"裸中文"检查。所以词表每一项都直接过 weT。
				  // （放在渲染函数内而非模块级：weT 依赖当前语言，必须每次渲染重取。）
				  // 两侧靠 `id` 对齐；下面有兜底把"漏了哪个 id"当场画出来（比静默无标签好）。
				  // ⚠️ 词表只有 `hint`（子面的**身份**，挂在「独立配置」那一行上）与各参数文案 —— 子面的
				  //    `label`（开关标签）随"要不要玻璃"那一层一起不存在（对应的 i18n 词条同批清掉）。
				  const CHILD_CN = {
				    settingsWindow: {
				      hint: weT("整个设置窗口（含全部原生分区）"),
				      indep: weT("设置窗口玻璃·独立配置"), color: weT("设置窗口玻璃·玻璃颜色"),
				      alpha: weT("设置窗口玻璃·玻璃透明度"), blur: weT("设置窗口玻璃·雾化"),
				      fidelity: weT("设置窗口玻璃·玻璃保真度"),
				    },
				    conversation: {
				      hint: weT("输入卡片 / 消息气泡 / 工具弹卡"),
				      indep: weT("对话框玻璃·独立配置"), color: weT("对话框玻璃·玻璃颜色"),
				      alpha: weT("对话框玻璃·玻璃透明度"), blur: weT("对话框玻璃·雾化"),
				      fidelity: weT("对话框玻璃·玻璃保真度"),
				    },
				    leftSidebar: {
				      hint: weT("宿主原生左栏（会话列表 / 工作区那一列）"),
				      indep: weT("左侧栏玻璃·独立配置"), color: weT("左侧栏玻璃·玻璃颜色"),
				      alpha: weT("左侧栏玻璃·玻璃透明度"), blur: weT("左侧栏玻璃·雾化"),
				      fidelity: weT("左侧栏玻璃·玻璃保真度"),
				    },
				    floaters: {
				      hint: weT("插件自己的更新提示 / 壁纸仓库抽屉"),
				      indep: weT("浮层玻璃·独立配置"), color: weT("浮层玻璃·玻璃颜色"),
				      alpha: weT("浮层玻璃·玻璃透明度"), blur: weT("浮层玻璃·雾化"),
				      fidelity: weT("浮层玻璃·玻璃保真度"),
				    },
				    // ⚠️ 这一面只登记了 `transparency` / `blur` 两个参数（无 color / fidelity：共享面纱
				    //    ⇒ 保真度不可达；本面 CSS 也不消费颜色）⇒ 标签只给**真正会渲染**的那几个，
				    //    不留"参数不存在却有一份翻译"的死文案（R3a 的同一口径）。
				    // ⚠️ 它还挂在 `thinkingGlass` 门下（登记表的 `master`）⇒ 开关关着时这几条文案根本不渲染
				    //    （那正是"门关着 ⇒ 本面不生效"的如实反映）。
				    thinkingTrigger: {
				      hint: weT("对话里「思考过程」那一行的入口条"),
				      indep: weT("思考触发条玻璃·独立配置"),
				      alpha: weT("思考触发条玻璃·玻璃透明度"), blur: weT("思考触发条玻璃·雾化"),
				    },
				  };
				  // ⚠️ 用户口径：**"要不要玻璃"这一层不存在** —— 所有子面**恒吃玻璃**。实测一个"关"并不能
				  //   如愿恢复原生不透明纯色（那些面上还有一批不挂门控的令牌改写，见 glass.js 的退役说明）。
				  // ⇒ 这一节只剩一层：每个子面一个「独立配置」开关 —— 它回答的是
				  //   "读自己那套参数 还是 跟全局"。
				  const childRows = [];
				  // ── 高级配置（D4）：只在**侧栏档且「详细玻璃调节」展开时**构建/渲染。
				  //    设置页档不再画这些行（真迁移）；侧栏收起时连构建都不做（省一遍无用遍历）。
				  //    处理器在侧栏 ctx 里是**真值接线**（已从 setting-only 占位器名单移出）。
				  const detailOpen = sidebarSurface && glassDetailOpen === true;
				  // ── 整节折叠门（**二次修订**：两档都支持隐藏）────────────────────────────
				  //    与「详细玻璃调节」子门**并存**：外层收起时这一节只剩节头；展开后子门照旧管高级行。
				  //    ⚠️ 差别只在**默认值**（由面板组件算好，当 `glassUiOpen` 传进来）：两档默认都展开。
				  //    ⚠️ 子门 `detailOpen` 那行的 `sidebarSurface &&` 保持不动 —— 那是"高级行只住侧栏"的
				  //       老口径（设置页不画那些行），与整节折叠是两件事。
				  const open = glassUiOpen === true;
				  for (const c of detailOpen ? children : []) {
				    const cn = CHILD_CN[c.id];
				    // 登记表与词表必须一一对应：漏一个就整项无标签（比 ReferenceError 更隐蔽）。
				    if (!cn) { childRows.push(React.createElement("div", { className: "we-picker__hint", key: "gc-missing-" + c.id }, weT("内部错误：这个子界面缺少文案"))); continue; }
				    // ⚠️ `master`：这一面挂在某个**总开关**门下（登记表里声明，如 `thinkingTrigger` → `thinkingGlass`）。
				    //    开关关着时它一行都不画 —— 画了就是"画出来又不生效的旋钮"：那种状态下它的 CSS 整组不匹配
				    //    （令牌不被接管、模糊不挂），滑杆拖了没有任何变化（同一条纪律见本函数上方关于胶囊雾化的注释）。
				    if (c.master && sel[c.master] !== true) continue;
				    // 每个子面**直接**一个「独立配置」开关（子面的名字进 `hint`，见词表的 cn.hint）。
				    const indep = !!(childIndependentOn && childIndependentOn(c.id));
				    childRows.push(switchRow(cn.indep, indep, (e) => onToggleChildIndependent(c.id, e.target.checked), {
				      key: "gi-" + c.id,
				      hint: cn.hint,
				      tooltip: weT("打开后**紧接在本行下方**出现这一项自己的独立配置，**完全覆盖**上面的全局配置；关闭则回到继承全局"),
				    }));
				    // 独立配置关着 ⇒ 不显示它自己的参数行（默认就是关 ⇒ 默认跟随全局）
				    if (!indep) continue;
				    const P = (param) => childGlassKey(c.id, param);
				    // ⚠️ 按登记表的 `params` 渲染，**不硬编码四项** —— 不是每个子项都拿得到全部参数。
				    //    `fidelity` 只有 `conversation` 有：它的面纱有专属的 `--we-chat-readability-*`，
				    //    而共享面纱的面受 F2a / F1c 约束、**逐面保真度不可达**。
				    //    硬编码会让那两个面多出一个"点了没反应"的旋钮 —— 正是要消灭的那类死开关。
				    if (c.params.blur !== undefined) {
				      childRows.push(SliderRow(cn.blur, 0, 60, 1,
				        sel[P("blur")], (v) => onGlassChildParam(c.id, "blur", v), "px", "gc-blur-" + c.id));
				    }
				    if (c.params.transparency !== undefined) {
				      childRows.push(SliderRow(cn.alpha, 0, 100, 5,
				        sel[P("transparency")], (v) => onGlassChildParam(c.id, "transparency", v), "%", "gc-alpha-" + c.id));
				    }
				    if (c.params.fidelity !== undefined) {
				      childRows.push(SliderRow(cn.fidelity, 0, 100, 5,
				        sel[P("fidelity")], (v) => onGlassChildParam(c.id, "fidelity", v), "%", "gc-fid-" + c.id));
				    }
				    if (c.params.color !== undefined) {
				      childRows.push(swatchRow(cn.color, GLASS_COLOR_PRESETS,
				        sel[P("color")], (v) => onGlassChildParam(c.id, "color", v), { key: "gc-color-" + c.id }));
				    }
				  }
				  // 「思考块液态玻璃」三挡的当前值与按钮工厂（必须在 return 之前声明 —— 它们是语句，
				  // 进不了下面的 createElement 实参表）。
				  const thinkMode = sel.thinkingNative === true ? "native" : (sel.thinkingGlass === true ? "glass" : "off");
				  // #159②：玻璃色那一对（内部永远是一对；标量/残缺由 panelGlassPair 归一 ——
				  // ADR-0016 第二刀起它的家在 lib/settings-schema.js（与 readGlassColors 同族，
				  // 「缺省回空串不猜色」vs「缺省回白釉」是两条不同的语义），经主 bundle 键集到本包）。
				  const glassPair = panelGlassPair(sel);
				  const thinkGear = (id, label, tip) => React.createElement("button", {
				    key: "think-" + id,
				    className: "we-picker__btn we-picker__rate" + (thinkMode === id ? " we-picker__rate--active" : ""),
				    type: "button",
				    title: tip,
				    onClick: () => onThinkingMode(id), "aria-pressed": thinkMode === id ? "true" : "false",
				  }, label);
				  // ── 高级配置行（D4 = 侧栏「详细玻璃调节」折叠块的内容）────────────
				  //   胶囊细调 + 各面「独立配置」层及其子项参数 + 子 UI 独立配置 —— 只在侧栏档
				  //   **且展开时**构建（`detailOpen`）；设置页档不再画这些行（真迁移 ⇒ 恒空）。
				  //   每行的**内在门**（思考玻璃挡 / 各面总开关 / 宿主能力位 / 跟随全局）原样保留 ——
				  //   折叠只是把它们整体挪到节尾一处，不改变任何一行的生效条件。
				  const advRows = [];
				  if (detailOpen) {
				    // 胶囊雾化（capsuleBlur，默认 8px）：**只在思考玻璃开着时渲染** —— 消费它的规则
				    // 全部挂在 data-we-thinking-glass 门下，门关着时这个滑杆就是"画出来又不生效的旋钮"
				    //（本仓要防的那类死旋钮，见 glass-panel 文件头）。
				    if (sel.thinkingGlass === true && sel.thinkingNative !== true) {
				      advRows.push(SliderRow(weT("胶囊雾化"), 0, 60, 1,
				        sel.capsuleBlur, onCapsuleBlur, "px", "capsule-blur", {
				        tooltip: weT("正文里新会话按钮、导航按钮的模糊半径 —— 越大越像磨砂玻璃。只在这些胶囊吃玻璃（思考块液态玻璃开着）时生效；0 = 关掉雾化。"),
				      }));
				      // 胶囊釉色（capsuleColor，默认白 = 原观感）：与胶囊雾化同族同门。色板行不做
				      // 可读性钳制（10% 雾底不是正文面，理由见 schema 注释）。
				      advRows.push(swatchRow(weT("胶囊颜色"), GLASS_COLOR_PRESETS,
				        sel.capsuleColor, onCapsuleColor, {
				        key: "capsule-color",
				        tooltip: weT("行内代码胶囊、新会话按钮、导航按钮与聊天滚动条拇指的雾底色相 —— 默认白（原观感）。只在这些胶囊吃玻璃（思考块液态玻璃开着）时生效；浓度档不变（10%）。"),
				      }));
				    }
				    // ── 左侧栏玻璃·独立配置（与「左侧栏液态玻璃」耦合：总开关关着时不显示）──
				    if (sel.leftSidebarGlass === true) {
				      advRows.push(switchRow(weT("左侧栏玻璃·独立配置"),
				        !!(childIndependentOn && childIndependentOn("leftSidebar")),
				        (e) => onToggleChildIndependent("leftSidebar", e.target.checked), {
				        key: "left-sidebar-independent",
				        hint: weT("用这一项自己的釉层参数覆盖全局"),
				        tooltip: weT("打开后**紧接在本行下方**出现左侧栏自己的两项（玻璃透明度 / 雾化），**完全覆盖**「玻璃 UI」里的全局配置；关闭则回到继承全局。"),
				      }));
				      // 独立配置开着才出现它自己的两项（默认关 ⇒ 默认跟随全局）。
				      // ⚠️ 只画**真正接线**的那两个 —— 本面 CSS 只读 `--we-left-sidebar-blur/-alpha`，
				      //    不消费颜色与保真度 ⇒ 画了就是死旋钮（R3a）。
				      if (childIndependentOn && childIndependentOn("leftSidebar")) {
				        advRows.push(SliderRow(weT("左侧栏玻璃·玻璃透明度"), 0, 100, 5,
				          sel.leftSidebarTransparency, (v) => onGlassChildParam("leftSidebar", "transparency", v), "%", "ls-alpha"));
				        advRows.push(SliderRow(weT("左侧栏玻璃·雾化"), 0, 60, 1,
				          sel.leftSidebarBlur, (v) => onGlassChildParam("leftSidebar", "blur", v), "px", "ls-blur"));
				      }
				    }
				    // ── 标题栏玻璃·独立配置（与「标题栏液态玻璃」耦合，同左栏）──
				    if (sel.titlebarGlass === true) {
				      advRows.push(switchRow(weT("标题栏玻璃·独立配置"),
				        !!(childIndependentOn && childIndependentOn("titlebar")),
				        (e) => onToggleChildIndependent("titlebar", e.target.checked), {
				        key: "titlebar-independent",
				        hint: weT("用这一项自己的釉层参数覆盖全局"),
				        tooltip: weT("打开后**紧接在本行下方**出现标题栏自己的两项（玻璃透明度 / 雾化），**完全覆盖**「玻璃 UI」里的全局配置；关闭则回到继承全局（与左侧栏同一数值 ⇒ 同一观感）。"),
				      }));
				      // ⚠️ 与左栏同：只画**真正接线**的那两个 —— 本面 CSS 只读 --we-titlebar-blur/-alpha，
				      //    不消费颜色与保真度 ⇒ 画了就是死旋钮（R3a）。
				      if (childIndependentOn && childIndependentOn("titlebar")) {
				        advRows.push(SliderRow(weT("标题栏玻璃·玻璃透明度"), 0, 100, 5,
				          sel.titlebarTransparency, (v) => onGlassChildParam("titlebar", "transparency", v), "%", "tb-alpha"));
				        advRows.push(SliderRow(weT("标题栏玻璃·雾化"), 0, 60, 1,
				          sel.titlebarBlur, (v) => onGlassChildParam("titlebar", "blur", v), "px", "tb-blur"));
				      }
				    }
				    // ── 侧栏族（dsh-better-sidebar）的「独立配置」层：`glassMode` 的唯一写入方是
				    //    `onToggleChildIndependent`，而 `sidebar` / `sidebarContent` 不在登记表里 ⇒
				    //    没有这两个开关时它们的 mode 永远停在 `'inherit'` ⇒ 下面那 5 个滑块**全是死的**。
				    //    判据见第 ⑧ 组的 mode 可达性。能力位门（sidebarPresent / sidebarGlass）原样保留。
				    if (sel.sidebarPresent && sel.sidebarGlass) {
				      // 跟随全局开着 ⇒ 侧栏族的独立配置收起（画出来又不生效的旋钮是要防的）。
				      if (!sel.sidebarFollowGlobal) {
				        advRows.push(switchRow(weT("侧栏玻璃·独立配置"),
				          !!(childIndependentOn && childIndependentOn("sidebar")),
				          (e) => onToggleChildIndependent("sidebar", e.target.checked), {
				            key: "sb-independent",
				            hint: weT("用这一项自己的釉层参数覆盖全局"),
				            tooltip: weT("打开后**紧接在本行下方**出现这一项自己的独立配置，**完全覆盖**上面的全局配置；关闭则回到继承全局"),
				          }));
				        if (childIndependentOn && childIndependentOn("sidebar")) {
				          advRows.push(SliderRow(weT("侧栏模糊"), 0, 60, 1, sel.sidebarBlur, onSidebarBlur, "px", "sb-blur"));
				          advRows.push(SliderRow(weT("侧栏透明度"), 0, 100, 1, sel.sidebarAlpha, onSidebarAlpha, "%", "sb-alpha"));
				          advRows.push(swatchRow(weT("侧栏玻璃颜色"), GLASS_COLOR_PRESETS, sel.sidebarColor, onSidebarColor, { key: "sb-color" }));
				        }
				      }
				    }
				    // ── 子 UI 独立配置：这一节只有**一层** —— 每个子面一个「独立配置」开关（开 = 用
				    //    自己那套参数覆盖全局）。⚠️ 这里**没有**「要不要玻璃」的开关：所有子面恒吃玻璃。
				    advRows.push(...childRows);
				  }
				  // ── 内容面（阅读文件页 / 编辑器 / 终端）的底色与透明度 ──────────────────────
				  //    **不在 `detailOpen` 块里**：用户口径「侧边栏阅读文件页面的背景底色的设置被删除了，
				  //    需要找回」—— 它此前只在侧栏「详细玻璃调节」展开 + 「内容面玻璃·独立配置」打开后
				  //    才可达，设置页一行都不画，于是在两条路径上都像"没了"。这一面看的是正文（阅读
				  //    文件页 / 编辑器 / 终端），调整期望远高于其余独立配置 ⇒ 提到本节常规行，两档都画。
				  //    仍保留「独立配置」开关（`glassMode.sidebarContent`）而不是直接摊两个旋钮：
				  //    `applyGlass` 的 `glassValue()` 只在 mode='custom' 时读这两个键，mode 停在 inherit
				  //    时写进去的值**不会被消费** —— 直接摊旋钮就是一对死旋钮（本仓专门防这一类）。
				  //    ⚠️ **门只有 `sidebarGlass`，不含 `sidebarPresent`**（用户实测修正）：
				  //    `sidebarPresent` 是"装没装 dsh-better-sidebar"，而这一面真正作用的对象是
				  //    **宿主原生右栏**（`[data-sidebar-right-panel]`，阅读文件页就长在那里）——
				  //    没装 better-sidebar 的机器上它同样存在、同样吃 `data-we-sidebar-glass` 那张底板。
				  //    挂上 `sidebarPresent` 的后果实测过一次：没装该插件的用户整组行一行都不画。
				  //    CSS 侧的门也是 `data-we-sidebar-glass`（由 `sidebarGlass` 写，默认开）⇒ 与本门同源。
				  if (open && sel.sidebarGlass === true) {
				    advRows.push(switchRow(weT("内容面玻璃·独立配置"),
				      !!(childIndependentOn && childIndependentOn("sidebarContent")),
				      (e) => onToggleChildIndependent("sidebarContent", e.target.checked), {
				        key: "content-independent",
				        hint: weT("阅读文件页 / 编辑器 / 终端的底色"),
				        tooltip: weT("打开后**紧接在本行下方**出现内容面自己的两项（透明度 / 底色），**完全覆盖**全局玻璃配置；关闭则回到继承全局"),
				      }));
				    if (childIndependentOn && childIndependentOn("sidebarContent")) {
				      advRows.push(SliderRow(weT("内容面透明度"), 0, 100, 5, sel.sidebarContentAlpha, onSidebarContentAlpha, "%", "content-alpha",
				        { tooltip: weT("阅读文件页、编辑器与终端的底板不透明度（0 = 接近全透、100 = 最实）。越大越透，与玻璃透明度同语义。") }));
				      advRows.push(swatchRow(weT("内容面底色"), GLASS_COLOR_PRESETS, sel.sidebarContentColor, onSidebarContentColor, {
				        key: "content-color",
				        tooltip: weT("阅读文件页、编辑器与终端的底板色相；「主题」= 跟随主题面板色"),
				        auto: React.createElement("button", {
				          key: "auto",
				          className: "we-picker__swatch we-picker__swatch--auto" + (sel.sidebarContentColor === "" ? " we-picker__swatch--active" : ""),
				          type: "button",
				          title: weT("跟随主题面板色"),
				          onClick: () => onSidebarContentColor(""), "aria-label": weT("内容面底色 跟随主题"),
				        }, weT("主题")),
				        colorValue: sel.sidebarContentColor || "#1e1f26",
				      }));
				    }
				  }
				  // ── 主题预设：**独立节**（ADR-0011 后预设是整机快照，不再是玻璃子集 ⇒ 不住「玻璃 UI」
				  //    分栏，升为自己的栏目且排在玻璃节之前）。只在设置页画（!sidebarSurface 门不变）；
				  //    侧栏档连节头都不画 —— 空节头是噪音。
				  // ctx 成员由 client.js 的 glassPresetCtx 提供（清单/错误是宿主投影；应用走 settings 通道）。
				  // ⚠️ 这道门是**显式**的，四处对齐：① 门在这里；② `glassPresets` 已进 quick-panel 的
				  //    setting-only 占位器（误补 ⇒ 当场炸）；③ verify-scene-live 两档都钉住预设块
				  //    （节序列 + 标签序列 + 整树文本锚：侧栏档不许有、设置档必须有）；④ 侧栏 ctx **不给**
				  //    onTogglePresetsSection（verify-presets 的 SETTING_ONLY 豁免同此理由）。
				  //    分类理由：它不是"总开关"也不是"逐面覆盖"，而是**跨面批量覆盖**（一份预设 = 整机配置
				  //    完整快照，应用即 Object.assign 整套覆盖、**无确认无撤销**），且出厂预设**删除即永久** ——
				  //    这类动作按 D4 的取向属高阶；侧栏是窄面板 + 随手调的场合。
				  // 折叠：与其他节同口径升 sectionHead —— 两档都可折叠的统一构件；本节只在
				  // 设置页渲染 ⇒ 折叠态只有设置页一份（picker-presets-open，默认展开，经 usePickerSectionOpen）。
				  const presetSectionOpen = presetsOpen === true;
				  const presetSection = (!sidebarSurface && ctx.glassPresets)
				    ? React.createElement("div", { className: "we-picker__section", key: "gp-section" },
				        sectionHead(weT("主题预设"), presetSectionOpen, onTogglePresetsSection),
				        presetSectionOpen && renderGlassPresetsBlock(ctx.glassPresets),
				      )
				    : null;
				  return React.createElement(React.Fragment, null,
				  presetSection,
				  React.createElement("div", { className: "we-picker__section" },
				    sectionHead(weT("玻璃 UI"), open, onToggleGlassUiSection,
				      moduleResetButtonNode("glass", onResetModule, {
				        title: weT("把这一块的参数恢复为默认值（不需要确认）"),
				        aria: weT("重置本模块"),
				      })),
				    // ── 折叠门（用户口径「这三个在侧边栏改成默认收敛」）：**只在侧边栏**生效 ——
				    //    设置页 `collapsible` 为假、`open` 恒真 ⇒ 这一层 Fragment 里的内容照旧整个渲染。
				    //    ⚠️ 包一层 Fragment 是刻意的：本节约有 80 个并列 children，逐个挂门既啰嗦又容易漏；
				    //    而 React 的 Fragment 不产生 DOM 节点 ⇒ 观感与无障碍树都没有多出来的层级。
				    open && React.createElement(React.Fragment, null,
				      !sidebarSurface && typeof ctx.onGlassSurfacePolicy === "function" && renderGlassSurfaceControls(ctx),
				      // ── 全局四件套 ──
				      // 玻璃颜色: the settings-window glass BASE tint. Defaults keep the stock
				      // look (white light / deep navy dark); picking any preset or a custom
				      // color tints the whole window glass in BOTH themes.
				      // #159② 分主题：色板行的"一个颜色"是**浅色那一侧**；开了「深色单独设置」再多一行专写深色。
				      // `sel.glassDarkSeparate` 只是面板开关，不改渲染 —— 取色在 effects.js / 本包 glass.js 按主题各取一半。
				      // 侧栏档（窄面板 + 随手调）**不给这个开关**（D4 同向：独立/分套属配置层）；它只有一个色板，
				      // 只写**浅色那一侧** —— 侧栏的玻璃色变量就只消费浅色半（本包 `glass.js` / 主包 `effects.js`
				      // 的 sidebar 分支都取 `glassColorOf(sel,"light")`：侧栏没有 `data-ds-dark-theme` 孪生，
				      // 有意不分深浅）。**不要**改回"写当前配色那一侧"：深色主题下那等于让用户改一个他看不到的
				      // 值（判据 A2-F2）；面板也不许自己采样主题（`panelThemeIsDark` 已随之删除）。
				      !sidebarSurface && switchRow(weT("深色单独设置"), sel.glassDarkSeparate === true, (e) => onGlassDarkSeparate(e.target.checked), {
				        key: "glass-dark-separate",
				        tooltip: weT("关闭时一个颜色同时用于浅色与深色两套（内部仍存两套值）；开启后浅色/深色分别设置"),
				      }),
				      swatchRow(weT("玻璃颜色"), GLASS_COLOR_PRESETS,
				        glassPair.light,
				        (hex, live) => onGlassColor("light", hex, live), { key: "glass-color" }),
				      !sidebarSurface && sel.glassDarkSeparate === true && swatchRow(weT("玻璃颜色 · 深色"), GLASS_COLOR_PRESETS, glassPair.dark,
				        (hex, live) => onGlassColor("dark", hex, live), { key: "glass-color-dark" }),
				      SliderRow(weT("玻璃透明度"), 0, 100, 5, sel.glassAlpha, onGlassAlpha, "%"),
				      // 「雾化」控制的只有**模糊半径**（雾面深度），饱和度是解耦的常量材料属性（见 GLASS_SATURATE）。
				      // ⚠️ 覆盖面的实测口径（按规则头归面复算）：
				      //    它喂的 `--we-blur` 被这些面消费 —— 对话栏一族（输入卡片 / 气泡 / 工具弹卡）、
				      //    **左侧栏液态玻璃**（`data-we-left-sidebar` 那列的 `::before`）、**设置窗口**、
				      //    插件自身浮层（更新提示 / 仓库面板）。
				      //    而**侧栏**（dsh-better-sidebar 与右栏面板）走的是它**自己的** `--we-sidebar-blur`
				      //    （由「侧栏模糊」管）—— 那才是唯一不吃本项的面。
				      SliderRow(weT("雾化"), 0, 60, 1, sel.blur, onBlur, "px", "glass-frost", {
				        tooltip: weT("玻璃面板（对话栏卡片、左侧栏、设置窗口、插件浮层）的模糊半径 —— 越大越像磨砂玻璃；色彩饱和度不随本滑块变化。侧栏有自己的「侧栏模糊」，不受本项影响"),
				      }),
				      // ── 额外补雾化的选择器（上游 #200）────────────────────────────────────────
				      // 为什么在这里、以及为什么**不是滑杆**：本插件的静态样式表只认得宿主与自己接管的
				      // 六个面；第三方插件自己的面板读的是被改写过的共享令牌、**自身没有 backdrop-filter**
				      // ⇒ 全局「雾化」对它们本来无效（实测 dsh-mobile / dsh-codearts-auth 整包 0 处命中）。
				      // 这一行给用户一条**点名**通道：写谁的选择器，就给谁补上毛玻璃载体（::before 形态，
				      // 见 packages/glass/src/glass-extra.js）。空 = 关（一条规则都不生成 ⇒ 与未接本功能时逐字节一致）。
				      React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key: "extra-glass-selectors" },
				        ctlText(weT("额外补雾化的选择器"),
				          weT("给第三方插件自己的面板补上毛玻璃（它们自身没有模糊，全局「雾化」对它们无效）"),
				          weT("写这些面板的 CSS 选择器，逗号或换行分隔，最多 8 条、每条最多 120 字；超长的单条或超出 8 条的整条丢弃（不是截断，存活下来的前 8 条全量生效）。目标需已有定位和非 auto 层级，且 ::before 空闲；无法安全接管时保留原生。留空 = 关。")),
				        React.createElement("input", {
				          className: "we-picker__text", type: "text",
				          value: sel.extraGlassSelectors || "",
				          placeholder: weT("例如 .dsh-mobile-control__panel, .dim-jh-badgePop"),
				          spellCheck: false,
				          onInput: (e) => onExtraGlassSelectors(e.target.value),
				        }),
				      ),
				      // 玻璃保真度（默认 100 = 完整可读性红线）：唯一的「颜色 vs 可读」权衡旋钮。
				      // 100 = 玻璃色经亮度钳制保正文 ≥4.5:1（深色压暗 / 浅色提亮的现状）；拉低 =
				      // 釉色向用户原色线性回退（单调，中间档不会更黑/更白）+ 地板层覆盖度同比例
				      // 减薄，正文在极端壁纸上可读性让位；0 = 原色直出不钳制。数学入口
				      // weClampSurfaceColor 第三参 + --we-glass-fidelity。
				      SliderRow(weT("玻璃保真度"), 0, 100, 5, sel.glassFidelity, onGlassFidelity, "%", "glass-fidelity", {
				        tooltip: weT("100 = 完整可读性红线（默认）：自定义玻璃色经亮度钳制，正文对比度始终 ≥4.5:1 —— 深色主题下颜色被压暗、浅色主题下被提亮。拉低后颜色更贴你选的原色，但正文在极端明暗的壁纸上可能看不清；看不清字时把本项拉回 100，或按「看不清字三步」调节。"),
				      }),
				      // ⚠️ 「对话栏的保真度」**只有**「对话框玻璃·独立配置」下的「对话框玻璃·玻璃保真度」一个入口
				      //    （两个旋钮控同一件事是要防的）；存储键复用 `chatGlassFidelity`（D2：不新建平行键），
				      //    老配置值不丢。
				      // 思考块液态玻璃 —— **三挡**（用户口径）：关（对话区半透明透壁纸）/ 液态玻璃（磨砂）/
				      // 原生（**只有正文内容** —— 气泡 / 代码块 / 思考区 —— 恢复 DSH 原生不透明实色；输入框与画布
				      // 保留玻璃）。存储是两个布尔（thinkingGlass + thinkingNative），**原生挡赢**的互斥在 glass-layer.js
				      // 门控层保证，本分段只负责把两键写一致。总开关级 ⇒ 两侧都画（D4）。
				      // ⚠️ 原生挡下胶囊两行（门 = thinkingGlass）整组不画 —— 那族 CSS 挂在
				      //    data-we-thinking-glass 门下，原生挡不挂门 ⇒ 画了就是死旋钮。
				      React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key: "thinking-mode" },
				        ctlText(weT("思考块液态玻璃"), weT("对话内容的三挡：关（半透明）/ 液态玻璃 / 原生（正文实色、输入框保持玻璃）")),
				        React.createElement("div", { className: "we-picker__seg" },
				          thinkGear("off", weT("关"), weT("对话区保持半透明：壁纸透过面板与代码块显出来（无磨砂）")),
				          thinkGear("glass", weT("液态玻璃"), weT("思考区与文件卡清底，文字胶囊与七类工具内容玻璃；代码块随玻璃透明度透出壁纸")),
				          thinkGear("native", weT("原生"), weT("消息正文（气泡、代码块、思考区）恢复 DSH 原生不透明实色；输入框与对话画布保留玻璃透壁纸；胶囊与思考条的玻璃细调在本挡停用")),
				        ),
				      ),
				      // ── 既有面的**显示开关**与它们的独立配置 ──
				      // ⚠️ 门槛分两层：宿主能力位（`sidebarPresent` / `sidebarGlass`：装没装 dsh-better-sidebar、
				      //    总开关开没开）**与**档位门 —— **总开关**两档都画；挂在它们下面的**独立配置层**
				      //    属高级配置：只在侧栏档「详细玻璃调节」展开时画（见函数头的 D4 表；设置页不再画）。
				      // 左侧栏液态玻璃（默认关）：宿主原生左栏在壁纸下只是「透明的洞」，打开后它走同一张配方表。
				      // ⚠️ 它**不是**"要不要玻璃"那一类：它的「关」是**恢复背景**（那一列回到壁纸原样）——
				      //    所以它是唯一保留的**显示开关**（乙类），与其余面"恒吃玻璃"不同。
				      switchRow(weT("左侧栏液态玻璃"), sel.leftSidebarGlass === true, onLeftSidebarGlass, {
				        key: "left-sidebar-glass",
				        hint: weT("左侧栏也跟随玻璃配方（配色 / 玻璃颜色 / 透明度 / 雾化 / 边框）"),
				        tooltip: weT("宿主原生左侧栏（会话列表 / 工作区那一列）默认直接透出壁纸、不吃玻璃参数。打开后它变成与其余界面同款的玻璃面板，跟随「配色 / 玻璃颜色 / 玻璃透明度 / 雾化 / 边框」；关闭即恢复原生观感。默认关。"),
				      }),
				      // 标题栏液态玻璃（默认关）：壳层顶栏（拖拽区 / 窗口按钮那一行）是本插件唯一**刻意**
				      // 留成不透明的面（画布被清成透明后，这一层必须保留底色否则标题文字压在壁纸上）。
				      // 打开后它改吃**与其余面板同一张配方表**，且与左侧栏那条**逐条同形** —— 同一组釉层
				      // 变量、同一条可读性下限、同一条玻璃色 ⇒ 两侧栏在同一数值下同观感，不出现色差。
				      // ⚠️ 与左侧栏同为**乙类**（关 = 恢复宿主那条不透明底），所以同为**总开关级**（两档都画）；
				      //    它的「独立配置」层属高级配置，在节尾折叠块里（D4 表见函数头）。
				      switchRow(weT("标题栏液态玻璃"), sel.titlebarGlass === true, onTitlebarGlass, {
				        key: "titlebar-glass",
				        hint: weT("标题栏也跟随玻璃配方（配色 / 玻璃颜色 / 透明度 / 雾化 / 边框）"),
				        tooltip: weT("桌面壳顶栏（拖拽区 / 窗口按钮那一行）默认保持不透明底色。打开后它变成与其余界面、**以及左侧栏完全同款**的玻璃面板，跟随「配色 / 玻璃颜色 / 玻璃透明度 / 雾化 / 边框」——两侧栏同一数值下观感一致，不会出现色差；关闭即恢复原生观感。默认关。"),
				      }),
				      // 侧栏玻璃（dsh-better-sidebar 适配）：总开关 + 专用模糊 / 透明度 / 玻璃基底色调，
				      // 只作用于 dsh-better-sidebar 子树，不动会话玻璃的设置。仅在宿主检测到该插件时显示。
				      sel.sidebarPresent && switchRow(weT("侧栏液态玻璃"), sel.sidebarGlass, onSidebarGlass, {
				        key: "sidebar-glass-toggle",
				        hint: weT("dsh-better-sidebar 侧栏毛玻璃适配"),
				        tooltip: weT("dsh-better-sidebar 侧栏（文件 / 终端 / Git 等面板）的毛玻璃适配；关闭则恢复其原生外观"),
				      }),
				      // 侧栏全透明（issue #137）：放弃可读性下限换全透的显式开关。刻意**不跟在
				      // 侧栏液态玻璃的门后面** —— 玻璃关着时右栏那条原生不透明兜底同样是"透不出来"
				      // 的一极，本开关在两个状态都要可达（issue 里用户正是在玻璃关着的档位打的补丁）。
				      sel.sidebarPresent && switchRow(weT("侧栏全透明"), sel.sidebarFullClear === true, onSidebarFullClear, {
				        key: "sidebar-fullclear",
				        hint: weT("壁纸下撤掉侧栏的可读性底与色染"),
				        tooltip: weT("打开：壁纸激活时侧栏的可读性下限、色染与釉光整块撤掉，壁纸原样透出（文字直接压在壁纸上）；模糊仍由侧栏模糊/全局雾化旋钮管。关闭（默认）：保留可读性下限，最坏壁纸下正文仍 ≥4.5:1"),
				      }),
				      // #277：第三方插件浮层的实底底板（默认开）。玻璃把宿主层令牌改成半透明之后，
				      // 第三方写的弹窗（role=dialog / alertdialog，没有本仓认得的锚点）会变成
				      // "半透明且无模糊" ⇒ 背后内容叠上来糊成一团。本开关给这类面补一层实底；
				      // 关掉即恢复宿主原生的半透明观感。刻意**不放在玻璃总开关后面**：玻璃关着时
				      // 这组规则本就不生效，而用户可能先开玻璃、再回来单独关这一项 —— 门中门只会让人找不到。
				      // ⚠️ 射程只到 ARIA 浮层：无 role 的框架层 / 吸顶条**没有稳定锚点**，本开关管不到
				      //    （见 glass-css.js 那段说明）—— 文案不许许诺这两类，否则是画了不生效的旋钮。
				      switchRow(weT("第三方弹窗不透明底"), sel.floaterSolidBase !== false, onFloaterSolidBase, {
				        key: "floater-solid-base",
				        hint: weT("给第三方插件的弹窗补实底"),
				        tooltip: weT("打开（默认）：第三方插件（任务看板等）的弹窗与确认框补一层不透明底，背后的页面内容与兄弟弹窗不再透上来；宿主自己的设置窗、输入卡与菜单保持原样，宿主的确认 / 审批卡会一并变实底（它们此前同样在漏）。关闭：恢复宿主原生的半透明观感"),
				      }),
				      // 跟随全局（sidebarFollowGlobal，默认开，现场口径："我需要侧栏玻璃也跟随全局"）：
				      // 开着 ⇒ 侧栏的釉变量直接指向全局三件套（effects 里写 var() 引用），并把下面
				      // 侧栏那一族的「独立配置」收起 —— 画出来又不生效的旋钮是要防的。
				      // 内容面（可读性旋钮）与跟随无关 ⇒ 不受此门影响，照旧在场。
				      sel.sidebarPresent && sel.sidebarGlass && switchRow(weT("侧栏玻璃跟随全局"), sel.sidebarFollowGlobal === true, onSidebarFollowGlobal, {
				        key: "sidebar-follow-global",
				        hint: weT("模糊 / 透明度 / 底色都跟随全局玻璃"),
				        tooltip: weT("打开：侧栏玻璃跟随「玻璃 / 玻璃透明度 / 玻璃颜色」（与原生左栏同一条配方，两侧栏一致）；关闭：用下面三个旋钮单独调侧栏"),
				      }),
				      // ── 「详细玻璃调节」折叠开关（**仅侧栏档**；默认收起）──────────────────────────
				      //    开关后面的 `advRows` = 全部高级行（胶囊细调 / 各面独立配置及参数 / 子 UI 独立配置），
				      //    见函数头构建处。设置页档不画开关也不画这些行（真迁移，D4）。
				      //    开合状态住 localStorage（quick-panel 的 qp-glass-detail），渲染器只经 ctx 读它。
				      sidebarSurface && switchRow(weT("详细玻璃调节"), glassDetailOpen === true,
				        (e) => onToggleGlassDetail && onToggleGlassDetail(e.target.checked), {
				          key: "glass-detail-toggle",
				          hint: weT("各面独立配置、胶囊细调等进阶旋钮（默认收起）"),
				          tooltip: weT("展开后出现每个面自己的「独立配置」与细调行（胶囊雾化 / 胶囊颜色、侧栏族参数等）——调完立刻能看到实时效果；收起只留本节的简化配置"),
				        }),
				      ...advRows,
				    ),
				  ),
				  );
				}

		// ── 客户端正文（packages/glass/src/client.js）──────────────────────────────────

		/**
		 * 缺键**大声失败**（ADR-0014 S5.1 / S5.4 显式键集 + ADR-0013 D3③「宁可显示、不可静默消失」）。
		 * 主包被关 ⇒ 本 bundle 根本不会被 require（ADR-0014 S7.2 连坐）；能走到这里却缺键 = 键集与申报表脱钩。
		 */
		/** 由构建期填充：scripts/build-client.mjs 从下方 `} = host;` 的解构逐键派生本表
		 * （源码留空表只为 eslint/typecheck 可读；产物里是一份生成好的键数组）。
		 * 手工加键的正确顺序：① src/host-bridge.js 的 HOST_BRIDGE_BINDINGS ② 本文件的解构名单。 */
		const GLASS_HOST_REQUIRED = ['React', 'weT', 'SliderRow', 'switchRow', 'swatchRow', 'ctlText', 'sectionHead', 'moduleResetButtonNode', 'renderConfirmRow', 'GLASS_CHILDREN', 'childGlassKey', 'GLASS_COLOR_PRESETS', 'panelGlassPair', 'selection', 'skinYieldActive', 'weClampSurfaceColor', 'glassColorOf', 'sanitizeExtraGlassSelectors', 'GLASS_SATURATE', 'useLegacySaturateCoupling', 'apiUrl', 'registerPanelSection', 'registerLayerHooks', 'registerGlassStatus'];
		for (const key of GLASS_HOST_REQUIRED) {
		  if (!(key in host)) {
		    throw new Error('[wallpaper-engine-glass] 主 bundle 键集缺少 "' + key
		      + '"（ADR-0014 S5.1 / S5.4 显式键集：要么补键，要么改申报表，不许静默 undefined）');
		  }
		}
		const {
		  React, weT, SliderRow, switchRow, swatchRow, ctlText, sectionHead,
		  moduleResetButtonNode, renderConfirmRow,
		  GLASS_CHILDREN, childGlassKey, GLASS_COLOR_PRESETS, panelGlassPair,
		  selection, skinYieldActive, weClampSurfaceColor, glassColorOf,
		  sanitizeExtraGlassSelectors, GLASS_SATURATE, useLegacySaturateCoupling, apiUrl,
		  registerPanelSection, registerLayerHooks, registerGlassStatus,
		} = host;

		/* ===== 唯一的跨包登记：外观页签第三节「玻璃 UI」＋ 首节「主题预设」 ===== */

		// 主包 src/panel-tabs.js 的 renderAppearanceTab 在「细节」之后调 renderAppearanceGlassSection ——
		// 第二刀起那个名字在主包侧是一枚**注册表占位桩**（按 id 从 wePanelSectionsOf('appearance') 取
		// 本描述符的 render），所以屏上位置（主题 → 细节 → 玻璃 UI → 侧栏圆角 → 全局 UI 配色 → 全局字体）
		// **不变**；主包尾部的 registered 续接列表会排除自有内置位的本节（不双重渲染）。
		// 两个硬口径（与 fonts 同款）：
		//   ① `title` 必须是 **getter**：注册发生在 bundle 求值期，那时 i18n 表/`weT` 都还没到位；
		//   ② 不写 `order`：本节的位置由主包的内置桩锚定，不参与注册表排序（fonts 落默认位 100 是
		//      因为它在尾部；本节不同 —— 排序值没人读，写了反而误导）。
		// 注册表为空（本行未装 / 被关）⇒ 主包占位桩返回 null ⇒ 缺的是这一节，不是这一页（D3①/D3③）。
		/* ===== 玻璃样式表注入（ADR-0016 第四刀）===== */

		// 与主包 ensurePluginCss 同款（src/client.js）：求值期把 CSS_GLASS 写进本包自己的
		// <style data-plugin-css> 标签。时序保证层叠正确：loader 先求值主 bundle（它的 sheet 先进
		// head），再求值本 bundle ⇒ 玻璃 sheet 排在后，与搬移前「玻璃配方压令牌映射、回退块压配方」
		// 的相对顺序同构。同 id 旧标签按当前内容刷新（HMR / 重载不叠层）。
		// 玻璃行停用 ⇒ 本 bundle 不被加载 ⇒ sheet 整体消失 + 门控属性无人写 ⇒ 宿主回原生。
		function ensureGlassCss() {
		  if (typeof document === "undefined") return null;
		  const TAG = "dsh-wallpaper-engine/glass";
		  let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG) + "]");
		  if (tag === null) {
		    tag = document.createElement("style");
		    tag.dataset.plugin = "dsh-wallpaper-engine";
		    tag.dataset.pluginCss = TAG;
		    (document.head || document.documentElement).appendChild(tag);
		  }
		  if (tag.textContent !== CSS_GLASS) tag.textContent = CSS_GLASS;
		  return tag;
		}
		ensureGlassCss();

		/* ===== 行状态机（ADR-0016：行级开关「即时生效」，无需重启宿主）===== */

		// 桌面宿主的行开关不触发运行中页面的客户端重载 ⇒ 停用玻璃行后，本 bundle（样式表 + 行为层）
		// 会留在内存里继续生效。宿主半边为此注册了 `glass-row` 状态路由（GET <base>/glass-row-state）：
		// **路由的存在性 = 本行启用**（行停用 ⇒ fiber 被宿主 prune ⇒ 路由 404）。本状态机每 3 秒探测
		// 一次，按结果自行挂载 / 中性化：
		//   停用 ⇒ 撤样式表 + disposeGlassLayer()（门控属性与 --we-* 变量整族摘除）⇒ 宿主回原生，
		//           设置节停渲染、状态投影清空；
		//   重新启用 ⇒ 原样恢复（样式表回注 + sync 重跑）。
		// 探测失败（宿主重启中 / 网络抖动）⇒ 保持现状等下一轮，不许抖动。页面隐藏时暂停轮询。
		let glassRowDisabled = false;
		let glassRowProbeBusy = false;
		let glassRowMisses = 0; // 连续 404 计数（首启窗口：bundle 求值可早于行路由注册）

		/**
		 * 启用态的**现场哨兵**：玻璃样式表 + 四枚恒挂门控（applyGlass 无条件写出的那四枚）。
		 * 任何一枚缺席 = 玻璃被本状态机以外的途径摘过 ⇒ 调和路径要补。
		 *
		 * 与下面 nudge / resync 那批（上游 9ea0d4e6）互补而非重叠：那批修的是「开关切换这次
		 * 动作没走完」（提前提交状态 ⇒ 后续探测早退、永不重试）；这里修的是「**没有任何动作**，
		 * 现场却被外部改掉」（宿主侧文档重建 / 别的 <style> 清理 / 行图重装窗口里的半次拆卸）——
		 * 那种情况下 applyGlassRowState 根本不会被调用，状态位一直是 false、探测一直返回 200。
		 * 实测：带外摘掉 sheet 后连续 45 轮 200 探测无一恢复，右栏与内容面整页裸壁纸，
		 * 只有刷新页面才好（2026-10-30 PR #289 首启报障现场）。
		 */
		function glassRowSceneIntact() {
		  if (typeof document === 'undefined' || !document.body) return true; // 无文档无从谈起：按完好，探测外层自会守
		  // 让路态（skin yield）不是残缺：glass 为了让皮肤上台，会**主动**摘掉下面四枚门控
		  // （packages/glass/src/glass.js 的 skinYieldActive 分支）。此时若照常判“缺门控 ⇒ 要补”，
		  // 3s 调和会反复把门控写回去、和皮肤互相拆台；按“完好”返回，让让路态安静到退场。
		  if (typeof skinYieldActive === 'function' && skinYieldActive()) return true;
		  return !!document.querySelector('style[data-plugin-css="dsh-wallpaper-engine/glass"]')
		    && document.body.hasAttribute('data-we-glass-page')
		    && document.body.hasAttribute('data-we-glass-chat')
		    && document.body.hasAttribute('data-we-glass-window')
		    && document.body.hasAttribute('data-we-glass-floaters');
		}

		/**
		 * 行开关不会重载页面：右栏的模糊由 `[data-we-surface-plate]` 的 backdrop-filter 承载，
		 * 删除 / 回注样式表后 Chromium 可能沿用旧的滤镜纹理（右栏大面最明显，表现为一层
		 * “损坏滤镜”，整页刷新才恢复）。这里对**插件自己的装饰叶**做两帧合成微推（与主包
		 * nudgeWallpaperRepaint 同一手法）：will-change + translateZ 只维持两帧，最终样式不变。
		 *
		 * ⚠️ 绝不能把宿主右栏面板写进这个集合：`weSurfaceGeometry()` 从 target 自身开始检查
		 * 静态 transform / will-change，哪怕两帧的 `translateZ(0)` 也会把 safeRoot 判死；
		 * 更糟的是旧实现每次调用都重新捕获“原值”，多个补同步定时点重叠时会把上一步的
		 * 临时 `translateZ(0)` 当成原值恢复，永久留下内联 transform ⇒ 关插件→开右栏→
		 * 开插件后右栏退回 `--we-panel-color` 纯色，切走再切回仍纯色，只有整页刷新才恢复。
		 * 这里推 `[data-sidebar-right-panel][data-sidebar-right-open]`（宿主可见载体）与
		 * `[data-we-surface-plate]` / `[data-we-surface-root]`（本插件装饰叶），但宿主载体
		 * 只在**合成微推的两帧内**带 `data-we-nudge` 标记；`weSurfaceGeometry()` 只对
		 * “target 自身 + data-we-nudge”豁免静态 transform / will-change，其余祖先一律照旧。
		 * 这样既保留修“损坏滤镜”所需的合成层重建，又不会让微推把 safeRoot 判死。
		 * 单例会话合并重叠调用：原值只捕获一次，最后一次清理统一恢复。
		 */
		let glassNudgeSession = null;
		let glassRightNudgePending = false;
		let glassRightNudgeWatch = null;
		let glassRightNudgeWatchTimer = 0;

		/**
		 * 行开关发生在右栏**关闭**状态时，启用瞬间没有可微推的宿主面板；等用户稍后打开右栏，
		 * 如果不补一次合成层重建，仍可能看到旧滤镜纹理（“关闭又开启、未刷新”的偏色形态）。
		 * 这里用短命 MutationObserver 等第一次可见 open 面板，补一次微推后立刻自拆；3s 探测
		 * 再兜一层底，避免观察器被隐藏页/长会话拖住。
		 */
		function nudgePendingRightPanel() {
		  if (!glassRightNudgePending || glassRowDisabled) return false;
		  try {
		    if (!document.querySelector('[data-sidebar-right-panel][data-sidebar-right-open]')) return false;
		    glassRightNudgePending = false;
		    stopPendingRightNudgeWatch();
		    nudgeGlassPlateLayers();
		    return true;
		  } catch { return false; }
		}

		function stopPendingRightNudgeWatch() {
		  try { if (glassRightNudgeWatch) glassRightNudgeWatch.disconnect(); } catch { /* ignore */ }
		  glassRightNudgeWatch = null;
		  if (glassRightNudgeWatchTimer) { clearTimeout(glassRightNudgeWatchTimer); glassRightNudgeWatchTimer = 0; }
		}

		function watchPendingRightPanel() {
		  if (!glassRightNudgePending || glassRightNudgeWatch || typeof MutationObserver === 'undefined') return;
		  if (nudgePendingRightPanel()) return;
		  try {
		    glassRightNudgeWatch = new MutationObserver(() => { nudgePendingRightPanel(); });
		    glassRightNudgeWatch.observe(document.documentElement, {
		      subtree: true,
		      attributes: true,
		      attributeFilter: ['data-sidebar-right-open', 'hidden'],
		    });
		    // 兜底：15s 后拆观察器；之后若才开右栏，由 3s 探测的 nudgePendingRightPanel 兜。
		    glassRightNudgeWatchTimer = setTimeout(() => {
		      glassRightNudgeWatchTimer = 0;
		      if (glassRightNudgePending) stopPendingRightNudgeWatch();
		    }, 15000);
		  } catch { /* 没有 MutationObserver 时交给探测路径 */ }
		}

		/** 上一轮微推的清理若因页面隐藏 / 帧调度丢失，先按“我们自己的临时形态”还原，绝不把它
		 *  当成宿主原值保存下来（否则宿主面板会永久停留在合成层，玻璃纹理可能持续发花）。 */
		function clearStaleGlassNudge() {
		  try {
		    for (const el of document.querySelectorAll('[data-we-nudge]')) {
		      el.removeAttribute('data-we-nudge');
		      if (el.style.transform === 'translateZ(0)' && el.style.willChange === 'transform') {
		        el.style.removeProperty('transform');
		        el.style.removeProperty('will-change');
		      }
		    }
		  } catch { /* ignore */ }
		}

		function nudgeGlassPlateLayers() {
		  try {
		    if (typeof document === 'undefined' || !document) return;
		    // 先把旧实例/旧轮次留下的孤儿装饰根收掉，避免一次微推把 9 层 plate 一起推成
		    // “饱和度/对比度爆表”；prune 是幂等的。
		    if (typeof pruneGlassSurfaces === 'function') pruneGlassSurfaces();
		    const nodes = document.querySelectorAll(
		      '[data-sidebar-right-panel][data-sidebar-right-open], [data-we-surface-plate], [data-we-surface-root]');
		    if (!nodes.length) return;
		    if (glassNudgeSession === null) {
		      clearStaleGlassNudge();
		      glassNudgeSession = { before: new Map(), token: 0 };
		    }
		    const session = glassNudgeSession;
		    for (const el of nodes) {
		      if (!session.before.has(el)) {
		        session.before.set(el, {
		          transform: el.style.transform,
		          willChange: el.style.willChange,
		          nudge: el.hasAttribute('data-we-nudge'),
		        });
		      }
		      el.setAttribute('data-we-nudge', 'on');
		      el.style.setProperty('will-change', 'transform');
		      el.style.setProperty('transform', 'translateZ(0)');
		    }
		    try { void document.body.getBoundingClientRect(); } catch { /* ignore */ }
		    const token = ++session.token;
		    let fallback = 0;
		    const clear = () => {
		      if (glassNudgeSession !== session || session.token !== token) return;
		      if (fallback) clearTimeout(fallback);
		      glassNudgeSession = null;
		      for (const [el, prev] of session.before) {
		        try {
		          if (prev.willChange) el.style.setProperty('will-change', prev.willChange);
		          else el.style.removeProperty('will-change');
		          if (prev.transform) el.style.setProperty('transform', prev.transform);
		          else el.style.removeProperty('transform');
		          if (!prev.nudge) el.removeAttribute('data-we-nudge');
		        } catch { /* ignore */ }
		      }
		    };
		    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(clear));
		    // 双 rAF 在标签页隐藏/节流时可能迟迟不跑；兜底超时保证合成提示不会常驻。
		    fallback = setTimeout(clear, 160);
		  } catch { /* 合成微推失败不影响开关本身 */ }
		}

		let glassSurfaceResyncToken = 0;

		/**
		 * 行开关不重载页面：右栏可能在停用期间被打开/重排，回注样式时表面管理器量到的
		 * 面板集合/几何可能还停在原生布局。启用后按几个时间点再对齐表面（幂等），
		 * 保证“关插件→开右栏→开插件”这类顺序也能把右栏认领回玻璃面。
		 */
		function resyncGlassSurfacesAfterRowToggle() {
		  const token = ++glassSurfaceResyncToken;
		  for (const ms of [0, 120, 320, 700]) {
		    setTimeout(() => {
		      if (token !== glassSurfaceResyncToken || glassRowDisabled) return;
		      try {
		        if (typeof syncGlassSurfaces === 'function') syncGlassSurfaces(selection);
		        nudgeGlassPlateLayers();
		        nudgePendingRightPanel();
		      } catch { /* 下一时间点/下一轮探测重试 */ }
		    }, ms);
		  }
		}

		function applyGlassRowState(disabled) {
		  if (disabled === glassRowDisabled) {
		    if (disabled) return; // 已是停用态：不重复撤（dispose 幂等，但没必要跑）
		    // ── 启用态的调和（reconcile）─────────────────────────────────────────────
		    // 状态位是 false ≠ 现场完好：样式表 / 门控可能被**本状态机以外**的途径摘走
		    // （宿主侧文档重建 / 行图重装窗口里的半次拆卸 / 任何未知来源的 <style> 清理）。
		    // PR #289 前玻璃 CSS 住主包 sheet（每次重挂 ensurePluginCss 都会重注 + 代际清理）
		    // ⇒ 出户后本状态机是玻璃在页面里**唯一的管家**，只认"状态位没变"会把任何一次
		    // 带外残缺变成**本页面余生的永久破损**（真机取证见 glassRowSceneIntact 的注释）。
		    // 200 = 行活着的权威信号 ⇒ 就地核实、缺哪补哪；健康态这条路径**零写入**
		    // （一个 querySelector + 四个 hasAttribute）。
		    if (glassRowSceneIntact()) return;
		    try {
		      ensureGlassCss();
		      applyGlassLayer();
		      if (typeof syncGlassSurfaces === 'function') syncGlassSurfaces(selection);
		    } catch { /* 调和失败不外抛：下一轮探测再对时。 */ }
		    return;
		  }
		  // ⚠️ 不要提前写状态：一旦 apply/dispose 中途抛错（宿主右栏正在重排、表面管理器
		  // 拿不到几何等），下面的 catch 会把错误吞掉；提前写状态会让后续 3s 探测直接
		  // early-return、永不重试 —— 表现就是“开关后右栏一层坏滤镜，刷新才恢复”。
		  // 成功走完再提交状态，失败保持原状态，下一轮探测会重新执行整段。
		  try {
		    if (disabled) {
		      // 撤样式表 + 跑行为层的 dispose（门控属性 / --we-* 变量 / 额外补雾化标签成对收走）
		      // ⇒ 宿主立即回到原生外观；sync 在停用期间是空操作，不会再写任何东西。
		      glassRightNudgePending = false;
		      stopPendingRightNudgeWatch();
		      const tag = document.querySelector('style[data-plugin-css="dsh-wallpaper-engine/glass"]');
		      glassSurfaceResyncToken += 1;
		      if (tag) tag.remove();
		      disposeGlassLayer();
		      try { if (typeof disposeGlassSurfaces === 'function') disposeGlassSurfaces(); } catch { /* 已由 disposeGlassLayer 兜底 */ }
		      nudgeGlassPlateLayers();
		      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
		        if (glassRowDisabled) nudgeGlassPlateLayers();
		      });
		    } else {
		      // 行开关不重载页面：启用前强制丢弃上一轮表面状态（可能残留旧装饰根/标记，
		      // 或右栏是在停用期间才挂载的），再从干净状态重建一次。
		      try { if (typeof disposeGlassSurfaces === 'function') disposeGlassSurfaces(); } catch { /* ignore */ }
		      ensureGlassCss();
		      applyGlassLayer();
		      glassRightNudgePending = true;
		      nudgeGlassPlateLayers();
		      nudgePendingRightPanel();
		      watchPendingRightPanel();
		      resyncGlassSurfacesAfterRowToggle();
		      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => {
		        if (glassRowDisabled) return;
		        try { applyGlassLayer(); nudgeGlassPlateLayers(); nudgePendingRightPanel(); } catch { /* 下一轮探测仍会重试 */ }
		      });
		    }
		    glassRowDisabled = disabled;
		  } catch { /* 状态切换失败不抛出轮询外层：状态未提交，下一轮探测会重跑。 */ }
		}

		async function probeGlassRowState() {
		  if (glassRowProbeBusy || typeof document === 'undefined') return;
		  if (document.visibilityState === 'hidden') return; // 页面不可见时暂停轮询
		  // 每轮探测都 prune 一次：HMR / 行重挂后的旧模块实例可能绕过本实例的清理路径，
		  // 只留下自己的装饰根；多层同几何 plate 的 backdrop-filter 会叠加成偏色。
		  try { if (typeof pruneGlassSurfaces === 'function') pruneGlassSurfaces(); } catch { /* 下一轮重试 */ }
		  glassRowProbeBusy = true;
		  try {
		    const res = await fetch(apiUrl('/glass-row-state'), { cache: 'no-store', signal: AbortSignal.timeout(2500) });
		    if (res.status === 200) {
		      let enabled = true;
		      try { enabled = (await res.json()).enabled === true; } catch { /* 应答体异常按启用处理 */ }
		      glassRowMisses = 0;
		      applyGlassRowState(!enabled);
		      // 行开关不重载页面：若右栏是在停用期间才打开的，表面管理器可能还没收到
		      // 对应 mutation（或首个几何不成立）。每轮探测对“可见但未认领”的右栏补一次
		      // 对齐，避免用户必须刷新页面才能看到玻璃。
		      if (!glassRowDisabled) {
		        try {
		          const right = document.querySelector('[data-sidebar-right-panel][data-sidebar-right-open]');
		          // marker 在但装饰根/plate 不在 ⇒ 别的实例把根 prune 掉了，必须重新 sync
		          // 让当前实例重建（refresh 会作废指向断开节点的 plate）。
		          const missingLayers = !document.querySelector('[data-we-surface-root]')
		            || !document.querySelector('[data-we-surface-plate="right-sidebar"]');
		          if (right && (!right.hasAttribute('data-we-surface-runtime') || missingLayers)
		              && typeof syncGlassSurfaces === 'function') syncGlassSurfaces(selection);
		          nudgePendingRightPanel();
		        } catch { /* 下一轮探测重试 */ }
		      }
		    } else if (res.status === 404) {
		      // 首启竞态（PR #289 报障的另一条腿）：bundle 求值可能早于宿主行路由注册 ——
		      // 路由要等行 fiber 激活才存在，而页面/求值不等它。单次 404 不判停用，
		      // 连续两轮（≥3s）仍 404 才认停用 ⇒ 行真被 prune 时停用语义照常到达，
		      // 注册晚一拍的启动窗口不再造成"先撤光玻璃、3 秒后又整页弹回"的闪烁。
		      if (++glassRowMisses >= 2) applyGlassRowState(true);
		    } else {
		      // 非 404 的应答（5xx = 宿主重启中 / 其它异常）必须打断“连续”语义：
		      // 404 → 5xx → 404 不是连续两次 404，不能据此判停用（#312 评审②）。
		      glassRowMisses = 0;
		    }
		  } catch { glassRowMisses = 0; /* 本轮拿不到应答，同样不算连续 404；观感保持现状。 */ }
		  finally { glassRowProbeBusy = false; }
		}
		/**
		 * 探测 / 轮询 / 首帧补建的安装点。**必须在三处跨包登记之后调用**（见文件末尾）。
		 * 整包「关闭 → 再开启」时宿主可能直接重新求值本 bundle；若先装轮询再登记，重求值会
		 * 先撞主包的面板节重复注册守卫（src/extension-registry.js:139，“同一份 bundle 求值两次”）
		 * 抛错，而多出来的 3s 探测与 visibilitychange 监听已经装上了 ⇒ 每重求值一次就多一路轮询。
		 * 先登记后安装：抛错发生在安装之前，页面按原样保留本实例，定时器/监听不重复；
		 * globalThis 哨兵再兜一层（万一两次求值都走完登记，也只保留一路）。
		 * 哨兵与既有惯例一致：挂在 globalThis 上、带 try/catch（见 src/live-layer/pointer.js 的
		 * __weFrameBytes、src/client.js 的 __weComponentVisible）。
		 */
		function startGlassRowPolling() {
		  try {
		    const g = typeof globalThis === 'object' && globalThis ? globalThis : null;
		    if (g) {
		      if (g.__weGlassRowPollingStarted) return;
		      g.__weGlassRowPollingStarted = true;
		    }
		  } catch { /* 取不到 globalThis 时退回普通安装 */ }
		  probeGlassRowState();
		  setInterval(probeGlassRowState, 3000);
		  // 整包「关闭 → 再开启」时宿主可能直接重新求值本 bundle（不一定走 applyGlassRowState
		  // 的 disabled→enabled 分支）；首帧补一次与行开关同款的合成层重建，覆盖这条路径。
		  if (typeof requestAnimationFrame === 'function') {
		    requestAnimationFrame(() => {
		      if (glassRowDisabled || typeof document === 'undefined') return;
		      try {
		        glassRightNudgePending = true;
		        nudgeGlassPlateLayers();
		        nudgePendingRightPanel();
		        watchPendingRightPanel();
		      } catch { /* ignore */ }
		    });
		  }
		  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
		    document.addEventListener('visibilitychange', () => {
		      if (document.visibilityState === 'visible') probeGlassRowState();
		    });
		  }
		}

		registerPanelSection('appearance', 'glass', {
		  id: 'glass',
		  get title() { return weT("玻璃 UI"); },
		  render: (ctx) => (glassRowDisabled ? null : renderAppearanceGlassSection(ctx)),
		});

		/* ===== 跨包登记 #2：玻璃行为层（ADR-0016 第三刀）===== */

		// 与别的子包的层钩子同形（registerLayerHooks 那一行）：sync 挂进
		// 主包的 emit 订阅链（每次设置变动重跑，现读 selection 活绑定）、dispose 交主包拆卸期。
		// applyGlassLayer / disposeGlassLayer 在本包 client.build.json 的 inline[] glass-layer.js 里
		// （同工厂作用域，裸名可达）。sync 幂等：全量按当前 selection 重写，迟到注册由主包
		// attacher 立刻补接 + emit 一次（见 src/client.js 的 weSetLayerAttacher）。
		registerLayerHooks('glass', {
		  // 行停用期间空操作（状态机已 dispose）。启用态每次 emit 先核一遍样式表：sheet 被
		  // 带外摘走时，用户下一次任何设置变动都立刻补回，不必等行状态轮询的 3 秒节拍
		  // （ensureGlassCss 幂等：同 id 且同内容 ⇒ 零写入）。
		  sync: () => { if (!glassRowDisabled) { ensureGlassCss(); applyGlassLayer(); } },
		  dispose: disposeGlassLayer,
		});

		/* ===== 跨包登记 #3：表面策略状态投影（回传主包）===== */

		// 外观 ctx 的 surfaceStatus 组装点在主包（renderActiveTab），而 weGlassSurfaceStatus 的真实现
		// 在本包 glass-surfaces.js ⇒ 与别的子包同款的反向通道：求值期把只读投影
		// 送回主包槽位（缺席 = 空列表，缺的是状态不是页面）。迟到登记的兜底：本包同一次求值里的
		// registerLayerHooks 已触发注册表 listener ⇒ 主包 emit() 重画，状态自然补上。
		registerGlassStatus({ status: () => (glassRowDisabled ? [] : weGlassSurfaceStatus()) });

		/* ===== 行状态机安装点：三处跨包登记都成功之后才装探测/轮询 ===== */

		// 顺序即语义：本文件上面的 registerPanelSection / registerLayerHooks / registerGlassStatus
		// 在「同一份 bundle 被求值两次」时会由主包注册表抛错（src/extension-registry.js:139/:194）。
		// 抛错时旧实例仍继续服务（视觉最终一致），且这次求值没有装上任何定时器/监听 ⇒ 不泄漏。
		startGlassRowPolling();
		if (typeof exports.apply !== "function") exports.apply = () => undefined;
		if (!Array.isArray(exports.inject)) exports.inject = [];
		return module.exports;
	},
});
