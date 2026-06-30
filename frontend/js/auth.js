// Logica das telas de autenticacao (login, cadastro, recuperacao, reset).

const EMAIL_DOMAIN = "@financeiro.com.br";
const EMAIL_LOCAL_RE = /^[a-z0-9][a-z0-9._-]*$/;

function setLogo(id) {
  const e = document.getElementById(id);
  if (e) e.innerHTML = ICON.wallet;
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const tabs = document.getElementById("authTabs");
  const panels = document.getElementById("authPanels");
  if (!tabLogin || !tabRegister || !loginForm || !registerForm) return;

  const toLogin = mode === "login";
  if (toLogin && loginForm.classList.contains("auth-panel--active")) return;
  if (!toLogin && registerForm.classList.contains("auth-panel--active")) return;

  tabs.dataset.active = toLogin ? "login" : "register";
  panels.dataset.direction = toLogin ? "left" : "right";

  tabLogin.classList.toggle("active", toLogin);
  tabRegister.classList.toggle("active", !toLogin);
  tabLogin.setAttribute("aria-selected", toLogin ? "true" : "false");
  tabRegister.setAttribute("aria-selected", !toLogin ? "true" : "false");

  loginForm.classList.toggle("auth-panel--active", toLogin);
  registerForm.classList.toggle("auth-panel--active", !toLogin);
  loginForm.setAttribute("aria-hidden", toLogin ? "false" : "true");
  registerForm.setAttribute("aria-hidden", !toLogin ? "false" : "true");
}

/** Remove @ e dominio se colado; mantem so a parte local. */
function sanitizeEmailLocal(raw) {
  let v = (raw || "").trim().toLowerCase();
  if (v.includes("@")) v = v.split("@")[0];
  return v.replace(/[^a-z0-9._-]/g, "");
}

function buildEmail(local) {
  const part = sanitizeEmailLocal(local);
  return part ? `${part}${EMAIL_DOMAIN}` : "";
}

function isValidEmailLocal(local) {
  const part = sanitizeEmailLocal(local);
  return part.length >= 1 && EMAIL_LOCAL_RE.test(part);
}

function emailLocalFromFull(email) {
  if (!email) return "";
  const lower = email.toLowerCase();
  if (lower.endsWith(EMAIL_DOMAIN)) return lower.slice(0, -EMAIL_DOMAIN.length);
  return sanitizeEmailLocal(email.split("@")[0] || "");
}

function bindEmailLocalInput(input, { onValidate } = {}) {
  if (!input) return;
  const wrap = input.closest(".email-field");
  const validate = () => {
    const cleaned = sanitizeEmailLocal(input.value);
    if (input.value !== cleaned) input.value = cleaned;
    const ok = isValidEmailLocal(cleaned);
    if (wrap) {
      wrap.classList.toggle("valid", ok && cleaned.length > 0);
      wrap.classList.toggle("invalid", cleaned.length > 0 && !ok);
    }
    onValidate?.(ok, cleaned);
  };
  input.addEventListener("input", validate);
  input.addEventListener("blur", validate);
}

function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]/\\;'`~]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  return score;
}

function renderStrength(pwd) {
  const bar = document.getElementById("strengthBar");
  if (!bar) return;
  const score = passwordStrength(pwd);
  const pct = [0, 30, 55, 80, 100][score];
  const colors = ["transparent", "var(--danger)", "var(--warning)", "var(--accent)", "var(--accent)"];
  bar.style.width = pct + "%";
  bar.style.background = colors[score];
}

function validPassword(pwd) {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[!@#$%^&*(),.?":{}|<>_\-+=\[\]/\\;'`~]/.test(pwd)
  );
}

function initDemoCredentials(loginEmailLocal, loginPassword) {
  document.querySelectorAll(".auth-demo-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const local = btn.dataset.emailLocal || "";
      const password = btn.dataset.password || "";
      if (loginEmailLocal) {
        loginEmailLocal.value = local;
        loginEmailLocal.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (loginPassword) loginPassword.value = password;
      switchAuthTab("login");
      UI.toast(`Conta ${local}${EMAIL_DOMAIN} preenchida.`, "success");
    });
  });
}

function initApiDocsPanel() {
  const overlay = document.getElementById("apiDocsOverlay");
  const frame = document.getElementById("apiDocsFrame");
  const btnOpen = document.getElementById("btnApiDocs");
  const btnClose = document.getElementById("btnApiDocsClose");
  const iconOpen = document.getElementById("btnApiDocsIcon");
  const iconClose = document.getElementById("btnApiDocsCloseIcon");
  if (!overlay || !frame || !btnOpen || !btnClose) return;

  if (iconOpen) iconOpen.innerHTML = ICON.bookOpen;
  if (iconClose) iconClose.innerHTML = ICON.x;

  const open = () => {
    if (frame.getAttribute("src") === "about:blank") frame.setAttribute("src", "/docs");
    overlay.classList.remove("hidden");
    overlay.hidden = false;
    document.body.classList.add("api-docs-open");
    btnClose.focus();
  };

  const close = () => {
    overlay.classList.add("hidden");
    overlay.hidden = true;
    document.body.classList.remove("api-docs-open");
    btnOpen.focus();
  };

  btnOpen.addEventListener("click", open);
  btnClose.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
}

// ---------- index.html ----------
function initLoginPage() {
  setLogo("logo");
  if (Auth.token) {
    window.location.href = "/dashboard.html";
    return;
  }

  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  tabLogin.onclick = () => switchAuthTab("login");
  tabRegister.onclick = () => switchAuthTab("register");

  const loginEmailLocal = document.getElementById("loginEmailLocal");
  const loginPassword = document.getElementById("loginPassword");
  const regEmailLocal = document.getElementById("regEmailLocal");
  const emailHint = document.getElementById("emailHint");

  bindEmailLocalInput(loginEmailLocal);
  initDemoCredentials(loginEmailLocal, loginPassword);
  initApiDocsPanel();
  bindEmailLocalInput(regEmailLocal, {
    onValidate(ok, cleaned) {
      if (!emailHint) return;
      if (!cleaned) {
        emailHint.className = "hint";
        emailHint.textContent = "Digite apenas o nome antes do @. Letras, números, pontos e hífens.";
        return;
      }
      if (ok) {
        emailHint.className = "hint ok";
        emailHint.textContent = `Seu e-mail será ${cleaned}${EMAIL_DOMAIN}`;
      } else {
        emailHint.className = "hint error";
        emailHint.textContent = "Nome de e-mail inválido. Use letras, números, pontos ou hífens.";
      }
    },
  });

  const regPassword = document.getElementById("regPassword");
  const pwdHint = document.getElementById("pwdHint");
  regPassword.addEventListener("input", () => {
    renderStrength(regPassword.value);
    if (validPassword(regPassword.value)) {
      pwdHint.className = "hint ok";
      pwdHint.textContent = "Senha forte.";
    } else {
      pwdHint.className = "hint";
      pwdHint.textContent = "Mín. 8 caracteres, 1 maiúscula e 1 especial.";
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const local = loginEmailLocal.value;
    if (!isValidEmailLocal(local)) {
      UI.toast("Informe um nome de e-mail válido.", "warning");
      return;
    }
    const btn = loginForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          email: buildEmail(local),
          password: document.getElementById("loginPassword").value,
          remember_me: document.getElementById("rememberMe").checked,
        },
      });
      Auth.token = data.access_token;
      Auth.user = data.user;
      const dest = data.user.role === "admin" ? "/admin.html" : "/dashboard.html";
      UI.startLoginTransition(data.user, dest);
    } catch (err) {
      if (err.message.toLowerCase().includes("pendente")) {
        localStorage.setItem("fin_status_msg", err.message);
        window.location.href = "/status.html";
        return;
      }
      UI.toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const local = regEmailLocal.value;
    const pwd = regPassword.value;
    if (!isValidEmailLocal(local)) {
      UI.toast("Informe um nome de e-mail válido.", "warning");
      return;
    }
    if (!validPassword(pwd)) {
      UI.toast("A senha não atende aos requisitos.", "warning");
      return;
    }
    const btn = registerForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api("/auth/register", {
        method: "POST",
        auth: false,
        body: {
          name: document.getElementById("regName").value.trim(),
          email: buildEmail(local),
          password: pwd,
        },
      });
      localStorage.setItem(
        "fin_status_msg",
        "Cadastro recebido! Sua conta está aguardando aprovação do administrador."
      );
      window.location.href = "/status.html";
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- status.html ----------
function initStatusPage() {
  setLogo("logo");
  const msg = localStorage.getItem("fin_status_msg") || "Sua conta está aguardando aprovação do administrador.";
  const box = document.getElementById("statusMsg");
  if (box) box.textContent = msg;
}

// ---------- forgot.html ----------
function initForgotPage() {
  setLogo("logo");
  const forgotEmailLocal = document.getElementById("forgotEmailLocal");
  bindEmailLocalInput(forgotEmailLocal);

  const form = document.getElementById("forgotForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const local = forgotEmailLocal.value;
    if (!isValidEmailLocal(local)) {
      UI.toast("Informe um nome de e-mail válido.", "warning");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/auth/password/forgot", {
        method: "POST",
        auth: false,
        body: { email: buildEmail(local) },
      });
      document.getElementById("forgotForm").classList.add("hidden");
      document.getElementById("forgotDone").classList.remove("hidden");
      document.getElementById("forgotDoneMsg").textContent = data.message;
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- reset.html ----------
function initResetPage() {
  setLogo("logo");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const form = document.getElementById("resetForm");

  if (!token) {
    form.classList.add("hidden");
    document.getElementById("resetError").classList.remove("hidden");
    return;
  }

  const pwd = document.getElementById("resetPassword");
  pwd.addEventListener("input", () => renderStrength(pwd.value));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = pwd.value;
    const confirm = document.getElementById("resetConfirm").value;
    if (!validPassword(p)) {
      UI.toast("A senha não atende aos requisitos.", "warning");
      return;
    }
    if (p !== confirm) {
      UI.toast("As senhas não coincidem.", "warning");
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await api("/auth/password/reset", {
        method: "POST",
        auth: false,
        body: { token, password: p },
      });
      form.classList.add("hidden");
      document.getElementById("resetDone").classList.remove("hidden");
    } catch (err) {
      UI.toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

window.EMAIL_DOMAIN = EMAIL_DOMAIN;
window.sanitizeEmailLocal = sanitizeEmailLocal;
window.buildEmail = buildEmail;
window.isValidEmailLocal = isValidEmailLocal;
window.emailLocalFromFull = emailLocalFromFull;
window.bindEmailLocalInput = bindEmailLocalInput;

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") initLoginPage();
  else if (page === "status") initStatusPage();
  else if (page === "forgot") initForgotPage();
  else if (page === "reset") initResetPage();
});
