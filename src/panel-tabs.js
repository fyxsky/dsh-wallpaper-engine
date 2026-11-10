/**
 * panel-tabs.js — 面板页签的**渲染器**（五个域：壁纸 / 外观 / 声音 / 效果 / 高级，组合成
 * 四页签 壁纸库 / 外观 / 播放 / 系统，装配点见 src/client.js 的 renderActiveTab）。
 *
 * 为什么单独一个文件：这些渲染器**读**面板状态、**调**面板处理器，但自己不持有状态 ——
 * 正是最适合独立出去的一层。这样面板组件体只剩"状态 + 处理器 + 装配"，页签怎么画看这里。
 *
 * 契约（构建期由 scripts/build-client.mjs 内联进 bundle 的工厂作用域，"外部作用域"=
 * 同一 prelude / src/client.js 的顶层）：
 *   · 每个渲染器**只从一个参数取外界**：`(ctx)`。函数体**逐字搬入**，唯一改动是开头那段
 *     解构 —— 于是"这个页签要什么"写在签名处，"怎么画"一行没动（模板字符串里的有效空白
 *     也不会被批量重排弄坏）。
 *   · ctx 由 `WallpaperPicker` 在调用点就地组装（见 src/client.js 的 `renderActiveTab`）：
 *     面板的 `sel` / 页签需要的局部视图状态 / 处理器。**多传字段无害，漏传会当场
 *     ReferenceError**（守卫会抓住）—— 这是刻意选的失败方式：响亮且可定位。
 *   · 页签**只做"读 + 组装 React 树"**，四类越界由 `test/verify-client.mjs` 的接缝判据钉住
 *     （与 `src/picker-modal.js` / `src/picker-props-panel.js` **同一条口径**）：
 *       ① 不得引用 `selection`（写入经 ctx 的 `setSetting` / `setTransient` 两个入口）；
 *       ② 不得调 `emit(`（通知归处理器）；
 *       ③ 不得改写 **ctx 别名**指向的东西（`editing` = `selection.editing`、`sel` = store 快照…）
 *          —— `editing.name = …` 是"渲染器成了状态的写入方"，那不是读；
 *       ④ 不得改写**模块级状态**（`propsPanelOpen` / `pickerFocusPending` / `pickerOpener` …）。
 *     ③④ 两类**不是风格问题**：它们不含 `selection.` 字面量，因此躲得过"只数字面量"的判据 ——
 *     那正是本文件长期违规却一直没变红的原因（同一批搬出去的另外两个渲染器早就在严口径下）。
 *   · **动作经具名处理器**：除写设置外还要做别的事（重建层 / 清失败记忆 / 重绘 / 刷库存…）
 *     一律收口成 `src/client.js` 里的 `on*` 处理器，经 ctx 传进来；页签只写 `onClick: onFoo`。
 *     于是"点了会发生什么"住在处理器里，页签只回答"画什么"。
 *   · 模块级依赖（React / SliderRow / switchRow / ctlText / FRAME_VARIANTS / 各类预设表 /
 *     纯函数如 `weT` / `adapterCaps` / `liveRenderEnabled`…）仍按内联规则直接读，不经过 ctx
 *     —— 它们是常量与纯组件/纯函数，与面板状态无关。**判据只盯状态与动作，不盯这些。**
 *   · 本文件必须保持浏览器安全（无 import / require / Node API），且**不得有顶层可执行语句**
 *     读 client.js 的 const（会被内联到 bundle 顶部，撞 TDZ）。
 *
 * 域模块的**节渲染器**按域住在同族兄弟模块（构建期内联在本文件之前，见 scripts/build-client.mjs 的
 * INLINE_MODULES）：src/panel-tabs/appearance.js / -effects.js / -advanced.js；壁纸库的 4 节 +
 * 播放 2 节渲染器随子包走（packages/media-bridge/src/*），经面板节注册表挂回来。本文件只留五个
 * render*Tab 与两个重置构件（守卫与 src/client.js 的调用点都按名字取它们，导出名必须在**本文件**
 * 里有绑定）。主包内搬出的 render*Section 等仍是同一工厂作用域的自由名字（打包后同作用域；按文件
 * import 的台架按既有口径挂全局）；**子包**的渲染器（`packages/fonts` 的字体节、
 * `packages/media-bridge` 的 4+2 节）不在这条作用域里 —— 它们经面板节注册表挂回来。
 * **接缝四类越界的判据扫的是全族并集**（test/verify-client.mjs 的 RENDERERS 表 +
 * test/tools/src-scope.mjs 的 panelText()），搬出去不等于搬出判据。
 */

  // 这一层只**按顺序组装**各节（"有哪几节、什么顺序"一眼可读；
  // 判据按真渲染的节序列钉住，见 verify-scene-live 的节顺序一节）。
  // 首行空解构是**契约**（test/verify-scene-live.mjs 的『每个页签首行都从 ctx 解构』）：
  // 本页签只把 ctx **转交**给各节、自己不读字段 —— 所以那不是无操作声明，是"要什么写在签名处"。
  // ── 「在线图库」页签（本 fork 新增）────────────────────────────────────────
  // 契约与本文件其余 render*Tab 一致：只读 ctx、动作全走 on*、浏览器安全、无顶层可执行语句。
  // 数据面：gallery.items（接口拉回来的条目）+ gallery.sel（已选 url 数组）+ gallery.busy/error/note/result。
  function renderGalleryTab(ctx) {
    const { sel, gallery } = ctx;
    const g = gallery || {};
    const items = Array.isArray(g.items) ? g.items : [];
    const picked = new Set(Array.isArray(g.sel) ? g.sel : []);
    const busy = g.busy === true;
    const row = (children, key) => React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap", key }, children);
    const label = (text) => React.createElement("span", { className: "we-picker__hint we-picker__label" }, text);
    const presets = Array.isArray(ctx.galleryPresets) ? ctx.galleryPresets : [];
    const presetRow = presets.length === 0 ? null : row([
      label(weT("预设")),
      React.createElement("select", {
        className: "we-picker__select",
        value: "",
        onChange: (e) => { if (e.target.value) ctx.onGalleryPreset(e.target.value); },
      },
        React.createElement("option", { value: "" }, weT("选一个预设…（默认二次元）")),
        presets.map((p) => React.createElement("option", { key: p.id, value: p.id }, p.label)),
      ),
    ], "g-preset");
    const head = React.createElement(React.Fragment, null,
      presetRow,
      React.createElement("div", { className: "we-picker__hint" }, weT("填一个图库接口地址（Picsum / Bing 每日 / 自建图床都行），拉回来的图可以勾选后下载到「自定义壁纸」目录")),
      row([
        React.createElement("input", {
          className: "we-picker__text", type: "text", spellCheck: false,
          placeholder: "https://picsum.photos/v2/list?page=1&limit=30",
          value: sel.galleryEndpoint || "", onInput: ctx.onGalleryEndpoint,
        }),
        React.createElement("button", { className: "we-picker__btn", type: "button", disabled: busy, onClick: ctx.onGalleryProbe }, weT("测试")),
        React.createElement("button", { className: "we-picker__btn", type: "button", disabled: busy || !(sel.galleryEndpoint || "").trim(), onClick: ctx.onGalleryFetch }, busy ? weT("拉取中…") : weT("拉取")),
      ], "g-url"),
      row([
        label(weT("取图路径")),
        React.createElement("input", {
          className: "we-picker__text", type: "text", spellCheck: false,
          placeholder: weT("留空自动识别，例如 images[].url"),
          value: sel.galleryJsonPath || "", onInput: ctx.onGalleryJsonPath,
        }),
      ], "g-path"),
      row([
        label(weT("下载后压缩")),
        React.createElement("select", {
          className: "we-picker__select", value: sel.galleryCompress || "lossless",
          onChange: (e) => ctx.onGalleryCompress(e.target.value),
        },
          React.createElement("option", { value: "lossless" }, weT("无损（PNG 重编码 / 其余只去元数据）")),
          React.createElement("option", { value: "off" }, weT("不压缩")),
        ),
        React.createElement("label", { className: "we-picker__hint" },
          React.createElement("input", { type: "checkbox", checked: sel.galleryAllowPrivate === true, onChange: (e) => ctx.onGalleryAllowPrivate(e.target.checked) }),
          weT(" 允许内网/本机地址"),
        ),
      ], "g-compress"),
      g.note ? React.createElement("div", { className: "we-picker__hint" }, g.note) : null,
      g.error ? React.createElement("div", { className: "we-picker__hint" }, weT("出错：") + g.error) : null,
    );
    const grid = items.length === 0 ? null : React.createElement("div", { className: "we-picker__preset-grid" },
      items.map((it, i) => React.createElement("div", { className: "we-picker__preset-cell", key: it.url + i },
        React.createElement("label", { className: "we-picker__hint", title: it.title || it.url },
          React.createElement("input", { type: "checkbox", checked: picked.has(it.url), onChange: () => ctx.onGalleryToggle(it.url) }),
          React.createElement("img", {
            src: ctx.galleryThumbUrl(it.url), alt: "", loading: "lazy", decoding: "async",
            style: { width: "100%", height: "84px", objectFit: "cover", borderRadius: "6px", display: "block" },
          }),
        ),
      )),
    );
    const actions = items.length === 0 ? null : row([
      React.createElement("button", { className: "we-picker__btn", type: "button", onClick: () => ctx.onGallerySelectAll(true) }, weT("全选")),
      React.createElement("button", { className: "we-picker__btn", type: "button", onClick: () => ctx.onGallerySelectAll(false) }, weT("清空选择")),
      React.createElement("button", { className: "we-picker__btn", type: "button", disabled: busy || picked.size === 0, onClick: ctx.onGalleryDownload },
        busy ? weT("下载中…") : weT("下载选中") + " (" + picked.size + ")"),
    ], "g-actions");
    const result = g.result ? React.createElement("div", { className: "we-picker__hint" },
      weT("已保存 {saved} 张，跳过 {skipped} 张", { saved: g.result.saved, skipped: g.result.skipped }) + (g.result.failed && g.result.failed.length ? weT("，失败 {n} 张", { n: g.result.failed.length }) : "") +
      (g.result.bytesBefore ? " · " + weT("体积") + " " + Math.round(g.result.bytesBefore / 1024) + "KB → " + Math.round(g.result.bytesAfter / 1024) + "KB" : ""),
    ) : null;
    return React.createElement(React.Fragment, null, head, grid, actions, result);
  }

  function renderWallpaperTab(ctx) {
    const { } = ctx;
    // 四节（current / 切换过场 / 自动轮播 / 自定义壁纸）在 P-D S3a–S3c 起全部搬进
    // packages/media-bridge 的浏览器半边 ⇒ 本页签**只画注册节**，屏上顺序全由描述符的
    // order 决定（current=10 / transition=20 / rotation=30 / uploads=40；顺序判据见
    // verify-scene-live 的节顺序一节），**不**靠求值顺序。
    // ⚠️ 注册表为空 = 该子包没装 / 被关：本页签为空，**不**崩、不整页消失
    //    （D3①/D3③ 在这条通道上的形态：缺的是这几节，不是这一页）。
    const registered = wePanelSectionsOf("library").map((section) => (
      React.createElement(React.Fragment, { key: section.id }, section.render(ctx))
    ));
    return React.createElement(React.Fragment, null, registered);
  }


  // 这一层只**按顺序组装**各节（"有哪几节、什么顺序"一眼可读；
  // 判据按真渲染的节序列钉住，见 verify-scene-live 的节顺序一节）。
  // ⚠️ 这个顺序是**两个界面共用的**（侧边栏的 `qpRenderAppearancePane` 调的也是本函数）
  //    ⇒ 改这里等于同时改设置页与侧边栏 —— 这正是用户口径要的"两边同序"。
  // 用户口径：主题 → 细节 → 玻璃 UI → 侧边栏圆角 → 全局 UI 配色 → 全局字体。
  // 与上一版的差别只有一处：**「玻璃 UI」与「侧边栏圆角」对调**（前者上移到细节之后）。
  // 首行的空解构是**契约**（test/verify-scene-live.mjs 的『每个页签首行都从 ctx 解构』）：
  // 本页签只把 ctx 转交给各节、自己不读字段 —— 所以那不是无操作声明，是"要什么写在签名处"。
  function renderAppearanceTab(ctx) {
    const { } = ctx;
    // 尾部续接的注册节（fonts 落默认位 100 在最后）。⚠️ glass 不在这条通道上：它有**内置位**
    // （第三节，由下面的 renderAppearanceGlassSection 占位桩锚定）⇒ 排除，否则一节画两遍
    // （ADR-0016 第二刀：渲染器住 packages/glass，按 id 从注册表取）。
    const registered = wePanelSectionsOf("appearance")
      .filter((section) => section.id !== "glass")
      .map((section) => (
        React.createElement(React.Fragment, { key: section.id }, section.render(ctx))
      ));
    return React.createElement(React.Fragment, null,
      renderAppearanceThemeSection(ctx),
      renderAppearanceDetailSection(ctx),
      renderAppearanceGlassSection(ctx),
      renderAppearanceSidebarCornersSection(ctx),
      // 「全局 UI 配色」在「全局字体」**上面**（用户口径：「变成全局UI配色放在全局字体上面」）；
      // 原「输入光标」节已撤销，其唯一一行（光标颜色）并入本节（见该渲染器的 ③）。
      renderAppearanceUiColorSection(ctx),
      registered,
    );
  }

  // 「主题预设」+「玻璃 UI」节的**注册表占位桩**（ADR-0016 第二刀）：真渲染器住 packages/glass
  // （它把自己的 render 登记进 src/extension-registry.js 的面板节注册表）。这里按 id 取出来、
  // 在内置位（第三节）上调它 —— 屏上顺序与搬迁前逐字一致，两种档面（设置页 / 侧栏）同一条路。
  // 注册表里没有 = 该子包没装 / 行被关 ⇒ 返回 null（React 对 null 子节点零渲染）⇒
  // **缺的是这一节，不是这一页**（D3①/D3③；fonts 那条尾部通道同款语义）。
  // 迟到注册（子包产物在面板首画之后才求值）由注册表的 wePanelSectionFire 重画兜底。
  function renderAppearanceGlassSection(ctx) {
    const section = wePanelSectionsOf("appearance").find((s) => s.id === "glass");
    return section ? section.render(ctx) : null;
  }


  // 模块级 ↺ 的**薄包装**（issue #192）：真实现住在 `src/module-reset.js`（panel-tabs 与
  // glass-panel 共用，抽出来才能让挂载台 import 真实现）。这里只把"取词 + 处理器"两样外界
  // 喂给它 —— 中文因此留在本文件的 `weT(...)` 里（i18n 扫描器认这个形态；写进被调模块会
  // 被判成"裸中文"），各节调用点则保持 `moduleResetButton("模块名", onResetModule)` 这么短。
  // ⚠️ 必须是**本文件的模块级（工厂作用域）声明**，不能留在 `renderAppearanceTab` 体内：
  //    四个域模块（src/panel-tabs/*.js）按域搬出后仍按这个名字引用它 —— 打包后同一工厂
  //    作用域没问题，但按文件 import 的守卫台架（verify-fontset / verify-scene-live 的
  //    侧栏档）只有把真实现挂到全局才找得到。
  function moduleResetButton(moduleName, onResetModule) {
    return moduleResetButtonNode(moduleName, onResetModule, {
      title: weT("把这一块的参数恢复为默认值（不需要确认）"),
      aria: weT("重置本模块"),
    });
  }

  function renderAudioTab(ctx) {
    const { onToggleAudio, onVideoVolume, sel } = ctx;
    // 声音：壁纸音轨（视频 / 场景内嵌 MP4 / 场景包内音频共用一套设置）。
    // 系统音频反应 / 媒体信息两键**恒为常开**（schema kind 'const'）：
    // 面板不提供页面定义，运行时两侧一律按默认接入读值。
    return React.createElement(React.Fragment, null,
      React.createElement("div", { className: "we-picker__section" },
        React.createElement("div", { className: "we-picker__section-head" },
          React.createElement("span", { className: "we-picker__section-label" }, weT("声音")),
        ),
        SliderRow(weT("音量"), 0, 100, 5,
          Math.round((Number(sel.videoVolume) || 0) * 100), onVideoVolume, "%"),
        switchRow(weT("壁纸音轨"), sel.videoAudioEnabled !== false, () => onToggleAudio(), {
          hint: weT("关闭=静音（保留音量数值）· 开启时音量 0 自动 50%"),
          tooltip: weT("视频壁纸与场景壁纸（内嵌 MP4 音轨 / 包内独立音频）共用；默认静音，开启时若音量为 0 会自动提到 50%"),
        }),
      ),
    );
  }


  // 这一层保留"空态提前返回 + 唯一的节外壳"，把**节里的内容**按块分给子渲染器；
  // "有哪几块、什么顺序"一眼可读（细锚按真渲染的**控件标签有序序列**钉住，见 verify-scene-live）。
  function renderEffectsTab(ctx) {
    const { sel, setPickerOpener, onOpenPicker, onPickWallpaper, surface } = ctx;
    const sidebarSurface = surface === "sidebar";
    if (!sel.id) {
      return React.createElement("div", { className: "we-picker__empty" },
        React.createElement("span", { className: "we-picker__empty-title" }, weT("还没有启用壁纸")),
        React.createElement("span", { className: "we-picker__hint" },
          weT("选择一款壁纸后，可在这里调整模糊、亮度、适配、倍速等效果")),
        React.createElement("button", {
          className: "we-picker__btn we-picker__btn--primary", type: "button",
          ref: sidebarSurface ? undefined : setPickerOpener,
          onClick: sidebarSurface ? onPickWallpaper : onOpenPicker,
        }, sidebarSurface ? weT("去挑一张 ›") : weT("选择壁纸")),
      );
    }
    // P-D S3d：播放配置两节（倍速/帧率上限 order 60、适配/翻转 order 70）已搬进壁纸子包的
    // 浏览器半边 ⇒ 组装点只按注册表续接（`wePanelSectionsOf('playback')`，与 library 页签同款）。
    // 注册表为空 ⇒ 只是少这两节，整页签照旧渲染（与 library 的降级口径一致）。
    const registered = wePanelSectionsOf("playback").map((section) => (
      React.createElement(React.Fragment, { key: section.id }, section.render(ctx))
    ));
    return React.createElement(React.Fragment, null,
      React.createElement("div", { className: "we-picker__section" },
        React.createElement("div", { className: "we-picker__section-head" },
          React.createElement("span", { className: "we-picker__section-label" }, weT("画面")),
        ),
        renderEffectsSlidersSection(ctx),
        renderEffectsLiveSection(ctx),
        renderEffectsSourceSection(ctx),
        registered,
      ),
    );
  }

  // 这一层只**按顺序组装**各节 —— 于是"这个页签有哪几节、什么顺序"
  // 一眼可读（判据按真渲染的节序列钉住，见 verify-scene-live 的节顺序一节）。
  // 首行的空解构是**契约**（test/verify-scene-live.mjs 的『每个页签首行都从 ctx 解构』）：
  // 本页签只把 ctx 转交给各节、自己不读字段 —— 所以那不是无操作声明。
  function renderAdvancedTab(ctx) {
    const { } = ctx;
    return React.createElement(React.Fragment, null,
      renderAdvancedBrowsingSection(ctx),
      renderAdvancedCompatSection(ctx),
      renderAdvancedAdapterSection(ctx),
      renderAdvancedPowerSection(ctx),
      renderAdvancedCacheSection(ctx),
      renderAdvancedDiagSection(ctx),
    );
  }
  // ── 页签级重置（issue #192 用户口径：「每个选项卡后面加重置，重置指定选项卡」）──────────
  // 压在**每个页签内容的最末尾**，由 client.js 的渲染点在 renderActiveTab() 之后统一挂 ——
  // 六处渲染器各挂一遍必然漏一个，挂一处才是结构性的。
  // 走两步确认：整页设置量不小（外观页就有 60 个键）且不可撤销 ⇒ 与模块级 ↺ 分档
  //（那是单模块、用户口径明确"无需确认"）。令牌按页签区分，因为 `armedConfirm` 是单值。
  function renderTabReset(ctx, tabId) {
    const { armedConfirm, onArmConfirm, onDisarmConfirm, onResetTab } = ctx;
    const token = "tab:" + tabId;
    // ⚠️ 刻意**不用** `we-picker__section-label`：那是"设置分组卡"的类名，而本节的判据口径
    //（既有守卫按"末三张分组卡"取窗口）会被这一节顶掉 —— 3D 效果那一页就有三张分组卡，
    // 重置节排在它后面会挤走「背景」。它是**操作区**不是分组卡，用独立类名在语义上也更准。
    const cls = "we-picker__section-reset-label";
    return React.createElement("div", { className: "we-picker__section" },
      React.createElement("div", { className: "we-picker__section-head" },
        React.createElement("span", { className: cls }, weT("重置本页")),
      ),
      React.createElement("span", { className: "we-picker__hint" },
        weT("把这一页的设置恢复为默认值；其他页签与导入的图片不受影响。")),
      React.createElement("div", { className: "we-picker__row" },
        React.createElement("button", {
          className: "we-picker__btn",
          type: "button",
          disabled: armedConfirm === token,
          onClick: () => onArmConfirm(token),
        }, weT("重置本页")),
      ),
      renderConfirmRow(armedConfirm, token,
        weT("确定要把这一页的设置恢复为默认吗？此操作不可撤销。"),
        () => onResetTab(tabId), onDisarmConfirm),
    );
  }

  // ── 全局重置节（issue #192，压在「系统」页签末尾）──────────────────────────────
  // 三档里的最高一档：**模块 < 页签 < 全局**。全局必须二次确认（不可撤销）。
  // 二次确认复用 client.js 既有的 `armConfirm` / `renderConfirmRow` 两步构件 ——
  // `selection.armedConfirm` 是单值 ⇒ 结构上同一时刻只有一个动作待确认。
  // ⚠️ 只重置**设置值**：导入的字体集住自己的目录，删不删是另一件事
  //（文案必须把这一点说清，否则用户会以为"重置"连图一起删了）。
  function renderResetSection(ctx) {
    const { armedConfirm, onArmConfirm, onDisarmConfirm, onResetAll } = ctx;
    const token = "resetAll";
    return React.createElement("div", { className: "we-picker__section" },
      React.createElement("div", { className: "we-picker__section-head" },
        // 同 renderTabReset：操作区不用「设置分组卡」那个类名（它会被"末三张分组卡"那类
        // 位置口径的判据看见，挤掉真正的分组卡）。
        React.createElement("span", { className: "we-picker__section-reset-label" }, weT("重置")),
      ),
      React.createElement("span", { className: "we-picker__hint" },
        weT("把全部设置恢复为出厂默认值；导入的字体集不受影响。此操作不可撤销。")),
      React.createElement("div", { className: "we-picker__row" },
        React.createElement("button", {
          className: "we-picker__btn we-picker__btn--danger",
          type: "button",
          disabled: armedConfirm === token,
          onClick: () => onArmConfirm(token),
        }, weT("全部重置")),
      ),
      renderConfirmRow(armedConfirm, token,
        weT("确定要将所有设置恢复为默认吗？此操作不可撤销。"),
        onResetAll, onDisarmConfirm),
    );
  }

export {
  renderWallpaperTab, renderAppearanceTab, renderAudioTab, renderEffectsTab, renderAdvancedTab,
  renderResetSection, renderTabReset,
  // 模块级 ↺ 的薄包装：域模块（-appearance / -effects / -advanced）的节头按工厂作用域自由名字引用它
  // （打包后同作用域）。导出它只为让**按文件 import 的守卫台架**能挂上真实现，
  // 不是新公共 API；bundle 侧无消费者（内联后同作用域）。
  moduleResetButton,
};
