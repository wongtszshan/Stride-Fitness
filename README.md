# Stride · 我的健身管家

个人健身记录网页 App（V1.0）。

## 已实现
- 响应式首页和月历
- 自定义训练计划与预览确认
- 完成 / 未完成 / 休息状态
- 训练时长、打卡和备注
- 每周统计、体重折线图和本地规则总结
- 浏览器本地存储及 JSON 导入 / 导出

## 数据与隐私
当前版本数据只保存于**浏览器本地**。没有在前端保存 GitHub Token 或 AI API Key，**也尚未接通云端同步和 Kimi**。若更换设备或清除浏览器数据，请先导出 JSON。

## 预期后端架构
GitHub Pages（公开前端） → Cloudflare Worker（鉴权、限流、AI Proxy） → GitHub 私库 `wongtszshan/Stride-Fitness-data`（私有数据）。

Worker 需要单独配置服务端密钥及最小权限 GitHub Token。仅拥有 ChatGPT 的 GitHub 连接权限，不能等同于 Worker 拥有 GitHub API Token。

## 部署
静态首页：`index.html`。启用 GitHub Pages，选择 `main` 分支根目录 `/(root)`。项目预期网址：https://wongtszshan.github.io/Stride-Fitness/ （需 Pages 实际启用后才可访问）。

## 下一阶段
- Worker 认证和私库数据版本号冲突检测
- Kimi API 接入和 JSON Schema 校验
- 安全的数据同步状态提示
- PWA manifest / Service Worker / 应用图标


## V1.1 · 桌面图标与 AI（2026-11-15）

图标已提交：`icon.svg`（PWA SVG 图标）、`apple-touch-icon.png`（生成图标的 PNG 小图）。`manifest.webmanifest` 定义 PWA；`sw.js` 提供基础离线静态资源缓存。iPhone 如仍出现旧图标，请从桌面移除快捷方式，重新在 Safari 添加到主屏幕。

### Kimi AI Worker

- 已部署名称：`stride-fitness-api`
- Worker 地址：`https://stride-fitness-api.wangtszshan.workers.dev`
- 状态接口：`GET /health`（`configured: true` 才可使用真实 AI）
- API 接口：`POST /ai`，任务分别为 `plan`、`summary`
- 源代码：`worker/stride-ai.js`

**需要在 Cloudflare → Workers & Pages → stride-fitness-api → Settings → Variables and Secrets 设置**：

1. `KIMI_API_KEY`：类型 **Secret**，由你在 Kimi 开发平台申请的密钥；不要发到公开仓库
2. `STRIDE_ACCESS_SECRET`：类型 **Secret**，自定义较长的随机口令；在 Stride App 设置页填写同一口令以启用调用
3. （可选）`KIMI_MODEL`：默认 `kimi-k2.5`，按 Kimi 平台账户可使用的模型调整
4. （可选）`KIMI_BASE_URL`：默认 `https://api.moonshot.ai/v1`，如果你的密钥来自中国大陆平台，使用对应的 `https://api.moonshot.cn/v1`

两个必需的 Secret 未配置时，AI 请求会返回 503，并保留本地规则计划生成和总结功能。Kimi API 可能产生费用。

**安全说明**：网站前端不会保存或发送 Kimi API Key，用户的 Worker 访问口令只暂存于当前浏览器 sessionStorage。Worker 强制验证口令并校验请求来源。此个人版未接入多用户账户和正式的 API 速率限制，不适用于公开多人使用。

**目前仍未实现**：GitHub 私库的云端自动同步；体重数据依然仅保存在浏览器本地。


## V1.2 • UI / UX 打磨

- 独立的 `css/style.css` 与 `js/app.js`，`index.html` 只包含页面结构
- 首页新视觉：绿色主题欢迎区、今日快捷打卡、下次训练预告与最近记录
- 日历：本月切换、返回今天、训练状态图例和手机端快速跳转日期详情
- 训练计划：统一预览卡片，更明确区分预览与写入
- 设置页：分区卡片，保留原有 AI Worker 连接流程
- 图表与手机版底部导航统一视觉层级与留白
- Service Worker 缓存版本升级为 `stride-shell-v3`，支持新 CSS/JS 缓存

**兼容性**：本次没有更改本地存储键 `stride_fit_v1` 或记录数据结构。AI 密钥尚未配置时，仍可使用本地规则生成计划。


## V1.3：AI 服务商自由切换

设置页可选择 **Kimi** 或 **Claude**，选项保存在浏览器本地（`stride_ai_provider`），训练计划和 AI 周总结将使用当前选定服务商。后端 `stride-fitness-api` 通过各自官方 API 调用，不在 GitHub 公库保存密钥。

Cloudflare Worker → Settings → Variables and Secrets：
- `STRIDE_ACCESS_SECRET`：必需，服务访问口令，两个服务商共用
- `KIMI_API_KEY`：仅使用 Kimi 时必需
- `CLAUDE_API_KEY`：仅使用 Claude 时必需
- `KIMI_MODEL`：可选，默认 `kimi-k2.5`
- `CLAUDE_MODEL`：可选，默认 `claude-sonnet-4-6`（应按实际可访问型号调整）
- `KIMI_BASE_URL`：可选，默认 `https://api.moonshot.ai/v1`

只需配置你实际使用的服务商密钥，另一个可以留空。更换 AI 提供商不会修改或清空已有计划及打卡。AI 仍是按需手动触发，没有自动批量调用，也未实现私库自动同步。请注意服务商的使用额度与 API 计费。

参考官方文档：Claude Messages API https://platform.claude.com/docs/en/api/messages ，Moonshot https://platform.moonshot.ai/ 。


## V1.7：GitHub 私库自动同步

已加入 Cloudflare Worker 私库接口 `POST /sync/read` 与 `POST /sync/write`，均要求 `x-stride-passphrase`。Worker 访问私库 **需要额外配置** `STRIDE_GITHUB_TOKEN`（Secret），仅允许访问 `wongtszshan/Stride-Fitness-data` 私库的 **Contents: Read and write**。请创建 GitHub Fine-grained PAT，仓库只选择 Stride-Fitness-data，不要使用仓库范围过大的 classic token。设置地址： https://github.com/settings/personal-access-tokens/new 。

Cloudflare → Workers & Pages → stride-fitness-api → Settings → Variables and Secrets → Add → Secret：名称 `STRIDE_GITHUB_TOKEN`，值为上述 GitHub fine-grained token。**绝不要把 token 填在 Stride 网页输入框、聊天内容或公开 GitHub 仓库里。** Cloudflare Worker 上已有的 `CLAUDE_API_KEY`、`KIMI_API_KEY` 与 `STRIDE_ACCESS_SECRET` 无须修改。

首次使用：在 Stride 设置中保存 `STRIDE_ACCESS_SECRET` 值，再点击「连接 / 检查云端」。若私库尚无记录，而本机已有记录，系统会先问是否将本机记录上传；若私库已有数据，先确认是否恢复。连接完成后，保存训练计划、打卡与体重会自动排队上传，也可点击「立即同步」。关闭浏览器或掉线时修改会先保存在本机，下次连接后继续尝试。多人/多设备同时编辑可能发生冲突；冲突时阻止覆盖，并展示警告。提供「从私库恢复」以明确选择云端版本，恢复前可先导出本机 JSON。

同步 JSON 格式保留 `schemaVersion`、`revision`、`updatedAt`、`data`；`data` 包含 `plans`、`logs`、`weights` 和 `nickname`，兼容旧版本。运动/目标偏好目前仍保存在本机；AI Key 和访问口令永远不写入私库。

注意：单一 GitHub 文件的 sha 乐观并发检查可阻止覆盖新版本，但不进行自动字段合并。删除本机数据不会删除私库数据。
