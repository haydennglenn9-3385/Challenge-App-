import { supabase } from "@/lib/supabase/client";

// ======================
// Types
// ======================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  emoji_avatar?: string;
  streak: number;
  total_points: number; // global points (all challenges combined)
  global_points?: number; // alias — same as total_points
  created_at: string;
}

export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_value: number;
  duration_unit: "days" | "weeks" | "months";
  progress_style: "check" | "number" | "timer";

  daily_target?: number | null;
  target_unit?: string | null;

  progression_amount?: number | null;
  progression_frequency?: "daily" | "weekly" | "monthly" | "every_x_days" | null;
  progression_interval_days?: number | null;

  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  challenge_id: string;
  date: string;
  reps_completed: number;
  reps_target: number;
  points_earned: number; // local challenge points
  global_points_earned: number; // global points awarded for this check-in
  created_at: string;
}

export interface Message {
  id: string;
  team_id: string;
  author_id: string;
  text: string;
  created_at: string;
  author?: User;
}

// How many global points a check-in earns regardless of challenge
const GLOBAL_POINTS_PER_CHECKIN = 5;

// ======================
// USERS
// ======================

/**
 * Get a user by their Supabase auth UUID.
 */
export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

/**
 * Get the currently logged-in user via Supabase auth,
 * creating a profile row if one doesn't exist yet.
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !data) {
    // First login — create the profile
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        email: authUser.email,
        name:
          authUser.user_metadata?.display_name ||
          authUser.email?.split("@")[0] ||
          "Member",
        streak: 0,
        total_points: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating user profile:", insertError);
      return null;
    }

    return newUser;
  }

  return data;
}

/**
 * Update display name or emoji avatar.
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; emoji_avatar?: string; avatar_url?: string }
): Promise<boolean> {
  const { error } = await supabase.from("users").update(updates).eq("id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
    return false;
  }

  return true;
}

// ======================
// CHALLENGES
// ======================

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select(`*, challenge_members(count)`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching challenges:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    ...c,
    member_count: c.challenge_members?.[0]?.count ?? 0,
  }));
}

/**
 * Get only the challenges a user has joined or created.
 */
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenge_members")
    .select(`
      challenge_id,
      challenges (
        *,
        challenge_members(count)
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user challenges:", error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.challenges)
    .filter(Boolean)
    .map((c: any) => ({
      ...c,
      member_count: c.challenge_members?.[0]?.count ?? 0,
    }));
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select(`*, challenge_members(count)`)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching challenge:", error);
    return null;
  }

  return {
    ...data,
    member_count: data.challenge_members?.[0]?.count ?? 0,
  };
}

    export async function createChallenge(challengeData: {
      name: string;
      duration: number;
      description?: string;
      creatorId: string;
      isPublic?: boolean;
      hasTeams?: boolean;
      isOngoing?: boolean;          
      startDate?: string;
      endDate?: string;
      scoringType?: string;
      localPointsPerCheckin?: number;
      dailyTarget?: number | null;
      targetUnit?: string | null;
      progressionType?: string | null;
      everyXDaysValue?: number | null;
    }): Promise<Challenge | null> {

      const joinCode  = Math.random().toString(36).substring(2, 8).toUpperCase();
      const startDate = challengeData.startDate ?? new Date().toISOString().split("T")[0];

      // ← CHANGED: null for ongoing challenges
      const endDate = challengeData.isOngoing
        ? null
        : challengeData.endDate
          ?? new Date(Date.now() + challengeData.duration * 86400000)
              .toISOString().split("T")[0];

  // Create a team for this challenge
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name: `${challengeData.name} Team` })
    .select()
    .single();

  if (teamError) {
    console.error("Error creating team:", teamError);
    return null;
  }

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      name: challengeData.name,
      join_code: joinCode,
      creator_id: challengeData.creatorId,
      team_id: team.id,
      start_date: startDate,
      end_date: endDate,
      has_teams: challengeData.hasTeams ?? false,
      is_public: challengeData.isPublic ?? true,
      scoring_type: challengeData.scoringType ?? "average_points",
      local_points_per_checkin: challengeData.localPointsPerCheckin ?? 5,
      description: challengeData.description || null,

      // NEW
      daily_target:        challengeData.dailyTarget      ?? null,
      target_unit:         challengeData.targetUnit       ?? null,
      progression_type:    challengeData.progressionType  ?? "daily",   // ← add
      every_x_days_value:  challengeData.everyXDaysValue  ?? null,  
      
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating challenge:", error);
    return null;
  }

  /// Auto-join creator as first member (no team yet — assigned via Manage page)
  await supabase.from("challenge_members").insert({
    challenge_id: data.id,
    user_id:      challengeData.creatorId,
  });

  return { ...data, member_count: 1 };
}

export async function joinChallenge(
  joinCode: string,
  userId:   string
): Promise<boolean> {
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("*")
    .eq("join_code", joinCode.toUpperCase().trim())
    .single();

  if (challengeError || !challenge) {
    console.error("Challenge not found:", challengeError);
    return false;
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("challenge_members")
    .select("id")
    .eq("challenge_id", challenge.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return false;

  // ── Auto-balance teams (if challenge has teams + auto_assign enabled) ────
  let assignedTeamId: string | null = null;

  if (challenge.has_teams && challenge.auto_assign_teams) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("challenge_id", challenge.id);

    if (teams && teams.length > 0) {
      // Count current members per team via challenge_members.team_id
      const teamCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase
            .from("challenge_members")
            .select("id", { count: "exact", head: true })
            .eq("challenge_id", challenge.id)
            .eq("team_id", team.id);
          return { teamId: team.id, count: count ?? 0 };
        })
      );

      teamCounts.sort((a, b) => a.count - b.count);
      assignedTeamId = teamCounts[0].teamId;
    }
  }

  // ── Single insert — team_id lives on challenge_members ───────────────────
  const { error: memberError } = await supabase
    .from("challenge_members")
    .insert({
      challenge_id: challenge.id,
      user_id:      userId,
      team_id:      assignedTeamId,
    });

  if (memberError) {
    console.error("Error joining challenge:", memberError);
    return false;
  }

  return true;
}

export async function leaveChallenge(
  challengeId: string,
  userId:      string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("challenge_members")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error leaving challenge:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error leaving challenge:", error);
    return false;
  }
}

// // ======================
// DAILY LOGS & CHECK-INS
// ======================

// Streak milestone bonuses (global points)
const STREAK_BONUSES: { days: number; points: number }[] = [
  { days: 7,   points: 25  },
  { days: 30,  points: 100 },
  { days: 100, points: 500 },
];

/**
 * Returns the bonus points for hitting a streak milestone, or 0 if none.
 */
function getStreakBonus(streak: number): number {
  return STREAK_BONUSES.find((b) => b.days === streak)?.points ?? 0;
}

/**
 * Records a check-in with correct streak logic and dual points:
 * - Local points:  set per challenge (challenge.local_points_per_checkin)
 * - Global points: fixed GLOBAL_POINTS_PER_CHECKIN + any streak milestone bonus
 *
 * Streak rules:
 * - First check-in ever → streak = 1
 * - Last check-in was yesterday → streak + 1
 * - Last check-in was today → no change (already checked in)
 * - Last check-in was 2+ days ago → reset to 1
 *
 * Streak milestone bonuses (global points only):
 * - 7-day streak  → +25 pts
 * - 30-day streak → +100 pts
 * - 100-day streak → +500 pts
 */
export async function recordCheckIn(
  userId: string,
  challengeId: string,
  repsCompleted: number = 1,
  repsTarget: number = 1
): Promise<{ success: boolean; alreadyCheckedIn?: boolean; streakBonus?: number }> {
  const today = new Date().toISOString().split("T")[0];

  // ── Duplicate guard ──────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("date", today)
    .single();

  if (existing) {
    return { success: false, alreadyCheckedIn: true };
  }

  // ── Challenge config ─────────────────────────────────────────────────────────
  const { data: challenge } = await supabase
    .from("challenges")
    .select("local_points_per_checkin, scoring_type")
    .eq("id", challengeId)
    .single();

  const localPointsPerCheckin = challenge?.local_points_per_checkin ?? 5;
  const completionRatio       = repsTarget > 0 ? repsCompleted / repsTarget : 1;
  const localPointsEarned     = Math.round(completionRatio * localPointsPerCheckin);
  const globalPointsEarned    = Math.round(completionRatio * GLOBAL_POINTS_PER_CHECKIN);

  // ── Write the log ────────────────────────────────────────────────────────────
  const { error: logError } = await supabase.from("daily_logs").insert({
    user_id:              userId,
    challenge_id:         challengeId,
    date:                 today,
    reps_completed:       repsCompleted,
    reps_target:          repsTarget,
    points_earned:        localPointsEarned,
    global_points_earned: globalPointsEarned,
  });

  if (logError) {
    console.error("Error recording check-in:", logError);
    return { success: false };
  }

  // ── Current user state ───────────────────────────────────────────────────────
  const { data: currentUser } = await supabase
    .from("users")
    .select("streak, total_points, global_points, name")
    .eq("id", userId)
    .single();

  // ── Streak calculation ───────────────────────────────────────────────────────
  const { data: recentLogs } = await supabase
    .from("daily_logs")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(2);

  let newStreak = 1;

  if (recentLogs && recentLogs.length > 1 && currentUser) {
    const lastDate  = new Date(recentLogs[1].date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const wasYesterday =
      lastDate.toISOString().split("T")[0] ===
      yesterday.toISOString().split("T")[0];

    newStreak = wasYesterday ? (currentUser.streak || 0) + 1 : 1;
  }

  // ── Streak milestone bonus ───────────────────────────────────────────────────
  const streakBonus      = getStreakBonus(newStreak);
  const totalGlobalDelta = globalPointsEarned + streakBonus;

  const prevTotal  = currentUser?.total_points  || 0;
  const prevGlobal = currentUser?.global_points || 0;

  // ── Update user: global points (both columns) + streak ──────────────────────
  await supabase
    .from("users")
    .update({
      total_points:  prevTotal  + totalGlobalDelta,
      global_points: prevGlobal + totalGlobalDelta, // keeps leaderboard in sync
      streak:        newStreak,
    })
    .eq("id", userId);

  // ── Activity feed ────────────────────────────────────────────────────────────
  const userName = currentUser?.name || "Member";

  // Standard check-in post
  await supabase.from("activity_feed").insert({
    user_id:   userId,
    user_name: userName,
    type:      "streak",
    text:      "checked in!",
    meta: {
      challenge_id: challengeId,
      days:         newStreak,
      points:       globalPointsEarned,
    },
  });

  // Bonus milestone post — only on streak milestone days
  if (streakBonus > 0) {
    await supabase.from("activity_feed").insert({
      user_id:   userId,
      user_name: userName,
      type:      "streak",
      text:      `hit a ${newStreak}-day streak! 🔥`,
      meta: {
        challenge_id:  challengeId,
        days:          newStreak,
        bonus_points:  streakBonus,
        is_milestone:  true,
      },
    });
  }

  return { success: true, streakBonus: streakBonus || undefined };
}
// ======================
// MESSAGES
// ======================

export async function getMessages(teamId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      author:users!messages_author_id_fkey ( id, name, avatar_url, emoji_avatar )
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data || [];
}

export async function sendMessage(
  teamId: string,
  authorId: string,
  text: string
): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .insert({ team_id: teamId, author_id: authorId, text });

  if (error) {
    console.error("Error sending message:", error);
    return false;
  }

  return true;
}

// ======================
// TEAM MEMBERS
// ======================

export async function getTeamMembers(teamId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(`
      user:users ( id, name, avatar_url, emoji_avatar, streak, total_points )
    `)
    .eq("team_id", teamId);

  if (error) {
    console.error("Error fetching team members:", error);
    return [];
  }

  return (data || []).map((item: any) => item.user);
}

// ======================
// BACKWARD COMPATIBILITY
// ======================

export function ensureSeedData() {
  // No-op — keeping for import compatibility
}

export type { Challenge as ChallengeMember };
export type { Message as ChallengeMessage };
