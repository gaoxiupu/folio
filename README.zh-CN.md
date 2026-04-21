# Folio

一个开源的 AI 聊天组件，专为个人作品集设计。把文件放进 `/knowledge`，获得一个 `<script>` 标签，嵌入你的网站后，访客就能向 AI 提问关于你的任何问题——项目经验、工作经历等。

## 工作原理

1. **添加文件** — 将简历、项目文档或任何 `.md` / `.txt` / `.pdf` 放入 `knowledge/` 文件夹。可选添加 `card.json`、`socials.json`、`github.json` 以启用富交互卡片。
2. **本地运行** — `npm run dev` 会自动将知识文件编译为结构化 wiki 并启动服务器。
3. **嵌入网站** — 在你的作品集网站中加入一行 `<script>` 标签，访客即可看到悬浮聊天按钮，与 AI 助手对话。

核心理念：不使用传统的分块式 RAG（会把内容碎片化），而是将所有知识文件编译成**结构化 wiki**——按主题组织的、跨文件关联的页面（概述、经历、项目等）。AI 从完整的上下文中回答问题，而非孤立的文本片段。

## 功能特性

- **富交互卡片** — 项目展示、工作经历、GitHub 主页、数字名片、留言表单
- **自动编译 wiki** — 启动时将知识文件编译为结构化 wiki 页面；仅文件变更时重新编译
- **GitHub 集成** — 自动获取 GitHub 主页、热门仓库和语言分布
- **多语言支持** — 自动以访客使用的语言回复
- **频率限制** — 按 IP 和每日预算限制防止滥用
- **文件监听** — 开发过程中知识文件变更自动重新编译

## 快速开始

```bash
# 克隆
git clone https://github.com/your-username/folio.git
cd folio

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env — 填入你的 ARK_API_KEY

# 添加知识文件到 knowledge/
cp persona.md.example persona.md
cp knowledge/card.json.example knowledge/card.json
# ... 编辑为你自己的信息

# 启动
npm run dev
```

打开 `http://localhost:3000` 查看组件效果，或嵌入你的网站：

```html
<script src="http://localhost:3000/api/widget/widget.js"></script>
```

## 知识文件

将以下文件放在 `knowledge/` 目录下：

| 文件 | 位置 | 用途 | 必需 |
|------|------|------|------|
| `persona.md` | 根目录 | AI 的性格和行为指令 | 否 |
| `*.pdf` / `*.md` / `*.txt` | `knowledge/` | 简历、项目文档、任何文本内容 | 至少一个 |
| `card.json` | `knowledge/` | 名片数据（姓名、职位、邮箱等） | 否 |
| `socials.json` | `knowledge/` | 社交媒体链接 | 否 |
| `github.json` | `knowledge/` | GitHub 用户名（用于主页集成） | 否 |

项目提供了示例文件（`*.example`），复制并编辑即可。

## 项目结构

```
folio/
├── knowledge/               ← 你的内容文件放在这里
│   ├── card.json
│   └── resume.pdf
├── persona.md               ← 你的性格人设配置
├── wiki/                    ← 自动生成（不入版本库）
│   ├── index.md
│   ├── overview.md
│   ├── experience.md
│   └── ...
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        ← 流式聊天 API
│   │   │   └── widget/route.ts      ← 组件 JS 脚本
│   │   └── widget/page.tsx          ← 聊天界面
│   └── lib/
│       ├── wiki-compiler.ts         ← 知识 → wiki 编译器
│       ├── wiki-loader.ts           ← wiki 加载到 prompt
│       ├── knowledge-config.ts      ← JSON 配置加载器
│       └── github-sync.ts           ← GitHub 主页同步
└── .env
```

## 架构

```
knowledge/          ← 原始文件（不可变）
    ↓ 编译（启动时执行，仅文件变更时触发）
wiki/               ← 结构化 wiki 页面（自动生成）
    ↓ 加载（查询时执行，零 API 调用）
prompt              ← wiki 上下文 + 人设 + 结构化数据
    ↓ 流式输出
visitor             ← AI 回复 + 富交互卡片
```

**无需数据库。无需向量存储。无需 Embedding API。** 只有文件、一次编译用的 LLM 调用、以及查询时的文件读取。

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `ARK_API_KEY` | 是 | — | 火山引擎 ARK API 密钥（豆包模型） |
| `NEXT_PUBLIC_BASE_URL` | 否 | `localhost:3000` | 组件嵌入的公网 URL |
| `RATE_LIMIT_PER_MINUTE` | 否 | 10 | 每 IP 每分钟请求限制 |
| `RATE_LIMIT_PER_DAY` | 否 | 100 | 每 IP 每日请求限制 |
| `DAILY_API_BUDGET` | 否 | 500 | 全局每日 API 请求上限 |
| `GITHUB_TOKEN` | 否 | — | GitHub Token（提高 API 频率限制） |

## 技术栈

- **Next.js 14**（App Router）+ React 18 + TypeScript
- **豆包 API** via Vercel AI SDK（流式输出）
- **Wiki 编译器** — 豆包 seed 模型将原始文件编译为结构化 wiki
- **Tailwind CSS** + shadcn/ui
- **pdf-parse** 解析 PDF 文本

## 许可证

MIT
