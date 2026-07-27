/**
 * Porte de `theme.applyAccentColor`.
 *
 * Todo o redesenho deriva de `--accent` / `--accent-rgb`, entao trocar a cor
 * do usuario repinta cards, botoes, graficos, glow de fundo e sidebar de uma
 * vez — sem recompilar CSS (motivo pelo qual NAO usamos utilitarios estaticos
 * de Tailwind para cor, ver README).
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

export function applyAccentColor(hex: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-rgb', `${r} ${g} ${b}`);
  root.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.14)`);
  root.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.setProperty('--accent-bg-1', `rgba(${r}, ${g}, ${b}, 0.08)`);
  root.setProperty('--accent-bg-2', `rgba(${r}, ${g}, ${b}, 0.05)`);
  root.setProperty('--success', hex);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#000000');
}
