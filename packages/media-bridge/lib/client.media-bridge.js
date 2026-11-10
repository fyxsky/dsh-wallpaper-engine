window.__ModuleLoader__.load({
	id: "dsh-we-slim-media-bridge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const host = require("dsh-we-slim");
				// ── 内联模块：packages/media-bridge/src/wallpaper-current-section.js —— 「壁纸库」页签第一节「当前壁纸」的渲染器（ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它的 render 登记进面板节注册表（library，order 10）（构建期注入；勿手改本段）──
				/**
				 * 「壁纸库」页签第一节「当前壁纸」的渲染器。
				 *
				 * 归属（ADR-0013 D20）：随包走的是**渲染器**；当前壁纸的 selection、播放动作体、
				 * 失败原因计算仍在主包（src/client.js / src/live-layer.js）⇒ 本文件**不持键、不写 selection、
				 * 不调 emit**，只读 ctx；跨包通道只有主 bundle 的显式 host 键集：
				 *   · VinylRecord / vinylSpinVisible（src/client.js 工厂作用域）· liveFailReasonOf（src/live-layer.js）
				 *   · 四节共享的 React / weT
				 * 内联形状见 packages/media-bridge/client.build.json；入口的 registerPanelSection 把 render 登记进
				 * 面板节注册表（library，order 10）。与同族三节共享同一契约：只读 ctx、不写 selection、不调 emit
				 * （判据扫全族并集，见 test/verify-scene-live.mjs / test/verify-client.mjs）。
				 */
				  function renderWallpaperCurrentSection(ctx) {
				    const { current, isLiveScene, onClear, onOpenPicker, onRefresh, onToggleAudio, onTogglePlay, onTogglePropsPanel, playbackLive, propsPanelOpen, renderUserPropsPanel, sel, setPickerOpener } = ctx;
				    return React.createElement(React.Fragment, null,
				    // ── 当前壁纸: vinyl record beside the selection, in both card styles. ──
				    React.createElement("div", { className: "we-picker__section" },
				      React.createElement("div", { className: "we-picker__section-head" },
				        React.createElement("span", { className: "we-picker__section-label" }, weT("当前壁纸")),
				      ),
				      React.createElement("div", { className: "we-picker__current" },
				        React.createElement(VinylRecord, {
				          cover: current && current.preview, title: current ? current.title : "",
				          playing: playbackLive && Boolean(sel.url) && vinylSpinVisible(),
				        }),
				        React.createElement("div", { className: "we-picker__current-info" },
				          React.createElement("div", { className: "we-picker__current-title", title: current ? current.title : "" },
				            sel.id && current ? current.title : weT("未选择壁纸"),
				            // 类型 + 播放态：宽卡片里另起一行；抽屉（窄容器）里由 CSS 改成
				            // 「名称（类型 · 播放中）」同一行，整行超出省略（见 .we-repo-panel 规则）。
				            React.createElement("span", { className: "we-picker__current-meta" },
				              current
				                ? weT("{type}{status}", {
				                    type: { video: weT("视频壁纸"), web: weT("网页壁纸"), image: weT("图片壁纸"), scene: weT(isLiveScene ? "场景壁纸（实时渲染）" : "场景壁纸（静态帧）") }[current.type] || weT("壁纸"),
				                    status: weT(playbackLive ? " · 播放中" : " · 已暂停"),
				                  })
				                : weT("尚未选择壁纸"))),
				          // 失败/被过滤的原因说明包一层：抽屉里该层用 display:contents 展开成
				          // grid 项（标题已独走第一行），靠这个包裹层保证「一行一项」。
				          React.createElement("div", { className: "we-picker__current-sub" },
				          // 播放失败原因（#84）: 浏览器解不了的编码 / 解码失败等 —— 给出可读原因，
				          // 配合下面的「播放」按钮重试（不是静默空白）。
				          sel.videoError && React.createElement("div", { className: "we-picker__current-error" }, sel.videoError),
				          // 选择被过滤条件排除（#84）: 明确指出是哪一项过滤挡住了、怎么恢复
				          sel.blockedNote && React.createElement("div", { className: "we-picker__current-error" }, sel.blockedNote),
				          // 实时渲染失败原因（自动回退到旧链时显示）：让「为什么黑」可见 ——
				          // 用户反馈时能直接说明，也提示了重试入口（重开「实时渲染」开关）。
				          liveFailReasonOf(sel) && React.createElement("div", { className: "we-picker__current-error" },
				            weT("实时渲染失败（{reason}），已自动回退；重新打开「实时渲染」开关可重试", { reason: weT(liveFailReasonOf(sel)) }))
				          ),
				        ),
				        // 主操作区：选择壁纸（下钻库视图）。壁纸属性入口在下面那排播放控制里、
				        // 排在「暂停」之前（同排同级、同款式）。
				        React.createElement("div", { className: "we-picker__current-actions" },
				          React.createElement("button", {
				            className: "we-picker__btn we-picker__btn--primary", type: "button",
				            ref: setPickerOpener,
				            onClick: onOpenPicker,
				          }, weT("选择壁纸")),
				        ),
				      ),
				      // 属性面板紧贴卡片下方（同一节里），抽屉/弹窗两种形态都可见。
				      renderUserPropsPanel(),
				      // Playback controls (wallpaper-independent; the thumbnail grid lives in
				      // the modal above, so these stay within reach).
				      React.createElement("div", { className: "we-picker__row" },
				        // 壁纸属性（仅场景/网页壁纸 + 有 propsUrl）：与播放控制同排、同款式
				        //（普通 .we-picker__btn；面板开着时 is-on 高亮）——入口与播放控制同级更顺手。
				        (current && (current.type === "scene" || current.type === "web") && sel.propsUrl)
				          && React.createElement("button", {
				            className: "we-picker__btn" + (propsPanelOpen ? " is-on" : ""),
				            type: "button",
				            title: weT("壁纸作者提供的可调属性（改动立即生效）"),
				            onClick: onTogglePropsPanel,
				          }, weT("壁纸属性")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onTogglePlay, disabled: !sel.url,
				          // 按钮显示真实状态（#84）: 播放失败时回到「播放」，就是用户要的「继续」。
				        }, playbackLive ? weT("暂停") : weT("播放", null, "play")),
				        // 音乐开关：与「播放」同级的一键切换。只影响音轨，不动播放态 ——
				        // 关掉后画面继续播放。仅对含音轨的壁纸类型显示（视频 / 场景内嵌 MP4）。
				        //
				        // ⚠️ 高亮判据必须与**按钮自己的状态**（也就是下面文案那个判据）**逐字同一个**：
				        // 这颗按钮切的是 `videoAudioEnabled`，所以「亮」= 该开关为开。按别的量（如音量）判亮
				        // 会让文案与高亮互相矛盾、点击没有任何视觉反馈。
				        // 音量是**另一颗**控件，不参与这颗按钮的开关状态。
				        (sel.type === "video" || (sel.type === "scene" && (sel.sceneVideo || sel.sceneHasAudio)))
				          && React.createElement("button", {
				            className: "we-picker__btn" + (sel.videoAudioEnabled === false ? "" : " is-on"),
				            type: "button",
				            onClick: onToggleAudio,
				            disabled: !sel.url,
				            title: sel.videoAudioEnabled === false
				              ? weT("开启壁纸音轨（音量为 0 时自动设为 50%）")
				              : weT("关闭壁纸音轨（画面继续播放）"),
				          }, sel.videoAudioEnabled === false ? weT("🔇 音乐关") : weT("🔊 音乐开")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onClear, disabled: !sel.id,
				          title: weT("清除当前壁纸（停止播放，回到无壁纸状态）"),
				        }, weT("清除")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onRefresh, disabled: sel.loading,
				        }, sel.loading ? weT("刷新中…") : weT("刷新")),
				      ),
				    ),
				    );
				  }

				// ── 内联模块：packages/media-bridge/src/wallpaper-transition-section.js —— 「壁纸库」页签第二节「切换过场」的渲染器（ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它的 render 登记进面板节注册表（library，order 20）（构建期注入；勿手改本段）──
				/**
				 * wallpaper-transition-section.js — 「壁纸库」页签第二节「切换过场」的渲染器。
				 *
				 * 归属 / 构建期形状 / 消费侧契约见本包 `src/client.js` 文件头（同一份 P-D 口径）。
				 * 本文件是 `packages/media-bridge/client.build.json` 的 inline 模块：与入口落在**同一个工厂
				 * 作用域**，不收 import / require；自由标识符（React / weT / ctlText / switchTransitionOf /
				 * SWITCH_TRANSITIONS / SWITCH_DIRS / SWITCH_DIR_LABELS / SWITCH_SPEEDS）由入口从 host 显式键集解构。
				 *
				 * ctx 键（onSwitchTransition / onSwitchTransitionDir / onSwitchTransitionSpeed / sel）
				 * 由主包 renderWallpaperTab 在渲染处构造 ⇒ 本渲染器只读 ctx。
				 */

				  function renderWallpaperTransitionSection(ctx) {
				    const { onSwitchTransition, onSwitchTransitionDir, onSwitchTransitionSpeed, sel } = ctx;
				    const switchTr = switchTransitionOf(sel);
				    return React.createElement(React.Fragment, null,
				    // ── 切换过场（手动点选与自动轮播共用）：类型 / 方向 / 速度 ──
				    // 默认「硬切」（零成本、零风险）；换默认改 DEFAULTS 一处即可。
				    // 每种过场只动 transform / opacity / clip-path（见 switchFrames）。
				    React.createElement("div", { className: "we-picker__section" },
				      React.createElement("div", { className: "we-picker__section-head" },
				        React.createElement("span", { className: "we-picker__section-label" }, weT("切换过场")),
				      ),
				      // 过场动画：**下拉菜单**（不用水平平铺）—— 过场会持续增加，平铺一排按钮
				      // 迟早挤成两行、还会把「方向 / 时长」挤下去；下拉天然可扩展。
				      React.createElement("div", { className: "we-picker__ctl" },
				        ctlText(weT("过场动画"), weT("换壁纸时的转场")),
				        React.createElement("select", {
				          className: "we-picker__select",
				          value: sel.switchTransition,
				          onChange: (e) => onSwitchTransition(e.target.value),
				          "aria-label": weT("过场动画"),
				        },
				          ...SWITCH_TRANSITIONS.map((t) =>
				            React.createElement("option", { key: t.id, value: t.id }, t.label)),
				        ),
				      ),
				      // 方向：只有方向型过场（推移 / 擦除 / 条带）听它；条带用它决定竖条 / 横条。
				      switchTr.directional && React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap" },
				        ctlText(weT("方向"), weT("新画面从哪边进")),
				        React.createElement("div", { className: "we-picker__seg" },
				          SWITCH_DIRS.map((d) =>
				            React.createElement("button", {
				              key: d,
				              className: "we-picker__btn we-picker__rate" + (sel.switchTransitionDir === d ? " we-picker__rate--active" : ""),
				              type: "button",
				              onClick: () => onSwitchTransitionDir(d),
				              "aria-pressed": sel.switchTransitionDir === d ? "true" : "false",
				              "aria-label": weT("过场方向 {dir}", { dir: weT(SWITCH_DIR_LABELS[d]) }),
				            }, SWITCH_DIR_LABELS[d]),
				          ),
				        ),
				      ),
				      // 时长档：只影响速度乘子，基准时长写在各过场里（见 SWITCH_TRANSITIONS）。
				      switchTr.ms > 0 && React.createElement("div", { className: "we-picker__ctl we-picker__ctl--wrap" },
				        ctlText(weT("时长"), weT("当前约 {ms} ms", { ms: switchTr.ms })),
				        React.createElement("div", { className: "we-picker__seg" },
				          SWITCH_SPEEDS.map((s) =>
				            React.createElement("button", {
				              key: s.id,
				              className: "we-picker__btn we-picker__rate" + (sel.switchTransitionSpeed === s.id ? " we-picker__rate--active" : ""),
				              type: "button",
				              onClick: () => onSwitchTransitionSpeed(s.id),
				              "aria-pressed": sel.switchTransitionSpeed === s.id ? "true" : "false",
				              "aria-label": weT("过场速度 {speed}", { speed: weT(s.label) }),
				            }, s.label),
				          ),
				        ),
				      ),
				    ),
				    );
				  }

				// ── 内联模块：packages/media-bridge/src/wallpaper-rotation-section.js —— 「壁纸库」页签第三节「自动轮播」的渲染器（ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它的 render 登记进面板节注册表（library，order 30）（构建期注入；勿手改本段）──
				/**
				 * wallpaper-rotation-section.js — 「壁纸库」页签第三节「自动轮播」的渲染器。
				 *
				 * 归属 / 构建期形状 / 消费侧契约见本包 `src/client.js` 文件头（同一份 P-D 口径）。
				 * 本文件是 `packages/media-bridge/client.build.json` 的 inline 模块：与入口同工厂作用域，
				 * 不收 import / require；自由标识符（React / weT / ctlText / Toggle / renderConfirmRow /
				 * groupWallpapers / startCreateGroup / startEditGroup / saveEditingGroup / cancelEditGroup /
				 * importPlaylistIntoDraft / rotationIntervalDefault）由入口从 host 显式键集解构。
				 *
				 * 默认轮播间隔经**窄键** `rotationIntervalDefault` 从 host 取（同一格默认值的显式绑定；
				 * 真源仍是主包 `DEFAULTS.rotationInterval`，同源判据见 `test/verify-client.mjs`）。
				 *
				 * ctx 键（INTERVALS / armedConfirm / editing / group / groups / 十一个 on* 回调 /
				 * playableCount / sel）照旧由主包 renderWallpaperTab 构造 ⇒ 本函数与搬前逐字同行为
				 *（唯一新增：`onPictureSlideSeconds` = 图内过场周期，「图片轮播」那一行用）。
				 */

				  function renderWallpaperRotationSection(ctx) {
				    const { INTERVALS, armedConfirm, editing, group, groups, onArmDeleteGroup, onDeleteGroup, onDisarmConfirm, onEditInterval, onEditName, onEditOrder, onEditTrigger, onGroupChange, onGroupInterval, onGroupTrigger, onOpenPickerDraft, onPictureSlideSeconds, onToggleRotation, playableCount, sel } = ctx;
				    // 图内过场的可选项（秒）。与主包 KINDS.pictureSlideSeconds 的 0..3600 上界一致：
				    // 这里只是**常用档**；用户在别处写入的秒数若不在档上，补一条同值 option 回显
				    //（否则 select 会因找不到匹配值显示空白，看起来像"设置丢了"）。
				    const PICTURE_SLIDE_INTERVALS = [0, 5, 10, 15, 30, 60, 180, 300];
				    const rawPictureSlideSeconds = Math.max(0, Math.min(3600, Math.round(Number(sel.pictureSlideSeconds) || 0)));
				    const pictureSlideOptions = PICTURE_SLIDE_INTERVALS.includes(rawPictureSlideSeconds)
				      ? PICTURE_SLIDE_INTERVALS
				      : PICTURE_SLIDE_INTERVALS.concat([rawPictureSlideSeconds]).sort((a, b) => a - b);
				    const groupToken = group ? "group:" + group.id : "";
				    return React.createElement(React.Fragment, null,
				    // ── 自动轮播: user-defined carousel lists, each with its own
				    //    wallpaper set, interval and order. Persisted as `rotationGroups` (host config.json). ──
				    React.createElement("div", { className: "we-picker__section" },
				      React.createElement("div", { className: "we-picker__section-head" },
				        React.createElement("span", { className: "we-picker__section-label" }, weT("自动轮播")),
				      ),
				      React.createElement("div", { className: "we-picker__row we-picker__playlist-row" },
				      React.createElement("select", {
				        className: "we-picker__playlist-select",
				        value: sel.rotationGroupId,
				        onChange: onGroupChange,
				        disabled: groups.length === 0,
				        "aria-label": weT("轮播列表"),
				      },
				      React.createElement("option", { value: "" }, groups.length ? weT("— 选择轮播列表 —") : weT("— 暂无轮播列表 —")),
				      ...groups.map((g) => React.createElement("option", {
				        key: g.id, value: g.id,
				      }, weT("{name}（{count} 可播放 · {interval} 分钟）", { name: g.name, count: groupWallpapers(g).length, interval: g.interval }))),
				      ),
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button",
				        onClick: startCreateGroup,
				      }, weT("新建")),
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button",
				        onClick: () => startEditGroup(sel.rotationGroupId),
				        disabled: !sel.rotationGroupId,
				      }, weT("编辑")),
				      React.createElement("button", {
				        className: "we-picker__btn", type: "button",
				        // 第一下只置令牌（`onArmDeleteGroup`）；落地在下面那行问句的「确认」里。
				        // 待确认时**置灰**（不隐藏、不换位置）：按钮仍占着那一格，宽度就完全不变，
				        // 而且它指路到问句行 —— 留着可点会让"再点一下是不是就删了"变成猜测。
				        onClick: onArmDeleteGroup,
				        disabled: !sel.rotationGroupId || armedConfirm === groupToken,
				        title: armedConfirm === groupToken
				          ? weT("已经问过你了 —— 在下面那一行选「确认」或「取消」")
				          : weT("删除这个轮播列表（会再问一次）"),
				      }, weT("删除")),
				    ),
				    renderConfirmRow(armedConfirm, groupToken,
				      weT("删除轮播列表「{name}」？此操作不可恢复。", { name: (group && group.name) || "" }),
				      onDeleteGroup, onDisarmConfirm),
				    editing && React.createElement("div", { className: "we-picker__editor" },
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("名称")),
				        React.createElement("input", {
				          className: "we-picker__text", type: "text",
				          value: editing.name,
				          "aria-label": weT("轮播列表名称"),
				          onInput: onEditName,
				        }),
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("间隔")),
				        React.createElement("select", {
				          className: "we-picker__rotation-interval",
				          value: String(editing.interval),
				          onChange: onEditInterval,
				          // 推进方式选了「视频播完」时，间隔不参与推进 —— 置灰但保留可见（用户切回来时还在）
				          disabled: editing.trigger === "videoEnd",
				          "aria-label": weT("轮播间隔"),
				        },
				        ...INTERVALS.map((minutes) =>
				          React.createElement("option", { key: minutes, value: String(minutes) }, weT("{min} 分钟", { min: minutes })),
				        )),
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("推进")),
				        React.createElement("select", {
				          className: "we-picker__playlist-select",
				          value: editing.trigger === "videoEnd" ? "videoEnd" : "interval",
				          onChange: onEditTrigger,
				          "aria-label": weT("轮播推进方式"),
				        },
				        React.createElement("option", { value: "interval" }, weT("按间隔")),
				        React.createElement("option", { value: "videoEnd" }, weT("视频播完就换")),
				        ),
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("顺序")),
				        React.createElement("select", {
				          className: "we-picker__playlist-select",
				          value: editing.order,
				          onChange: onEditOrder,
				          "aria-label": weT("轮播顺序"),
				        },
				        React.createElement("option", { value: "sequence" }, weT("顺序", null, "seq")),
				        React.createElement("option", { value: "random" }, weT("随机")),
				        ),
				      ),
				      // 选片走**页内下钻**（与「选择壁纸」同一套库视图）：点按钮进库浏览，
				      // 卡片点击 = 加入/移出草稿（pickerDraft），顶部提示已选数；「返回」回编辑器。
				      // 这里**只有一行入口按钮、没有内联网格**：大库在 24px 缩略图里翻页选片不可用，
				      // 全尺寸浏览 + 搜索/过滤才是选片的正确形态。
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("button", {
				          className: "we-picker__btn we-picker__btn--primary", type: "button",
				          onClick: onOpenPickerDraft,
				        }, weT("选择壁纸")),
				        React.createElement("span", { className: "we-picker__hint" },
				          weT("下钻进库挑选 · 点卡片加入 / 移出")),
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint" }, weT("已选 {count} 个", { count: editing.wallpaperIds.length })),
				        sel.inventory.playlists.length > 0 && React.createElement("select", {
				          className: "we-picker__playlist-select",
				          value: "",
				          onChange: (e) => {
				            const p = sel.inventory.playlists.find((pl) => pl.id === e.target.value);
				            if (p) importPlaylistIntoDraft(p);
				          },
				        },
				        React.createElement("option", { value: "" }, weT("从 WE 播放列表导入…")),
				        ...sel.inventory.playlists.map((p) => React.createElement("option", {
				          key: p.id, value: p.id,
				        }, weT("{name}（{count} 可播放）", { name: p.name, count: p.portableCount || 0 }))),
				        ),
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: saveEditingGroup,
				        }, weT("保存")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: cancelEditGroup,
				        }, weT("取消")),
				      ),
				    ),
				    // 图内过场：图片 / 幻灯片壁纸**内部**多张图之间的切换间隔。与上面「自动轮转」
				    //（壁纸与壁纸之间、分钟）是两件事 —— 这一项单位是秒，0 = 跟随 WE 项目里
				    // `imageswitchtimes` 声明的那一档。只有当前这张真是「图集 ≥2 张」的图片项目才可用，
				    // 其余档置灰并说明原因（常驻不隐藏：位置稳定，切到图片项目时不跳）。
				    React.createElement("div", { className: "we-picker__ctl" },
				      ctlText(weT("图片轮播"),
				        (sel.type === "image" && sel.slidesUrl)
				          ? weT("幻灯片壁纸内部多张图之间的切换间隔；「跟随壁纸」= 用 WE 里设的周期")
				          : weT("当前壁纸不是多图图片项目，此项暂不生效")),
				      React.createElement("div", { className: "we-picker__ctl-side" },
				        React.createElement("select", {
				          className: "we-picker__picture-slide-interval",
				          value: String(sel.pictureSlideSeconds || 0),
				          onChange: onPictureSlideSeconds,
				          disabled: !(sel.type === "image" && sel.slidesUrl),
				          "aria-label": weT("图片轮播间隔"),
				        },
				        ...pictureSlideOptions.map((sec) =>
				          React.createElement("option", { key: sec, value: String(sec) },
				            sec === 0 ? weT("跟随壁纸") : (sec < 60 ? weT("{n} 秒", { n: sec }) : weT("{n} 分钟", { n: sec / 60 }))),
				        )),
				      ),
				    ),
				    // #255②：「自动轮转」是**列表的**开关 —— 没选列表 / 列表编辑器展开时整行不渲染。
				    // 旧实现让这一行常驻，没列表时只能显示一句「请先选择或新建一个轮播列表」，
				    // 相当于在设置页里放了一行永远点不动的控件。
				    (sel.rotationGroupId && !editing) && React.createElement("div", { className: "we-picker__ctl" },
				      ctlText(weT("自动轮转"),
				        playableCount < 2
				          ? weT("当前列表至少需要 2 个可播放壁纸")
				          : (group && group.trigger === "videoEnd")
				            ? weT("当前视频播完就换下一张（不看间隔）")
				            : weT("每 {min} 分钟切换一次", { min: group ? group.interval : rotationIntervalDefault })),
				      React.createElement("div", { className: "we-picker__ctl-side" },
				        React.createElement("select", {
				          className: "we-picker__rotation-interval",
				          value: String(group ? group.interval : rotationIntervalDefault),
				          onChange: onGroupInterval,
				          disabled: !sel.rotationEnabled || !sel.rotationGroupId || playableCount < 2
				            || (group && group.trigger === "videoEnd"),
				          "aria-label": weT("轮转间隔"),
				        },
				        ...INTERVALS.map((minutes) =>
				          React.createElement("option", { key: minutes, value: String(minutes) }, weT("{min} 分钟", { min: minutes })),
				        )),
				        // 推进方式：按间隔 / 视频播完就换。常驻行直接可改（不必进「编辑」），
				        // 与列表编辑器里的同名字段（onEditTrigger）写同一个 group.trigger。
				        React.createElement("select", {
				          className: "we-picker__playlist-select",
				          value: group && group.trigger === "videoEnd" ? "videoEnd" : "interval",
				          onChange: onGroupTrigger,
				          disabled: !sel.rotationGroupId,
				          "aria-label": weT("轮播推进方式"),
				        },
				        React.createElement("option", { value: "interval" }, weT("按间隔")),
				        React.createElement("option", { value: "videoEnd" }, weT("视频播完就换")),
				        ),
				        Toggle({
				          checked: sel.rotationEnabled,
				          onChange: onToggleRotation,
				          label: weT("自动轮转"),
				          disabled: !sel.rotationGroupId || playableCount < 2,
				          title: weT("按列表顺序/随机自动切换壁纸"),
				        }),
				      ),
				    ),
				    ),
				    );
				  }

				// ── 内联模块：packages/media-bridge/src/wallpaper-uploads-section.js —— 「壁纸库」页签第四节「自定义壁纸」的渲染器（ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它的 render 登记进面板节注册表（library，order 40）（构建期注入；勿手改本段）──
				/**
				 * wallpaper-uploads-section.js — 「壁纸库」页签第四节「自定义壁纸」的渲染器。
				 *
				 * 父页签 renderWallpaperTab 仍在主包组装点（`src/panel-tabs.js`），按面板节注册表
				 * （`src/extension-registry.js`）的顺序续接本包的节（library / order 40）。
				 *
				 * 归属（ADR-0013 D20）：随包走的是**渲染器**；上传目录 / 官方资源目录 / 上传列表 /
				 * 确认令牌这些键、默认值、持久化与动作体全留主包，本文件只读 ctx 值 + 经 host 显式键集
				 * 调主包动作。键集真源 = `src/host-bridge.js` 的 `HOST_BRIDGE_BINDINGS`（71 键；ADR-0014 S5.1），
				 * 本包的申报表是 `WALLPAPER_SECTIONS_HOST_REQUIRED`（`packages/media-bridge/src/client.js`，
				 * 源码留空表，构建期从同文件的 `} = host;` 解构逐键派生）。
				 *
				 * 唯一跨包通道 = 主 bundle 的显式键集（ADR-0014 S5.1 / S5.4）；本文件里出现的 React / weT /
				 * changeUploadDir / changeWeAssetsDir / uploadWallpaperFile / removeUploadWallpaper /
				 * renderConfirmRow 都会由构建期配方内联后的入口从 host 解构进**同一个工厂作用域**。
				 */
				  function renderWallpaperUploadsSection(ctx) {
				    const { armedConfirm, group, onArmConfirm, onCancelEditUploadDir, onCancelEditWeAssetsDir, onDisarmConfirm, onStartEditUploadDir, onStartEditWeAssetsDir, onUploadDirDraft, onWeAssetsDirDraft, playableCount, playableList, sel, uploadedList } = ctx;
				    const uploadToken = (w) => "upload:" + w.id;
				    return React.createElement(React.Fragment, null,
				    // ── 自定义壁纸: local JPG/PNG/MP4 as wallpapers. Files are written by the
				    //    host into its plugin-managed directory and served through the same
				    //    media/preview routes (read-A storage: survives restarts, no quota
				    //    limits). Uploads merge into the inventory on the host side. ──
				    React.createElement("div", { className: "we-picker__section" },
				      React.createElement("div", { className: "we-picker__section-head" },
				        React.createElement("span", { className: "we-picker__section-label" }, weT("自定义壁纸")),
				      ),
				      React.createElement("div", { className: "we-picker__uploads" },
				      // Storage location — users can point uploads at a non-system drive
				      // (most people don't want wallpaper files piling up on C:). The host
				      // persists the choice and migrates existing files on change.
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("存储位置")),
				        React.createElement("span", {
				          className: "we-picker__uploads-path",
				        }, sel.inventory.uploadDir || "—"),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          disabled: sel.uploading,
				          onClick: onStartEditUploadDir,
				        }, weT("更改")),
				      ),
				      sel.editingUploadDir && React.createElement("div", { className: "we-picker__row" },
				        React.createElement("input", {
				          className: "we-picker__text", type: "text",
				          value: sel.uploadDirDraft,
				          placeholder: weT("绝对路径，如 D:\\MyWallpapers"),
				          onInput: onUploadDirDraft,
				          onKeyDown: (e) => {
				            if (e.key === "Enter") changeUploadDir(sel.uploadDirDraft, true);
				            if (e.key === "Escape") onCancelEditUploadDir();
				          },
				        }),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          disabled: sel.uploading,
				          onClick: () => changeUploadDir(sel.uploadDirDraft, true),
				        }, weT("保存")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onCancelEditUploadDir,
				        }, weT("取消")),
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint" },
				          weT("已有文件会迁移到新位置")),
				        React.createElement("span", { className: "we-picker__hint" },
				          weT("支持 ~ 表示用户主目录")),
				      ),
				      // ── 官方资源路径（local-assets）：场景实时渲染的 util、particle、
				      // gradient 贴图默认是程序化复刻（观感近似）；指向本机 WE 安装目录的
				      // assets 树后按名取官方像素，与官方引擎逐像素对齐。素材属 WE 版权
				      // 内容，只从本机路径只读取用，不会被复制/上传。路径不硬编码 ——
				      // 持久化在宿主 config.json（weAssetsDir），经 we-assets-dir 端点读写。
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("官方资源路径")),
				        React.createElement("span", {
				          className: "we-picker__uploads-path",
				        }, sel.inventory.weAssetsDir || "—"),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onStartEditWeAssetsDir,
				        }, sel.inventory.weAssetsDir ? weT("更改") : weT("设置")),
				      ),
				      sel.editingWeAssetsDir && React.createElement("div", { className: "we-picker__row" },
				        React.createElement("input", {
				          className: "we-picker__text", type: "text",
				          value: sel.weAssetsDirDraft,
				          placeholder: weT("WE assets 绝对路径，留空保存=清除"),
				          onInput: onWeAssetsDirDraft,
				          onKeyDown: (e) => {
				            if (e.key === "Enter") changeWeAssetsDir(sel.weAssetsDirDraft);
				            if (e.key === "Escape") onCancelEditWeAssetsDir();
				          },
				        }),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: () => changeWeAssetsDir(sel.weAssetsDirDraft),
				        }, weT("保存")),
				        React.createElement("button", {
				          className: "we-picker__btn", type: "button",
				          onClick: onCancelEditWeAssetsDir,
				        }, weT("取消")),
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint" },
				          sel.inventory.weAssetsAvailable
				            ? weT("已启用 · 场景实时渲染取官方像素")
				            : (sel.inventory.weAssetsDir
				              ? weT("目录不可用（缺 materials/），场景实时渲染走程序化复刻")
				              : weT("未配置 · 场景实时渲染贴图走程序化复刻"))),
				        React.createElement("span", { className: "we-picker__hint" },
				          weT("指向 Wallpaper Engine 安装目录的 assets（或其拷贝）")),
				      ),
				      sel.weAssetsError && React.createElement("div", { className: "we-picker__error" },
				        sel.weAssetsError,
				      ),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint we-picker__label" }, weT("自定义")),
				        React.createElement("input", {
				          className: "we-picker__file", type: "file",
				          accept: ".jpg,.jpeg,.png,.mp4",
				          disabled: sel.uploading,
				          onChange: (e) => {
				            const f = e.target.files && e.target.files[0];
				            if (f) uploadWallpaperFile(f);
				            e.target.value = "";
				          },
				        }),
				        sel.uploading && React.createElement("span", { className: "we-picker__hint" }, weT("上传中…")),
				      ),
				      sel.uploadError && React.createElement("div", { className: "we-picker__error" }, sel.uploadError),
				      sel.uploadNote && React.createElement("div", { className: "we-picker__note" }, sel.uploadNote),
				      React.createElement("div", { className: "we-picker__row" },
				        React.createElement("span", { className: "we-picker__hint" }, weT("已上传 {count} 个", { count: uploadedList.length })),
				        React.createElement("span", { className: "we-picker__hint" }, weT("支持 JPG / PNG / MP4，及含 project.json 的 WE 壁纸目录")),
				      ),
				      uploadedList.length > 0 && React.createElement("div", { className: "we-picker__uploads-list" },
				        uploadedList.map((w) => React.createElement(React.Fragment, { key: w.id },
				          React.createElement("div", { className: "we-picker__uploads-item" },
				          React.createElement("span", { className: "we-picker__uploads-name", title: w.title }, w.title),
				          React.createElement("span", { className: "we-picker__hint" }, w.type === "video" ? "MP4" : weT("图片")),
				          React.createElement("button", {
				            className: "we-picker__btn", type: "button",
				            // **会删本地文件** ⇒ 这一处最需要两下：第一下只置令牌。
				            onClick: () => onArmConfirm(uploadToken(w)),
				            disabled: sel.uploading || armedConfirm === uploadToken(w),
				            title: armedConfirm === uploadToken(w)
				              ? weT("已经问过你了 —— 在下面那一行选「确认」或「取消」")
				              : weT("移除这个自定义壁纸（会再问一次，且会删除本地文件）"),
				          }, weT("移除")),
				          ),
				          // 问句行紧跟它自己那一项（挂在同一个 `key` 下，位置不会串到别的壁纸那里）。
				          renderConfirmRow(armedConfirm, uploadToken(w),
				            weT("移除自定义壁纸「{name}」？此操作会删除本地文件，且不可恢复。", { name: w.title }),
				            () => removeUploadWallpaper(w.id), onDisarmConfirm),
				        )),
				      ),
				      ),
				    ),
				    React.createElement("div", { className: "we-picker__row" },
				      React.createElement("span", { className: "we-picker__hint" },
				        (group
				          ? weT("列表「{name}」：{count} 项 · {playable} 可播放 · 每 {interval} 分钟 · {order}{rotating}", {
				            name: group.name,
				            count: group.wallpaperIds.length,
				            playable: playableCount,
				            interval: group.interval,
				            order: group.order === "random" ? weT("随机") : weT("顺序", null, "seq"),
				            rotating: sel.rotationEnabled ? weT(" · 自动轮转中") : "",
				          })
				          : weT("{count} 个可播放壁纸{rotating}", { count: playableList.length, rotating: sel.rotationEnabled ? weT(" · 自动轮转中") : "" }))),
				    ),
				    );
				  }

				// 挂载台（test/verify-scene-live.mjs 等）按文件 import 本模块时没有构建期内联作用域，
				// 所以必须显式导出；构建期配方（packages/media-bridge/client.build.json）会把这段 export 剥掉
				// （与 packages/fonts/src/appearance-font-section.js 尾部同款）。

				// ── 内联模块：packages/media-bridge/src/playback-rate-section.js —— 「播放」页签「倍速 / 帧率上限」节渲染器（含私有 renderTranscodeProgress；ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它登记进面板节注册表（playback，order 60）（构建期注入；勿手改本段）──
				/**
				 * playback-rate-section.js — 「播放」页签的「倍速 / 帧率上限」节（含私有 renderTranscodeProgress）。
				 *
				 * ⚠️ 归属（ADR-0013 D20）：随包走的只有**渲染器**；倍速 / 帧率上限的选择、默认值、持久化与
				 *    动作体（onPlaybackRate / onFpsCap）、档位表 FPS_CAP_VALUES、codecLabel、源信息与转码进度
				 *    状态全留在主包 ⇒ 值一律经主包构造的渲染 ctx 或 host 显式键集拿到。
				 *    本文件只读 ctx、不写 selection、不自发通知（接缝判据见 test/verify-client.mjs）。
				 *    构建期内联在 packages/media-bridge/src/client.js 之前（inline 顺序见 client.build.json）。
				 */

				  // ── 转码进度行 ──
				  function renderTranscodeProgress(sel) {
				    return React.createElement("div", { className: "we-picker__row we-picker__prog", key: "transcode-prog" },
				      React.createElement("div", {
				        className: "we-picker__prog-track",
				        role: "progressbar",
				        "aria-label": weT("转码进度"),
				        "aria-valuemin": 0,
				        "aria-valuemax": 100,
				        "aria-valuenow": Math.max(0, Math.min(100, sel.transcodeProgress.percent || 0)),
				      },
				        React.createElement("div", {
				          className: "we-picker__prog-bar",
				          style: { width: Math.max(2, Math.min(100, sel.transcodeProgress.percent || 0)) + "%" },
				        }),
				      ),
				      React.createElement("span", { className: "we-picker__hint" },
				        sel.transcodeProgress.phase === "download"
				          ? weT("下载 ffmpeg {percent}%", { percent: sel.transcodeProgress.percent || 0 })
				          : sel.transcodeProgress.phase === "transcode" && sel.transcodeProgress.finalizing ? weT("收尾中…")
				          : sel.transcodeProgress.phase === "transcode"
				            ? weT("转码中 {percent}%{eta}", {
				              percent: sel.transcodeProgress.percent || 0,
				              eta: sel.transcodeProgress.eta ? weT(" · 约剩 {sec} 秒", { sec: sel.transcodeProgress.eta }) : "",
				            })
				          : sel.transcodeProgress.phase === "done" ? weT("即将完成…")
				          : weT("准备中…"),
				      ),
				    );
				  }

				  function renderEffectsPlaybackSection(ctx) {
				    const { onFpsCap, onPlaybackRate, sel, surface } = ctx;
				    const sidebarSurface = surface === "sidebar";
				    return React.createElement(React.Fragment, null,
				      // Playback speed — native playbackRate, instant, no media reload. Video
				      // wallpapers only (web/iframe and scene wallpapers have no playbackRate).
				      sel.type === "video"
				        && React.createElement("div", { className: "we-picker__ctl", key: "rate" },
				        ctlText(weT("倍速")),
				        React.createElement("div", { className: "we-picker__seg" },
				          [0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) =>
				            React.createElement("button", {
				              key: rate,
				              className: "we-picker__btn we-picker__rate" + (sel.playbackRate === rate ? " we-picker__rate--active" : ""),
				              type: "button",
				              onClick: () => onPlaybackRate(rate),
				            }, String(rate).replace(/\.?0+$/, "") + "x"),
				          ),
				        ),
				      ),
				      // 解码帧率上限（抽帧转码）：host 一次性把源视频重编码为上限帧率（时间线
				      // 1.0x 正常速度，解码占用随帧率线性下降），与倍速解耦。首次转码需等待，
				      // 播放中原片、转好自动切换；无 ffmpeg 自动回退原片。
				      // 侧栏档不出现在这里（准备与诊断，见函数头）。──
				      !sidebarSurface && sel.type === "video"
				        && React.createElement("div", { className: "we-picker__ctl", key: "fps" },
				        ctlText(weT("帧率上限"), weT("抽帧转码 · 降低解码占用")),
				        React.createElement("div", { className: "we-picker__seg" },
				          FPS_CAP_VALUES.map((cap) =>
				            React.createElement("button", {
				              key: cap,
				              className: "we-picker__btn we-picker__rate" + (sel.fpsCap === cap ? " we-picker__rate--active" : ""),
				              type: "button",
				              onClick: () => onFpsCap(cap),
				            }, cap === 0 ? weT("无限制") : cap + "fps"),
				          ),
				        ),
				      ),
				      // Source metadata + transcode status (host moov probe / transcode lifecycle).
				      // 源信息与转码进度同样是准备/诊断行 —— 侧栏档不画（见函数头）。
				      !sidebarSurface && sel.type === "video" && sel.mediaInfo && React.createElement("span", { className: "we-picker__hint", key: "media-info" },
				        weT("源 {width}×{height}{fps}{codec}{state}", {
				          width: sel.mediaInfo.width,
				          height: sel.mediaInfo.height,
				          fps: sel.mediaInfo.fps ? " · " + sel.mediaInfo.fps + "fps" : "",
				          codec: sel.mediaInfo.codec ? " · " + weT(codecLabel(sel.mediaInfo.codec)) : "",
				          state: sel.transcodeState === "working" ? weT(" · 抽帧准备中…")
				            : sel.transcodeState === "ready" ? weT(" · 已切换至 {fps}fps 抽帧版（正常速度，解码占用约减半）", { fps: sel.fpsCap })
				            : sel.transcodeState === "cached" ? weT(" · 抽帧版已就绪（下次切换到这张时生效）")
				            : sel.transcodeState === "native" ? weT(" · 源帧率未知，未抽帧")
				            : sel.transcodeState === "fallback" ? weT(" · 转码不可用，已回退原片")
				            : sel.transcodeState === "skipped" ? weT(" · 源帧率 ≤ 上限，无需抽帧")
				            : "",
				        }),
				      ),
				      // Download / transcode progress bar (polled from /transcode-progress).
				      !sidebarSurface && sel.type === "video" && sel.transcodeState === "working" && sel.transcodeProgress
				        && renderTranscodeProgress(sel),
				    );
				  }

				// ── 内联模块：packages/media-bridge/src/wallpaper-fit-section.js —— 「播放」页签「适配 / 水平翻转」节渲染器（ADR-0013/ADR-0014 子包出户）；入口的 registerPanelSection 把它登记进面板节注册表（playback，order 70）（构建期注入；勿手改本段）──
				/**
				 * wallpaper-fit-section.js — 「播放」页签的「适配 / 水平翻转」节渲染器。
				 *
				 * ⚠️ 归属（ADR-0013 D20）：随包走的只有**渲染器**；objectFit / flip 的选择、默认值、持久化与
				 *    动作体（onObjectFit / onFlip）全留在主包 ⇒ 值一律经主包构造的渲染 ctx 拿到。
				 *    本文件只读 ctx、不写 selection、不自发通知（接缝判据见 test/verify-client.mjs）。
				 *    构建期内联在 packages/media-bridge/src/client.js 之前（inline 顺序见 client.build.json）。
				 */

				  function renderEffectsFitSection(ctx) {
				    const { onFlip, onObjectFit, sel } = ctx;
				    return React.createElement(React.Fragment, null,
				      // Fit mode — applies to the CURRENT wallpaper whatever its type (WE
				      // video/scene image and custom uploads alike; web/iframe wallpapers
				      // have no object-fit). 覆盖=cover 填充=contain 居中=center 拉伸=fill
				      React.createElement("div", { className: "we-picker__ctl", key: "fit" },
				        ctlText(weT("适配")),
				        React.createElement("div", { className: "we-picker__seg" },
				          ["cover", "contain", "center", "fill"].map((mode) => {
				            const label = { cover: weT("覆盖"), contain: weT("填充"), center: weT("居中"), fill: weT("拉伸") }[mode];
				            return React.createElement("button", {
				              key: mode,
				              className: "we-picker__btn we-picker__rate" + (sel.objectFit === mode ? " we-picker__rate--active" : ""),
				              type: "button",
				              title: mode,
				              onClick: () => onObjectFit(mode),
				            }, label);
				          }),
				        ),
				      ),
				      // Horizontal mirror — scaleX(-1), compositor-only; works for video,
				      // web (iframe) and (later) uploaded image wallpapers alike.
				      switchRow(weT("水平翻转"), sel.flip, onFlip, { key: "flip" }),
				    );
				  }

		// ── 客户端正文（packages/media-bridge/src/client.js）───────────────────────────

		/**
		 * 缺键**大声失败**（ADR-0014 S5.1 / S5.4 显式键集 + ADR-0013 D3③「宁可显示、不可静默消失」）。
		 * 主包被关 ⇒ 本 bundle 根本不会被 require（ADR-0014 S7.2 连坐）；能走到这里却缺键 = 键集与申报表脱钩。
		 */
		/** 由构建期填充：scripts/build-client.mjs 从下方 `} = host;` 的解构逐键派生本表
		 * （源码留空表只为 eslint/typecheck 可读；产物里是一份生成好的键数组）。
		 * 手工加键的正确顺序：① src/host-bridge.js 的 HOST_BRIDGE_BINDINGS ② 本文件的解构名单。 */
		const WALLPAPER_SECTIONS_HOST_REQUIRED = ['React', 'weT', 'ctlText', 'FPS_CAP_VALUES', 'codecLabel', 'switchRow', 'VinylRecord', 'vinylSpinVisible', 'liveFailReasonOf', 'switchTransitionOf', 'SWITCH_TRANSITIONS', 'SWITCH_DIRS', 'SWITCH_DIR_LABELS', 'SWITCH_SPEEDS', 'groupWallpapers', 'startCreateGroup', 'startEditGroup', 'saveEditingGroup', 'cancelEditGroup', 'importPlaylistIntoDraft', 'Toggle', 'rotationIntervalDefault', 'changeUploadDir', 'changeWeAssetsDir', 'uploadWallpaperFile', 'removeUploadWallpaper', 'renderConfirmRow', 'registerPanelSection'];
		for (const key of WALLPAPER_SECTIONS_HOST_REQUIRED) {
		  if (!(key in host)) {
		    throw new Error('[wallpaper-engine-media-bridge] 主 bundle 键集缺少 "' + key
		      + '"（ADR-0014 S5.1 / S5.4 显式键集：要么补键，要么改申报表，不许静默 undefined）');
		  }
		}
		const {
		  React, weT, ctlText, FPS_CAP_VALUES, codecLabel, switchRow,
		  VinylRecord, vinylSpinVisible, liveFailReasonOf,
		  switchTransitionOf, SWITCH_TRANSITIONS, SWITCH_DIRS, SWITCH_DIR_LABELS, SWITCH_SPEEDS,
		  groupWallpapers, startCreateGroup, startEditGroup, saveEditingGroup, cancelEditGroup,
		  importPlaylistIntoDraft, Toggle, rotationIntervalDefault,
		  changeUploadDir, changeWeAssetsDir, uploadWallpaperFile, removeUploadWallpaper, renderConfirmRow,
		  registerPanelSection,
		} = host;

		/* ===== 跨包登记：「壁纸库」页签第一/二/三/四节（全部走面板节注册表）===== */

		// 主包 src/panel-tabs.js 的 `renderWallpaperTab(ctx)` 本身不再内置任何一节，只按注册表续接本包
		// 登记的节（`wePanelSectionsOf('library')`，见 src/extension-registry.js）。三个硬口径：
		//   ① `title` 必须是 **getter**：注册发生在 bundle 求值期，那时 i18n 表 / `weT` 都还没到位，
		//      注册期读词会把 `weT` 拉到求值期（字体包 / 玻璃包的 title getter 同款理由）。
		//   ② order：current=10 / transition=20 / rotation=30 / uploads=40 —— 与搬前组装点里的调用序逐位
		//      相同（S3c 起 current 也走注册表；主包组装点本身只画注册节，不再内置任何一节）。
		//      顺序由 order 决定、不靠求值顺序。
		//   ③ 注册表只登记、不持有状态：ctx 由主包在渲染处构造（一个键都不删），本包不缓存、不自订阅。
		registerPanelSection('library', 'wallpaper-current', {
		  id: 'wallpaper-current',
		  get title() { return weT("当前壁纸"); },
		  order: 10,
		  render: renderWallpaperCurrentSection,
		});
		registerPanelSection('library', 'wallpaper-transition', {
		  id: 'wallpaper-transition',
		  get title() { return weT("切换过场"); },
		  order: 20,
		  render: renderWallpaperTransitionSection,
		});
		registerPanelSection('library', 'wallpaper-rotation', {
		  id: 'wallpaper-rotation',
		  get title() { return weT("自动轮播"); },
		  order: 30,
		  render: renderWallpaperRotationSection,
		});
		registerPanelSection('library', 'wallpaper-uploads', {
		  id: 'wallpaper-uploads',
		  get title() { return weT("自定义壁纸"); },
		  order: 40,
		  render: renderWallpaperUploadsSection,
		});

		/* ===== 跨包登记：「播放」页签的倍速/帧率上限、适配/翻转两节（P-D S3d）===== */

		// 主包 src/panel-tabs.js 的 `renderEffectsTab(ctx)` 在三个内置节之后 append
		// `wePanelSectionsOf('playback')` ⇒ 顺序仍由 order 决定（60 / 70），与搬前调用序逐位相同；
		// 两节仍画在同一个「画面」节容器里（组装点把注册节放在内置节之后），视觉分组不变。
		registerPanelSection('playback', 'wallpaper-playback-rate', {
		  id: 'wallpaper-playback-rate',
		  get title() { return weT("倍速"); },
		  order: 60,
		  render: renderEffectsPlaybackSection,
		});
		registerPanelSection('playback', 'wallpaper-fit', {
		  id: 'wallpaper-fit',
		  get title() { return weT("适配"); },
		  order: 70,
		  render: renderEffectsFitSection,
		});
		if (typeof exports.apply !== "function") exports.apply = () => undefined;
		if (!Array.isArray(exports.inject)) exports.inject = [];
		return module.exports;
	},
});
