// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  // Verify the requester is an admin
  const cookieStore = await cookies();
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create the user
  const body = await req.json();
  const { name, email, password } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  // Create auth user
  const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true, // skip confirmation email
    user_metadata: { display_name: name.trim() },
  });

  if (createError || !newAuthUser.user) {
    return NextResponse.json({ error: createError?.message || "Failed to create user." }, { status: 500 });
  }

  const uid = newAuthUser.user.id;

  // Insert into users table
  const { data: newProfile, error: profileError } = await supabaseAdmin
    .from("users")
    .insert({
      id:           uid,
      email:        email.trim(),
      name:         name.trim(),
      total_points: 0,
      streak:       0,
    })
    .select()
    .single();

  if (profileError) {
    // Clean up the auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ user: newProfile });
}