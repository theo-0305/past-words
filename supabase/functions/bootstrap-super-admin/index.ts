import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables are not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client bound to the invoking user for identity checks
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = userData.user;

    // Read target email from body
    const { targetEmail } = await req.json();
    if (!targetEmail || typeof targetEmail !== "string") {
      return new Response(JSON.stringify({ error: "targetEmail is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic bootstrap security: allow only if caller email matches target OR caller already has an admin role
    // Check caller roles
    const { data: callerRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isCallerAdmin = (callerRoles || []).some((r: any) => ["admin", "super_admin", "moderator"].includes(r.role));
    const isSelfBootstrap = caller.email?.toLowerCase() === targetEmail.toLowerCase();

    if (!isSelfBootstrap && !isCallerAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: requires admin or self-bootstrap" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Privileged client with service role to perform upsert regardless of RLS
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user by email using Admin API (auth schema access)
    const { data: targetUserData, error: getUserErr } = await serviceClient.auth.admin.getUserByEmail(targetEmail);
    if (getUserErr || !targetUserData?.user) {
      return new Response(JSON.stringify({ error: "Target user not found by email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUserId = targetUserData.user.id;

    // Upsert super_admin role idempotently
    const { error: upsertErr } = await serviceClient
      .from("user_roles")
      .upsert({
        user_id: targetUserId,
        role: "super_admin",
        assigned_by: caller.id,
        assigned_at: new Date().toISOString(),
      }, { onConflict: "user_id,role" });

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, targetUserId, role: "super_admin" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("bootstrap-super-admin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});