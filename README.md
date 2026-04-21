# Folio

[English](#english) | [简体中文](#简体中文)

<a name="english"></a>
## English

An open-source AI chat widget for portfolios. Drop your files into `/knowledge`, get a `<script>` tag that answers visitors' questions about you — your projects and experience.

### How it works

1. **Add your files** — Drop resumes, project docs, or any `.md` / `.txt` / `.pdf` into the `knowledge/` folder. Optionally add `card.json`, `socials.json`, `github.json` for rich interactive cards.
2. **Run locally** — `npm run dev` compiles your knowledge into a structured wiki and starts the server.
3. **Embed anywhere** — Add one `<script>` tag to your portfolio site. Visitors get a floating chat button that opens an AI assistant answering questions about you.

The key insight: instead of chunk-based RAG (which fragments your content), Folio compiles all your knowledge files into a **structured wiki** — cross-referenced pages organized by topic (overview, experience, projects, etc.). The AI answers from this holistic context, not from isolated text chunks.

### Features

- **Rich interactive cards** — Projects, work experience, GitHub profile, digital business card, contact form
- **Auto-compiled wiki** — Knowledge files are compiled into structured wiki pages at startup; only recompiles when files change
- **GitHub integration** — Automatically fetches your GitHub profile, top repos, and language distribution
- **Multi-language** — Responds in the visitor's language automatically
- **Rate limiting** — Per-IP and daily budget limits to prevent abuse
- **File watching** — Knowledge changes are detected and wiki recompiled in real-time during development

### Quick Start

```bash
# Clone
git clone https://github.com/your-username/folio.git
cd folio

# Install
npm install

# Configure
./setup.sh
# Edit .env (add ARK_API_KEY) and files in knowledge/

# Run
npm run dev
```

Open `http://localhost:3000` to see the widget, or embed it on your site:

```html
<script src="http://localhost:3000/api/widget/widget.js"></script>
```

### Data Privacy

Folio is designed to keep your personal data strictly separated from the codebase:

- **`knowledge/`**: This directory is gitignored. Your private docs and data stay local.
- **`persona.md`**: Also gitignored. Your AI personality config is yours.
- **`.env`**: Private keys are never committed.

To update the project while keeping your data, simply `git pull origin main`. Your local `knowledge/` and `.env` will remain untouched.

### Knowledge Files

Place these files in the `knowledge/` directory:

| File | Location | Purpose | Required |
|------|----------|---------|----------|
| `persona.md` | Root | Personality and behavior instructions for the AI | No |
| `*.pdf` / `*.md` / `*.txt` | `knowledge/` | Resumes, project docs, any text content | At least one |
| `card.json` | `knowledge/` | Business card data (name, title, email, etc.) | No |
| `socials.json` | `knowledge/` | Social media profile links | No |
| `github.json` | `knowledge/` | GitHub username for profile integration | No |

Example files are provided (`*.example`) — copy and edit them.

### Project Structure

```
folio/
├── knowledge.example/       ← templates for your data
├── knowledge/               ← your content files go here
│   ├── card.json
│   └── resume.pdf
├── persona.md               ← your personality config
├── wiki/                    ← auto-generated (gitignored)
│   ├── index.md
│   ├── overview.md
│   ├── experience.md
│   └── ...
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        ← streaming chat API
│   │   │   └── widget/route.ts      ← widget JS bundle
│   │   └── widget/page.tsx          ← chat UI
│   └── lib/
│       ├── wiki-compiler.ts         ← knowledge → wiki compilation
│       ├── wiki-loader.ts           ← loads wiki into prompt
│       ├── knowledge-config.ts      ← JSON config loader
│       └── github-sync.ts           ← GitHub profile fetcher
└── .env
```

### Architecture

```
knowledge/          ← raw files (immutable)
    ↓ compile (on startup, only when files change)
wiki/               ← structured wiki pages (auto-generated)
    ↓ load (at query time, zero API calls)
prompt              ← wiki context + persona + structured data
    ↓ stream
visitor             ← AI response with rich cards
```

**No database. No vector store. No embedding API.** Just files, one LLM call for compilation, and file reads at query time.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ARK_API_KEY` | Yes | — | Volces ARK API key (Doubao model) |
| `NEXT_PUBLIC_BASE_URL` | No | `localhost:3000` | Public URL for widget embed |
| `RATE_LIMIT_PER_MINUTE` | No | 10 | Requests per IP per minute |
| `RATE_LIMIT_PER_DAY` | No | 100 | Requests per IP per day |
| `DAILY_API_BUDGET` | No | 500 | Total daily API request limit |
| `GITHUB_TOKEN` | No | — | GitHub token for higher API rate limits |

### Automatic Deployment

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-worker.yml`.
Push to the `personal-deploy` branch, or run the workflow manually from the GitHub Actions tab, and it will build with OpenNext and deploy to Cloudflare Workers.

Add these GitHub repository secrets before enabling it:

| Secret | Required | Purpose |
|--------|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Yes | Allows GitHub Actions to deploy with Wrangler |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Selects the Cloudflare account to deploy into |
| `ARK_API_KEY` | Yes | Runtime API key for chat responses |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public deployment URL used by the widget embed script |

This setup follows Cloudflare's official GitHub Actions flow using `cloudflare/wrangler-action@v3`.
If you want to lock down iframe embedding later, add `ALLOWED_EMBED_DOMAINS` in the Cloudflare dashboard or extend the workflow to sync it as a Worker secret.

### Tech Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Doubao API** via Vercel AI SDK (streaming)
- **Wiki compiler** — Doubao seed model generates structured wiki from raw files
- **Tailwind CSS** + shadcn/ui
- **pdf-parse** for PDF text extraction

### License

MIT

---

<a name="简体中文"></a>
## 简体中文

一个开源的 AI 聊天组件，专为个人作品集设计。把文件放进 `/knowledge`，获得一个 `<script>` 标签，嵌入你的网站后，访客就能向 AI 提问关于你的任何问题——项目经验、工作经历等。

### 工作原理

1. **添加文件** — 将简历、项目文档或任何 `.md` / `.txt` / `.pdf` 放入 `knowledge/` 文件夹。可选添加 `card.json`、`socials.json`、`github.json` 以启用富交互卡片。
2. **本地运行** — `npm run dev` 会自动将知识文件编译为结构化 wiki 并启动服务器。
3. **嵌入网站** — 在你的作品集网站中加入一行 `<script>` 标签，访客即可看到悬浮聊天按钮，与 AI 助手对话。

核心理念：不使用传统的分块式 RAG（会把内容碎片化），而是将所有知识文件编译成**结构化 wiki**——按主题组织的、跨文件关联的页面（概述、经历、项目等）。AI 从完整的上下文中回答问题，而非孤立的文本片段。

### 功能特性

- **富交互卡片** — 项目展示、工作经历、GitHub 主页、数字名片、留言表单
- **自动编译 wiki** — 启动时将知识文件编译为结构化 wiki 页面；仅文件变更时重新编译
- **GitHub 集成** — 自动获取 GitHub 主页、热门仓库和语言分布
- **多语言支持** — 自动以访客使用的语言回复
- **频率限制** — 按 IP 和每日预算限制防止滥用
- **文件监听** — 开发过程中知识文件变更自动重新编译

### 快速开始

```bash
# 克隆
git clone https://github.com/your-username/folio.git
cd folio

# 安装依赖
npm install

# 配置环境变量
./setup.sh
# 编辑 .env (填入 ARK_API_KEY) 和 knowledge/ 中的文件

# 启动
npm run dev
```

打开 `http://localhost:3000` 查看组件效果，或嵌入你的网站：

```html
<script src="http://localhost:3000/api/widget/widget.js"></script>
```

### 数据隐私

Folio 的设计初衷是将个人数据与代码逻辑严格分离：

- **`knowledge/`**: 该目录已被加入 `.gitignore`。你的私密文档和数据仅保存在本地。
- **`persona.md`**: 同样被忽略。你的 AI 人设配置属于你自己。
- **`.env`**: 密钥永远不会被提交。

如果你想在保持数据的情况下更新代码，只需执行 `git pull origin main`。你的本地 `knowledge/` 和 `.env` 文件将保持不变。

### 知识文件

将以下文件放在 `knowledge/` 目录下：

| 文件 | 位置 | 用途 | 必需 |
|------|------|------|------|
| `persona.md` | 根目录 | AI 的性格和行为指令 | 否 |
| `*.pdf` / `*.md` / `*.txt` | `knowledge/` | 简历、项目文档、任何文本内容 | 至少一个 |
| `card.json` | `knowledge/` | 名片数据（姓名、职位、邮箱等） | 否 |
| `socials.json` | `knowledge/` | 社交媒体链接 | 否 |
| `github.json` | `knowledge/` | GitHub 用户名（用于主页集成） | 否 |

项目提供了示例文件（`*.example`），复制并编辑即可。

### 项目结构

```
folio/
├── knowledge.example/       ← 数据模板
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

### 架构

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

### 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `ARK_API_KEY` | 是 | — | 火山引擎 ARK API 密钥（豆包模型） |
| `NEXT_PUBLIC_BASE_URL` | 否 | `localhost:3000` | 组件嵌入的公网 URL |
| `RATE_LIMIT_PER_MINUTE` | No | 10 | 每 IP 每分钟请求限制 |
| `RATE_LIMIT_PER_DAY` | No | 100 | 每 IP 每日请求限制 |
| `DAILY_API_BUDGET` | No | 500 | 全局每日 API 请求上限 |
| `GITHUB_TOKEN` | 否 | — | GitHub Token（提高 API 频率限制） |

### 自动部署

仓库已经包含 GitHub Actions 工作流 `.github/workflows/deploy-worker.yml`。
当你推送到 `personal-deploy` 分支，或者在 GitHub Actions 页面手动触发时，它会自动执行 OpenNext 构建并部署到 Cloudflare Workers。

启用前请先在 GitHub 仓库里配置这些 Secrets：

| Secret | 必需 | 作用 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | 是 | 允许 GitHub Actions 通过 Wrangler 部署 |
| `CLOUDFLARE_ACCOUNT_ID` | 是 | 指定部署到哪个 Cloudflare 账号 |
| `ARK_API_KEY` | 是 | 聊天接口运行时所需的 API Key |
| `NEXT_PUBLIC_BASE_URL` | 是 | Widget 脚本生成 iframe 地址时使用的公网 URL |

这套配置基于 Cloudflare 官方推荐的 `cloudflare/wrangler-action@v3` 工作流。
如果你之后想收紧 iframe 嵌入范围，可以再在 Cloudflare 面板里添加 `ALLOWED_EMBED_DOMAINS`，或把它补进这个工作流同步到 Worker secret。

### 技术栈

- **Next.js 14**（App Router）+ React 18 + TypeScript
- **豆包 API** via Vercel AI SDK（流式输出）
- **Wiki 编译器** — 豆包 seed 模型将原始文件编译为结构化 wiki
- **Tailwind CSS** + shadcn/ui
- **pdf-parse** 解析 PDF 文本

### 许可证

MIT
