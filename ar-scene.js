// ar-scene.js — Camera access, canvas fishing line drawing, swipe & device motion

let videoStream  = null;
let arRunning    = false;
let castState    = "idle"; // idle | casting | cast | biting | reeling
let bobberX      = 0;
let bobberY      = 0;
let biteTimeout  = null;
let reelListener = null;

// Touch tracking for swipe gesture
let touchStartX = 0;
let touchStartY = 0;
let touchStartT = 0;

// ── Start AR camera ─────────────────────────────────────────────
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
    arRunning = true;
    castState = "idle";

    // Size canvas to match video
    video.addEventListener("loadedmetadata", () => {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    // Set up swipe gesture
    const zone = document.getElementById("ar-gesture-zone");
    zone.addEventListener("touchstart", onTouchStart, { passive: true });
    zone.addEventListener("touchend",   onTouchEnd,   { passive: true });
    zone.addEventListener("mousedown",  onMouseDown);
    zone.addEventListener("mouseup",    onMouseUp);

    showInstruction("cast");
    requestAnimationFrame(drawLoop);

  } catch (err) {
    console.error("Camera error:", err);
    alert("Camera access denied. Please allow camera permissions and try again.");
    showScreen("screen-main");
  }
}

// ── Stop AR / cleanup ───────────────────────────────────────────
function stopAR() {
  arRunning = false;
  castState = "idle";
  clearTimeout(biteTimeout);

  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }

  const video = document.getElementById("ar-video");
  video.srcObject = null;

  if (reelListener) {
    window.removeEventListener("devicemotion", reelListener);
    reelListener = null;
  }

  const zone = document.getElementById("ar-gesture-zone");
  zone.removeEventListener("touchstart", onTouchStart);
  zone.removeEventListener("touchend",   onTouchEnd);
  zone.removeEventListener("mousedown",  onMouseDown);
  zone.removeEventListener("mouseup",    onMouseUp);

  clearCanvas();
  showScreen("screen-main");
}

// ── Canvas draw loop ────────────────────────────────────────────
function drawLoop() {
  if (!arRunning) return;

  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (castState === "cast" || castState === "biting") {
    drawFishingLine(ctx, canvas);
    drawBobber(ctx);
    if (castState === "biting") drawBiteRipple(ctx);
  }

  requestAnimationFrame(drawLoop);
}

function drawFishingLine(ctx, canvas) {
  const rodTipX = canvas.width * 0.5;
  const rodTipY = canvas.height * 0.15;

  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);

  // Catenary-like curve for fishing line
  const cpX = (rodTipX + bobberX) / 2;
  const cpY = Math.max(rodTipY, bobberY) * 0.6 + canvas.height * 0.1;
  ctx.quadraticCurveTo(cpX, cpY, bobberX, bobberY);

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth   = Math.max(1, canvas.width / 400);
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawBobber(ctx) {
  // Bobber shadow
  ctx.beginPath();
  ctx.ellipse(bobberX, bobberY + 8, 8, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();

  // Top (red) half
  ctx.beginPath();
  ctx.arc(bobberX, bobberY, 12, Math.PI, 0);
  ctx.fillStyle = "#E53935";
  ctx.fill();

  // Bottom (white) half
  ctx.beginPath();
  ctx.arc(bobberX, bobberY, 12, 0, Math.PI);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Center stripe
  ctx.beginPath();
  ctx.moveTo(bobberX - 12, bobberY);
  ctx.lineTo(bobberX + 12, bobberY);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top stick
  ctx.beginPath();
  ctx.moveTo(bobberX, bobberY - 12);
  ctx.lineTo(bobberX, bobberY - 18);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBiteRipple(ctx) {
  const t = Date.now() / 300;
  for (let i = 0; i < 3; i++) {
    const r = 15 + (i * 12) + (t % 12);
    const alpha = 0.6 - (i * 0.18) - ((t % 1) * 0.3);
    ctx.beginPath();
    ctx.arc(bobberX, bobberY + 10, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(30,110,232,${Math.max(0, alpha)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function clearCanvas() {
  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Touch / swipe gesture ───────────────────────────────────────
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartT = Date.now();
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dt = Date.now() - touchStartT;
  handleSwipe(dx, dy, dt, e.changedTouches[0].clientX, e.changedTouches[0].clientY);
}
function onMouseDown(e) {
  touchStartX = e.clientX; touchStartY = e.clientY; touchStartT = Date.now();
}
function onMouseUp(e) {
  const dx = e.clientX - touchStartX;
  const dy = e.clientY - touchStartY;
  const dt = Date.now() - touchStartT;
  handleSwipe(dx, dy, dt, e.clientX, e.clientY);
}

function handleSwipe(dx, dy, dt, endX, endY) {
  const speed = Math.sqrt(dx * dx + dy * dy) / dt;
  const isFastSwipe = speed > 0.3 && Math.sqrt(dx*dx+dy*dy) > 40;

  if (castState === "idle" && isFastSwipe) {
    doCast(endX, endY);
  } else if (castState === "cast" && isFastSwipe) {
    // Tapping bobber area manually reels
    const canvas = document.getElementById("ar-canvas");
    const dist = Math.sqrt((endX - bobberX / (canvas.width / window.innerWidth)) ** 2 + (endY - bobberY / (canvas.height / window.innerHeight)) ** 2);
    if (dist < 60) doReel();
  }
}

// ── Cast action ─────────────────────────────────────────────────
function doCast(endX, endY) {
  if (castState !== "idle") return;
  castState = "cast";

  const canvas = document.getElementById("ar-canvas");
  // Map screen coords to canvas coords
  const scaleX = canvas.width  / window.innerWidth;
  const scaleY = canvas.height / window.innerHeight;
  bobberX = endX * scaleX;
  bobberY = endY * scaleY;

  // Clamp bobber into middle-bottom area
  bobberX = Math.max(canvas.width  * 0.1, Math.min(canvas.width  * 0.9, bobberX));
  bobberY = Math.max(canvas.height * 0.35, Math.min(canvas.height * 0.75, bobberY));

  showInstruction("reel");
  playSound("cast");

  // Random bite time: 2–6 seconds
  const biteDelay = 2000 + Math.random() * 4000;
  biteTimeout = setTimeout(triggerBite, biteDelay);

  // Enable device motion reeling
  setupMotionReel();
}

// ── Bite event ──────────────────────────────────────────────────
function triggerBite() {
  if (castState !== "cast") return;
  castState = "biting";

  document.getElementById("bite-banner").classList.remove("hidden");
  playSound("bite");

  // Auto-reel after 3s if player misses
  biteTimeout = setTimeout(() => {
    if (castState === "biting") {
      // Fish got away
      castState = "idle";
      document.getElementById("bite-banner").classList.add("hidden");
      showInstruction("cast");
      clearTimeout(biteTimeout);
    }
  }, 3000);
}

// ── Reel action ─────────────────────────────────────────────────
function doReel() {
  if (castState !== "biting" && castState !== "cast") return;
  clearTimeout(biteTimeout);
  castState = "reeling";

  document.getElementById("bite-banner").classList.add("hidden");
  hideInstructions();
  playSound("reel");

  // Brief reel animation then show catch
  setTimeout(() => {
    arRunning = false;
    window.onFishReeled();
  }, 800);
}

// ── Device motion for reeling (phone lift) ──────────────────────
function setupMotionReel() {
  // Request permission on iOS 13+
  if (typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function") {
    DeviceMotionEvent.requestPermission()
      .then(result => {
        if (result === "granted") listenForMotionReel();
      })
      .catch(() => {}); // fallback to tap
  } else if (window.DeviceMotionEvent) {
    listenForMotionReel();
  }
}

function listenForMotionReel() {
  let lastY = null;
  reelListener = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.y === null) return;
    if (lastY === null) { lastY = acc.y; return; }

    const delta = acc.y - lastY;
    lastY = acc.y;

    // Sharp upward lift = reel
    if (delta > 6 && (castState === "biting" || castState === "cast")) {
      doReel();
    }
  };
  window.addEventListener("devicemotion", reelListener);
}

// ── Instruction helpers ──────────────────────────────────────────
function showInstruction(type) {
  document.getElementById("ar-inst-cast").classList.toggle("hidden", type !== "cast");
  document.getElementById("ar-inst-reel").classList.toggle("hidden", type !== "reel");
}
function hideInstructions() {
  document.getElementById("ar-inst-cast").classList.add("hidden");
  document.getElementById("ar-inst-reel").classList.add("hidden");
}

// ── Sound effects (safe / no-crash) ────────────────────────────
function playSound(type) {
  const srcs = {
    cast:  null, // add "assets/audio/cast.mp3"
    bite:  null, // add "assets/audio/bite.mp3"
    reel:  null, // add "assets/audio/reel.mp3"
    catch: null  // add "assets/audio/catch.mp3"
  };
  const src = srcs[type];
  if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (_) {}
}
