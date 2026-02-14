import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();
  const { wixId, name, password } = body;

  if (!wixId) {
    return NextResponse.json({ error: "Missing wixId" }, { status: 400 });
  }

  // 1. Update name in your public.users table
  if (name) {
    const { error: nameError } = await supabase
      .from("users")
      .update({ name })
      .eq("wix_id", wixId);

    if (nameError) {
      return NextResponse.json(
        { error: "Failed to update name: " + nameError.message },
        { status: 500 }
      );
    }
  }

  // 2. Update password in Supabase Auth (optional)
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
