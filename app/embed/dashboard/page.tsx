"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase";

function DashboardContent() {
  const router = useRouter();
  const { user: wixUser, getUserParams } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [joinedChallenges, setJoinedChallenges] = useState<any[]>([]);
  const [createdChallenges, setCreatedChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadData() {
      if (!wixUser) {
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('wix_id', wixUser.userId)
        .single();

      if (userData) {
        setProfile(userData);

        // Get joined challenges
        const { data: joinedData } = await supabase
          .from('challenge_members')
          .select(`
            challenge_id,
            challenges (
              id,
              name,
              join_code,
              creator_id,
              start_date,
              end_date,
              description
            )
          `)
          .eq('user_id', userData.id);

        if (joinedData) {
          const joined = joinedData.map((c: any) => c.challenges);
          setJoinedChallenges(joined);
          
          // Separate out created challenges
          const created = joined.filter((c: any) => c.creator_id === userData.id);
          setCreatedChallenges(created);
        }

        // Get user's team members
        const { data: userTeamData } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userData.id)
          .limit(1)
          .single();

        if (userTeamData) {
          // Get all members of this team
          const { data: membersData } = await supabase
            .from('team_members')
            .select(`
              user_id,
              users (
                id,
                name,
                streak,
                total_points
              )
            `)
            .eq('team_id', userTeamData.team_id)
            .limit(5);

          if (membersData) {
            setTeamMembers(membersData.map((m: any) => m.users));
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [wixUser]);

  if (!wixUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card rounded-3xl p-12 text-center max-w-md">
          <h2 className="text-2xl font-display mb-4">Dashboard</h2>
          <p className="text-slate-600 mb-6">Log in to see your dashboard</p>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="rainbow-cta px-6 py-3 rounded-full font-semibold">
              Log in / Sign up
            </button>
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-500">Loading your dashboard…</p>
      </div>
    );
  }

  const streakDays = profile?.streak || 0;
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Home
        </button>
        <div className="flex gap-3">
          <button onClick={() => navigate("/embed/challenges")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            All Challenges
          </button>
          <button onClick={() => navigate("/embed/leaderboard")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            Leaderboard
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">DASHBOARD</p>
        <h2 className="text-4xl font-display">Welcome back, {profile?.name || 'friend'}!</h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
          <div className="space-y-2 text-sm mb-4">
            <p className="text-slate-700"><strong>Name:</strong> {profile?.name}</p>
            <p className="text-slate-700"><strong>Email:</strong> {profile?.email}</p>
          </div>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm w-full">
              Manage Account →
            </button>
          </a>
        </div>

        {/* Streak Card */}
        <div className="neon-card rounded-3xl p-6 flex flex-col items-center">
          <div className="text-5xl mb-2">🔥</div>
          <h3 className="text-xl font-semibold mb-2">{streakDays}-Day Streak</h3>
          <div className="flex justify-between w-full mt-3 max-w-xs">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-slate-600 text-sm">{d}</span>
                <div className={`w-3 h-3 mt-1 rounded-full ${
                  i < streakDays ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-slate-300"
                }`}></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-slate-600 text-sm">You're on fire! Keep it going 🔥</p>
        </div>

        {/* Points Card */}
        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-4">Points & Rewards</h3>
          <p className="text-3xl font-bold mb-4">⭐ {profile?.total_points || 0}</p>
          <p className="text-sm text-slate-600 mb-4">Total Points Earned</p>
          <button 
            onClick={() => navigate("/embed/leaderboard")}
            className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm w-full">
            View Leaderboard
          </button>
        </div>

        {/* Team Members Card */}
        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-4">Your Teammates</h3>
          {teamMembers.length === 0 ? (
            <>
              <p className="text-slate-600 mb-4 text-sm">Join a challenge to see your teammates!</p>
              <button 
                onClick={() => navigate("/embed/join")}
                className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm w-full">
                Join with Code
              </button>
            </>
          ) : (
            <div className="space-y-2">
              {teamMembers.slice(0, 4).map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white">
                  <div>
                    <p className="font-semibold text-sm">{member.name}</p>
                    <p className="text-xs text-slate-500">🔥 {member.streak || 0} streak</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">⭐ {member.total_points || 0}</p>
                </div>
              ))}
              {teamMembers.length > 4 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  +{teamMembers.length - 4} more teammates
                </p>
              )}
            </div>
          )}
        </div>

        {/* Joined Challenges */}
        <div className="neon-card rounded-3xl p-6 md:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Active Challenges</h3>
          {joinedChallenges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">You haven't joined any challenges yet!</p>
              <button 
                onClick={() => navigate("/embed/challenges")}
                className="rainbow-cta px-6 py-3 rounded-full font-semibold">
                Browse Challenges
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {joinedChallenges.map((challenge: any) => {
                const startDate = new Date(challenge.start_date);
                const endDate = new Date(challenge.end_date);
                const now = new Date();
                const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const progress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

                return (
                  <div key={challenge.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition">
                    <div className="flex-1">
                      <p className="font-semibold">{challenge.name}</p>
                      <p className="text-sm text-slate-500">
                        {challenge.description 
                          ? challenge.description.substring(0, 60) + (challenge.description.length > 60 ? '...' : '')
                          : 'Code: ' + challenge.join_code
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full relative">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                          <circle 
                            cx="32" cy="32" r="28" 
                            stroke="url(#gradient)" 
                            strokeWidth="4" 
                            fill="none"
                            strokeDasharray={`${progress * 1.76} 176`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FD80AB" />
                              <stop offset="100%" stopColor="#719FFF" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                          {progress}%
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/embed/challenge/${challenge.id}/manage`)}
                        className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Created Challenges */}
        {createdChallenges.length > 0 && (
          <div className="neon-card rounded-3xl p-6 md:col-span-2">
            <h3 className="text-xl font-semibold mb-4">Challenges You Created</h3>
            <div className="space-y-3">
              {createdChallenges.map((challenge: any) => (
                <div key={challenge.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white">
                  <div>
                    <p className="font-semibold">{challenge.name}</p>
                    <p className="text-sm text-slate-500">Join code: <strong>{challenge.join_code}</strong></p>
                  </div>
                  <button 
                    onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                    className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
                    Manage
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="neon-card rounded-3xl p-6 md:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => navigate("/embed/challenges/new")}
              className="rainbow-cta rounded-2xl px-6 py-4 font-semibold text-center">
              Create Challenge
            </button>
            <button 
              onClick={() => navigate("/embed/join")}
              className="px-6 py-4 rounded-2xl font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition text-center">
              Join with Code
            </button>
            <button 
              onClick={() => navigate("/embed/messages")}
              className="px-6 py-4 rounded-2xl font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition text-center">
              Messages
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}