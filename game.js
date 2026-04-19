// game.js — Screen management, catch/release logic, profile & XP, env (weather/time)

// ── State ───────────────────────────────────────────────────────
let currentFish = null;
let catchLog = [];
let totalXP = 0;
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
  const catchBg = document.getElementById("catch-bg");
  const arVideo = document.getElementById("ar-video");
  if (arVideo && arVideo.srcObject && catchBg) {
    catchBg.srcObject = arVideo.srcObject;
    catchBg.play().catch(() => { });
  }

  showScreen("screen-catch");
};

// ── Populate catch card ──────────────────────────────────────────
function populateCatchScreen(fish) {
  const emojiEl = document.getElementById("caught-fish-display");
  const nameEl = document.getElementById("caught-name");
  if (emojiEl) emojiEl.textContent = fish.emoji;
  if (nameEl) nameEl.textContent = fish.name;
}

// ── Open fish detail from catch card ────────────────────────────
function openFishDetail() {
  if (!currentFish) return;
  populateFishDetail(currentFish);
  showScreen("screen-fish-detail");
}

function populateFishDetail(fish) {
  const titleEl = document.getElementById("detail-title");
  const photoEl = document.getElementById("detail-photo");
  const badgeEl = document.getElementById("detail-badge");

  if (titleEl) titleEl.textContent = fish.name;
  if (photoEl) photoEl.textContent = fish.emoji;
  if (badgeEl) {
    badgeEl.textContent = fish.badge;
    badgeEl.style.background = fish.color || "var(--blue)";
  }

  const sciEl = document.getElementById("d-sci");
  const sizeEl = document.getElementById("d-size");
  const locEl = document.getElementById("d-location");
  const descEl = document.getElementById("d-desc");
  const whyEl = document.getElementById("d-why");

  if (sciEl) sciEl.textContent = fish.scientific;
  if (sizeEl) sizeEl.textContent = fish.size;
  if (locEl) locEl.textContent = fish.location;
  if (descEl) descEl.textContent = fish.description;
  if (whyEl) whyEl.textContent = fish.why;
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
  const lvlXP = totalXP % XP_PER_LEVEL;
  const pct = (lvlXP / XP_PER_LEVEL) * 100;
  const fillEl = document.getElementById("xp-fill");
  const curEl = document.getElementById("xp-cur");
  if (fillEl) fillEl.style.width = pct + "%";
  if (curEl) curEl.textContent = lvlXP;
}

// ── Catch log ────────────────────────────────────────────────────
function logCatch(fish, action) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  const entry = {
    fish: fish,
    action: action,
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz
    }),
    date: now.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      timeZone: tz
    })
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

// ── Environment: location, weather, date & time ─────────────────

// Call this once on app load (e.g. in a script tag or DOMContentLoaded)
function initEnvironment() {
  updateDateTime();
  setInterval(updateDateTime, 60000); // refresh every minute

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateWeather(latitude, longitude);
      },
      () => {
        // Fallback: Lake Eola (Orlando) coords
        updateWeather(28.5437, -81.3733);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 }
    );
  } else {
    // No geolocation, fallback to Lake Eola
    updateWeather(28.5437, -81.3733);
  }
}

function updateDateTime() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  const dateEl = document.getElementById("w-date");
  const timeEl = document.getElementById("w-time");

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: tz
    });
  }

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz
    });
  }
}

async function updateWeather(lat, lon) {
  const tempEl = document.getElementById("w-temp");
  const locEl = document.getElementById("w-location");
  if (!tempEl && !locEl) return;

  try {
    const apiKey = "YOUR_OPENWEATHERMAP_API_KEY"; // replace with real key
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (tempEl && data.main && typeof data.main.temp === "number") {
      tempEl.textContent = Math.round(data.main.temp) + "°F";
    }
    if (locEl && data.name) {
      locEl.textContent = data.name;
    }
  } catch (err) {
    console.error("Weather error:", err);
  }
}

// Optional: auto-init when DOM is ready
window.addEventListener("load", () => {
  try {
    initEnvironment();
  } catch (_) { }
});
