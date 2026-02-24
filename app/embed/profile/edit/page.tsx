"use client";
// app/embed/profile/edit/page.tsx — Edit Profile
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const EMOJI_OPTIONS = [
  "😊", "😄", "😁", "🤩", "🥳", "😎", "🤗", "😜",
  "🤪", "😝", "🤓", "😏", "🥸", "🤠", "👽", "🤖",
  "🥹", "😈", "🦸", "🧜", "🧚", "🧝", "🦄",
];

export default function EditProfilePage() {
  const router = useRouter();

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [savingPw, setSavingPw]     = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [pwSuccess, setPwSuccess]   = useState("");
  const [pwError, setPwError]       = useState("");

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("😊");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      setEmail(user.email || "");

      const { data } = await supabase
        .from("users").select("name, avatar_emoji").eq("id", user.id).single();
      if (data) {
        setName(data.name || "");
        setAvatarEmoji(data.avatar_emoji || "😊");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSuccessMsg("");
    setErrorMsg("");
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("users")
      .update({ name: name.trim(), avatar_emoji: avatarEmoji })
      .eq("id", user.id);

    if (error) setErrorMsg(error.message);
    else setSuccessMsg("Profile updated!");

    setSaving(false);
  }

  async function handleChangePassword() {
    setPwError("");
    setPwSuccess("");

    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords don't match."); return; }

    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwError(error.message);
    else { setPwSuccess("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
    setSavingPw(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 font-semibold">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .edit-input {
          width: 100%; padding: 13px 16px; border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.9);
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.15s; color: #0e0e0e;
        }
        .edit-input:focus { border-color: #7b2d8b; }
        .edit-input::placeholder { color: #aaa; }
        .edit-input:disabled { background: #f8f8f8; color: #aaa; cursor: not-allowed; }
        .save-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff; font-size: 15px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; cursor: pointer; transition: opacity 0.15s;
        }
        .save-btn:disabled { opacity: 0.5; cursor: default; }
        .emoji-option {
          width: 48px; height: 48px; border-radius: 14px; border: 2.5px solid transparent;
          background: #f1f5f9; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, background 0.15s;
        }
        .emoji-option.selected {
          border-color: #7b2d8b; background: #f3e8ff;
        }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        fontFamily: "'DM Sans', sans-serif",
        paddingBottom: 112,
      }}>
        {/* Rainbow strip */}
        <div style={{ height: 5, width: "100%", background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)" }} />

        <div style={{ padding: "20px 20px 0" }}>

          {/* Back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => router.back()}
              style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0e0e0e" }}
            >
              ← Back
            </button>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, letterSpacing: 1, color: "#0e0e0e" }}>
              Edit Profile
            </div>
          </div>

          {/* Profile info card */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0e0e0e", marginBottom: 16 }}>Profile Info</p>

            {/* Avatar preview + picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 10 }}>Avatar</label>
              {/* Preview */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
                  {avatarEmoji}
                </div>
                <p style={{ fontSize: 12, color: "#888" }}>Tap an emoji below to choose your avatar</p>
              </div>
              {/* Picker grid */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`emoji-option${avatarEmoji === emoji ? " selected" : ""}`}
                    onClick={() => setAvatarEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Display Name</label>
                <input
                  className="edit-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How you'll appear to others"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Email</label>
                <input className="edit-input" type="email" value={email} disabled />
                <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Email can't be changed here. Contact support if needed.</p>
              </div>

              {successMsg && (
                <div style={{ background: "#f0fff8", border: "1px solid #b7f5d8", color: "#1b7a4e", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                  ✅ {successMsg}
                </div>
              )}
              {errorMsg && (
                <div style={{ background: "#fff0f0", border: "1px solid #ffc5c5", color: "#c0392b", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Change password card */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 20, padding: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0e0e0e", marginBottom: 16 }}>Change Password</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>New Password</label>
                <input
                  className="edit-input" type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8+ characters" autoComplete="new-password"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>Confirm Password</label>
                <input
                  className="edit-input" type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" autoComplete="new-password"
                />
              </div>

              {pwSuccess && (
                <div style={{ background: "#f0fff8", border: "1px solid #b7f5d8", color: "#1b7a4e", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                  ✅ {pwSuccess}
                </div>
              )}
              {pwError && (
                <div style={{ background: "#fff0f0", border: "1px solid #ffc5c5", color: "#c0392b", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                  ⚠️ {pwError}
                </div>
              )}

              <button className="save-btn" onClick={handleChangePassword} disabled={savingPw}>
                {savingPw ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}