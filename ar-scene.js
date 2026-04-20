// ar-scene.js
// AR fishing scene: phone camera + canvas overlay.
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
let videoStream   = null;
let arRunning     = false;
let hasCameraFeed = false;
let castState     = "idle"; // idle | casting | cast | biting | reeling
let bobberX = 0, bobberY = 0, bobberAnim = 0;
let biteTimeout   = null;
let touchStartX   = 0, touchStartY = 0, touchStartT = 0;
let castProgress  = 0;   // 0→1 during cast arc animation
let castTargetX   = 0, castTargetY = 0;
let swimTime      = 0;
let waterScrollX  = 0;   // horizontal scroll for water ripple texture
let skyTime       = 0;

// ── Fish species data for swimming sprites ────────────────────────
// Each entry: screen-space patrol path + visual style
const SWIM_FISH = [
  { x:0.18, y:0.70, dx: 0.00055, dy:0.00018, size:28, species:"bass",    flip:false, phase:0.0 },
  { x:0.62, y:0.78, dx:-0.00045, dy:0.00025, size:22, species:"bluegill",flip:true,  phase:1.4 },
  { x:0.38, y:0.85, dx: 0.00065, dy:-0.0002, size:34, species:"bass",    flip:false, phase:2.7 },
  { x:0.80, y:0.73, dx:-0.00070, dy:0.00012, size:18, species:"crappie", flip:true,  phase:0.9 },
  { x:0.50, y:0.80, dx: 0.00040, dy:0.00030, size:25, species:"gar",     flip:false, phase:2.1 },
  { x:0.28, y:0.92, dx:-0.00035, dy:-0.0001, size:20, species:"bluegill",flip:true,  phase:3.3 },
];

// ── Start AR ──────────────────────────────────────────────────────
async function startAR() {
  arRunning  = false;
  castState  = "idle";
  bobberAnim = 0;
  swimTime   = 0;
  clearTimeout(biteTimeout);

  const video  = document.getElementById("ar-video");
  const canvas = document.getElementById("ar-canvas");

  try {
    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:{ ideal:"environment" }, width:{ ideal:1280 }, height:{ ideal:720 } },
      audio: false
    });
    video.srcObject = videoStream;
    video.style.display = "";
    await video.play();
    hasCameraFeed = true;
    const setSize = () => {
      canvas.width  = video.videoWidth  || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
    };
    if (video.videoWidth) setSize();
    else video.addEventListener("loadedmetadata", setSize, { once:true });
  } catch (err) {
    console.warn("Camera unavailable:", err.message);
    hasCameraFeed = false;
    video.style.display = "none";
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  arRunning = true;

  const screen = document.getElementById("screen-ar");
  screen.addEventListener("touchstart", onTouchStart, { passive:true });
  screen.addEventListener("touchend",   onTouchEnd,   { passive:true });
  screen.addEventListener("mousedown",  onMouseDown);
  screen.addEventListener("mouseup",    onMouseUp);

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
  const screen = document.getElementById("screen-ar");
  screen.removeEventListener("touchstart", onTouchStart);
  screen.removeEventListener("touchend",   onTouchEnd);
  screen.removeEventListener("mousedown",  onMouseDown);
  screen.removeEventListener("mouseup",    onMouseUp);
  clearCanvas();
  hideReelButton(); hideBiteBanner(); hideInstructions();
  if (typeof goTo === "function") goTo("screen-main");
}

// ── Main draw loop ────────────────────────────────────────────────
let _lastTS = 0;
function drawLoop(ts) {
  if (!arRunning) return;
  const dt = Math.min((ts - _lastTS) / 1000, 0.05);
  _lastTS  = ts;
  swimTime    += dt;
  waterScrollX = (waterScrollX + dt * 18) % 120;
  skyTime      += dt;

  const canvas = document.getElementById("ar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!hasCameraFeed) {
    drawLakeScene(ctx, w, h, ts);
  } else {
    // On live camera: draw a translucent water overlay on the lower half only
    drawWaterOverlay(ctx, w, h, ts);
  }

  // Always draw swimming fish (visible through water)
  drawAllFish(ctx, w, h);

  // Rod is always visible in bottom-right
  drawRod(ctx, w, h);

  // Cast arc animation (castState === "casting")
  if (castState === "casting") {
    castProgress = Math.min(castProgress + dt * 3.5, 1);
    drawCastArc(ctx, w, h, castProgress);
    if (castProgress >= 1) {
      castState = "cast";
      bobberX   = castTargetX;
      bobberY   = castTargetY;
      showInstruction("reel");
      if (typeof playSound === "function") playSound("cast");
      biteTimeout = setTimeout(triggerBite, 1800 + Math.random() * 2800);
    }
  }

  // Bobber
  if (castState === "cast" || castState === "biting") {
    bobberAnim += dt * 2.2;
    const bob = castState === "biting"
      ? Math.sin(bobberAnim * 5.5) * 9
      : Math.sin(bobberAnim) * 3.5;
    drawLine(ctx, w, h, bobberX, bobberY + bob);
    drawBobber(ctx, bobberX, bobberY + bob, castState === "biting");
  }

  requestAnimationFrame(drawLoop);
}

// ── Full lake scene (no camera) ───────────────────────────────────
function drawLakeScene(ctx, w, h, ts) {
  const t = ts / 1000;

  // ── Sky gradient ──────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.46);
  sky.addColorStop(0, "#5BABD4");
  sky.addColorStop(1, "#B8DEF5");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.46);

  // Sun glow
  const sunX = w * 0.75, sunY = h * 0.12;
  const sunG = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 80);
  sunG.addColorStop(0, "rgba(255,245,180,0.7)");
  sunG.addColorStop(1, "rgba(255,245,180,0)");
  ctx.fillStyle = sunG;
  ctx.beginPath(); ctx.arc(sunX, sunY, 80, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#FFFBE0";
  ctx.beginPath(); ctx.arc(sunX, sunY, 18, 0, Math.PI*2); ctx.fill();

  // Clouds
  [[0.15,0.1,0.9],[0.45,0.07,1.1],[0.7,0.13,0.75]].forEach(([cx,cy,spd]) => {
    const ox = ((cx * w + t * spd * 12) % (w + 120)) - 60;
    drawCloud(ctx, ox, cy * h, 0.8 + cx * 0.4);
  });

  // Distant hills
  ctx.fillStyle = "#2D6A4F";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  for (let x = 0; x <= w; x += 40) {
    const y = h * 0.36 + Math.sin(x * 0.018 + 1.2) * h * 0.045
                       + Math.sin(x * 0.009) * h * 0.03;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h * 0.42); ctx.closePath(); ctx.fill();

  // Treeline
  ctx.fillStyle = "#1B5E20";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.44);
  for (let x = 0; x <= w; x += 18) {
    const treeH = 0.06 + Math.sin(x * 0.14 + 2) * 0.025 + Math.sin(x * 0.07) * 0.015;
    ctx.lineTo(x, h * (0.44 - treeH));
    ctx.lineTo(x + 9, h * 0.44);
  }
  ctx.lineTo(w, h * 0.44); ctx.closePath(); ctx.fill();

  // Grass bank
  const grass = ctx.createLinearGradient(0, h*0.44, 0, h*0.52);
  grass.addColorStop(0, "#388E3C");
  grass.addColorStop(1, "#2E7D32");
  ctx.fillStyle = grass;
  ctx.fillRect(0, h * 0.44, w, h * 0.09);

  // Water
  drawWaterFull(ctx, w, h, t);

  // Dock
  drawDock(ctx, w, h);
}

function drawCloud(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  [[0,0,28],[26,4,22],[-26,4,22],[14,-10,18],[-14,-10,18]].forEach(([dx,dy,r]) => {
    ctx.beginPath(); ctx.arc(dx*scale, dy*scale, r*scale, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawWaterFull(ctx, w, h, t) {
  const waterTop = h * 0.52;

  // Deep water gradient
  const wg = ctx.createLinearGradient(0, waterTop, 0, h);
  wg.addColorStop(0, "#1565C0");
  wg.addColorStop(0.5,"#1348A0");
  wg.addColorStop(1, "#0D3580");
  ctx.fillStyle = wg;
  ctx.fillRect(0, waterTop, w, h - waterTop);

  // Surface reflection stripe
  const refG = ctx.createLinearGradient(0, waterTop, 0, waterTop + 18);
  refG.addColorStop(0, "rgba(135,206,235,0.35)");
  refG.addColorStop(1, "rgba(135,206,235,0)");
  ctx.fillStyle = refG;
  ctx.fillRect(0, waterTop, w, 18);

  drawWaterRipples(ctx, w, h, waterTop, t);
}

// Water overlay on live camera (lower 55%)
function drawWaterOverlay(ctx, w, h, ts) {
  const t = ts / 1000;
  const waterTop = h * 0.46;
  const wg = ctx.createLinearGradient(0, waterTop, 0, h);
  wg.addColorStop(0, "rgba(21,101,192,0.38)");
  wg.addColorStop(1, "rgba(13,53,128,0.55)");
  ctx.fillStyle = wg;
  ctx.fillRect(0, waterTop, w, h - waterTop);
  drawWaterRipples(ctx, w, h, waterTop, t);
}

function drawWaterRipples(ctx, w, h, waterTop, t) {
  // Horizontal ripple lines
  ctx.save();
  for (let row = 0; row < 14; row++) {
    const ry = waterTop + 16 + row * (h - waterTop - 20) / 14;
    const amp = 1.8 + row * 0.3;
    const freq = 0.025 - row * 0.0006;
    const alpha = 0.06 + row * 0.005;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 0.8 + row * 0.06;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const y = ry + Math.sin(x * freq + t * 1.1 + row) * amp
                   + Math.sin(x * freq * 2.3 - t * 0.7) * amp * 0.4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Sparkle highlights
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 8; i++) {
    const sx = (w * (0.05 + i * 0.12) + Math.sin(t * 0.9 + i * 1.7) * 22) % w;
    const sy = waterTop + 30 + ((i * 47 + Math.floor(t * 0.4) * 13) % (h - waterTop - 50));
    const sr = 1.2 + Math.sin(t * 2 + i) * 0.8;
    if (sr > 0.5) {
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawDock(ctx, w, h) {
  const dockX = w * 0.35;
  const dockY = h * 0.50;
  const dockW = w * 0.18;
  const dockH = h * 0.06;

  // Dock surface
  ctx.fillStyle = "#8B6914";
  ctx.fillRect(dockX, dockY, dockW, dockH);
  // Planks
  ctx.strokeStyle = "#A0784A"; ctx.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(dockX + dockW * i / 5, dockY);
    ctx.lineTo(dockX + dockW * i / 5, dockY + dockH);
    ctx.stroke();
  }
  // Posts
  ctx.fillStyle = "#6B4E2A";
  [[0.05,1],[0.95,1],[0.05,0],[0.95,0]].forEach(([px,py]) => {
    ctx.fillRect(dockX + dockW*px - 4, dockY + dockH*py - 2, 8, h*0.05);
  });
}

// ── Fishing rod drawn in bottom-right ────────────────────────────
function drawRod(ctx, w, h) {
  const baseX = w * 0.9;
  const baseY = h * 0.98;
  const tipX  = w * 0.52;
  const tipY  = h * 0.06;

  // Rod shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur  = 4;

  // Main rod (tapered)
  const grad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
  grad.addColorStop(0, "#5D4037");
  grad.addColorStop(0.4, "#8B5A2B");
  grad.addColorStop(1, "#D4A96A");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();

  // Reel
  ctx.strokeStyle = "#888"; ctx.lineWidth = 3;
  const rx = baseX - (baseX-tipX)*0.12, ry = baseY - (baseY-tipY)*0.12;
  ctx.beginPath(); ctx.arc(rx, ry, 9, 0, Math.PI*2); ctx.stroke();

  // Guide rings
  ctx.strokeStyle = "rgba(180,180,180,0.7)"; ctx.lineWidth = 1.5;
  [0.28, 0.45, 0.62, 0.76, 0.88].forEach(t => {
    const gx = baseX + (tipX-baseX)*t;
    const gy = baseY + (tipY-baseY)*t;
    ctx.beginPath(); ctx.arc(gx, gy, 5 - t*3, 0, Math.PI*2); ctx.stroke();
  });

  ctx.restore();
}

// ── Cast arc animation ────────────────────────────────────────────
function drawCastArc(ctx, w, h, progress) {
  const tipX = w * 0.52, tipY = h * 0.06;
  // Eased progress
  const ease = 1 - Math.pow(1 - progress, 3);
  const cx = tipX + (castTargetX - tipX) * ease;
  const cy = tipY + (castTargetY - tipY) * ease - Math.sin(ease * Math.PI) * h * 0.18;

  // Line from tip to current arc position
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(cx, cy); ctx.stroke();

  // Small flying bobber
  ctx.fillStyle = "#E53935";
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx, cy+2, 5, 0, Math.PI); ctx.fill();
  ctx.restore();
}

// ── Fishing line from rod tip to bobber ───────────────────────────
function drawLine(ctx, w, h, bx, by) {
  const tipX = w * 0.52, tipY = h * 0.06;
  const cpX = (tipX + bx) / 2;
  const cpY = tipY + (by - tipY) * 0.3;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(cpX, cpY, bx, by); ctx.stroke();
  ctx.restore();
}

// ── Bobber ────────────────────────────────────────────────────────
function drawBobber(ctx, bx, by, isBiting) {
  const r = 16;
  ctx.save();

  // Glow when biting
  if (isBiting) {
    const g = ctx.createRadialGradient(bx, by, r, bx, by, r+18);
    g.addColorStop(0, "rgba(255,60,60,0.35)");
    g.addColorStop(1, "rgba(255,60,60,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r+18, 0, Math.PI*2); ctx.fill();
  }
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath(); ctx.ellipse(bx, by+r+3, r*0.72, 4, 0, 0, Math.PI*2); ctx.fill();
  // White bottom
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI); ctx.fill();
  // Red top
  ctx.fillStyle = isBiting ? "#FF1744" : "#E53935";
  ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0); ctx.fill();
  // Border
  ctx.strokeStyle = isBiting ? "#FF1744" : "#bbb";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI*2); ctx.stroke();
  // Stripe
  ctx.strokeStyle = "#666"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(bx-r, by); ctx.lineTo(bx+r, by); ctx.stroke();
  // Antenna
  ctx.strokeStyle = "#aaa"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx, by-r); ctx.lineTo(bx, by-r-14); ctx.stroke();
  // Ripple rings
  if (!isBiting) {
    const t = Date.now() / 900;
    for (let i = 0; i < 3; i++) {
      const phase = (t + i * 0.38) % 1;
      ctx.strokeStyle = `rgba(100,180,255,${0.32*(1-phase)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(bx, by+5, r+10+phase*30, 5+phase*4, 0, 0, Math.PI*2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Species-accurate fish drawings ────────────────────────────────
function drawAllFish(ctx, w, h) {
  const waterTop = hasCameraFeed ? h * 0.46 : h * 0.52;
  SWIM_FISH.forEach(f => {
    // Move
    f.x += f.dx;
    f.y += f.dy * Math.sin(swimTime * 0.6 + f.phase);
    if (f.x < 0.04 || f.x > 0.96) { f.dx *= -1; f.flip = !f.flip; }
    f.y = Math.max(0.50, Math.min(0.95, f.y));
    const fx = f.x * w, fy = f.y * h;
    if (fy < waterTop) return;
    // Fade in near waterline
    const alpha = Math.min(1, (fy - waterTop) / 30) * 0.82;
    if (alpha < 0.05) return;
    ctx.save(); ctx.globalAlpha = alpha;
    drawFishSprite(ctx, fx, fy, f.size, f.species, f.flip, swimTime, f.phase);
    ctx.restore();
  });
}

function drawFishSprite(ctx, x, y, sz, species, flip, t, phase) {
  const wag = Math.sin(t * 3.2 + phase) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate(wag);

  if (species === "gar") {
    // Long narrow gar
    ctx.fillStyle = "#7B6914";
    ctx.beginPath(); ctx.ellipse(0, 0, sz*1.6, sz*0.28, 0, 0, Math.PI*2); ctx.fill();
    // Snout extension
    ctx.fillStyle = "#5D4E37";
    ctx.beginPath(); ctx.ellipse(-sz*1.9, 0, sz*0.65, sz*0.14, 0, 0, Math.PI*2); ctx.fill();
    // Tail
    ctx.fillStyle = "#5D4E37";
    ctx.beginPath(); ctx.moveTo(sz*1.5, 0); ctx.lineTo(sz*2.1, -sz*0.45); ctx.lineTo(sz*2.1, sz*0.45); ctx.closePath(); ctx.fill();
  } else if (species === "bluegill") {
    // Round compressed bluegill
    ctx.fillStyle = "#1565C0";
    ctx.beginPath(); ctx.ellipse(0, 0, sz*0.9, sz*0.72, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#FFA726"; // orange belly
    ctx.beginPath(); ctx.ellipse(0, sz*0.2, sz*0.55, sz*0.38, 0, 0, Math.PI*2); ctx.fill();
    // Tail
    ctx.fillStyle = "#0D47A1";
    ctx.beginPath(); ctx.moveTo(sz*0.8, 0); ctx.lineTo(sz*1.35, -sz*0.55); ctx.lineTo(sz*1.35, sz*0.55); ctx.closePath(); ctx.fill();
    // Blue ear patch
    ctx.fillStyle = "#1A237E";
    ctx.beginPath(); ctx.ellipse(sz*0.62, -sz*0.05, sz*0.2, sz*0.28, 0.3, 0, Math.PI*2); ctx.fill();
  } else if (species === "crappie") {
    // Tall oval crappie
    ctx.fillStyle = "#37474F";
    ctx.beginPath(); ctx.ellipse(0, 0, sz, sz*0.65, 0, 0, Math.PI*2); ctx.fill();
    // Spots
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    [[-sz*0.1,-sz*0.2],[sz*0.3,sz*0.1],[-sz*0.35,sz*0.15],[sz*0.1,-sz*0.35]].forEach(([dx,dy]) => {
      ctx.beginPath(); ctx.arc(dx, dy, sz*0.13, 0, Math.PI*2); ctx.fill();
    });
    // Tall dorsal fin
    ctx.fillStyle = "#263238";
    ctx.beginPath(); ctx.moveTo(-sz*0.3, -sz*0.65); ctx.lineTo(sz*0.5, -sz*0.65); ctx.lineTo(sz*0.3, 0); ctx.lineTo(-sz*0.1, 0); ctx.closePath(); ctx.fill();
    // Tail
    ctx.fillStyle = "#263238";
    ctx.beginPath(); ctx.moveTo(sz*0.9, 0); ctx.lineTo(sz*1.45,-sz*0.6); ctx.lineTo(sz*1.45,sz*0.6); ctx.closePath(); ctx.fill();
  } else {
    // Largemouth bass (default)
    ctx.fillStyle = "#2E7D32";
    ctx.beginPath(); ctx.ellipse(0, 0, sz, sz*0.52, 0, 0, Math.PI*2); ctx.fill();
    // White belly
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath(); ctx.ellipse(sz*0.05, sz*0.18, sz*0.7, sz*0.25, 0, 0, Math.PI*2); ctx.fill();
    // Dark lateral stripe
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.rect(-sz*0.8, -sz*0.08, sz*1.6, sz*0.16); ctx.fill();
    // Dorsal fin
    ctx.fillStyle = "#1B5E20";
    ctx.beginPath(); ctx.moveTo(-sz*0.2, -sz*0.52); ctx.lineTo(sz*0.6,-sz*0.52); ctx.lineTo(sz*0.4,0); ctx.lineTo(-sz*0.1,0); ctx.closePath(); ctx.fill();
    // Tail fork
    ctx.fillStyle = "#1B5E20";
    ctx.beginPath(); ctx.moveTo(sz*0.9, 0); ctx.lineTo(sz*1.4,-sz*0.6); ctx.lineTo(sz*1.3,-sz*0.1); ctx.lineTo(sz*1.3,sz*0.1); ctx.lineTo(sz*1.4,sz*0.6); ctx.closePath(); ctx.fill();
  }

  // Eye (all species)
  const eyeX = -(sz * (species==="gar"?1.4:0.52));
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(eyeX, -sz*0.08, sz*0.16, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(eyeX, -sz*0.08, sz*0.08, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function clearCanvas() {
  const c = document.getElementById("ar-canvas");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

// ── Touch / mouse handlers ────────────────────────────────────────
function onTouchStart(e) {
  if (e.target.closest("button,nav")) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartT = Date.now();
}
function onTouchEnd(e) {
  if (e.target.closest("button,nav")) return;
  const t = e.changedTouches[0];
  handleGesture(t.clientX-touchStartX, t.clientY-touchStartY,
                Date.now()-touchStartT, t.clientX, t.clientY);
}
function onMouseDown(e) {
  if (e.target.closest("button,nav")) return;
  touchStartX = e.clientX; touchStartY = e.clientY; touchStartT = Date.now();
}
function onMouseUp(e) {
  if (e.target.closest("button,nav")) return;
  handleGesture(e.clientX-touchStartX, e.clientY-touchStartY,
                Date.now()-touchStartT, e.clientX, e.clientY);
}

function handleGesture(dx, dy, dt, endX, endY) {
  if (castState === "idle" && (Math.sqrt(dx*dx+dy*dy) > 12 || dt < 400)) {
    startCast(endX, endY);
  }
}

// ── Cast ──────────────────────────────────────────────────────────
function startCast(endX, endY) {
  if (castState !== "idle") return;

  const canvas  = document.getElementById("ar-canvas");
  const scaleX  = (canvas.width  || window.innerWidth)  / window.innerWidth;
  const scaleY  = (canvas.height || window.innerHeight) / window.innerHeight;
  castTargetX   = Math.max(canvas.width*0.08, Math.min(canvas.width*0.88,  endX*scaleX));
  castTargetY   = Math.max(canvas.height*0.32, Math.min(canvas.height*0.76, endY*scaleY));
  castProgress  = 0;
  castState     = "casting";     // triggers arc animation in drawLoop

  if (typeof playSound === "function") playSound("cast");
  hideInstructions();
}

// ── Bite ──────────────────────────────────────────────────────────
function triggerBite() {
  if (castState !== "cast") return;
  castState = "biting";
  showBiteBanner(); showReelButton(); hideInstructions();
  if (typeof playSound === "function") playSound("bite");
  if (navigator.vibrate) navigator.vibrate([60,30,60]);
  biteTimeout = setTimeout(fishGotAway, 4500);
}

function fishGotAway() {
  if (castState !== "biting") return;
  castState = "idle";
  hideBiteBanner(); hideReelButton();
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
  if (castState !== "biting" && castState !== "cast") return;
  clearTimeout(biteTimeout);
  castState = "reeling";
  hideBiteBanner(); hideReelButton(); hideInstructions();
  if (typeof playSound === "function") playSound("reel");
  if (navigator.vibrate) navigator.vibrate([80,40,160]);

  const canvas = document.getElementById("ar-canvas");
  const startY = bobberY, startT = Date.now(), dur = 520;
  function pull() {
    const p = Math.min((Date.now()-startT)/dur, 1);
    // Ease in cubic pull
    bobberY = startY * (1 - p*p*p*0.95);
    if (p < 1 && arRunning) requestAnimationFrame(pull);
    else { arRunning = false; if (typeof window.onFishReeled === "function") window.onFishReeled(); }
  }
  requestAnimationFrame(pull);
}

// ── UI helpers ────────────────────────────────────────────────────
function showBiteBanner()  { const e=document.getElementById("bite-banner"); if(e) e.classList.remove("hidden"); }
function hideBiteBanner()  { const e=document.getElementById("bite-banner"); if(e) e.classList.add("hidden"); }
function showReelButton()  { const e=document.getElementById("reel-btn");    if(e) e.classList.remove("hidden"); }
function hideReelButton()  { const e=document.getElementById("reel-btn");    if(e) e.classList.add("hidden"); }
function showInstruction(type) {
  const c=document.getElementById("ar-inst-cast"), r=document.getElementById("ar-inst-reel");
  if(c) c.classList.toggle("hidden", type!=="cast");
  if(r) r.classList.toggle("hidden", type!=="reel");
}
function hideInstructions() {
  ["ar-inst-cast","ar-inst-reel"].forEach(id => { const e=document.getElementById(id); if(e) e.classList.add("hidden"); });
}
