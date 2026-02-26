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
const GLOBAL_POINTS_PER_CHECKIN = 10;

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
      scoringType?: string;
      localPointsPerCheckin?: number;
      dailyTarget?: number | null;
      targetUnit?: string | null;
      progressionType?: string | null;
      everyXDaysValue?: number | null;
    }): Promise<Challenge | null> {
      
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + challengeData.duration * 86400000)
    .toISOString()
    .split("T")[0];

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
      is_public: challengeData.isPublic ?? true,
      scoring_type: challengeData.scoringType ?? "average_points",
      local_points_per_checkin: challengeData.localPointsPerCheckin ?? 10,
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

  // Auto-join creator as first member + team member
  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: challengeData.creatorId,
  });

  await supabase.from("challenge_members").insert({
    challenge_id: data.id,
    user_id: challengeData.creatorId,
  });

  return { ...data, member_count: 1 };
}

export async function joinChallenge(
  joinCode: string,
  userId: string
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
    .single();

  if (existing) return false;

  // For the NYF2026 challenge, auto-balance teams
  let assignedTeamId = challenge.team_id;

  if (joinCode.toUpperCase() === "NYF2026") {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in("name", ["Team Hayden", "Team Aria", "Team Tiffany"]);

    if (teams && teams.length === 3) {
      const teamCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase
            .from("team_members")
            .select("id", { count: "exact", head: true })
            .eq("team_id", team.id);

          return { teamId: team.id, count: count || 0 };
        })
      );

      teamCounts.sort((a, b) => a.count - b.count);
      assignedTeamId = teamCounts[0].teamId;
    }
  }

  const { error: teamError } = await supabase
    .from("team_members")
    .insert({ team_id: assignedTeamId, user_id: userId });

  if (teamError) {
    console.error("Error joining team:", teamError);
    return false;
  }

  const { error: memberError } = await supabase
    .from("challenge_members")
    .insert({ challenge_id: challenge.id, user_id: userId });

  if (memberError) {
    console.error("Error joining challenge:", memberError);
    return false;
  }

  return true;
}

export async function leaveChallenge(
  challengeId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error: memberError } = await supabase
      .from("challenge_members")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", userId);

    if (memberError) {
      console.error("Error leaving challenge:", memberError);
      return false;
    }

    const { data: challenge } = await supabase
      .from("challenges")
      .select("team_id")
      .eq("id", challengeId)
      .single();

    if (challenge) {
      await supabase
        .from("team_members")
        .delete()
        .eq("team_id", challenge.team_id)
        .eq("user_id", userId);
    }

    return true;
  } catch (error) {
    console.error("Error leaving challenge:", error);
    return false;
  }
}

// ======================
// DAILY LOGS & CHECK-INS
// ======================

/**
 * Records a check-in with correct streak logic and dual points:
 * - Local points: set per challenge (challenge.local_points_per_checkin)
 * - Global points: fixed GLOBAL_POINTS_PER_CHECKIN constant
 *
 * Streak rules:
 * - First check-in ever → streak = 1
 * - Last check-in was yesterday → streak + 1
 * - Last check-in was today → no change (already checked in)
 * - Last check-in was 2+ days ago → reset to 1
 */
export async function recordCheckIn(
  userId: string,
  challengeId: string,
  repsCompleted: number = 1,
  repsTarget: number = 1
): Promise<{ success: boolean; alreadyCheckedIn?: boolean }> {
  const today = new Date().toISOString().split("T")[0];

  // Check for duplicate check-in today
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

  // Fetch challenge to get local points value
  const { data: challenge } = await supabase
    .from("challenges")
    .select("local_points_per_checkin, scoring_type")
    .eq("id", challengeId)
    .single();

  const localPointsPerCheckin = challenge?.local_points_per_checkin ?? 10;

  const completionRatio = repsTarget > 0 ? repsCompleted / repsTarget : 1;
  const localPointsEarned = Math.round(completionRatio * localPointsPerCheckin);
  const globalPointsEarned = Math.round(
    completionRatio * GLOBAL_POINTS_PER_CHECKIN
  );

  // Write the log
  const { error: logError } = await supabase.from("daily_logs").insert({
    user_id: userId,
    challenge_id: challengeId,
    date: today,
    reps_completed: repsCompleted,
    reps_target: repsTarget,
    points_earned: localPointsEarned,
    global_points_earned: globalPointsEarned,
  });

  if (logError) {
    console.error("Error recording check-in:", logError);
    return { success: false };
  }

  // Calculate new streak
  const { data: recentLogs } = await supabase
    .from("daily_logs")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(2);

  const { data: currentUser } = await supabase
    .from("users")
    .select("streak, total_points")
    .eq("id", userId)
    .single();

  let newStreak = 1;

  if (recentLogs && recentLogs.length > 1 && currentUser) {
    const lastDate = new Date(recentLogs[1].date); // second most recent (before today)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const wasYesterday =
      lastDate.toISOString().split("T")[0] ===
      yesterday.toISOString().split("T")[0];

    newStreak = wasYesterday ? (currentUser.streak || 0) + 1 : 1;
  }

  // Update user: global points + streak
  await supabase
    .from("users")
    .update({
      total_points: (currentUser?.total_points || 0) + globalPointsEarned,
      streak: newStreak,
    })
    .eq("id", userId);

  // Post to activity feed
  await supabase.from("activity_feed").insert({
    user_name:
      (
        await supabase
          .from("users")
          .select("name")
          .eq("id", userId)
          .single()
      ).data?.name || "Member",
    type: "streak",
    text: `checked in!`,
    meta: { challenge_id: challengeId, days: newStreak, points: globalPointsEarned },
  });

  return { success: true };
}

export async function getUserStreak(
  userId: string,
  challengeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("date")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .order("date", { ascending: false });

  if (error || !data) return 0;

  return data.length;
}

/**
 * Get the local (challenge-specific) points for a user within one challenge.
 */
export async function getChallengePoints(
  userId: string,
  challengeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("points_earned")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId);

  if (error || !data) return 0;

  return data.reduce(
    (sum: number, log: any) => sum + (log.points_earned || 0),
    0
  );
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
