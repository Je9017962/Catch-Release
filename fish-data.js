// fish-data.js — Lake Eola / Central Florida fish
// Each fish has multiple img sources tried in order + an SVG fallback drawn on canvas

const FISH_DATABASE = [
  {
    id: "largemouth-bass",
    name: "LARGEMOUTH BASS",
    // Multiple sources tried in order — first one that loads wins
    imgs: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Largemouth_bass_USFWS.jpg/640px-Largemouth_bass_USFWS.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Largemouth_bass_USFWS.jpg",
      "https://www.fws.gov/sites/default/files/styles/large/public/2021-08/Largemouth%20Bass.jpg",
    ],
    // SVG fallback — drawn inline if all imgs fail
    svgColor: "#2E7D32",
    svgAccent: "#1B5E20",
    emoji: "🐟",
    badge: "KEYSTONE SPECIES",
    badgeColor: "#1565C0",
    scientific: "Micropterus salmoides",
    size: "12–24 inches · 1–10 lbs",
    location: "All Florida freshwater lakes, including Lake Eola",
    funFact: "Largemouth Bass can live up to 16 years and are Florida's #1 sport fish.",
    description: "The Largemouth Bass is the apex predator of Florida freshwater lakes. At Lake Eola, bass keep the ecosystem in balance by controlling smaller fish populations. They're identified by the large mouth that extends past their eye.",
    why: "Largemouth Bass are a keystone species — releasing them protects the entire food chain. Their numbers directly control prey fish populations and keep aquatic vegetation in check. Florida has strict size limits to preserve trophy fish.",
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
    size: "6–12 inches · 0.5–2 lbs",
    location: "Every Florida lake — extremely common in Lake Eola",
    funFact: "Bluegill are so abundant in Lake Eola they are often the first fish caught by beginners.",
    description: "Bluegill are one of the most abundant fish in Lake Eola. They have a distinctive dark blue-purple coloring on their gill cover and a bright orange belly on males. They hide near lily pads and submerged structure.",
    why: "Bluegill form the backbone of Lake Eola's food web. They are the primary food source for Largemouth Bass and wading birds like herons. Releasing them ensures the entire ecosystem stays healthy.",
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
    size: "24–36 inches · 5–30 lbs",
    location: "Florida requires a permit for Triploid Grass Carp",
    funFact: "A single Grass Carp can eat up to 3× its body weight in aquatic plants every day.",
    description: "Grass Carp are large, torpedo-shaped fish introduced to Florida to control invasive aquatic plants. Lake Eola's management program uses sterile Grass Carp to control hydrilla without allowing them to breed.",
    why: "Grass Carp are a RESTRICTED species in Florida — illegal to possess without a permit. Releasing them back maintains Lake Eola's vegetation management program that prevents invasive plant overgrowth.",
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
    size: "8–14 inches · 0.5–3 lbs",
    location: "Lakes, rivers, and reservoirs throughout Florida",
    funFact: "Black Crappie have 7–8 dorsal spines, distinguishing them from White Crappie.",
    description: "Black Crappie are popular panfish found throughout Florida's freshwater lakes. They have a spotted black pattern and school near submerged timber and vegetation, especially in early morning.",
    why: "Black Crappie have a 10-inch minimum size limit in Florida. Releasing undersized fish protects the breeding population and ensures future generations in Lake Eola.",
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
    size: "18–36 inches · 1–5 lbs",
    location: "Endemic to Florida — Lake Eola, St. Johns River system",
    funFact: "Florida Gar are 'living fossils' — their family has been unchanged for over 100 million years.",
    description: "The Florida Gar is a prehistoric fish found only in Florida. It has a long snout, ganoid scales, and can breathe air using a modified swim bladder. You may see them rolling at the surface of Lake Eola.",
    why: "The Florida Gar is endemic — found nowhere else on Earth. They are vital predators that control small fish populations. Removing them disrupts an ecological role held for millions of years.",
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
    size: "18–36 inches · 2–15 lbs",
    location: "Florida coastal waters — rare in freshwater like Lake Eola",
    funFact: "Snook are protandric hermaphrodites — all start as males and some become female as they grow.",
    description: "The Common Snook is one of Florida's most prized sport fish, with a distinctive black lateral line from head to tail. Finding one in Lake Eola would be exceptionally rare and exciting!",
    why: "Snook are strictly protected in Florida with closed seasons and size limits. Their populations were severely impacted by cold events and habitat loss. Every Snook released is a win for Florida's fisheries.",
    conservation: "Protected — Strict Bag & Size Limits",
    xp: 250, rarity: "Rare"
  }
];

// ── Weighted random selection ─────────────────────────────────────
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
// Returns a data: URI SVG — used when all real images fail to load.
function makeFishSVG(fish) {
  const c  = fish.svgColor  || "#1565C0";
  const a  = fish.svgAccent || "#0D47A1";
  const isGar = fish.id === "florida-gar";

  if (isGar) {
    // Long narrow gar shape
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160">
  <rect width="320" height="160" fill="#E3F2FD"/>
  <!-- body -->
  <ellipse cx="155" cy="80" rx="100" ry="22" fill="${c}"/>
  <!-- long snout -->
  <rect x="30" y="74" width="90" height="12" rx="5" fill="${a}"/>
  <!-- tail -->
  <polygon points="255,58 295,42 295,118 255,102" fill="${a}"/>
  <!-- fin -->
  <ellipse cx="160" cy="60" rx="30" ry="10" fill="${a}" transform="rotate(-15,160,60)"/>
  <!-- eye -->
  <circle cx="95" cy="78" r="5" fill="white"/>
  <circle cx="95" cy="78" r="2.5" fill="#111"/>
  <!-- scales pattern -->
  <path d="M130,68 Q145,58 160,68" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M155,68 Q170,58 185,68" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M180,70 Q195,60 210,70" stroke="white" stroke-width="1.5" fill="none" opacity="0.4"/>
  <!-- teeth hint -->
  <path d="M32,74 L36,70 L40,74 L44,70 L48,74" stroke="white" stroke-width="1" fill="none"/>
  <text x="160" y="140" font-family="Arial" font-size="13" fill="${a}" text-anchor="middle" font-weight="bold">FLORIDA GAR</text>
</svg>`)}`;
  }

  // Generic fish shape for all others
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <rect width="320" height="200" fill="#E3F2FD"/>
  <!-- water hint -->
  <ellipse cx="160" cy="180" rx="130" ry="20" fill="#BBDEFB" opacity="0.6"/>
  <!-- tail -->
  <polygon points="248,76 290,46 290,154 248,124" fill="${a}"/>
  <!-- body -->
  <ellipse cx="148" cy="100" rx="110" ry="55" fill="${c}"/>
  <!-- belly -->
  <ellipse cx="140" cy="115" rx="85" ry="30" fill="white" opacity="0.18"/>
  <!-- dorsal fin -->
  <path d="M90,48 Q130,20 175,45" stroke="${a}" stroke-width="3" fill="${a}" opacity="0.85"/>
  <!-- pectoral fin -->
  <ellipse cx="110" cy="118" rx="28" ry="12" fill="${a}" opacity="0.7" transform="rotate(25,110,118)"/>
  <!-- lateral line -->
  <path d="M60,98 Q155,88 245,98" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <!-- scales -->
  <path d="M100,82 Q115,72 130,82" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <path d="M125,78 Q140,68 155,78" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <path d="M150,76 Q165,66 180,76" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <path d="M175,78 Q190,68 205,78" stroke="white" stroke-width="1.5" fill="none" opacity="0.35"/>
  <!-- eye -->
  <circle cx="72" cy="93" r="9" fill="white"/>
  <circle cx="72" cy="93" r="5" fill="#111"/>
  <circle cx="74" cy="91" r="2" fill="white"/>
  <!-- mouth -->
  <path d="M42,102 Q50,108 42,114" stroke="${a}" stroke-width="2" fill="none"/>
  <!-- name label -->
  <text x="160" y="185" font-family="Arial" font-size="11" fill="${a}" text-anchor="middle" font-weight="bold">${fish.name}</text>
</svg>`)}`;
}
