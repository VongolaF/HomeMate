# Profile Layout Update Design

**Goal**
- 进入个人中心不显示左侧导航栏。
- 左上角提供返回首页的 back 按钮。
- HeaderBar 保持显示。

**Non-Goals**
- 不改动鉴权逻辑和登录跳转。
- 不改动个人中心数据加载与保存逻辑。

**Approach**
- 在 `AppShell` 中根据 `pathname` 判断是否为 `/profile`。
- `/profile` 使用 Header + Content 布局，跳过 SideNav。
- 其它页面保持现有 Header + SideNav + Content。
- 在 `ProfilePage` 内容区顶部添加 back 按钮，点击跳转到 `/`。

**UI Details**
- back 按钮位于个人中心页面内容区左上角，卡片上方。
- 使用左箭头图标与文案“返回首页”。
- 与卡片之间留出 12-16px 纵向间距。

**Error Handling**
- 不新增网络请求或错误路径。
- 保持当前消息提示与异常处理。

**Testing**
- AppShell: 当 `pathname` 为 `/profile` 时不渲染 SideNav，HeaderBar 仍存在。
- ProfilePage: back 按钮存在，点击后调用 `router.push("/")`。
