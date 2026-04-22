# Catch & Release AR

An augmented reality fishing experience set at **Lake Eola, Orlando, Florida**. Point your phone camera at the water, cast your line, reel in real Lake Eola fish species, and learn why each one should be released back into the wild.

**Live demo:** [catchrelease.netlify.app](https://catchrelease.netlify.app)

## What It Is

Catch & Release is a browser-based WebAR app — no app store download required. It uses your phone's rear camera as the AR viewport and overlays an interactive fishing scene on top of the live feed. Six real fish species native to Lake Eola and Central Florida waters are featured, each with accurate visual anatomy, conservation status, and educational release information.

## How to Play

1. **Create an account** or log in on the splash screen.
2. **Read the onboarding**, shown once on first login, to learn the controls and safety tips.
3. **Tap the fishing pin** on the Lake Eola map to open the AR camera.
4. **Tap anywhere on the water** to cast your line and watch the arc fly out from the rod tip.
5. **Wait for a bite** the bobber will dip and the REEL button will appear.
6. **Tap REEL** before the fish escapes. You have about four seconds.
7. **Learn about your catch** by viewing the fish detail card, which includes the scientific name, size, conservation status, and why the fish should be released.
8. **Release or keep** releasing awards bonus XP.
9. **Check your profile** to track your catches, XP, and rank progression.

## Features

### AR Fishing Scene
- Live rear camera feed with a translucent animated water overlay
- Drawn fishing rod with taper, reel, and guide rings always visible on screen
- Smooth cast arc animation, the line flies from the rod tip to your tap point
- Animated bobber with water ripple rings and a frantic dip and glow when a fish bites
- Six species-accurate fish swimming in the water before you cast (Largemouth Bass, Bluegill, Black Crappie, Florida Gar, and more), each with species-specific anatomy and a body wag animation
- Full animated lake fallback scene including sky, sun, clouds, treeline, hills, dock, and water ripples if camera permission is denied

### Fish Species Found at Lake Eola, Orlando

| Fish | Rarity | XP |
|---|---|---|
| Largemouth Bass | Common | 100 |
| Bluegill | Common | 50 |
| Grass Carp | Uncommon | 150 |
| Black Crappie | Common | 75 |
| Florida Gar | Rare | 175 |
| Common Snook | Rare | 250 |

Each fish card shows a real photo, scientific name, average size, Florida distribution, conservation status, a fun fact, and a "Why We Release" explanation.

### Authentication and Data
- Secure account system with passwords hashed using SHA-256 via the browser's native SubtleCrypto API before storage
- No plaintext passwords are ever written to disk
- Thirty-day persistent sessions so returning users are logged in automatically
- All catch history and XP stored locally in localStorage per user account
- Data is saved automatically every 30 seconds and when the tab is closed

### Weather
- Live weather fetched from [Open-Meteo](https://open-meteo.com) — free with no API key required
- GPS location via the browser Geolocation API
- Reverse geocoding via BigDataCloud — free with no API key required
- Displays the real date, temperature in Fahrenheit, weather condition, and city name on the map and AR screens
- Falls back to Lake Eola, Orlando if location access is denied

### Audio and Haptics
- **Cast** — whoosh and water plop
- **Bite** — triple alert ping
- **Reel** — rising ratchet sweep
- **Catch** — ascending triumphant chime
- **Release** — descending splash
- All sounds are synthesized in real time via the Web Audio API with no audio files required
- Haptic vibration on reel and catch where supported by the device

### UX and Accessibility
- Onboarding shown only once on first login
- Bottom navigation (PROFILE / HOME / HELP) on all content screens
- Back buttons on all sub-screens
- `role="main"` and `aria-label` on every screen
- `<label for="">` pairings on all form inputs
- `role="alert"` with `aria-live` on all error messages
- `role="progressbar"` on the XP bar
- Button loading states during authentication to prevent double-submission
- Session summary toast notification after every keep or release action
- Minimum font size of 13px enforced throughout

## File Structure

```
catch-and-release-ar/
├── index.html      All 11 screens: splash, auth, onboarding, map, AR, catch, fish detail, profile
├── style.css       Full design system: blue and white brand, Anton headers, all screen layouts
├── ar-scene.js     AR engine: camera, canvas overlay, rod, fish, bobber, cast and reel mechanics
├── game.js         Game logic: routing, XP, catch log, image loading, sounds, toasts
├── auth.js         Authentication: SHA-256 hashing, sessions, loading states, data persistence
├── weather.js      Live weather: GPS, Open-Meteo, reverse geocoding
└── fish-data.js    Six fish species with photos, SVG fallbacks, and conservation information
```

## Local Development

```bash
cd catch-and-release-ar
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Camera access requires HTTPS on iOS Safari. For mobile testing over a local network, use ngrok to create an HTTPS tunnel:

```bash
npx ngrok http 8080
```

Open the `https://` URL that ngrok provides on your phone.

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5, CSS3, and Vanilla JS | All UI, screens, and logic with no external framework |
| getUserMedia API | Rear camera access for the AR view |
| Canvas 2D API | All AR drawing: lake scene, fish, rod, bobber, and water |
| Web Audio API | Synthesized sound effects with no audio files needed |
| SubtleCrypto API | SHA-256 password hashing |
| localStorage | User accounts, sessions, and catch log |
| Geolocation API | GPS coordinates for live weather |
| Open-Meteo API | Free weather data with no API key required |
| BigDataCloud API | Free reverse geocoding with no API key required |
| Google Fonts | Anton for headers and Inter for body text |

## Conservation Note

Catch & Release is designed to teach players about Florida fish conservation. Every fish in the app is a real species found in or near Lake Eola, Orlando. The app awards bonus XP for releasing fish and provides detailed information about why each species benefits from catch-and-release practices under Florida Fish and Wildlife Conservation Commission (FWC) guidelines.

## Credits

Built as a student AR project.
Fish conservation data sourced from the Florida Fish and Wildlife Conservation Commission (FWC).
Fish photos sourced from Wikimedia Commons under public domain and Creative Commons licenses.
Weather data provided by [Open-Meteo](https://open-meteo.com), an open-source weather API.
