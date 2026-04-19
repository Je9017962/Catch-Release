// ar-scene.js — Camera, canvas fishing line, tap-to-cast, big-button reel

let videoStream  = null;
let arRunning    = false;
let castState    = "idle"; // idle | cast | biting | reeling
let bobberX      = 0;
let bobberY      = 0;
let biteTimeout  = null;
let bobberAnim   = 0;

let touchStartX = 0, touchStartY = 0, touchStartT = 0;

// ── Start camera ──────────────────────────────────────────────────
async function startAR() {
  const video  = document.getElementById("ar-video");
  const canvas = document.getElementById("ar-canvas");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = videoStream;
    video.style.display = "";
    await video.play();

    video.addEventListener("loadedmetadata", () => {
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
    }, { once: true });
    if (video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }

  } catch (err) {
    // No camera — use a simulated lake background
    console.warn("Camera unavailable:", err.message);
    video.style.display = "none";
    canvas.style.background = "linear-gradient(180deg,#87CEEB 0%,#4CAF50 38%,#388E3C 42%,#1565C0 43%,#0D47A1 100%)";
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  arRunning = true;
  castState = "idle";

  const arScreen = document.getElementById("screen-ar");
  arScreen.addEventListener("touchstart", onTouchStart, { passive: true });
  arScreen.addEventListener("touchend",   onTouchEnd,   { passive: true });
  arScreen.addEventListener("mousedown",  onMouseDown);
  arScreen.addEventListener("mouseup",    onMouseUp);

  showInstruction("cast");
  hideBiteBanner();
  hideReelButton();
  requestAnimationFrame(drawLoop);
}

// ── Stop / cleanup ────────────────────────────────────────────────
function stopAR() {
  arRunning = false;
  castState = "idle";
  clearTimeout(biteTimeout);

  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  const video = document.getElementById("ar-video");
  if (video) { video.srcObject = null; video.style.display = ""; }

  const arScreen = document.getElementById("screen-ar");
  arScreen.removeEventListener("touchstart", onTouchStart);
  arScreen.removeEventListener("touchend",   onTouchEnd);
  arScreen.removeEventListener("mousedown",  onMouseDown);
  arScreen.removeEventListener("mouseup",    onMouseUp);

  clearCanvas();
  hideReelButton();
  hideBiteBanner();
  showInstruction("cast"); // reset for next time

  if (typeof showScreen === "function") showScreen("screen-main");
}

// ── Draw loop ─────────────────────────────────────────────────────
function drawLoop() {
  if (!arRunning) return;
  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (castState === "cast" || castState === "biting") {
    bobberAnim += 0.05;
    const bob = castState === "biting"
      ? Math.sin(bobberAnim * 6) * 7
      : Math.sin(bobberAnim)     * 3;
    drawFishingLine(ctx, canvas, bobberY + bob);
    drawBobber(ctx, bobberX, bobberY + bob, castState === "biting");
  }
  requestAnimationFrame(drawLoop);
}

function drawFishingLine(ctx, canvas, byY) {
  const rodX = canvas.width * 0.5, rodY = canvas.height * 0.08;
  ctx.beginPath();
  ctx.moveTo(rodX, rodY);
  ctx.quadraticCurveTo((rodX + bobberX) / 2, rodY + (byY - rodY) * 0.4, bobberX, byY);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth   = Math.max(1.5, canvas.width / 500);
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawBobber(ctx, bx, by, isBiting) {
  const r = 16;
  if (isBiting) {
    ctx.beginPath(); ctx.arc(bx, by, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,30,30,0.2)"; ctx.fill();
  }
  // Shadow
  ctx.beginPath(); ctx.ellipse(bx, by + r + 2, r * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fill();
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
  ctx.strokeStyle = "#666"; ctx.lineWidth = 1.5; ctx.stroke();
  // Antenna
  ctx.beginPath(); ctx.moveTo(bx, by - r); ctx.lineTo(bx, by - r - 10);
  ctx.strokeStyle = "#888"; ctx.lineWidth = 2; ctx.stroke();
  // Ripple rings (calm)
  if (!isBiting) {
    const t = Date.now() / 800;
    for (let i = 0; i < 2; i++) {
      const phase = (t + i * 0.5) % 1;
      ctx.beginPath(); ctx.arc(bx, by + 4, r + 8 + phase * 22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,180,255,${0.3 * (1 - phase)})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function clearCanvas() {
  const c = document.getElementById("ar-canvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

// ── Touch / mouse handlers ────────────────────────────────────────
function onTouchStart(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; touchStartT = Date.now();
}
function onTouchEnd(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  const t = e.changedTouches[0];
  handleGesture(t.clientX - touchStartX, t.clientY - touchStartY, Date.now() - touchStartT, t.clientX, t.clientY);
}
function onMouseDown(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  touchStartX = e.clientX; touchStartY = e.clientY; touchStartT = Date.now();
}
function onMouseUp(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  handleGesture(e.clientX - touchStartX, e.clientY - touchStartY, Date.now() - touchStartT, e.clientX, e.clientY);
}

function handleGesture(dx, dy, dt, endX, endY) {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (castState === "idle" && (dist > 15 || dt < 400)) {
    doCast(endX, endY);
  }
  // Reeling is only via the REEL button
}

// ── Cast ──────────────────────────────────────────────────────────
function doCast(endX, endY) {
  if (castState !== "idle") return;
  castState = "cast";
  bobberAnim = 0;

  const canvas = document.getElementById("ar-canvas");
  const scaleX = (canvas.width  || window.innerWidth)  / window.innerWidth;
  const scaleY = (canvas.height || window.innerHeight) / window.innerHeight;
  bobberX = Math.max(canvas.width * 0.08, Math.min(canvas.width  * 0.92, endX * scaleX));
  bobberY = Math.max(canvas.height * 0.3,  Math.min(canvas.height * 0.78, endY * scaleY));

  showInstruction("reel");
  // Bite delay: 1.5–4 seconds
  biteTimeout = setTimeout(triggerBite, 1500 + Math.random() * 2500);
}

// ── Bite ──────────────────────────────────────────────────────────
function triggerBite() {
  if (castState !== "cast") return;
  castState = "biting";
  showBiteBanner();
  showReelButton();
  hideInstructions();
  // Fish escapes after 4 seconds if not reeled
  biteTimeout = setTimeout(fishGotAway, 4000);
}

function fishGotAway() {
  if (castState !== "biting") return;
  castState = "idle";
  hideBiteBanner();
  hideReelButton();
  const b = document.getElementById("bite-banner");
  if (b) { b.textContent = "🐟 It got away! Tap to cast again…"; b.style.background = "#546E7A"; b.classList.remove("hidden"); }
  setTimeout(() => {
    hideBiteBanner();
    const b2 = document.getElementById("bite-banner");
    if (b2) { b2.textContent = "🐟 GOT ONE — TAP REEL!"; b2.style.background = ""; }
    showInstruction("cast");
  }, 2200);
}

// ── Reel — triggered by the big button ───────────────────────────
function doReel() {
  if (castState !== "biting" && castState !== "cast") return;
  clearTimeout(biteTimeout);
  castState = "reeling";
  hideBiteBanner();
  hideReelButton();
  hideInstructions();

  // Pull bobber up
  const canvas = document.getElementById("ar-canvas");
  const startY = bobberY, startT = Date.now(), dur = 600;
  function pull() {
    const p = Math.min((Date.now() - startT) / dur, 1);
    bobberY = startY * (1 - p * 0.85);
    if (p < 1 && arRunning) requestAnimationFrame(pull);
    else { arRunning = false; if (typeof window.onFishReeled === "function") window.onFishReeled(); }
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
  ["ar-inst-cast","ar-inst-reel"].forEach(id => { const e = document.getElementById(id); if(e) e.classList.add("hidden"); });
}
