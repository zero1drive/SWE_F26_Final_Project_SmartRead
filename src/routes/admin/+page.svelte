<script lang="ts">
  import { enhance } from '$app/forms';
  import FaceEnrol from '$lib/components/FaceEnrol.svelte';
  let { data, form } = $props();
  const v = $derived(form && 'values' in form ? form.values : null);
  const f = $derived(data.finance);
  const roleName = { RC: 'member', VC: 'VIP', SU: 'manager' } as const;
  const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>Manage the store · smartread</title></svelte:head>

<h1>Manage the store</h1>
<nav class="jump small">
  <a href="#finance">Finance</a> · <a href="#users">Customers</a> · <a href="#lists">Order lists</a> ·
  <a href="#taboo">Taboo words</a> · <a href="#add">Add a book</a>
</nav>

<section id="finance" class="ruled">
  <h2>Finance</h2>
  <dl class="figures">
    <div><dt>Book sales</dt><dd>${f.revenue.toFixed(2)}</dd></div>
    <div><dt>Fines</dt><dd>${f.fines.toFixed(2)}</dd></div>
    <div><dt>Total income</dt><dd>${f.income.toFixed(2)}</dd></div>
    <div><dt>Customer deposits</dt><dd>${f.deposits.toFixed(2)}</dd></div>
    <div><dt>Held in customer balances</dt><dd>${f.customerBalances.toFixed(2)}</dd></div>
  </dl>
  <table class="narrow">
    <thead><tr><th>Book</th><th>Copies sold</th><th>Revenue</th></tr></thead>
    <tbody>
      {#each f.sales as s}
        <tr><td><a href="/book/{s.id}">{s.title}</a></td><td>{s.copies}</td><td>${s.revenue.toFixed(2)}</td></tr>
      {:else}
        <tr><td colspan="3" class="muted">No sales yet.</td></tr>
      {/each}
    </tbody>
  </table>
</section>

<section id="users" class="ruled">
  <h2>Customers</h2>
  {#if form && 'userOk' in form}<p class="notice">{form.userOk}</p>{/if}
  {#if form && 'userError' in form}<p class="notice bad">{form.userError}</p>{/if}
  <table>
    <thead><tr><th>Customer</th><th>Role</th><th>Balance</th><th>Warnings</th><th>Status</th><th>Deposit for them</th></tr></thead>
    <tbody>
      {#each data.users as u}
        <tr class:suspended={u.suspended}>
          <td>{u.name} <span class="muted small">@{u.username}</span></td>
          <td>{roleName[u.role]}</td>
          <td class:neg={u.balance < 0}>{u.balance < 0 ? '-' : ''}${Math.abs(u.balance).toFixed(2)}</td>
          <td>{u.warnings}</td>
          <td>
            {#if u.suspended}
              <strong class="bad">suspended</strong>
              <form method="POST" action="?/reopen" use:enhance class="inline">
                <input type="hidden" name="username" value={u.username} />
                <button disabled={!u.reopenable} title={u.reopenable ? '' : 'Deposit first: balance must be above $0'}>Reopen</button>
              </form>
            {:else}active{/if}
          </td>
          <td>
            <form method="POST" action="?/deposit" use:enhance class="inline">
              <input type="hidden" name="username" value={u.username} />
              <input name="amount" inputmode="decimal" placeholder="10.00" aria-label="Amount for {u.name}" size="6" />
              <button>Add</button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<section id="lists" class="ruled two">
  <div>
    <h2>To-order list</h2>
    <p class="small muted">More than 3 ratings, weighted average above 4. Buyers' ratings count double.</p>
    <ul>
      {#each data.lists.toOrder as b}
        <li><a href="/book/{b.id}">{b.title}</a> <span class="muted small">{b.average?.toFixed(2)} from {b.ratings}</span></li>
      {:else}<li class="muted">Nothing yet.</li>{/each}
    </ul>
  </div>
  <div>
    <h2>No-order list</h2>
    <p class="small muted">More than 3 ratings, weighted average below 2.</p>
    <ul>
      {#each data.lists.noOrder as b}
        <li><a href="/book/{b.id}">{b.title}</a> <span class="muted small">{b.average?.toFixed(2)} from {b.ratings}</span></li>
      {:else}<li class="muted">Nothing yet.</li>{/each}
    </ul>
  </div>
</section>

<section id="taboo" class="ruled">
  <h2>Taboo words</h2>
  <p class="small muted">
    Matched as whole words, ignoring case. Up to 3 in a comment are replaced with *; more than 3 blocks the comment and warns its author.
  </p>
  {#if form && 'tabooOk' in form}<p class="notice">{form.tabooOk}</p>{/if}
  {#if form && 'tabooError' in form}<p class="notice bad">{form.tabooError}</p>{/if}
  <ul class="words">
    {#each data.taboo as w}
      <li>
        <form method="POST" action="?/removeTaboo" use:enhance>
          <input type="hidden" name="word" value={w} />
          {w} <button class="x" aria-label="Remove {w}" title="Remove">×</button>
        </form>
      </li>
    {:else}<li class="muted">The list is empty.</li>{/each}
  </ul>
  <form method="POST" action="?/addTaboo" use:enhance class="inline">
    <input name="word" placeholder="new word" aria-label="New taboo word" />
    <button>Add word</button>
  </form>
</section>

<section id="add" class="ruled">
  <h2>Add a book</h2>
  {#if form && 'bookAdded' in form}<p class="notice">{form.bookAdded} <a href="/book/{form.bookId}">See it</a></p>{/if}
  {#if form && 'bookError' in form}<p class="notice bad">{form.bookError}</p>{/if}
  <form method="POST" action="?/addBook" enctype="multipart/form-data" class="book-form" use:enhance={keep}>
    <label>Title <input name="title" value={v?.title ?? ''} required /></label>
    <label>Author <input name="author" value={v?.author ?? ''} required /></label>
    <label>Category
      <input name="category" list="cats" value={v?.category ?? ''} required />
      <datalist id="cats">{#each data.categories as c}<option value={c}></option>{/each}</datalist>
    </label>
    <div class="pair">
      <label>Year <input name="year" type="number" value={v?.year ?? ''} required /></label>
      <label>Price ($) <input name="price" inputmode="decimal" value={v?.price ?? ''} required /></label>
    </div>
    <label class="wide">Description <textarea name="description" rows="3" required value={v?.description ?? ''}></textarea></label>
    <label>Cover image (optional) <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    <p class="small muted">No cover? We'll make a plain cloth one.</p>
    <button class="primary">Add to catalog</button>
  </form>
</section>

<section class="ruled" id="face"><FaceEnrol frames={data.faceFrames} /></section>

<style>
  .jump { margin-top: -0.5rem; }
  .figures { display: flex; flex-wrap: wrap; gap: 1rem 3rem; margin: 0 0 1.5rem; }
  .figures dt { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }
  .figures dd { margin: 0; font-size: 1.6rem; }
  .narrow { max-width: 640px; }
  .inline { display: inline-flex; gap: 0.4rem; align-items: center; margin: 0; }
  .inline button { padding: 0.2em 0.7em; font-size: 0.85rem; }
  tr.suspended td { background: #f3e1dc; }
  .bad, .neg { color: var(--bad); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; }
  .words { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .words li { border: 1px solid var(--rule); background: var(--card); padding: 0.1em 0.2em 0.1em 0.6em; }
  .words form { display: inline; }
  .x { border: 0; background: none; padding: 0 0.3em; color: var(--bad); font-size: 1.1rem; }
  .book-form { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem 1.5rem; max-width: 760px; }
  .book-form input:not([type='file']), .book-form textarea { width: 100%; margin-top: 0.2rem; }
  .book-form .wide { grid-column: 1 / -1; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .book-form button { justify-self: start; }
  @media (max-width: 760px) {
    .two, .book-form { grid-template-columns: 1fr; }
    table { font-size: 0.85rem; }
  }
</style>
