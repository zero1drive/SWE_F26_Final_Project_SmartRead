<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  const roleName = { SU: 'manager', RC: 'member', VC: 'VIP' } as const;
</script>

<svelte:head><title>Log in · smartread</title></svelte:head>

<div class="cols">
  <section>
    <h1>Log in</h1>
    {#if form?.error}<p class="notice bad">{form.error}</p>{/if}
    <form method="POST" action="?/login" class="stack">
      <label>Username <input name="username" autocomplete="username" value={form?.username ?? ''} required /></label>
      <label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
      <button class="primary">Log in</button>
    </form>

    <!-- FACE_LOGIN -->

    {#if data.demoAccounts.length}
      <div class="ruled">
        <p class="hand demo-label">demo: log in as…</p>
        <div class="demo">
          {#each data.demoAccounts as a}
            <form method="POST" action="?/demo" use:enhance>
              <input type="hidden" name="username" value={a.username} />
              <button title="balance ${a.balance.toFixed(2)}, {a.warnings} warnings">
                {a.username}
                <span class="muted small">{a.suspended ? 'suspended' : roleName[a.role]}</span>
              </button>
            </form>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <section class="register">
    <h2>New here?</h2>
    <p class="muted">Open an account to buy books. You start as a member with $0; add funds from your account page.</p>
    {#if form?.regError}<p class="notice bad">{form.regError}</p>{/if}
    <form method="POST" action="?/register" class="stack">
      <label>Your name <input name="name" value={form?.regName ?? ''} required /></label>
      <label>Username <input name="username" value={form?.regUsername ?? ''} required /></label>
      <label>Password <input name="password" type="password" autocomplete="new-password" required minlength="6" /></label>
      <button>Open an account</button>
    </form>
  </section>
</div>

<style>
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 3rem; max-width: 900px; }
  .stack { display: grid; gap: 0.9rem; max-width: 340px; }
  .stack input { width: 100%; margin-top: 0.2rem; }
  .stack button { justify-self: start; }
  .register { border-left: 1px solid var(--rule); padding-left: 3rem; }
  .demo-label { font-size: 1.4rem; color: var(--accent); margin: 0 0 0.5rem; }
  .demo { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .demo form { margin: 0; }
  .demo button { font-size: 0.9rem; padding: 0.3em 0.7em; }
  @media (max-width: 720px) {
    .cols { grid-template-columns: 1fr; }
    .register { border-left: 0; padding-left: 0; border-top: 1px solid var(--rule); padding-top: 1.5rem; }
  }
</style>
