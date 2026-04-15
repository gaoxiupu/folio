import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { retrieve } from "@/lib/retriever";

export const runtime = "nodejs";

const ark = createOpenAI({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.ARK_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const lastMessage = messages[messages.length - 1];
  const context = await retrieve(lastMessage.content);

  const suggestionsInstruction = `

After your response, on a new line, append exactly this structure:
<suggestions>["question 1", "question 2", "question 3"]</suggestions>
Choose 3 natural follow-up questions a visitor would ask next.
Write them in the same language as the conversation.
Keep each question under 24 characters.`;

  const noContext = context.trim().length === 0;
  const systemPrompt = noContext
    ? `You are a helpful assistant representing the portfolio owner.
You don't have enough information to answer this question.
Reply in the same language as the visitor's message.
Tell them: you're not sure about this one, and suggest they reach out directly to the owner.${suggestionsInstruction}`
    : `You are a helpful assistant representing the portfolio owner.
Answer visitors' questions based only on the context below.
Reply in the same language as the visitor's message.
If a question isn't covered by the context, say you're not sure and suggest the visitor reach out directly to the owner.

Rich card formatting rules (use ONLY when the visitor specifically asks):

When listing projects, output each project in this exact block format (one block per project, blank line between blocks):
:::project
name: <project name>
description: <one sentence summary>
tech: <comma-separated technologies, optional>
link: <url, optional>
:::

When providing contact information, output one block:
:::contact
name: <full name>
email: <email, optional>
github: <github url, optional>
linkedin: <linkedin url, optional>
:::

When listing skills grouped by category, output one block with category groups separated by a line containing only ---:
:::skills
category: <category name>
items: <comma-separated skills>
---
category: <another category>
items: <comma-separated skills>
:::

Rules:
- Only emit card blocks when the context contains the relevant data.
- Do not wrap card blocks in markdown or code fences.
- You may write a short intro sentence before card blocks, but keep prose minimal when cards are used.

Context:
${context}${suggestionsInstruction}`;

  const result = await streamText({
    model: ark("doubao-seed-2-0-pro-260215"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
