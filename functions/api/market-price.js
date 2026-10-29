function json(body, status = 200, cache = "public, max-age=30, s-maxage=300") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  const name = (params.get("name") || "").trim();
  if (name.length < 2 || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) {
    return json({ error: "Geçerli bir Steam market item adı gerekli." }, 400, "no-store");
  }

  const upstreamUrl = new URL("https://steamcommunity.com/market/priceoverview/");
  upstreamUrl.searchParams.set("appid", "730");
  upstreamUrl.searchParams.set("currency", "1"); // Steam wallet currency: USD
  upstreamUrl.searchParams.set("market_hash_name", name);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": "HaKING-TradeCalc/1.0 (+https://trade.haking.tr)",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!upstream.ok) {
      return json({ error: "Steam Community Market şu an fiyat vermiyor. Biraz sonra tekrar dene veya fiyatı elle gir." }, 502, "no-store");
    }
    const data = await upstream.json();
    if (!data || data.success !== true || (!data.median_price && !data.lowest_price)) {
      return json({ error: "Steam Market bu item için fiyat bulamadı." }, 404, "no-store");
    }
    return json({
      source: "Steam Community Market",
      currency: "USD",
      lowest: typeof data.lowest_price === "string" ? data.lowest_price : "",
      median: typeof data.median_price === "string" ? data.median_price : "",
      volume: typeof data.volume === "string" ? data.volume : "",
      retrievedAt: new Date().toISOString(),
    });
  } catch {
    return json({ error: "Steam Market'e ulaşılamadı. Fiyatı elle girebilirsin." }, 502, "no-store");
  }
}
