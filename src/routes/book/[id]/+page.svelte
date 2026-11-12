<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  const b = $derived(data.book);

  // one view per page open (not on preload, and not again after posting a review)
  let logged = '';
  $effect(() => {
    const id = data.book.id;
    if (id === logged) return;
    logged = id;
    fetch(`/book/${id}/view`, { method: 'POST' });
  });

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
</script>

<svelte:head><title>{b.title} · smartread</title></svelte:head>

<article class="book">
  <div class="cover">
    <img src={b.cover} alt="Cover of {b.title}" />
    <div class="plank" aria-hidden="true"></div>
  </div>

  <div class="details">
    <p class="small muted"><a href="/catalog?category={encodeURIComponent(b.category)}">{b.category}</a> · {b.year}</p>
    <h1>{b.title}</h1>
    <p class="author">by <a href="/catalog?author={encodeURIComponent(b.author)}">{b.author}</a></p>
    <p class="desc">{b.description}</p>

    <div class="buy ruled">
      <p class="price">
        {#if data.yourPrice !== null && data.yourPrice !== b.price}
          <s class="muted">${b.price.toFixed(2)}</s> <strong>${data.yourPrice.toFixed(2)}</strong>
          <span class="hand vip">your VIP price</span>
        {:else}
          <strong>${b.price.toFixed(2)}</strong>
        {/if}
      </p>
      {#if form?.bought}
        <p class="notice">{form.bought}</p>
        {#if form.promoted}
          <p class="notice promo">
            <span class="hand">congratulations!</span> You've made more than 3 purchases or spent over $200, so you are
            now a <strong>VIP member</strong>: 10% off every book from here on.
          </p>
        {/if}
      {/if}
      {#if form?.buyError}<p class="notice bad">{form.buyError}</p>{/if}
      {#if data.user && data.user.role !== 'SU'}
        <form method="POST" action="?/buy" use:enhance>
          <button class="primary">{data.owned ? 'Buy another copy' : 'Buy this book'}</button>
          <span class="small muted">Your balance: ${data.user.balance.toFixed(2)}</span>
        </form>
      {:else if !data.user}
        <p class="small muted"><a href="/login">Log in</a> to buy this book.</p>
      {/if}
      <p class="small"><a href="/shelf?add={b.id}">Put it on my shelf</a> <span class="muted">to journal about it</span></p>
    </div>
  </div>
</article>

<section class="ruled reviews">
  <div class="head">
    <h2>Reader reviews</h2>
    {#if data.average !== null}
      <p class="avg">
        <span class="stars">{stars(Math.round(data.average))}</span>
        {data.average.toFixed(1)} from {data.reviews.length} {data.reviews.length === 1 ? 'rating' : 'ratings'}
        <span class="small muted">(buyers count double)</span>
        {#if data.list}<span class="tag {data.list}">{data.list === 'to-order' ? 'on the to-order list' : 'on the no-order list'}</span>{/if}
      </p>
    {/if}
  </div>

  <div class="cols">
    <ul class="list">
      {#each data.reviews as r}
        <li>
          <p class="meta">
            <span class="stars">{stars(r.stars)}</span>
            <strong>{r.name}</strong>
            {#if r.verified}<span class="verified hand">✓ verified purchase</span>{/if}
            {#if r.mine}<span class="small muted">(yours)</span>{/if}
          </p>
          {#if r.comment}<p>{r.comment}</p>{/if}
        </li>
      {:else}
        <li class="muted">No reviews yet. Be the first.</li>
      {/each}
    </ul>

    <form
      method="POST"
      action="?/review"
      class="write"
      use:enhance={() => async ({ update }) => update({ reset: false })}
    >
      <h3>{data.reviews.some((r) => r.mine) ? 'Change your review' : 'Leave a review'}</h3>
      {#if form?.reviewed}<p class="notice">{form.reviewed}</p>{/if}
      {#if form?.reviewError}<p class="notice bad">{form.reviewError}</p>{/if}
      <fieldset class="rate">
        <legend class="small muted">Stars</legend>
        {#each [1, 2, 3, 4, 5] as n}
          <label><input type="radio" name="stars" value={n} required /> {n}</label>
        {/each}
      </fieldset>
      <label>Comment (optional)
        <textarea name="comment" rows="4" value={form && 'comment' in form ? String(form.comment) : ''}></textarea>
      </label>
      <button>Post review</button>
      <p class="small muted">
        {data.user ? `Posting as ${data.user.name}.` : 'Posting as "Visitor".'} One review per person per book; a new one
        replaces the old.
      </p>
    </form>
  </div>
</section>

<style>
  .book { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 3rem; align-items: start; }
  .cover img { width: 100%; display: block; aspect-ratio: 2/3; object-fit: cover; border-radius: 1px 3px 3px 1px; }
  .cover .plank { height: 14px; margin: 0 -14px; background: linear-gradient(var(--wood), var(--wood-dark)); border-radius: 2px; }
  h1 { font-size: clamp(1.8rem, 3.5vw, 2.6rem); margin-bottom: 0.2rem; }
  .author { font-style: italic; font-size: 1.15rem; }
  .desc { max-width: var(--measure); font-size: 1.05rem; }
  .price { font-size: 1.5rem; margin-bottom: 0.6rem; }
  .vip { color: var(--accent); font-size: 1.3rem; margin-left: 0.4rem; }
  .buy form { display: flex; gap: 1rem; align-items: baseline; }
  .promo { border-color: var(--brass); background: #f3ead2; }
  .promo .hand { color: var(--accent); font-size: 1.3rem; }
  .head { display: flex; flex-wrap: wrap; gap: 0.5rem 2rem; align-items: baseline; }
  .stars { color: var(--brass); letter-spacing: 0.05em; }
  .tag { font-size: 0.8rem; border: 1px solid currentColor; padding: 0.05em 0.5em; margin-left: 0.5rem; }
  .tag.to-order { color: var(--ok); }
  .tag.no-order { color: var(--bad); }
  .cols { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 3rem; }
  .list { list-style: none; padding: 0; margin: 0; }
  .list li { border-bottom: 1px dashed var(--rule); padding: 0.8rem 0; }
  .list li p { margin: 0.2rem 0; max-width: var(--measure); }
  .meta { display: flex; gap: 0.7rem; align-items: baseline; flex-wrap: wrap; }
  .verified { color: var(--ok); font-size: 1.1rem; }
  .write { display: grid; gap: 0.8rem; align-content: start; }
  .write textarea { width: 100%; margin-top: 0.2rem; }
  .write button { justify-self: start; }
  .rate { border: 0; padding: 0; margin: 0; display: flex; gap: 1rem; }
  .rate legend { margin-bottom: 0.3rem; }
  .rate label { display: inline-flex; gap: 0.3rem; color: var(--ink); }
  @media (max-width: 760px) {
    .book, .cols { grid-template-columns: 1fr; }
    .cover { max-width: 200px; }
  }
</style>
