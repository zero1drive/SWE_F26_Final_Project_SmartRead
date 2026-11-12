<script lang="ts">
  import { enhance } from '$app/forms';
  import FaceEnrol from '$lib/components/FaceEnrol.svelte';
  let { data, form } = $props();
  const me = $derived(data.me);
  const kind = { deposit: 'Deposit', purchase: 'Purchase', fine: 'Fine' } as const;
</script>

<svelte:head><title>Your account · smartread</title></svelte:head>

{#if data.welcome}<p class="notice">Welcome to smartread, {me.name}. Add some funds below to start buying.</p>{/if}

<div class="top">
  <section>
    <h1>{me.name}</h1>
    <p class="status">
      {#if me.role === 'VC'}
        <span class="hand badge">VIP member</span> You get {data.rules.discount}% off every book{#if data.savings > 0},
          and have saved ${data.savings.toFixed(2)} so far{/if}.
      {:else}
        Member. Make {data.rules.purchasesLeft} more {data.rules.purchasesLeft === 1 ? 'purchase' : 'purchases'}, or spend
        ${data.rules.spendLeft.toFixed(2)} more, to become a VIP with {data.rules.discount}% off.
      {/if}
    </p>
    <p class="small muted">
      {data.history.count} purchases, ${data.history.spent.toFixed(2)} spent ·
      {me.warnings} {me.warnings === 1 ? 'warning' : 'warnings'}
      {#if me.warnings > 0}(more than {data.rules.warningsLimit} {me.role === 'VC' ? 'ends VIP status' : 'suspends the account'}){/if}
    </p>
  </section>

  <section class="balance">
    <p class="label small muted">Balance</p>
    <p class="amount" class:neg={me.balance < 1}>${me.balance.toFixed(2)}</p>
    {#if form?.ok}<p class="notice">{form.ok}</p>{/if}
    {#if form?.error}<p class="notice bad">{form.error}</p>{/if}
    <form method="POST" action="?/deposit" use:enhance>
      <label for="amount" class="visually-hidden">Amount</label>
      <span class="dollar">$</span><input id="amount" name="amount" inputmode="decimal" placeholder="25.00" value={form && 'amount' in form ? form.amount : ''} />
      <button class="primary">Add funds</button>
    </form>
    <p class="small muted">If a book costs more than your balance, the purchase is refused and a $1 fine is charged.</p>
  </section>
</div>

<section class="ruled">
  <h2>History</h2>
  {#if data.entries.length === 0}
    <p class="muted">Nothing yet.</p>
  {:else}
    <table>
      <thead><tr><th>Date</th><th>What</th><th>Book</th><th>Amount</th></tr></thead>
      <tbody>
        {#each data.entries as e}
          <tr>
            <td>{new Date(e.at).toLocaleDateString()}</td>
            <td>{kind[e.type]}</td>
            <td>{#if e.bookId}<a href="/book/{e.bookId}">{e.title}</a>{/if}</td>
            <td class:in={e.type === 'deposit'} class:out={e.type !== 'deposit'}>
              {e.type === 'deposit' ? '+' : '−'}${e.amount.toFixed(2)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<section class="ruled" id="face"><FaceEnrol frames={data.faceFrames} /></section>

<style>
  .top { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 3rem; }
  .badge { color: var(--accent); font-size: 1.4rem; margin-right: 0.3rem; }
  .status { max-width: 50ch; font-size: 1.05rem; }
  .balance { border-left: 1px solid var(--rule); padding-left: 2rem; }
  .label { margin: 0; text-transform: uppercase; letter-spacing: 0.1em; }
  .amount { font-size: 2.6rem; margin: 0 0 0.6rem; line-height: 1.1; }
  .amount.neg { color: var(--bad); }
  .balance form { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.6rem; }
  .balance input { width: 8rem; }
  .dollar { color: var(--ink-soft); }
  td.in { color: var(--ok); }
  td.out { color: var(--ink); }
  @media (max-width: 760px) {
    .top { grid-template-columns: 1fr; }
    .balance { border-left: 0; padding-left: 0; }
  }
</style>
