// Role picker for the Doktori desktop app — plain JS, no bundler required.
// Tauri's WebView persists localStorage per-origin, so we store the role there.

const ROLE_KEY = "doktori.role";
const SERVER_URL = "https://doktori.tn";

const LOGIN_URLS = {
  doctor: "/connexion",
  secretary: "/secretaire-login",
};

function gotoApp(role) {
  const path = LOGIN_URLS[role] ?? LOGIN_URLS.doctor;
  const url = new URL(SERVER_URL + path);
  url.searchParams.set("app", "desktop");
  url.searchParams.set("role", role);
  window.location.href = url.toString();
}

function main() {
  const loading = document.getElementById("loading");
  const picker = document.getElementById("picker");

  const params = new URLSearchParams(window.location.search);
  const forcePick = params.get("picker") === "1";
  const storedRole = localStorage.getItem(ROLE_KEY);

  if (storedRole && !forcePick) {
    gotoApp(storedRole);
    return;
  }

  loading.classList.add("hidden");
  picker.classList.remove("hidden");

  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.getAttribute("data-role");
      if (!role) return;
      localStorage.setItem(ROLE_KEY, role);
      gotoApp(role);
    });
  });
}

main();
