<script lang="ts">
  // A hand-drawn arrow, borrowed as a motif. Use sparingly.
  let { width = 120, flip = false }: { width?: number; flip?: boolean } = $props();
</script>

<svg
  viewBox="0 0 160 40"
  width={width}
  height={width / 4}
  aria-hidden="true"
  style={flip ? 'transform: scaleX(-1)' : ''}
>
  <path
    d="M4 16 C 40 13, 62 14, 82 15 C 90 15.5, 92 19, 100 19 C 118 19, 136 18.5, 152 19"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
  />
  <path d="M138 8 C 144 12, 149 16, 153 19 C 148 23, 143 28, 139 34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
</svg>
