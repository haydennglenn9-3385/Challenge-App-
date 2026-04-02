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
      everyXDaysValue?:  number | null;
      scoringDirection?: "asc" | "desc" | null;
    }): Promise<Challenge | null> {

      const joinCode  = Math.random().toString(36).substring(2, 8).toUpperCase();
      const startDate = challengeData.startDate ?? new Date().toISOString().split("T")[0];

      // ← CHANGED: null for ongoing challenges
      const endDate = challengeData.isOngoing
        ? null
        : challengeData.endDate
          ?? new Date(Date.now() + challengeData.duration * 86400000)
              .toISOString().split("T")[0];

  // Only create a default team for team-based challenges
  let defaultTeamId: string | null = null;

  if (challengeData.hasTeams) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ name: `${challengeData.name} Team` })
      .select()
      .single();

    if (teamError) {
      console.error("Error creating team:", teamError);
    } else {
      defaultTeamId = team.id;
    }
  }

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      name: challengeData.name,
      join_code: joinCode,
      creator_id: challengeData.creatorId,
      team_id: defaultTeamId,
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
      every_x_days_value:    challengeData.everyXDaysValue  ?? null,
      scoring_direction:     challengeData.scoringDirection ?? "desc",
      
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


export type { Challenge as ChallengeMember };
export type { Message as ChallengeMessage };
