# Folio

## What is this
Folio is an open-source AI chat widget for portfolios. It reads files from a local `/knowledge` folder and compiles them into a structured wiki, which is used as context to answer visitors' questions about the portfolio owner — their projects, background, and experience.

The owner drops `.md`, `.txt`, `.pdf`, or `.json` files into `/knowledge`, runs the project locally, and embeds the generated `<script>` tag into their portfolio website.

## Core design decisions
- **No admin UI** — knowledge base is managed via files in `/knowledge`
- **No database** — wiki is compiled as markdown files in `/wiki`
- **No auth system** — local-only, single user
- **File-driven** — on `npm run dev`, the app compiles `/knowledge` into wiki pages automatically
- **Single embed** — exposes one `<script>` tag that renders the chat widget on any website
- **Wiki over RAG** — uses pre-compiled wiki pages instead of chunk-based RAG for better cross-referencing and recall

## Tech stack
- **Framework**: Next.js 14 (App Router)
- **AI**: Doubao API via Vercel AI SDK (streaming)
- **Knowledge**: Wiki compiler (Doubao seed model generates structured wiki pages from raw files)
- **File parsing**: pdf-parse, native fs for .md/.txt/.json
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript throughout

## Project structure
```
folio/
├── knowledge/               ← user drops files here (immutable)
│   ├── card.json            ← business card data
│   ├── socials.json         ← social media links
│   ├── github.json          ← GitHub profile config
│   └── *.pdf                ← resume, documents
├── wiki/                    ← auto-generated wiki (gitignored)
│   └── ...
├── persona.md               ← personality & behavior instructions
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts         ← streaming chat endpoint
│   │   │   └── widget/
│   │   │       └── route.ts         ← serves widget JS bundle
│   │   └── widget/
│   │       └── page.tsx             ← chat UI (iframe'd into widget)
│   └── lib/
│       ├── wiki-compiler.ts         ← compiles knowledge/ into wiki/
│       ├── wiki-loader.ts           ← loads wiki pages into prompt context
│       └── knowledge-config.ts      ← loads JSON configs for rich cards
├── .env.example
└── AGENTS.md
```

## Environment variables
```
ARK_API_KEY=            # required — Volces ARK API key (Doubao model)
NEXT_PUBLIC_BASE_URL=   # optional — defaults to localhost:3000
```

## How the knowledge flow works
1. On startup, `wiki-compiler.ts` scans all files in `/knowledge`
2. PDF text is extracted via pdf-parse; JSON/MD files are read directly
3. All content is sent to the Doubao seed model, which generates structured wiki pages
4. Pages are written to `/wiki/` with an `index.md` for navigation
5. Compilation is cached — only re-runs when knowledge files change
6. On each chat message, `wiki-loader.ts` reads wiki pages and injects them as context
7. For small wikis: all pages loaded. For large wikis: progressive disclosure via index
8. Response streams back to the widget via Vercel AI SDK

## Widget embed
The chat widget is embedded on the portfolio site via:
```html
<script src="https://your-domain/api/widget/widget.js"></script>
```
The script injects an iframe pointing to `/widget`, which renders the chat UI.

## Code conventions
- All files in TypeScript, strict mode
- API routes use Next.js App Router conventions (route.ts)
- Keep wiki-compiler.ts and wiki-loader.ts as pure functions — no side effects at import time
- Error messages should be user-friendly (the end user is a non-technical portfolio visitor)
