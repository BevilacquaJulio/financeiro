// App principal do usuario: navegacao, metricas animadas, modulos financeiros.

const state = {
  user: null,
  preferences: null,
  categories: [],
  paymentMethods: [],
  lastMetrics: null,
  lastPageMetrics: { lista: null, backlog: null },
  selectedSum: { lista: null, backlog: null },
  pageItems: { lista: [], backlog: [] },
  highlightItemId: null,
  filters: { period: "all", category_id: "", payment_method: "" },
};

function navLabel(id) {
  return Theme.NAV_LABELS[id] || id;
}

function pageHeadHtml(navId, actionsHtml = "") {
  const actions = actionsHtml
    ? `<div class="page-head-actions row wrap">${actionsHtml}</div>`
    : "";
  return `<div class="page-head">
    <div class="page-head-text">
      <h1 class="page-title">${navLabel(navId)}</h1>
    </div>
    ${actions}
  </div>`;
}

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

function priorityLabel(value) {
  return PRIORITIES.find((p) => p.value === value)?.label || value;
}

// ---------- Boot ----------
async function boot() {
  UI.beginBootLoadingIfPending();
  document.getElementById("logoutIcon").innerHTML = ICON.logout;
  document.getElementById("logoutBtn").onclick = confirmLogout;

  if (!Auth.token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    state.user = await api("/users/me");
  } catch {
    Auth.logout();
    return;
  }
  Auth.user = state.user;
  state.preferences = Theme.mergePreferences(state.user.preferences);
  window.onPreferencesChange = (prefs) => {
    state.preferences = Theme.mergePreferences(prefs);
    state.user.preferences = state.preferences;
    Auth.user = state.user;
  };
  window.getUserPreferences = () => state.preferences;

  if (state.user.role === "admin") {
    window.location.href = "/admin.html";
    return;
  }

  Theme.applyTheme(state.preferences);
  renderUserChip();
  Theme.renderSidebarNav(state.preferences);
  UI.initMobileShell();
  await loadCategories();
  state.paymentMethods = await api("/categories/payment-methods").catch(() => []);

  window.addEventListener("hashchange", route);
  route();
  await UI.finishBootLoading();
}

function renderUserChip() {
  document.getElementById("userName").textContent = state.user.name;
  document.getElementById("userEmail").textContent = state.user.email;
  const av = document.getElementById("userAvatar");
  if (state.user.avatar) av.innerHTML = `<img src="${state.user.avatar}" alt="" />`;
  else av.textContent = state.user.name.charAt(0).toUpperCase();
}

function setActiveNav(id) {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === id);
  });
}

async function loadCategories() {
  state.categories = await api("/categories").catch(() => []);
}

function categoryOptions(includeEmpty = true) {
  const opts = state.categories.map((c) => ({ value: c.id, label: c.name }));
  return includeEmpty ? opts : opts;
}

async function confirmLogout() {
  const ok = await UI.confirmModal({
    title: "Sair da conta",
    message: "Deseja realmente encerrar a sessão?",
    confirmText: "Sair",
  });
  if (ok) Auth.logout();
}

// ---------- Router ----------
function route() {
  const id = (window.location.hash.replace("#", "") || "dashboard");
  setActiveNav(id);
  const views = {
    dashboard: viewDashboard,
    lista: () => viewItems("lista"),
    backlog: () => viewItems("backlog"),
    gastos: viewExpenses,
    lixeira: viewTrash,
    categorias: viewCategories,
    config: viewConfig,
  };
  (views[id] || viewDashboard)();
}

const view = () => document.getElementById("view");

// ---------- Dashboard ----------
async function viewDashboard() {
  const v = view();
  v.innerHTML = `
    ${pageHeadHtml("dashboard")}
    <div class="toolbar">
      <select id="fPeriod" aria-label="Período">
        <option value="all">Todo período</option>
        <option value="week">Última semana</option>
        <option value="month">Último mês</option>
        <option value="quarter">Último trimestre</option>
        <option value="year">Último ano</option>
      </select>
      <select id="fCategory" aria-label="Categoria"><option value="">Todas categorias</option></select>
      <select id="fPayment" aria-label="Forma de pagamento"><option value="">Todas formas</option></select>
    </div>
    <div id="metricsArea">${UI.skeletonCards(4)}</div>
    <div class="card" style="margin-top:8px">
      <div class="row between" style="margin-bottom:16px"><h3>Gastos por categoria</h3></div>
      <div id="chartArea">${UI.skeletonRows(4)}</div>
    </div>`;

  const fCat = document.getElementById("fCategory");
  fCat.innerHTML += state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  const fPay = document.getElementById("fPayment");
  fPay.innerHTML += state.paymentMethods.map((p) => `<option value="${p}">${p}</option>`).join("");

  document.getElementById("fPeriod").value = state.filters.period;
  fCat.value = state.filters.category_id;
  fPay.value = state.filters.payment_method;

  const onFilter = () => {
    state.filters.period = document.getElementById("fPeriod").value;
    state.filters.category_id = fCat.value;
    state.filters.payment_method = fPay.value;
    loadDashboard(true);
  };
  document.getElementById("fPeriod").onchange = onFilter;
  fCat.onchange = onFilter;
  fPay.onchange = onFilter;

  UI.initSelects(v);
  loadDashboard(false);
}

async function loadDashboard(animate) {
  const qs = new URLSearchParams();
  qs.set("period", state.filters.period);
  if (state.filters.category_id) qs.set("category_id", state.filters.category_id);
  if (state.filters.payment_method) qs.set("payment_method", state.filters.payment_method);

  const data = await api(`/dashboard?${qs.toString()}`).catch((e) => {
    UI.toast(e.message, "error");
    return null;
  });
  if (!data) return;
  renderMetrics(data.metrics, animate);
  renderChart(data.by_category);
}

const METRIC_DEFS = [
  { key: "total_gasto", label: "Total Gasto", icon: "receipt", money: true, detail: "gastos" },
  { key: "itens_planejados", label: "Lista de Compras", icon: "cart", money: false, detail: "lista" },
  { key: "itens_backlog", label: "Compras Futuras", icon: "bookmark", money: false, detail: "backlog" },
  { key: "itens_lixeira", label: "Itens na Lixeira", icon: "trash", money: false, detail: "lixeira" },
];

const PAGE_METRICS = {
  lista: [
    { key: "total_a_gastar", label: "Total a Gastar", icon: "cart", money: true },
    { key: "itens_planejados", label: "Itens na Lista", icon: "grid", money: false },
  ],
  backlog: [
    { key: "total_backlog", label: "Total Estimado", icon: "bookmark", money: true },
    { key: "itens_backlog", label: "Itens em Compras Futuras", icon: "grid", money: false },
  ],
};

function renderMetrics(metrics, animate) {
  const area = document.getElementById("metricsArea");
  const prev = state.lastMetrics;
  area.innerHTML = `<div class="metrics">${METRIC_DEFS.map((m) => `
    <div class="metric" data-detail="${m.detail}" tabindex="0" role="button" aria-label="${m.label}">
      <div class="m-top"><span class="m-label">${m.label}</span>${ICON[m.icon]}</div>
      <div class="m-value tabular" data-key="${m.key}" data-money="${m.money}">
        ${m.money ? UI.fmtMoney(animate && prev ? prev[m.key] : metrics[m.key], state.user.currency) : (animate && prev ? prev[m.key] : metrics[m.key])}
      </div>
    </div>`).join("")}</div>`;

  area.querySelectorAll(".metric").forEach((card) => {
    card.onclick = () => openMetricDetail(card.dataset.detail);
    card.onkeydown = (e) => { if (e.key === "Enter") openMetricDetail(card.dataset.detail); };
  });

  if (animate && prev) {
    METRIC_DEFS.forEach((m) => {
      const node = area.querySelector(`[data-key="${m.key}"]`);
      animateValue(node, prev[m.key], metrics[m.key], { money: m.money, currency: state.user.currency });
    });
  }
  state.lastMetrics = metrics;
}

function renderChart(byCategory) {
  const area = document.getElementById("chartArea");
  if (!byCategory.length) {
    area.innerHTML = `<div class="empty">${ICON.receipt}<p>Sem gastos no período selecionado.</p></div>`;
    return;
  }
  const max = Math.max(...byCategory.map((c) => c.total));
  area.innerHTML = `<div class="bars">${byCategory.map((c) => `
    <div class="bar-row">
      <span class="muted">${c.category}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${max ? (c.total / max) * 100 : 0}%"></div></div>
      <span class="val tabular">${UI.fmtMoney(c.total, state.user.currency)}</span>
    </div>`).join("")}</div>`;
}

async function openMetricDetail(detail) {
  const titles = {
    lista: "Lista de Compras",
    gastos: "Gastos",
    backlog: "Compras Futuras",
    lixeira: "Lixeira",
  };
  const drawer = UI.openDrawer(titles[detail] || "Detalhes", UI.skeletonRows(5));
  let items = [];
  try {
    if (detail === "gastos") items = await api("/expenses");
    else if (detail === "lixeira") items = await api("/trash");
    else items = await api(`/items?state=${detail}`);
  } catch (e) {
    UI.toast(e.message, "error");
  }
  const content = drawer.querySelector(".drawer-content");
  if (!items.length) {
    content.innerHTML = `<div class="empty">${ICON.inbox}<p>Nenhum item aqui.</p></div>`;
    return;
  }
  content.innerHTML = items.map((it) => `
    <div class="detail-item detail-item-link" data-item-id="${it.id}" tabindex="0" role="link" aria-label="Ir para ${it.name}">
      <div class="di-head">
        <span class="di-name">${it.name}</span>
        <span class="tabular text-accent">${UI.fmtMoney(it.paid_value != null ? it.paid_value : it.estimated_price, state.user.currency)}</span>
      </div>
      <div class="di-meta">
        <span>${it.category_name || "Sem categoria"}</span>
        ${it.priority ? `<span class="tag ${it.priority}">${priorityLabel(it.priority)}</span>` : ""}
        ${it.payment_method ? `<span>${it.payment_method}</span>` : ""}
        <span>${UI.fmtDateOnly(it.paid_at || it.included_at || it.deleted_at)}</span>
        ${it.origin ? `<span class="tag ${it.origin === "avulso" ? "info" : "accent"}">${it.origin}</span>` : ""}
      </div>
      ${it.notes ? `<p class="hint" style="margin:8px 0 0">${it.notes}</p>` : ""}
    </div>`).join("");

  content.querySelectorAll(".detail-item-link").forEach((el) => {
    const go = () => navigateToItem(detail, parseInt(el.dataset.itemId, 10));
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === "Enter") go(); };
  });
}

function navigateToItem(page, itemId) {
  UI.closeDrawer();
  state.highlightItemId = itemId;
  const target = `#${page}`;
  if (window.location.hash === target) route();
  else window.location.hash = page;
}

function applyRowHighlight() {
  const id = state.highlightItemId;
  if (!id) return;
  const row = document.querySelector(`tr[data-item-id="${id}"]`);
  if (row) {
    row.classList.add("row-highlight");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    state.highlightItemId = null;
    setTimeout(() => row.classList.remove("row-highlight"), 3200);
  } else {
    state.highlightItemId = null;
  }
}

// ---------- Lista / Backlog ----------
async function viewItems(stateKey) {
  const isBacklog = stateKey === "backlog";
  const v = view();
  v.innerHTML = `
    ${pageHeadHtml(stateKey, `
        <button class="btn btn-accent-outline" id="sumBtn" type="button">Somar itens escolhidos</button>
        <button class="btn btn-primary" id="addBtn" type="button">${ICON.plus} Novo item</button>
    `)}
    <div id="pageMetricArea">${UI.skeletonCards(2)}</div>
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;

  document.getElementById("addBtn").onclick = () => itemForm(stateKey);
  document.getElementById("sumBtn").onclick = () => openSumItemsModal(stateKey);
  await refreshItemsPage(stateKey, false);
}

async function refreshItemsPage(stateKey, animate = false) {
  const items = await api(`/items?state=${stateKey}`).catch(() => []);
  state.pageItems[stateKey] = items;
  reconcileSelectedSum(stateKey, items);
  renderItemsList(stateKey, items);
  await loadPageMetrics(stateKey, animate, items);
}

function reconcileSelectedSum(stateKey, items) {
  const sel = state.selectedSum[stateKey];
  if (!sel) return;
  const valid = items.filter((i) => sel.ids.includes(i.id));
  if (!valid.length) {
    state.selectedSum[stateKey] = null;
    return;
  }
  state.selectedSum[stateKey] = {
    ids: valid.map((i) => i.id),
    total: valid.reduce((s, i) => s + Number(i.estimated_price || 0), 0),
  };
}

function metricCardHtml(m, metrics, animate, prev) {
  return `
    <div class="metric metric-static" aria-label="${m.label}">
      <div class="m-top"><span class="m-label">${m.label}</span>${ICON[m.icon]}</div>
      <div class="m-value tabular" data-key="${m.key}" data-money="${m.money}">
        ${m.money
          ? UI.fmtMoney(animate && prev ? prev[m.key] : metrics[m.key], state.user.currency)
          : (animate && prev ? prev[m.key] : metrics[m.key])}
      </div>
    </div>`;
}

function sumCardHtml(stateKey) {
  const sel = state.selectedSum[stateKey];
  if (!sel) return "";
  return `
    <div class="metric metric-static metric-sum-temp" aria-label="Soma dos itens escolhidos">
      <button type="button" class="metric-dismiss" data-dismiss-sum aria-label="Remover soma">${ICON.x}</button>
      <div class="m-top"><span class="m-label">Soma dos itens escolhidos</span></div>
      <div class="m-value tabular">${UI.fmtMoney(sel.total, state.user.currency)}</div>
    </div>`;
}

function openSumItemsModal(stateKey) {
  const items = state.pageItems[stateKey] || [];
  if (!items.length) return UI.toast("Não há itens para somar.", "warning");

  return new Promise((resolve) => {
    const overlay = UI.el("div", { class: "modal-overlay" });
    const prechecked = new Set(state.selectedSum[stateKey]?.ids || []);
    overlay.innerHTML = `
      <div class="modal modal-pick" role="dialog" aria-modal="true">
        <h3>Somar itens escolhidos</h3>
        <p class="modal-body">Marque os itens que deseja incluir na soma.</p>
        <div class="pick-list">${items.map((it) => `
          <label class="pick-item">
            <input type="checkbox" value="${it.id}" data-price="${Number(it.estimated_price || 0)}"
              ${prechecked.has(it.id) ? "checked" : ""} />
            <span class="pick-name">${it.name}</span>
            <span class="pick-price tabular">${UI.fmtMoney(it.estimated_price, state.user.currency)}</span>
          </label>`).join("")}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" data-act="cancel">Cancelar</button>
          <button class="btn btn-primary" type="button" data-act="ok">Concluído</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    UI.lockScroll();

    const close = (val) => {
      overlay.remove();
      UI.unlockScroll();
      resolve(val);
    };

    overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    document.addEventListener("keydown", function esc(ev) {
      if (ev.key === "Escape") {
        document.removeEventListener("keydown", esc);
        close(false);
      }
    });

    overlay.querySelector('[data-act="ok"]').onclick = () => {
      const checked = [...overlay.querySelectorAll(".pick-item input:checked")];
      if (!checked.length) {
        UI.toast("Selecione ao menos um item.", "warning");
        return;
      }
      const ids = checked.map((c) => parseInt(c.value, 10));
      const total = checked.reduce((s, c) => s + Number(c.dataset.price || 0), 0);
      state.selectedSum[stateKey] = { ids, total };
      close(true);
      const defs = PAGE_METRICS[stateKey];
      const metrics = state.lastPageMetrics[stateKey];
      if (metrics && defs) renderPageMetrics(stateKey, metrics, defs, false);
    };
  });
}

function dismissSumCard(stateKey) {
  state.selectedSum[stateKey] = null;
  const defs = PAGE_METRICS[stateKey];
  const metrics = state.lastPageMetrics[stateKey];
  if (metrics && defs) renderPageMetrics(stateKey, metrics, defs, false);
}

async function loadPageMetrics(stateKey, animate, items = []) {
  const area = document.getElementById("pageMetricArea");
  const defs = PAGE_METRICS[stateKey];
  if (!area || !defs) return;

  let metrics = {};
  if (stateKey === "lista") {
    const data = await api("/dashboard?period=all").catch((e) => {
      UI.toast(e.message, "error");
      return null;
    });
    if (!data) return;
    metrics = {
      total_a_gastar: data.metrics.total_a_gastar,
      itens_planejados: data.metrics.itens_planejados,
    };
  } else {
    metrics = {
      total_backlog: items.reduce((s, i) => s + Number(i.estimated_price || 0), 0),
      itens_backlog: items.length,
    };
  }
  renderPageMetrics(stateKey, metrics, defs, animate);
}

function renderPageMetrics(stateKey, metrics, defs, animate) {
  const area = document.getElementById("pageMetricArea");
  if (!area) return;
  const prev = state.lastPageMetrics[stateKey];
  const parts = [];
  defs.forEach((m, i) => {
    parts.push(metricCardHtml(m, metrics, animate, prev));
    if (i === 0) parts.push(sumCardHtml(stateKey));
  });
  area.innerHTML = `<div class="metrics metrics-single">${parts.join("")}</div>`;

  area.querySelector("[data-dismiss-sum]")?.addEventListener("click", (e) => {
    e.stopPropagation();
    dismissSumCard(stateKey);
  });

  if (animate && prev) {
    defs.forEach((m) => {
      const node = area.querySelector(`[data-key="${m.key}"]`);
      animateValue(node, prev[m.key], metrics[m.key], { money: m.money, currency: state.user.currency });
    });
  }
  state.lastPageMetrics[stateKey] = defs.reduce((acc, m) => {
    acc[m.key] = metrics[m.key];
    return acc;
  }, {});
}

async function renderItemsList(stateKey, items) {
  const isBacklog = stateKey === "backlog";
  const box = document.getElementById("list");
  if (!box) return;
  if (!items.length) {
    box.innerHTML = `<div class="empty">${ICON.cart}<p>Nenhum item ${isBacklog ? "em compras futuras" : "na lista"}.</p></div>`;
    applyRowHighlight();
    return;
  }
  box.innerHTML = `<table><thead><tr>
      <th>Item</th><th>Categoria</th><th>Prioridade</th><th>Preço</th><th></th>
    </tr></thead><tbody>
    ${items.map((it) => `<tr data-item-id="${it.id}">
      <td><b>${it.name}</b>${it.notes ? `<div class="hint">${it.notes}</div>` : ""}</td>
      <td>${it.category_name || "-"}</td>
      <td>${it.priority ? `<span class="tag ${it.priority}">${priorityLabel(it.priority)}</span>` : "-"}</td>
      <td class="tabular">${UI.fmtMoney(it.estimated_price, state.user.currency)}</td>
      <td><div class="actions-cell">${itemActions(it, stateKey)}</div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleItemAction(btn.dataset.action, parseInt(btn.dataset.id), stateKey);
  });
  applyRowHighlight();
}

function itemActions(it, stateKey) {
  const b = (action, icon, title, cls = "btn-icon") =>
    `<button class="btn ${cls} btn-sm" data-action="${action}" data-id="${it.id}" title="${title}" aria-label="${title}">${ICON[icon]}</button>`;
  let actions = b("edit", "edit", "Editar");
  if (stateKey === "lista") {
    actions += b("pay", "check", "Marcar como pago");
    actions += b("backlog", "bookmark", "Mover para Compras Futuras");
  } else {
    actions += b("promote", "arrowRight", "Promover para lista");
  }
  actions += b("delete", "trash", "Excluir", "btn-icon");
  return actions;
}

async function handleItemAction(action, id, stateKey) {
  try {
    if (action === "edit") return itemForm(stateKey, id);
    if (action === "pay") return payItem(id);
    if (action === "backlog") {
      const ok = await UI.confirmModal({ title: "Mover para Compras Futuras", message: "O item será movido para Compras Futuras e sairá das métricas. Continuar?", confirmText: "Mover" });
      if (!ok) return;
      await api(`/items/${id}/move-backlog`, { method: "POST" });
      UI.toast("Item movido para Compras Futuras.", "success");
    }
    if (action === "promote") {
      const ok = await UI.confirmModal({ title: "Promover item", message: "Mover este item para a Lista de Compras?", confirmText: "Promover" });
      if (!ok) return;
      await api(`/items/${id}/promote`, { method: "POST" });
      UI.toast("Item promovido para a lista.", "success");
    }
    if (action === "delete") {
      const ok = await UI.confirmModal({ title: "Excluir item", message: "O item será movido para a lixeira.", confirmText: "Excluir", danger: true });
      if (!ok) return;
      await api(`/items/${id}`, { method: "DELETE" });
      UI.toast("Item movido para a lixeira.", "success");
    }
    await refreshItemsPage(stateKey, true);
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function itemForm(stateKey, id) {
  let values = {};
  if (id) {
    const items = await api(`/items?state=${stateKey}`);
    const it = items.find((i) => i.id === id);
    if (it) values = { name: it.name, category_id: it.category_id, estimated_price: it.estimated_price, priority: it.priority, notes: it.notes };
  }
  const data = await UI.formModal({
    title: id ? "Editar item" : "Novo item",
    submitText: id ? "Salvar" : "Adicionar",
    values,
    fields: [
      { name: "name", label: "Nome do produto", required: true },
      { name: "category_id", label: "Categoria", type: "select", empty: "Sem categoria", options: categoryOptions() },
      { name: "estimated_price", label: "Preço estimado", type: "number", step: "0.01" },
      { name: "priority", label: "Prioridade", type: "select", empty: "Nenhuma", options: PRIORITIES },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  });
  if (!data) return;
  try {
    if (id) await api(`/items/${id}`, { method: "PUT", body: data });
    else await api(`/items?state=${stateKey}`, { method: "POST", body: data });
    UI.toast(id ? "Item atualizado." : "Item adicionado.", "success");
    await refreshItemsPage(stateKey, true);
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function payItem(id) {
  const data = await UI.formModal({
    title: "Marcar como pago",
    submitText: "Confirmar pagamento",
    fields: [
      { name: "paid_value", label: "Valor pago", type: "number", step: "0.01" },
      { name: "payment_method", label: "Forma de pagamento", type: "select", empty: "Selecione", options: state.paymentMethods },
    ],
  });
  if (!data) return;
  const ok = await UI.confirmModal({
    title: "Confirmar pagamento",
    message: "O item irá para Gastos e o valor entrará na métrica de total gasto.",
    confirmText: "Confirmar",
  });
  if (!ok) return;
  try {
    await api(`/items/${id}/pay`, { method: "POST", body: data });
    UI.toast("Item marcado como pago.", "success");
    await refreshItemsPage("lista", true);
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Gastos ----------
async function viewExpenses() {
  const v = view();
  v.innerHTML = `
    ${pageHeadHtml("gastos", `<button class="btn btn-primary" id="addBtn">${ICON.plus} Gasto avulso</button>`)}
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;
  document.getElementById("addBtn").onclick = () => expenseForm();
  await renderExpenses();
}

async function renderExpenses() {
  const items = await api("/expenses").catch(() => []);
  const box = document.getElementById("list");
  if (!items.length) {
    box.innerHTML = `<div class="empty">${ICON.receipt}<p>Nenhum gasto registrado.</p></div>`;
    applyRowHighlight();
    return;
  }
  box.innerHTML = `<table><thead><tr>
      <th>Despesa</th><th>Categoria</th><th>Origem</th><th>Pagamento</th><th>Data</th><th>Valor</th><th></th>
    </tr></thead><tbody>
    ${items.map((it) => `<tr data-item-id="${it.id}">
      <td><b>${it.name}</b></td>
      <td>${it.category_name || "-"}</td>
      <td><span class="origem-text">${it.origin || "-"}</span></td>
      <td>${it.payment_method || "-"}</td>
      <td>${UI.fmtDateOnly(it.paid_at)}</td>
      <td class="tabular">${UI.fmtMoney(it.paid_value, state.user.currency)}</td>
      <td><div class="actions-cell">
        <button class="btn btn-icon btn-sm" data-action="edit" data-id="${it.id}" title="Editar" aria-label="Editar">${ICON.edit}</button>
        <button class="btn btn-icon btn-sm" data-action="reopen" data-id="${it.id}" title="Reabrir" aria-label="Reabrir">${ICON.reopen}</button>
        <button class="btn btn-icon btn-sm" data-action="delete" data-id="${it.id}" title="Excluir" aria-label="Excluir">${ICON.trash}</button>
      </div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleExpenseAction(btn.dataset.action, parseInt(btn.dataset.id));
  });
  applyRowHighlight();
}

async function handleExpenseAction(action, id) {
  try {
    if (action === "edit") return expenseForm(id);
    if (action === "reopen") {
      const ok = await UI.confirmModal({
        title: "Reabrir gasto",
        warn: "Este item será devolvido para a lista de compras e o valor será removido da métrica de gastos. Deseja continuar?",
        message: "",
        confirmText: "Reabrir",
      });
      if (!ok) return;
      await api(`/expenses/${id}/reopen`, { method: "POST" });
      UI.toast("Gasto reaberto e devolvido para a lista.", "success");
    }
    if (action === "delete") {
      const items = await api("/expenses");
      const it = items.find((i) => i.id === id);
      const valor = it ? UI.fmtMoney(it.paid_value, state.user.currency) : "";
      const ok = await UI.confirmModal({
        title: "Excluir gasto",
        warn: `Este item irá para a lixeira. Se for excluído definitivamente, o valor de ${valor} será subtraído da métrica de total gasto.`,
        message: "",
        confirmText: "Excluir",
        danger: true,
      });
      if (!ok) return;
      await api(`/expenses/${id}`, { method: "DELETE" });
      UI.toast("Gasto movido para a lixeira.", "success");
    }
    await renderExpenses();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function expenseForm(id) {
  let values = {};
  if (id) {
    const items = await api("/expenses");
    const it = items.find((i) => i.id === id);
    if (it) values = { name: it.name, category_id: it.category_id, paid_value: it.paid_value, payment_method: it.payment_method, notes: it.notes };
  }
  const data = await UI.formModal({
    title: id ? "Editar gasto" : "Novo gasto avulso",
    submitText: id ? "Salvar" : "Registrar",
    values,
    fields: [
      { name: "name", label: "Nome da despesa", required: true },
      { name: "category_id", label: "Categoria", type: "select", empty: "Sem categoria", options: categoryOptions() },
      { name: "paid_value", label: "Valor pago", type: "number", step: "0.01", required: true },
      { name: "payment_method", label: "Forma de pagamento", type: "select", empty: "Selecione", options: state.paymentMethods },
      { name: "notes", label: "Observações", type: "textarea" },
    ],
  });
  if (!data) return;
  try {
    if (id) await api(`/expenses/${id}`, { method: "PUT", body: data });
    else await api("/expenses", { method: "POST", body: data });
    UI.toast(id ? "Gasto atualizado." : "Gasto registrado.", "success");
    await renderExpenses();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Lixeira ----------
async function viewTrash() {
  const v = view();
  v.innerHTML = `
    ${pageHeadHtml("lixeira")}
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;
  await renderTrash();
}

async function renderTrash() {
  const items = await api("/trash").catch(() => []);
  const box = document.getElementById("list");
  if (!items.length) {
    box.innerHTML = `<div class="empty">${ICON.trash}<p>Lixeira vazia.</p></div>`;
    applyRowHighlight();
    return;
  }
  box.innerHTML = `<table><thead><tr>
      <th>Item</th><th>Origem</th><th>Valor</th><th>Excluído em</th><th></th>
    </tr></thead><tbody>
    ${items.map((it) => `<tr data-item-id="${it.id}">
      <td><b>${it.name}</b></td>
      <td><span class="tag">${it.previous_state || "-"}</span></td>
      <td class="tabular">${UI.fmtMoney(it.paid_value != null ? it.paid_value : it.estimated_price, state.user.currency)}</td>
      <td>${UI.fmtDateOnly(it.deleted_at)}</td>
      <td><div class="actions-cell">
        <button class="btn btn-icon btn-sm" data-action="restore" data-id="${it.id}" title="Restaurar" aria-label="Restaurar">${ICON.restore}</button>
        <button class="btn btn-icon btn-sm btn-danger" data-action="purge" data-id="${it.id}" title="Excluir definitivamente" aria-label="Excluir definitivamente">${ICON.trash}</button>
      </div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleTrashAction(btn.dataset.action, parseInt(btn.dataset.id));
  });
  applyRowHighlight();
}

async function handleTrashAction(action, id) {
  try {
    if (action === "restore") {
      await api(`/trash/${id}/restore`, { method: "POST" });
      UI.toast("Item restaurado.", "success");
    }
    if (action === "purge") {
      const items = await api("/trash");
      const it = items.find((i) => i.id === id);
      const wasExpense = it && it.previous_state === "gasto";
      const valor = it ? UI.fmtMoney(it.paid_value != null ? it.paid_value : it.estimated_price, state.user.currency) : "";
      const ok = await UI.confirmModal({
        title: "Excluir definitivamente",
        warn: wasExpense
          ? `Este item será removido definitivamente e o valor de ${valor} será subtraído da sua métrica de total gasto. Esta ação não pode ser desfeita.`
          : "Este item será removido definitivamente. Esta ação não pode ser desfeita.",
        message: "",
        confirmText: "Excluir definitivamente",
        danger: true,
      });
      if (!ok) return;
      await api(`/trash/${id}`, { method: "DELETE" });
      UI.toast("Item removido definitivamente.", "success");
    }
    await renderTrash();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Categorias ----------
async function viewCategories() {
  const v = view();
  v.innerHTML = `
    ${pageHeadHtml("categorias", `<button class="btn btn-primary" id="addBtn">${ICON.plus} Nova categoria</button>`)}
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;
  document.getElementById("addBtn").onclick = () => categoryForm();
  await renderCategoriesList();
}

async function renderCategoriesList() {
  const cats = await api("/categories").catch(() => []);
  state.categories = cats;
  const box = document.getElementById("list");
  if (!cats.length) {
    box.innerHTML = `<div class="empty">${ICON.tags}<p>Nenhuma categoria. Crie uma nova acima.</p></div>`;
    return;
  }
  box.innerHTML = `<table><thead><tr><th>Nome</th><th>Itens</th><th></th></tr></thead><tbody>
    ${cats.map((c) => `<tr>
      <td><b>${c.name}</b></td>
      <td class="tabular">${c.item_count ?? 0}</td>
      <td><div class="actions-cell">
        <button class="btn btn-icon btn-sm" data-action="edit" data-id="${c.id}" title="Editar" aria-label="Editar">${ICON.edit}</button>
        ${(c.item_count ?? 0) === 0
          ? `<button class="btn btn-icon btn-sm btn-danger" data-action="delete" data-id="${c.id}" title="Excluir" aria-label="Excluir">${ICON.trash}</button>`
          : `<button class="btn btn-icon btn-sm" disabled title="Remova os itens vinculados para excluir" aria-label="Excluir indisponível">${ICON.trash}</button>`}
      </div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleCategoryAction(btn.dataset.action, parseInt(btn.dataset.id, 10), cats);
  });
}

async function handleCategoryAction(action, id, cats) {
  if (!id || Number.isNaN(id)) return;
  try {
    if (action === "edit") {
      const c = cats.find((x) => x.id === id);
      return categoryForm(c);
    }
    if (action === "delete") {
      const c = cats.find((x) => x.id === id);
      if ((c?.item_count ?? 0) > 0) {
        UI.toast("Remova ou altere os itens vinculados antes de excluir.", "warning");
        return;
      }
      const ok = await UI.confirmModal({
        title: "Excluir categoria",
        message: `Excluir "${c?.name}" permanentemente? Esta ação não pode ser desfeita.`,
        confirmText: "Excluir",
        danger: true,
      });
      if (!ok) return;
      await api(`/categories/${id}`, { method: "DELETE" });
      UI.toast("Categoria excluída.", "success");
      await loadCategories();
      await renderCategoriesList();
    }
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function categoryForm(cat) {
  const data = await UI.formModal({
    title: cat ? "Editar categoria" : "Nova categoria",
    submitText: "Salvar",
    values: cat ? { name: cat.name } : {},
    fields: [{ name: "name", label: "Nome", required: true }],
  });
  if (!data) return;
  try {
    if (cat) await api(`/categories/${cat.id}`, { method: "PUT", body: data });
    else await api("/categories", { method: "POST", body: data });
    UI.toast("Categoria salva.", "success");
    await loadCategories();
    await renderCategoriesList();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Configuracoes ----------
function bindSettingsTabs(root) {
  const tabs = root.querySelectorAll("[data-settings-tab]");
  const panels = root.querySelectorAll("[data-settings-panel]");

  const activate = (id) => {
    tabs.forEach((t) => {
      const active = t.dataset.settingsTab === id;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach((p) => {
      const active = p.dataset.settingsPanel === id;
      p.classList.toggle("active", active);
      p.hidden = !active;
    });
  };

  tabs.forEach((tab) => {
    tab.onclick = () => activate(tab.dataset.settingsTab);
  });
}

async function viewConfig() {
  const v = view();
  const prefs = state.preferences;
  v.innerHTML = `
    ${pageHeadHtml("config")}
    <div class="settings-page">
      <nav class="settings-nav" role="tablist" aria-label="Seções de configurações">
        <button type="button" class="active" role="tab" aria-selected="true" data-settings-tab="account">Conta</button>
        <button type="button" role="tab" aria-selected="false" data-settings-tab="appearance">Aparência</button>
        <button type="button" role="tab" aria-selected="false" data-settings-tab="security">Segurança</button>
      </nav>

      <div class="settings-panels">
        <section class="settings-panel active" data-settings-panel="account" role="tabpanel">
          <div class="settings-panel-stack">
            <div class="card">
              <div class="card-head"><h3>Dados da conta</h3></div>
              <div class="stack">
                <div class="field">
                  <label for="cfgName">Nome</label>
                  <input id="cfgName" value="${state.user.name}" autocomplete="name" />
                </div>
                <div class="form-row">
                  <div class="field">
                    <label for="cfgCurrency">Moeda</label>
                    <input id="cfgCurrency" value="${state.user.currency}" placeholder="R$" />
                    <p class="field-hint">Exibida nos valores do dashboard e listas.</p>
                  </div>
                  <div class="field">
                    <label for="cfgTrash">Lixeira automática</label>
                    <input id="cfgTrash" type="number" value="${state.user.trash_autoclean_days}" min="1" />
                    <p class="field-hint">Dias até excluir itens da lixeira.</p>
                  </div>
                </div>
                <div class="settings-panel-actions">
                  <button type="button" class="btn btn-primary" id="saveProfile">Salvar conta</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="settings-panel" data-settings-panel="appearance" role="tabpanel" hidden>
          ${Theme.appearanceSettingsHtml(prefs)}
        </section>

        <section class="settings-panel" data-settings-panel="security" role="tabpanel" hidden>
          <div class="settings-panel-stack">
            <div class="card">
              <div class="card-head"><h3>Alterar senha</h3></div>
              <div class="stack">
                <p class="settings-block-desc">Use uma senha forte com letras maiúsculas e caractere especial.</p>
                <div class="field">
                  <label for="curPwd">Senha atual</label>
                  <input id="curPwd" type="password" autocomplete="current-password" />
                </div>
                <div class="field">
                  <label for="newPwd">Nova senha</label>
                  <input id="newPwd" type="password" autocomplete="new-password" />
                </div>
                <div class="settings-panel-actions">
                  <button type="button" class="btn btn-primary" id="savePwd">Alterar senha</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>`;

  bindSettingsTabs(v);
  Theme.bindPersonalizationSettings(prefs, (saved) => {
    window.onPreferencesChange(saved);
  });
  UI.initSelects(v);
  document.getElementById("saveProfile").onclick = saveProfile;
  document.getElementById("savePwd").onclick = savePassword;
}

async function saveProfile() {
  try {
    const updated = await api("/users/me", {
      method: "PUT",
      body: {
        name: document.getElementById("cfgName").value.trim(),
        currency: document.getElementById("cfgCurrency").value.trim(),
        trash_autoclean_days: parseInt(document.getElementById("cfgTrash").value) || 30,
      },
    });
    state.user = updated;
    Auth.user = updated;
    renderUserChip();
    UI.toast("Conta atualizada.", "success");
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function savePassword() {
  const cur = document.getElementById("curPwd").value;
  const nw = document.getElementById("newPwd").value;
  if (!cur || !nw) return UI.toast("Preencha as duas senhas.", "warning");
  const ok = await UI.confirmModal({ title: "Alterar senha", message: "Deseja confirmar a alteração de senha?", confirmText: "Alterar" });
  if (!ok) return;
  try {
    await api("/users/me/password", { method: "PUT", body: { current_password: cur, new_password: nw } });
    document.getElementById("curPwd").value = "";
    document.getElementById("newPwd").value = "";
    UI.toast("Senha alterada com sucesso.", "success");
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", boot);
