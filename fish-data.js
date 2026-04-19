// fish-data.js — Lake Eola / Central Florida fish with real photos & conservation info

const FISH_DATABASE = [
  {
    id: "largemouth-bass",
    name: "LARGEMOUTH BASS",
    // Public domain image via Wikimedia Commons
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Largemouth_bass_USFWS.jpg/640px-Largemouth_bass_USFWS.jpg",
    badge: "KEYSTONE SPECIES",
    badgeColor: "#1565C0",
    scientific: "Micropterus salmoides",
    size: "12–24 inches · 1–10 lbs",
    location: "All Florida freshwater lakes, including Lake Eola",
    funFact: "Largemouth Bass can live up to 16 years and are Florida's #1 sport fish.",
    description: "The Largemouth Bass is the apex predator of Florida freshwater lakes. At Lake Eola, bass keep the ecosystem in balance by controlling smaller fish populations. They're easily identified by the large mouth that extends past their eye.",
    why: "Largemouth Bass are a keystone species — releasing them protects the entire food chain. Their numbers directly control prey fish populations and keep aquatic vegetation in check. Florida has strict size limits to preserve trophy fish.",
    conservation: "Least Concern",
    xp: 100,
    rarity: "Common"
  },
  {
    id: "bluegill",
    name: "BLUEGILL",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Lepomis_macrochirus.jpg/640px-Lepomis_macrochirus.jpg",
    badge: "NATIVE SPECIES",
    badgeColor: "#1976D2",
    scientific: "Lepomis macrochirus",
    size: "6–12 inches · 0.5–2 lbs",
    location: "Extremely common — found in every Florida lake including Lake Eola",
    funFact: "Bluegill are so abundant in Lake Eola they are often the first fish caught by beginners.",
    description: "Bluegill are one of the most abundant fish in Lake Eola and across Florida. They have a distinctive dark blue-purple coloring on their gill cover and bright orange belly on males. They hide near lily pads and submerged structure.",
    why: "Bluegill form the backbone of Lake Eola's food web. They are the primary food source for Largemouth Bass and wading birds like herons. Releasing them ensures the entire ecosystem above them stays healthy.",
    conservation: "Least Concern",
    xp: 50,
    rarity: "Common"
  },
  {
    id: "grass-carp",
    name: "GRASS CARP",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Ctenopharyngodon_idella.jpg/640px-Ctenopharyngodon_idella.jpg",
    badge: "RESTRICTED SPECIES",
    badgeColor: "#2E7D32",
    scientific: "Ctenopharyngodon idella",
    size: "24–36 inches · 5–30 lbs",
    location: "Florida requires a permit for Triploid Grass Carp",
    funFact: "A single Grass Carp can eat up to 3x its body weight in aquatic plants every day.",
    description: "Grass Carp are large, torpedo-shaped fish introduced to Florida to control invasive aquatic plants. They are silver-gold in color with large scales and a blunt head. Lake Eola's management program uses sterile Grass Carp to control hydrilla without breeding.",
    why: "Grass Carp are a RESTRICTED species in Florida — it is illegal to possess them without a permit. Releasing them back maintains the vegetation management program that Lake Eola depends on to prevent invasive plant overgrowth.",
    conservation: "Restricted — Permit Required",
    xp: 150,
    rarity: "Uncommon"
  },
  {
    id: "black-crappie",
    name: "BLACK CRAPPIE",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Pomoxis_nigromaculatus.jpg/640px-Pomoxis_nigromaculatus.jpg",
    badge: "GAME FISH",
    badgeColor: "#37474F",
    scientific: "Pomoxis nigromaculatus",
    size: "8–14 inches · 0.5–3 lbs",
    location: "Lakes, rivers, and reservoirs throughout Florida",
    funFact: "Black Crappie have 7–8 dorsal spines, which distinguishes them from White Crappie.",
    description: "Black Crappie are popular panfish found throughout Florida's freshwater lakes. They have a spotted, irregular black pattern and are laterally compressed. They school near submerged timber and vegetation, especially in the early morning.",
    why: "Black Crappie have a 10-inch minimum size limit in Florida. Releasing undersized fish protects the breeding population and ensures future generations of this popular game fish in Lake Eola.",
    conservation: "Least Concern",
    xp: 75,
    rarity: "Common"
  },
  {
    id: "florida-gar",
    name: "FLORIDA GAR",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Lepisosteus_platyrhincus.jpg/640px-Lepisosteus_platyrhincus.jpg",
    badge: "NATIVE — ANCIENT SPECIES",
    badgeColor: "#558B2F",
    scientific: "Lepisosteus platyrhincus",
    size: "18–36 inches · 1–5 lbs",
    location: "Endemic to Florida — Lake Eola, St. Johns River system",
    funFact: "Florida Gar are 'living fossils' — their family has been unchanged for over 100 million years.",
    description: "The Florida Gar is a prehistoric fish found only in Florida. It has an elongated, torpedo body covered in diamond-shaped ganoid scales, and a long snout filled with sharp teeth. You may see them rolling at the surface — they can breathe air with a modified swim bladder.",
    why: "The Florida Gar is an endemic species found nowhere else on Earth. They are vital predators that control small fish and invertebrate populations. Removing them disrupts an ancient ecological role they have held for millions of years.",
    conservation: "Near Threatened in some habitats",
    xp: 175,
    rarity: "Rare"
  },
  {
    id: "common-snook",
    name: "COMMON SNOOK",
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Centropomus_undecimalis.jpg/640px-Centropomus_undecimalis.jpg",
    badge: "PROTECTED SPECIES",
    badgeColor: "#E65100",
    scientific: "Centropomus undecimalis",
    size: "18–36 inches · 2–15 lbs",
    location: "Florida coastal waters — rare in freshwater like Lake Eola",
    funFact: "Snook are protandric hermaphrodites — all start as males and some become females as they grow larger.",
    description: "The Common Snook is one of Florida's most prized sport fish. It has a distinctive black lateral line running from head to tail, a sloping forehead, and a protruding lower jaw. Finding one in Lake Eola would be exceptionally rare and exciting!",
    why: "Snook are strictly protected in Florida with closed seasons and size limits. Their populations were severely impacted by cold events and habitat loss. Every Snook released is a win for Florida's coastal and freshwater fisheries.",
    conservation: "Protected — Strict Bag & Size Limits",
    xp: 250,
    rarity: "Rare"
  }
];

// Weighted random fish selection
function getRandomFish() {
  const weights = { "Common": 55, "Uncommon": 28, "Rare": 12 };
  const pool = [];
  FISH_DATABASE.forEach(fish => {
    const w = weights[fish.rarity] || 25;
    for (let i = 0; i < w; i++) pool.push(fish);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}
