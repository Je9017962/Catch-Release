// game.js — Screen management, catch/release logic, profile & XP

// ── State ───────────────────────────────────────────────────────
let currentFish  = null;
let catchLog     = [];
let totalXP      = 0;
const XP_PER_LEVEL = 100;

// ── Screen Manager ───────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ── Start AR from map pin ────────────────────────────────────────
function showARcast() {
  showScreen("screen-ar");
  // Small delay to let screen render before starting camera
  setTimeout(() => startAR(), 150);
}

// ── Called by ar-scene.js when fish is reeled in ─────────────────
window.onFishReeled = function () {
  currentFish = getRandomFish();
  populateCatchScreen(currentFish);

  // Use live camera frame as catch background if possible
  const catchBg  = document.getElementById("catch-bg");
  const arVideo  = document.getElementById("ar-video");
  if (arVideo && arVideo.srcObject) {
    catchBg.srcObject = arVideo.srcObject;
    catchBg.play().catch(() => {});
  }

  showScreen("screen-catch");
};

// ── Populate catch card ──────────────────────────────────────────
function populateCatchScreen(fish) {
  document.getElementById("caught-fish-display").textContent = fish.emoji;
  document.getElementById("caught-name").textContent         = fish.name;
}

// ── Open fish detail from catch card ────────────────────────────
function openFishDetail() {
  if (!currentFish) return;
  populateFishDetail(currentFish);
  showScreen("screen-fish-detail");
}

function populateFishDetail(fish) {
  document.getElementById("detail-title").textContent  = fish.name;
  document.getElementById("detail-photo").textContent  = fish.emoji;
  document.getElementById("detail-badge").textContent  = fish.badge;
  document.getElementById("detail-badge").style.background = fish.color || "var(--blue)";
  document.getElementById("d-sci").textContent      = fish.scientific;
  document.getElementById("d-size").textContent     = fish.size;
  document.getElementById("d-location").textContent = fish.location;
  document.getElementById("d-desc").textContent     = fish.description;
  document.getElementById("d-why").textContent      = fish.why;
}

// ── Keep fish ────────────────────────────────────────────────────
function keepFish() {
  if (!currentFish) return;
  logCatch(currentFish, "KEPT");
  awardXP(currentFish.xp);
  currentFish = null;
  showScreen("screen-main");
}

// ── Release fish ─────────────────────────────────────────────────
function releaseFish() {
  if (!currentFish) return;
  logCatch(currentFish, "RELEASED");
  awardXP(Math.round(currentFish.xp * 1.25)); // Bonus XP for releasing!
  currentFish = null;
  showScreen("screen-main");
}

// ── XP system ────────────────────────────────────────────────────
function awardXP(amount) {
  totalXP += amount;
  updateXPDisplay();
}

function updateXPDisplay() {
  const lvlXP  = totalXP % XP_PER_LEVEL;
  const pct    = (lvlXP / XP_PER_LEVEL) * 100;
  const fillEl = document.getElementById("xp-fill");
  const curEl  = document.getElementById("xp-cur");
  if (fillEl) fillEl.style.width = pct + "%";
  if (curEl)  curEl.textContent  = lvlXP;
}

// ── Catch log ────────────────────────────────────────────────────
function logCatch(fish, action) {
  const entry = {
    fish:   fish,
    action: action,
    time:   new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date:   new Date().toLocaleDateString([], { month: "short", day: "numeric" })
  };
  catchLog.unshift(entry); // newest first
  renderCatchLog();
}

function renderCatchLog() {
  const list = document.getElementById("log-list");
  if (!list) return;

  if (catchLog.length === 0) {
    list.innerHTML = '<p class="log-empty">No catches yet — go fish! 🎣</p>';
    return;
  }

  list.innerHTML = catchLog.map((entry, i) => `
    <div class="log-item" onclick="viewLogFish(${i})">
      <div class="log-fish-icon">${entry.fish.emoji}</div>
      <div class="log-fish-info">
        <div class="log-fish-name">${entry.fish.name}</div>
        <div class="log-fish-meta">${entry.date} · ${entry.time} · +${entry.fish.xp} XP</div>
      </div>
      <div class="log-action ${entry.action === 'KEPT' ? 'log-kept' : 'log-released'}">
        ${entry.action}
      </div>
    </div>
  `).join("");
}

function viewLogFish(index) {
  const entry = catchLog[index];
  if (!entry) return;
  currentFish = entry.fish;
  populateFishDetail(entry.fish);
  showScreen("screen-fish-detail");
}
