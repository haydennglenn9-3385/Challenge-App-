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

  const [userId, setUserId]               = useState("");
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [newEmail, setNewEmail]           = useState("");
  const [avatarEmoji, setAvatarEmoji]     = useState("😊");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      setNewEmail(user.email || "");

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
    if (!name.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    setSuccessMsg("");
    setErrorMsg("");
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // 1. Update users table
    const { error: dbError } = await supabase
      .from("users")
      .update({ name: name.trim(), avatar_emoji: avatarEmoji })
      .eq("id", user.id);

    if (dbError) { setErrorMsg(dbError.message); setSaving(false); return; }

    // 2. Retroactively update their name in the activity feed
    await supabase
      .from("activity_feed")
      .update({ user_name: name.trim() })
      .eq("user_id", user.id);

    // 3. Update emoji in activity feed too
    await supabase
      .from("activity_feed")
      .update({ emoji_avatar: avatarEmoji })
      .eq("user_id", user.id);

    // 4. Handle email change
    if (newEmail.trim() && newEmail.trim() !== email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (emailError) {
        setErrorMsg(emailError.message);
        setSaving(false);
        return;
      }
      setSuccessMsg("Profile updated! Check your new email address for a confirmation link.");
    } else {
      setSuccessMsg("Profile updated!");
    }

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
          font-size: 14px; font-family: var(--font-inter), system-ui, sans-serif;
          outline: none; transition: border-color 0.15s; color: #0e0e0e;
        }
        .edit-input:focus { border-color: #7b2d8b; }
        .edit-input::placeholder { color: #aaa; }
        .edit-input:disabled { background: #f8f8f8; color: #aaa; cursor: not-allowed; }
        .save-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff; font-size: 15px; font-weight: 700;
          font-family: var(--font-inter), system-ui, sans-serif; cursor: pointer; transition: opacity 0.15s;
        }
        .save-btn:disabled { opacity: 0.5; cursor: default; }
        .emoji-option {
          width: 48px; height: 48px; border-radius: 14px; border: 2.5px solid transparent;
          background: #f1f5f9; font-size: 24px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, background 0.15s;
        }
        .emoji-option.selected { border-color: #7b2d8b; background: #f3e8ff; }
        .field-label {
          font-size: 11px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.08em;
          display: block; margin-bottom: 6px;
        }
        .required-star { color: #ff3c5f; margin-left: 2px; }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
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
            <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 26, letterSpacing: 1, color: "#0e0e0e" }}>
              Edit Profile
            </div>
          </div>

          {/* Profile info card */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0e0e0e", marginBottom: 16 }}>Profile Info</p>

            {/* Avatar picker */}
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Avatar</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
                  {avatarEmoji}
                </div>
                <p style={{ fontSize: 12, color: "#888" }}>Tap an emoji below to choose your avatar</p>
              </div>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Display name */}
              <div>
                <label className="field-label">
                  Display Name <span className="required-star">*</span>
                </label>
                <input
                  className="edit-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How you'll appear to others"
                />
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Updating this will also update your name on past activity feed posts.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="field-label">Email</label>
                <input
                  className="edit-input"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
                {newEmail.trim() !== email && (
                  <p style={{ fontSize: 11, color: "#7b2d8b", marginTop: 4, fontWeight: 600 }}>
                    ✉️ A confirmation link will be sent to this address before it changes.
                  </p>
                )}
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

              <button className="save-btn" onClick={handleSaveProfile} disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Change password card */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderRadius: 20, padding: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#0e0e0e", marginBottom: 16 }}>Change Password</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="field-label">New Password</label>
                <input
                  className="edit-input" type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8+ characters" autoComplete="new-password"
                />
              </div>
              <div>
                <label className="field-label">Confirm Password</label>
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