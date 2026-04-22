// Jeremiah Morris-Wyley
// weather.js — Live GPS + Open-Meteo weather (free, no API key)

const WMO = {
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
    return WMO[code] || { icon: "🌡️", desc: "Unknown" };
}

function formatDate(date_str) {
    return new Date(date_str + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric"
    });
}

function applyWeatherUI(icon, line1, line2) {
    const slots = [
        { icon: "weather-icon",    date: "weather-date",    temp: "weather-temp" },
        { icon: "ar-weather-icon", date: "ar-weather-date", temp: "ar-weather-temp" },
    ];
    slots.forEach(s => {
        const icon_el = document.getElementById(s.icon);
        const date_el = document.getElementById(s.date);
        const temp_el = document.getElementById(s.temp);
        if (icon_el) icon_el.textContent = icon;
        if (date_el) date_el.textContent = line1;
        if (temp_el) temp_el.textContent = line2;
    });
}

async function fetchWeather() {
    applyWeatherUI("📍", "Locating…", "Getting weather…");
    let lat = 28.5421, lon = -81.3680, city = "Lake Eola, Orlando";

    try {
        const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 300000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        city = "";
    } catch { /* use Lake Eola default */ }

    if (!city) {
        try {
            const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            if (r.ok) {
                const j = await r.json();
                city = j.city || j.locality || j.countryName || "";
            }
        } catch { /* keep city empty */ }
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weathercode&daily=weathercode` +
            `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        const temp_f = Math.round(d.current.temperature_2m);
        const wmo = wmoLookup(d.current.weathercode);
        const date = formatDate(d.daily.time[0]);
        const temp = city ? `${temp_f}°F · ${wmo.desc} · ${city}` : `${temp_f}°F · ${wmo.desc}`;
        applyWeatherUI(wmo.icon, date, temp);
        window._weatherCache = { icon: wmo.icon, date: date, temp: temp };
    } catch (e) {
        const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        applyWeatherUI("🌤️", today, `Weather unavailable · ${city || "Orlando, FL"}`);
    }
}

function refreshARWeather() {
    const c = window._weatherCache;
    if (!c) return;
    const ids = ["ar-weather-icon", "ar-weather-date", "ar-weather-temp"];
    const vals = [c.icon, c.date, c.temp];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = vals[i];
    });
}
