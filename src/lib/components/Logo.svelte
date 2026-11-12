<script lang="ts">
  // "smartread" in thin monoline handwriting. Each letter gets its own small
  // nudge and tilt so the baseline wobbles like pen on paper.
  let { size = 2.4 }: { size?: number } = $props();
  const letters = 'smartread'.split('');
  const lift = [0.02, -0.05, 0.04, -0.02, 0.07, -0.03, 0.03, -0.06, 0.02]; // em
  const tilt = [-4, 3, -2, 5, -6, 2, -3, 4, -2]; // degrees
</script>

<a href="/" class="logo" style="font-size: {size}rem" aria-label="smartread home">
  {#each letters as ch, i}
    <span style="transform: translateY({lift[i]}em) rotate({tilt[i]}deg)">{ch}</span>
  {/each}
</a>

<style>
  .logo {
    font-family: var(--hand);
    font-weight: 400;
    color: var(--ink);
    text-decoration: none;
    letter-spacing: 0.22em;
    line-height: 1;
    display: inline-flex;
    white-space: nowrap;
  }
  span { display: inline-block; }
  .logo:hover { color: var(--accent); }
</style>
