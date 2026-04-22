// Jeremiah Morris-Wyley
// fish-data.js — Lake Eola / Central Florida fish
// Each fish has multiple image sources tried in order, plus an SVG fallback drawn on canvas.

const FISH_DATABASE = [
  {
    id: "largemouth-bass",
    name: "LARGEMOUTH BASS",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Largemouth_bass_USFWS.jpg/640px-Largemouth_bass_USFWS.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Largemouth_bass_USFWS.jpg",
      "https://www.fws.gov/sites/default/files/styles/large/public/2021-08/Largemouth%20Bass.jpg",
    ],
    svgColor: "#2E7D32",
    svgAccent: "#1B5E20",
    emoji: "🐟",
    badge: "KEYSTONE SPECIES",
    badgeColor: "#1565C0",
    scientific: "Micropterus salmoides",
    size: "12 to 24 inches · 1 to 10 lbs",
    location: "All Florida freshwater lakes, including Lake Eola",
    funFact: "Largemouth Bass can live up to 16 years and are Florida's number one sport fish.",
    description: "The Largemouth Bass is the apex predator of Florida freshwater lakes. At Lake Eola, bass keep the ecosystem in balance by controlling smaller fish populations. They are identified by their large mouth, which extends past the eye.",
    why: "Largemouth Bass are a keystone species, meaning releasing them protects the entire food chain. Their numbers directly control prey fish populations and keep aquatic vegetation in check. Florida enforces strict size limits to preserve trophy fish for future generations.",
    conservation: "Least Concern",
    xp: 100, rarity: "Common"
  },
  {
    id: "bluegill",
    name: "BLUEGILL",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Lepomis_macrochirus.jpg/640px-Lepomis_macrochirus.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/7/71/Lepomis_macrochirus.jpg",
      "https://www.fws.gov/sites/default/files/styles/large/public/2021-08/bluegill.jpg",
    ],
    svgColor: "#1565C0",
    svgAccent: "#0D47A1",
    emoji: "🐠",
    badge: "NATIVE SPECIES",
    badgeColor: "#1976D2",
    scientific: "Lepomis macrochirus",
    size: "6 to 12 inches · 0.5 to 2 lbs",
    location: "Every Florida lake — extremely common in Lake Eola",
    funFact: "Bluegill are so abundant in Lake Eola that they are often the first fish caught by beginners.",
    description: "Bluegill are one of the most abundant fish in Lake Eola. They have a distinctive dark blue and purple coloring on their gill cover and a bright orange belly on males. They are commonly found hiding near lily pads and submerged structure.",
    why: "Bluegill form the backbone of Lake Eola's food web. They are the primary food source for Largemouth Bass and wading birds such as herons. Releasing them ensures the entire ecosystem remains healthy and balanced.",
    conservation: "Least Concern",
    xp: 50, rarity: "Common"
  },
  {
    id: "grass-carp",
    name: "GRASS CARP",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Ctenopharyngodon_idella.jpg/640px-Ctenopharyngodon_idella.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/b4/Ctenopharyngodon_idella.jpg",
      "https://nas.er.usgs.gov/ximages/thumbs/grass_carp.jpg",
    ],
    svgColor: "#558B2F",
    svgAccent: "#33691E",
    emoji: "🐡",
    badge: "RESTRICTED SPECIES",
    badgeColor: "#2E7D32",
    scientific: "Ctenopharyngodon idella",
    size: "24 to 36 inches · 5 to 30 lbs",
    location: "Florida requires a permit to possess Triploid Grass Carp",
    funFact: "A single Grass Carp can consume up to three times its body weight in aquatic plants every day.",
    description: "Grass Carp are large, torpedo-shaped fish introduced to Florida to control invasive aquatic plants. Lake Eola's management program uses sterile Grass Carp to manage hydrilla growth without allowing the fish to breed and spread.",
    why: "Grass Carp are a restricted species in Florida. It is illegal to possess them without a permit. Releasing them back into the lake maintains Lake Eola's vegetation management program, which prevents invasive plant overgrowth from harming the ecosystem.",
    conservation: "Restricted — Permit Required",
    xp: 150, rarity: "Uncommon"
  },
  {
    id: "black-crappie",
    name: "BLACK CRAPPIE",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Pomoxis_nigromaculatus.jpg/640px-Pomoxis_nigromaculatus.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3c/Pomoxis_nigromaculatus.jpg",
      "https://www.fws.gov/sites/default/files/styles/large/public/2021-08/black-crappie.jpg",
    ],
    svgColor: "#37474F",
    svgAccent: "#263238",
    emoji: "🐟",
    badge: "GAME FISH",
    badgeColor: "#37474F",
    scientific: "Pomoxis nigromaculatus",
    size: "8 to 14 inches · 0.5 to 3 lbs",
    location: "Lakes, rivers, and reservoirs throughout Florida",
    funFact: "Black Crappie have seven to eight dorsal spines, which distinguishes them from White Crappie.",
    description: "Black Crappie are popular panfish found throughout Florida's freshwater lakes. They have a distinctive spotted black pattern and tend to school near submerged timber and vegetation, particularly in the early morning hours.",
    why: "Black Crappie have a ten-inch minimum size limit in Florida. Releasing undersized fish protects the breeding population and ensures that future generations of this popular game fish continue to thrive in Lake Eola.",
    conservation: "Least Concern",
    xp: 75, rarity: "Common"
  },
  {
    id: "florida-gar",
    name: "FLORIDA GAR",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Lepisosteus_platyrhincus.jpg/640px-Lepisosteus_platyrhincus.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/32/Lepisosteus_platyrhincus.jpg",
      "https://nas.er.usgs.gov/ximages/thumbs/florida_gar.jpg",
    ],
    svgColor: "#7B6914",
    svgAccent: "#5D4E37",
    emoji: "🦎",
    badge: "ANCIENT NATIVE",
    badgeColor: "#558B2F",
    scientific: "Lepisosteus platyrhincus",
    size: "18 to 36 inches · 1 to 5 lbs",
    location: "Endemic to Florida, including Lake Eola and the St. Johns River system",
    funFact: "Florida Gar are living fossils. Their family lineage has remained virtually unchanged for over 100 million years.",
    description: "The Florida Gar is a prehistoric fish found only in Florida. It has a long snout, tough ganoid scales, and can breathe air using a modified swim bladder. You may spot them rolling at the surface of Lake Eola to take in air.",
    why: "The Florida Gar is endemic, meaning it is found nowhere else on Earth. These fish are vital predators that control populations of smaller baitfish. Removing them disrupts an ecological role they have held for millions of years, which can throw the entire food web out of balance.",
    conservation: "Near Threatened in some habitats",
    xp: 175, rarity: "Rare"
  },
  {
    id: "common-snook",
    name: "COMMON SNOOK",
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Centropomus_undecimalis.jpg/640px-Centropomus_undecimalis.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/4/44/Centropomus_undecimalis.jpg",
      "https://myfwc.com/media/2451/snook.jpg",
    ],
    svgColor: "#BF6000",
    svgAccent: "#8D4300",
    emoji: "🐠",
    badge: "PROTECTED SPECIES",
    badgeColor: "#E65100",
    scientific: "Centropomus undecimalis",
    size: "18 to 36 inches · 2 to 15 lbs",
    location: "Florida coastal waters — rare in freshwater locations like Lake Eola",
    funFact: "Snook are protandric hermaphrodites, meaning all individuals start as males and some transition to female as they grow larger.",
    description: "The Common Snook is one of Florida's most prized sport fish, identifiable by a distinctive black lateral line running from head to tail. Catching one in Lake Eola would be exceptionally rare and an exciting find for any angler.",
    why: "Snook are strictly protected in Florida with enforced closed seasons and size limits. Their populations were severely impacted by cold weather events and habitat loss. Every Snook that is released back into the water is a meaningful contribution to the health of Florida's fisheries.",
    conservation: "Protected — Strict Bag and Size Limits",
    xp: 250, rarity: "Rare"
  }
];

// Weighted random fish selection based on rarity
function getRandomFish() {
  const weights = { "Common": 55, "Uncommon": 28, "Rare": 12 };
  const pool = [];
  FISH_DATABASE.forEach(f => {
    const w = weights[f.rarity] || 25;
    for (let i = 0; i < w; i++) pool.push(f);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── SVG fish illustration generator ──────────────────────────────
// Returns a data URI SVG used as a fallback when all real images fail to load.
function makeFishSVG(fish) {
  const c = fish.svgColor  || "#1565C0";
  const a = fish.svgAccent || "#0D47A1";

  if (fish.id === "florida-gar") {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <rect width="400" height="200" fill="#E8F5E9"/>
  <ellipse cx="200" cy="195" rx="170" ry="14" fill="#C8E6C9" opacity="0.5"/>
  <polygon points="320,80 370,55 370,145 320,120" fill="${a}"/>
  <ellipse cx="195" cy="100" rx="145" ry="30" fill="${c}"/>
  <rect x="22" y="92" width="95" height="16" rx="7" fill="${a}"/>
  <ellipse cx="195" cy="112" rx="110" ry="14" fill="white" opacity="0.15"/>
  <path d="M140,72 Q185,44 230,68" fill="${a}" opacity="0.85"/>
  <ellipse cx="155" cy="122" rx="26" ry="9" fill="${a}" opacity="0.7" transform="rotate(20,155,122)"/>
  <path d="M155,86 Q170,76 185,86" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M183,84 Q198,74 213,84" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M211,85 Q226,75 241,85" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M239,87 Q254,77 269,87" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M60,98 Q195,90 315,98" stroke="white" stroke-width="1.2" fill="none" opacity="0.3"/>
  <circle cx="100" cy="97" r="7" fill="white"/>
  <circle cx="100" cy="97" r="4" fill="#111"/>
  <circle cx="102" cy="95" r="1.5" fill="white"/>
  <path d="M24,92 L29,86 L34,92 L39,86 L44,92 L49,86 L54,92" stroke="white" stroke-width="1" fill="none"/>
  <text x="200" y="182" font-family="Arial,sans-serif" font-size="13" fill="${a}" text-anchor="middle" font-weight="bold">FLORIDA GAR</text>
</svg>`)}`;
  }

  const label = fish.name || "FISH";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E3F2FD"/>
      <stop offset="100%" stop-color="#BBDEFB"/>
    </linearGradient>
  </defs>
  <rect width="400" height="220" fill="url(#bg)"/>
  <ellipse cx="200" cy="210" rx="165" ry="12" fill="#90CAF9" opacity="0.45"/>
  <polygon points="308,88 364,54 364,166 308,132" fill="${a}"/>
  <ellipse cx="190" cy="110" rx="140" ry="65" fill="${c}"/>
  <ellipse cx="178" cy="128" rx="108" ry="35" fill="white" opacity="0.2"/>
  <path d="M108,50 Q160,18 218,48" fill="${a}" opacity="0.88"/>
  <path d="M108,50 L218,48 L200,82 L128,84 Z" fill="${c}" opacity="0.6"/>
  <ellipse cx="136" cy="134" rx="34" ry="13" fill="${a}" opacity="0.7" transform="rotate(22,136,134)"/>
  <path d="M155,172 Q185,188 215,172" fill="${a}" opacity="0.65"/>
  <path d="M72,108 Q190,98 300,108" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <path d="M118,90 Q135,78 152,90" stroke="white" stroke-width="1.5" fill="none" opacity="0.38"/>
  <path d="M148,86 Q165,74 182,86" stroke="white" stroke-width="1.5" fill="none" opacity="0.38"/>
  <path d="M178,84 Q195,72 212,84" stroke="white" stroke-width="1.5" fill="none" opacity="0.38"/>
  <path d="M208,85 Q225,73 242,85" stroke="white" stroke-width="1.5" fill="none" opacity="0.38"/>
  <path d="M238,88 Q255,76 272,88" stroke="white" stroke-width="1.5" fill="none" opacity="0.38"/>
  <circle cx="84" cy="102" r="11" fill="white"/>
  <circle cx="84" cy="102" r="6.5" fill="#111"/>
  <circle cx="86.5" cy="99.5" r="2.5" fill="white"/>
  <path d="M48,112 Q58,120 48,128" stroke="${a}" stroke-width="2.5" fill="none"/>
  <text x="200" y="205" font-family="Arial,sans-serif" font-size="12" fill="${a}" text-anchor="middle" font-weight="bold">${label}</text>
</svg>`)}`;
}
