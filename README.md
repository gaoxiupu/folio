# Folio

An open-source AI chat widget for portfolios. Drop your files into `/knowledge`, get a `<script>` tag that answers visitors' questions about you — your projects, skills, and experience.

## How it works

1. **Add your files** — Drop resumes, project docs, or any `.md` / `.txt` / `.pdf` into the `knowledge/` folder. Optionally add `card.json`, `skills.json`, `socials.json` for rich interactive cards.
2. **Run locally** — `npm run dev` compiles your knowledge into a structured wiki and starts the server.
3. **Embed anywhere** — Add one `<script>` tag to your portfolio site. Visitors get a floating chat button that opens an AI assistant answering questions about you.

The key insight: instead of chunk-based RAG (which fragments your content), Folio compiles all your knowledge files into a **structured wiki** — cross-referenced pages organized by topic (overview, experience, skills, projects, etc.). The AI answers from this holistic context, not from isolated text chunks.

## Features

- **Rich interactive cards** — Projects, work experience, skills radar, GitHub profile, digital business card, contact form
- **Auto-compiled wiki** — Knowledge files are compiled into structured wiki pages at startup; only recompiles when files change
- **GitHub integration** — Automatically fetches your GitHub profile, top repos, and language distribution
- **Multi-language** — Responds in the visitor's language automatically
- **Rate limiting** — Per-IP and daily budget limits to prevent abuse
- **File watching** — Knowledge changes are detected and wiki recompiled in real-time during development

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/folio.git
cd folio

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — add your ARK_API_KEY

# Add your knowledge files to knowledge/
cp knowledge/persona.md.example knowledge/persona.md
cp knowledge/card.json.example knowledge/card.json
# ... edit with your own info

# Run
npm run dev
```

Open `http://localhost:3000` to see the widget, or embed it on your site:

```html
<script src="http://localhost:3000/api/widget/widget.js"></script>
```

## Knowledge Files

Place these files in the `knowledge/` directory:

| File | Purpose | Required |
|------|---------|----------|
| `persona.md` | Personality and behavior instructions for the AI | No |
| `*.pdf` / `*.md` / `*.txt` | Resumes, project docs, any text content | At least one |
| `card.json` | Business card data (name, title, email, etc.) | No |
| `skills.json` | Skill ratings for radar chart display | No |
| `socials.json` | Social media profile links | No |
| `github.json` | GitHub username for profile integration | No |

Example files are provided (`*.example`) — copy and edit them.

## Project Structure

```
folio/
├── knowledge/               ← your files go here
│   ├── persona.md
│   ├── card.json
│   ├── skills.json
│   └── resume.pdf
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

## Architecture

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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ARK_API_KEY` | Yes | — | Volces ARK API key (Doubao model) |
| `NEXT_PUBLIC_BASE_URL` | No | `localhost:3000` | Public URL for widget embed |
| `RATE_LIMIT_PER_MINUTE` | No | 10 | Requests per IP per minute |
| `RATE_LIMIT_PER_DAY` | No | 100 | Requests per IP per day |
| `DAILY_API_BUDGET` | No | 500 | Total daily API request limit |
| `GITHUB_TOKEN` | No | — | GitHub token for higher API rate limits |

## Tech Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Doubao API** via Vercel AI SDK (streaming)
- **Wiki compiler** — Doubao seed model generates structured wiki from raw files
- **Tailwind CSS** + shadcn/ui
- **pdf-parse** for PDF text extraction

## License

MIT
