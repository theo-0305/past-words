import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, currentPage } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get conversation history
    const { data: history } = await supabaseClient
      .from('user_memory')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get user preferences and learned facts
    const { data: prefs } = await supabaseClient
      .from('user_preferences')
      .select('learned_facts, usage_patterns, has_completed_onboarding')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch user's actual data to provide context
    const { count: wordsCount } = await supabaseClient
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: categories } = await supabaseClient
      .from('categories')
      .select('name')
      .eq('user_id', user.id)
      .limit(10);

    const { data: recentWords } = await supabaseClient
      .from('words')
      .select('native_word, translation, categories(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { count: communityCount } = await supabaseClient
      .from('community_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Build context from learned facts
    const learnedContext = prefs?.learned_facts ? 
      Object.entries(prefs.learned_facts).map(([key, value]) => `${key}: ${value}`).join('\n') : '';

    const userDataContext = `
USER'S CURRENT DATA:
- Total words saved: ${wordsCount || 0}
- Categories created: ${categories?.length || 0}${categories?.length ? ` (${categories.map(c => c.name).join(', ')})` : ''}
- Recent words: ${recentWords?.length ? recentWords.map(w => `"${w.native_word}" (${w.translation})`).join(', ') : 'None yet'}
- Community content shared: ${communityCount || 0}
`;

    const appKnowledge = `
LINGUAVAULT APP STRUCTURE & FEATURES:

📍 PAGES & NAVIGATION:
1. /dashboard - Main hub showing:
   - Welcome message with user stats
   - Quick action buttons (Word List, Add Content, Categories, Practice)
   - Recently added words table
   - Total word count

2. /words - Complete word list with:
   - Search functionality
   - Sortable columns (word, translation, category, date)
   - Edit/Delete actions
   - Click any word to view details

3. /add-word - Quick word entry form:
   - Native word input
   - Translation input
   - Category selection (dropdown)
   - Optional: notes, audio URL, image URL
   - Language selection

4. /add-content - Rich content upload:
   - Title, description
   - Content type: audio, video, picture, article, cultural_norm, word
   - File upload with automatic thumbnail generation for videos
   - Public/private toggle
   - Language selection

5. /word/:id - Detailed word view:
   - Full word information
   - Audio playback (if audio URL exists)
   - Image display (if image URL exists)
   - Edit button

6. /categories - Category management:
   - Create new categories with color picker
   - View all categories with word counts
   - Edit/Delete categories
   - Color-coded organization

7. /practice - Learning tools:
   - Practice mode for vocabulary
   - Study your saved words

8. /community - Shared content:
   - Browse public content from all users
   - View community contributions
   - Videos with thumbnail previews
   - Hover previews on video content
   - Click to view full details and play media

🎯 KEY FEATURES:
- User authentication (sign up/login required)
- Personal vocabulary database
- Category organization with colors
- Audio/visual content support
- Community sharing (public/private toggle)
- Video thumbnail generation
- Search and filtering
- Real-time updates

💡 USER WORKFLOWS:
- New user: Sign up → Dashboard → Add first word → Create categories → Upload content
- Returning user: Login → Dashboard → Quick actions based on needs
- Content creator: Add Content → Upload media → Set to public → Share in community
- Learner: Practice → Review words → Study by category

🔧 TECHNICAL DETAILS:
- Built with React, TypeScript, Tailwind CSS
- Backend: Supabase (auth, database, storage)
- File storage for audio, video, images
- Row-level security for data privacy
- Real-time synchronization
`;

    const systemPrompt = `You are LinguaVault AI Assistant, an expert guide for this endangered language preservation platform.

${appKnowledge}

${userDataContext}

${learnedContext ? `WHAT YOU'VE LEARNED ABOUT THIS USER:\n${learnedContext}\n` : ''}

📍 CURRENT LOCATION: ${currentPage || 'Unknown'}

${!prefs?.has_completed_onboarding ? `
🎯 ONBOARDING MODE: This is a new user! 
- Give them a warm welcome
- Explain they can preserve endangered languages here
- Mention the key features: add words, upload content, create categories, practice, share with community
- Offer to guide them step-by-step
- Be encouraging and supportive
` : ''}

YOUR CAPABILITIES:
- You know EXACTLY what features exist and where they are
- You can see their actual data (words, categories, content)
- You provide SPECIFIC navigation instructions (e.g., "Click the 'Add Content' button in the navigation")
- You make personalized recommendations based on their usage
- You answer questions about how to use ANY feature in the app

RESPONSE STYLE:
- Be concise and actionable
- Provide exact page names and navigation steps
- Reference their actual data when relevant
- Suggest next steps based on what they've done
- Be encouraging about language preservation
- Use emojis sparingly but effectively

Remember: You have complete knowledge of this app and access to the user's data. Always be specific and helpful!`;


    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://linguavault.com',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Save messages to memory
    await supabaseClient.from('user_memory').insert([
      {
        user_id: user.id,
        conversation_id: conversationId,
        role: 'user',
        content: message,
        metadata: { page: currentPage }
      },
      {
        user_id: user.id,
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      }
    ]);

    // Update usage patterns
    const newPatterns = {
      ...(prefs?.usage_patterns || {}),
      last_page: currentPage,
      total_interactions: ((prefs?.usage_patterns as any)?.total_interactions || 0) + 1,
      [`page_${currentPage}_count`]: (((prefs?.usage_patterns as any)?.[`page_${currentPage}_count`] || 0) + 1)
    };

    await supabaseClient
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        usage_patterns: newPatterns,
        last_interaction: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({ 
        message: assistantMessage,
        conversationId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
