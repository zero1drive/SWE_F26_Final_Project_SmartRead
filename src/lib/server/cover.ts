// A plain cloth-bound cover for books that have no cover image.
const PALETTE = ['#6b2a2a', '#2f4a3a', '#3d3a5c', '#7a5a2b', '#284b5c', '#5c3d2e'];

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function makeCover(title: string, author: string, seed: number): string {
  const bg = PALETTE[seed % PALETTE.length];
  const words = title.split(' ');
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= 14) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }
  const text = lines
    .map((l, i) => `<text x="150" y="${150 + i * 34}" text-anchor="middle" font-size="28">${escapeXml(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
<rect width="300" height="450" fill="${bg}"/>
<rect x="18" y="18" width="264" height="414" fill="none" stroke="#c9a45c" stroke-width="2"/>
<rect x="26" y="26" width="248" height="398" fill="none" stroke="#c9a45c" stroke-width="0.8"/>
<g fill="#f3e9d2" font-family="Georgia, serif">${text}
<text x="150" y="380" text-anchor="middle" font-size="16" font-style="italic">${escapeXml(author)}</text></g>
</svg>`;
}

