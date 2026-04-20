// Edge function: create a teacher and link them to the admin's active school.
// Uses service-role to avoid signing out the calling admin.
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

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, school_id, initials } = body ?? {};
    if (!email || !password || !full_name || !school_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify caller is an admin of the target school
    const { data: isAdmin, error: adminErr } = await admin.rpc(
      "user_is_school_admin",
      { _user_id: user.id, _school_id: school_id },
    );
    if (adminErr || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a school admin" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create the auth user (auto-confirmed; handle_new_user trigger creates profile)
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "teacher" },
      });
    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message ?? "Create user failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const newUserId = created.user.id;

    // Lookup the profile created by the trigger (retry briefly in case of timing)
    let profileId: string | null = null;
    for (let i = 0; i < 5; i++) {
      const { data: prof } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", newUserId)
        .maybeSingle();
      if (prof?.id) {
        profileId = prof.id;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!profileId) {
      // Fallback: create profile manually
      const { data: prof, error: profErr } = await admin
        .from("profiles")
        .insert({ user_id: newUserId, full_name, role: "teacher", initials })
        .select("id")
        .single();
      if (profErr || !prof) {
        return new Response(
          JSON.stringify({
            error: profErr?.message ?? "Profile creation failed",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      profileId = prof.id;
    } else if (initials) {
      await admin.from("profiles").update({ initials }).eq("id", profileId);
    }

    // Link teacher to the admin's school
    const { error: linkErr } = await admin
      .from("profile_schools")
      .insert({ profile_id: profileId, school_id, role: "teacher" });
    if (linkErr) {
      return new Response(
        JSON.stringify({ error: linkErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, profile_id: profileId, user_id: newUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
