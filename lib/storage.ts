import { supabase } from './supabase';

// Types
export interface User {
  id: string;
  wix_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  streak: number;
  total_points: number;
  created_at: string;
}

export interface Challenge {
  id: string;
  name: string;
  join_code: string;
  creator_id: string;
  team_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  challenge_id: string;
  date: string;
  reps_completed: number;
  reps_target: number;
  points_earned: number;
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

// ============ USERS ============

export async function getUser(wixId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wix_id', wixId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

export async function createOrUpdateUser(userData: {
  wixId: string;
  email: string;
  name: string;
}): Promise<User | null> {
  const existing = await getUser(userData.wixId);

  if (existing) {
    const { data, error } = await supabase
      .from('users')
      .update({
        email: userData.email,
        name: userData.name,
      })
      .eq('wix_id', userData.wixId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data;
  } else {
    const { data, error } = await supabase
      .from('users')
      .insert({
        wix_id: userData.wixId,
        email: userData.email,
        name: userData.name,
        streak: 0,
        total_points: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  }
}

// ============ CHALLENGES ============

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }

  return data || [];
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }

  return data;
}

export async function createChallenge(challengeData: {
  name: string;
  duration: number;
  description?: string;
  creatorId: string;
}): Promise<Challenge | null> {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + challengeData.duration * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: `${challengeData.name} Team`,
    })
    .select()
    .single();

  if (teamError) {
    console.error('Error creating team:', teamError);
    return null;
  }

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      name: challengeData.name,
      join_code: joinCode,
      creator_id: challengeData.creatorId,
      team_id: team.id,
      start_date: startDate,
      end_date: endDate,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating challenge:', error);
    return null;
  }

  await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: challengeData.creatorId,
  });

  await supabase.from('challenge_members').insert({
    challenge_id: data.id,
    user_id: challengeData.creatorId,
  });

  return data;
}

export async function joinChallenge(joinCode: string, userId: string): Promise<boolean> {
  // Find challenge by join code
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('join_code', joinCode)
    .single();

  if (challengeError || !challenge) {
    console.error('Challenge not found:', challengeError);
    return false;
  }

  // Check if user is already in this challenge
  const { data: existing } = await supabase
    .from('challenge_members')
    .select('id')
    .eq('challenge_id', challenge.id)
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log('User already in challenge');
    return false;
  }

  // For New Year's challenge (NYF2026), auto-balance across the 3 teams
  let assignedTeamId = challenge.team_id; // Default to challenge's team

  if (joinCode === 'NYF2026') {
    // Get the 3 New Year's teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('name', ['Team Hayden', 'Team Aria', 'Team Tiffany']);

    if (teams && teams.length === 3) {
      // Count members in each team
      const teamCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', team.id);
          return { teamId: team.id, count: count || 0 };
        })
      );

      // Find team with least members
      teamCounts.sort((a, b) => a.count - b.count);
      assignedTeamId = teamCounts[0].teamId;
    }
  }

  // Add user to assigned team
  const { error: teamError } = await supabase
    .from('team_members')
    .insert({
      team_id: assignedTeamId,
      user_id: userId,
    });

  if (teamError) {
    console.error('Error joining team:', teamError);
    return false;
  }

  // Add user to challenge
  const { error: memberError } = await supabase
    .from('challenge_members')
    .insert({
      challenge_id: challenge.id,
      user_id: userId,
    });

  if (memberError) {
    console.error('Error joining challenge:', memberError);
    return false;
  }

  return true;
}

// ============ CHECK-INS / DAILY LOGS ============

export async function recordCheckIn(
  userId: string,
  challengeId: string,
  repsCompleted: number = 1,
  repsTarget: number = 1
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const pointsEarned = Math.round((repsCompleted / repsTarget) * 10);

  const { error } = await supabase
    .from('daily_logs')
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      date: today,
      reps_completed: repsCompleted,
      reps_target: repsTarget,
      points_earned: pointsEarned,
    });

  if (error) {
    console.error('Error recording check-in:', error);
    return false;
  }

  const { data: user } = await supabase
    .from('users')
    .select('total_points, streak')
    .eq('id', userId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        total_points: (user.total_points || 0) + pointsEarned,
        streak: (user.streak || 0) + 1,
      })
      .eq('id', userId);
  }

  return true;
}

export async function getUserStreak(userId: string, challengeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .order('date', { ascending: false });

  if (error || !data) {
    return 0;
  }

  return data.length;
}

// ============ MESSAGES ============

export async function getMessages(teamId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      author:users!messages_author_id_fkey (
        id,
        name,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
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
    .from('messages')
    .insert({
      team_id: teamId,
      author_id: authorId,
      text: text,
    });

  if (error) {
    console.error('Error sending message:', error);
    return false;
  }

  return true;
}

// ============ TEAM MEMBERS ============

export async function getTeamMembers(teamId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      user:users (
        id,
        name,
        avatar_url,
        streak,
        total_points
      )
    `)
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team members:', error);
    return [];
  }

  return (data || []).map((item: any) => item.user);
}

// ============ BACKWARD COMPATIBILITY ============

export function ensureSeedData() {
  // No-op
}

export type { Challenge as ChallengeMember };
export type { Message as ChallengeMessage };