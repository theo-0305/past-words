import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { languageName, languageCode } = await req.json();
    
    if (!languageName) {
      throw new Error("Language name is required");
    }

    console.log(`Fetching information for language: ${languageName}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use Lovable AI to research the endangered language
    const prompt = `Provide comprehensive information about the ${languageName} language. Include:
    
1. **Overview**: Brief introduction and classification
2. **Current Status**: Number of speakers, endangerment level (critically endangered, endangered, vulnerable, etc.), geographic locations where it's spoken
3. **History**: Historical significance and evolution of the language
4. **Cultural Significance**: Cultural practices, traditions, and heritage associated with this language
5. **Writing System**: Script or writing system used (if any)
6. **Interesting Facts**: 3-5 fascinating facts about the language
7. **Preservation Efforts**: Current initiatives to preserve and revitalize the language
8. **Learning Resources**: Where people can learn more about this language

Format the response in a clear, educational manner suitable for language learners and cultural enthusiasts. Focus on accuracy and cite general knowledge about endangered languages.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert linguist and anthropologist specializing in endangered languages. Provide accurate, educational, and culturally sensitive information about languages and their communities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits depleted. Please contact support." 
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await aiResponse.json();
    const languageInfo = data.choices[0]?.message?.content;

    if (!languageInfo) {
      throw new Error("No content received from AI");
    }

    console.log("Successfully retrieved language information");

    return new Response(
      JSON.stringify({ 
        success: true,
        languageInfo,
        languageName,
        languageCode
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in language-info function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});