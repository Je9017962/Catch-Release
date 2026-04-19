// game.js — Screen management, catch/release, XP, profile
// Works in tandem with auth.js (which owns storage) and weather.js

// Globals (also read/written by auth.js)
window.currentUserEmail = null;
window.totalXP   = 0;
window.catchLog  = [];
window.currentFish = null;

const XP_PER_LEVEL = 100;
const RANK_TITLES  = [
  [0,   "BEGINNER ANGLER"],
  [100, "JUNIOR ANGLER"],
  [300, "SKILLED ANGLER"],
  [600, "EXPERT ANGLER"],
  [1000,"MASTER ANGLER"],
  [2000,"LEGENDARY ANGLER"],
];

// ── Screen manager ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ── Require auth guard ────────────────────────────────────────────
// Any screen that needs a logged-in user calls this first.
function requireAuth(then) {
  if (!window.currentUserEmail) {
    showScreen("screen-home");
    return false;
  }
  if (then) then();
  return true;
}

// ── Start AR ──────────────────────────────────────────────────────
function showARcast() {
  if (!requireAuth()) return;
  showScreen("screen-ar");
  if (typeof refreshARWeather === "function") refreshARWeather();
  setTimeout(() => startAR(), 150);
}

// ── Fish caught callback (from ar-scene.js) ───────────────────────
window.onFishReeled = function () {
  window.currentFish = getRandomFish();
  populateCatchScreen(window.currentFish);

  // Freeze camera frame as catch background
  const catchBg = document.getElementById("catch-bg");
  const arVideo = document.getElementById("ar-video");
  if (catchBg && arVideo && arVideo.srcObject) {
    catchBg.srcObject = arVideo.srcObject;
    catchBg.play().catch(() => {});
  }

  showScreen("screen-catch");
};

// ── Populate catch card ───────────────────────────────────────────
function populateCatchScreen(fish) {
  const imgEl = document.getElementById("caught-fish-img");
  if (imgEl) { imgEl.src = fish.img; imgEl.alt = fish.name; imgEl.onerror = () => imgEl.style.display = "none"; }

  setText("caught-name",    fish.name);
  setText("catch-xp-text",  "+" + fish.xp + " XP");
  setText("catch-fun-fact", "🎣 " + fish.funFact);

  const badgeEl = document.getElementById("catch-badge");
  if (badgeEl) { badgeEl.textContent = fish.badge; badgeEl.style.background = fish.badgeColor || "var(--blue)"; }
}

// ── Open fish detail ──────────────────────────────────────────────
function openFishDetail() {
  if (!window.currentFish) return;
  populateFishDetail(window.currentFish);
  showScreen("screen-fish-detail");
}

function populateFishDetail(fish) {
  const photo = document.getElementById("detail-photo-img");
  if (photo) { photo.src = fish.img; photo.alt = fish.name; photo.onerror = () => {}; }

  setText("detail-title",    fish.name);
  setText("d-sci",           fish.scientific);
  setText("d-size",          fish.size);
  setText("d-location",      fish.location);
  setText("d-conservation",  fish.conservation);
  setText("d-desc",          fish.description);
  setText("d-why",           fish.why);

  const badgeEl = document.getElementById("detail-badge");
  if (badgeEl) { badgeEl.textContent = fish.badge; badgeEl.style.background = fish.badgeColor || "var(--blue)"; }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

// ── Keep fish ─────────────────────────────────────────────────────
function keepFish() {
  if (!window.currentFish) return;
  logCatch(window.currentFish, "KEPT");
  awardXP(window.currentFish.xp);
  window.currentFish = null;
  persistCurrentUserData();
  showScreen("screen-main");
}

// ── Release fish ──────────────────────────────────────────────────
function releaseFish() {
  if (!window.currentFish) return;
  logCatch(window.currentFish, "RELEASED");
  awardXP(Math.round(window.currentFish.xp * 1.25));
  window.currentFish = null;
  persistCurrentUserData();
  showScreen("screen-main");
}

// ── XP ────────────────────────────────────────────────────────────
function awardXP(amount) {
  window.totalXP = (window.totalXP || 0) + amount;
  updateXPDisplay();
}

function updateXPDisplay() {
  const xp     = window.totalXP || 0;
  const lvlXP  = xp % XP_PER_LEVEL;
  const pct    = (lvlXP / XP_PER_LEVEL) * 100;

  const fill = document.getElementById("xp-fill");
  const cur  = document.getElementById("xp-cur");
  if (fill) fill.style.width = pct + "%";
  if (cur)  cur.textContent  = xp; // show total XP rather than just level XP

  // Rank
  let rank = RANK_TITLES[0][1];
  for (const [threshold, title] of RANK_TITLES) {
    if (xp >= threshold) rank = title;
  }
  const rankEl = document.getElementById("angler-rank");
  if (rankEl) rankEl.textContent = rank;
}

// ── Catch log ─────────────────────────────────────────────────────
function logCatch(fish, action) {
  window.catchLog = window.catchLog || [];
  window.catchLog.unshift({
    fishId: fish.id,
    name:   fish.name,
    img:    fish.img,
    badge:  fish.badge,
    color:  fish.badgeColor,
    xp:     fish.xp,
    action,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: new Date().toLocaleDateString([], { month: "short", day: "numeric" })
  });
  renderCatchLog();
}

function renderCatchLog() {
  const list = document.getElementById("log-list");
  if (!list) return;
  const log = window.catchLog || [];
  if (log.length === 0) {
    list.innerHTML = '<p class="log-empty">No catches yet — go fish! 🎣</p>';
    return;
  }
  list.innerHTML = log.map((e, i) => `
    <div class="log-item" onclick="viewLogEntry(${i})">
      <img class="log-fish-photo" src="${e.img || ''}" alt="${e.name}"
           onerror="this.style.display='none'">
      <div class="log-fish-info">
        <div class="log-fish-name">${e.name}</div>
        <div class="log-fish-meta">${e.date} · ${e.time} · +${e.xp} XP</div>
      </div>
      <div class="log-action ${e.action === 'KEPT' ? 'log-kept' : 'log-released'}">${e.action}</div>
    </div>`).join("");
}

function viewLogEntry(index) {
  const entry = (window.catchLog || [])[index];
  if (!entry) return;
  // Reconstruct a fish object from the log entry to display detail
  const fish = FISH_DATABASE.find(f => f.id === entry.fishId);
  if (fish) {
    window.currentFish = fish;
    populateFishDetail(fish);
    // Override back button to go to profile
    const backBtn = document.querySelector("#screen-fish-detail .back-arrow");
    if (backBtn) backBtn.setAttribute("onclick", "showScreen('screen-profile')");
    showScreen("screen-fish-detail");
  }
}
