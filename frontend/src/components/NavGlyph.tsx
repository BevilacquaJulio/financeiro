import type { ReactElement } from 'react';
import { ICON } from '../lib/icons';

/**
 * Simbolo de um item da sidebar.
 *
 * Existe para que a sidebar de verdade e a PREVIA da tela de Configuracoes
 * desenhem o mesmo simbolo pelo mesmo caminho. Duas implementacoes divergiriam
 * na primeira alteracao — e uma previa que mente e pior do que nenhuma.
 *
 * Semantica herdada do sistema atual (`theme.js`): em `default` vale o icone
 * escolhido item a item; em qualquer outro estilo o marcador e o mesmo para o
 * titulo e para todos os itens.
 */
export function NavGlyph({
  style,
  icon,
}: {
  style: string;
  icon?: string;
}): ReactElement | null {
  if (style === 'default') return ICON[icon ?? 'grid'] ?? ICON.grid;

  if (style === 'arrow') {
    return (
      <span className="nav-marker nav-marker-arrow" aria-hidden="true">
        {ICON.arrowRight}
      </span>
    );
  }

  const shape = MARKER_SHAPES.includes(style) ? style : 'bullet';
  return <span className={`nav-marker nav-marker-${shape}`} aria-hidden="true" />;
}

const MARKER_SHAPES = ['bullet', 'square', 'circle', 'diamond', 'none'];
