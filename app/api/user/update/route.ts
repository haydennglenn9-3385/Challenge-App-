import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { wixId, name, email, password } = body;

  if (!wixId) {
    return NextResponse.json(
      { error: "Missing wixId" },
      { status: 400 }
    );
  }

  // Update name/email in your public.users table
  if (name || email) {
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("wix_id", wixId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update profile: " + updateError.message },
        { status: 500 }
      );
    }
  }

  // Update password in Supabase Auth (optional)
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
