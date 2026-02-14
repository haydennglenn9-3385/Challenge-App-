import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, password } = body;

  // 1. Get the current authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const wixId = user.id; // This is your real user identifier

  // 2. Update name or email in your public.users table
  if (name || email) {
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", wixId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }
  }

  // 3. Update password in Supabase Auth (optional)
  if (password) {
    const { error: pwError } = await supabase.auth.updateUser({
      password,
    });

    if (pwError) {
      return NextResponse.json(
        { error: "Failed to update password: " + pwError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
