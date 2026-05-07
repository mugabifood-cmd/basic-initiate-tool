// Edge function: delete a teacher (auth user, profile, school link, assignments)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { teacher_profile_id, school_id } = await req.json() ?? {};
    if (!teacher_profile_id || !school_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await admin.rpc("user_is_school_admin", {
      _user_id: user.id, _school_id: school_id,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get teacher profile (and auth user id)
    const { data: prof } = await admin
      .from("profiles")
      .select("id, user_id")
      .eq("id", teacher_profile_id)
      .maybeSingle();

    if (!prof) {
      return new Response(JSON.stringify({ error: "Teacher not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete teacher data (assignments, school link, submissions, profile, auth user)
    await admin.from("teacher_assignments").delete().eq("teacher_id", teacher_profile_id);
    await admin.from("subject_submissions").delete().eq("teacher_id", teacher_profile_id);
    await admin.from("profile_schools").delete().eq("profile_id", teacher_profile_id);
    await admin.from("signatures").delete().eq("profile_id", teacher_profile_id);
    await admin.from("profiles").delete().eq("id", teacher_profile_id);
    if (prof.user_id) {
      await admin.auth.admin.deleteUser(prof.user_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
