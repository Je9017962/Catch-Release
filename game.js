// Jeremiah Morris-Wyley
// game.js — Screen/nav management, audio, image loading, catch/release, XP, event wiring

window.currentUserEmail = null;
window.totalXP   = 0;
window.catchLog  = [];
window.currentFish = null;

const XP_PER_LEVEL = 100;
const RANK_TITLES = [
    [0,    "BEGINNER ANGLER"],
    [100,  "JUNIOR ANGLER"],
    [300,  "SKILLED ANGLER"],
    [600,  "EXPERT ANGLER"],
    [1000, "MASTER ANGLER"],
    [2000, "LEGENDARY ANGLER"],
];

// Maps screen IDs to which nav tab should be highlighted
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

// ── Web Audio sound engine (no MP3 files required) ────────────────
let audio_ctx = null;

function getAudioCtx() {
    if (!audio_ctx) audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (audio_ctx.state === "suspended") audio_ctx.resume();
    return audio_ctx;
}

function playSound(type) {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        switch (type) {
            case "cast": {
                // Whoosh: short white noise burst fading out
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                }
                const src = ctx.createBufferSource();
                src.buffer = buf;
                const filter = ctx.createBiquadFilter();
                filter.type = "highpass";
                filter.frequency.value = 800;
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                src.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                src.start(now);
                break;
            }
            case "bite": {
                // Two short alert pings
                [0, 0.18].forEach(delay => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = 880;
                    gain.gain.setValueAtTime(0, now + delay);
                    gain.gain.linearRampToValueAtTime(0.4, now + delay + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + delay);
                    osc.stop(now + delay + 0.15);
                });
                break;
            }
            case "reel": {
                // Ratchet clicking: rapid frequency sweep
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(600, now + 0.5);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.56);
                break;
            }
            case "catch": {
                // Triumphant ascending chime
                [440, 554, 659, 880].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.value = freq;
                    const t0 = now + i * 0.1;
                    gain.gain.setValueAtTime(0, t0);
                    gain.gain.linearRampToValueAtTime(0.35, t0 + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t0);
                    osc.stop(t0 + 0.42);
                });
                break;
            }
            case "release": {
                // Gentle descending splash
                [659, 523, 392].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.value = freq;
                    const t0 = now + i * 0.12;
                    gain.gain.setValueAtTime(0, t0);
                    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t0);
                    osc.stop(t0 + 0.36);
                });
                break;
            }
        }
    } catch (e) { /* silently fail if audio is blocked */ }
}

// ── Screen + nav manager ──────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) {
        el.classList.add("active");
        el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
    }
    updateNavActive(id);
}

function goTo(screen_id) {
    showScreen(screen_id);
}

function updateNavActive(screen_id) {
    const active_tab = NAV_MAP[screen_id];
    document.querySelectorAll(".nav-btn").forEach(btn => {
        const label = btn.textContent.trim().toLowerCase();
        const is_active = label === active_tab;
        btn.classList.toggle("active", is_active);
        if (is_active) btn.setAttribute("aria-current", "page");
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

// ── Fish caught callback (called from ar-scene.js) ────────────────
window.onFishReeled = function () {
    window.currentFish = getRandomFish();
    populateCatchScreen(window.currentFish);
    playSound("catch");
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);

    const bg_canvas = document.getElementById("catch-bg-canvas");
    if (bg_canvas) {
        bg_canvas.width  = window.innerWidth;
        bg_canvas.height = window.innerHeight;
        const ar_video = document.getElementById("ar-video");
        if (ar_video && ar_video.srcObject && ar_video.videoWidth) {
            const ctx = bg_canvas.getContext("2d");
            ctx.drawImage(ar_video, 0, 0, bg_canvas.width, bg_canvas.height);
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(0, 0, bg_canvas.width, bg_canvas.height);
        } else {
            const ctx = bg_canvas.getContext("2d");
            const w = bg_canvas.width, h = bg_canvas.height;
            ctx.fillStyle = "#1565C0";
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            for (let i = 0; i < 12; i++) {
                ctx.fillRect(0, h * 0.3 + i * h * 0.06, w, 2);
            }
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(0, 0, w, h);
        }
    }

    showScreen("screen-catch");
};

// ── Populate catch card ───────────────────────────────────────────
function populateCatchScreen(fish) {
    const img_el = document.getElementById("caught-fish-img");
    if (img_el) img_el.alt = fish.name;
    loadFishImage(fish, img_el);

    setText("caught-name",    fish.name);
    setText("catch-xp-text",  "+" + fish.xp + " XP");
    setText("catch-fun-fact", "🎣 " + fish.funFact);

    const badge_el = document.getElementById("catch-badge");
    if (badge_el) {
        badge_el.textContent = fish.badge;
        badge_el.style.background = fish.badgeColor || "var(--blue)";
    }
}

// ── Fish detail ───────────────────────────────────────────────────
function openFishDetail() {
    if (!window.currentFish) return;
    const back = document.getElementById("fish-detail-back");
    if (back) back.dataset.target = "screen-catch";
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
    const badge_el = document.getElementById("detail-badge");
    if (badge_el) {
        badge_el.textContent = fish.badge;
        badge_el.style.background = fish.badgeColor || "var(--blue)";
    }
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
    const xp = window.totalXP || 0;
    const lvl_xp = xp % XP_PER_LEVEL;
    const pct = (lvl_xp / XP_PER_LEVEL) * 100;
    const fill_el  = document.getElementById("xp-fill");
    const cur_el   = document.getElementById("xp-cur");
    const track_el = document.getElementById("xp-track");
    if (fill_el)  fill_el.style.width = pct + "%";
    if (cur_el)   cur_el.textContent  = xp;
    if (track_el) track_el.setAttribute("aria-valuenow", Math.round(pct));

    let rank = RANK_TITLES[0][1];
    for (const [threshold, title] of RANK_TITLES) {
        if (xp >= threshold) rank = title;
    }
    const rank_el = document.getElementById("angler-rank");
    if (rank_el) rank_el.textContent = rank;

    const count_el = document.getElementById("fish-count");
    if (count_el) count_el.textContent = (window.catchLog || []).length;
}

// ── Catch log ─────────────────────────────────────────────────────
function logCatch(fish, action) {
    window.catchLog = window.catchLog || [];
    window.catchLog.unshift({
        fishId: fish.id, name: fish.name,
        imgs: fish.imgs, svgColor: fish.svgColor, svgAccent: fish.svgAccent,
        badge: fish.badge, color: fish.badgeColor, xp: fish.xp, action: action,
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
        list.innerHTML = '<p class="log-empty">No catches yet. Head out and start fishing! 🎣</p>';
        updateXPDisplay();
        return;
    }

    // Group entries by fish species (fishId)
    const groups = {};
    log.forEach((e, i) => {
        if (!groups[e.fishId]) {
            groups[e.fishId] = { name: e.name, fishId: e.fishId, xp: e.xp, entries: [], fish_like: {
                imgs: e.imgs || [], svgColor: e.svgColor, svgAccent: e.svgAccent, name: e.name, id: e.fishId
            }};
        }
        groups[e.fishId].entries.push({ ...e, original_index: i });
    });

    // Build HTML — one card per species
    let html = "";
    let group_index = 0;
    Object.values(groups).forEach(group => {
        const kept_count     = group.entries.filter(e => e.action === "KEPT").length;
        const released_count = group.entries.filter(e => e.action === "RELEASED").length;
        const total          = group.entries.length;
        const most_recent    = group.entries[0];

        // Most recent log index for clicking through to fish detail
        const first_original_index = most_recent.original_index;

        html += `
        <div class="log-group" role="button" tabindex="0"
             aria-label="${group.name} — ${total} caught, tap to view detail"
             data-log-index="${first_original_index}"
             data-group-id="${group_index}">
            <div class="log-group-img-wrap">
                <img class="log-fish-photo" src="" alt="${group.name}" data-group-img="${group_index}"/>
                ${total > 1 ? `<div class="log-count-badge">${total}</div>` : ""}
            </div>
            <div class="log-fish-info">
                <div class="log-fish-name">${group.name}</div>
                <div class="log-fish-meta">+${group.xp} XP each</div>
                <div class="log-action-counts">
                    ${released_count > 0 ? `<span class="log-action log-released">🌊 ${released_count} Released</span>` : ""}
                    ${kept_count > 0     ? `<span class="log-action log-kept">🎣 ${kept_count} Kept</span>` : ""}
                </div>
            </div>
        </div>`;
        group_index++;
    });

    list.innerHTML = html;

    // Attach click/keydown to each group card
    list.querySelectorAll(".log-group").forEach(item => {
        item.addEventListener("click", () => viewLogEntry(parseInt(item.dataset.logIndex)));
        item.addEventListener("keydown", e => {
            if (e.key === "Enter") viewLogEntry(parseInt(item.dataset.logIndex));
        });
    });

    // Load images for each group card
    let img_group_index = 0;
    Object.values(groups).forEach(group => {
        const img = list.querySelector(`img[data-group-img="${img_group_index}"]`);
        if (img) loadFishImage(group.fish_like, img);
        img_group_index++;
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
    const back = document.getElementById("fish-detail-back");
    if (back) back.dataset.target = "screen-profile";
    showScreen("screen-fish-detail");
}

// ── Image loading ─────────────────────────────────────────────────
function loadFishImage(fish, img_el) {
    if (!img_el) return;
    img_el.classList.add("img-loading");
    img_el.style.display = "";
    const sources = (fish.imgs || []).filter(Boolean);

    function tryNext(index) {
        if (index >= sources.length) {
            img_el.src = makeFishSVG(fish);
            img_el.classList.remove("img-loading");
            img_el.onerror = null;
            return;
        }
        const test = new Image();
        test.crossOrigin = "anonymous";
        let timed_out = false;
        const timer = setTimeout(() => { timed_out = true; tryNext(index + 1); }, 6000);
        test.onload = () => {
            if (timed_out) return;
            clearTimeout(timer);
            img_el.src = sources[index];
            img_el.classList.remove("img-loading");
            img_el.onerror = () => { img_el.classList.add("img-loading"); tryNext(index + 1); };
        };
        test.onerror = () => { if (timed_out) return; clearTimeout(timer); tryNext(index + 1); };
        test.src = sources[index];
    }
    tryNext(0);
}

// ── Wire up all event listeners (replaces inline onclick handlers) ─
document.addEventListener("DOMContentLoaded", () => {

    // Splash screen buttons
    document.getElementById("btn-go-login")?.addEventListener("click", () => showScreen("screen-login"));
    document.getElementById("btn-go-signup")?.addEventListener("click", () => showScreen("screen-signup"));
    document.getElementById("btn-go-reset")?.addEventListener("click", () => showScreen("screen-reset"));
    document.getElementById("btn-go-reset")?.addEventListener("keydown", e => {
        if (e.key === "Enter") showScreen("screen-reset");
    });

    // Sign up
    document.getElementById("signup-back")?.addEventListener("click", () => showScreen("screen-home"));
    document.getElementById("signup-btn")?.addEventListener("click", doSignup);
    document.getElementById("signup-go-login")?.addEventListener("click", () => showScreen("screen-login"));
    document.getElementById("signup-go-login")?.addEventListener("keydown", e => {
        if (e.key === "Enter") showScreen("screen-login");
    });

    // Login
    document.getElementById("login-back")?.addEventListener("click", () => showScreen("screen-home"));
    document.getElementById("login-btn")?.addEventListener("click", doLogin);
    document.getElementById("login-go-signup")?.addEventListener("click", () => showScreen("screen-signup"));
    document.getElementById("login-go-signup")?.addEventListener("keydown", e => {
        if (e.key === "Enter") showScreen("screen-signup");
    });
    document.getElementById("login-go-reset")?.addEventListener("click", () => showScreen("screen-reset"));
    document.getElementById("login-go-reset")?.addEventListener("keydown", e => {
        if (e.key === "Enter") showScreen("screen-reset");
    });

    // Reset password
    document.getElementById("reset-back")?.addEventListener("click", () => showScreen("screen-login"));
    document.getElementById("reset-btn")?.addEventListener("click", doReset);

    // Onboarding
    document.getElementById("onboard-complete-btn")?.addEventListener("click", completeOnboarding);

    // Home / map screen
    document.getElementById("logout-btn")?.addEventListener("click", doLogout);
    document.getElementById("map-fish-btn")?.addEventListener("click", showARcast);
    document.getElementById("nav-profile-main")?.addEventListener("click", () => goTo("screen-profile"));
    document.getElementById("nav-help-main")?.addEventListener("click", () => goTo("screen-help"));

    // Help screen
    document.getElementById("help-back")?.addEventListener("click", () => goTo("screen-main"));
    document.getElementById("help-nav-profile")?.addEventListener("click", () => goTo("screen-profile"));
    document.getElementById("help-nav-home")?.addEventListener("click", () => goTo("screen-main"));

    // AR screen
    document.getElementById("ar-close-btn")?.addEventListener("click", stopAR);
    document.getElementById("reel-btn")?.addEventListener("click", doReel);
    document.getElementById("ar-nav-profile")?.addEventListener("click", () => { stopAR(); goTo("screen-profile"); });
    document.getElementById("ar-nav-home")?.addEventListener("click", () => stopAR());
    document.getElementById("ar-nav-help")?.addEventListener("click", () => { stopAR(); goTo("screen-help"); });

    // Catch card
    document.getElementById("catch-learn-more-btn")?.addEventListener("click", openFishDetail);
    document.getElementById("catch-release-btn")?.addEventListener("click", releaseFish);
    document.getElementById("catch-keep-btn")?.addEventListener("click", keepFish);

    // Fish detail — back button uses data-target set dynamically
    document.getElementById("fish-detail-back")?.addEventListener("click", () => {
        const back = document.getElementById("fish-detail-back");
        const target = back?.dataset.target || "screen-catch";
        showScreen(target);
    });
    document.getElementById("detail-nav-profile")?.addEventListener("click", () => goTo("screen-profile"));
    document.getElementById("detail-nav-home")?.addEventListener("click", () => goTo("screen-main"));
    document.getElementById("detail-nav-help")?.addEventListener("click", () => goTo("screen-help"));

    // Profile screen
    document.getElementById("profile-nav-home")?.addEventListener("click", () => goTo("screen-main"));
    document.getElementById("profile-nav-help")?.addEventListener("click", () => goTo("screen-help"));
});
