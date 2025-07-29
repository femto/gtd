# GTD工具 - Getting Things Done任务管理系统

[![Build Status](https://github.com/your-org/gtd-tool/workflows/CI/badge.svg)](https://github.com/your-org/gtd-tool/actions)
[![Coverage Status](https://codecov.io/gh/your-org/gtd-tool/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/gtd-tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA](https://img.shields.io/badge/PWA-enabled-blue.svg)](https://web.dev/progressive-web-apps/)

> 基于David Allen的Getting Things Done方法论的现代任务管理工具

## 🌟 特性

- 📝 **完整的GTD工作流程** - 收集、处理、组织、执行、回顾
- 🗂️ **情境化任务管理** - 根据环境和工具组织任务
- 📅 **智能日程管理** - 日历视图和时间安排
- 🔍 **强大的搜索功能** - 全文搜索和智能过滤
- 📱 **PWA支持** - 离线使用，可安装到设备
- 🔄 **多设备同步** - 数据在多个设备间同步
- 🌙 **暗色主题** - 护眼的暗色模式
- ♿ **无障碍支持** - 符合WCAG 2.1标准
- 🎯 **高性能** - 虚拟滚动，支持大量数据
- 🔒 **数据安全** - 本地加密存储

## 🚀 快速开始

### 在线使用

访问 [https://gtd-tool.netlify.app](https://gtd-tool.netlify.app) 立即开始使用。

### 本地开发

#### 系统要求

- Node.js 18+
- npm 9+

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/your-org/gtd-tool.git
cd gtd-tool/gtd-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 在浏览器中打开 http://localhost:3000
```

#### 其他命令

```bash
# 运行测试
npm run test

# 运行测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📖 使用指南

### GTD方法论简介

GTD (Getting Things Done) 是一套个人生产力系统，包含五个核心步骤：

1. **收集 (Capture)** - 记录所有想法和任务
2. **处理 (Process)** - 决定每个项目的意义和行动
3. **组织 (Organize)** - 将任务分类整理
4. **执行 (Engage)** - 根据情境选择合适的行动
5. **回顾 (Review)** - 定期检查和更新系统

### 基本工作流程

#### 1. 收集想法
- 使用快速输入功能记录所有想法
- 支持文本、语音和图片输入
- 快捷键：`Ctrl+N`

#### 2. 处理工作篮
- 使用处理向导对每个项目进行分类
- 遵循2分钟规则
- 明确下一步行动

#### 3. 组织任务
- 按情境分类任务
- 创建项目管理复杂任务
- 设置优先级和时间

#### 4. 执行任务
- 查看今日任务
- 根据当前情境选择任务
- 专注执行，及时标记完成

#### 5. 定期回顾
- 每周进行系统回顾
- 更新项目状态
- 清理完成的任务

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建任务 |
| `Ctrl+F` | 搜索 |
| `1-5` | 切换页面 |
| `Space` | 标记完成 |
| `E` | 编辑任务 |

完整的使用指南请查看 [用户指南](docs/user-guide.md)。

## 🛠️ 技术架构

### 技术栈

- **前端框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI组件**: Tailwind CSS + Headless UI
- **本地存储**: IndexedDB (Dexie.js)
- **构建工具**: Vite
- **测试框架**: Vitest + React Testing Library
- **PWA**: Workbox

### 项目结构

```
src/
├── components/        # React组件
│   ├── capture/      # 收集功能
│   ├── process/      # 处理功能
│   ├── organize/     # 组织功能
│   ├── engage/       # 执行功能
│   ├── review/       # 回顾功能
│   ├── common/       # 通用组件
│   └── sync/         # 同步功能
├── hooks/            # 自定义Hooks
├── store/            # 状态管理
├── database/         # 数据访问层
├── services/         # 业务服务
├── utils/            # 工具函数
├── types/            # TypeScript类型
└── contexts/         # React上下文
```

### 核心概念

- **InboxItem**: 工作篮中的未处理项目
- **Action**: 具体的可执行任务
- **Project**: 需要多个步骤的复杂任务
- **Context**: 执行任务所需的环境或工具

详细的技术文档请查看 [开发者指南](docs/developer-guide.md)。

## 🧪 测试

项目包含完整的测试套件：

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试UI
npm run test:ui
```

### 测试类型

- **单元测试**: 组件和函数的单元测试
- **集成测试**: 组件间交互测试
- **E2E测试**: 完整用户流程测试

## 📦 部署

### 静态托管

项目支持部署到各种静态托管平台：

```bash
# 构建生产版本
npm run build

# 部署到Netlify
npm run deploy:netlify

# 部署到Vercel
npm run deploy:vercel
```

### Docker部署

```bash
# 构建Docker镜像
docker build -t gtd-tool .

# 运行容器
docker run -p 8080:8080 gtd-tool
```

### 环境变量

```bash
# .env.production
VITE_APP_TITLE=GTD工具
VITE_API_BASE_URL=https://api.gtd-tool.com
VITE_ENABLE_ANALYTICS=true
```

## 🤝 贡献

我们欢迎所有形式的贡献！

### 贡献方式

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写测试用例
- 更新相关文档

### 提交信息规范

```
type(scope): description

feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试相关
chore: 构建相关
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [David Allen](https://gettingthingsdone.com/) - GTD方法论创始人
- [React](https://reactjs.org/) - 前端框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Heroicons](https://heroicons.com/) - 图标库

## 📞 联系我们

- 项目主页: https://github.com/your-org/gtd-tool
- 问题反馈: https://github.com/your-org/gtd-tool/issues
- 邮箱: support@gtd-tool.com
- 文档: https://gtd-tool-docs.netlify.app

## 🗺️ 路线图

- [ ] 移动端原生应用
- [ ] 团队协作功能
- [ ] 更多同步选项
- [ ] AI智能建议
- [ ] 数据分析报告
- [ ] 第三方集成

---

**让GTD工具帮助您提高生产力，实现更好的工作生活平衡！** 🚀