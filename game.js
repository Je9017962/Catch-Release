// game.js — Screen/nav management, audio, image loading, catch/release, XP

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

// ── Web Audio sound engine (no MP3 files required) ────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (type === "cast") {
      // Whoosh: short white noise burst fading out
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass"; filter.frequency.value = 800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(now);

    } else if (type === "bite") {
      // Two short alert pings
      [0, 0.18].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.4, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + delay); osc.stop(now + delay + 0.15);
      });

    } else if (type === "reel") {
      // Ratchet clicking: rapid frequency sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.56);

    } else if (type === "catch") {
      // Triumphant ascending chime
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle"; osc.frequency.value = freq;
        const t0 = now + i * 0.1;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.35, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 0.42);
      });

    } else if (type === "release") {
      // Gentle descending splash
      [659, 523, 392].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine"; osc.frequency.value = freq;
        const t0 = now + i * 0.12;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 0.36);
      });
    }
  } catch (e) { /* silently fail if audio blocked */ }
}

// ── Screen + nav manager ──────────────────────────────────────────
// Maps screen IDs to which nav button should be highlighted
const NAV_MAP = {
  "screen-main":        "home",
  "screen-ar":          "home",
  "screen-catch":       "home",
  "screen-fish-detail": "profile",
  "screen-profile":     "profile",
  "screen-help":        "help",
  "screen-onboarding":  null,
  "screen-home":        null,
  "screen-login":       null,
  "screen-signup":      null,
  "screen-reset":       null,
};

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add("active");
    // Move focus to screen for screen readers
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
  updateNavActive(id);
}

// goTo is the public version — used by nav buttons
function goTo(screenId) {
  showScreen(screenId);
}

function updateNavActive(screenId) {
  const activeTab = NAV_MAP[screenId];
  // Update all bottom navs across screens
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const label = btn.textContent.trim().toLowerCase();
    const isActive = label === activeTab;
    btn.classList.toggle("active", isActive);
    if (isActive) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

// ── Auth guard ────────────────────────────────────────────────────
function requireAuth(then) {
  if (!window.currentUserEmail) { showScreen("screen-home"); return false; }
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
  playSound("catch");
  if (navigator.vibrate) navigator.vibrate([100, 50, 200]);

  // Draw lake scene on the catch background canvas
  const bgCanvas = document.getElementById("catch-bg-canvas");
  if (bgCanvas) {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    // Try to grab a frame from the AR video
    const arVideo = document.getElementById("ar-video");
    if (arVideo && arVideo.srcObject && arVideo.videoWidth) {
      const ctx = bgCanvas.getContext("2d");
      ctx.drawImage(arVideo, 0, 0, bgCanvas.width, bgCanvas.height);
      // Darken it
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    } else {
      // Fallback: paint a lake scene
      const ctx = bgCanvas.getContext("2d");
      const w = bgCanvas.width, h = bgCanvas.height;
      ctx.fillStyle = "#1565C0"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let i=0;i<12;i++) { ctx.fillRect(0, h*0.3+i*h*0.06, w, 2); }
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0,0,w,h);
    }
  }

  showScreen("screen-catch");
};

// ── Populate catch card ───────────────────────────────────────────
function populateCatchScreen(fish) {
  const imgEl = document.getElementById("caught-fish-img");
  if (imgEl) imgEl.alt = fish.name;
  loadFishImage(fish, imgEl);

  setText("caught-name",    fish.name);
  setText("catch-xp-text",  "+" + fish.xp + " XP");
  setText("catch-fun-fact", "🎣 " + fish.funFact);

  const badgeEl = document.getElementById("catch-badge");
  if (badgeEl) { badgeEl.textContent = fish.badge; badgeEl.style.background = fish.badgeColor || "var(--blue)"; }
}

// ── Fish detail ───────────────────────────────────────────────────
function openFishDetail() {
  if (!window.currentFish) return;
  // Back button returns to catch card
  const back = document.getElementById("fish-detail-back");
  if (back) back.setAttribute("onclick", "showScreen('screen-catch')");
  populateFishDetail(window.currentFish);
  showScreen("screen-fish-detail");
}

function populateFishDetail(fish) {
  const photo = document.getElementById("detail-photo-img");
  if (photo) photo.alt = fish.name;
  loadFishImage(fish, photo);
  setText("detail-title",   fish.name);
  setText("d-sci",          fish.scientific);
  setText("d-size",         fish.size);
  setText("d-location",     fish.location);
  setText("d-conservation", fish.conservation);
  setText("d-desc",         fish.description);
  setText("d-why",          fish.why);
  const badgeEl = document.getElementById("detail-badge");
  if (badgeEl) { badgeEl.textContent = fish.badge; badgeEl.style.background = fish.badgeColor || "var(--blue)"; }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

// ── Keep / Release ────────────────────────────────────────────────
function keepFish() {
  if (!window.currentFish) return;
  logCatch(window.currentFish, "KEPT");
  awardXP(window.currentFish.xp);
  playSound("catch");
  window.currentFish = null;
  if (typeof persistCurrentUserData === "function") persistCurrentUserData();
  showSessionToast();
  showScreen("screen-main");
}

function releaseFish() {
  if (!window.currentFish) return;
  logCatch(window.currentFish, "RELEASED");
  awardXP(Math.round(window.currentFish.xp * 1.25));
  playSound("release");
  if (navigator.vibrate) navigator.vibrate([40]);
  window.currentFish = null;
  if (typeof persistCurrentUserData === "function") persistCurrentUserData();
  showSessionToast();
  showScreen("screen-main");
}

// ── Session summary toast ─────────────────────────────────────────
function showSessionToast() {
  const total = (window.catchLog || []).length;
  const released = (window.catchLog || []).filter(e => e.action === "RELEASED").length;
  const msg = total === 1
    ? "First catch! 🎉"
    : `${total} fish caught · ${released} released 🌊`;
  const toast = document.createElement("div");
  toast.className = "session-toast";
  toast.textContent = msg;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── XP ────────────────────────────────────────────────────────────
function awardXP(amount) {
  window.totalXP = (window.totalXP || 0) + amount;
  updateXPDisplay();
}

function updateXPDisplay() {
  const xp    = window.totalXP || 0;
  const lvlXP = xp % XP_PER_LEVEL;
  const pct   = (lvlXP / XP_PER_LEVEL) * 100;
  const fill  = document.getElementById("xp-fill");
  const cur   = document.getElementById("xp-cur");
  const track = document.getElementById("xp-track");
  if (fill)  fill.style.width = pct + "%";
  if (cur)   cur.textContent  = xp;
  if (track) track.setAttribute("aria-valuenow", Math.round(pct));

  let rank = RANK_TITLES[0][1];
  for (const [threshold, title] of RANK_TITLES) { if (xp >= threshold) rank = title; }
  const rankEl = document.getElementById("angler-rank");
  if (rankEl) rankEl.textContent = rank;

  // Update fish count
  const countEl = document.getElementById("fish-count");
  if (countEl) countEl.textContent = (window.catchLog || []).length;
}

// ── Catch log ─────────────────────────────────────────────────────
function logCatch(fish, action) {
  window.catchLog = window.catchLog || [];
  window.catchLog.unshift({
    fishId: fish.id, name: fish.name,
    imgs: fish.imgs, svgColor: fish.svgColor, svgAccent: fish.svgAccent,
    badge: fish.badge, color: fish.badgeColor, xp: fish.xp, action,
    time: new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
    date: new Date().toLocaleDateString([], { month:"short", day:"numeric" })
  });
  renderCatchLog();
}

function renderCatchLog() {
  const list = document.getElementById("log-list");
  if (!list) return;
  const log = window.catchLog || [];
  if (log.length === 0) {
    list.innerHTML = '<p class="log-empty">No catches yet. Head out and start fishing! 🎣</p>';
    updateXPDisplay();
    return;
  }
  list.innerHTML = log.map((e, i) => `
    <div class="log-item" onclick="viewLogEntry(${i})" role="button" tabindex="0"
         aria-label="${e.name} — ${e.action} on ${e.date}"
         onkeydown="if(event.key==='Enter')viewLogEntry(${i})">
      <div class="log-img-wrap">
        <img class="log-fish-photo" src="" alt="${e.name}" data-idx="${i}"/>
      </div>
      <div class="log-fish-info">
        <div class="log-fish-name">${e.name}</div>
        <div class="log-fish-meta">${e.date} · ${e.time} · +${e.xp} XP</div>
      </div>
      <div class="log-action ${e.action==='KEPT'?'log-kept':'log-released'}">${e.action}</div>
    </div>`).join("");

  log.forEach((e, i) => {
    const img = list.querySelector(`img[data-idx="${i}"]`);
    if (!img) return;
    const fishLike = { imgs: e.imgs||[], svgColor: e.svgColor, svgAccent: e.svgAccent, name: e.name, id: e.fishId };
    loadFishImage(fishLike, img);
  });

  updateXPDisplay();
}

function viewLogEntry(index) {
  const entry = (window.catchLog || [])[index];
  if (!entry) return;
  const fish = FISH_DATABASE.find(f => f.id === entry.fishId);
  if (!fish) return;
  window.currentFish = fish;
  populateFishDetail(fish);
  // Back button goes to profile when coming from log
  const back = document.getElementById("fish-detail-back");
  if (back) back.setAttribute("onclick", "goTo('screen-profile')");
  showScreen("screen-fish-detail");
}

// ── Image loading ─────────────────────────────────────────────────
function loadFishImage(fish, imgEl) {
  if (!imgEl) return;
  imgEl.classList.add("img-loading");
  imgEl.style.display = "";
  const sources = (fish.imgs || []).filter(Boolean);

  function tryNext(index) {
    if (index >= sources.length) {
      imgEl.src = makeFishSVG(fish);
      imgEl.classList.remove("img-loading");
      imgEl.onerror = null;
      return;
    }
    const test = new Image();
    test.crossOrigin = "anonymous";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; tryNext(index + 1); }, 6000);
    test.onload = () => {
      if (timedOut) return;
      clearTimeout(timer);
      imgEl.src = sources[index];
      imgEl.classList.remove("img-loading");
      imgEl.onerror = () => { imgEl.classList.add("img-loading"); tryNext(index + 1); };
    };
    test.onerror = () => { if (timedOut) return; clearTimeout(timer); tryNext(index + 1); };
    test.src = sources[index];
  }
  tryNext(0);
}

