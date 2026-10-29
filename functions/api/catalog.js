const BASE = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/";

const CATEGORIES = {
  all: "all.json",
  skins: "skins_not_grouped.json",
  gloves: "skins_not_grouped.json",
  stickers: "stickers.json",
  keychains: "keychains.json",
  agents: "agents.json",
  crates: "crates.json",
  collectibles: "collectibles.json",
  graffiti: "graffiti.json",
  music_kits: "music_kits.json",
  patches: "patches.json",
  sticker_slabs: "sticker_slabs.json",
  keys: "keys.json",
  highlights: "highlights.json",
  base_weapons: "base_weapons.json",
  pets: "pets.json",
};

const LABELS = {
  all: "CS2 item",
  skins: "Skin",
  gloves: "Eldiven",
  stickers: "Sticker",
  keychains: "Charm / keychain",
  agents: "Ajan",
  crates: "Kasa",
  collectibles: "Koleksiyon itemi",
  graffiti: "Graffiti",
  music_kits: "Müzik kiti",
  patches: "Patch",
  sticker_slabs: "Sticker slab",
  keys: "Kasa anahtarı",
  highlights: "Highlight itemi",
  base_weapons: "Temel item",
  pets: "Pet",
};

function json(body, status = 200, cache = "public, max-age=60, s-maxage=300") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    return Object.entries(data).map(([key, value]) => {
      if (value && typeof value === "object" && !value.id) return { ...value, id: key };
      return value;
    }).filter(Boolean);
  }
  return [];
}

function safeImage(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host === "raw.githubusercontent.com" ||
      host === "community.akamai.steamstatic.com" ||
      host === "cdn.steamstatic.com" ||
      host === "steamcommunity-a.akamaihd.net" ||
      host === "steamcdn-a.akamaihd.net";
    return url.protocol === "https:" && allowed ? url.href : "";
  } catch {
    return "";
  }
}

function itemCategory(item, id, fallback) {
  const sourceCategory = item.category && item.category.name;
  if (sourceCategory) return String(sourceCategory);
  const prefix = String(id || item.id || "").split("-")[0];
  const labels = {
    skin: "Skin", sticker: "Sticker", keychain: "Charm / keychain", agent: "Ajan",
    crate: "Kasa", collectible: "Koleksiyon itemi", graffiti: "Graffiti",
    music: "Müzik kiti", patch: "Patch", sticker_slab: "Sticker slab",
  };
  return labels[prefix] || fallback || "CS2 item";
}

function isGlove(item) {
  const text = [
    item.category && item.category.name,
    item.weapon && item.weapon.name,
    item.name,
    item.market_hash_name,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("glove") || text.includes("gloves");
}

function scoreItem(item, q) {
  const name = String(item.market_hash_name || item.name || "").toLowerCase();
  const exact = name === q;
  const starts = name.startsWith(q);
  const pos = name.indexOf(q);
  return (exact ? 1000 : 0) + (starts ? 200 : 0) - Math.max(0, pos);
}

async function loadSource(request, url) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  try {
    const cached = cache ? await cache.match(cacheKey) : null;
    if (cached) return cached.json();
  } catch {
    // The upstream fetch still works in local Pages development without Cache API.
  }

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) throw new Error("CS2 item kataloğu şu an yanıt vermiyor.");
  const text = await response.text();
  if (text.length > 45_000_000) throw new Error("Katalog yanıtı beklenen boyutun üzerinde.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("CS2 item kataloğu okunamadı.");
  }
  try {
    const stored = new Response(text, {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
    });
    if (cache) await cache.put(cacheKey, stored);
  } catch {
    // Cache is an optimization; do not fail a catalog lookup if it is unavailable.
  }
  return data;
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  const category = (params.get("category") || "all").toLowerCase();
  const query = (params.get("q") || "").trim().slice(0, 80).toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
    return json({ error: "Geçersiz item kategorisi." }, 400, "no-store");
  }
  if (query.length < 2) return json({ items: [] }, 200, "no-store");

  try {
    const source = await loadSource(request, new URL(CATEGORIES[category], BASE));
    let list = asList(source);
    if (category === "all") {
      const variantSource = await loadSource(request, new URL("skins_not_grouped.json", BASE));
      const variants = asList(variantSource);
      const variantIds = new Set(variants.map((item) => String(item.id || "")));
      list = list.filter((item) => {
        const id = String(item && item.id || "");
        return !id.startsWith("skin-") || variantIds.has(id);
      }).concat(variants);
    }
    const items = list.map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = String(item.market_hash_name || item.marketHashName || item.name || item.title || "").trim();
      if (!name) return null;
      const id = String(item.id || "");
      return {
        id,
        name,
        marketHashName: String(item.market_hash_name || item.marketHashName || name),
        image: safeImage(item.image || item.icon_url || item.image_url || item.icon),
        category: itemCategory(item, id, LABELS[category] || LABELS.all),
        rarity: String(item.rarity && item.rarity.name || ""),
        _source: item,
      };
    }).filter(Boolean);

    const filtered = items.filter((item) => {
      const haystack = [item.name, item.marketHashName, item.category].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
      if (category === "gloves") return isGlove(item._source);
      if (category === "skins") return !isGlove(item._source);
      return true;
    });
    const unique = new Map();
    filtered.forEach((item) => {
      const key = item.marketHashName.toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    });
    const results = Array.from(unique.values());
    results.sort((a, b) => scoreItem(b, query) - scoreItem(a, query) || a.name.localeCompare(b.name));
    return json({ items: results.slice(0, 48).map(({ _source, ...item }) => item) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Item kataloğu alınamadı." }, 502, "no-store");
  }
}
