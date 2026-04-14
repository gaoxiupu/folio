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

  const noContext = context.trim().length === 0;
  const systemPrompt = noContext
    ? `You are a helpful assistant representing the portfolio owner.
You don't have enough information to answer this question.
Reply in the same language as the visitor's message.
Tell them: you're not sure about this one, and suggest they reach out directly to the owner.`
    : `You are a helpful assistant representing the portfolio owner.
Answer visitors' questions based only on the context below.
Reply in the same language as the visitor's message.
If a question isn't covered by the context, say you're not sure and suggest the visitor reach out directly to the owner.

Context:
${context}`;

  const result = await streamText({
    model: ark("doubao-seed-2-0-pro-260215"),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
