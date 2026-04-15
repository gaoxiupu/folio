# Folio

An open-source AI chat widget for portfolios. Visitors ask questions about you — your projects, skills, and background — and get instant answers powered by RAG over files you provide.

**[中文文档](./README.zh-CN.md)**

---

## Features

- **RAG-powered chat** — drop `.md`, `.txt`, or `.pdf` files into `/knowledge` and the AI answers based on your content
- **Live re-indexing** — add, edit, or delete files while the server is running; changes are picked up automatically
- **AI persona** — customize the assistant's tone and style via `persona.md`
- **Rich card UI** — projects, experience, skills, and contact cards rendered inline in the chat
- **Skills radar chart** — visualize your skill distribution as an SVG radar
- **Digital business card** — visitors can view and copy your contact info in one click
- **Social media integration** — AI recommends your social profiles when relevant
- **GitHub integration** — auto-fetches your public repos, language stats, and profile info
- **Leave-a-message form** — visitors can leave their contact info and messages for you
- **Abuse prevention** — per-IP rate limiting, daily API budget, and origin checking
- **Single embed** — one `<script>` tag renders the chat widget on any website

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your API key:

```env
ARK_API_KEY=<your Volcengine Ark API key>
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # optional, defaults to localhost:3000
```

### 3. Add your knowledge files

Put `.md`, `.txt`, or `.pdf` files in `/knowledge`:

```
knowledge/
├── about.md        ← who you are, your background
├── projects.md     ← your notable projects
├── skills.md       ← tech stack, tools
├── contact.md      ← how to reach you
└── resume.pdf      ← your résumé (PDF supported)
```

### 4. Start the dev server

```bash
npm run dev
```

Wait for `[indexer] Done` in the terminal. From then on, any change to a file in `/knowledge` triggers an automatic re-index.

---

## Optional features

All optional features are **zero-config** — if the corresponding file doesn't exist in `/knowledge`, the feature is simply disabled. Example templates are provided as `*.example` files.

### AI persona — `knowledge/persona.md`

Define the assistant's personality and speaking style.

```markdown
## AI Persona
You are a friendly, knowledgeable assistant.
Tone: warm but professional.
Use emojis sparingly.
```

See `knowledge/persona.md.example` for a full template.

### Digital business card — `knowledge/card.json`

Visitors who ask "how can I reach you?" get a copyable contact card.

```json
{
  "name": "Your Name",
  "title": "Your Title",
  "email": "you@example.com",
  "github": "https://github.com/your-username"
}
```

### Social media — `knowledge/socials.json`

AI recommends your social profiles when visitors show interest in a related topic.

```json
[
  {
    "platform": "GitHub",
    "url": "https://github.com/your-username",
    "handle": "@your-username"
  }
]
```

### Skills radar — `knowledge/skills.json`

Renders an SVG radar chart when visitors ask about your skills.

```json
{
  "axes": [
    { "label": "Frontend", "value": 80 },
    { "label": "Backend", "value": 70 },
    { "label": "DevOps", "value": 60 }
  ]
}
```

Requires at least 3 axes. Values range from 0 to 100.

### GitHub integration — `knowledge/github.json`

Auto-fetches your public GitHub profile, top repos, and language distribution on startup. Cached for 24 hours.

```json
{
  "username": "your-github-username",
  "highlights": ["your-best-repo"]
}
```

Optionally set `GITHUB_TOKEN` in `.env` to raise the GitHub API rate limit from 60 to 5,000 requests/hour.

### Leave-a-message

No configuration needed. When visitors say they want to leave a message, the AI presents an inline form. Submissions are saved to `knowledge/messages.json`.

---

## Embedding the widget

Add one `<script>` tag to your portfolio's HTML (just before `</body>`):

```html
<!-- Development -->
<script src="http://localhost:3000/api/widget/widget.js"></script>

<!-- Production — set NEXT_PUBLIC_BASE_URL to your deployed domain -->
<script src="https://your-domain.com/api/widget/widget.js"></script>
```

---

## Project structure

```
folio/
├── knowledge/                        ← drop your files here
│   ├── *.example                     ← config templates
│   ├── persona.md                    ← AI persona (optional)
│   ├── card.json                     ← business card (optional)
│   ├── socials.json                  ← social links (optional)
│   ├── skills.json                   ← radar chart (optional)
│   └── github.json                   ← GitHub sync (optional)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts         ← streaming chat endpoint
│   │   │   ├── message/route.ts      ← leave-a-message API
│   │   │   └── widget/route.ts       ← serves embeddable widget.js
│   │   └── widget/page.tsx           ← chat UI (rendered in iframe)
│   ├── instrumentation.ts            ← startup: index + file watcher + GitHub sync
│   └── lib/
│       ├── indexer.ts                ← scans /knowledge, chunks, embeds
│       ├── embeddings.ts             ← embedding API wrapper
│       ├── retriever.ts              ← vector search
│       ├── knowledge-config.ts       ← loads optional config files
│       ├── github-sync.ts            ← GitHub API fetch + cache
│       ├── rate-limit.ts             ← per-IP rate limiter
│       └── cost-limit.ts             ← daily API budget
├── vector.db                         ← auto-generated, gitignored
└── .env.example
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ARK_API_KEY` | Yes | — | Volcengine Ark API key (chat + embeddings) |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | Base URL for widget script src |
| `GITHUB_TOKEN` | No | — | GitHub personal access token (raises rate limit) |
| `RATE_LIMIT_PER_MINUTE` | No | `10` | Max chat requests per IP per minute |
| `RATE_LIMIT_PER_DAY` | No | `100` | Max chat requests per IP per day |
| `DAILY_API_BUDGET` | No | `500` | Max total chat requests per day |
| `ALLOWED_ORIGINS` | No | — | Comma-separated allowed origins for API |
| `ALLOWED_EMBED_DOMAINS` | No | `*` | Domains allowed to embed the widget (CSP) |

---

## Tech stack

- **Next.js 14** (App Router)
- **Vercel AI SDK** — streaming chat
- **sqlite-vss** — local SQLite vector store, zero config
- **chokidar** — file watching for live re-indexing
- **pdf-parse** — PDF text extraction
- **Tailwind CSS**
- **TypeScript** throughout

---

## License

MIT
