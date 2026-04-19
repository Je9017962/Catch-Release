// ar-scene.js — Camera, canvas fishing line, simplified TAP-TO-REEL mechanic

let videoStream  = null;
let arRunning    = false;
let castState    = "idle"; // idle | cast | biting | reeling
let bobberX      = 0;
let bobberY      = 0;
let biteTimeout  = null;
let bobberAnim   = 0; // for bobbing animation

// Touch tracking
let touchStartX = 0;
let touchStartY = 0;
let touchStartT = 0;

// ── Start camera ─────────────────────────────────────────────────
async function startAR() {
  const video  = document.getElementById("ar-video");
  const canvas = document.getElementById("ar-canvas");

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = videoStream;
    await video.play();

    video.addEventListener("loadedmetadata", () => {
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
    }, { once: true });

    // Fallback canvas size if metadata already loaded
    if (video.videoWidth) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    arRunning = true;
    castState = "idle";

    // Attach gesture listeners to the whole AR screen (not just a zone)
    const arScreen = document.getElementById("screen-ar");
    arScreen.addEventListener("touchstart", onTouchStart, { passive: true });
    arScreen.addEventListener("touchend",   onTouchEnd,   { passive: true });
    arScreen.addEventListener("mousedown",  onMouseDown);
    arScreen.addEventListener("mouseup",    onMouseUp);

    showInstruction("cast");
    hideBiteBanner();
    hideReelButton();
    requestAnimationFrame(drawLoop);

  } catch (err) {
    console.error("Camera error:", err);
    // Show a fallback "no camera" UI rather than crashing
    const video = document.getElementById("ar-video");
    video.style.display = "none";
    document.getElementById("ar-canvas").style.background = "linear-gradient(180deg,#1a6b3a 0%,#1565C0 60%,#0d47a1 100%)";
    arRunning = true;
    castState = "idle";

    const arScreen = document.getElementById("screen-ar");
    arScreen.addEventListener("touchstart", onTouchStart, { passive: true });
    arScreen.addEventListener("touchend",   onTouchEnd,   { passive: true });
    arScreen.addEventListener("mousedown",  onMouseDown);
    arScreen.addEventListener("mouseup",    onMouseUp);

    const canvas = document.getElementById("ar-canvas");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    showInstruction("cast");
    requestAnimationFrame(drawLoop);
  }
}

// ── Stop AR ───────────────────────────────────────────────────────
function stopAR() {
  arRunning = false;
  castState = "idle";
  clearTimeout(biteTimeout);

  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
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
  showScreen("screen-main");
}

// ── Canvas draw loop ──────────────────────────────────────────────
function drawLoop() {
  if (!arRunning) return;

  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (castState === "cast" || castState === "biting") {
    bobberAnim += 0.05;
    // Gentle bobbing
    const bob = castState === "biting"
      ? Math.sin(bobberAnim * 6) * 6   // frantic when biting
      : Math.sin(bobberAnim) * 3;       // gentle when waiting

    drawFishingLine(ctx, canvas, bobberY + bob);
    drawBobber(ctx, bobberX, bobberY + bob, castState === "biting");
  }

  requestAnimationFrame(drawLoop);
}

function drawFishingLine(ctx, canvas, byY) {
  const rodTipX = canvas.width  * 0.5;
  const rodTipY = canvas.height * 0.08;

  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);
  const cpX = (rodTipX + bobberX) / 2;
  const cpY = rodTipY + (byY - rodTipY) * 0.4;
  ctx.quadraticCurveTo(cpX, cpY, bobberX, byY);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth   = Math.max(1.5, canvas.width / 500);
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawBobber(ctx, bx, by, isBiting) {
  const r = 16;

  // Glow when biting
  if (isBiting) {
    ctx.beginPath();
    ctx.arc(bx, by, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,80,80,0.25)";
    ctx.fill();
  }

  // Shadow
  ctx.beginPath();
  ctx.ellipse(bx, by + r + 2, r * 0.7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fill();

  // White bottom half
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Red top half
  ctx.beginPath();
  ctx.arc(bx, by, r, Math.PI, 0);
  ctx.fillStyle = isBiting ? "#FF1744" : "#E53935";
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.strokeStyle = isBiting ? "#FF1744" : "#999";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center line
  ctx.beginPath();
  ctx.moveTo(bx - r, by);
  ctx.lineTo(bx + r, by);
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Antenna
  ctx.beginPath();
  ctx.moveTo(bx, by - r);
  ctx.lineTo(bx, by - r - 10);
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ripple rings around bobber
  if (!isBiting) {
    const t = Date.now() / 800;
    for (let i = 0; i < 2; i++) {
      const phase = (t + i * 0.5) % 1;
      const rr = r + 8 + phase * 24;
      const alpha = 0.35 * (1 - phase);
      ctx.beginPath();
      ctx.arc(bx, by + 4, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,180,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function clearCanvas() {
  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

// ── Swipe to cast ─────────────────────────────────────────────────
function onTouchStart(e) {
  // Don't intercept taps on buttons
  if (e.target.closest("button") || e.target.closest("nav")) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartT = Date.now();
}
function onTouchEnd(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  const t = e.changedTouches[0];
  handleSwipe(t.clientX - touchStartX, t.clientY - touchStartY,
              Date.now() - touchStartT, t.clientX, t.clientY);
}
function onMouseDown(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  touchStartX = e.clientX; touchStartY = e.clientY; touchStartT = Date.now();
}
function onMouseUp(e) {
  if (e.target.closest("button") || e.target.closest("nav")) return;
  handleSwipe(e.clientX - touchStartX, e.clientY - touchStartY,
              Date.now() - touchStartT, e.clientX, e.clientY);
}

function handleSwipe(dx, dy, dt, endX, endY) {
  const dist  = Math.sqrt(dx * dx + dy * dy);
  const speed = dist / Math.max(dt, 1);

  if (castState === "idle") {
    // ANY swipe (even slow ones) or tap casts
    if (dist > 20 || dt < 300) {
      doCast(endX, endY);
    }
  }
  // Reeling is now ONLY via the big REEL button — no swipe needed
}

// ── Cast ──────────────────────────────────────────────────────────
function doCast(endX, endY) {
  if (castState !== "idle") return;
  castState = "cast";
  bobberAnim = 0;

  const canvas = document.getElementById("ar-canvas");
  const scaleX = (canvas.width  || window.innerWidth)  / window.innerWidth;
  const scaleY = (canvas.height || window.innerHeight) / window.innerHeight;
  bobberX = endX * scaleX;
  bobberY = endY * scaleY;

  // Keep bobber in a sensible zone
  bobberX = Math.max(canvas.width * 0.08, Math.min(canvas.width  * 0.92, bobberX));
  bobberY = Math.max(canvas.height * 0.3,  Math.min(canvas.height * 0.78, bobberY));

  showInstruction("reel");

  // Bite in 1.5–4 seconds (shorter = more fun)
  const delay = 1500 + Math.random() * 2500;
  biteTimeout = setTimeout(triggerBite, delay);
}

// ── Bite ──────────────────────────────────────────────────────────
function triggerBite() {
  if (castState !== "cast") return;
  castState = "biting";

  showBiteBanner();
  showReelButton();
  hideInstructions();

  // If player doesn't reel within 4 seconds, fish gets away
  biteTimeout = setTimeout(() => {
    if (castState === "biting") fishGotAway();
  }, 4000);
}

function fishGotAway() {
  castState = "idle";
  hideBiteBanner();
  hideReelButton();
  showInstruction("cast");
  // Flash "got away" message
  const banner = document.getElementById("bite-banner");
  banner.textContent = "🐟 It got away! Cast again...";
  banner.classList.remove("hidden");
  banner.style.background = "#546E7A";
  setTimeout(() => {
    banner.classList.add("hidden");
    banner.textContent = "🐟 GOT ONE — TAP REEL!";
    banner.style.background = "";
  }, 2000);
}

// ── Reel — called by the big REEL button ─────────────────────────
function doReel() {
  if (castState !== "biting" && castState !== "cast") return;
  clearTimeout(biteTimeout);

  castState = "reeling";
  hideBiteBanner();
  hideReelButton();
  hideInstructions();

  // Pull bobber up animation
  const canvas = document.getElementById("ar-canvas");
  const startY = bobberY;
  const startT = Date.now();
  const duration = 600;

  function pullUp() {
    const progress = Math.min((Date.now() - startT) / duration, 1);
    bobberY = startY - (startY * 0.8 * progress);
    if (progress < 1 && arRunning) {
      requestAnimationFrame(pullUp);
    } else {
      // Done — trigger catch
      arRunning = false;
      window.onFishReeled();
    }
  }
  requestAnimationFrame(pullUp);
}

// ── Also allow casting again if already cast (re-cast) ───────────
function recast() {
  if (castState === "cast" || castState === "biting") {
    clearTimeout(biteTimeout);
    castState = "idle";
    hideBiteBanner();
    hideReelButton();
    clearCanvas();
    showInstruction("cast");
  }
}

// ── UI helpers ────────────────────────────────────────────────────
function showBiteBanner() {
  const el = document.getElementById("bite-banner");
  if (el) el.classList.remove("hidden");
}
function hideBiteBanner() {
  const el = document.getElementById("bite-banner");
  if (el) el.classList.add("hidden");
}
function showReelButton() {
  const el = document.getElementById("reel-btn");
  if (el) el.classList.remove("hidden");
}
function hideReelButton() {
  const el = document.getElementById("reel-btn");
  if (el) el.classList.add("hidden");
}
function showInstruction(type) {
  const cast = document.getElementById("ar-inst-cast");
  const reel = document.getElementById("ar-inst-reel");
  if (cast) cast.classList.toggle("hidden", type !== "cast");
  if (reel) reel.classList.toggle("hidden", type !== "reel");
}
function hideInstructions() {
  const cast = document.getElementById("ar-inst-cast");
  const reel = document.getElementById("ar-inst-reel");
  if (cast) cast.classList.add("hidden");
  if (reel) reel.classList.add("hidden");
}
