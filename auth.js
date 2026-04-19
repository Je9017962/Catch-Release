// auth.js — Secure local authentication
// Passwords are hashed with SHA-256 (via SubtleCrypto) before storage.
// No plaintext passwords are ever written to localStorage.
// User data key: "car_users"  |  Session key: "car_session"

// ── Hashing ───────────────────────────────────────────────────────
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data     = encoder.encode(password + "catch_release_salt_v1");
  const hashBuf  = await crypto.subtle.digest("SHA-256", data);
  // Convert to hex string
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Storage helpers ───────────────────────────────────────────────
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("car_users") || "{}");
  } catch { return {}; }
}
function saveUsers(users) {
  localStorage.setItem("car_users", JSON.stringify(users));
}
function getSession() {
  try {
    return JSON.parse(localStorage.getItem("car_session") || "null");
  } catch { return null; }
}
function saveSession(email) {
  localStorage.setItem("car_session", JSON.stringify({ email, ts: Date.now() }));
}
function clearSession() {
  localStorage.removeItem("car_session");
}

// ── Show / hide error ─────────────────────────────────────────────
function setError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}
function setSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

// ── Validation ────────────────────────────────────────────────────
function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── SIGN UP ───────────────────────────────────────────────────────
async function doSignup() {
  const name     = (document.getElementById("signup-name")?.value     || "").trim();
  const email    = (document.getElementById("signup-email")?.value    || "").trim().toLowerCase();
  const password = (document.getElementById("signup-password")?.value || "");
  const confirm  = (document.getElementById("signup-confirm")?.value  || "");

  setError("signup-error", "");

  if (!name)                           return setError("signup-error", "Please enter your name.");
  if (!isValidEmail(email))            return setError("signup-error", "Please enter a valid email address.");
  if (password.length < 8)             return setError("signup-error", "Password must be at least 8 characters.");
  if (password !== confirm)            return setError("signup-error", "Passwords do not match.");

  const users = getUsers();
  if (users[email])                    return setError("signup-error", "An account with this email already exists.");

  const hash = await hashPassword(password);
  users[email] = {
    name,
    email,
    hash,
    createdAt: Date.now(),
    onboarded: false,
    totalXP:   0,
    catchLog:  []
  };
  saveUsers(users);
  saveSession(email);

  // Clear inputs
  ["signup-name","signup-email","signup-password","signup-confirm"]
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });

  // New user → show onboarding
  showScreen("screen-onboarding");
}

// ── LOG IN ────────────────────────────────────────────────────────
async function doLogin() {
  const email    = (document.getElementById("login-email")?.value    || "").trim().toLowerCase();
  const password = (document.getElementById("login-password")?.value || "");

  setError("login-error", "");

  if (!isValidEmail(email)) return setError("login-error", "Please enter a valid email address.");
  if (!password)            return setError("login-error", "Please enter your password.");

  const users = getUsers();
  const user  = users[email];

  if (!user) return setError("login-error", "No account found with that email.");

  const hash = await hashPassword(password);
  if (hash !== user.hash) return setError("login-error", "Incorrect password. Please try again.");

  // Clear inputs
  ["login-email","login-password"]
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });

  saveSession(email);

  if (!user.onboarded) {
    showScreen("screen-onboarding");
  } else {
    enterApp();
  }
}

// ── RESET PASSWORD ────────────────────────────────────────────────
async function doReset() {
  const email = (document.getElementById("reset-email")?.value  || "").trim().toLowerCase();
  const pass1 = (document.getElementById("reset-pass1")?.value  || "");
  const pass2 = (document.getElementById("reset-pass2")?.value  || "");

  setError("reset-error",   "");
  setSuccess("reset-success","");

  if (!isValidEmail(email)) return setError("reset-error", "Please enter a valid email address.");
  if (pass1.length < 8)     return setError("reset-error", "Password must be at least 8 characters.");
  if (pass1 !== pass2)      return setError("reset-error", "Passwords do not match.");

  const users = getUsers();
  if (!users[email])        return setError("reset-error", "No account found with that email.");

  users[email].hash = await hashPassword(pass1);
  saveUsers(users);

  ["reset-email","reset-pass1","reset-pass2"]
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });

  setSuccess("reset-success", "✓ Password updated! You can now log in.");
  setTimeout(() => showScreen("screen-login"), 1800);
}

// ── LOG OUT ───────────────────────────────────────────────────────
function doLogout() {
  // Persist any unsaved game state first
  persistCurrentUserData();
  clearSession();
  showScreen("screen-home");
}

// ── ONBOARDING COMPLETE ───────────────────────────────────────────
function completeOnboarding() {
  const session = getSession();
  if (session) {
    const users = getUsers();
    if (users[session.email]) {
      users[session.email].onboarded = true;
      saveUsers(users);
    }
  }
  enterApp();
}

// ── ENTER APP (after login / onboarding) ─────────────────────────
function enterApp() {
  const session = getSession();
  if (!session) { showScreen("screen-home"); return; }

  const users = getUsers();
  const user  = users[session.email];
  if (!user)  { clearSession(); showScreen("screen-home"); return; }

  // Restore user state into game variables (defined in game.js)
  window.currentUserEmail = session.email;
  window.totalXP   = user.totalXP  || 0;
  window.catchLog  = user.catchLog  || [];

  // Update profile UI
  const unameEl = document.getElementById("profile-username");
  if (unameEl) unameEl.textContent = user.name;

  updateXPDisplay();
  renderCatchLog();
  showScreen("screen-main");

  // Kick off live weather fetch
  if (typeof fetchWeather === "function") fetchWeather();
}

// ── PERSIST user data back to localStorage ────────────────────────
function persistCurrentUserData() {
  const email = window.currentUserEmail;
  if (!email) return;
  const users = getUsers();
  if (!users[email]) return;
  users[email].totalXP  = window.totalXP  || 0;
  users[email].catchLog = window.catchLog || [];
  saveUsers(users);
}

// ── AUTO-LOGIN on page load ───────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (!session) return; // stay on home screen

  // Session expires after 30 days
  const AGE_MS = 30 * 24 * 60 * 60 * 1000;
  if (Date.now() - session.ts > AGE_MS) {
    clearSession();
    return;
  }

  const users = getUsers();
  if (!users[session.email]) { clearSession(); return; }

  // Valid session — go straight in
  enterApp();
});

// ── Auto-persist every 30 seconds while app is open ──────────────
setInterval(persistCurrentUserData, 30000);

// ── Also persist on page hide (tab close / background) ───────────
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistCurrentUserData();
});
