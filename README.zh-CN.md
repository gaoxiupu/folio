# Folio

一个开源的 AI 聊天组件，专为个人作品集设计。访客可以询问关于你的任何问题——项目、技能、经历——AI 会基于你提供的文件实时作答。

**[English](./README.md)**

---

## 功能亮点

- **RAG 驱动的对话** — 将 `.md`、`.txt` 或 `.pdf` 文件放入 `/knowledge`，AI 基于你的内容回答问题
- **实时重建索引** — 服务运行期间增删改文件，自动重新索引，无需重启
- **AI 人设定制** — 通过 `persona.md` 自定义助手的语气和风格
- **富文本卡片 UI** — 项目、工作经历、技能、联系方式在聊天中以内嵌卡片渲染
- **技能雷达图** — 以 SVG 雷达图可视化展示技能分布
- **数字名片** — 访客可一键查看和复制你的联系方式
- **社交媒体集成** — AI 根据话题智能推荐你的社交账号
- **GitHub 集成** — 自动抓取公开仓库、语言统计和个人信息
- **访客留言板** — 访客可填写留言表单，信息保存到本地文件
- **防滥用保护** — IP 限流、每日 API 预算、来源校验
- **单行嵌入** — 一个 `<script>` 标签即可在任何网站渲染聊天组件

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 API Key：

```env
ARK_API_KEY=<你的火山引擎 Ark API Key>
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # 可选，默认 localhost:3000
```

### 3. 添加知识文件

将 `.md`、`.txt` 或 `.pdf` 文件放入 `/knowledge`：

```
knowledge/
├── about.md        ← 个人介绍、背景
├── projects.md     ← 项目经历
├── skills.md       ← 技术栈、工具
├── contact.md      ← 联系方式
└── resume.pdf      ← 简历（支持 PDF）
```

### 4. 启动开发服务器

```bash
npm run dev
```

等待终端出现 `[indexer] Done` 即可。之后对 `/knowledge` 中文件的任何修改都会触发自动重新索引。

---

## 可选功能

所有可选功能都是**零配置**的——`/knowledge` 中没有对应文件时，该功能自动禁用。每种配置文件都提供了 `.example` 模板供参考。

### AI 人设 — `knowledge/persona.md`

定义助手的性格和说话风格。

```markdown
## AI 人设
你是一位热情、专业的助手。
语气：像朋友聊天一样轻松，但不失专业。
可以偶尔使用 emoji。
```

完整模板见 `knowledge/persona.md.example`。

### 数字名片 — `knowledge/card.json`

访客询问"怎么联系你"时，展示一张可复制的名片卡片。

```json
{
  "name": "张三",
  "title": "全栈开发工程师",
  "email": "zhangsan@example.com",
  "github": "https://github.com/zhangsan"
}
```

### 社交媒体 — `knowledge/socials.json`

AI 会在访客对相关话题感兴趣时，主动推荐你的社交账号。

```json
[
  {
    "platform": "GitHub",
    "url": "https://github.com/zhangsan",
    "handle": "@zhangsan"
  }
]
```

### 技能雷达图 — `knowledge/skills.json`

访客询问技能概况时，渲染 SVG 雷达图。

```json
{
  "axes": [
    { "label": "前端", "value": 80 },
    { "label": "后端", "value": 70 },
    { "label": "DevOps", "value": 60 }
  ]
}
```

至少需要 3 个维度，值范围为 0-100。

### GitHub 集成 — `knowledge/github.json`

启动时自动抓取你的 GitHub 公开信息：热门仓库、语言分布、个人资料。数据缓存 24 小时。

```json
{
  "username": "your-github-username",
  "highlights": ["your-best-repo"]
}
```

可在 `.env` 中设置 `GITHUB_TOKEN` 将 API 限额从 60 提升至 5,000 次/小时。

### 访客留言板

无需配置。当访客表达留言意愿时，AI 自动展示内嵌表单。留言保存到 `knowledge/messages.json`。

---

## 嵌入聊天组件

在你的作品集 HTML 中添加一个 `<script>` 标签（放在 `</body>` 之前）：

```html
<!-- 开发环境 -->
<script src="http://localhost:3000/api/widget/widget.js"></script>

<!-- 生产环境 — 将 NEXT_PUBLIC_BASE_URL 设为你的部署域名 -->
<script src="https://your-domain.com/api/widget/widget.js"></script>
```

---

## 项目结构

```
folio/
├── knowledge/                        ← 在此放入你的文件
│   ├── *.example                     ← 配置模板
│   ├── persona.md                    ← AI 人设（可选）
│   ├── card.json                     ← 数字名片（可选）
│   ├── socials.json                  ← 社交链接（可选）
│   ├── skills.json                   ← 技能雷达图（可选）
│   └── github.json                   ← GitHub 集成（可选）
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts         ← 流式聊天接口
│   │   │   ├── message/route.ts      ← 留言接口
│   │   │   └── widget/route.ts       ← 可嵌入的 widget.js
│   │   └── widget/page.tsx           ← 聊天 UI（在 iframe 中渲染）
│   ├── instrumentation.ts            ← 启动：索引 + 文件监听 + GitHub 同步
│   └── lib/
│       ├── indexer.ts                ← 扫描 /knowledge，分块，嵌入
│       ├── embeddings.ts             ← 嵌入 API 封装
│       ├── retriever.ts              ← 向量搜索
│       ├── knowledge-config.ts       ← 加载可选配置文件
│       ├── github-sync.ts            ← GitHub API 抓取 + 缓存
│       ├── rate-limit.ts             ← IP 限流
│       └── cost-limit.ts             ← 每日 API 预算
├── vector.db                         ← 自动生成，已 gitignore
└── .env.example
```

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `ARK_API_KEY` | 是 | — | 火山引擎 Ark API Key（聊天 + 嵌入） |
| `NEXT_PUBLIC_BASE_URL` | 否 | `http://localhost:3000` | Widget 脚本的 Base URL |
| `GITHUB_TOKEN` | 否 | — | GitHub 个人访问令牌（提升 API 限额） |
| `RATE_LIMIT_PER_MINUTE` | 否 | `10` | 每 IP 每分钟最大请求数 |
| `RATE_LIMIT_PER_DAY` | 否 | `100` | 每 IP 每天最大请求数 |
| `DAILY_API_BUDGET` | 否 | `500` | 每天全局最大请求总数 |
| `ALLOWED_ORIGINS` | 否 | — | 允许的 API 请求来源（逗号分隔） |
| `ALLOWED_EMBED_DOMAINS` | 否 | `*` | 允许嵌入 Widget 的域名（CSP） |

---

## 技术栈

- **Next.js 14**（App Router）
- **Vercel AI SDK** — 流式聊天
- **sqlite-vss** — 本地 SQLite 向量存储，零配置
- **chokidar** — 文件监听，实时重建索引
- **pdf-parse** — PDF 文本提取
- **Tailwind CSS**
- **TypeScript** 全栈

---

## 许可证

MIT
