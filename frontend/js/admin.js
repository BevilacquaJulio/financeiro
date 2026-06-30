// Painel administrativo: usuarios, fila de cadastros, fila de reset de senha.

const adminState = { user: null, counts: { pending_registrations: 0, pending_resets: 0 } };

const ADMIN_NAV = [
  { id: "users", label: "Usuários", icon: "user" },
  { id: "registrations", label: "Cadastros", icon: "inbox", badge: "pending_registrations" },
  { id: "resets", label: "Senhas", icon: "key", badge: "pending_resets" },
];

function adminNavLabel(id) {
  return ADMIN_NAV.find((n) => n.id === id)?.label || id;
}

function adminPageHeadHtml(navId, actionsHtml = "") {
  const actions = actionsHtml
    ? `<div class="page-head-actions row wrap">${actionsHtml}</div>`
    : "";
  return `<div class="page-head">
    <div class="page-head-text">
      <h1 class="page-title">${adminNavLabel(navId)}</h1>
    </div>
    ${actions}
  </div>`;
}

async function bootAdmin() {
  UI.beginBootLoadingIfPending();
  document.getElementById("logo").innerHTML = ICON.shield;
  document.getElementById("logoutIcon").innerHTML = ICON.logout;
  document.getElementById("logoutBtn").onclick = async () => {
    const ok = await UI.confirmModal({ title: "Sair da conta", message: "Encerrar a sessão?", confirmText: "Sair" });
    if (ok) Auth.logout();
  };

  if (!Auth.token) {
    window.location.href = "/index.html";
    return;
  }
  try {
    adminState.user = await api("/users/me");
  } catch {
    Auth.logout();
    return;
  }
  if (adminState.user.role !== "admin") {
    window.location.href = "/dashboard.html";
    return;
  }

  document.getElementById("userName").textContent = adminState.user.name;
  document.getElementById("userEmail").textContent = adminState.user.email;
  document.getElementById("userAvatar").innerHTML = ICON.shield;

  await refreshCounts();
  UI.initMobileShell();
  window.addEventListener("hashchange", routeAdmin);
  routeAdmin();
  await UI.finishBootLoading();
}

async function refreshCounts() {
  adminState.counts = await api("/admin/counts").catch(() => adminState.counts);
  renderAdminNav();
}

function renderAdminNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = ADMIN_NAV.map((n) => {
    const count = n.badge ? adminState.counts[n.badge] : 0;
    const badge = count > 0 ? `<span class="badge">${count}</span>` : "";
    return `<a href="#${n.id}" data-nav="${n.id}">${ICON[n.icon]}<span class="label">${n.label}</span>${badge}</a>`;
  }).join("");
}

function setActiveNav(id) {
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === id));
}

const view = () => document.getElementById("view");

function routeAdmin() {
  const id = window.location.hash.replace("#", "") || "users";
  setActiveNav(id);
  const views = { users: viewUsers, registrations: viewRegistrations, resets: viewResets };
  (views[id] || viewUsers)();
}

// ---------- Usuarios ----------
async function viewUsers() {
  const v = view();
  v.innerHTML = `
    ${adminPageHeadHtml("users")}
    <div class="toolbar">
      <select id="fStatus" aria-label="Filtrar status">
        <option value="">Todos status</option>
        <option value="active">Ativos</option>
        <option value="pending">Pendentes</option>
        <option value="suspended">Suspensos</option>
      </select>
    </div>
    <div class="table-wrap"><div id="list">${UI.skeletonRows(5)}</div></div>`;
  document.getElementById("fStatus").onchange = (e) => renderUsers(e.target.value);
  UI.initSelects(v);
  await renderUsers("");
}

const STATUS_TAG = {
  active: '<span class="tag accent">Ativo</span>',
  pending: '<span class="tag warn">Pendente</span>',
  suspended: '<span class="tag danger">Suspenso</span>',
};

function userStatusCell(u) {
  if (u.role === "admin") return '<span class="tag info">Admin</span>';
  return STATUS_TAG[u.status] || u.status;
}

function userActionsCell(u) {
  const isAdmin = u.role === "admin";
  return `<div class="actions-cell">
    <button class="btn btn-icon btn-sm" data-action="view" data-id="${u.id}" title="Ver detalhes" aria-label="Ver detalhes">${ICON.eye}</button>
    <button class="btn btn-icon btn-sm" data-action="edit" data-id="${u.id}" title="${isAdmin ? "Alterar senha" : "Editar"}" aria-label="${isAdmin ? "Alterar senha" : "Editar"}">${ICON.edit}</button>
    ${!isAdmin && u.status === "pending" ? `<button class="btn btn-icon btn-sm" data-action="approve" data-id="${u.id}" title="Aprovar" aria-label="Aprovar">${ICON.check}</button>` : ""}
    ${!isAdmin ? `<button class="btn btn-icon btn-sm" data-action="suspend" data-id="${u.id}" title="${u.status === "suspended" ? "Reativar" : "Suspender"}" aria-label="Suspender">${ICON.pause}</button>` : ""}
    ${!isAdmin ? `<button class="btn btn-icon btn-sm btn-danger" data-action="delete" data-id="${u.id}" title="Excluir" aria-label="Excluir">${ICON.trash}</button>` : ""}
  </div>`;
}

async function renderUsers(status) {
  const qs = status ? `?status=${status}` : "";
  const users = await api(`/admin/users${qs}`).catch(() => []);
  const box = document.getElementById("list");
  if (!users.length) {
    box.innerHTML = `<div class="empty">${ICON.user}<p>Nenhum usuário encontrado.</p></div>`;
    return;
  }
  box.innerHTML = `<table><thead><tr>
      <th>Nome</th><th>E-mail</th><th>Status</th><th>Cadastro</th><th>Último acesso</th><th></th>
    </tr></thead><tbody>
    ${users.map((u) => `<tr>
      <td><b>${u.name}</b></td>
      <td>${u.email}</td>
      <td>${userStatusCell(u)}</td>
      <td>${UI.fmtDateOnly(u.created_at)}</td>
      <td>${u.last_access ? UI.fmtDate(u.last_access) : "-"}</td>
      <td>${userActionsCell(u)}</td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleUserAction(btn.dataset.action, parseInt(btn.dataset.id), users, status);
  });
}

async function handleUserAction(action, id, users, status) {
  const u = users.find((x) => x.id === id);
  try {
    if (action === "view") return showUserDetail(u);
    if (action === "edit") return editUser(u, status);
    if (action === "approve") {
      const ok = await UI.confirmModal({ title: "Aprovar cadastro", message: `Aprovar a conta de ${u.name}?`, confirmText: "Aprovar" });
      if (!ok) return;
      await api(`/admin/users/${id}/approve`, { method: "POST" });
      UI.toast("Conta aprovada.", "success");
    }
    if (action === "suspend") {
      const suspend = u.status !== "suspended";
      const ok = await UI.confirmModal({
        title: suspend ? "Suspender conta" : "Reativar conta",
        message: suspend ? `Suspender o acesso de ${u.name}?` : `Reativar o acesso de ${u.name}?`,
        confirmText: suspend ? "Suspender" : "Reativar",
        danger: suspend,
      });
      if (!ok) return;
      await api(`/admin/users/${id}/suspend`, { method: "POST" });
      UI.toast(suspend ? "Conta suspensa." : "Conta reativada.", "success");
    }
    if (action === "delete") {
      const ok = await UI.confirmModal({
        title: "Excluir conta",
        warn: "Todos os dados financeiros deste usuário serão perdidos. Esta ação não pode ser desfeita.",
        message: "",
        confirmText: "Excluir",
        danger: true,
      });
      if (!ok) return;
      await api(`/admin/users/${id}`, { method: "DELETE" });
      UI.toast("Conta removida.", "success");
    }
    await refreshCounts();
    await renderUsers(status);
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function editUser(u, status) {
  const isAdmin = u.role === "admin";
  const data = await UI.formModal({
    title: isAdmin ? "Alterar senha do administrador" : "Editar usuário",
    submitText: "Salvar",
    values: isAdmin ? {} : { name: u.name, email_local: emailLocalFromFull(u.email) },
    fields: isAdmin
      ? [{ name: "password", label: "Nova senha", type: "password", required: true }]
      : [
          { name: "name", label: "Nome" },
          { name: "email_local", label: "E-mail", type: "email_local" },
          { name: "password", label: "Nova senha (opcional)", type: "password" },
        ],
  });
  if (!data) return;
  const body = {};
  if (!isAdmin) {
    if (data.name) body.name = data.name;
    if (data.email_local) {
      if (!isValidEmailLocal(data.email_local)) {
        UI.toast("Nome de e-mail inválido.", "warning");
        return;
      }
      body.email = buildEmail(data.email_local);
    }
  }
  if (data.password) body.password = data.password;
  if (isAdmin && !body.password) {
    UI.toast("Informe a nova senha.", "warning");
    return;
  }
  try {
    await api(`/admin/users/${u.id}`, { method: "PUT", body });
    UI.toast("Usuário atualizado.", "success");
    await renderUsers(status);
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

const RESET_STATUS_TAG = {
  pending: '<span class="tag warn">Pendente</span>',
  sent: '<span class="tag accent">Link enviado</span>',
  rejected: '<span class="tag danger">Rejeitada</span>',
  used: '<span class="tag">Concluída</span>',
  expired: '<span class="tag">Expirada</span>',
};

function renderUserDetailLogs(title, items, emptyText, renderItem) {
  return `<div class="card" style="margin-top:14px">
    <h3 style="margin-bottom:14px">${title}</h3>
    ${items.length ? items.map(renderItem).join("") : `<p class="hint">${emptyText}</p>`}
  </div>`;
}

async function showUserDetail(u) {
  const drawer = UI.openDrawer(`Usuário — ${u.name}`, UI.skeletonRows(5));
  try {
    const data = await api(`/admin/users/${u.id}`);
    const content = drawer.querySelector(".drawer-content");
    content.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:14px">Conta</h3>
        <div class="detail-item">
          <div class="di-head"><span class="di-name">${data.name}</span>${userStatusCell(data)}</div>
          <div class="di-meta">
            <span>${data.email}</span>
            <span>Cadastro: ${UI.fmtDate(data.created_at)}</span>
            <span>Último acesso: ${data.last_access ? UI.fmtDate(data.last_access) : "Nunca"}</span>
          </div>
        </div>
      </div>
      ${renderUserDetailLogs(
        "Últimos acessos",
        data.access_logs,
        "Nenhum acesso registrado.",
        (log) => `<div class="detail-item">
          <div class="di-head"><span class="di-name">${UI.fmtDate(log.created_at)}</span></div>
        </div>`
      )}
      ${renderUserDetailLogs(
        "Recuperações de senha",
        data.reset_requests,
        "Nenhuma solicitação registrada.",
        (req) => `<div class="detail-item">
          <div class="di-head">
            <span class="di-name">${UI.fmtDate(req.created_at)}</span>
            ${RESET_STATUS_TAG[req.status] || req.status}
          </div>
        </div>`
      )}
      <p class="hint" style="margin-top:14px">Dados da conta apenas. Informações financeiras não são exibidas ao administrador.</p>`;
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Fila de cadastros ----------
async function viewRegistrations() {
  const v = view();
  v.innerHTML = `
    ${adminPageHeadHtml("registrations")}
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;
  await renderRegistrations();
}

async function renderRegistrations() {
  const users = await api("/admin/users?status=pending").catch(() => []);
  const box = document.getElementById("list");
  if (!users.length) {
    box.innerHTML = `<div class="empty">${ICON.check}<p>Nenhuma solicitação pendente.</p></div>`;
    return;
  }
  box.innerHTML = `<table><thead><tr><th>Nome</th><th>E-mail</th><th>Solicitado em</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr>
      <td><b>${u.name}</b></td><td>${u.email}</td><td>${UI.fmtDate(u.created_at)}</td>
      <td><div class="actions-cell">
        <button class="btn btn-sm btn-primary" data-action="approve" data-id="${u.id}">${ICON.check} Aprovar</button>
        <button class="btn btn-sm btn-danger" data-action="reject" data-id="${u.id}">${ICON.x} Rejeitar</button>
      </div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleRegAction(btn.dataset.action, parseInt(btn.dataset.id), users);
  });
}

async function handleRegAction(action, id, users) {
  const u = users.find((x) => x.id === id);
  try {
    if (action === "approve") {
      const ok = await UI.confirmModal({ title: "Aprovar cadastro", message: `Aprovar a conta de ${u.name}?`, confirmText: "Aprovar" });
      if (!ok) return;
      await api(`/admin/users/${id}/approve`, { method: "POST" });
      UI.toast("Conta aprovada.", "success");
    }
    if (action === "reject") {
      const ok = await UI.confirmModal({ title: "Rejeitar cadastro", message: `Rejeitar e remover a solicitação de ${u.name}?`, confirmText: "Rejeitar", danger: true });
      if (!ok) return;
      await api(`/admin/users/${id}/reject`, { method: "POST" });
      UI.toast("Cadastro rejeitado.", "success");
    }
    await refreshCounts();
    await renderRegistrations();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

// ---------- Fila de reset de senha ----------
async function viewResets() {
  const v = view();
  v.innerHTML = `
    ${adminPageHeadHtml("resets")}
    <div class="table-wrap"><div id="list">${UI.skeletonRows(4)}</div></div>`;
  await renderResets();
}

const RESET_TAG = {
  pending: RESET_STATUS_TAG.pending,
  sent: '<span class="tag accent">Link Enviado</span>',
  rejected: RESET_STATUS_TAG.rejected,
  used: RESET_STATUS_TAG.used,
  expired: RESET_STATUS_TAG.expired,
};

async function renderResets() {
  const reqs = await api("/admin/password-resets").catch(() => []);
  const box = document.getElementById("list");
  if (!reqs.length) {
    box.innerHTML = `<div class="empty">${ICON.key}<p>Nenhuma solicitação de senha.</p></div>`;
    return;
  }
  box.innerHTML = `<table><thead><tr><th>Usuário</th><th>E-mail</th><th>Solicitado</th><th>Status</th><th></th></tr></thead><tbody>
    ${reqs.map((r) => `<tr>
      <td><b>${r.user_name || "-"}</b></td>
      <td>${r.user_email || "-"}</td>
      <td>${UI.fmtDate(r.created_at)}</td>
      <td>${RESET_TAG[r.status] || r.status}</td>
      <td><div class="actions-cell">
        ${r.status === "pending" ? `
          <button class="btn btn-sm btn-primary" data-action="approve" data-id="${r.id}">${ICON.check} Aprovar e enviar</button>
          <button class="btn btn-sm btn-danger" data-action="reject" data-id="${r.id}">${ICON.x} Rejeitar</button>` : ""}
        ${r.status === "sent" && r.reset_link ? `<button class="btn btn-sm btn-ghost" data-action="copy" data-link="${r.reset_link}">${ICON.key} Copiar link</button>` : ""}
        <button class="btn btn-icon btn-sm" data-action="history" data-uid="${r.user_id}" title="Histórico" aria-label="Histórico">${ICON.clock}</button>
      </div></td>
    </tr>`).join("")}
    </tbody></table>`;

  box.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => handleResetAction(btn.dataset, reqs);
  });
}

async function handleResetAction(ds, reqs) {
  const action = ds.action;
  try {
    if (action === "approve") {
      const ok = await UI.confirmModal({
        title: "Aprovar recuperação",
        message: "O sistema gerará o link e enviará ao e-mail do usuário (ou exibirá aqui se o SMTP estiver desabilitado).",
        confirmText: "Aprovar e enviar",
      });
      if (!ok) return;
      const res = await api(`/admin/password-resets/${ds.id}/approve`, { method: "POST" });
      UI.toast("Link gerado e enviado.", "success");
      if (res.reset_link) {
        await UI.confirmModal({
          title: "Link de redefinição",
          message: `Link (válido por tempo limitado):<br><br><code style="word-break:break-all">${res.reset_link}</code>`,
          confirmText: "Fechar",
        });
      }
    }
    if (action === "reject") {
      const ok = await UI.confirmModal({ title: "Rejeitar solicitação", message: "Negar este pedido de recuperação?", confirmText: "Rejeitar", danger: true });
      if (!ok) return;
      await api(`/admin/password-resets/${ds.id}/reject`, { method: "POST" });
      UI.toast("Solicitação rejeitada.", "success");
    }
    if (action === "copy") {
      await navigator.clipboard.writeText(ds.link).catch(() => {});
      UI.toast("Link copiado.", "success");
      return;
    }
    if (action === "history") {
      return showResetHistory(parseInt(ds.uid));
    }
    await refreshCounts();
    await renderResets();
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

async function showResetHistory(userId) {
  const drawer = UI.openDrawer("Histórico de solicitações", UI.skeletonRows(4));
  try {
    const reqs = await api(`/admin/password-resets/${userId}/history`);
    const content = drawer.querySelector(".drawer-content");
    if (!reqs.length) {
      content.innerHTML = `<div class="empty">${ICON.clock}<p>Sem histórico.</p></div>`;
      return;
    }
    content.innerHTML = reqs.map((r) => `
      <div class="detail-item">
        <div class="di-head"><span class="di-name">${UI.fmtDate(r.created_at)}</span>${RESET_TAG[r.status] || r.status}</div>
      </div>`).join("");
  } catch (e) {
    UI.toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", bootAdmin);
