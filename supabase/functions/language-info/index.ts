// using Deno.serve (no import needed)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    // Return 200 OK with CORS headers for preflight
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { languageName, languageCode } = await req.json();
    
    if (!languageName) {
      throw new Error("Language name is required");
    }

    console.log(`Fetching information for language: ${languageName}`);

    // Fetch real content from Wikipedia Summary API
    async function fetchWiki(title: string) {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return null;
      const json = await res.json();
      return json;
    }

    const candidates = [languageName, `${languageName} language`];
    let wiki: any = null;
    for (const t of candidates) {
      wiki = await fetchWiki(t);
      if (wiki && wiki.extract) break;
    }

    if (!wiki || !wiki.extract) {
      throw new Error("No Wikipedia summary found for this language");
    }

    const displayTitle = wiki.titles?.display || languageName;
    const description = wiki.description || "";
    const extract = wiki.extract || "";
    const pageUrl = wiki.content_urls?.desktop?.page || wiki.content_urls?.mobile?.page;

    const titleMd = `# ${displayTitle}`;
    const overviewMd = description ? `\n\n**Overview**: ${description}\n` : "";
    const codeMd = languageCode ? `\n\nLanguage Code: \`${languageCode}\`` : "";
    const sourceMd = pageUrl ? `\n\nSources:\n- [Wikipedia](${pageUrl})` : "";

    const languageInfo = `${titleMd}${overviewMd}\n${extract}${codeMd}${sourceMd}`;

    console.log("Successfully retrieved language information from Wikipedia");

    return new Response(
      JSON.stringify({ success: true, languageInfo, languageName, languageCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in language-info function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});