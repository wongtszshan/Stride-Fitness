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
