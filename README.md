# 无障碍出行小程序

为老人、行动不便人士提供可信的无障碍出行信息。

## 📱 项目简介

这是一个微信小程序项目，帮助轮椅使用者、老年人家属、带婴儿车家庭等用户快速查找和了解景点的无障碍设施信息。

## ✨ 核心功能

- 🏙️ **城市景点浏览**：支持多城市景点列表，快速筛选无障碍景点
- 🔍 **智能搜索**：支持关键词搜索和多种筛选条件（评分、类型等）
- 📸 **详细信息**：展示景点的无障碍设施、路线、注意事项等详细信息
- ⭐ **用户评价**：查看其他用户的真实体验评价
- ❤️ **收藏功能**：收藏感兴趣的景点，方便后续查看
- 📝 **提交评价**：用户可以提交自己的无障碍体验评价

## 🛠️ 技术栈

- **前端框架**：微信小程序原生框架
- **数据库**：Supabase (PostgreSQL)
- **AI 能力**：
  - Gemini API（图片识别和分类）
  - AI 评分系统（无障碍设施评分）
- **数据来源**：小红书、维基百科

## 📁 项目结构

```
miniprogram/
├── pages/              # 页面文件
│   ├── index/         # 首页（城市和景点列表）
│   ├── place-detail/  # 景点详情页
│   ├── review-add/    # 添加评价页
│   └── profile/       # 个人中心
├── utils/             # 工具函数
│   ├── supabase.ts    # Supabase 数据库服务
│   └── ...
├── scripts/           # 自动化脚本
│   ├── auto-process-city-places.ts  # 自动处理城市景点
│   └── ...
└── app.ts             # 小程序入口文件
```

## 🚀 快速开始

### 环境要求

- 微信开发者工具
- Node.js (用于运行脚本)

### 安装依赖

```bash
npm install
```

### 配置

1. 配置 Supabase 连接（在 `utils/supabase.ts` 中）
2. 配置 Gemini API Key（在 `scripts/utils/gemini-ocr.ts` 中）

### 运行

使用微信开发者工具打开项目目录即可。

## 📊 数据管理

项目使用 Supabase 作为后端数据库，包含以下主要表：

- `cities` - 城市信息
- `places` - 景点信息
- `reviews` - 用户评价
- `favorites` - 用户收藏
- `accessibility_images` - 无障碍设施图片

## 🤖 AI 功能

### 图片识别
- 使用 Gemini Vision API 自动识别和分类无障碍设施图片
- 支持验证图片与景点的匹配度

### 智能评分
- AI 自动对景点进行无障碍设施评分
- 基于多个维度：入口、路面、坡道、电梯、卫生间等

### 信息提取
- 从用户评价中自动提取无障碍信息
- 生成结构化的无障碍数据

## 📝 开发指南

详细的开发指南请参考：

- [自动化处理指南](./scripts/AUTO_PROCESS_ALL_WUHAN_PLACES.md)
- [AI 字段提取规范](./utils/AI_FIELD_EXTRACTION_PROMPT.md)
- [无障碍信息提取要求](./utils/AI_FIELD_EXTRACTION_PROMPT.md)

## 🔐 安全提示

⚠️ **重要**：
- 不要将 API keys 和敏感信息提交到 Git
- `.cursor/mcp.json` 文件已排除在版本控制之外
- 生产环境请使用环境变量管理敏感信息

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
