<script lang="ts">
  // "Ask the clerk": the chat box on every page. Each reply says where it came from.
  import { tick } from 'svelte';

  type Msg = { from: 'you' | 'clerk'; text: string; source?: string; files?: string[]; score?: number };
  let open = $state(false);
  let question = $state('');
  let busy = $state(false);
  let messages = $state<Msg[]>([]);
  let log: HTMLElement | undefined = $state();
  let input: HTMLTextAreaElement | undefined = $state();
  $effect(() => { if (open) input?.focus(); });

  const label: Record<string, string> = {
    rag: 'Answered from store files (RAG)',
    llm: 'Answered by the LLM',
    declined: 'Declined: not permitted for your account',
    error: 'Something went wrong'
  };

  async function ask(e: SubmitEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) {
      messages.push({ from: 'clerk', text: 'Please type a question first.', source: 'error' });
      return;
    }
    messages.push({ from: 'you', text: q });
    question = '';
    busy = true;
    await scroll();
    try {
      const res = await fetch('/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q }) });
      if (!res.ok) throw new Error(String(res.status));
      const r = await res.json();
      messages.push({ from: 'clerk', text: r.answer, source: r.source, files: r.files, score: r.score });
    } catch {
      messages.push({ from: 'clerk', text: 'The store server did not answer. Is it still running?', source: 'error' });
    }
    busy = false;
    await scroll();
  }

  async function scroll() {
    await tick();
    log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }
</script>

<aside class="chat" class:open aria-label="Ask the clerk">
  {#if open}
    <div class="panel">
      <header>
        <h2 class="hand">ask the clerk</h2>
        <button class="close" onclick={() => (open = false)} aria-label="Close chat">×</button>
      </header>
      <div class="log" bind:this={log} aria-live="polite">
        {#if messages.length === 0}
          <p class="muted small">Ask about the store, your account, or books in general. Store questions are answered from our own files; anything else goes to the AI model.</p>
        {/if}
        {#each messages as m}
          <div class="msg {m.from}">
            <p>{m.text}</p>
            {#if m.source}
              <p class="source {m.source}">
                {label[m.source]}{#if m.files?.length} · {m.files.join(', ')}{/if}{#if m.score !== undefined} · best match {m.score}{/if}
              </p>
            {/if}
          </div>
        {/each}
        {#if busy}<p class="muted small thinking">the clerk is thinking… (small models can take 10 to 30 seconds)</p>{/if}
      </div>
      <form onsubmit={ask}>
        <label for="chat-q" class="visually-hidden">Your question</label>
        <textarea
          id="chat-q"
          bind:this={input}
          rows="2"
          bind:value={question}
          placeholder="What are your opening hours?"
          onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
        ></textarea>
        <button class="primary" disabled={busy}>Ask</button>
      </form>
    </div>
  {:else}
    <button class="tab" onclick={() => (open = true)}>
      <span class="hand">ask the clerk</span>
    </button>
  {/if}
</aside>

<style>
  .chat { position: fixed; right: 16px; bottom: 0; z-index: 20; }
  .tab {
    border: 1.5px solid var(--ink);
    border-bottom: 0;
    border-radius: 4px 4px 0 0;
    background: var(--accent);
    color: #f8efe0;
    padding: 0.35em 1.2em 0.5em;
    font-size: 1.35rem;
  }
  .tab:hover { background: var(--accent-soft); }
  .panel {
    width: min(380px, calc(100vw - 32px));
    height: min(520px, calc(100vh - 80px));
    display: flex;
    flex-direction: column;
    background: var(--card);
    border: 1.5px solid var(--ink);
    border-bottom: 0;
    box-shadow: -4px -4px 0 rgba(43, 33, 25, 0.08);
    background-image: repeating-linear-gradient(transparent 0 27px, rgba(176, 138, 62, 0.12) 27px 28px);
  }
  header { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.8rem; border-bottom: 1px solid var(--rule); background: var(--paper-deep); }
  h2 { margin: 0; font-size: 1.5rem; color: var(--accent); }
  .close { border: 0; background: none; font-size: 1.5rem; padding: 0 0.3rem; }
  .log { flex: 1; overflow-y: auto; padding: 0.8rem; font-size: 0.95rem; }
  .msg { margin: 0 0 0.9rem; }
  .msg p { margin: 0; white-space: pre-wrap; }
  .msg.you { text-align: right; }
  .msg.you p { display: inline-block; background: var(--paper-deep); padding: 0.3em 0.7em; border-radius: 3px; text-align: left; }
  .source { font-size: 0.75rem; margin-top: 0.25rem !important; color: var(--ink-soft); font-style: italic; }
  .source.rag { color: var(--ok); }
  .source.llm { color: var(--accent); }
  .source.declined, .source.error { color: var(--bad); }
  .thinking { font-style: italic; }
  form { display: flex; gap: 0.5rem; padding: 0.6rem; border-top: 1px solid var(--rule); background: var(--card); }
  textarea { flex: 1; resize: none; }
</style>
