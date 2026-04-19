// ar-scene.js — Camera, swimming fish sprites, bobber, tap-to-cast, reel button

let videoStream = null;
let arRunning   = false;
let castState   = "idle"; // idle | cast | biting | reeling
let bobberX = 0, bobberY = 0, bobberAnim = 0;
let biteTimeout = null;
let touchStartX = 0, touchStartY = 0, touchStartT = 0;
let hasCameraFeed = false;

// ── Swimming fish sprites (drawn on canvas before cast) ───────────
const SWIM_FISH = [
  { x: 0.2, y: 0.62, dx: 0.0008, dy: 0.0002, size: 22, color: "#1565C0", flip: false, phase: 0 },
  { x: 0.6, y: 0.72, dx:-0.0006, dy: 0.0003, size: 18, color: "#2E7D32", flip: true,  phase: 1.2 },
  { x: 0.4, y: 0.80, dx: 0.0007, dy:-0.0002, size: 26, color: "#E65100", flip: false, phase: 2.4 },
  { x: 0.75,y: 0.68, dx:-0.0009, dy: 0.0001, size: 16, color: "#558B2F", flip: true,  phase: 0.7 },
  { x: 0.5, y: 0.75, dx: 0.0005, dy: 0.0004, size: 20, color: "#1976D2", flip: false, phase: 1.8 },
];
let swimTime = 0;

// ── Start camera ──────────────────────────────────────────────────
async function startAR() {
  // Full reset every time AR starts
  arRunning  = false;
  castState  = "idle";
  bobberAnim = 0;
  clearTimeout(biteTimeout);

  const video  = document.getElementById("ar-video");
  const canvas = document.getElementById("ar-canvas");

  try {
    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = videoStream;
    video.style.display = "";
    await video.play();
    hasCameraFeed = true;

    const setSize = () => {
      if (video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      else { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    };
    if (video.videoWidth) setSize();
    else video.addEventListener("loadedmetadata", setSize, { once: true });

  } catch (err) {
    console.warn("Camera unavailable:", err.message);
    hasCameraFeed = false;
    video.style.display = "none";
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    // Draw immersive lake scene on canvas as background
    drawLakeBackground(canvas);
  }

  arRunning = true;

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

// ── Draw full lake background (when no camera) ────────────────────
function drawLakeBackground(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  sky.addColorStop(0, "#87CEEB"); sky.addColorStop(1, "#B8DEF5");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.45);
  // Treeline
  ctx.fillStyle = "#388E3C";
  ctx.fillRect(0, h * 0.38, w, h * 0.08);
  // Water
  const water = ctx.createLinearGradient(0, h * 0.45, 0, h);
  water.addColorStop(0, "#1976D2"); water.addColorStop(1, "#0D47A1");
  ctx.fillStyle = water; ctx.fillRect(0, h * 0.45, w, h * 0.55);
  // Water shimmer lines
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const ly = h * (0.5 + i * 0.055);
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
  }
}

// ── Stop / cleanup ────────────────────────────────────────────────
function stopAR() {
  arRunning = false;
  castState = "idle";
  clearTimeout(biteTimeout);

  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
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
function drawLoop(ts) {
  if (!arRunning) return;
  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // If no camera, redraw the lake scene each frame (for animated water)
  if (!hasCameraFeed) {
    drawAnimatedWater(ctx, canvas, ts);
  }

  swimTime += 0.016;

  // Draw fish in the water before cast
  if (castState === "idle" || castState === "cast" || castState === "biting") {
    drawSwimmingFish(ctx, canvas);
  }

  // Draw line + bobber after cast
  if (castState === "cast" || castState === "biting") {
    bobberAnim += 0.05;
    const bob = castState === "biting"
      ? Math.sin(bobberAnim * 6) * 8
      : Math.sin(bobberAnim) * 3;
    drawFishingLine(ctx, canvas, bobberY + bob);
    drawBobber(ctx, bobberX, bobberY + bob, castState === "biting");
  }

  requestAnimationFrame(drawLoop);
}

// ── Animated water overlay (no-camera mode) ───────────────────────
function drawAnimatedWater(ctx, canvas, ts) {
  const w = canvas.width, h = canvas.height;
  const t = (ts || 0) / 1000;
  // Sky
  ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, w, h * 0.44);
  ctx.fillStyle = "#388E3C"; ctx.fillRect(0, h * 0.37, w, h * 0.09);
  ctx.fillStyle = "#1565C0"; ctx.fillRect(0, h * 0.44, w, h * 0.56);
  // Animated shimmer lines on water
  ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const ly = h * (0.48 + i * 0.05) + Math.sin(t * 0.8 + i) * 3;
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
  }
  // Sparkling highlights
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (let i = 0; i < 5; i++) {
    const sx = (w * (0.1 + i * 0.18) + Math.sin(t + i * 1.3) * 20);
    const sy = h * (0.55 + (i % 3) * 0.08) + Math.cos(t * 1.2 + i) * 6;
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }
}

// ── Swimming fish sprites ─────────────────────────────────────────
function drawSwimmingFish(ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  // Only draw fish in the "water" area (bottom 55% of screen)
  const waterY = h * 0.44;

  SWIM_FISH.forEach(f => {
    // Move fish
    f.x += f.dx;
    f.y += f.dy * Math.sin(swimTime * 0.5 + f.phase);
    // Bounce off edges
    if (f.x < 0.05 || f.x > 0.95) { f.dx *= -1; f.flip = !f.flip; }
    f.y = Math.max(0.48, Math.min(0.92, f.y));

    const fx = f.x * w;
    const fy = f.y * h;
    if (fy < waterY) return; // don't draw fish above waterline

    const sz = f.size;
    const bodyWag = Math.sin(swimTime * 3 + f.phase) * 0.12;

    ctx.save();
    ctx.translate(fx, fy);
    if (f.flip) ctx.scale(-1, 1);
    ctx.rotate(bodyWag);
    ctx.globalAlpha = 0.85;

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, sz, sz * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = f.color; ctx.fill();

    // Tail
    ctx.beginPath();
    ctx.moveTo(sz * 0.7, 0);
    ctx.lineTo(sz * 1.3, -sz * 0.55);
    ctx.lineTo(sz * 1.3,  sz * 0.55);
    ctx.closePath();
    ctx.fillStyle = f.color; ctx.fill();

    // Belly
    ctx.beginPath();
    ctx.ellipse(-sz * 0.1, sz * 0.15, sz * 0.65, sz * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(-sz * 0.4, -sz * 0.08, sz * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath();
    ctx.arc(-sz * 0.4, -sz * 0.08, sz * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#111"; ctx.fill();

    // Fin
    ctx.beginPath();
    ctx.moveTo(-sz * 0.1, -sz * 0.5);
    ctx.lineTo(sz * 0.3, -sz * 0.5);
    ctx.lineTo(sz * 0.1, -sz * 0.05);
    ctx.closePath();
    ctx.fillStyle = f.color; ctx.globalAlpha = 0.65; ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  });
}

// ── Fishing line ──────────────────────────────────────────────────
function drawFishingLine(ctx, canvas, byY) {
  const rodX = canvas.width * 0.5, rodY = canvas.height * 0.07;
  ctx.beginPath();
  ctx.moveTo(rodX, rodY);
  ctx.quadraticCurveTo((rodX + bobberX) / 2, rodY + (byY - rodY) * 0.35, bobberX, byY);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(1.5, canvas.width / 480);
  ctx.setLineDash([]); ctx.stroke();
}

// ── Bobber ────────────────────────────────────────────────────────
function drawBobber(ctx, bx, by, isBiting) {
  const r = 18;
  if (isBiting) {
    ctx.beginPath(); ctx.arc(bx, by, r + 12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,30,30,0.18)"; ctx.fill();
  }
  // Shadow
  ctx.beginPath(); ctx.ellipse(bx, by + r + 2, r * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fill();
  // White bottom
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI);
  ctx.fillStyle = "#FFFFFF"; ctx.fill();
  // Red top
  ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0);
  ctx.fillStyle = isBiting ? "#FF1744" : "#E53935"; ctx.fill();
  // Border
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.strokeStyle = isBiting ? "#FF1744" : "#aaa"; ctx.lineWidth = 1.5; ctx.stroke();
  // Center line
  ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.lineTo(bx + r, by);
  ctx.strokeStyle = "#555"; ctx.lineWidth = 1.5; ctx.stroke();
  // Antenna
  ctx.beginPath(); ctx.moveTo(bx, by - r); ctx.lineTo(bx, by - r - 12);
  ctx.strokeStyle = "#999"; ctx.lineWidth = 2; ctx.stroke();
  // Calm ripples
  if (!isBiting) {
    const t = Date.now() / 800;
    for (let i = 0; i < 2; i++) {
      const phase = (t + i * 0.5) % 1;
      ctx.beginPath(); ctx.arc(bx, by + 5, r + 8 + phase * 26, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,190,255,${0.28 * (1 - phase)})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function clearCanvas() {
  const c = document.getElementById("ar-canvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

// ── Touch / mouse ─────────────────────────────────────────────────
function onTouchStart(e) {
  if (e.target.closest("button,nav")) return;
  touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; touchStartT = Date.now();
}
function onTouchEnd(e) {
  if (e.target.closest("button,nav")) return;
  const t = e.changedTouches[0];
  handleGesture(t.clientX - touchStartX, t.clientY - touchStartY, Date.now() - touchStartT, t.clientX, t.clientY);
}
function onMouseDown(e) {
  if (e.target.closest("button,nav")) return;
  touchStartX = e.clientX; touchStartY = e.clientY; touchStartT = Date.now();
}
function onMouseUp(e) {
  if (e.target.closest("button,nav")) return;
  handleGesture(e.clientX - touchStartX, e.clientY - touchStartY, Date.now() - touchStartT, e.clientX, e.clientY);
}

function handleGesture(dx, dy, dt, endX, endY) {
  if (castState === "idle" && (Math.sqrt(dx*dx+dy*dy) > 12 || dt < 400)) {
    doCast(endX, endY);
  }
}

// ── Cast ──────────────────────────────────────────────────────────
function doCast(endX, endY) {
  if (castState !== "idle") return;
  castState = "cast"; bobberAnim = 0;

  const canvas = document.getElementById("ar-canvas");
  const scaleX = (canvas.width  || window.innerWidth)  / window.innerWidth;
  const scaleY = (canvas.height || window.innerHeight) / window.innerHeight;
  bobberX = Math.max(canvas.width * 0.08, Math.min(canvas.width  * 0.92, endX * scaleX));
  bobberY = Math.max(canvas.height * 0.3,  Math.min(canvas.height * 0.78, endY * scaleY));

  showInstruction("reel");
  if (typeof playSound === "function") playSound("cast");
  biteTimeout = setTimeout(triggerBite, 1500 + Math.random() * 2500);
}

// ── Bite ──────────────────────────────────────────────────────────
function triggerBite() {
  if (castState !== "cast") return;
  castState = "biting";
  showBiteBanner(); showReelButton(); hideInstructions();
  if (typeof playSound === "function") playSound("bite");
  biteTimeout = setTimeout(fishGotAway, 4500);
}

function fishGotAway() {
  if (castState !== "biting") return;
  castState = "idle";
  hideBiteBanner(); hideReelButton();
  const b = document.getElementById("bite-banner");
  if (b) { b.textContent = "🐟 It got away! Tap to cast again…"; b.style.background = "#546E7A"; b.classList.remove("hidden"); }
  setTimeout(() => {
    hideBiteBanner();
    const b2 = document.getElementById("bite-banner");
    if (b2) { b2.textContent = "🐟 GOT ONE — TAP REEL!"; b2.style.background = ""; }
    showInstruction("cast");
  }, 2200);
}

// ── Reel ──────────────────────────────────────────────────────────
function doReel() {
  if (castState !== "biting" && castState !== "cast") return;
  clearTimeout(biteTimeout);
  castState = "reeling";
  hideBiteBanner(); hideReelButton(); hideInstructions();

  if (typeof playSound === "function") playSound("reel");
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate([80, 40, 160]);

  const canvas = document.getElementById("ar-canvas");
  const startY = bobberY, startT = Date.now(), dur = 550;
  function pull() {
    const p = Math.min((Date.now() - startT) / dur, 1);
    bobberY = startY * (1 - p * 0.88);
    if (p < 1 && arRunning) requestAnimationFrame(pull);
    else {
      arRunning = false;
      if (typeof window.onFishReeled === "function") window.onFishReeled();
    }
  }
  requestAnimationFrame(pull);
}

// ── UI helpers ────────────────────────────────────────────────────
function showBiteBanner()  { const e = document.getElementById("bite-banner"); if (e) e.classList.remove("hidden"); }
function hideBiteBanner()  { const e = document.getElementById("bite-banner"); if (e) e.classList.add("hidden"); }
function showReelButton()  { const e = document.getElementById("reel-btn");    if (e) e.classList.remove("hidden"); }
function hideReelButton()  { const e = document.getElementById("reel-btn");    if (e) e.classList.add("hidden"); }
function showInstruction(t) {
  const c = document.getElementById("ar-inst-cast"), r = document.getElementById("ar-inst-reel");
  if (c) c.classList.toggle("hidden", t !== "cast");
  if (r) r.classList.toggle("hidden", t !== "reel");
}
function hideInstructions() {
  ["ar-inst-cast","ar-inst-reel"].forEach(id => { const e=document.getElementById(id); if(e) e.classList.add("hidden"); });
}
