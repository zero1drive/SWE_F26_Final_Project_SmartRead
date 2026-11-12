// Talks to Ollama on this laptop. Three things: chat, embed, describeImage.
import { env } from '$env/dynamic/private';

const URL = () => env.OLLAMA_URL || 'http://127.0.0.1:11434';
const CHAT_MODEL = () => env.CHAT_MODEL || 'gemma3:4b';
const EMBED_MODEL = () => env.EMBED_MODEL || 'nomic-embed-text';

/** Thrown when Ollama is off or the model is missing, with a message fit to show users. */
export class AiDown extends Error {}

async function call<T>(path: string, body: object, timeoutMs = 120_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') throw new AiDown('The AI model took too long to answer. Try again in a moment.');
    throw new AiDown('The AI assistant is not running (could not reach Ollama). Everything else in the store still works.');
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404) throw new AiDown(`The AI model is not installed. Run "ollama pull ${'model' in body ? body.model : ''}".`);
    throw new AiDown(`The AI model returned an error: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // base64, no data: prefix
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const out = await call<{ message: { content: string } }>('/api/chat', {
    model: CHAT_MODEL(),
    messages,
    stream: false,
    options: { temperature: 0.3 }
  });
  return out.message.content.trim();
}

/** nomic-embed-text wants a task prefix: "search_query" for questions, "search_document" for stored text. */
export async function embed(texts: string[], kind: 'search_query' | 'search_document'): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out = await call<{ embeddings: number[][] }>('/api/embed', {
    model: EMBED_MODEL(),
    input: texts.map((t) => `${kind}: ${t}`)
  });
  return out.embeddings;
}

export async function describeImage(base64: string): Promise<string> {
  return chat([
    {
      role: 'user',
      content:
        'This is a picture of a book cover or a figure from inside a book. In plain text, list: the title and author if visible, ' +
        'any other visible text, and what the picture shows (subject, setting, mood, era). Be brief and factual.',
      images: [base64]
    }
  ]);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export const models = () => ({ chat: CHAT_MODEL(), embed: EMBED_MODEL() });
