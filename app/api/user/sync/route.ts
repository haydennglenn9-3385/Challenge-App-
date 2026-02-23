import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (service role key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

export async function POST(req: Request) {
  const body = await req.json();
  const { wixId, name, email, password } = body;

  if (!wixId) {
    return NextResponse.json(
      { error: "Missing wixId" },
      { status: 400 }
    );
  }

  // Update name/email
  if (name || email) {
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("wix_id", wixId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  // Update password (optional)
  if (password) {
    const { error } = await supabase.auth.admin.updateUserById(wixId, {
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
