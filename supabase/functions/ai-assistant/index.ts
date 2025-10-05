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
      .single();

    // Build context from learned facts
    const learnedContext = prefs?.learned_facts ? 
      Object.entries(prefs.learned_facts).map(([key, value]) => `${key}: ${value}`).join('\n') : '';

    const systemPrompt = `You are LinguaVault AI Assistant, a helpful guide for an endangered language preservation platform. 

Your role:
- Help users preserve and document endangered languages
- Guide them through adding words, content, and managing categories
- Make personalized recommendations based on their usage patterns
- Be encouraging and supportive of language preservation efforts

${learnedContext ? `What you've learned about this user:\n${learnedContext}\n` : ''}
${currentPage ? `User is currently on: ${currentPage}` : ''}
${!prefs?.has_completed_onboarding ? 'This is a new user - provide a warm welcome and explain the platform features.' : ''}

Always be concise, friendly, and helpful. Suggest specific actions they can take.`;

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
