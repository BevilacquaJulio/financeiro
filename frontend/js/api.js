// Cliente HTTP central. Token JWT no localStorage.
const TOKEN_KEY = "fin_token";

const Auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set token(v) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  },
  logout() {
    this.token = null;
    localStorage.removeItem("fin_user");
    sessionStorage.removeItem("fin_boot_loading");
    sessionStorage.removeItem("fin_boot_accent");
    sessionStorage.removeItem("fin_boot_loading_at");
    window.location.href = "/index.html";
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem("fin_user"));
    } catch {
      return null;
    }
  },
  set user(u) {
    if (u) localStorage.setItem("fin_user", JSON.stringify(u));
    else localStorage.removeItem("fin_user");
  },
};

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    Auth.token = null;
    if (!window.location.pathname.endsWith("index.html")) {
      window.location.href = "/index.html";
    }
    throw new Error("Sessão expirada.");
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = (data && data.detail) || "Erro inesperado.";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

window.api = api;
window.Auth = Auth;
