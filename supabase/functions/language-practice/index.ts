// Using built-in Deno.serve; no import needed
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

async function searchWiktionarySwadesh(languageName: string): Promise<{ title?: string; pageid?: number } | null> {
  const name = languageName.trim();
  const patterns = [
    `Appendix:Swadesh list (${name})`,
    `Appendix:Swadesh list (${name} language)`,
    `Appendix:${name} Swadesh list`,
    `${name} Swadesh list`,
    `Swadesh list (${name})`,
  ];
  for (const q of patterns) {
    try {
      const url = `https://en.wiktionary.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const hit = data?.query?.search?.[0];
      if (hit?.title && /swadesh list/i.test(hit.title)) {
        return { title: hit.title, pageid: hit.pageid };
      }
    } catch (err) {
      console.debug("[language-practice] search pattern failed", q, err);
    }
  }
  // Final fallback: opensearch
  try {
    const url = `https://en.wiktionary.org/w/api.php?action=opensearch&search=${encodeURIComponent(`${name} Swadesh list`)}&limit=5&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const titles: string[] = data?.[1] || [];
      const title = titles.find(t => /swadesh list/i.test(t));
      if (title) return { title, pageid: undefined };
    }
  } catch (err) {
    console.debug("[language-practice] opensearch failed", err);
  }
  return null;
}

async function parseWiktionaryTable(title: string, languageName: string): Promise<{ native: string; translation: string }[]> {
  const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const html: string = data?.parse?.text?.["*"] || "";
  if (!html) return [];

  const tableMatches = [...html.matchAll(/<table[^>]*class="[^"]*wikitable[^"]*"[\s\S]*?<\/table>/gi)];
  if (!tableMatches.length) return [];

  const EN_KEYS = ["english", "gloss", "meaning", "translation", "concept"];
  const EXCLUDE_KEYS = ["no", "number", "proto", "ipa", "pos", "notes", "source", "root"];
  const langKey = languageName.toLowerCase();

  let best: { native: string; translation: string }[] = [];

  for (const tbl of tableMatches) {
    const table = tbl[0];
    const thMatches = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => stripTags(m[1]).toLowerCase());
    let enIdx = thMatches.findIndex(h => EN_KEYS.some(k => h.includes(k)));
    let langIdx = thMatches.findIndex(h => h.includes(langKey));

    if (enIdx === -1) {
      enIdx = thMatches.findIndex(h => h.includes("meaning") || h.includes("gloss"));
      if (enIdx === -1) enIdx = 0;
    }
    if (langIdx === -1) {
      langIdx = thMatches.findIndex((h, i) => i !== enIdx && !EN_KEYS.some(k => h.includes(k)) && !EXCLUDE_KEYS.some(k => h.includes(k)));
      if (langIdx === -1) langIdx = enIdx !== 0 ? 0 : 1;
    }
    if (langIdx === enIdx) {
      langIdx = enIdx !== 0 ? 0 : 1;
    }

    console.log("[language-practice] headers:", thMatches, "chosen enIdx:", enIdx, "langIdx:", langIdx);

    const rows: { native: string; translation: string }[] = [];
    const trMatches = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
    for (const tr of trMatches) {
      const cells = [...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => stripTags(m[1]));
      if (!cells.length) continue;
      if (enIdx >= cells.length || langIdx >= cells.length) continue;
      const en = cells[enIdx]?.trim();
      const native = cells[langIdx]?.trim();
      if (!en || !native) continue;
      const enNorm = en.toLowerCase();
      const nativeNorm = native.toLowerCase();
      const isEnglishHeader = EN_KEYS.some(k => enNorm.includes(k));
      const isLangHeader = nativeNorm.includes(langKey);
      if (isEnglishHeader || isLangHeader) continue;
      if (enNorm === nativeNorm) continue;
      if (native.length > 0 && en.length > 0) {
        rows.push({ native, translation: en });
      }
      if (rows.length >= 80) break;
    }

    // Swap fallback if identical ratio too high
    const identicalCount = rows.filter(r => r.native.trim().toLowerCase() === r.translation.trim().toLowerCase()).length;
    if (rows.length > 0 && identicalCount / rows.length > 0.6) {
      const swapped: { native: string; translation: string }[] = [];
      for (const tr of trMatches) {
        const cells = [...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => stripTags(m[1]));
        if (!cells.length) continue;
        if (enIdx >= cells.length || langIdx >= cells.length) continue;
        const maybeNative = cells[enIdx]?.trim();
        const maybeEn = cells[langIdx]?.trim();
        if (!maybeNative || !maybeEn) continue;
        const enNorm2 = maybeEn.toLowerCase();
        const nativeNorm2 = maybeNative.toLowerCase();
        const isEnglishHeader2 = EN_KEYS.some(k => enNorm2.includes(k));
        const isLangHeader2 = nativeNorm2.includes(langKey);
        if (isEnglishHeader2 || isLangHeader2) continue;
        if (enNorm2 === nativeNorm2) continue;
        swapped.push({ native: maybeNative, translation: maybeEn });
        if (swapped.length >= 80) break;
      }
      if (swapped.length > 0) {
        console.log("[language-practice] swap fallback produced:", swapped.length);
        rows.splice(0, rows.length, ...swapped);
      }
    }

    const unique: { [k: string]: boolean } = {};
    const vocab = rows.filter(r => {
      const key = `${r.native.trim().toLowerCase()}|${r.translation.trim().toLowerCase()}`;
      if (unique[key]) return false;
      unique[key] = true;
      const badCharCount = (r.native.match(/[\[\]{}0-9]/g) || []).length;
      return badCharCount < 2;
    }).slice(0, 50);

    console.log("[language-practice] table vocab:", vocab.length);

    if (vocab.length >= 10) {
      return vocab.slice(0, 30);
    }
    if (vocab.length > best.length) {
      best = vocab;
    }
  }

  return best.slice(0, 30);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { languageName, languageCode } = await req.json();
    if (!languageName && !languageCode) {
      return new Response(JSON.stringify({ error: "Missing languageName or languageCode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = (languageName || "").trim();
    const search = await searchWiktionarySwadesh(name);

    if (!search?.title) {
      return new Response(JSON.stringify({
        practice: { vocabulary: [] },
        source: { title: null, url: null },
        message: `No Wiktionary Swadesh list found for ${name}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vocab = await parseWiktionaryTable(search.title, name);

    const payload = {
      practice: { vocabulary: vocab },
      source: {
        title: search.title,
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(search.title)}`,
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("language-practice error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch practice content" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});