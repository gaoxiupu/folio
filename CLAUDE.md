# Folio

## What is this
Folio is an open-source AI chat widget for portfolios. It reads files from a local `/knowledge` folder and uses RAG (Retrieval-Augmented Generation) to answer visitors' questions about the portfolio owner — their projects, skills, and background.

The owner drops `.md`, `.txt`, or `.pdf` files into `/knowledge`, runs the project locally, and embeds the generated `<script>` tag into their portfolio website.

## Core design decisions
- **No admin UI** — knowledge base is managed via files in `/knowledge`
- **No database** — vector store uses SQLite + sqlite-vss (single file, zero config)
- **No auth system** — local-only, single user
- **File-driven** — on `npm run dev`, the app scans `/knowledge` and rebuilds the vector index automatically
- **Single embed** — exposes one `<script>` tag that renders the chat widget on any website

## Tech stack
- **Framework**: Next.js 14 (App Router)
- **AI**: Claude API via Vercel AI SDK (streaming)
- **RAG**: LangChain.js
- **Vector store**: sqlite-vss (local SQLite file)
- **File parsing**: pdf-parse, native fs for .md/.txt
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript throughout

## Project structure
```
folio/
├── knowledge/               ← user drops files here
│   └── example.md
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts     ← streaming chat endpoint
│   │   │   └── widget/
│   │   │       └── route.ts     ← serves widget JS bundle
│   │   └── widget/
│   │       └── page.tsx         ← chat UI (iframe'd into widget)
│   └── lib/
│       ├── indexer.ts           ← scans /knowledge, chunks, embeds
│       └── retriever.ts         ← vector search + RAG chain
├── vector.db                    ← auto-generated, gitignored
├── .env.example
└── CLAUDE.md
```

## Environment variables
```
CLAUDE_API_KEY=        # required — Anthropic API key
NEXT_PUBLIC_BASE_URL=  # optional — defaults to localhost:3000
```

## How the RAG flow works
1. On startup, `indexer.ts` scans all files in `/knowledge`
2. Files are chunked and embedded using Claude's embedding API
3. Embeddings are stored in `vector.db` (sqlite-vss)
4. On each chat message, `retriever.ts` fetches the top-k relevant chunks
5. Chunks are injected into the Claude prompt as context
6. Response streams back to the widget via Vercel AI SDK

## Widget embed
The chat widget is embedded on the portfolio site via:
```html
<script src="https://your-domain/api/widget/widget.js"></script>
```
The script injects an iframe pointing to `/widget`, which renders the chat UI.

## Code conventions
- All files in TypeScript, strict mode
- API routes use Next.js App Router conventions (route.ts)
- Keep indexer.ts and retriever.ts as pure functions — no side effects at import time
- Error messages should be user-friendly (the end user is a non-technical portfolio visitor)