import { jwtDecode } from "jwt-decode";
import { supabase } from "@/lib/supabase/client";

// Decodes a token and fetches the matching user from Supabase
export async function getUserFromToken(token: string) {
  if (!token) return null;

  let decoded: any;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    return null;
  }

  // Adjust this depending on what your token actually contains now
  const userId = decoded?.id || decoded?.userId || decoded?.sub;

  if (!userId) return null;

  // Fetch the user from Supabase
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;

  return data;
}
