// Toasts, modais de confirmacao, drawer e helpers de UI.

function el(tag, attrs = {}, html = "") {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  });
  if (html) e.innerHTML = html;
  return e;
}

// ---------- Scroll lock (modais) ----------
let scrollLockDepth = 0;

function lockScroll() {
  if (scrollLockDepth === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add("scroll-locked");
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }
  scrollLockDepth += 1;
}

function unlockScroll() {
  scrollLockDepth = Math.max(0, scrollLockDepth - 1);
  if (scrollLockDepth === 0) {
    document.documentElement.classList.remove("scroll-locked");
    document.body.style.paddingRight = "";
  }
}

// ---------- Toasts ----------
function ensureToastContainer() {
  let c = document.querySelector(".toasts");
  if (!c) {
    c = el("div", { class: "toasts", role: "status", "aria-live": "polite" });
    document.body.appendChild(c);
  }
  return c;
}

function toast(message, type = "success", timeout = 3600) {
  const icons = { success: ICON.check, error: ICON.x, warning: ICON.clock };
  const c = ensureToastContainer();
  const t = el("div", { class: `toast ${type}` },
    `${icons[type] || ICON.check}<div class="t-msg">${message}</div>`);
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 220);
  }, timeout);
}

// ---------- Modal de confirmacao ----------
function confirmModal({ title, message, warn = "", confirmText = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const warnHtml = warn ? `<div class="warn-box">${warn}</div>` : "";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        ${warnHtml}
        <div class="modal-body">${message || ""}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Cancelar</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok">${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    lockScroll();
    const close = (val) => {
      overlay.remove();
      unlockScroll();
      resolve(val);
    };
    overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
    overlay.querySelector('[data-act="ok"]').onclick = () => close(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };
    document.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") {
        document.removeEventListener("keydown", esc);
        close(false);
      }
    });
    overlay.querySelector('[data-act="ok"]').focus({ preventScroll: true });
  });
}

// ---------- Modal de formulario ----------
function formModal({ title, fields, submitText = "Salvar", values = {} }) {
  return new Promise((resolve) => {
    const overlay = el("div", { class: "modal-overlay" });
    const fieldsHtml = fields.map((f) => {
      const v = values[f.name] != null ? values[f.name] : "";
      if (f.type === "select") {
        const opts = f.options
          .map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const label = typeof o === "string" ? o : o.label;
            return `<option value="${val}" ${String(v) === String(val) ? "selected" : ""}>${label}</option>`;
          })
          .join("");
        return `<div class="field"><label>${f.label}</label><select name="${f.name}">${f.empty ? `<option value="">${f.empty}</option>` : ""}${opts}</select></div>`;
      }
      if (f.type === "textarea") {
        return `<div class="field"><label>${f.label}</label><textarea name="${f.name}">${v}</textarea></div>`;
      }
      if (f.type === "email_local") {
        const domain = typeof EMAIL_DOMAIN !== "undefined" ? EMAIL_DOMAIN : "@financeiro.com.br";
        return `<div class="field"><label>${f.label}</label>
          <div class="email-field">
            <input type="text" class="email-local" name="${f.name}" value="${v}" placeholder="nome" inputmode="email" spellcheck="false" ${f.required ? "required" : ""} />
            <span class="email-suffix" aria-hidden="true">${domain}</span>
          </div></div>`;
      }
      return `<div class="field"><label>${f.label}</label><input type="${f.type || "text"}" name="${f.name}" value="${v}" ${f.step ? `step="${f.step}"` : ""} ${f.required ? "required" : ""} placeholder="${f.placeholder || ""}"></div>`;
    }).join("");

    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${title}</h3>
        <form class="stack" style="margin-bottom:18px">${fieldsHtml}</form>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">Cancelar</button>
          <button class="btn btn-primary" data-act="ok">${submitText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    lockScroll();
    const form = overlay.querySelector("form");
    const close = (val) => {
      overlay.remove();
      unlockScroll();
      resolve(val);
    };
    overlay.querySelector('[data-act="cancel"]').onclick = () => close(null);
    overlay.querySelector('[data-act="ok"]').onclick = () => {
      const data = {};
      fields.forEach((f) => {
        const input = form.querySelector(`[name="${f.name}"]`);
        let val = input.value;
        if (f.type === "number") val = val === "" ? null : parseFloat(val);
        data[f.name] = val === "" ? null : val;
      });
      if (fields.some((f) => f.required && !data[f.name])) {
        toast("Preencha os campos obrigatórios.", "warning");
        return;
      }
      close(data);
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };
    form.querySelectorAll(".email-local").forEach((input) => {
      if (typeof bindEmailLocalInput === "function") bindEmailLocalInput(input);
    });
    initSelects(form);
    const first = form.querySelector("input:not(.select-native), textarea");
    if (first) first.focus({ preventScroll: true });
    else form.querySelector(".select-trigger")?.focus({ preventScroll: true });
  });
}

// ---------- Drawer ----------
function openDrawer(title, contentHtml) {
  closeDrawer();
  const overlay = el("div", { class: "drawer-overlay" });
  const drawer = el("div", { class: "drawer", role: "dialog", "aria-modal": "true" });
  drawer.innerHTML = `
    <div class="row between">
      <h3>${title}</h3>
      <button class="btn btn-icon" data-act="close" aria-label="Fechar">${ICON.x}</button>
    </div>
    <div class="drawer-content">${contentHtml}</div>`;
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
  overlay.onclick = closeDrawer;
  drawer.querySelector('[data-act="close"]').onclick = closeDrawer;
  return drawer;
}

function closeDrawer() {
  document.querySelectorAll(".drawer-overlay, .drawer").forEach((e) => e.remove());
}

// ---------- Helpers ----------
function fmtMoney(value, currency = "R$") {
  const n = Number(value || 0);
  return `${currency} ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateOnly(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function skeletonCards(n = 5) {
  return `<div class="metrics">${Array.from({ length: n }).map(() => '<div class="skeleton sk-card"></div>').join("")}</div>`;
}

function skeletonRows(n = 4) {
  return Array.from({ length: n }).map(() => '<div class="skeleton sk-line"></div>').join("");
}

// ---------- Select customizado ----------
let selectDocBound = false;

function closeAllSelects() {
  document.querySelectorAll(".select-wrap.open").forEach((wrap) => {
    wrap.classList.remove("open");
    const trigger = wrap.querySelector(".select-trigger");
    const menu = wrap.querySelector(".select-menu");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
  });
}

function bindSelectDocListeners() {
  if (selectDocBound) return;
  selectDocBound = true;
  document.addEventListener("click", closeAllSelects);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllSelects();
  });
}

function buildSelectMenu(select, wrap, trigger, menu) {
  menu.innerHTML = "";
  Array.from(select.options).forEach((opt) => {
    const item = el("div", {
      class: `select-option${opt.selected ? " selected" : ""}`,
      role: "option",
      tabindex: "-1",
      "aria-selected": opt.selected ? "true" : "false",
      "data-value": opt.value,
    }, opt.textContent);
    item.onclick = (e) => {
      e.stopPropagation();
      if (select.value !== opt.value) {
        select.value = opt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeAllSelects();
      buildSelectMenu(select, wrap, trigger, menu);
    };
    menu.appendChild(item);
  });

  const current = select.options[select.selectedIndex];
  trigger.innerHTML = `<span class="select-value">${current ? current.textContent : ""}</span><span class="select-chevron" aria-hidden="true">${ICON.chevronDown}</span>`;
  trigger.disabled = select.disabled;
}

function enhanceSelect(select) {
  if (select.dataset.enhanced === "1") {
    const wrap = select.closest(".select-wrap");
    if (!wrap) return;
    buildSelectMenu(select, wrap, wrap.querySelector(".select-trigger"), wrap.querySelector(".select-menu"));
    return;
  }

  bindSelectDocListeners();
  select.dataset.enhanced = "1";
  select.classList.add("select-native");

  const wrap = el("div", { class: "select-wrap" });
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  const label = select.getAttribute("aria-label");
  const trigger = el("button", {
    type: "button",
    class: "select-trigger",
    "aria-haspopup": "listbox",
    "aria-expanded": "false",
  });
  if (label) trigger.setAttribute("aria-label", label);

  const menu = el("div", { class: "select-menu", role: "listbox", hidden: "" });
  menu.onclick = (e) => e.stopPropagation();

  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  const open = () => {
    if (select.disabled) return;
    closeAllSelects();
    wrap.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    const selected = menu.querySelector(".select-option.selected");
    (selected || menu.querySelector(".select-option"))?.focus();
  };

  trigger.onclick = (e) => {
    e.stopPropagation();
    wrap.classList.contains("open") ? closeAllSelects() : open();
  };

  trigger.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      wrap.classList.contains("open") ? closeAllSelects() : open();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      open();
    }
  };

  menu.onkeydown = (e) => {
    const items = [...menu.querySelectorAll(".select-option")];
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.activeElement?.click();
    } else if (e.key === "Escape") {
      closeAllSelects();
      trigger.focus();
    }
  };

  select.addEventListener("change", () => buildSelectMenu(select, wrap, trigger, menu));
  buildSelectMenu(select, wrap, trigger, menu);
}

function initSelects(root = document) {
  root.querySelectorAll("select:not([data-no-enhance])").forEach(enhanceSelect);
}

function syncMobileBrand() {
  const title = document.getElementById("mobileHeaderTitle");
  if (!title) return;
  const src = document.getElementById("brandTitle") || document.querySelector(".sidebar .brand strong");
  if (src) title.textContent = src.textContent;
}

function closeMobileNav() {
  document.querySelector(".app")?.classList.remove("nav-open");
  unlockScroll();
}

function openMobileNav() {
  const app = document.querySelector(".app");
  if (!app) return;
  app.classList.add("nav-open");
  lockScroll();
}

function initMobileShell() {
  const app = document.querySelector(".app");
  if (!app) return;

  if (!app.dataset.mobileShell) {
    app.dataset.mobileShell = "1";

    const header = el("header", { class: "mobile-header", role: "banner" });
    const menuBtn = el(
      "button",
      { class: "btn btn-icon mobile-menu-btn", id: "mobileMenuBtn", "aria-label": "Abrir menu", "aria-expanded": "false" },
      ICON.menu
    );
    const title = el("span", { class: "mobile-header-title", id: "mobileHeaderTitle" });
    const backdrop = el("div", { class: "sidebar-backdrop", id: "sidebarBackdrop", "aria-hidden": "true" });

    header.appendChild(menuBtn);
    header.appendChild(title);
    app.insertBefore(backdrop, app.firstChild);
    app.insertBefore(header, app.firstChild);

    menuBtn.onclick = () => {
      const open = app.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) lockScroll();
      else unlockScroll();
    };

    backdrop.onclick = () => {
      closeMobileNav();
      menuBtn.setAttribute("aria-expanded", "false");
    };

    app.addEventListener("click", (e) => {
      if (e.target.closest(".nav a")) {
        closeMobileNav();
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && app.classList.contains("nav-open")) {
        closeMobileNav();
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener("hashchange", () => {
      closeMobileNav();
      menuBtn.setAttribute("aria-expanded", "false");
    });
  }

  syncMobileBrand();
}

window.syncMobileBrand = syncMobileBrand;

function refreshSelect(select) {
  enhanceSelect(select);
}

const DEFAULT_ACCENT = "#4fffd6";
const BOOT_LOADING_MS = 1500;
let bootLoadingEl = null;
let bootLoadingStartedAt = 0;
let bootAccentAnimFrame = null;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function interpolateHex(fromHex, toHex, t) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const r = lerp(from.r, to.r);
  const g = lerp(from.g, to.g);
  const b = lerp(from.b, to.b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function resolveLoginAccent(user) {
  const raw = user?.preferences?.accent_color;
  if (typeof raw === "string" && /^#[0-9A-Fa-f]{6}$/.test(raw)) {
    return raw.toLowerCase();
  }
  return null;
}

function applyBootAccentVars(node, hex) {
  node.style.setProperty("--boot-accent", hex);
  node.style.setProperty("--boot-accent-dim", rgbaFromHex(hex, 0.14));
  node.style.setProperty("--boot-accent-glow", rgbaFromHex(hex, 0.35));
}

function animateBootAccent(fromHex, toHex, duration, node) {
  return new Promise((resolve) => {
    if (fromHex === toHex) {
      applyBootAccentVars(node, toHex);
      resolve();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyBootAccentVars(node, toHex);
      resolve();
      return;
    }
    applyBootAccentVars(node, fromHex);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      applyBootAccentVars(node, interpolateHex(fromHex, toHex, easeInOutQuad(t)));
      if (t < 1) bootAccentAnimFrame = requestAnimationFrame(tick);
      else {
        bootAccentAnimFrame = null;
        resolve();
      }
    };
    bootAccentAnimFrame = requestAnimationFrame(tick);
  });
}

function showBootLoading() {
  if (bootLoadingEl) return bootLoadingEl;
  bootLoadingEl = document.getElementById("boot-loading-static");
  if (bootLoadingEl) {
    bootLoadingEl.classList.add("boot-loading--visible");
    bootLoadingEl.removeAttribute("aria-hidden");
    bootLoadingEl.setAttribute("role", "status");
    bootLoadingEl.setAttribute("aria-live", "polite");
    bootLoadingEl.setAttribute("aria-label", "Carregando");
    applyBootAccentVars(bootLoadingEl, DEFAULT_ACCENT);
    const logo = bootLoadingEl.querySelector(".boot-loading__logo");
    if (logo && typeof ICON !== "undefined") logo.innerHTML = ICON.wallet;
    lockScroll();
    return bootLoadingEl;
  }
  if (!bootLoadingStartedAt) bootLoadingStartedAt = Date.now();
  bootLoadingEl = el("div", {
    class: "boot-loading boot-loading--visible",
    role: "status",
    "aria-live": "polite",
    "aria-label": "Carregando",
  });
  applyBootAccentVars(bootLoadingEl, DEFAULT_ACCENT);
  bootLoadingEl.innerHTML = `
    <div class="boot-loading__inner">
      <div class="boot-loading__glow" aria-hidden="true"></div>
      <div class="boot-loading__logo" aria-hidden="true">${ICON.wallet}</div>
      <div class="boot-loading__spinner" aria-hidden="true"></div>
      <p class="boot-loading__label">Entrando…</p>
    </div>`;
  document.body.appendChild(bootLoadingEl);
  lockScroll();
  return bootLoadingEl;
}

function hideBootLoading() {
  return new Promise((resolve) => {
    if (bootAccentAnimFrame) {
      cancelAnimationFrame(bootAccentAnimFrame);
      bootAccentAnimFrame = null;
    }
    if (!bootLoadingEl) return resolve();
    const node = bootLoadingEl;
    node.classList.add("boot-loading--out");
    const done = () => {
      node.remove();
      if (bootLoadingEl === node) bootLoadingEl = null;
      document.documentElement.classList.remove("boot-loading-pending");
      unlockScroll();
      resolve();
    };
    node.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 400);
  });
}

function beginBootLoadingIfPending() {
  if (!sessionStorage.getItem("fin_boot_loading")) return;
  const started = sessionStorage.getItem("fin_boot_loading_at");
  bootLoadingStartedAt = started ? Number(started) : Date.now();
  showBootLoading();
  const targetAccent = (sessionStorage.getItem("fin_boot_accent") || DEFAULT_ACCENT).toLowerCase();
  animateBootAccent(DEFAULT_ACCENT, targetAccent, BOOT_LOADING_MS, bootLoadingEl);
}

async function finishBootLoading() {
  if (!sessionStorage.getItem("fin_boot_loading")) return;
  const elapsed = Date.now() - bootLoadingStartedAt;
  const remaining = Math.max(0, BOOT_LOADING_MS - elapsed);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
  sessionStorage.removeItem("fin_boot_loading");
  sessionStorage.removeItem("fin_boot_accent");
  sessionStorage.removeItem("fin_boot_loading_at");
  await hideBootLoading();
}

function startLoginTransition(user, destination) {
  sessionStorage.setItem("fin_boot_loading", "1");
  sessionStorage.setItem("fin_boot_loading_at", String(Date.now()));
  const accent = resolveLoginAccent(user);
  if (accent && accent !== DEFAULT_ACCENT) {
    sessionStorage.setItem("fin_boot_accent", accent);
  } else {
    sessionStorage.removeItem("fin_boot_accent");
  }
  window.location.href = destination;
}

window.UI = {
  el, toast, confirmModal, formModal, openDrawer, closeDrawer,
  fmtMoney, fmtDate, fmtDateOnly, skeletonCards, skeletonRows,
  initSelects, refreshSelect, closeAllSelects, lockScroll, unlockScroll,
  initMobileShell, syncMobileBrand, closeMobileNav,
  showBootLoading, hideBootLoading, beginBootLoadingIfPending, finishBootLoading,
  startLoginTransition,
};
