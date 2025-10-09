// Node 18+ has fetch built-in
(async () => {
  const url = "https://fwbpndyrnpfwjqscusdc.supabase.co/functions/v1/language-info";
  const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YnBuZHlybnBmd2pxc2N1c2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjA3NDUsImV4cCI6MjA3NTQ5Njc0NX0.mOUaKV-WFOtUJmz8DLA-wwMVRS9VCn9XfTa07L0KfDg";
  const [,, name = "Ainu", code = "ain"] = process.argv;
  const headers = {
    "Content-Type": "application/json",
    "apikey": apikey,
    "Authorization": `Bearer ${apikey}`,
  };
  const body = { languageName: name, languageCode: code };
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();
    console.log("Name:", name, "Code:", code);
    console.log("Status:", res.status);
    console.log(text);
  } catch (err) {
    console.error("Request error:", err);
  }
})();