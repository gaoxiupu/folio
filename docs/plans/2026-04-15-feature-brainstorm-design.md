# Folio 功能扩展设计文档

> 日期：2026-04-15
> 状态：Draft
> 核心约束：严格保持极简哲学（无数据库、无后台、文件驱动）

---

## 目录

1. [AI 角色扮演模式](#1-ai-角色扮演模式)
2. [社交媒体聚合](#2-社交媒体聚合)
3. [名片分享模式](#3-名片分享模式)
5. [访客留言板](#5-访客留言板)
7. [GitHub 集成](#7-github-集成)
8. [访客统计面板](#8-访客统计面板)


---

## 实施批次

| 批次 | 功能 | 理由 |
|------|------|------|
| 第一批 | AI 角色扮演、社交聚合、名片分享、彩蛋互动 | 低复杂度，快速见效 |
| 第二批 | 访客留言板、技能雷达图、GitHub 集成 | 核心价值，中等复杂度 |
| 第三批 | 访客统计面板、共同点发现 | 锦上添花 |

---

## 1. AI 角色扮演模式

### 概述
通过在 `/knowledge` 中放置 `persona.md` 文件，让作品集主人自定义 AI 的性格和说话风格。不配置时使用默认的专业助手风格。

### 用户故事
> 作为一个有个性的设计师，我希望我的 AI 助手用轻松幽默的语气介绍我，而不是像个客服机器人。

### 设计细节

**配置文件**：`/knowledge/persona.md`

```markdown
# AI 人设

你是一位热情、幽默的创业伙伴，正在帮主人介绍他。
说话风格：轻松、有感染力、偶尔用 emoji。
称呼访客为"朋友"。
在介绍项目时要表现出主人的热情和骄傲。
避免使用过于正式的措辞。
```

**实现方式**：
- `indexer.ts` 启动时检测 `persona.md` 是否存在
- 如果存在，将其内容注入到聊天 prompt 的 system message 前段
- 如果不存在，使用默认 system prompt（当前的专业助手风格）
- `persona.md` 也参与 RAG 检索，但优先级最高，始终作为 system prompt 的一部分

**影响范围**：
- 修改 `src/lib/retriever.ts` — system prompt 构建逻辑
- 修改 `src/lib/indexer.ts` — 检测并标记 persona 文件
- 无需修改 UI

---

## 2. 社交媒体聚合

### 概述
通过 `socials.json` 配置社交链接，AI 在对话中智能推荐相关社交平台。

### 用户故事
> 作为一个访客，当我表示对设计作品感兴趣时，AI 能主动告诉我"他在 Dribbble 上有更多案例"。

### 设计细节

**配置文件**：`/knowledge/socials.json`

```json
{
  "links": [
    {
      "platform": "github",
      "url": "https://github.com/username",
      "label": "GitHub",
      "tags": ["代码", "开源", "项目"]
    },
    {
      "platform": "dribbble",
      "url": "https://dribbble.com/username",
      "label": "Dribbble",
      "tags": ["设计", "UI", "视觉"]
    },
    {
      "platform": "twitter",
      "url": "https://twitter.com/username",
      "label": "Twitter / X",
      "tags": ["想法", "动态", "日常"]
    },
    {
      "platform": "zhihu",
      "url": "https://zhihu.com/people/username",
      "label": "知乎",
      "tags": ["技术文章", "思考", "回答"]
    }
  ]
}
```

**实现方式**：
- `indexer.ts` 启动时读取 `socials.json`，将其内容嵌入向量库作为可检索知识
- 在聊天 prompt 中额外注入一份社交链接列表，指示 AI 在访客对某方面感兴趣时主动推荐
- 当 AI 推荐社交平台时，回复中包含可点击链接（利用现有的卡片组件渲染）

**影响范围**：
- 修改 `src/lib/indexer.ts` — 读取 socials.json
- 修改 `src/lib/retriever.ts` — 注入社交上下文到 prompt
- 可选：新增社交链接卡片 UI 组件

---

## 3. 名片分享模式

### 概述
访客说"发我你的联系方式"或"给我你的名片"时，AI 生成一张精简的数字名片，访客可一键复制。

### 用户故事
> 作为一个 HR，聊完之后我想快速保存这个候选人的联系方式，不需要手动记。

### 设计细节

**配置文件**：`/knowledge/card.json`

```json
{
  "name": "张三",
  "title": "全栈开发工程师",
  "email": "zhangsan@example.com",
  "github": "github.com/zhangsan",
  "location": "北京",
  "tags": ["React", "Node.js", "TypeScript"]
}
```

**触发机制**：
- AI 检测到访客表达"想要联系方式"、"怎么联系你"、"发个名片"等意图
- 自动从 `card.json` 中提取信息，生成结构化名片卡片

**名片卡片 UI**：
```
┌─────────────────────────┐
│  张三                    │
│  全栈开发工程师           │
│                          │
│  📍 北京                 │
│  ✉️  zhangsan@email.com   │
│  🔗 github.com/zhangsan  │
│                          │
│  React · Node.js · TS    │
│                          │
│  [ 📋 复制名片信息 ]      │
└─────────────────────────┘
```

**实现方式**：
- `indexer.ts` 读取 `card.json`
- `retriever.ts` 在 system prompt 中注入名片信息和触发指令
- Widget UI 新增名片卡片组件（类似现有项目卡片风格）
- 复制按钮使用 `navigator.clipboard.writeText()`

**影响范围**：
- 修改 `src/lib/indexer.ts` — 读取 card.json
- 修改 `src/lib/retriever.ts` — 注入名片上下文
- 修改 `src/app/widget/page.tsx` — 新增名片卡片组件

---


---

## 5. 访客留言板

### 概述
访客在对话中表达想留言、联系或合作的意愿时，AI 引导访客留下信息，自动保存到 `/knowledge/messages.json`。作品集主人查看此文件即可看到所有留言。

### 用户故事
> 作为一个作品集主人，我希望有趣的访客能留下他们的联系方式和想法，我不用 24 小时盯着邮箱。

### 设计细节

**存储文件**：`/knowledge/messages.json`

```json
{
  "messages": [
    {
      "id": "msg_1713168000000",
      "timestamp": "2026-04-15T10:00:00Z",
      "visitor": {
        "name": "李四（访客自述）",
        "role": "前端开发者",
        "contact": "lisi@example.com"
      },
      "summary": "对 Three.js 项目很感兴趣，正在寻找远程协作机会",
      "interested_in": ["Three.js 项目", "远程协作"],
      "ip_hash": "a1b2c3d4"
    }
  ]
}
```

**交互流程**：
1. 访客在对话中说"帮我留个言"、"我想联系他"、"有合作机会"等
2. AI 回复："太好了！我可以帮你留言。能告诉我你的名字、联系方式和想说什么吗？"
3. 访客提供信息后，AI 确认并调用留言 API
4. 留言写入 `messages.json`，AI 回复"留言已保存，他会尽快回复你！"

**API 设计**：
- 新增 `POST /api/message` 端点
- 接收 `{ name, contact, message }` 参数
- 服务端追加写入 `messages.json`
- 包含基础防刷保护（复用现有的 rate limiting）

**实现方式**：
- 新增 `src/app/api/message/route.ts` — 留言 API
- 修改 `src/lib/retriever.ts` — 在 prompt 中指示 AI 识别留言意图
- Widget UI 新增留言表单卡片（姓名、联系方式、留言内容）

**影响范围**：
- 新增 `src/app/api/message/route.ts`
- 修改 `src/lib/retriever.ts`
- 修改 `src/app/widget/page.tsx` — 留言表单 UI
- 自动生成 `messages.json`（gitignore 或不忽略，看用户偏好）


---

## 7. GitHub 集成

### 概述
配置 GitHub 用户名后，启动时自动抓取公开数据（热门仓库、语言分布、贡献统计），作为知识库的一部分供 AI 引用。

### 用户故事
> 作为一个访客，我想知道这个开发者在 GitHub 上活跃不活跃，有哪些开源贡献。

### 设计细节

**配置文件**：`/knowledge/github.json`

```json
{
  "username": "zhangsan",
  "highlights": ["my-best-project", "open-source-lib"]
}
```

**自动抓取的数据**：
- 用户 profile（头像、bio、公司、位置）
- 语言分布（top 5 语言及百分比）
- 热门仓库（star 数 top 5，名称、描述、star 数、语言）
- 近期活动（最近 30 天的 commits / PRs 数量）
- highlights 中指定仓库的详细信息（README 摘要）

**存储方式**：
- 启动时通过 GitHub 公开 API 抓取
- 缓存到 `/knowledge/.github-cache.json`（gitignore）
- 设置缓存过期时间（默认 24 小时）
- 如果缓存未过期，跳过抓取

**API 调用规划**：
- `GET https://api.github.com/users/{username}` — 基本信息
- `GET https://api.github.com/users/{username}/repos?sort=stars&per_page=10` — 仓库
- `GET https://api.github.com/repos/{username}/{repo}` — 指定仓库详情
- 无需 OAuth，全部使用公开 API（rate limit 60次/小时，足够）

**实现方式**：
- 新增 `src/lib/github-sync.ts` — GitHub 数据抓取和缓存模块
- `indexer.ts` 启动时调用 github-sync，将数据加入向量库
- `retriever.ts` 在 prompt 中注入 GitHub 数据摘要
- 当访客问 GitHub 相关问题时，AI 基于实时数据回答

**影响范围**：
- 新增 `src/lib/github-sync.ts`
- 修改 `src/lib/indexer.ts` — 集成 GitHub 数据
- 修改 `src/lib/retriever.ts` — 注入 GitHub 上下文
- 可选：新增 GitHub 活跃度卡片 UI

---

## 8. 访客统计面板

### 概述
用 `analytics.json` 文件记录访客对话统计，作品集主人查看文件即可了解访客兴趣和行为模式。

### 用户故事
> 作为一个作品集主人，我想知道哪些话题最受关注、有没有 HR 在看我的作品集。

### 设计细节

**存储文件**：`/knowledge/analytics.json`

```json
{
  "daily": {
    "2026-04-15": {
      "conversations": 5,
      "messages": 23,
      "top_questions": [
        { "q": "你做过哪些项目？", "count": 3 },
        { "q": "你用的什么技术栈？", "count": 2 },
        { "q": "你在哪里工作？", "count": 2 }
      ]
    }
  },
  "all_time": {
    "total_conversations": 42,
    "total_messages": 187,
    "top_topics": [
      { "topic": "项目经历", "count": 15 },
      { "topic": "技术栈", "count": 12 },
      { "topic": "工作经历", "count": 9 }
    ],
    "leave_messages": 3
  }
}
```

**数据采集方式**：
- 每次对话结束时（访客关闭窗口或超时），记录本次对话统计
- 服务端在 chat API 中异步写入（不阻塞响应）
- 话题提取由 AI 在生成回复时附带（prompt 中指示"同时返回本次对话的主要话题"）
- 每日自动归档，保持文件大小合理

**实现方式**：
- 新增 `src/lib/analytics.ts` — 统计数据写入模块
- `chat/route.ts` 在对话结束时调用 analytics 模块
- 利用现有的 rate limiting 中的 IP hash 做去重（同一 IP 短时间内只计一次对话）

**影响范围**：
- 新增 `src/lib/analytics.ts`
- 修改 `src/app/api/chat/route.ts` — 添加统计埋点
- 自动生成 `analytics.json`


---

## 通用架构说明

### 配置文件约定

所有新增的配置文件都放在 `/knowledge/` 目录下：

| 文件 | 用途 | 必需？ |
|------|------|--------|
| `persona.md` | AI 人设定义 | 可选 |
| `socials.json` | 社交链接 | 可选 |
| `card.json` | 数字名片 | 可选 |
| `easter-eggs.json` | 彩蛋配置 | 可选 |
| `skills.json` | 技能分布 | 可选 |
| `github.json` | GitHub 集成 | 可选 |
| `messages.json` | 访客留言（自动生成） | 自动 |
| `analytics.json` | 访客统计（自动生成） | 自动 |
| `.github-cache.json` | GitHub 缓存（自动生成） | 自动 |

### 启动流程更新

```
npm run dev
  │
  ├─ 扫描 /knowledge/ 下的 .md / .txt / .pdf（现有）
  │
  ├─ 读取可选配置文件（新增）
  │   ├─ persona.md    → 注入 system prompt
  │   ├─ socials.json  → 加入知识库 + 注入 prompt
  │   ├─ card.json     → 注入 prompt
  │   ├─ skills.json   → 注入 prompt
  │   └─ easter-eggs.json → 加载触发词映射
  │
  ├─ GitHub 数据同步（新增）
  │   └─ github.json → 检查缓存 → 抓取/使用缓存 → 加入知识库
  │
  └─ 构建向量索引（现有）
```

### 设计原则

1. **零配置启动** — 所有功能都是可选的，没有对应的配置文件就不启用
2. **文件即配置** — 所有设置通过 `/knowledge/` 下的文件管理
3. **渐进增强** — 每个功能独立，互不依赖，可以单独实现和部署
4. **无破坏性** — 所有改动向后兼容，不影响现有功能
