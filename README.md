# Folio

An open-source AI chat widget for portfolios. Visitors can ask questions about you — your projects, skills, and background — and get answers powered by RAG over files you provide.

## How it works

1. Drop `.md`, `.txt`, or `.pdf` files into `/knowledge`.
2. On startup the app chunks, embeds, and stores them in a local SQLite vector store.
3. When a visitor asks a question, the most relevant chunks are retrieved and injected into the LLM prompt.
4. The response streams back to the chat widget in real time.
5. While the dev server is running, any file you add, edit, or delete in `/knowledge` is re-indexed automatically — no restart needed.

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

On startup the app indexes everything in `/knowledge` (watch for `[indexer] Done` in the terminal). From then on, any change to a file in `/knowledge` triggers an automatic re-index.

---

## Embedding the widget

Add one `<script>` tag to your portfolio's HTML (just before `</body>`):

```html
<!-- Development -->
<script src="http://localhost:3000/api/widget/widget.js"></script>

<!-- Production — set NEXT_PUBLIC_BASE_URL to your deployed domain -->
<script src="https://your-domain.com/api/widget/widget.js"></script>
```

The script injects a floating chat button in the bottom-right corner. No other changes to your portfolio are needed.

---

## Fallback behavior

If a visitor asks something not covered by your knowledge files, the assistant says it's not sure and suggests reaching out to you directly — it never hallucinates answers from outside your content.

---

## Project structure

```
folio/
├── knowledge/               ← drop your files here (.md / .txt / .pdf)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts      ← streaming chat endpoint
│   │   │   └── widget/route.ts    ← serves the embeddable widget.js
│   │   └── widget/page.tsx        ← chat UI (rendered inside the iframe)
│   ├── instrumentation.ts         ← startup: index + file watcher
│   └── lib/
│       ├── indexer.ts             ← scans /knowledge, chunks, embeds
│       ├── embeddings.ts          ← embedding API wrapper
│       └── retriever.ts           ← vector search
├── vector.db                      ← auto-generated, gitignored
└── .env.example
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ARK_API_KEY` | Yes | — | Volcengine Ark API key (chat + embeddings) |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | Base URL used to build the widget `<script>` src |

## Tech stack

- **Next.js 14** (App Router)
- **Vercel AI SDK** — streaming chat
- **sqlite-vss** — local SQLite vector store, zero config
- **chokidar** — file watching for live re-indexing
- **pdf-parse** — PDF text extraction
- **Tailwind CSS**
- **TypeScript** throughout
