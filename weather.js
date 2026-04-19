// weather.js — Live location + weather via Open-Meteo (free, no API key)
// Updates all weather UI elements on the home/map and AR screens.

// ── WMO weather code → emoji + description ───────────────────────
const WMO_CODES = {
  0:  { icon: "☀️",  desc: "Clear" },
  1:  { icon: "🌤️", desc: "Mostly Clear" },
  2:  { icon: "⛅",  desc: "Partly Cloudy" },
  3:  { icon: "☁️",  desc: "Overcast" },
  45: { icon: "🌫️", desc: "Foggy" },
  48: { icon: "🌫️", desc: "Icy Fog" },
  51: { icon: "🌦️", desc: "Light Drizzle" },
  53: { icon: "🌦️", desc: "Drizzle" },
  55: { icon: "🌧️", desc: "Heavy Drizzle" },
  61: { icon: "🌧️", desc: "Light Rain" },
  63: { icon: "🌧️", desc: "Rain" },
  65: { icon: "🌧️", desc: "Heavy Rain" },
  71: { icon: "🌨️", desc: "Light Snow" },
  73: { icon: "🌨️", desc: "Snow" },
  75: { icon: "❄️",  desc: "Heavy Snow" },
  80: { icon: "🌦️", desc: "Rain Showers" },
  81: { icon: "⛈️",  desc: "Heavy Showers" },
  82: { icon: "⛈️",  desc: "Violent Showers" },
  95: { icon: "⛈️",  desc: "Thunderstorm" },
  96: { icon: "⛈️",  desc: "Thunderstorm + Hail" },
  99: { icon: "⛈️",  desc: "Heavy Thunderstorm" },
};

function wmoLookup(code) {
  return WMO_CODES[code] || { icon: "🌡️", desc: "Unknown" };
}

// ── Format today's date nicely ────────────────────────────────────
function formatDate(dateStr) {
  // dateStr from Open-Meteo: "2025-04-19"
  const d = new Date(dateStr + "T12:00:00"); // noon avoids timezone day-shift
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

// ── Update all weather UI slots ───────────────────────────────────
function applyWeatherUI(icon, line1, line2) {
  const slots = [
    { icon: "weather-icon",    date: "weather-date",    temp: "weather-temp"    },
    { icon: "ar-weather-icon", date: "ar-weather-date", temp: "ar-weather-temp" },
  ];
  slots.forEach(s => {
    const iEl = document.getElementById(s.icon);
    const dEl = document.getElementById(s.date);
    const tEl = document.getElementById(s.temp);
    if (iEl) iEl.textContent = icon;
    if (dEl) dEl.textContent = line1;
    if (tEl) tEl.textContent = line2;
  });
}

// ── Main fetch function ───────────────────────────────────────────
async function fetchWeather() {
  // Show "locating…" while we wait
  applyWeatherUI("📍", "Locating…", "Getting weather…");

  // 1. Get GPS coords
  let lat, lon, cityName = "";
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("No geolocation"));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: 300000 // reuse a cached position up to 5 min old
      });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
  } catch (geoErr) {
    // Geolocation denied or unavailable — fall back to Lake Eola, Orlando
    console.warn("Geolocation unavailable, using Lake Eola default:", geoErr.message);
    lat = 28.5421;
    lon = -81.3680;
    cityName = "Lake Eola, Orlando";
  }

  // 2. Reverse geocode to city name (Open-Meteo geocoding doesn't do reverse,
  //    so we use the free BigDataCloud API — no key needed)
  if (!cityName) {
    try {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        cityName = geoJson.city || geoJson.locality || geoJson.countryName || "";
      }
    } catch { /* ignore — city name is optional */ }
  }

  // 3. Fetch current weather from Open-Meteo (completely free, no API key)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,apparent_temperature` +
      `&daily=weathercode&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error("Weather API error: " + res.status);
    const data = await res.json();

    const tempF = Math.round(data.current.temperature_2m);
    const code  = data.current.weathercode;
    const date  = data.daily.time[0]; // "YYYY-MM-DD"
    const wmo   = wmoLookup(code);

    const dateStr  = formatDate(date);
    const tempLine = cityName
      ? `${tempF}°F · ${wmo.desc} · ${cityName}`
      : `${tempF}°F · ${wmo.desc}`;

    applyWeatherUI(wmo.icon, dateStr, tempLine);

    // Cache for the AR screen to pick up when it opens
    window._weatherCache = { icon: wmo.icon, date: dateStr, temp: tempLine };

  } catch (weatherErr) {
    console.warn("Weather fetch failed:", weatherErr.message);
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric"
    });
    const fallback = cityName || "Orlando, FL";
    applyWeatherUI("🌤️", today, `Weather unavailable · ${fallback}`);
  }
}

// ── Refresh weather when AR screen opens ─────────────────────────
// Called by game.js when entering AR
function refreshARWeather() {
  const cache = window._weatherCache;
  if (cache) {
    const iEl = document.getElementById("ar-weather-icon");
    const dEl = document.getElementById("ar-weather-date");
    const tEl = document.getElementById("ar-weather-temp");
    if (iEl) iEl.textContent = cache.icon;
    if (dEl) dEl.textContent = cache.date;
    if (tEl) tEl.textContent = cache.temp;
  }
}
