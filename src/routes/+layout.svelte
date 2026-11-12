<script lang="ts">
  import '@fontsource/literata/400.css';
  import '@fontsource/literata/400-italic.css';
  import '@fontsource/literata/600.css';
  import '@fontsource/gaegu/300.css';
  import '@fontsource/gaegu/400.css';
  import '../app.css';
  import Logo from '$lib/components/Logo.svelte';
  import ChatBox from '$lib/components/ChatBox.svelte';
  import { page } from '$app/state';

  let { data, children } = $props();
  const roleName = { SU: 'manager', RC: 'member', VC: 'VIP member' } as const;

  const links = $derived([
    { href: '/catalog', label: 'Catalog' },
    { href: '/shelf', label: 'My shelf' },
    ...(data.user && data.user.role !== 'SU' ? [{ href: '/account', label: 'Account' }] : []),
    ...(data.user?.role === 'SU' ? [{ href: '/admin', label: 'Manage store' }] : [])
  ]);
</script>

<svelte:head><title>smartread</title></svelte:head>

<header>
  <div class="bar">
    <Logo />
    <nav aria-label="Main">
      {#each links as l}
        <a href={l.href} class:current={page.url.pathname.startsWith(l.href)}>{l.label}</a>
      {/each}
      {#if data.user}
        <span class="who">
          {data.user.name.split(' ')[0]} <span class="hand role">· {roleName[data.user.role]}</span>
        </span>
        <form method="POST" action="/login?/logout"><button class="link">Log out</button></form>
      {:else}
        <a href="/login" class:current={page.url.pathname === '/login'}>Log in</a>
      {/if}
    </nav>
  </div>
</header>

<main>
  {@render children()}
</main>

<!-- a fresh conversation for each person who logs in -->
{#key data.user?.username}<ChatBox />{/key}

<footer>
  <p class="small muted">
    smartread · a small bookstore run by Group Z · open 10 to 8, closed Mondays ·
    books from <a href="https://www.gutenberg.org">Project Gutenberg</a>
  </p>
</footer>

<style>
  header {
    border-bottom: 1px solid var(--rule);
    box-shadow: 0 3px 0 -2px var(--rule);
    margin-bottom: 2.5rem;
  }
  .bar {
    max-width: 1180px;
    margin: 0 auto;
    padding: 1.4rem var(--gutter) 1rem;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem 2rem;
    flex-wrap: wrap;
  }
  nav { display: flex; align-items: baseline; gap: 1.4rem; flex-wrap: wrap; font-size: 0.95rem; }
  nav a { color: var(--ink); text-decoration: none; padding-bottom: 2px; border-bottom: 1.5px solid transparent; }
  nav a:hover { border-color: var(--rule); color: var(--ink); }
  nav a.current { border-color: var(--accent); }
  .who { color: var(--ink-soft); }
  .role { font-size: 1.05rem; color: var(--accent); }
  nav form { display: inline; margin: 0; }
  button.link {
    border: 0; padding: 0; background: none; color: var(--ink-soft);
    text-decoration: underline; text-underline-offset: 3px; font-size: 0.95rem;
  }
  main { max-width: 1180px; margin: 0 auto; padding: 0 var(--gutter) 4rem; }
  footer { border-top: 1px solid var(--rule); max-width: 1180px; margin: 0 auto; padding: 1.25rem var(--gutter) 2rem; }
</style>
