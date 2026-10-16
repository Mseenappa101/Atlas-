const SKIP = new Set(['the', 'law', 'firm', 'llp', 'pllc', 'pc', 'group', 'and', 'of']);

// Two letters from the firm name: "Gray Reed" -> GR, "Akerman" -> AK.
export function monogram(name) {
  const words = String(name ?? '')
    .replace(/&/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function officesLabel(offices, max = 2) {
  const cities = [...new Set((offices ?? []).map((o) => o.city))];
  if (cities.length <= max) return cities.join(', ');
  return `${cities.slice(0, max).join(', ')} +${cities.length - max}`;
}
