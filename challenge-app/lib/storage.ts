export type Challenge = {
  id: string;
  title: string;
  duration: number;
  description?: string;
  createdAt?: string;
};

export type ChallengeMember = {
  id: string;
  name: string;
  streak: number;
  joinedAt: string;
};

export type ChallengeMessage = {
  id: string;
  challengeId: string;
  sender: string;
  text: string;
  createdAt: string;
};

export type ChallengeInvite = {
  id: string;
  challengeId: string;
  email: string;
  status: "pending" | "accepted";
  createdAt: string;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  streak: number;
  challengeId: string;
  challengeTitle: string;
};

type ChallengeStreaks = Record<string, number>;
type ChallengeMembers = Record<string, ChallengeMember[]>;
type ChallengeMessages = Record<string, ChallengeMessage[]>;

const CHALLENGES_KEY = "challenges";
const STREAKS_KEY = "challengeStreaks";
const MEMBERS_KEY = "challengeMembers";
const MESSAGES_KEY = "challengeMessages";
const INVITES_KEY = "challengeInvites";
const INVITE_ALLOWLIST_KEY = "inviteAllowlist";
const INVITE_ENV_ALLOWLIST = "NEXT_PUBLIC_INVITE_ALLOWLIST";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureSeedData() {
  if (!isBrowser()) return;
  const existing = getChallenges();
  if (existing.length > 0) return;

  const sampleChallenges: Challenge[] = [
    {
      id: "daily-walk",
      title: "Daily Walk",
      duration: 30,
      description: "Hit 20 minutes outside every day.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "read-20",
      title: "Read 20 Minutes",
      duration: 21,
      description: "Build a nightly reading streak.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "no-sugar",
      title: "No Sugar",
      duration: 14,
      description: "Skip added sugar for two weeks.",
      createdAt: new Date().toISOString(),
    },
  ];
  const sampleStreaks: ChallengeStreaks = {
    "daily-walk": 7,
    "read-20": 12,
    "no-sugar": 3,
  };
  const sampleMembers: ChallengeMembers = {
    "daily-walk": [
      { id: "m-1", name: "Avery", streak: 7, joinedAt: new Date().toISOString() },
      { id: "m-2", name: "Jordan", streak: 5, joinedAt: new Date().toISOString() },
    ],
    "read-20": [
      { id: "m-3", name: "Riley", streak: 12, joinedAt: new Date().toISOString() },
      { id: "m-4", name: "Sam", streak: 9, joinedAt: new Date().toISOString() },
    ],
    "no-sugar": [
      { id: "m-5", name: "Casey", streak: 3, joinedAt: new Date().toISOString() },
    ],
  };
  const sampleMessages: ChallengeMessages = {
    "daily-walk": [
      {
        id: generateId("msg"),
        challengeId: "daily-walk",
        sender: "Avery",
        text: "Sunrise loop done. Who's next?",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  writeJson(CHALLENGES_KEY, sampleChallenges);
  writeJson(STREAKS_KEY, sampleStreaks);
  writeJson(MEMBERS_KEY, sampleMembers);
  writeJson(MESSAGES_KEY, sampleMessages);
}

export function getChallenges(): Challenge[] {
  const parsed = readJson<Challenge[]>(CHALLENGES_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function createChallenge(input: { title: string; duration: number; description?: string }) {
  const challenges = getChallenges();
  const newChallenge: Challenge = {
    id: generateId("challenge"),
    title: input.title,
    duration: input.duration,
    description: input.description,
    createdAt: new Date().toISOString(),
  };
  const next = [newChallenge, ...challenges];
  writeJson(CHALLENGES_KEY, next);
  return newChallenge;
}

export function getChallengeById(id: string) {
  return getChallenges().find((challenge) => challenge.id === id) || null;
}

export function getStreak(challengeId: string): number {
  const parsed = readJson<ChallengeStreaks>(STREAKS_KEY, {});
  const value = parsed?.[challengeId];
  return typeof value === "number" ? value : 0;
}

export function setStreak(challengeId: string, streak: number) {
  const parsed = readJson<ChallengeStreaks>(STREAKS_KEY, {});
  const next = { ...parsed, [challengeId]: streak };
  writeJson(STREAKS_KEY, next);
}

export function incrementStreak(challengeId: string) {
  const current = getStreak(challengeId);
  setStreak(challengeId, current + 1);
}

export function getMembers(challengeId: string) {
  const parsed = readJson<ChallengeMembers>(MEMBERS_KEY, {});
  return parsed?.[challengeId] || [];
}

export function addMember(challengeId: string, member: ChallengeMember) {
  const parsed = readJson<ChallengeMembers>(MEMBERS_KEY, {});
  const next = { ...parsed, [challengeId]: [...(parsed[challengeId] || []), member] };
  writeJson(MEMBERS_KEY, next);
}

export function getMessages(challengeId: string) {
  const parsed = readJson<ChallengeMessages>(MESSAGES_KEY, {});
  return parsed?.[challengeId] || [];
}

export function addMessage(input: Omit<ChallengeMessage, "id" | "createdAt">) {
  const parsed = readJson<ChallengeMessages>(MESSAGES_KEY, {});
  const nextMessage: ChallengeMessage = {
    id: generateId("msg"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const next = {
    ...parsed,
    [input.challengeId]: [...(parsed[input.challengeId] || []), nextMessage],
  };
  writeJson(MESSAGES_KEY, next);
  return nextMessage;
}

export function getInvites() {
  return readJson<ChallengeInvite[]>(INVITES_KEY, []);
}

export function addInvites(challengeId: string, emails: string[]) {
  const invites = getInvites();
  const next = [
    ...emails.map((email) => ({
      id: generateId("invite"),
      challengeId,
      email,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    })),
    ...invites,
  ];
  writeJson(INVITES_KEY, next);
  return next;
}

export function getInviteAllowlist() {
  const envList = (process.env[INVITE_ENV_ALLOWLIST] || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const localList = readJson<string[]>(INVITE_ALLOWLIST_KEY, []).map((item) => item.toLowerCase());
  return Array.from(new Set([...envList, ...localList]));
}

export function addToInviteAllowlist(emails: string[]) {
  const next = Array.from(new Set([...(readJson<string[]>(INVITE_ALLOWLIST_KEY, [])), ...emails]));
  writeJson(INVITE_ALLOWLIST_KEY, next);
  return next;
}

export function isEmailInvited(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = getInviteAllowlist();
  if (allowlist.includes(normalized)) return true;
  const invites = getInvites();
  return invites.some((invite) => invite.email.toLowerCase() === normalized);
}

export function getLeaderboard(limit = 10): LeaderboardEntry[] {
  const challenges = getChallenges();
  const entries = challenges.flatMap((challenge) => {
    const members = getMembers(challenge.id);
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      streak: member.streak,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
    }));
  });

  return entries.sort((a, b) => b.streak - a.streak).slice(0, limit);
}
