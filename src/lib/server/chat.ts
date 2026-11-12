// The chat box pipeline, in order:
//   1. build the facts this role may see
//   2. decline finance / other-user questions for anyone but the SU (no model call)
//   3. RAG: compare the question with paragraphs of data/store_info/*.md
//   4. otherwise ask the LLM with the role's facts
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { read, write, type User } from './db';
import { AiDown, chat, cosine, embed, models } from './ai';
import { PROMOTE_AFTER_PURCHASES, PROMOTE_AFTER_SPENT, RAG_MIN_SCORE, VC_DISCOUNT, money, purchaseHistory, usd } from './rules';
import { financeReport, orderLists } from './reports';

const STORE_DIR = path.resolve('data/store_info');

export interface Reply {
  answer: string;
  source: 'rag' | 'llm' | 'declined' | 'error';
  files?: string[];
  score?: number; // best store-file similarity, shown so the RAG decision is visible
}

// ---------- embeddings with a cache in data/embeddings.json ----------

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);

/** Embeds texts, reusing cached vectors when the text and model are unchanged. */
export async function cachedVectors(items: { key: string; text: string }[]): Promise<number[][]> {
  const cache = read('embeddings');
  const model = models().embed;
  const missing = items.filter((it) => cache[it.key]?.hash !== hash(it.text) || cache[it.key]?.model !== model);
  if (missing.length) {
    const vecs = await embed(missing.map((m) => m.text), 'search_document');
    missing.forEach((m, i) => (cache[m.key] = { hash: hash(m.text), model, vector: vecs[i] }));
    write('embeddings', cache);
  }
  return items.map((it) => cache[it.key].vector);
}

function storeChunks(): { file: string; text: string }[] {
  if (!fs.existsSync(STORE_DIR)) return [];
  const chunks: { file: string; text: string }[] = [];
  for (const file of fs.readdirSync(STORE_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(STORE_DIR, file), 'utf8');
    const title = raw.match(/^#\s+(.+)$/m)?.[1] ?? file;
    for (const para of raw.split(/\r?\n\s*\r?\n/)) {
      const text = para.trim();
      if (text && !text.startsWith('#')) chunks.push({ file, text: `${title}: ${text}` });
    }
  }
  return chunks;
}

// ---------- step 1: what this role may know ----------

function roleContext(user: User | null): string {
  const lines: string[] = [];
  if (!user) {
    lines.push('The person chatting is a visitor who is not logged in. They have no account.');
    return lines.join('\n');
  }
  const ledger = read('ledger');
  const books = read('books');
  const title = (id?: string) => books.find((b) => b.id === id)?.title ?? 'unknown book';

  if (user.role === 'SU') {
    const f = financeReport();
    const lists = orderLists();
    lines.push(`The person chatting is ${user.name}, the store manager (super-user). They may see everything below.`);
    lines.push(
      'Finance report:',
      `- Revenue from book sales: ${usd(f.revenue)}`,
      `- Fines collected: ${usd(f.fines)}`,
      `- Customer deposits: ${usd(f.deposits)}`,
      `- Money held in customer balances: ${usd(f.customerBalances)}`
    );
    lines.push('Sales per book: ' + (f.sales.map((s) => `${s.title}: ${s.copies} sold, ${usd(s.revenue)}`).join('; ') || 'none'));
    lines.push('Customers: ' + read('users').filter((u) => u.role !== 'SU').map((u) =>
      `${u.name} (@${u.username}), ${u.role === 'VC' ? 'VIP' : 'member'}, balance ${usd(u.balance)}, ${u.warnings} warnings${u.suspended ? ', SUSPENDED' : ''}`).join('; '));
    lines.push('To-order list: ' + (lists.toOrder.map((b) => b.title).join(', ') || 'empty'));
    lines.push('No-order list: ' + (lists.noOrder.map((b) => b.title).join(', ') || 'empty'));
    return lines.join('\n');
  }

  const h = purchaseHistory(ledger, user.username);
  const bought = ledger.filter((e) => e.username === user.username && e.type === 'purchase');
  lines.push(`The person chatting is ${user.name}, a ${user.role === 'VC' ? 'VIP member' : 'registered member'}.`);
  lines.push(`Their balance is ${usd(user.balance)}. They have ${user.warnings} warnings.`);
  lines.push(`They have made ${h.count} purchases totalling ${usd(h.spent)}: ${bought.map((e) => title(e.bookId)).join(', ') || 'none yet'}.`);
  if (user.role === 'VC') {
    const savings = money(bought.reduce((s, e) => s + Math.max(0, (books.find((b) => b.id === e.bookId)?.price ?? e.amount) - e.amount), 0));
    lines.push(`As a VIP they get ${VC_DISCOUNT * 100}% off every book and have saved ${usd(savings)} so far.`);
  } else {
    lines.push(`They become VIP after more than ${PROMOTE_AFTER_PURCHASES} purchases or more than ${usd(PROMOTE_AFTER_SPENT)} spent.`);
  }
  lines.push('Do not reveal anything about other customers or the store finances.');
  return lines.join('\n');
}

// ---------- step 2: permission check ----------

const FINANCE = /\b(revenue|finances?|financial|profits?|income|earnings|turnover|best[- ]?sell(ing|ers?)|(sold|sells|selling) (the )?(most|best)|copies sold|sales (figures|report|numbers|total)|total sales|how much (money )?(has |did )?(the store|smartread|you) (made|make|earn|earned)|fines (collected|total)|total fines|order lists?|to-order|no-order)\b/i;
const OTHER_USERS = /\b(other|all|every|each|list of|which) (users?|customers?|members?|accounts?|people)\b|\bwho (bought|owes|is suspended|has warnings)\b|\busers?'? balances?\b/i;

// "what's my balance?", "what have I bought?" -> answered from the user's own live data
const PERSONAL =
  /\b(my|mine)\b.*\b(balance|purchases?|warnings?|account|savings?|discount|status|funds|money|orders?)\b|\b(have i|did i|i've|i have)\b.*\b(bought|spent|saved|purchased|warnings?)\b|\bhow much (money )?(do i have|have i)\b|\bam i (a )?vip\b/i;

export function isRestricted(question: string, user: User | null): boolean {
  if (FINANCE.test(question) || OTHER_USERS.test(question)) return true;
  // naming another customer near an account word, e.g. "what is victor's balance?"
  // (but "who wrote Alice in Wonderland?" is fine)
  const q = question.toLowerCase();
  const ACCOUNT = '(balance|account|purchase[sd]?|bought|spent|spend|warnings?|owes?|money|suspended|fines?)';
  return read('users').some((u) => {
    if (u.username === user?.username) return false;
    const names = [u.username, u.name.split(' ')[0].toLowerCase()].map((n) => n.replace(/[^a-z0-9_]/g, ''));
    return (
      q.includes(u.name.toLowerCase()) ||
      names.some((n) =>
        new RegExp(`\\b${n}('s)?\\b(\\W+\\w+){0,3}?\\W+${ACCOUNT}\\b|\\b${ACCOUNT}\\b(\\W+\\w+){0,3}?\\W+${n}\\b`).test(q)
      )
    );
  });
}

// ---------- the pipeline ----------

export async function answer(question: string, user: User | null): Promise<Reply> {
  const q = question.trim();
  if (!q) return { answer: 'Please type a question first.', source: 'error' };
  if (q.length > 1000) return { answer: 'That question is too long; please keep it under 1000 characters.', source: 'error' };

  const context = roleContext(user);
  const restricted = isRestricted(q, user);
  if (restricted && user?.role !== 'SU') {
    return {
      answer: "Sorry, I can't share information about the store's finances or about other customers. I'm happy to help with books, your own account, or how the store works.",
      source: 'declined'
    };
  }

  try {
    // Finance/customer questions from the SU, and "my balance"-type questions, are about
    // live data in the role context, not the store files, so they skip RAG.
    let best: number | undefined;
    if (!restricted && !(user && PERSONAL.test(q))) {
      const chunks = storeChunks();
      if (chunks.length) {
        const vectors = await cachedVectors(chunks.map((c, i) => ({ key: `store:${c.file}:${i}`, text: c.text })));
        const [qv] = await embed([q], 'search_query');
        const ranked = chunks.map((c, i) => ({ ...c, score: cosine(qv, vectors[i]) })).sort((a, b) => b.score - a.score);
        best = Math.round(ranked[0].score * 100) / 100;
        if (ranked[0].score >= RAG_MIN_SCORE) {
          const top = ranked.filter((r) => r.score >= RAG_MIN_SCORE).slice(0, 3);
          const files = [...new Set(top.map((t) => t.file))];
          let text: string;
          try {
            text = await chat([
              { role: 'system', content: "You are the clerk at the smartread bookstore. Answer the customer's question using ONLY the store notes below. Answer in one to three sentences. If the notes don't answer it, say so.\n\nStore notes:\n" + top.map((t) => t.text).join('\n\n') },
              { role: 'user', content: q }
            ]);
          } catch {
            text = top[0].text; // model busy: show the matching paragraph as-is
          }
          return { answer: text, source: 'rag', files, score: best };
        }
      }
    }

    const storeNotes = storeChunks().map((c) => c.text).join('\n');
    const text = await chat([
      {
        role: 'system',
        content:
          'You are the friendly clerk at smartread, a small bookstore selling public-domain classics, and also a helpful general assistant. ' +
          'Answer briefly (under 120 words). Use the facts below for questions about the store or the person\'s account, and never invent account details. ' +
          'For any other question (history, science, geography, books in general), answer it directly from your own knowledge.\n\n' +
          `Facts you may use:\n${context}\n\nStore notes:\n${storeNotes}\n\nCatalog: ${read('books').map((b) => `${b.title} by ${b.author}`).join('; ')}`
      },
      { role: 'user', content: q }
    ]);
    return { answer: text, source: 'llm', score: best };
  } catch (e) {
    if (e instanceof AiDown) return { answer: e.message, source: 'error' };
    throw e;
  }
}
