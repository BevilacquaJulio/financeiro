// Personalizacao por usuario: accent, titulo, icones e ordem da sidebar.

const NAV_IDS = [
  "dashboard",
  "lista",
  "backlog",
  "gastos",
  "lixeira",
  "categorias",
  "config",
];

const NAV_LABELS = {
  dashboard: "Dashboard",
  lista: "Lista de Compras",
  backlog: "Compras Futuras",
  gastos: "Gastos",
  lixeira: "Lixeira",
  categorias: "Categorias",
  config: "Configurações",
};

const NAV_DEFAULT_ICONS = {
  dashboard: "grid",
  lista: "cart",
  backlog: "bookmark",
  gastos: "receipt",
  lixeira: "trash",
  categorias: "tags",
  config: "settings",
};

const PICKABLE_ICONS = [
  "wallet", "grid", "cart", "bookmark", "receipt", "trash", "tags", "settings",
  "shield", "user", "plus", "clock", "key", "inbox", "archive", "eye",
];

const ICON_STYLE_OPTIONS = [
  { value: "default", label: "Ícones SVG (personalizados)" },
  { value: "bullet", label: "Ponto (cor de destaque)" },
  { value: "square", label: "Quadrado" },
  { value: "circle", label: "Bolinha" },
  { value: "arrow", label: "Flecha" },
  { value: "diamond", label: "Losango" },
  { value: "none", label: "Sem símbolo" },
];

const ACCENT_PRESETS = [
  "#4fffd6", "#6aa8ff", "#a78bfa", "#ff8a5c",
  "#ffce4f", "#ff5d6c", "#58d68d", "#f472b6",
];

const DEFAULT_PREFERENCES = {
  sidebar_title: "Financeiro",
  accent_color: "#4fffd6",
  brand_icon: "wallet",
  nav_icon_style: "default",
  nav_order: [...NAV_IDS],
  nav_icons: { ...NAV_DEFAULT_ICONS },
};

const NAV_MARKERS = {
  bullet: '<span class="nav-marker nav-marker--bullet" aria-hidden="true"></span>',
  square: '<span class="nav-marker nav-marker--square" aria-hidden="true"></span>',
  circle: '<span class="nav-marker nav-marker--circle" aria-hidden="true"></span>',
  arrow: `<span class="nav-marker nav-marker--arrow" aria-hidden="true">${ICON.arrowRight}</span>`,
  diamond: '<span class="nav-marker nav-marker--diamond" aria-hidden="true"></span>',
  none: '<span class="nav-marker nav-marker--none" aria-hidden="true"></span>',
};

function mergePreferences(raw) {
  const prefs = structuredClone(DEFAULT_PREFERENCES);
  if (!raw || typeof raw !== "object") return prefs;

  if (typeof raw.sidebar_title === "string" && raw.sidebar_title.trim()) {
    prefs.sidebar_title = raw.sidebar_title.trim().slice(0, 40);
  }
  if (typeof raw.accent_color === "string" && /^#[0-9A-Fa-f]{6}$/.test(raw.accent_color)) {
    prefs.accent_color = raw.accent_color.toLowerCase();
  }
  if (ICON_STYLE_OPTIONS.some((o) => o.value === raw.nav_icon_style)) {
    prefs.nav_icon_style = raw.nav_icon_style;
  }
  if (typeof raw.brand_icon === "string" && PICKABLE_ICONS.includes(raw.brand_icon)) {
    prefs.brand_icon = raw.brand_icon;
  }
  if (Array.isArray(raw.nav_order)) {
    const order = raw.nav_order.filter((id) => NAV_IDS.includes(id));
    NAV_IDS.forEach((id) => {
      if (!order.includes(id)) order.push(id);
    });
    prefs.nav_order = order;
  }
  if (raw.nav_icons && typeof raw.nav_icons === "object") {
    prefs.nav_icons = { ...prefs.nav_icons };
    NAV_IDS.forEach((id) => {
      const icon = raw.nav_icons[id];
      if (PICKABLE_ICONS.includes(icon)) prefs.nav_icons[id] = icon;
    });
  }
  return prefs;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseColorToHex(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return null;
}

function lerpChannel(from, to, t) {
  return Math.round(from + (to - from) * t);
}

function interpolateHex(fromHex, toHex, t) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const r = lerpChannel(from.r, to.r, t);
  const g = lerpChannel(from.g, to.g, t);
  const b = lerpChannel(from.b, to.b, t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

const ACCENT_ANIM_MS = 1000;
let accentAnimFrame = null;

function setAccentVars(hex) {
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-dim", rgbaFromHex(hex, 0.14));
  root.style.setProperty("--accent-glow", rgbaFromHex(hex, 0.35));
  root.style.setProperty("--accent-bg-1", rgbaFromHex(hex, 0.08));
  root.style.setProperty("--accent-bg-2", rgbaFromHex(hex, 0.05));
  root.style.setProperty("--success", hex);
}

function applyAccentColor(hex, { animate = false, duration = ACCENT_ANIM_MS } = {}) {
  const target = hex.toLowerCase();
  if (accentAnimFrame) {
    cancelAnimationFrame(accentAnimFrame);
    accentAnimFrame = null;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reducedMotion) {
    document.documentElement.classList.remove("theme-accent-animating");
    setAccentVars(target);
    return;
  }

  const current = parseColorToHex(
    getComputedStyle(document.documentElement).getPropertyValue("--accent")
  );
  const fromHex = current || target;
  if (fromHex === target) {
    setAccentVars(target);
    return;
  }

  document.documentElement.classList.add("theme-accent-animating");
  const started = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    setAccentVars(interpolateHex(fromHex, target, easeInOutQuad(progress)));
    if (progress < 1) {
      accentAnimFrame = requestAnimationFrame(tick);
    } else {
      accentAnimFrame = null;
      setAccentVars(target);
      document.documentElement.classList.remove("theme-accent-animating");
    }
  };

  accentAnimFrame = requestAnimationFrame(tick);
}

function navIconHtml(prefs, navId) {
  const style = prefs.nav_icon_style;
  if (style === "default") {
    const key = prefs.nav_icons[navId] || NAV_DEFAULT_ICONS[navId];
    return ICON[key] || ICON.grid;
  }
  if (style === "none") return NAV_MARKERS.none;
  return NAV_MARKERS[style] || NAV_MARKERS.bullet;
}

function brandIconHtml(prefs) {
  const style = prefs.nav_icon_style;
  if (style === "default") {
    const key = prefs.brand_icon || "wallet";
    return ICON[key] || ICON.wallet;
  }
  if (style === "none") return "";
  return NAV_MARKERS[style] || NAV_MARKERS.bullet;
}

function applyTheme(prefs, { animateAccent = false } = {}) {
  applyAccentColor(prefs.accent_color, { animate: animateAccent, duration: ACCENT_ANIM_MS });
  const brandTitle = document.getElementById("brandTitle");
  const logo = document.getElementById("logo");
  if (brandTitle) brandTitle.textContent = prefs.sidebar_title;
  if (logo) logo.innerHTML = brandIconHtml(prefs);
  if (typeof window.syncMobileBrand === "function") window.syncMobileBrand();
}

function orderedNavItems(prefs) {
  return prefs.nav_order
    .filter((id) => NAV_IDS.includes(id))
    .map((id) => ({ id, label: NAV_LABELS[id] }));
}

function renderSidebarNav(prefs, { animateId = null, direction = null } = {}) {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const activeId = (window.location.hash.replace("#", "") || "dashboard");
  nav.innerHTML = orderedNavItems(prefs)
    .map(({ id, label }) => {
      const animClass =
        animateId === id && direction
          ? ` nav-item--shift-${direction}`
          : "";
      return `<a href="#${id}" data-nav="${id}" class="nav-link${animClass}">
        <span class="nav-icon">${navIconHtml(prefs, id)}</span>
        <span class="label">${label}</span>
      </a>`;
    })
    .join("");

  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === activeId);
  });

  bindNavLongPress(prefs);
}

async function savePreferences(patch) {
  const updated = await api("/users/me/preferences", { method: "PUT", body: patch });
  return mergePreferences(updated);
}

function moveNavItem(prefs, navId, direction) {
  const order = [...prefs.nav_order];
  const idx = order.indexOf(navId);
  if (idx < 0) return prefs;
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= order.length) return prefs;
  [order[idx], order[target]] = [order[target], order[idx]];
  return { ...prefs, nav_order: order };
}

function openNavReorderMenu(link, navId, prefs, onUpdate) {
  closeNavReorderMenu();
  const order = prefs.nav_order;
  const idx = order.indexOf(navId);
  const menu = document.createElement("div");
  menu.className = "nav-reorder-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <p class="nav-reorder-menu__title">${NAV_LABELS[navId]}</p>
    <button type="button" data-dir="up" ${idx <= 0 ? "disabled" : ""} role="menuitem">
      <span class="icon-flip-y">${ICON.chevronDown}</span> Mover para cima
    </button>
    <button type="button" data-dir="down" ${idx >= order.length - 1 ? "disabled" : ""} role="menuitem">
      ${ICON.chevronDown} Mover para baixo
    </button>`;

  const rect = link.getBoundingClientRect();
  const menuWidth = 196;
  let top = rect.top;
  let left = rect.right + 8;
  if (left + menuWidth > window.innerWidth - 12) left = rect.left - menuWidth - 8;
  if (top + 120 > window.innerHeight - 12) top = window.innerHeight - 132;
  menu.style.top = `${Math.max(8, top)}px`;
  menu.style.left = `${Math.max(8, left)}px`;
  document.body.appendChild(menu);

  const handleDir = async (dir) => {
    closeNavReorderMenu();
    const next = moveNavItem(prefs, navId, dir);
    if (next.nav_order.join() === prefs.nav_order.join()) return;
    renderSidebarNav(next, { animateId: navId, direction: dir });
    try {
      const saved = await savePreferences({ nav_order: next.nav_order });
      onUpdate(saved);
      UI.toast("Ordem da sidebar atualizada.", "success");
    } catch (e) {
      renderSidebarNav(prefs);
      UI.toast(e.message, "error");
    }
  };

  menu.querySelector('[data-dir="up"]').onclick = () => handleDir("up");
  menu.querySelector('[data-dir="down"]').onclick = () => handleDir("down");

  setTimeout(() => {
    document.addEventListener("click", closeNavReorderMenuOnOutside, true);
    document.addEventListener("keydown", closeNavReorderMenuOnEsc);
  }, 0);
}

function closeNavReorderMenu() {
  document.querySelectorAll(".nav-reorder-menu").forEach((el) => el.remove());
  document.removeEventListener("click", closeNavReorderMenuOnOutside, true);
  document.removeEventListener("keydown", closeNavReorderMenuOnEsc);
}

function closeNavReorderMenuOnOutside(e) {
  if (!e.target.closest(".nav-reorder-menu") && !e.target.closest(".nav-link")) {
    closeNavReorderMenu();
  }
}

function closeNavReorderMenuOnEsc(e) {
  if (e.key === "Escape") closeNavReorderMenu();
}

function bindNavLongPress(prefs) {
  const getPrefs = () => (typeof window.getUserPreferences === "function" ? window.getUserPreferences() : prefs);

  const onUpdate = (p) => {
    if (typeof window.onPreferencesChange === "function") window.onPreferencesChange(p);
  };

  document.querySelectorAll(".nav-link").forEach((link) => {
    const navId = link.dataset.nav;
    let timer = null;
    let menuOpened = false;

    const clear = () => {
      clearTimeout(timer);
      timer = null;
      link.classList.remove("nav-link--holding");
    };

    const start = (e) => {
      if (e.type === "mousedown" && e.button !== 0) return;
      menuOpened = false;
      link.classList.add("nav-link--holding");
      timer = setTimeout(() => {
        menuOpened = true;
        openNavReorderMenu(link, navId, getPrefs(), onUpdate);
      }, 520);
    };

    link.addEventListener("mousedown", start);
    link.addEventListener("touchstart", start, { passive: true });
    link.addEventListener("mouseup", clear);
    link.addEventListener("mouseleave", clear);
    link.addEventListener("touchend", clear);
    link.addEventListener("touchcancel", clear);
    link.addEventListener("click", (e) => {
      if (menuOpened) {
        e.preventDefault();
        menuOpened = false;
      }
      clear();
    });
    link.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openNavReorderMenu(link, navId, getPrefs(), onUpdate);
    });
  });
}

function iconPickButton(key, target, selectedKey) {
  const selected = key === selectedKey ? " is-selected" : "";
  return `<button type="button" class="icon-pick${selected}" data-icon="${key}" data-target="${target}" aria-label="${key}" aria-pressed="${key === selectedKey}">${ICON[key]}</button>`;
}

function iconPickerSingleRow(target, selectedKey) {
  const buttons = PICKABLE_ICONS.map((key) => iconPickButton(key, target, selectedKey)).join("");
  return `<div class="icon-picker icon-picker--single-row" data-picker="${target}">${buttons}</div>`;
}

function iconPickerBalancedRows(target, selectedKey) {
  const total = PICKABLE_ICONS.length;
  const cols = Math.ceil(total / 2);
  const row1 = PICKABLE_ICONS.slice(0, cols);
  const row2 = PICKABLE_ICONS.slice(cols);
  const renderRow = (icons) =>
    icons.map((key) => iconPickButton(key, target, selectedKey)).join("");
  return `<div class="icon-picker icon-picker--balanced" data-picker="${target}" style="--icon-cols:${cols}">
    <div class="icon-picker-row-line">${renderRow(row1)}</div>
    <div class="icon-picker-row-line">${renderRow(row2)}</div>
  </div>`;
}

function iconPickersContent(prefs) {
  if (prefs.nav_icon_style !== "default") {
    return `<p class="hint">O mesmo marcador é aplicado ao título e a todos os itens da sidebar.</p>`;
  }
  const navRows = orderedNavItems(prefs)
    .map(({ id, label }) => {
      const icon = prefs.nav_icons[id] || NAV_DEFAULT_ICONS[id];
      return `<div class="nav-icon-row">
        <span class="nav-icon-row__label">${label}</span>
        ${iconPickerBalancedRows(`nav_${id}`, icon)}
      </div>`;
    })
    .join("");
  return `
    <div class="field">
      <label>Ícone do título</label>
      ${iconPickerSingleRow("brand_icon", prefs.brand_icon)}
    </div>
    <div class="nav-icon-rows">${navRows}</div>`;
}

function appearanceSettingsHtml(prefs) {
  const styleOpts = ICON_STYLE_OPTIONS.map(
    (o) => `<option value="${o.value}" ${prefs.nav_icon_style === o.value ? "selected" : ""}>${o.label}</option>`
  ).join("");

  const presetSwatches = ACCENT_PRESETS.map(
    (c) => `<button type="button" class="color-swatch${c === prefs.accent_color ? " is-selected" : ""}" data-color="${c}" style="--swatch:${c}" aria-label="Cor ${c}"></button>`
  ).join("");

  return `
    <div class="settings-panel-stack">
      <div class="settings-block">
        <h4 class="settings-block-title">Identidade visual</h4>
        <p class="settings-block-desc">Nome exibido na sidebar e cor de destaque do sistema.</p>
        <div class="stack">
          <div class="field">
            <label for="prefTitle">Título da sidebar</label>
            <input id="prefTitle" maxlength="40" value="${prefs.sidebar_title.replace(/"/g, "&quot;")}" />
          </div>
          <div class="field">
            <label>Cor de destaque</label>
            <div class="color-picker-row">
              <div class="color-swatches">${presetSwatches}</div>
              <span class="color-picker-divider" aria-hidden="true"></span>
              <label class="color-custom" title="Cor personalizada">
                <input type="color" id="prefAccent" value="${prefs.accent_color}" aria-label="Cor personalizada" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-block">
        <h4 class="settings-block-title">Símbolos da sidebar</h4>
        <p class="settings-block-desc">Escolha ícones SVG ou marcadores geométricos na cor de destaque.</p>
        <div class="stack">
          <div class="field">
            <label for="prefIconStyle">Estilo</label>
            <select id="prefIconStyle">${styleOpts}</select>
          </div>
          <div id="prefIconPickers">${iconPickersContent(prefs)}</div>
        </div>
      </div>

      <div class="settings-block settings-block--tip">
        <p class="hint pref-hint">Para reordenar os itens da sidebar, segure um link do menu ou clique com o botão direito e use <strong>Mover para cima</strong> / <strong>Mover para baixo</strong>.</p>
      </div>

      <div class="settings-panel-actions">
        <button type="button" class="btn btn-primary" id="savePersonalization">Salvar aparência</button>
      </div>
    </div>`;
}

function bindPersonalizationSettings(prefs, onChange) {
  const draft = mergePreferences(prefs);

  const preview = ({ animateAccent = false } = {}) => {
    applyTheme(draft, { animateAccent });
    renderSidebarNav(draft);
  };

  document.getElementById("prefTitle")?.addEventListener("input", (e) => {
    draft.sidebar_title = e.target.value.trim().slice(0, 40) || DEFAULT_PREFERENCES.sidebar_title;
    preview();
  });

  document.getElementById("prefAccent")?.addEventListener("input", (e) => {
    draft.accent_color = e.target.value.toLowerCase();
    document.querySelectorAll(".color-swatch").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.color === draft.accent_color);
    });
    preview({ animateAccent: true });
  });

  document.querySelectorAll(".color-swatch").forEach((btn) => {
    btn.onclick = () => {
      draft.accent_color = btn.dataset.color;
      document.getElementById("prefAccent").value = draft.accent_color;
      document.querySelectorAll(".color-swatch").forEach((b) => b.classList.toggle("is-selected", b === btn));
      preview({ animateAccent: true });
    };
  });

  document.getElementById("prefIconStyle")?.addEventListener("change", (e) => {
    draft.nav_icon_style = e.target.value;
    const box = document.getElementById("prefIconPickers");
    if (box) {
      box.innerHTML = iconPickersContent(draft);
      bindIconPickers(draft, preview);
    }
    preview();
  });

  bindIconPickers(draft, preview);

  document.getElementById("savePersonalization")?.addEventListener("click", async () => {
    try {
      const saved = await savePreferences({
        sidebar_title: draft.sidebar_title,
        accent_color: draft.accent_color,
        brand_icon: draft.brand_icon,
        nav_icon_style: draft.nav_icon_style,
        nav_icons: draft.nav_icons,
      });
      onChange(saved);
      UI.toast("Personalização salva.", "success");
    } catch (e) {
      UI.toast(e.message, "error");
    }
  });
}

function bindIconPickers(draft, preview) {
  document.querySelectorAll(".icon-pick").forEach((btn) => {
    btn.onclick = () => {
      const target = btn.dataset.target;
      const icon = btn.dataset.icon;
      if (target === "brand_icon") draft.brand_icon = icon;
      else if (target.startsWith("nav_")) draft.nav_icons[target.slice(4)] = icon;
      btn.closest(".icon-picker")?.querySelectorAll(".icon-pick").forEach((b) => {
        b.classList.toggle("is-selected", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      preview();
    };
  });
}

window.Theme = {
  NAV_IDS,
  NAV_LABELS,
  mergePreferences,
  applyTheme,
  renderSidebarNav,
  savePreferences,
  appearanceSettingsHtml,
  bindPersonalizationSettings,
};
