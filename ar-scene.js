// Jeremiah Morris-Wyley
// ar-scene.js — AR fishing scene: phone camera + canvas overlay.
// Features:
//   • Rich animated lake fallback (parallax sky, hills, trees, dock, water)
//   • Semi-transparent water overlay on live camera feed
//   • Drawn fishing rod held in bottom-right
//   • Cast arc animation (line arcs out to bobber)
//   • 5 species-accurate fish silhouettes swimming before cast
//   • Bobber with bob/dip/ripple
//   • Reel pull-up animation
//   • Caught-fish splash reveal drawn on canvas

"use strict";

// ── State ─────────────────────────────────────────────────────────
let video_stream   = null;
let ar_running     = false;
let has_camera_feed = false;
let cast_state     = "idle"; // idle | casting | cast | biting | reeling
let bobber_x = 0, bobber_y = 0, bobber_anim = 0;
let bite_timeout   = null;
let touch_start_x  = 0, touch_start_y = 0, touch_start_t = 0;
let cast_progress  = 0;   // 0 → 1 during cast arc animation
let cast_target_x  = 0, cast_target_y = 0;
let swim_time      = 0;
let water_scroll_x = 0;   // horizontal scroll for water ripple texture
let sky_time       = 0;

// ── Fish species data for swimming sprites ────────────────────────
const SWIM_FISH = [
    { x: 0.18, y: 0.70, dx:  0.00055, dy:  0.00018, size: 28, species: "bass",     flip: false, phase: 0.0 },
    { x: 0.62, y: 0.78, dx: -0.00045, dy:  0.00025, size: 22, species: "bluegill", flip: true,  phase: 1.4 },
    { x: 0.38, y: 0.85, dx:  0.00065, dy: -0.00020, size: 34, species: "bass",     flip: false, phase: 2.7 },
    { x: 0.80, y: 0.73, dx: -0.00070, dy:  0.00012, size: 18, species: "crappie",  flip: true,  phase: 0.9 },
    { x: 0.50, y: 0.80, dx:  0.00040, dy:  0.00030, size: 25, species: "gar",      flip: false, phase: 2.1 },
    { x: 0.28, y: 0.92, dx: -0.00035, dy: -0.00010, size: 20, species: "bluegill", flip: true,  phase: 3.3 },
];

// ── Start AR ──────────────────────────────────────────────────────
async function startAR() {
    ar_running  = false;
    cast_state  = "idle";
    bobber_anim = 0;
    swim_time   = 0;
    clearTimeout(bite_timeout);

    const video  = document.getElementById("ar-video");
    const canvas = document.getElementById("ar-canvas");

    try {
        if (video_stream) { video_stream.getTracks().forEach(t => t.stop()); video_stream = null; }
        video_stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = video_stream;
        video.style.display = "";
        await video.play();
        has_camera_feed = true;
        const setSize = () => {
            canvas.width  = video.videoWidth  || window.innerWidth;
            canvas.height = video.videoHeight || window.innerHeight;
        };
        if (video.videoWidth) setSize();
        else video.addEventListener("loadedmetadata", setSize, { once: true });
    } catch (err) {
        console.warn("Camera unavailable:", err.message);
        has_camera_feed = false;
        video.style.display = "none";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    ar_running = true;

    const screen = document.getElementById("screen-ar");
    screen.addEventListener("touchstart", onTouchStart, { passive: true });
    screen.addEventListener("touchend",   onTouchEnd,   { passive: true });
    screen.addEventListener("mousedown",  onMouseDown);
    screen.addEventListener("mouseup",    onMouseUp);

    showInstruction("cast");
    hideBiteBanner();
    hideReelButton();
    requestAnimationFrame(drawLoop);
}

// ── Stop / cleanup ────────────────────────────────────────────────
function stopAR() {
    ar_running = false;
    cast_state = "idle";
    clearTimeout(bite_timeout);
    if (video_stream) { video_stream.getTracks().forEach(t => t.stop()); video_stream = null; }
    const video = document.getElementById("ar-video");
    if (video) { video.srcObject = null; video.style.display = ""; }
    const screen = document.getElementById("screen-ar");
    screen.removeEventListener("touchstart", onTouchStart);
    screen.removeEventListener("touchend",   onTouchEnd);
    screen.removeEventListener("mousedown",  onMouseDown);
    screen.removeEventListener("mouseup",    onMouseUp);
    clearCanvas();
    hideReelButton();
    hideBiteBanner();
    hideInstructions();
    if (typeof goTo === "function") goTo("screen-main");
}

// ── Main draw loop ────────────────────────────────────────────────
let last_ts = 0;

function drawLoop(ts) {
    if (!ar_running) return;
    const dt = Math.min((ts - last_ts) / 1000, 0.05);
    last_ts  = ts;
    swim_time    += dt;
    water_scroll_x = (water_scroll_x + dt * 18) % 120;
    sky_time       += dt;

    const canvas = document.getElementById("ar-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!has_camera_feed) {
        drawLakeScene(ctx, w, h, ts);
    } else {
        drawWaterOverlay(ctx, w, h, ts);
    }

    drawAllFish(ctx, w, h);
    drawRod(ctx, w, h);

    if (cast_state === "casting") {
        cast_progress = Math.min(cast_progress + dt * 3.5, 1);
        drawCastArc(ctx, w, h, cast_progress);
        if (cast_progress >= 1) {
            cast_state = "cast";
            bobber_x   = cast_target_x;
            bobber_y   = cast_target_y;
            showInstruction("reel");
            if (typeof playSound === "function") playSound("cast");
            bite_timeout = setTimeout(triggerBite, 1800 + Math.random() * 2800);
        }
    }

    if (cast_state === "cast" || cast_state === "biting") {
        bobber_anim += dt;
        const dip = cast_state === "biting" ? Math.abs(Math.sin(bobber_anim * 8)) * 14 : 0;
        drawBobber(ctx, bobber_x, bobber_y + Math.sin(bobber_anim * 1.8) * 5 + dip);
    }

    if (cast_state === "reeling") {
        drawBobber(ctx, bobber_x, bobber_y);
    }

    requestAnimationFrame(drawLoop);
}

// ── Scene drawing ─────────────────────────────────────────────────
function drawLakeScene(ctx, w, h, ts) {
    // Sky gradient
    const sky_grad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky_grad.addColorStop(0, "#87CEEB");
    sky_grad.addColorStop(1, "#B0E0FF");
    ctx.fillStyle = sky_grad;
    ctx.fillRect(0, 0, w, h * 0.55);

    // Animated clouds
    drawClouds(ctx, w, h, ts);

    // Hills
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.52);
    ctx.quadraticCurveTo(w * 0.25, h * 0.32, w * 0.5, h * 0.50);
    ctx.quadraticCurveTo(w * 0.75, h * 0.68, w, h * 0.52);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Trees
    drawTrees(ctx, w, h);

    // Dock
    drawDock(ctx, w, h);

    // Water
    const water_grad = ctx.createLinearGradient(0, h * 0.52, 0, h);
    water_grad.addColorStop(0, "#1565C0");
    water_grad.addColorStop(1, "#0D47A1");
    ctx.fillStyle = water_grad;
    ctx.fillRect(0, h * 0.52, w, h * 0.48);

    // Water ripples
    drawWaterRipples(ctx, w, h);
}

function drawClouds(ctx, w, h, ts) {
    const cloud_positions = [
        { x: 0.1, y: 0.08, scale: 1.0 },
        { x: 0.45, y: 0.05, scale: 0.75 },
        { x: 0.78, y: 0.10, scale: 0.9 },
    ];
    cloud_positions.forEach(c => {
        const cx = ((c.x * w + ts * 6) % (w + 200)) - 100;
        const cy = c.y * h;
        const s = c.scale;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.beginPath();
        ctx.arc(cx, cy, 28 * s, 0, Math.PI * 2);
        ctx.arc(cx + 30 * s, cy - 8 * s, 22 * s, 0, Math.PI * 2);
        ctx.arc(cx + 55 * s, cy, 25 * s, 0, Math.PI * 2);
        ctx.arc(cx + 28 * s, cy + 10 * s, 20 * s, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawTrees(ctx, w, h) {
    const tree_positions = [0.05, 0.12, 0.82, 0.90, 0.96];
    tree_positions.forEach(tx => {
        const x = tx * w;
        const y = h * 0.50;
        ctx.fillStyle = "#2E7D32";
        ctx.beginPath();
        ctx.moveTo(x, y - 55);
        ctx.lineTo(x - 18, y);
        ctx.lineTo(x + 18, y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 80);
        ctx.lineTo(x - 14, y - 38);
        ctx.lineTo(x + 14, y - 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#5D4037";
        ctx.fillRect(x - 4, y, 8, 18);
    });
}

function drawDock(ctx, w, h) {
    const dx = w * 0.62, dy = h * 0.52;
    ctx.fillStyle = "#8D6E63";
    ctx.fillRect(dx, dy - 6, 80, 8);
    ctx.fillRect(dx + 8,  dy + 2, 6, 22);
    ctx.fillRect(dx + 66, dy + 2, 6, 22);
}

function drawWaterRipples(ctx, w, h) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
        const rx = ((i * 110 + water_scroll_x * 2.2) % (w + 80)) - 40;
        const ry = h * 0.58 + i * h * 0.044;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.bezierCurveTo(rx + 30, ry - 4, rx + 60, ry + 4, rx + 90, ry);
        ctx.stroke();
    }
}

function drawWaterOverlay(ctx, w, h, ts) {
    const overlay_grad = ctx.createLinearGradient(0, h * 0.45, 0, h);
    overlay_grad.addColorStop(0, "rgba(13,71,161,0)");
    overlay_grad.addColorStop(0.18, "rgba(13,71,161,0.38)");
    overlay_grad.addColorStop(1, "rgba(13,71,161,0.68)");
    ctx.fillStyle = overlay_grad;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);
    drawWaterRipples(ctx, w, h);
}

function drawRod(ctx, w, h) {
    const rx = w * 0.88, ry = h * 0.78;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-0.52);
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-80, -130);
    ctx.stroke();
    ctx.strokeStyle = "#8D6E63";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-80, -130);
    ctx.lineTo(-95, -165);
    ctx.stroke();
    ctx.fillStyle = "#37474F";
    ctx.beginPath();
    ctx.arc(4, 6, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCastArc(ctx, w, h, progress) {
    const rod_tip_x = w * 0.88 + (-95) * Math.cos(-0.52 - Math.PI / 2);
    const rod_tip_y = h * 0.78 + (-95) * Math.sin(-0.52 - Math.PI / 2);
    const ctrl_x = (rod_tip_x + cast_target_x) / 2;
    const ctrl_y = Math.min(rod_tip_y, cast_target_y) - 80;
    const t = progress;
    const bx = (1 - t) * (1 - t) * rod_tip_x + 2 * (1 - t) * t * ctrl_x + t * t * cast_target_x;
    const by = (1 - t) * (1 - t) * rod_tip_y + 2 * (1 - t) * t * ctrl_y + t * t * cast_target_y;

    ctx.save();
    ctx.strokeStyle = "rgba(200,200,200,0.75)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(rod_tip_x, rod_tip_y);
    ctx.quadraticCurveTo(ctrl_x, ctrl_y, bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawBobber(ctx, x, y) {
    ctx.save();
    // Ripple ring
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 18, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Line from rod tip
    const rod_tip_x = w_canvas_ref() * 0.88 + (-95) * Math.cos(-0.52 - Math.PI / 2);
    const rod_tip_y = h_canvas_ref() * 0.78 + (-95) * Math.sin(-0.52 - Math.PI / 2);
    ctx.strokeStyle = "rgba(200,200,200,0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rod_tip_x, rod_tip_y);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Float body (red top, white bottom)
    ctx.fillStyle = "#E53935";
    ctx.beginPath();
    ctx.arc(x, y - 4, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(x, y - 4, 8, 0, Math.PI);
    ctx.fill();
    // Centre band
    ctx.fillStyle = "#37474F";
    ctx.fillRect(x - 8, y - 5, 16, 2);
    ctx.restore();
}

// Helper to get canvas size without re-querying on every frame
function w_canvas_ref() {
    const c = document.getElementById("ar-canvas");
    return c ? c.width : window.innerWidth;
}
function h_canvas_ref() {
    const c = document.getElementById("ar-canvas");
    return c ? c.height : window.innerHeight;
}

// ── Fish swimming ─────────────────────────────────────────────────
function drawAllFish(ctx, w, h) {
    const water_top = has_camera_feed ? h * 0.45 : h * 0.52;
    SWIM_FISH.forEach(f => {
        f.x += f.dx;
        f.y += f.dy * Math.sin(swim_time * 0.6 + f.phase);
        if (f.x < 0.04 || f.x > 0.96) { f.dx *= -1; f.flip = !f.flip; }
        f.y = Math.max(0.50, Math.min(0.95, f.y));
        const fx = f.x * w, fy = f.y * h;
        if (fy < water_top) return;
        const alpha = Math.min(1, (fy - water_top) / 30) * 0.82;
        if (alpha < 0.05) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawFishSprite(ctx, fx, fy, f.size, f.species, f.flip, swim_time, f.phase);
        ctx.restore();
    });
}

function drawFishSprite(ctx, x, y, sz, species, flip, t, phase) {
    const wag = Math.sin(t * 3.2 + phase) * 0.15;
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(wag);

    switch (species) {
        case "gar": {
            ctx.fillStyle = "#7B6914";
            ctx.beginPath();
            ctx.ellipse(0, 0, sz * 1.6, sz * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#5D4E37";
            ctx.beginPath();
            ctx.ellipse(-sz * 1.9, 0, sz * 0.65, sz * 0.14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#5D4E37";
            ctx.beginPath();
            ctx.moveTo(sz * 1.5, 0);
            ctx.lineTo(sz * 2.1, -sz * 0.45);
            ctx.lineTo(sz * 2.1,  sz * 0.45);
            ctx.closePath();
            ctx.fill();
            break;
        }
        case "bluegill": {
            ctx.fillStyle = "#1565C0";
            ctx.beginPath();
            ctx.ellipse(0, 0, sz * 0.9, sz * 0.72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#FFA726";
            ctx.beginPath();
            ctx.ellipse(0, sz * 0.2, sz * 0.55, sz * 0.38, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#0D47A1";
            ctx.beginPath();
            ctx.moveTo(sz * 0.8, 0);
            ctx.lineTo(sz * 1.35, -sz * 0.55);
            ctx.lineTo(sz * 1.35,  sz * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#1A237E";
            ctx.beginPath();
            ctx.ellipse(sz * 0.62, -sz * 0.05, sz * 0.2, sz * 0.28, 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case "crappie": {
            ctx.fillStyle = "#37474F";
            ctx.beginPath();
            ctx.ellipse(0, 0, sz, sz * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            [[-sz * 0.1, -sz * 0.2], [sz * 0.3, sz * 0.1], [-sz * 0.35, sz * 0.15], [sz * 0.1, -sz * 0.35]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(dx, dy, sz * 0.13, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = "#263238";
            ctx.beginPath();
            ctx.moveTo(-sz * 0.3, -sz * 0.65);
            ctx.lineTo( sz * 0.5, -sz * 0.65);
            ctx.lineTo( sz * 0.3, 0);
            ctx.lineTo(-sz * 0.1, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#263238";
            ctx.beginPath();
            ctx.moveTo(sz * 0.9, 0);
            ctx.lineTo(sz * 1.45, -sz * 0.6);
            ctx.lineTo(sz * 1.45,  sz * 0.6);
            ctx.closePath();
            ctx.fill();
            break;
        }
        default: {
            // Largemouth bass
            ctx.fillStyle = "#2E7D32";
            ctx.beginPath();
            ctx.ellipse(0, 0, sz, sz * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.22)";
            ctx.beginPath();
            ctx.ellipse(sz * 0.05, sz * 0.18, sz * 0.7, sz * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.rect(-sz * 0.8, -sz * 0.08, sz * 1.6, sz * 0.16);
            ctx.fill();
            ctx.fillStyle = "#1B5E20";
            ctx.beginPath();
            ctx.moveTo(-sz * 0.2, -sz * 0.52);
            ctx.lineTo( sz * 0.6, -sz * 0.52);
            ctx.lineTo( sz * 0.4, 0);
            ctx.lineTo(-sz * 0.1, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#1B5E20";
            ctx.beginPath();
            ctx.moveTo(sz * 0.9, 0);
            ctx.lineTo(sz * 1.4, -sz * 0.6);
            ctx.lineTo(sz * 1.3, -sz * 0.1);
            ctx.lineTo(sz * 1.3,  sz * 0.1);
            ctx.lineTo(sz * 1.4,  sz * 0.6);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Eye (all species)
    const eye_x = -(sz * (species === "gar" ? 1.4 : 0.52));
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(eye_x, -sz * 0.08, sz * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(eye_x, -sz * 0.08, sz * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function clearCanvas() {
    const c = document.getElementById("ar-canvas");
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

// ── Touch / mouse handlers ────────────────────────────────────────
function onTouchStart(e) {
    if (e.target.closest("button, nav")) return;
    touch_start_x = e.touches[0].clientX;
    touch_start_y = e.touches[0].clientY;
    touch_start_t = Date.now();
}

function onTouchEnd(e) {
    if (e.target.closest("button, nav")) return;
    const t = e.changedTouches[0];
    handleGesture(t.clientX - touch_start_x, t.clientY - touch_start_y, Date.now() - touch_start_t, t.clientX, t.clientY);
}

function onMouseDown(e) {
    if (e.target.closest("button, nav")) return;
    touch_start_x = e.clientX;
    touch_start_y = e.clientY;
    touch_start_t = Date.now();
}

function onMouseUp(e) {
    if (e.target.closest("button, nav")) return;
    handleGesture(e.clientX - touch_start_x, e.clientY - touch_start_y, Date.now() - touch_start_t, e.clientX, e.clientY);
}

function handleGesture(dx, dy, dt, end_x, end_y) {
    if (cast_state === "idle" && (Math.sqrt(dx * dx + dy * dy) > 12 || dt < 400)) {
        startCast(end_x, end_y);
    }
}

// ── Cast ──────────────────────────────────────────────────────────
function startCast(end_x, end_y) {
    if (cast_state !== "idle") return;

    const canvas = document.getElementById("ar-canvas");
    const scale_x = (canvas.width  || window.innerWidth)  / window.innerWidth;
    const scale_y = (canvas.height || window.innerHeight) / window.innerHeight;
    cast_target_x = Math.max(canvas.width * 0.08, Math.min(canvas.width * 0.88,  end_x * scale_x));
    cast_target_y = Math.max(canvas.height * 0.32, Math.min(canvas.height * 0.76, end_y * scale_y));
    cast_progress = 0;
    cast_state    = "casting";

    if (typeof playSound === "function") playSound("cast");
    hideInstructions();
}

// ── Bite ──────────────────────────────────────────────────────────
function triggerBite() {
    if (cast_state !== "cast") return;
    cast_state = "biting";
    showBiteBanner();
    showReelButton();
    hideInstructions();
    if (typeof playSound === "function") playSound("bite");
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    bite_timeout = setTimeout(fishGotAway, 4500);
}

function fishGotAway() {
    if (cast_state !== "biting") return;
    cast_state = "idle";
    hideBiteBanner();
    hideReelButton();
    const b = document.getElementById("bite-banner");
    if (b) {
        b.textContent = "🐟 It got away! Tap to cast again.";
        b.style.background = "#546E7A";
        b.classList.remove("hidden");
    }
    setTimeout(() => {
        hideBiteBanner();
        const b2 = document.getElementById("bite-banner");
        if (b2) { b2.textContent = "🐟 GOT ONE — TAP REEL!"; b2.style.background = ""; }
        showInstruction("cast");
    }, 2200);
}

// ── Reel ──────────────────────────────────────────────────────────
function doReel() {
    if (cast_state !== "biting" && cast_state !== "cast") return;
    clearTimeout(bite_timeout);
    cast_state = "reeling";
    hideBiteBanner();
    hideReelButton();
    hideInstructions();
    if (typeof playSound === "function") playSound("reel");
    if (navigator.vibrate) navigator.vibrate([80, 40, 160]);

    const start_y = bobber_y, start_t = Date.now(), dur = 520;

    function pull() {
        const p = Math.min((Date.now() - start_t) / dur, 1);
        bobber_y = start_y * (1 - p * p * p * 0.95);
        if (p < 1 && ar_running) requestAnimationFrame(pull);
        else { ar_running = false; if (typeof window.onFishReeled === "function") window.onFishReeled(); }
    }
    requestAnimationFrame(pull);
}

// ── UI helpers ────────────────────────────────────────────────────
function showBiteBanner() {
    const e = document.getElementById("bite-banner");
    if (e) e.classList.remove("hidden");
}

function hideBiteBanner() {
    const e = document.getElementById("bite-banner");
    if (e) e.classList.add("hidden");
}

function showReelButton() {
    const e = document.getElementById("reel-btn");
    if (e) e.classList.remove("hidden");
}

function hideReelButton() {
    const e = document.getElementById("reel-btn");
    if (e) e.classList.add("hidden");
}

function showInstruction(type) {
    const cast_el = document.getElementById("ar-inst-cast");
    const reel_el = document.getElementById("ar-inst-reel");
    if (cast_el) cast_el.classList.toggle("hidden", type !== "cast");
    if (reel_el) reel_el.classList.toggle("hidden", type !== "reel");
}

function hideInstructions() {
    ["ar-inst-cast", "ar-inst-reel"].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.classList.add("hidden");
    });
}
