// game.js — Screen management, fish display with real images, catch/release, XP

let currentFish  = null;
let catchLog     = [];
let totalXP      = 0;
const XP_PER_LEVEL = 100;

// ── Screen Manager ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ── Start AR from map ─────────────────────────────────────────────
function showARcast() {
  showScreen("screen-ar");
  setTimeout(() => startAR(), 150);
}

// ── Called by ar-scene.js when fish is successfully reeled ────────
window.onFishReeled = function () {
  currentFish = getRandomFish();
  populateCatchScreen(currentFish);

  // Use frozen camera frame as background on catch screen
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
  // Real photo
  const imgEl = document.getElementById("caught-fish-img");
  if (imgEl) {
    imgEl.src = fish.img;
    imgEl.alt = fish.name;
    imgEl.onerror = function() { this.style.display="none"; };
  }
  const nameEl = document.getElementById("caught-name");
  if (nameEl) nameEl.textContent = fish.name;

  const xpEl = document.getElementById("catch-xp-text");
  if (xpEl) xpEl.textContent = "+" + fish.xp + " XP";

  const badgeEl = document.getElementById("catch-badge");
  if (badgeEl) {
    badgeEl.textContent = fish.badge;
    badgeEl.style.background = fish.badgeColor || "var(--blue)";
  }

  const factEl = document.getElementById("catch-fun-fact");
  if (factEl) factEl.textContent = "🎣 " + fish.funFact;
}

// ── Open fish detail card ─────────────────────────────────────────
function openFishDetail() {
  if (!currentFish) return;
  populateFishDetail(currentFish);
  showScreen("screen-fish-detail");
}

function populateFishDetail(fish) {
  // Photo
  const photo = document.getElementById("detail-photo-img");
  if (photo) {
    photo.src = fish.img;
    photo.alt = fish.name;
    photo.onerror = function() { this.style.fontSize="5rem"; this.src=""; };
  }

  const titleEl = document.getElementById("detail-title");
  if (titleEl) titleEl.textContent = fish.name;

  const badgeEl = document.getElementById("detail-badge");
  if (badgeEl) {
    badgeEl.textContent = fish.badge;
    badgeEl.style.background = fish.badgeColor || "var(--blue)";
  }

  setText("d-sci",         fish.scientific);
  setText("d-size",        fish.size);
  setText("d-location",    fish.location);
  setText("d-conservation",fish.conservation);
  setText("d-desc",        fish.description);
  setText("d-why",         fish.why);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

// ── Keep fish ─────────────────────────────────────────────────────
function keepFish() {
  if (!currentFish) return;
  logCatch(currentFish, "KEPT");
  awardXP(currentFish.xp);
  currentFish = null;
  showScreen("screen-main");
}

// ── Release fish ──────────────────────────────────────────────────
function releaseFish() {
  if (!currentFish) return;
  logCatch(currentFish, "RELEASED");
  awardXP(Math.round(currentFish.xp * 1.25)); // Bonus XP for releasing
  currentFish = null;
  showScreen("screen-main");
}

// ── XP ────────────────────────────────────────────────────────────
function awardXP(amount) {
  totalXP += amount;
  updateXPDisplay();
}
function updateXPDisplay() {
  const lvlXP = totalXP % XP_PER_LEVEL;
  const pct   = (lvlXP / XP_PER_LEVEL) * 100;
  const fill  = document.getElementById("xp-fill");
  const cur   = document.getElementById("xp-cur");
  if (fill) fill.style.width = pct + "%";
  if (cur)  cur.textContent  = lvlXP;
}

// ── Catch log ─────────────────────────────────────────────────────
function logCatch(fish, action) {
  catchLog.unshift({
    fish, action,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: new Date().toLocaleDateString([], { month: "short", day: "numeric" })
  });
  renderCatchLog();
}

function renderCatchLog() {
  const list = document.getElementById("log-list");
  if (!list) return;
  if (catchLog.length === 0) {
    list.innerHTML = '<p class="log-empty">No catches yet — go fish! 🎣</p>';
    return;
  }
  list.innerHTML = catchLog.map((e, i) => `
    <div class="log-item" onclick="viewLogFish(${i})">
      <img class="log-fish-photo" src="${e.fish.img}" alt="${e.fish.name}"
           onerror="this.style.display='none'">
      <div class="log-fish-info">
        <div class="log-fish-name">${e.fish.name}</div>
        <div class="log-fish-meta">${e.date} · ${e.time} · +${e.fish.xp} XP</div>
      </div>
      <div class="log-action ${e.action === 'KEPT' ? 'log-kept' : 'log-released'}">${e.action}</div>
    </div>`).join("");
}

function viewLogFish(index) {
  const entry = catchLog[index];
  if (!entry) return;
  currentFish = entry.fish;
  populateFishDetail(entry.fish);
  showScreen("screen-fish-detail");
}
