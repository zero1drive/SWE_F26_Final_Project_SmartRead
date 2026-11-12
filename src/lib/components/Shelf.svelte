<script lang="ts">
  // Books standing on a wooden shelf. Covers, not cards.
  import type { Book } from '$lib/server/db';
  let { books, size = 'md' }: { books: Pick<Book, 'id' | 'title' | 'author' | 'cover'>[]; size?: 'md' | 'lg' } =
    $props();
</script>

<div class="shelf {size}">
  <ul class="row">
    {#each books as book, i (book.id)}
      <li class:lean={i === books.length - 1 && books.length > 3}>
        <a href="/book/{book.id}" title="{book.title} by {book.author}">
          <img src={book.cover} alt="Cover of {book.title}" loading="lazy" />
        </a>
      </li>
    {/each}
  </ul>
  <div class="plank" aria-hidden="true"></div>
</div>

<style>
  .shelf { --h: 170px; margin: 0 0 2.25rem; }
  .shelf.lg { --h: 260px; }
  .row {
    list-style: none;
    margin: 0;
    padding: 0 18px;
    display: flex;
    align-items: flex-end;
    gap: 14px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    padding-top: 12px;
  }
  li { flex: 0 0 auto; transform-origin: bottom left; }
  li.lean { transform: rotate(6deg); margin-left: 8px; }
  a { display: block; }
  /* the big top-3 shelf: covers share the width instead of scrolling */
  .lg .row { overflow: visible; }
  .lg li { flex: 1 1 0; max-width: 190px; }
  .lg img { height: auto; width: 100%; }
  img {
    display: block;
    height: var(--h);
    width: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 1px 3px 3px 1px;
    box-shadow: inset 3px 0 0 rgba(0, 0, 0, 0.15), 2px 0 0 rgba(0, 0, 0, 0.12);
    transition: transform 0.15s ease;
  }
  a:hover img, a:focus-visible img { transform: translateY(-8px); }
  .plank {
    height: 16px;
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0 2px, transparent 2px 37px),
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 23px),
      linear-gradient(var(--wood) 0%, #8b5e38 35%, var(--wood) 70%, var(--wood-dark) 100%);
    border-radius: 2px;
    box-shadow: 0 6px 0 -2px rgba(43, 33, 25, 0.25);
  }
</style>
