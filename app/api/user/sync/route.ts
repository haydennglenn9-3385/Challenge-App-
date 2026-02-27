import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const body = await req.json();
  const { wixId, name, email, password } = body;

  if (!wixId) {
    return NextResponse.json({ error: "Missing wixId" }, { status: 400 });
  }

  // 1. Find the user row by wix_id
  const { data: userRow, error: userFetchError } = await supabase
    .from("users")
    .select("id, auth_user_id")
    .eq("wix_id", wixId)
    .single();

  if (userFetchError || !userRow) {
    return NextResponse.json(
      { error: "User not found in users table" },
      { status: 404 }
    );
  }

  const authId = userRow.auth_user_id;

  // 2. Update name/email in your users table
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
        { error: updateError.message },
        { status: 500 }
      );
    }
  }

  // 3. Update password in Supabase Auth (optional)
  if (password && authId) {
    const { error: pwError } = await supabase.auth.admin.updateUserById(
      authId,
      { password }
    );

    if (pwError) {
      return NextResponse.json(
        { error: pwError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
