// fish-data.js — Real Florida fish found in / near Lake Eola & Central FL lakes

const FISH_DATABASE = [
  {
    id: "largemouth-bass",
    name: "LARGEMOUTH BASS",
    emoji: "🐟",
    badge: "THE RESTRICTED SPECIES",
    scientific: "Micropterus salmoides",
    size: "12–24 inches, 1–10 lbs",
    location: "All freshwater lakes in Florida, including Lake Eola",
    description: "The Largemouth Bass is the apex predator of Florida freshwater lakes. At Lake Eola, bass keep the smaller fish population in balance, supporting a healthy aquatic ecosystem for the entire lake.",
    why: "Largemouth Bass are a keystone species in Florida lakes. Keeping their population healthy by releasing them ensures they continue managing prey fish and vegetation, keeping the entire lake in balance.",
    xp: 100,
    rarity: "Common",
    color: "#1565C0"
  },
  {
    id: "grass-carp",
    name: "GRASS CARP",
    emoji: "🐠",
    badge: "THE RESTRICTED SPECIES",
    scientific: "Ctenopharyngodon idella",
    size: "24–36 inches, 5–20 lbs",
    location: "Florida Status: Triploid Grass Carp require a permit",
    description: "Grass Carp are large herbivorous fish introduced to control aquatic vegetation. In Florida lakes, they consume vast amounts of aquatic plants, which can both help and harm the lake ecosystem.",
    why: "Grass Carp are a restricted species in Florida. They control the aquatic vegetation in lakes, but if their population grows too large, they can over-consume vegetation that other fish and wildlife depend on.",
    xp: 150,
    rarity: "Uncommon",
    color: "#2E7D32"
  },
  {
    id: "common-snook",
    name: "COMMON SNOOK",
    emoji: "🐡",
    badge: "PROTECTED SPECIES",
    scientific: "Centropomus undecimalis",
    size: "24–36 inches, 3–12 lbs",
    location: "Florida coastal waters and some freshwater lakes",
    description: "The Common Snook is a Florida native that is highly sought after by sport fishers. However, the FWC strictly regulates its catch to protect the health and sustainability of the Common Snook population.",
    why: "The Common Snook is a protected species in Florida. They are highly sought after by anglers, but must be released during closed seasons to maintain healthy populations in Florida's coastal and freshwater systems.",
    xp: 200,
    rarity: "Rare",
    color: "#E65100"
  },
  {
    id: "bluegill",
    name: "BLUEGILL",
    emoji: "🐟",
    badge: "COMMON SPECIES",
    scientific: "Lepomis macrochirus",
    size: "6–12 inches, 0.5–2 lbs",
    location: "Extremely common across all Florida lakes including Lake Eola",
    description: "Bluegill are one of the most abundant fish in Lake Eola and across Florida. They are a critical food source for bass and larger predatory fish, forming the backbone of the lake's food web.",
    why: "While Bluegill can be kept in Florida, releasing them supports a healthy ecosystem by maintaining the prey fish population that larger predators like Largemouth Bass depend on.",
    xp: 50,
    rarity: "Common",
    color: "#1976D2"
  },
  {
    id: "black-crappie",
    name: "BLACK CRAPPIE",
    emoji: "🐠",
    badge: "GAME FISH",
    scientific: "Pomoxis nigromaculatus",
    size: "8–14 inches, 0.5–3 lbs",
    location: "Lakes, rivers, and reservoirs throughout Florida",
    description: "Black Crappie are popular game fish found throughout Florida's freshwater lakes. They school in groups near submerged structure and vegetation, making them a favorite target for anglers.",
    why: "Black Crappie are a game fish in Florida with size and bag limits. Releasing undersized fish helps maintain a healthy population of adult crappie in local lakes.",
    xp: 75,
    rarity: "Common",
    color: "#37474F"
  },
  {
    id: "florida-gar",
    name: "FLORIDA GAR",
    emoji: "🐡",
    badge: "NATIVE SPECIES",
    scientific: "Lepisosteus platyrhincus",
    size: "18–36 inches, 1–5 lbs",
    location: "Unique to Florida — found in Lake Eola and all Central FL lakes",
    description: "The Florida Gar is a prehistoric-looking fish native exclusively to Florida. It is an air-breathing fish that can be spotted rolling at the water's surface. Lake Eola is known to have a small population.",
    why: "The Florida Gar is a native Florida species and a living fossil. They play a vital role in controlling overpopulation of smaller baitfish and are an indicator species of water quality.",
    xp: 175,
    rarity: "Rare",
    color: "#558B2F"
  }
];

// Weighted random fish selection based on rarity
function getRandomFish() {
  const weights = { "Common": 50, "Uncommon": 30, "Rare": 15 };
  const pool = [];
  FISH_DATABASE.forEach(fish => {
    const w = weights[fish.rarity] || 30;
    for (let i = 0; i < w; i++) pool.push(fish);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}
