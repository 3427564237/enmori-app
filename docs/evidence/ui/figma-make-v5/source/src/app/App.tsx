import { useState } from "react";
import {
  Home, Users, CalendarDays, Bot, User, ChevronLeft, ChevronRight,
  Check, MapPin, Clock, Lock, Globe, UserPlus, UserMinus, Shield, Info,
  Cloud, Send, Bell, Search, CheckCircle2, AlertTriangle, Settings, Camera, Edit2,
  UserCheck, UserX, Filter, Star, ExternalLink, BookOpen, Briefcase, Trash2, LogOut, Pencil, X, MoreHorizontal, MessageSquare,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Screen =
  | "login" | "register" | "verify" | "reg-complete" | "forgot-password"
  | "profile-setup" | "interest-setup" | "data-consent" | "less-personalised"
  | "home" | "home-limited"
  | "people-list" | "public-profile" | "friend-request-sent"
  | "friend-requests" | "friend-accepted" | "friend-declined"
  | "friends-page"
  | "events-list" | "event-detail" | "interested-people" | "going-people"
  | "event-status-saved"
  | "checkin" | "checkin-success" | "checkin-timeline" | "checkin-calendar" | "checkin-edit"
  | "ai-customize" | "ai-assistant" | "ai-safety" | "ai-limited"
  | "own-profile" | "privacy-settings" | "consent-settings" | "profile-edit"
  | "first-time-privacy" | "reg-check" | "friends-activity" | "find-people" | "persona-management" | "edit-persona";

interface CheckinItem {
  timestamp: string;
  mood: string;
  note: string;
  location?: string;
  visibility: "Private" | "Friends-only" | "Public";
  weather?: string;
}

interface Persona {
  id: string;
  name: string;
  relationship: string;
  description: string;
  traits: string[];
  additionalPersonalityDetails: string;
  interests: string[];
  responseLength: "Short" | "Balanced" | "Detailed";
  tones: string[];
  preferences: {
    leadWithMainPoint: boolean;
    correctWhenWrong: boolean;
    lightHumour: boolean;
    avoidPraise: boolean;
  };
  additionalInstructions: string;
}

const INITIAL_PERSONAS: Persona[] = [
  {
    id: "mio",
    name: "Mio",
    relationship: "My digital friend",
    description: "A calm, intelligent and slightly playful digital companion.",
    traits: ["Calm", "Honest", "Reliable", "Thoughtful"],
    additionalPersonalityDetails: "Listens carefully and gives honest feedback without sounding harsh.",
    interests: ["Music", "Study planning", "Campus life", "Technology"],
    responseLength: "Short",
    tones: ["Friendly", "Playful"],
    preferences: { leadWithMainPoint: true, correctWhenWrong: true, lightHumour: true, avoidPraise: true },
    additionalInstructions: "",
  },
  {
    id: "max",
    name: "Max",
    relationship: "Study partner",
    description: "Energetic, practical and direct.",
    traits: ["Direct", "Energetic", "Reliable"],
    additionalPersonalityDetails: "",
    interests: ["Study planning", "Technology", "Events"],
    responseLength: "Balanced",
    tones: ["Direct", "Encouraging"],
    preferences: { leadWithMainPoint: true, correctWhenWrong: true, lightHumour: false, avoidPraise: false },
    additionalInstructions: "",
  },
  {
    id: "aster",
    name: "Aster",
    relationship: "Campus guide",
    description: "Sociable, curious and event-oriented.",
    traits: ["Curious", "Encouraging", "Gentle"],
    additionalPersonalityDetails: "",
    interests: ["Campus life", "Events", "Music"],
    responseLength: "Balanced",
    tones: ["Warm", "Playful"],
    preferences: { leadWithMainPoint: false, correctWhenWrong: false, lightHumour: true, avoidPraise: false },
    additionalInstructions: "",
  },
];

// ─── Recommendation data (single source of truth for Home + People You May Know) ─

// Ranked by weight: shared-interest count (higher = better) + same campus, then single interest, then shared event
const RECOMMENDATIONS = [
  { id: "rec-aisha",   name: "Aisha Rahman", role: "Computer Science · Year 1 · NUS School of Computing", shortRole: "Computer Science Year 1",    reason: "You share 3 interests and attend the same campus.", tag: "3 shared interests" },
  { id: "rec-weizhen", name: "Wei Zhen Lim", role: "Information Systems · Year 2",                    shortRole: "Information Systems Year 2",     reason: "You both like Technology.",                   tag: "Same interest" },
  { id: "rec-chloe",   name: "Chloe Ng",     role: "Communications · Year 3",                         shortRole: "Communications Year 3",          reason: "You share an interest in community events.",  tag: "Same interest" },
  { id: "rec-marcus",  name: "Marcus Tan",   role: "Business · Year 3 · NUS Business School",         shortRole: "Business Year 3",               reason: "You are both interested in NUS Career Fair.", tag: "Same event" },
  { id: "rec-daniel",  name: "Daniel Koh",   role: "Engineering · Year 2",                            shortRole: "Engineering Year 2",             reason: "You are both interested in Campus Tech Meetup.", tag: "Same event" },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCENT = "#4F46E5";
const ACCENT_LIGHT = "#EEF2FF";

interface CheckinSnap { mood: string; weather: string; note: string; activity?: string; location?: string; time: string; }
interface CheckinEntry { date: string; time?: string; mood: string; weather: string; note: string; activity?: string; location?: string; }
interface ProfileData {
  name: string; role: string; bio: string; interests: string[];
  visibility: "Public" | "Friends-only" | "Private";
  reason?: string; tags?: string[];
  latestCheckin?: CheckinSnap;
  publicCheckin?: CheckinSnap;
  checkinHistory?: CheckinEntry[];
  interestedEventIds?: string[];
  bookedEventIds?: string[];
}

const PROFILES: Record<string, ProfileData> = {
  // ── Friends ──────────────────────────────────────────────────────────────
  "Priya Nair": {
    name: "Priya Nair", role: "CS · Year 2", bio: "Passionate about machine learning and campus events.",
    interests: ["Technology", "Study planning", "Music"], visibility: "Friends-only",
    latestCheckin: { mood: "Happy", weather: "Cloudy, 28°C", note: "Quick coffee before my afternoon lab.", activity: "Coffee", location: "COM1 Foyer", time: "2h ago" },
    checkinHistory: [
      { date: "Today",      time: "11:30 AM", mood: "Happy",     weather: "Cloudy, 28°C", note: "Quick coffee before my afternoon lab.",     activity: "Coffee",   location: "COM1 Foyer" },
      { date: "Today",      time: "7:30 AM",  mood: "Energetic", weather: "Cloudy, 28°C", note: "Morning jog — great start to the day.",     activity: "Exercise", location: "Science Park" },
      { date: "Yesterday",                    mood: "Focused",   weather: "Sunny, 31°C",  note: "Long study session in the library.",        activity: "Study",    location: "Library" },
      { date: "2 days ago",                   mood: "Tired",     weather: "Rainy, 26°C",  note: "Finished my ML assignment at last.",        activity: "Study" },
      { date: "5 days ago",                   mood: "Excited",   weather: "Cloudy, 28°C", note: "Went to the AI Symposium with classmates.", activity: "Event" },
    ],
    interestedEventIds: ["ai-symposium"],
    bookedEventIds: [],
  },
  "Sarah Lim": {
    name: "Sarah Lim", role: "Information Systems · Year 3", bio: "Loves design systems and weekend hikes.",
    interests: ["Study planning", "Technology", "Music"], visibility: "Friends-only",
    latestCheckin: { mood: "Focused", weather: "Sunny, 31°C", note: "Library study session before submission.", activity: "Study", location: "Library Study Zone", time: "3h ago" },
    checkinHistory: [
      { date: "Today",       mood: "Focused", weather: "Sunny, 31°C",  note: "Library study session before submission.", activity: "Study", location: "Library Study Zone" },
      { date: "Yesterday",   mood: "Happy",   weather: "Cloudy, 28°C", note: "Group project catch-up.",                 activity: "Study" },
      { date: "3 days ago",  mood: "Tired",   weather: "Rainy, 26°C",  note: "Late lecture then went straight home.",   activity: "Class" },
    ],
    interestedEventIds: ["study-block"],
    bookedEventIds: ["career-fair"],
  },
  "Jayden Koh": {
    name: "Jayden Koh", role: "Business · Year 2", bio: "Entrepreneur in training.",
    interests: ["Events", "Social"], visibility: "Friends-only",
    latestCheckin: { mood: "Happy", weather: "Sunny, 31°C", note: "Lunch with the crew at the canteen.", activity: "Social", time: "Yesterday" },
    checkinHistory: [
      { date: "Yesterday",  mood: "Happy",   weather: "Sunny, 31°C",  note: "Lunch with the crew at the canteen.", activity: "Social" },
      { date: "3 days ago", mood: "Excited", weather: "Cloudy, 28°C", note: "Career fair prep workshop.",          activity: "Career" },
    ],
  },
  // ── Non-friends ──────────────────────────────────────────────────────────
  "Aisha Rahman": {
    name: "Aisha Rahman", role: "Computer Science · Year 1", bio: "First-year CS student into AI and community projects.",
    interests: ["Technology", "Campus life", "Community"], visibility: "Public",
    reason: "You share 3 interests and attend the same campus.", tags: ["3 shared interests"],
    publicCheckin: { mood: "Tired", weather: "Rainy, 26°C", note: "Long day, but finally done with class.", activity: "Class", time: "6h ago" },
  },
  "Marcus Tan": {
    name: "Marcus Tan", role: "Business · Year 3", bio: "Interested in career development and entrepreneurship.",
    interests: ["Events", "Career", "Social"], visibility: "Public",
    reason: "You are both interested in NUS Career Fair.", tags: ["Same event"],
    publicCheckin: { mood: "Motivated", weather: "Sunny, 30°C", note: "Preparing for the career fair tomorrow.", activity: "Career prep", time: "1d ago" },
  },
  "Wei Zhen Lim": {
    name: "Wei Zhen Lim", role: "Information Systems · Year 2", bio: "Into tech, gaming, and open-source projects.",
    interests: ["Technology", "Gaming", "Study planning"], visibility: "Public",
    reason: "You both like Technology.", tags: ["Same interest"],
  },
  "Chloe Ng": {
    name: "Chloe Ng", role: "Communications · Year 3", bio: "Passionate about community outreach and storytelling.",
    interests: ["Community", "Events", "Music"], visibility: "Public",
    reason: "You share an interest in community events.", tags: ["Same interest"],
    publicCheckin: { mood: "Excited", weather: "Windy, 27°C", note: "Heading to a volunteer planning meetup.", activity: "Community event", time: "1d ago" },
  },
  "Daniel Koh": {
    name: "Daniel Koh", role: "Engineering · Year 2", bio: "Robotics enthusiast and hackathon regular.",
    interests: ["Technology", "Campus life", "Events"], visibility: "Public",
    reason: "You are both interested in Campus Tech Meetup.", tags: ["Same event"],
  },
};

const EVENTS = [
  {
    id: "ai-symposium",
    title: "Future of AI in Higher Education Symposium",
    category: "Academic / Technology",
    tags: ["Academic", "Technology"],
    date: "Sat, 19 Jul 2025", time: "2:00 PM",
    venue: "Innovation Centre, Room 301",
    description: "An interdisciplinary symposium exploring how artificial intelligence is transforming teaching, research, and campus life at universities worldwide. Speakers include researchers from NUS, NTU, and international partner institutions.",
    interested: 18, friendsInterested: 5, othersInterested: 13,
    going: 26, friendsGoing: 3, othersGoing: 23,
    recommended: true,
    recommendReason: "Matches your Technology and Events interests.",
    bannerGradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    bannerIcon: "academic",
    interestedFriends: ["Sarah Lim", "Jayden Koh", "Marcus Tan", "Priya Nair", "Wei Zhen Lim"],
    goingFriends: ["Marcus Tan", "Priya Nair", "Wei Zhen Lim"],
  },
  {
    id: "career-fair",
    title: "NUS Career Fair 2025",
    category: "Career",
    tags: ["Career"],
    date: "Fri, 25 Jul 2025", time: "10:00 AM",
    venue: "University Hall",
    description: "Connect with 80+ employers across industries including technology, finance, consulting, and public sector. Bring your resume and explore full-time, internship, and attachment opportunities. Business casual attire recommended.",
    interested: 124, friendsInterested: 3, othersInterested: 121,
    going: 89, friendsGoing: 2, othersGoing: 87,
    recommended: false,
    recommendReason: "Popular on campus this week.",
    bannerGradient: "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)",
    bannerIcon: "career",
    interestedFriends: ["Sarah Lim", "Marcus Tan", "Jayden Koh"],
    goingFriends: ["Sarah Lim", "Jayden Koh"],
  },
  {
    id: "study-block",
    title: "Quiet Study Block: Main Library",
    category: "Study",
    tags: ["Study"],
    date: "Tomorrow", time: "10:00 AM",
    venue: "Central Library",
    description: "Reserved quiet study hours at the main library. No group discussions, no phone calls. Noise-cancelling headphones welcome. Seats are first-come, first-served. All year levels welcome.",
    interested: 9, friendsInterested: 1, othersInterested: 8,
    going: 6, friendsGoing: 1, othersGoing: 5,
    recommended: true,
    recommendReason: "Matches your Study interest.",
    bannerGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    bannerIcon: "study",
    interestedFriends: ["Priya Nair"],
    goingFriends: ["Priya Nair"],
  },
];

// ─── Shared Components ──────────────────────────────────────────────────────

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#4F46E5", "#0891B2", "#059669", "#DC2626", "#7C3AED", "#D97706", "#DB2777"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return (
    <div
      style={{ width: size, height: size, backgroundColor: palette[idx], borderRadius: "50%", flexShrink: 0 }}
      className="flex items-center justify-center text-white font-semibold"
    >
      <span style={{ fontSize: size * 0.36 }}>{initials}</span>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 pt-4 pb-1" style={{ height: 44 }}>
      <span className="text-xs font-bold tracking-tight">9:41</span>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl" />
      <div className="flex gap-1 items-center">
        <div className="w-[14px] h-[7px] border border-foreground rounded-[2px] opacity-70 relative">
          <div className="absolute inset-[1px] right-[3px] bg-foreground rounded-[1px]" />
          <div className="absolute right-[-2px] top-[2px] w-[2px] h-[3px] bg-foreground rounded-r-sm" />
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, onBack, rightEl }: { title: string; onBack?: () => void; rightEl?: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
      <div className="w-9">
        {onBack && (
          <button onClick={onBack} className="p-1 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft size={22} />
          </button>
        )}
      </div>
      <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">{title}</h1>
      <div className="w-9 flex justify-end">{rightEl}</div>
    </div>
  );
}

function BottomNav({ active, navigate }: { active: string; navigate: (s: Screen) => void }) {
  const items: { id: string; label: string; Icon: typeof Home; screen: Screen }[] = [
    { id: "home", label: "Home", Icon: Home, screen: "home" },
    { id: "friends", label: "Friends", Icon: Users, screen: "friends-page" },
    { id: "events", label: "Events", Icon: CalendarDays, screen: "events-list" },
    { id: "ai", label: "AI", Icon: Bot, screen: "ai-assistant" },
    { id: "profile", label: "Profile", Icon: User, screen: "own-profile" },
  ];
  return (
    <div className="flex border-t border-border bg-card" style={{ paddingBottom: 6 }}>
      {items.map(({ id, label, Icon, screen }) => {
        const on = active === id;
        return (
          <button key={id} onClick={() => navigate(screen)} className="flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5">
            <Icon size={21} color={on ? ACCENT : "#9CA3AF"} strokeWidth={on ? 2.5 : 1.8} />
            <span className="text-[9px]" style={{ color: on ? ACCENT : "#9CA3AF", fontWeight: on ? 700 : 400 }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Btn({
  children, variant = "primary", onClick, disabled, small, full = true,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  onClick?: () => void; disabled?: boolean; small?: boolean; full?: boolean;
}) {
  const base = `rounded-xl font-medium transition-all focus:outline-none active:scale-[0.98] ${full ? "w-full" : ""} ${small ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm"}`;
  const variants = {
    primary: disabled ? `${base} bg-gray-200 text-gray-400 cursor-not-allowed` : `${base} bg-foreground text-background hover:opacity-90`,
    outline: `${base} border border-foreground text-foreground hover:bg-muted`,
    ghost: `${base} text-foreground hover:bg-muted`,
    danger: `${base} border border-red-400 text-red-500 hover:bg-red-50`,
  };
  return <button className={variants[variant]} onClick={onClick} disabled={disabled}>{children}</button>;
}

function PrivacyBadge({ level }: { level: "Private" | "Friends-only" | "Public" }) {
  const cfg = {
    Private: { bg: "#F3F4F6", color: "#6B7280", Icon: Lock },
    "Friends-only": { bg: "#FEF3C7", color: "#D97706", Icon: Users },
    Public: { bg: "#D1FAE5", color: "#059669", Icon: Globe },
  }[level];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={9} />
      {level}
    </span>
  );
}

function ConsentNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: ACCENT_LIGHT }}>
      <Shield size={13} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
      <p className="text-xs leading-relaxed" style={{ color: ACCENT }}>{children}</p>
    </div>
  );
}

function Field({
  label, placeholder, type = "text", helper, error, optional,
}: {
  label: string; placeholder?: string; type?: string;
  helper?: string; error?: string; optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {optional && <span className="text-[10px] text-muted-foreground">(optional)</span>}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl text-sm bg-muted focus:outline-none border ${error ? "border-red-400" : "border-transparent focus:border-accent"} transition-colors`}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {helper && !error && <p className="text-[11px] text-muted-foreground leading-relaxed">{helper}</p>}
    </div>
  );
}

function EventBanner({ gradient, iconType, height = 120 }: { gradient: string; iconType: string; height?: number }) {
  const IconEl = iconType === "career" ? Briefcase : BookOpen;
  return (
    <div className="w-full flex items-center justify-center" style={{ background: gradient, height }}>
      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
        <IconEl size={28} color="white" strokeWidth={1.5} />
      </div>
    </div>
  );
}

// ─── Auth Screens ───────────────────────────────────────────────────────────

const ENMORI_TEAL = "#1C6B5A";
const ENMORI_TEAL_BTN = "#1A6355";

function EnmoriLogo() {
  return (
    <div className="flex items-center gap-2.5 justify-center">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" stroke={ENMORI_TEAL} strokeWidth="2" />
        <line x1="8" y1="24" x2="24" y2="8" stroke={ENMORI_TEAL} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3.5" fill={ENMORI_TEAL} />
      </svg>
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: ENMORI_TEAL, letterSpacing: "-0.5px" }}>
        Enmori
      </span>
    </div>
  );
}

function LeafDecoration() {
  return (
    <svg
      style={{ position: "absolute", top: 12, right: 0, opacity: 0.35, pointerEvents: "none" }}
      width="100" height="110" viewBox="0 0 100 110" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M60 10 Q90 30 80 70 Q70 100 45 95 Q55 65 60 10Z" fill="#5FA58A" />
      <path d="M60 10 Q40 45 45 95" stroke="#4A8C74" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M59 28 Q75 28 78 42" stroke="#4A8C74" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M57 48 Q72 46 73 58" stroke="#4A8C74" strokeWidth="1" strokeLinecap="round" fill="none" />
      <circle cx="72" cy="26" r="4" fill="#C8B560" />
    </svg>
  );
}

function LoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleLogin = () => {
    if (!email || !password) { setShowError(true); return; }
    navigate("home");
  };

  return (
    <div className="flex flex-col px-6 pt-10 pb-10 min-h-full relative overflow-hidden" style={{ backgroundColor: "#F4F4F0" }}>
      <LeafDecoration />

      {/* Logo */}
      <div className="mb-10 mt-2">
        <EnmoriLogo />
      </div>

      {/* Heading */}
      <h1
        style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#111110", lineHeight: 1.2, marginBottom: 10 }}
      >
        Welcome back to Enmori
      </h1>
      <p className="text-sm leading-relaxed mb-8" style={{ color: "#78716C" }}>
        Check in, discover events, and stay meaningfully connected.
      </p>

      {showError && (
        <div className="mb-5 p-3 rounded-2xl flex items-center gap-2" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">Please enter your email and password.</p>
        </div>
      )}

      {/* Email field */}
      <div className="mb-4">
        <label className="text-xs font-bold mb-1.5 block" style={{ color: "#111110" }}>Email or username</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </span>
          <input
            type="text"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setShowError(false); }}
            placeholder="Enter your email or username"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none transition-all"
            style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E5E5E0", color: "#111110" }}
          />
        </div>
      </div>

      {/* Password field */}
      <div className="mb-6">
        <label className="text-xs font-bold mb-1.5 block" style={{ color: "#111110" }}>Password</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setShowError(false); }}
            placeholder="Enter your password"
            className="w-full pl-10 pr-12 py-3.5 rounded-2xl text-sm focus:outline-none transition-all"
            style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E5E5E0", color: "#111110" }}
          />
          <button
            onClick={() => setShowPw(!showPw)}
            className="absolute right-4 top-1/2 -translate-y-1/2"
            style={{ color: "#9CA3AF" }}
          >
            {showPw ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Login button */}
      <button
        onClick={handleLogin}
        className="w-full py-4 rounded-2xl text-sm font-bold tracking-wide transition-opacity active:opacity-80"
        style={{ backgroundColor: ENMORI_TEAL_BTN, color: "#FFFFFF" }}
      >
        Log in
      </button>

      {/* Forgot password */}
      <button
        className="text-center text-sm mt-4 py-1 font-semibold"
        style={{ color: ENMORI_TEAL }}
        onClick={() => navigate("forgot-password")}
      >
        Forgot password?
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className="flex-1 h-px" style={{ backgroundColor: "#D9D9D4" }} />
        <span className="text-xs" style={{ color: "#9CA3AF" }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#D9D9D4" }} />
      </div>

      {/* Sign up */}
      <div className="text-center">
        <span className="text-sm" style={{ color: "#78716C" }}>New to Enmori? </span>
        <button className="text-sm font-bold" style={{ color: ENMORI_TEAL }} onClick={() => navigate("register")}>
          Sign up
        </button>
      </div>
    </div>
  );
}

function RegisterScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (agreed) navigate("verify");
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Create Account" onBack={goBack} />
      <div className="px-6 py-5 flex flex-col gap-4">
        <Field label="Username" placeholder="Choose a username" />
        <Field label="Institutional email" placeholder="e.g. alex.chen@nus.edu.sg" type="email"
          helper="Must be a university institutional email address." />
        <Field label="Password" type="password" placeholder="At least 8 characters" />
        <Field label="Confirm password" type="password" placeholder="Repeat your password" />
        <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAgreed(!agreed)}>
          <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
            style={{ borderColor: agreed ? ACCENT : "#D1D5DB", backgroundColor: agreed ? ACCENT : "transparent" }}>
            {agreed && <Check size={11} color="white" strokeWidth={3} />}
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">
            I accept the{" "}
            <span className="font-semibold" style={{ color: ACCENT }}>Terms of Service</span>
            {" "}and{" "}
            <span className="font-semibold" style={{ color: ACCENT }}>Privacy Policy</span>
          </span>
        </label>
        {tried && !agreed && <p className="text-[11px] text-red-500 -mt-2">You must accept the Terms and Privacy Policy to continue.</p>}

        <Btn onClick={submit}>Create Account</Btn>
        <div className="text-center">
          <span className="text-xs text-muted-foreground">Already have an account? </span>
          <button className="text-xs font-bold" style={{ color: ACCENT }} onClick={goBack}>Login</button>
        </div>
      </div>
    </div>
  );
}

function VerifyScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const handleDone = () => {
    const full = code.join("");
    if (full.length < 6) { setError("Please enter the complete 6-digit code."); return; }
    if (full !== "123456") { setError("Incorrect code. Please try again."); return; }
    navigate("reg-complete");
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Verification" onBack={goBack} />
      <div className="px-6 py-8 flex flex-col gap-6">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We've sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">alex.chen@nus.edu.sg</span>.
          Enter it below to verify your email.
        </p>
        <div className="flex gap-2 justify-center">
          {code.map((digit, i) => (
            <input key={i} type="text" maxLength={1} value={digit}
              onChange={(e) => {
                const next = [...code];
                next[i] = e.target.value.replace(/\D/, "");
                setCode(next); setError("");
              }}
              className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-muted focus:outline-none transition-colors"
              style={{ borderColor: digit ? ACCENT : "transparent" }}
            />
          ))}
        </div>
        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200"><p className="text-xs text-red-600">{error}</p></div>}
        {resent && <div className="p-3 rounded-xl bg-green-50 border border-green-200"><p className="text-xs text-green-700">Code resent to your email.</p></div>}
        <Btn onClick={handleDone}>Done</Btn>
        <button className="text-xs text-center py-1 font-medium" style={{ color: ACCENT }}
          onClick={() => { setResent(true); setTimeout(() => setResent(false), 3500); }}>
          Resend code
        </button>
        <p className="text-[10px] text-center text-muted-foreground">Demo hint: use 123456</p>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [resent, setResent] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleSend = () => {
    if (!email.trim() || !email.includes("@")) { setEmailError("Please enter a valid email address."); return; }
    setEmailError("");
    setStep("code");
  };

  const handleVerify = () => {
    const full = code.join("");
    if (full.length < 6) { setCodeError("Please enter the complete 6-digit code."); return; }
    if (full !== "123456") { setCodeError("Incorrect code. Please try again."); return; }
    setCodeError("");
    setStep("reset");
  };

  const handleReset = () => {
    if (newPw.length < 8) { setResetError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setResetError("Passwords do not match."); return; }
    setResetError("");
    navigate("home");
  };

  const EyeIcon = ({ show }: { show: boolean }) => show ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#F4F4F0" }}>
      <TopBar
        title={step === "email" ? "Forgot Password" : step === "code" ? "Verify Email" : "Reset Password"}
        onBack={step === "email" ? goBack : () => setStep(step === "code" ? "email" : "code")}
      />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 pt-5 pb-1">
        {(["email", "code", "reset"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              style={{
                backgroundColor: step === s ? ENMORI_TEAL_BTN : (["email", "code", "reset"].indexOf(step) > i ? "#D1FAE5" : "#E5E5E0"),
                color: step === s ? "#fff" : (["email", "code", "reset"].indexOf(step) > i ? "#059669" : "#9CA3AF"),
              }}
            >
              {["email", "code", "reset"].indexOf(step) > i ? <Check size={13} strokeWidth={3} /> : i + 1}
            </div>
            {i < 2 && <div className="w-8 h-px" style={{ backgroundColor: ["email", "code", "reset"].indexOf(step) > i ? ENMORI_TEAL_BTN : "#D9D9D4" }} />}
          </div>
        ))}
      </div>

      <div className="px-6 py-6 flex flex-col gap-5 flex-1">

        {/* ── Step 1: Email ── */}
        {step === "email" && (
          <>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Enter your email</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#78716C" }}>
                We'll send a 6-digit verification code to reset your password.
              </p>
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#111110" }}>Email address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#FFFFFF", border: `1.5px solid ${emailError ? "#FCA5A5" : "#E5E5E0"}`, color: "#111110" }}
                />
              </div>
              {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
            </div>
            <button
              onClick={handleSend}
              className="w-full py-4 rounded-2xl text-sm font-bold tracking-wide"
              style={{ backgroundColor: ENMORI_TEAL_BTN, color: "#FFFFFF" }}
            >
              Send verification code
            </button>
          </>
        )}

        {/* ── Step 2: Code ── */}
        {step === "code" && (
          <>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Check your inbox</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#78716C" }}>
                We sent a 6-digit code to{" "}
                <span className="font-semibold" style={{ color: "#111110" }}>{email}</span>.
                Enter it below.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              {code.map((digit, i) => (
                <input key={i} type="text" maxLength={1} value={digit}
                  onChange={(e) => {
                    const next = [...code];
                    next[i] = e.target.value.replace(/\D/, "");
                    setCode(next); setCodeError("");
                  }}
                  className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white focus:outline-none transition-colors"
                  style={{ borderColor: digit ? ENMORI_TEAL_BTN : "#E5E5E0" }}
                />
              ))}
            </div>
            {codeError && (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{codeError}</p>
              </div>
            )}
            {resent && (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <Check size={13} className="flex-shrink-0" style={{ color: "#059669" }} />
                <p className="text-xs" style={{ color: "#059669" }}>Code resent to your email.</p>
              </div>
            )}
            <button
              onClick={handleVerify}
              className="w-full py-4 rounded-2xl text-sm font-bold tracking-wide"
              style={{ backgroundColor: ENMORI_TEAL_BTN, color: "#FFFFFF" }}
            >
              Verify code
            </button>
            <button
              className="text-sm text-center font-semibold py-1"
              style={{ color: ENMORI_TEAL }}
              onClick={() => { setResent(true); setTimeout(() => setResent(false), 3500); }}
            >
              Resend code
            </button>
            <p className="text-[10px] text-center" style={{ color: "#9CA3AF" }}>Demo hint: use 123456</p>
          </>
        )}

        {/* ── Step 3: Reset password ── */}
        {step === "reset" && (
          <>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Set new password</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#78716C" }}>Choose a strong password with at least 8 characters.</p>
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#111110" }}>New password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showNew ? "text" : "password"} value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setResetError(""); }}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-12 py-3.5 rounded-2xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#FFFFFF", border: `1.5px solid ${resetError ? "#FCA5A5" : "#E5E5E0"}`, color: "#111110" }}
                />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                  <EyeIcon show={showNew} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#111110" }}>Confirm new password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showConfirm ? "text" : "password"} value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setResetError(""); }}
                  placeholder="Repeat your new password"
                  className="w-full pl-10 pr-12 py-3.5 rounded-2xl text-sm focus:outline-none"
                  style={{ backgroundColor: "#FFFFFF", border: `1.5px solid ${resetError ? "#FCA5A5" : "#E5E5E0"}`, color: "#111110" }}
                />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }}>
                  <EyeIcon show={showConfirm} />
                </button>
              </div>
            </div>
            {resetError && (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{resetError}</p>
              </div>
            )}
            <button
              onClick={handleReset}
              className="w-full py-4 rounded-2xl text-sm font-bold tracking-wide"
              style={{ backgroundColor: ENMORI_TEAL_BTN, color: "#FFFFFF" }}
            >
              Confirm new password
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RegCompleteScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#D1FAE5" }}>
        <CheckCircle2 size={38} style={{ color: "#059669" }} />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 tracking-tight">Registration Complete</h2>
        <p className="text-sm text-muted-foreground mb-4">Your account has been created successfully.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: ACCENT_LIGHT }}>
          <User size={13} style={{ color: ACCENT }} />
          <span className="text-sm font-bold" style={{ color: ACCENT }}>new_scholar_24</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">You can edit your display name later in Profile Settings.</p>
      <div className="mt-auto w-full"><Btn onClick={() => navigate("profile-setup")}>Continue to Profile Setup</Btn></div>
    </div>
  );
}

// ─── Onboarding ─────────────────────────────────────────────────────────────

function ProfileSetupScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col">
      <TopBar title="Profile Setup" onBack={goBack} />
      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border relative">
            <Camera size={22} className="text-muted-foreground" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
              <Edit2 size={11} color="white" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Tap to add photo</p>
        </div>
        <Field label="Display name" placeholder="How you'd like to be called" optional
          helper="If left blank, your username will be shown instead." />
        <Field label="Date of Birth" type="date" optional
          helper="Age group is calculated automatically and used only when consent and privacy settings allow." />
        <Field label="Region" placeholder="e.g. Jurong East, Buona Vista" optional
          helper="Optional approximate region. May help nearby suggestions only when your consent and privacy settings allow it." />
        <Field label="School / Community Context" placeholder="e.g. NUS School of Computing" optional />
        <Field label="Short Bio" placeholder="A sentence or two about yourself..." optional />
        <Btn onClick={() => navigate("interest-setup")}>Continue</Btn>
      </div>
    </div>
  );
}

function InterestSetupScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const all = ["Study", "Technology", "Fitness", "Food", "Music", "Travel", "Sports", "Art", "Events", "Volunteering", "Social", "Gaming"];
  const [selected, setSelected] = useState(new Set(["Technology", "Study", "Events", "Fitness"]));
  const [error, setError] = useState("");
  const toggle = (i: string) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next); setError("");
  };
  return (
    <div className="flex flex-col">
      <TopBar title="Your Interests" onBack={goBack} />
      <div className="px-6 py-5 flex flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Select what matters to you on campus.</p>
          <span className="text-xs font-bold" style={{ color: ACCENT }}>{selected.size} selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {all.map((interest) => {
            const on = selected.has(interest);
            return (
              <button key={interest} onClick={() => toggle(interest)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{ backgroundColor: on ? ACCENT : "#F3F4F6", color: on ? "white" : "#374151", border: `2px solid ${on ? ACCENT : "transparent"}` }}>
                {interest}
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <ConsentNote>Interests are used only when your consent and privacy settings allow.</ConsentNote>
        <Btn onClick={() => { if (selected.size === 0) { setError("Please select at least one interest to continue."); } else { navigate("data-consent"); } }}>
          Continue
        </Btn>
      </div>
    </div>
  );
}

function DataConsentScreen({ navigate, goBack, setConsent }: { navigate: (s: Screen) => void; goBack: () => void; setConsent: (v: boolean) => void }) {
  return (
    <div className="flex flex-col">
      <TopBar title="Data Consent" onBack={goBack} />
      <div className="px-6 py-5 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold mb-2 tracking-tight">Help our AI help you</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            With your permission, the app can use selected data to support AI responses and recommendations.
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What we use</h3>
          {[
            "Profile details you allow, such as display name, bio, and optional region",
            "Selected interests",
            "Visible event interest activity",
            "Check-in mood or note only when permitted",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Check size={13} style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border p-4 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Why it matters</h3>
          {["Better event suggestions", "Safer AI responses", "More relevant connection suggestions"].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Star size={13} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs text-muted-foreground">{item}</p>
            </div>
          ))}
        </div>
        <ConsentNote>These data are used only when both consent and privacy settings allow it.</ConsentNote>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If you choose Not Now, AI personalisation and personalised recommendations will not use these data.
        </p>
        <Btn onClick={() => { setConsent(true); navigate("first-time-privacy"); }}>I Agree</Btn>
        <Btn variant="outline" onClick={() => { setConsent(false); navigate("first-time-privacy"); }}>Not Now</Btn>
      </div>
    </div>
  );
}

function FirstTimePrivacyScreen({ navigate, setDefaultCheckinPrivacy }: {
  navigate: (s: Screen) => void;
  setDefaultCheckinPrivacy: (v: "Public" | "Private") => void;
}) {
  const accept = () => { setDefaultCheckinPrivacy("Public"); navigate("home"); };
  const reject = () => { setDefaultCheckinPrivacy("Private"); navigate("home"); };

  return (
    <div className="flex flex-col min-h-full px-6 py-10 gap-6">
      {/* Icon */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
          <Shield size={36} color="white" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Privacy Settings</h1>
          <p className="text-sm text-muted-foreground">Control how your activity is shared</p>
        </div>
      </div>

      {/* Explanation card */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT_LIGHT }}>
            <Info size={15} style={{ color: ACCENT }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1">Your privacy matters.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose whether you want to enable public visibility by default. You can change your privacy settings at any time in Settings.
            </p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#FEF3C7" }}>
            <Users size={15} style={{ color: "#D97706" }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pt-1.5">
            You can choose <span className="font-semibold text-foreground">Friends-only</span> visibility later in Settings.
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Btn onClick={accept}>Accept</Btn>
        <Btn variant="outline" onClick={reject}>Reject</Btn>
      </div>
    </div>
  );
}

function LessPersonalisedScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
        <Info size={26} style={{ color: "#D97706" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-3 tracking-tight">Less Personalised Mode</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          You can still check in, browse general events, and use basic AI support.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Personalised recommendations will not use your profile details, interests, check-ins, event interest activity, or region.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn onClick={() => navigate("home-limited")}>Continue to Home</Btn>
        <Btn variant="outline" onClick={() => navigate("consent-settings")}>Review consent settings</Btn>
      </div>
    </div>
  );
}

// ─── Home ───────────────────────────────────────────────────────────────────

function HomeScreen({ navigate, consent, friends, sentRequests, onSendRequest, dismissedRecs, onDismissRec, dismissedEvents, onDismissEvent, goToProfile, interestedEvents, toggleInterest, goToEvent }: {
  navigate: (s: Screen) => void;
  consent: boolean;
  friends: Set<string>;
  interestedEvents: Set<string>;
  toggleInterest: (id: string) => void;
  sentRequests: Set<string>;
  onSendRequest: (name: string) => void;
  dismissedRecs: Set<string>;
  onDismissRec: (id: string) => void;
  dismissedEvents: Set<string>;
  onDismissEvent: (id: string) => void;
  goToProfile: (name: string) => void;
  goToEvent: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-2 flex justify-between items-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Good afternoon</p>
          <h1 className="text-xl font-bold tracking-tight">Alex Chen 👋</h1>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 pb-6">
        {/* 1. Check-in card */}
        <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7C3AED 100%)` }}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[11px] text-white/70 mb-0.5">Today's Check-in</p>
              <p className="font-semibold text-white text-sm">Not checked in yet</p>
              <p className="text-[10px] text-white/60 mt-0.5">Last: Yesterday, 3:42 PM</p>
            </div>
            <CheckCircle2 size={22} color="rgba(255,255,255,0.5)" />
          </div>
          <button onClick={() => navigate("checkin")}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors text-white">
            Check in now
          </button>
        </div>

        {/* Weather */}
        <div className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3">
          <Cloud size={26} style={{ color: "#64748B" }} />
          <div>
            <p className="font-semibold text-sm">Cloudy, 28°C</p>
            <p className="text-[11px] text-muted-foreground">Weather is general context and does not use precise location.</p>
          </div>
        </div>

        {/* 2. Friends Activity */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-sm">Friends Activity</h3>
            <button className="text-[11px] font-bold" style={{ color: ACCENT }} onClick={() => navigate("friends-activity")}>See all</button>
          </div>
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {[
              { name: "Priya Nair", text: "checked in", sub: "2h ago · COM1 Foyer · Visible to friends", starred: true },
              { name: "Sarah Lim", text: "is Focused", sub: "Library study session · 3h ago", starred: false },
            ].map((f) => (
              <button key={f.name} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                onClick={() => goToProfile(f.name)}>
                <AvatarCircle name={f.name} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs flex items-center gap-1">
                    <span className="font-semibold">{f.name}</span>
                    {f.starred && <Star size={10} fill="#F59E0B" stroke="#F59E0B" />}
                    <span> {f.text}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.sub}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Only permitted friend activity is shown.</p>
        </div>

        {/* 3. People You May Want To Know */}
        {consent ? (
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="font-bold text-sm">People You May Want To Know</h3>
              <button className="text-[11px] font-bold" style={{ color: ACCENT }} onClick={() => navigate("people-list")}>See all</button>
            </div>
            <div className="flex flex-col gap-2.5">
              {RECOMMENDATIONS.filter((r) => !friends.has(r.name) && !dismissedRecs.has(r.id)).slice(0, 2).map((rec) => {
                const sent = sentRequests.has(rec.name);
                return (
                  <div key={rec.id} className="rounded-2xl bg-card border border-border p-3 flex items-center gap-2.5">
                    <button className="flex-shrink-0" onClick={() => goToProfile(rec.name)}>
                      <AvatarCircle name={rec.name} size={38} />
                    </button>
                    <button className="flex-1 min-w-0 text-left" onClick={() => goToProfile(rec.name)}>
                      <p className="font-semibold text-sm leading-tight">{rec.name}</p>
                      <p className="text-[11px] text-muted-foreground">{rec.shortRole}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: ACCENT }}>{rec.reason}</p>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sent ? (
                        <div className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground flex items-center gap-1">
                          <Check size={10} />Sent
                        </div>
                      ) : (
                        <button onClick={() => onSendRequest(rec.name)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ backgroundColor: ACCENT }}>Add</button>
                      )}
                      <button onClick={() => onDismissRec(rec.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                        style={{ color: "#9CA3AF" }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted p-4 text-center border border-border">
            <p className="text-sm text-muted-foreground">Personalised connection suggestions are off.</p>
            <button className="text-xs mt-1 font-semibold" style={{ color: ACCENT }} onClick={() => navigate("consent-settings")}>
              Review consent settings
            </button>
          </div>
        )}

        {/* 4. Event Recommendations */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-sm">Event Recommendations</h3>
            <button className="text-[11px] font-bold" style={{ color: ACCENT }} onClick={() => navigate("events-list")}>See all</button>
          </div>
          {EVENTS.filter((e) => !dismissedEvents.has(e.id)).slice(0, 2).map((event) => {
            const isInterested = interestedEvents.has(event.id);
            return (
              <div key={event.id} className="rounded-2xl bg-card border border-border overflow-hidden mb-2.5">
                <div className="relative">
                  <EventBanner gradient={event.bannerGradient} iconType={event.bannerIcon} height={96} />
                  <button
                    onClick={() => onDismissEvent(event.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "rgba(0,0,0,0.35)", color: "white" }}>
                    <X size={12} />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {event.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>{tag}</span>
                    ))}
                    {event.recommended && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-50 text-green-700">Recommended</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm mb-2 leading-tight">{event.title}</h3>
                  <div className="flex flex-col gap-1 mb-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock size={10} /><span>{event.date}, {event.time}</span></div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin size={10} /><span>{event.venue}</span></div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Users size={10} /><span>{event.interested} interested</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{event.description}</p>
                  <div className="flex gap-2">
                    <Btn variant="outline" small full={false} onClick={() => goToEvent(event.id)}>Detail</Btn>
                    <button
                      onClick={() => { toggleInterest(event.id); navigate("event-status-saved"); }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      style={{ backgroundColor: isInterested ? "#D1FAE5" : ACCENT, color: isInterested ? "#059669" : "white" }}>
                      {isInterested ? "✓ Interested" : "Interested"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Entry */}
        <button onClick={() => navigate("ai-assistant")}
          className="rounded-2xl p-4 flex items-center gap-3 border border-border bg-card hover:bg-muted transition-colors">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT_LIGHT }}>
            <Bot size={19} style={{ color: ACCENT }} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Ask AI for campus suggestions</p>
            <p className="text-[11px] text-muted-foreground">Events, activities, and more</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

const STARRED_FRIENDS = new Set(["Priya Nair"]);

const ALL_FRIEND_ACTIVITY = [
  { name: "Priya Nair", text: "checked in", sub: "2h ago · COM1 Foyer · Visible to friends" },
  { name: "Sarah Lim", text: "is Focused", sub: "Library study session · 3h ago" },
  { name: "Marcus Tan", text: "is interested in NUS Career Fair", sub: "4h ago · Event activity" },
  { name: "Wei Zhen Lim", text: "checked in", sub: "Yesterday, 6:10 PM · Central Library" },
  { name: "Jayden Koh", text: "is Happy", sub: "Yesterday, 2:30 PM · Friends-only" },
  { name: "Priya Nair", text: "is interested in AI Symposium", sub: "2 days ago · Event activity" },
];

function FriendsActivityScreen({ goBack, navigate, goToProfile }: { goBack: () => void; navigate: (s: Screen) => void; goToProfile: (name: string) => void }) {
  return (
    <div className="flex flex-col">
      <TopBar title="Friends Activity" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-3">
        <ConsentNote>Only permitted friend activity is shown. Friend visibility settings apply.</ConsentNote>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border">
          {ALL_FRIEND_ACTIVITY.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5">
              <button onClick={() => goToProfile(f.name)} className="flex-shrink-0">
                <AvatarCircle name={f.name} size={40} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug flex items-center gap-1 flex-wrap">
                  <button className="font-semibold hover:underline" onClick={() => goToProfile(f.name)}>
                    {f.name}
                  </button>
                  {STARRED_FRIENDS.has(f.name) && <Star size={11} fill="#F59E0B" stroke="#F59E0B" className="flex-shrink-0" />}
                  <span>{f.text}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center pb-2">
          Only permitted friend activity is shown.
        </p>
      </div>
    </div>
  );
}

function HomeLimitedScreen({ navigate, goToEvent }: { navigate: (s: Screen) => void; goToEvent: (id: string) => void }) {
  return (
    <div className="flex flex-col">
      <div className="px-5 pt-3 pb-2 flex justify-between items-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Good afternoon</p>
          <h1 className="text-xl font-bold tracking-tight">Alex Chen</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7" }}>
          <Info size={11} style={{ color: "#D97706" }} />
          <span className="text-[10px] font-bold" style={{ color: "#D97706" }}>Limited mode</span>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4 pb-6">
        <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #7C3AED 100%)` }}>
          <p className="text-[11px] text-white/70 mb-0.5">Today's Check-in</p>
          <p className="font-semibold text-white text-sm mb-3">Not checked in yet</p>
          <button onClick={() => navigate("checkin")}
            className="w-full py-2 rounded-xl text-xs font-bold bg-white/20 text-white">
            Check in now
          </button>
        </div>

        <div className="rounded-2xl bg-muted p-4 text-center border border-border">
          <p className="text-sm font-medium text-muted-foreground">Personalised connection suggestions are off.</p>
          <button className="text-xs mt-1 font-bold" style={{ color: ACCENT }} onClick={() => navigate("consent-settings")}>
            Review consent settings
          </button>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-1">Events on Campus</h3>
          <p className="text-[11px] text-muted-foreground mb-3">Showing general events — personalised suggestions are off.</p>
          {EVENTS.slice(0, 2).map((event) => (
            <div key={event.id} className="rounded-2xl bg-card border border-border p-3 mb-2.5">
              <p className="font-semibold text-sm leading-tight">{event.title}</p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                <Clock size={10} /><span>{event.date}, {event.time}</span>
              </div>
              <button onClick={() => goToEvent(event.id)}
                className="mt-2 w-full py-1.5 rounded-xl border border-border text-xs font-semibold">
                View Details
              </button>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("ai-limited")}
          className="rounded-2xl p-4 flex items-center gap-3 border border-border bg-card">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
            <Bot size={19} style={{ color: "#D97706" }} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Limited AI mode is active.</p>
            <p className="text-[11px] text-muted-foreground">General suggestions only</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── Friend Discovery ───────────────────────────────────────────────────────

function PeopleListScreen({ navigate, goBack, friends, sentRequests, onSendRequest, dismissedRecs, onDismissRec, goToProfile }: {
  navigate: (s: Screen) => void; goBack: () => void;
  friends: Set<string>; sentRequests: Set<string>; onSendRequest: (n: string) => void;
  dismissedRecs: Set<string>; onDismissRec: (id: string) => void;
  goToProfile: (name: string) => void;
}) {
  const people = RECOMMENDATIONS.filter((r) => !friends.has(r.name) && !dismissedRecs.has(r.id));
  return (
    <div className="flex flex-col">
      <TopBar title="People You May Know" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-3">
        <ConsentNote>Recommendations use only permitted data: same interests, shared visible events, and optional approximate region.</ConsentNote>
        {people.map((rec) => {
          const sent = sentRequests.has(rec.name);
          return (
            <div key={rec.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start gap-3 mb-3">
                <button className="flex-shrink-0" onClick={() => goToProfile(rec.name)}>
                  <AvatarCircle name={rec.name} size={48} />
                </button>
                <button className="flex-1 min-w-0 text-left" onClick={() => goToProfile(rec.name)}>
                  <p className="font-bold text-sm">{rec.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.role}</p>
                  <p className="text-xs mt-1.5 font-medium" style={{ color: ACCENT }}>{rec.reason}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>
                      {rec.tag}
                    </span>
                  </div>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToProfile(rec.name)}
                  className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold transition-colors hover:bg-muted">
                  Detail
                </button>
                {sent ? (
                  <div className="flex-1 py-2 rounded-xl bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1">
                    <Check size={11} />Request Sent
                  </div>
                ) : (
                  <button
                    onClick={() => onSendRequest(rec.name)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                    style={{ backgroundColor: "#111110" }}>
                    Add Friend
                  </button>
                )}
                <button
                  onClick={() => onDismissRec(rec.id)}
                  className="w-9 py-2 rounded-xl border border-border flex items-center justify-center transition-colors hover:bg-muted"
                  style={{ color: "#9CA3AF" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {people.length === 0 && (
          <div className="rounded-2xl bg-muted p-4 text-center border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No more recommendations right now.</p>
            <p className="text-xs text-muted-foreground mt-1">Try updating interests or consent settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FindPeopleScreen({ navigate, goBack, friends, sentRequests, onSendRequest }: {
  navigate: (s: Screen) => void; goBack: () => void;
  friends: Set<string>; sentRequests: Set<string>; onSendRequest: (n: string) => void;
}) {
  const [query, setQuery] = useState("");
  // Pre-seed Sarah Lim to demonstrate the "Request Sent" prototype state
  const [localSent, setLocalSent] = useState<Set<string>>(new Set(["Sarah Lim"]));

  const SELF = "Alex Chen";

  const allUsers = [
    { name: "Jamie Dadi",   username: "@jamied",     role: "Business · Year 1" },
    { name: "Marcus Tan",   username: "@marcustan",  role: "Business · Year 3" },
    { name: "Sarah Lim",    username: "@sarahlim",   role: "Arts · Year 3" },
    { name: "Alex Chen",    username: "@alexchen",   role: "CS · Year 4" },
    { name: "Priya Nair",   username: "@priyanair",  role: "CS · Year 2" },
    { name: "Jayden Koh",   username: "@jaydenkoh",  role: "Engineering · Year 2" },
    { name: "Wei Zhen Lim", username: "@weizhen",    role: "Information Systems · Year 2" },
  ];

  const trimmed = query.trim().toLowerCase();
  const results = trimmed.length > 0
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(trimmed) || u.username.toLowerCase().includes(trimmed)
      )
    : [];

  const isSent = (name: string) => localSent.has(name) || sentRequests.has(name);

  const handleSend = (name: string) => {
    onSendRequest(name);
    setLocalSent((p) => new Set([...p, name]));
  };

  const statusButton = (u: typeof allUsers[0]) => {
    if (u.name === SELF) {
      return (
        <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">You</span>
      );
    }
    if (isSent(u.name)) {
      return (
        <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">Request Sent</span>
      );
    }
    if (friends.has(u.name)) {
      return (
        <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
          style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>
          <Check size={10} />Friends
        </span>
      );
    }
    return (
      <button
        onClick={() => handleSend(u.name)}
        className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white flex items-center gap-1 transition-colors"
        style={{ backgroundColor: ACCENT }}>
        <UserPlus size={10} />Add Friend
      </button>
    );
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Find People" onBack={goBack} />
      <div className="px-5 py-3 flex flex-col gap-4">
        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-border bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
            autoFocus
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Default state */}
        {trimmed.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_LIGHT }}>
              <UserPlus size={28} style={{ color: ACCENT }} />
            </div>
            <p className="font-bold text-base text-foreground">Find people on Campus Connect</p>
            <p className="text-xs text-muted-foreground text-center">Search by name, account ID, or username.</p>
          </div>
        )}

        {/* No results state */}
        {trimmed.length > 0 && results.length === 0 && (
          <div className="flex flex-col items-center py-14 gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No people found</p>
            <p className="text-xs text-muted-foreground">Try another name or username.</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map((u) => (
              <div key={u.name} className="rounded-2xl bg-card border border-border p-4">
                <div className="flex items-center gap-3">
                  <AvatarCircle name={u.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.username}</p>
                    <p className="text-[11px] text-muted-foreground">{u.role}</p>
                  </div>
                  {statusButton(u)}
                </div>
                {u.name !== SELF && (
                  <button onClick={() => navigate("public-profile")}
                    className="mt-3 w-full py-1.5 rounded-xl border border-border text-xs font-semibold">
                    View Profile
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// July 2026: starts Wednesday (Mon-based offset = 2), 31 days, today = 27
const CAL_DATE_MAP: Record<string, number> = { "Today": 27, "Yesterday": 26, "2 days ago": 25, "3 days ago": 24, "5 days ago": 22 };
const CAL_DAY_TO_LABEL: Record<number, string> = Object.fromEntries(Object.entries(CAL_DATE_MAP).map(([l, d]) => [d, l]));

function CalendarView({ checkinHistory, selectedDate, onSelectDate }: {
  checkinHistory: CheckinEntry[]; selectedDate: string | null; onSelectDate: (d: string | null) => void;
}) {
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const checkinDayCounts = checkinHistory.reduce((acc, c) => {
    const day = CAL_DATE_MAP[c.date];
    if (day) acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const checkinDays = new Set(Object.keys(checkinDayCounts).map(Number));
  const selectedDay = selectedDate ? CAL_DATE_MAP[selectedDate] : null;
  const cells: (number | null)[] = [...Array(2).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)];
  const selectedEntries = selectedDate ? checkinHistory.filter((c) => c.date === selectedDate) : [];
  const moodEmoji = (m: string) => ({ Happy: "😊", Focused: "🎯", Tired: "😴", Excited: "🎉", Motivated: "💪", Energetic: "⚡" }[m] ?? "🙂");

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-xs font-bold text-center mb-3">July 2026</p>
        <div className="grid grid-cols-7 gap-0.5 mb-1.5">
          {DOW.map((d) => <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => day === null ? <div key={i} /> : (
            <button key={i}
              disabled={!checkinDays.has(day)}
              onClick={() => { const lbl = CAL_DAY_TO_LABEL[day]; onSelectDate(selectedDate === lbl ? null : lbl ?? null); }}
              className="relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors text-[11px] font-semibold"
              style={{
                backgroundColor: selectedDay === day ? ACCENT : checkinDays.has(day) ? ACCENT_LIGHT : "transparent",
                color: selectedDay === day ? "white" : checkinDays.has(day) ? ACCENT : "#9CA3AF",
              }}>
              {day}
              {checkinDays.has(day) && selectedDay !== day && (
                <span className="absolute bottom-0.5 flex gap-[2px]">
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ACCENT }} />
                  {(checkinDayCounts[day] ?? 0) > 1 && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: ACCENT }} />}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {selectedEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          {selectedEntries.map((entry, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>{moodEmoji(entry.mood)}</span>
                  <span className="text-xs font-semibold">{entry.mood}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{entry.time ?? entry.date}</span>
              </div>
              <p className="text-[11px] text-muted-foreground italic">"{entry.note}"</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">☁ {entry.weather}</span>
                {entry.activity && <span className="text-[10px] text-muted-foreground">· {entry.activity}</span>}
                {entry.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin size={8} />{entry.location}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicProfileScreen({ navigate, goBack, profileName, sentRequests, onSendRequest, friends, onRemoveFriend, goToEvent }: {
  navigate: (s: Screen) => void; goBack: () => void;
  profileName: string; sentRequests: Set<string>; onSendRequest: (n: string) => void;
  friends: Set<string>; onRemoveFriend: (n: string) => void;
  goToEvent: (id: string) => void;
}) {
  const profile = PROFILES[profileName] || PROFILES["Priya Nair"];
  const sent = sentRequests.has(profileName);
  const isFriend = friends.has(profileName);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [historyView, setHistoryView] = useState<"day" | "calendar">("day");
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const moodEmoji = (m: string) => ({ Happy: "😊", Focused: "🎯", Tired: "😴", Excited: "🎉", Motivated: "💪", Energetic: "⚡" }[m] ?? "🙂");
  const footprintDate = historyView === "calendar" && selectedCalDate ? selectedCalDate : "Today";
  const footprintEntries = [...(profile.checkinHistory ?? [])].reverse().filter((c) => c.date === footprintDate);

  const RemoveSheet = () => (
    <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="w-full bg-background rounded-t-2xl p-6 flex flex-col gap-4">
        <div className="text-center">
          <p className="font-bold text-base mb-1">Remove Friend</p>
          <p className="text-sm text-muted-foreground">Remove <span className="font-semibold text-foreground">{profileName}</span> from your friends list?</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => { onRemoveFriend(profileName); setConfirmRemove(false); goBack(); }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#DC2626" }}>Yes, Remove</button>
          <button onClick={() => setConfirmRemove(false)}
            className="w-full py-3 rounded-xl border border-border text-sm font-semibold">No, Keep Friend</button>
        </div>
      </div>
    </div>
  );

  // ── FRIEND PROFILE ────────────────────────────────────────────────────────
  if (isFriend) {
    return (
      <div className="flex flex-col" style={{ height: "100%" }}>
        <TopBar title="Profile" onBack={goBack} />
        <div className="flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "none" }}>
          {/* Header */}
          <div className="px-5 py-6 flex flex-col items-center gap-2 border-b border-border">
            <AvatarCircle name={profile.name} size={72} />
            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{profile.role}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#D1FAE5", color: "#059669" }}>Friend</span>
                {STARRED_FRIENDS.has(profile.name) && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}>
                    <Star size={9} fill="#D97706" stroke="#D97706" />Starred
                  </span>
                )}
              </div>
            </div>
            {profile.bio && <p className="text-xs text-muted-foreground text-center leading-relaxed px-2 mt-0.5">{profile.bio}</p>}
          </div>

          <div className="px-5 py-4 flex flex-col gap-5">
            {/* Interests */}
            {profile.interests.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((i) => <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-muted">{i}</span>)}
                </div>
              </div>
            )}

            {/* Latest Check-in */}
            {profile.latestCheckin && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Latest Check-in</p>
                <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{moodEmoji(profile.latestCheckin.mood)}</span>
                      <span className="text-sm font-semibold">{profile.latestCheckin.mood}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{profile.latestCheckin.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">"{profile.latestCheckin.note}"</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">☁ {profile.latestCheckin.weather}</span>
                    {profile.latestCheckin.activity && <span className="text-[11px] text-muted-foreground">· {profile.latestCheckin.activity}</span>}
                    {profile.latestCheckin.location
                      ? <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin size={9} />{profile.latestCheckin.location}</span>
                      : <span className="text-[11px] text-muted-foreground">Location not shared</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Footprint */}
            {footprintEntries.length > 0 && <FootprintMap entries={footprintEntries} />}

            {/* Check-in History */}
            {profile.checkinHistory && profile.checkinHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check-in History</p>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(["day", "calendar"] as const).map((v) => (
                      <button key={v} onClick={() => setHistoryView(v)}
                        className="px-2.5 py-1 text-[11px] font-semibold transition-colors capitalize"
                        style={{ backgroundColor: historyView === v ? ACCENT : "transparent", color: historyView === v ? "white" : "#6B7280" }}>
                        {v === "day" ? "Day" : "Calendar"}
                      </button>
                    ))}
                  </div>
                </div>
                {historyView === "day" ? (
                  <div className="flex flex-col gap-3">
                    {Object.entries(
                      profile.checkinHistory.reduce((acc, c) => {
                        if (!acc[c.date]) acc[c.date] = [];
                        acc[c.date].push(c);
                        return acc;
                      }, {} as Record<string, CheckinEntry[]>)
                    ).map(([date, entries]) => (
                      <div key={date} className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{date}</p>
                        {entries.map((c, i) => (
                          <div key={i} className="rounded-xl bg-card border border-border p-3 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{moodEmoji(c.mood)}</span>
                                <span className="text-xs font-semibold">{c.mood}</span>
                              </div>
                              {c.time && <span className="text-[11px] text-muted-foreground">{c.time}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">"{c.note}"</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              <span className="text-[10px] text-muted-foreground">☁ {c.weather}</span>
                              {c.activity && <span className="text-[10px] text-muted-foreground">· {c.activity}</span>}
                              {c.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin size={8} />{c.location}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <CalendarView checkinHistory={profile.checkinHistory} selectedDate={selectedCalDate} onSelectDate={setSelectedCalDate} />
                )}
              </div>
            )}

            {/* Interested Events */}
            {profile.interestedEventIds && profile.interestedEventIds.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Interested Events</p>
                <div className="flex flex-col gap-2">
                  {profile.interestedEventIds.map((id) => {
                    const ev = EVENTS.find((e) => e.id === id);
                    if (!ev) return null;
                    return (
                      <button key={id} onClick={() => goToEvent(id)}
                        className="rounded-xl bg-card border border-border p-3 flex items-start gap-3 text-left w-full hover:bg-muted transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ev.bannerGradient }}>
                          <BookOpen size={13} color="white" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ev.date} · {ev.venue}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Booked Events */}
            {profile.bookedEventIds && profile.bookedEventIds.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Booked Events</p>
                <div className="flex flex-col gap-2">
                  {profile.bookedEventIds.map((id) => {
                    const ev = EVENTS.find((e) => e.id === id);
                    if (!ev) return null;
                    return (
                      <button key={id} onClick={() => goToEvent(id)}
                        className="rounded-xl bg-card border border-border p-3 flex items-start gap-3 text-left w-full hover:bg-muted transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ev.bannerGradient }}>
                          <BookOpen size={13} color="white" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ev.date} · {ev.venue}</p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remove friend */}
            <button onClick={() => setConfirmRemove(true)}
              className="w-full py-3 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
              style={{ color: "#DC2626", borderColor: "#FCA5A5" }}>
              <UserMinus size={15} />Remove Friend
            </button>
          </div>
        </div>
        {confirmRemove && <RemoveSheet />}
      </div>
    );
  }

  // ── NON-FRIEND PROFILE ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <TopBar title="Profile" onBack={goBack} />
      <div className="flex-1 overflow-y-auto pb-6" style={{ scrollbarWidth: "none" }}>
        {/* Header */}
        <div className="px-5 py-6 flex flex-col items-center gap-2 border-b border-border">
          <AvatarCircle name={profile.name} size={72} />
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{profile.role}</p>
          </div>
          {profile.bio && <p className="text-xs text-muted-foreground text-center leading-relaxed px-2 mt-0.5">{profile.bio}</p>}
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Matching reason */}
          {profile.reason && (
            <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-2" style={{ backgroundColor: ACCENT_LIGHT }}>
              <Info size={13} style={{ color: ACCENT, flexShrink: 0 }} />
              <p className="text-xs font-medium leading-relaxed" style={{ color: ACCENT }}>{profile.reason}</p>
            </div>
          )}

          {/* Interests */}
          {profile.interests.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((i) => <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-muted">{i}</span>)}
              </div>
            </div>
          )}

          {/* Public check-in */}
          {profile.publicCheckin && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Latest Public Check-in</p>
              <div className="rounded-2xl bg-muted/60 border border-border p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{moodEmoji(profile.publicCheckin.mood)}</span>
                    <span className="text-xs font-semibold">{profile.publicCheckin.mood}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{profile.publicCheckin.time}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">"{profile.publicCheckin.note}"</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="text-[10px] text-muted-foreground">☁ {profile.publicCheckin.weather}</span>
                  {profile.publicCheckin.activity && <span className="text-[10px] text-muted-foreground">· {profile.publicCheckin.activity}</span>}
                  {profile.publicCheckin.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin size={8} />{profile.publicCheckin.location}</span>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Public check-in only.</p>
              </div>
            </div>
          )}

          {/* Add Friend */}
          {sent ? (
            <div className="w-full py-3 rounded-xl bg-muted text-center text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2">
              <Check size={13} />Request Sent
            </div>
          ) : (
            <Btn onClick={() => { onSendRequest(profileName); navigate("friend-request-sent"); }}>
              <span className="flex items-center gap-2 justify-center"><UserPlus size={15} />Add Friend</span>
            </Btn>
          )}
          <ConsentNote>Only public information is shown. Add as a friend to see permitted activity.</ConsentNote>
        </div>
      </div>
    </div>
  );
}

function FriendRequestSentScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_LIGHT }}>
        <UserPlus size={36} style={{ color: ACCENT }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">Friend request sent</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Friendship is created only after the other user accepts your request.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn variant="outline" onClick={goBack}>Back to profile</Btn>
        <Btn onClick={() => navigate("people-list")}>View recommendations</Btn>
      </div>
    </div>
  );
}

function FriendRequestsScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col">
      <TopBar title="Friend Requests" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-3">
        {[
          { name: "Wei Zhen Lim", role: "Information Systems Year 2", context: "Interested in Technology" },
          { name: "Jordan Lee", role: "Business Year 1", context: "Interested in Events" },
        ].map((req) => (
          <div key={req.name} className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <AvatarCircle name={req.name} size={42} />
              <div>
                <p className="font-bold text-sm">{req.name}</p>
                <p className="text-xs text-muted-foreground">{req.role}</p>
                <p className="text-xs mt-0.5" style={{ color: ACCENT }}>{req.context}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold" onClick={() => navigate("public-profile")}>View Profile</button>
              <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: "#059669" }} onClick={() => navigate("friend-accepted")}>Accept</button>
              <button className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500" onClick={() => navigate("friend-declined")}>Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendAcceptedScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#D1FAE5" }}>
        <UserCheck size={36} style={{ color: "#059669" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">You are now friends.</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Friends-only information is visible only according to each user's existing settings.
        </p>
      </div>
      <div className="w-full mt-auto"><Btn onClick={() => navigate("friends-page")}>Go to Friends</Btn></div>
    </div>
  );
}

function FriendDeclinedScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted">
        <UserX size={26} className="text-muted-foreground" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">Request declined.</h2>
        <p className="text-sm text-muted-foreground">No friendship was created.</p>
      </div>
      <div className="w-full mt-auto"><Btn onClick={() => navigate("friends-page")}>Go to Friends</Btn></div>
    </div>
  );
}

function FriendsPageScreen({ navigate }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const filters = ["All", "Check-in", "Mood", "Interested event", "Booked externally"];
  const [activeFilter, setActiveFilter] = useState("All");
  const [specialCare, setSpecialCare] = useState<Set<string>>(new Set(["Priya Nair"]));
  const [searchQuery, setSearchQuery] = useState("");

  const allFriends = [
    { name: "Priya Nair", role: "CS Year 2", checkin: "Checked in 2h ago", mood: null, event: null, booked: null },
    { name: "Sarah Lim", role: "Arts Year 3", checkin: "Library study session", mood: "Focused", event: null, booked: null },
    { name: "Jayden Koh", role: "Engineering Year 2", checkin: null, mood: null, event: "Future of AI Symposium", booked: null },
    { name: "Marcus Tan", role: "Business Year 3", checkin: null, mood: null, event: null, booked: "NUS Career Fair" },
  ];

  const toggleSpecialCare = (name: string) => {
    setSpecialCare((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const isSearching = searchQuery.trim().length > 0;

  const filtered = allFriends.filter((f) => {
    if (isSearching) return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "All") return true;
    if (activeFilter === "Check-in") return !!f.checkin;
    if (activeFilter === "Mood") return !!f.mood;
    if (activeFilter === "Interested event") return !!f.event;
    if (activeFilter === "Booked externally") return !!f.booked;
    return true;
  });

  const specialFriends = filtered.filter((f) => specialCare.has(f.name));
  const normalFriends = filtered.filter((f) => !specialCare.has(f.name));

  const FriendRow = ({ f }: { f: typeof allFriends[0] }) => (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-start gap-3">
        <AvatarCircle name={f.name} size={42} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{f.name}</p>
          <p className="text-[11px] text-muted-foreground">{f.role}</p>
          {f.checkin && <p className="text-[11px] mt-0.5 text-muted-foreground">📍 {f.checkin}</p>}
          {f.mood && <span className="inline-flex items-center gap-1 text-[11px] mt-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">😊 {f.mood}</span>}
          {f.event && <p className="text-[11px] mt-0.5 font-medium" style={{ color: ACCENT }}>⭐ Interested: {f.event}</p>}
          {f.booked && <p className="text-[11px] mt-0.5 font-medium text-green-600">✓ Booked externally: {f.booked}</p>}
        </div>
        <button
          onClick={() => toggleSpecialCare(f.name)}
          className="flex-shrink-0 p-1.5 rounded-xl hover:bg-muted transition-colors"
          title={specialCare.has(f.name) ? "Remove Special Care" : "Mark as Special Care"}
        >
          <Star
            size={16}
            fill={specialCare.has(f.name) ? "#F59E0B" : "none"}
            stroke={specialCare.has(f.name) ? "#F59E0B" : "#9CA3AF"}
            strokeWidth={1.8}
          />
        </button>
      </div>
      <button onClick={() => navigate("public-profile")}
        className="mt-3 w-full py-1.5 rounded-xl border border-border text-xs font-semibold">
        View Profile
      </button>
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <div className="w-9" />
        <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">Friends</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate("find-people")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            title="Find People">
            <UserPlus size={16} style={{ color: ACCENT }} />
          </button>
          <button
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}
            onClick={() => navigate("friend-requests")}>
            <Bell size={10} /><span>2</span>
          </button>
        </div>
      </div>

      <div className="px-5 py-3">
        {/* People You May Know entry */}
        <button onClick={() => navigate("people-list")}
          className="w-full rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 mb-1 hover:bg-muted transition-colors text-left">
          <div className="flex -space-x-2.5">
            {["Priya Nair", "Marcus Tan", "Wei Zhen Lim"].map((name, i) => (
              <div key={name} style={{ zIndex: 3 - i }}><AvatarCircle name={name} size={32} /></div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">People You May Know</p>
            <p className="text-[11px] text-muted-foreground">3 suggestions based on your interests</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </button>

        {/* Search My Friends */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search My Friends"
            className="w-full pl-8 pr-8 py-2.5 rounded-xl border border-border bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ "--tw-ring-color": ACCENT } as React.CSSProperties}
          />
          {isSearching && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Activity filter chips — hidden while searching */}
        {!isSearching && (
          <>
            <p className="text-[11px] text-muted-foreground mb-3">Only permitted friend activity is shown.</p>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
              {filters.map((f) => {
                const isActive = activeFilter === f;
                return (
                  <button key={f} onClick={() => setActiveFilter(f)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: isActive ? ACCENT : "#F3F4F6",
                      color: isActive ? "white" : "#374151",
                    }}>
                    {f}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Friend list / search results */}
        {filtered.length === 0 ? (
          isSearching ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Search size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No matching friends</p>
              <p className="text-xs text-muted-foreground">Try searching for another name.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-14 gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Filter size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">No friends match this filter.</p>
              <button onClick={() => setActiveFilter("All")}
                className="text-sm font-semibold px-4 py-2 rounded-xl border border-border">Clear filter</button>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {specialFriends.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Special Care</p>
                {specialFriends.map((f) => <FriendRow key={f.name} f={f} />)}
                {normalFriends.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mt-1">Other Friends</p>
                )}
              </>
            )}
            {normalFriends.map((f) => <FriendRow key={f.name} f={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Events ─────────────────────────────────────────────────────────────────

function EventsListScreen({ navigate, goBack, interestedEvents, toggleInterest, dismissedEvents, goToEvent }: {
  navigate: (s: Screen) => void; goBack: () => void;
  interestedEvents: Set<string>; toggleInterest: (id: string) => void;
  dismissedEvents: Set<string>; goToEvent: (id: string) => void;
}) {
  const categories = ["All", "Academic", "Social", "Career", "Wellness", "Technology"];
  const [activeCat, setActiveCat] = useState("All");
  const availableEvents = EVENTS.filter((e) => !dismissedEvents.has(e.id));
  const filtered = activeCat === "All" ? availableEvents : availableEvents.filter((e) => e.category.includes(activeCat));
  const list = filtered.length > 0 ? filtered : availableEvents;
  const [whyOpen, setWhyOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <div className="w-9" />
        <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">Events</h1>
        <button className="w-9 flex justify-end"><Search size={17} /></button>
      </div>
      <div className="px-5 py-3 flex flex-col gap-3">
        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
              style={{ backgroundColor: activeCat === c ? ACCENT : "#F3F4F6", color: activeCat === c ? "white" : "#374151" }}>
              {c}
            </button>
          ))}
        </div>

        <ConsentNote>AI recommendations are based on permitted interests and visible event activity.</ConsentNote>

        {/* Event cards */}
        {list.map((event) => {
          const isInterested = interestedEvents.has(event.id);
          return (
            <div key={event.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              {/* Gradient banner */}
              <EventBanner gradient={event.bannerGradient} iconType={event.bannerIcon} height={96} />

              <div className="p-4">
                {/* Tags row */}
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {event.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>{tag}</span>
                  ))}
                  {event.recommended && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-50 text-green-700">Recommended</span>
                  )}
                </div>

                <h3 className="font-bold text-sm mb-2 leading-tight">{event.title}</h3>

                <div className="flex flex-col gap-1 mb-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock size={10} /><span>{event.date}, {event.time}</span></div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin size={10} /><span>{event.venue}</span></div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Users size={10} /><span>{event.interested} interested</span></div>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{event.description}</p>

                <div className="flex gap-2">
                  <Btn variant="outline" small full={false} onClick={() => goToEvent(event.id)}>Detail</Btn>
                  <button
                    onClick={() => { toggleInterest(event.id); navigate("event-status-saved"); }}
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors"
                    style={{ backgroundColor: isInterested ? "#D1FAE5" : ACCENT, color: isInterested ? "#059669" : "white" }}>
                    {isInterested ? "✓ Interested" : "Interested"}
                  </button>
                </div>

                <button
                  className="mt-2 text-[11px] font-semibold"
                  style={{ color: ACCENT }}
                  onClick={() => setWhyOpen(whyOpen === event.id ? null : event.id)}
                >
                  {whyOpen === event.id ? "Hide explanation ↑" : "Why recommended? ↓"}
                </button>
                {whyOpen === event.id && (
                  <div className="mt-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5 flex gap-2">
                    <Info size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-indigo-700 leading-relaxed">
                      {event.recommendReason || "Matches your interest in " + (event.tags?.[0] ?? "this topic") + ". Based on your saved preferences — no browsing data used."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDetailScreen({ navigate, goBack, interestedEvents, toggleInterest, goingEvents, toggleGoing, bookedEvents, toggleBooked, goToProfile, eventId }: {
  navigate: (s: Screen) => void; goBack: () => void;
  interestedEvents: Set<string>; toggleInterest: (id: string) => void;
  goingEvents: Set<string>; toggleGoing: (id: string) => void;
  bookedEvents: Set<string>; toggleBooked: (id: string) => void;
  goToProfile: (name: string) => void;
  eventId: string;
}) {
  const event = EVENTS.find((e) => e.id === eventId) ?? EVENTS[0];
  const isInterested = interestedEvents.has(event.id);
  const isGoing = goingEvents.has(event.id);
  const isBooked = bookedEvents.has(event.id);
  const [showExternal, setShowExternal] = useState(false);

  const interestedFriends = event.interestedFriends ?? [];
  const goingFriends = event.goingFriends ?? [];
  const goingTotal = isGoing ? (event.going ?? 0) + 1 : (event.going ?? 0);
  const goingFriendsCount = isGoing ? (event.friendsGoing ?? 0) + 1 : (event.friendsGoing ?? 0);

  return (
    <div className="flex flex-col relative">
      {/* External Notice Bottom Sheet */}
      {showExternal && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="w-full bg-card rounded-t-3xl px-6 pt-5 pb-7 flex flex-col gap-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT_LIGHT }}>
                <ExternalLink size={17} style={{ color: ACCENT }} />
              </div>
              <h3 className="font-bold text-base">External Notice</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are leaving Campus Connect to complete registration on a third-party website. Campus Connect does not process booking, payment, refund, cancellation, or attendance verification.
            </p>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Opening this website does not automatically set your Going status. You will be asked whether you completed registration when you return.
              </p>
            </div>
            <button onClick={() => { setShowExternal(false); navigate("reg-check"); }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
              style={{ backgroundColor: ACCENT }}>
              Open external website →
            </button>
            <button onClick={() => setShowExternal(false)}
              className="text-sm font-semibold text-center text-muted-foreground py-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <TopBar title="Event Detail" onBack={goBack} />
      <div className="flex flex-col">
        {/* Gradient banner */}
        <EventBanner gradient={event.bannerGradient} iconType={event.bannerIcon} height={152} />

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Category tags */}
          <div className="flex gap-1.5 flex-wrap">
            {event.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>{tag}</span>
            ))}
          </div>

          <h2 className="text-xl font-bold tracking-tight leading-tight">{event.title}</h2>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={13} /><span>{event.date}, {event.time}</span></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={13} /><span>{event.venue}</span></div>
          </div>

          {/* Why recommended */}
          <ConsentNote>Why recommended: {event.recommendReason}</ConsentNote>

          {/* About */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">About</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
          </div>

          {/* Registration actions */}
          <div className="flex flex-col gap-2">
            {/* Interested */}
            <button
              onClick={() => { toggleInterest(event.id); navigate("event-status-saved"); }}
              className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ backgroundColor: isInterested ? "#D1FAE5" : "#111110", color: isInterested ? "#059669" : "white" }}>
              {isInterested ? "✓ Interested" : "Interested"}
            </button>

            {/* Mark / Unmark Going */}
            <button
              onClick={() => toggleGoing(event.id)}
              className="w-full py-3 rounded-xl text-sm font-bold border transition-colors"
              style={{ borderColor: isGoing ? "#059669" : "#D1D5DB", backgroundColor: isGoing ? "#D1FAE5" : "white", color: isGoing ? "#059669" : "#374151" }}>
              {isGoing ? "✓ Unmark Going" : "Mark Going"}
            </button>
          </div>

          {/* External Registration — moved up, replaces Booked Externally */}
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setShowExternal(true)}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2 text-foreground hover:bg-muted transition-colors">
              <ExternalLink size={14} /> External Registration
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Opens a third-party website. Registration is managed by the event organiser.
            </p>
          </div>

          {/* Interested people card */}
          <div className="rounded-2xl border border-border p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Interested</h3>
            <div className="flex gap-6 mb-3">
              {[{ n: event.interested, l: "Total" }, { n: event.friendsInterested, l: "Friends" }, { n: event.othersInterested, l: "Others" }].map(({ n, l }) => (
                <div key={l} className="text-center">
                  <p className="font-bold text-xl leading-none">{n}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex -space-x-2 mb-2.5">
              {interestedFriends.slice(0, 5).map((name, i) => (
                <button key={name} style={{ zIndex: 5 - i }} onClick={() => goToProfile(name)} className="rounded-full flex-shrink-0">
                  <AvatarCircle name={name} size={30} />
                </button>
              ))}
            </div>
            <button className="text-xs font-bold" style={{ color: ACCENT }} onClick={() => navigate("interested-people")}>
              View all interested people →
            </button>
          </div>

          {/* Going people card */}
          <div className="rounded-2xl border border-border p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Going</h3>
            <div className="flex gap-6 mb-3">
              {[{ n: goingTotal, l: "Total" }, { n: goingFriendsCount, l: "Friends" }, { n: goingTotal - goingFriendsCount, l: "Others" }].map(({ n, l }) => (
                <div key={l} className="text-center">
                  <p className="font-bold text-xl leading-none">{n}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex -space-x-2 mb-2.5">
              {(isGoing ? ["Alex Chen", ...goingFriends] : goingFriends).slice(0, 5).map((name, i) => (
                <button key={name} style={{ zIndex: 5 - i }} onClick={() => name !== "Alex Chen" && goToProfile(name)} className="rounded-full flex-shrink-0">
                  <AvatarCircle name={name} size={30} />
                </button>
              ))}
            </div>
            <button className="text-xs font-bold" style={{ color: ACCENT }} onClick={() => navigate("going-people")}>
              View all going people →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function RegistrationCheckScreen({ goBack, toggleGoing, isGoing }: {
  goBack: () => void;
  toggleGoing: (id: string) => void;
  isGoing: boolean;
}) {
  const eventId = EVENTS[0].id;

  const handleYes = () => {
    if (!isGoing) toggleGoing(eventId);
    goBack();
  };

  const handleNo = () => {
    goBack();
  };

  return (
    <div className="flex flex-col items-center px-6 py-12 gap-6 min-h-full">
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}>
        <ExternalLink size={34} color="white" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className="text-center flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Registration Check</h2>
        <p className="text-base font-semibold">Did you complete the registration?</p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1">
          Please tell us whether you completed the registration on the external website.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="w-full rounded-2xl border border-border bg-muted/50 px-4 py-3 flex items-start gap-3">
        <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Campus Connect cannot verify your registration automatically. We are only recording your answer.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn onClick={handleYes}>Yes</Btn>
        <Btn variant="outline" onClick={handleNo}>No</Btn>
      </div>
    </div>
  );
}

function EventStatusSavedScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#D1FAE5" }}>
        <CheckCircle2 size={38} style={{ color: "#059669" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">Event status updated</h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold mb-3">
          <Check size={12} /> Marked as Interested
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Friends can see this activity only if your event visibility allows it.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn variant="outline" onClick={goBack}>Back to Event</Btn>
        <Btn onClick={() => navigate("events-list")}>Browse more events</Btn>
      </div>
    </div>
  );
}

function PeopleList({ names, onProfile, showRole = false, selfName = "" }: { names: string[]; onProfile: (name: string) => void; showRole?: boolean; selfName?: string }) {
  return (
    <div className="flex flex-col">
      {names.map((name, i) => (
        <div key={name} className={`flex items-center gap-3 py-3 ${i < names.length - 1 ? "border-b border-border" : ""}`}>
          <button onClick={() => onProfile(name)} className="rounded-full flex-shrink-0">
            <AvatarCircle name={name} size={40} />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-sm">{name}</p>
            {showRole
              ? <p className="text-[11px] text-muted-foreground">{name === selfName ? "You" : (PROFILES[name]?.role || "NUS Student")}</p>
              : <PrivacyBadge level="Public" />}
          </div>
          {name !== selfName && (
            <button className="text-xs px-3 py-1.5 rounded-xl border border-border font-semibold" onClick={() => onProfile(name)}>Profile</button>
          )}
        </div>
      ))}
    </div>
  );
}

function SeeAllButton({ expanded, total, shown, onToggle }: { expanded: boolean; total: number; shown: number; onToggle: () => void }) {
  if (total <= shown) return null;
  return (
    <button onClick={onToggle} className="mt-2 text-xs font-bold flex items-center gap-1" style={{ color: ACCENT }}>
      {expanded ? `Show less ↑` : `See all ${total} →`}
    </button>
  );
}

function InterestedPeopleScreen({ navigate, goBack, goToProfile }: { navigate: (s: Screen) => void; goBack: () => void; goToProfile: (name: string) => void }) {
  const event = EVENTS[0];
  const friends = ["Priya Nair", "Jayden Koh", "Sarah Lim", "Marcus Tan", "Wei Zhen Lim"];
  const others = ["Jamie Dadi", "Raina Ma", "Jordan Lee", "Sam Chen", "Alex Wu", "Casey Tan", "Morgan Lim", "Chris Ang", "Dana Yeo", "Felix Ong", "Gina Park", "Henry Liu", "Ivy Ng"];
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllOthers, setShowAllOthers] = useState(false);
  const PREVIEW = 3;
  const visibleFriends = showAllFriends ? friends : friends.slice(0, PREVIEW);
  const visibleOthers = showAllOthers ? others : others.slice(0, PREVIEW);

  return (
    <div className="flex flex-col">
      <TopBar title="Interested People" onBack={goBack} />
      <div className="px-5 py-4">
        <div className="rounded-xl bg-muted p-3 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: event.bannerGradient }}>
            <BookOpen size={14} color="white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold text-xs leading-tight">{event.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{event.date} · {event.venue}</p>
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Friends ({friends.length})
        </p>
        <PeopleList names={visibleFriends} onProfile={goToProfile} showRole />
        <SeeAllButton expanded={showAllFriends} total={friends.length} shown={PREVIEW} onToggle={() => setShowAllFriends(v => !v)} />

        <div className="mt-5 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Others ({others.length})
          </p>
        </div>
        <PeopleList names={visibleOthers} onProfile={goToProfile} />
        <SeeAllButton expanded={showAllOthers} total={others.length} shown={PREVIEW} onToggle={() => setShowAllOthers(v => !v)} />

        <p className="text-[10px] text-muted-foreground text-center mt-5">
          Showing visible users only. Private users are not shown.
        </p>
      </div>
    </div>
  );
}

function GoingPeopleScreen({ navigate, goBack, isGoing, goToProfile }: { navigate: (s: Screen) => void; goBack: () => void; isGoing: boolean; goToProfile: (name: string) => void }) {
  const event = EVENTS[0];
  const friends = isGoing
    ? ["Alex Chen", "Marcus Tan", "Priya Nair", "Wei Zhen Lim"]
    : ["Marcus Tan", "Priya Nair", "Wei Zhen Lim"];
  const others = ["Jamie Dadi", "Sam Chen", "Jordan Lee", "Casey Tan", "Morgan Lim", "Alex Wu", "Raina Ma", "Chris Ang", "Dana Yeo", "Felix Ong", "Gina Park", "Henry Liu", "Ivy Ng", "Jack Ong", "Karen Soh", "Leo Tan", "Mia Chen", "Noah Wu", "Olivia Lim", "Peter Ng", "Quinn Yeo", "Rachel Bay", "Steve Koh"];
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllOthers, setShowAllOthers] = useState(false);
  const PREVIEW = 3;
  const visibleFriends = showAllFriends ? friends : friends.slice(0, PREVIEW);
  const visibleOthers = showAllOthers ? others : others.slice(0, PREVIEW);

  return (
    <div className="flex flex-col">
      <TopBar title="Going People" onBack={goBack} />
      <div className="px-5 py-4">
        <div className="rounded-xl bg-muted p-3 mb-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: event.bannerGradient }}>
            <BookOpen size={14} color="white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold text-xs leading-tight">{event.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{event.date} · {event.venue}</p>
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Friends Going ({friends.length})
        </p>
        <PeopleList names={visibleFriends} onProfile={(n) => n !== "Alex Chen" && goToProfile(n)} showRole selfName="Alex Chen" />
        <SeeAllButton expanded={showAllFriends} total={friends.length} shown={PREVIEW} onToggle={() => setShowAllFriends(v => !v)} />

        <div className="mt-5 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Others Going ({others.length})
          </p>
        </div>
        <PeopleList names={visibleOthers} onProfile={goToProfile} />
        <SeeAllButton expanded={showAllOthers} total={others.length} shown={PREVIEW} onToggle={() => setShowAllOthers(v => !v)} />

        <p className="text-[10px] text-muted-foreground text-center mt-5">
          Showing visible users only. Private users are not shown.
        </p>
      </div>
    </div>
  );
}

// ─── Check-in ───────────────────────────────────────────────────────────────

function CheckinScreen({ navigate, goBack, addCheckin, defaultCheckinPrivacy }: {
  navigate: (s: Screen) => void; goBack: () => void; addCheckin: (i: CheckinItem) => void;
  defaultCheckinPrivacy: "Public" | "Friends-only" | "Private";
}) {
  const moods = ["Happy", "Calm", "Focused", "Tired", "Stressed", "Not sure"];
  const moodEmojis: Record<string, string> = { Happy: "😊", Calm: "😌", Focused: "🎯", Tired: "😴", Stressed: "😟", "Not sure": "🤷" };
  const activities = ["Study", "Fitness", "Social", "Food", "Travel"];
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [selectedActs, setSelectedActs] = useState(new Set<string>());
  const visibility = defaultCheckinPrivacy;
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [locAllowed, setLocAllowed] = useState(false);

  const save = () => {
    if (!note && !selectedMood) { setError("Please enter a note or select a mood to continue."); return; }
    addCheckin({ timestamp: "Just now", mood: selectedMood, note, location: locAllowed ? "Jurong East (approximate)" : undefined, visibility, weather: "Cloudy, 28°C" });
    navigate("checkin-success");
  };

  return (
    <div className="flex flex-col relative">
      {showSheet && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full bg-card rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="w-8 h-1 bg-border rounded-full mx-auto" />
            <h3 className="font-bold text-base">Location Settings</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We can attach an approximate area or district. This is optional and never uses precise, real-time, continuous, or background location.
            </p>
            <Btn onClick={() => { setLocAllowed(true); setShowSheet(false); }}>Allow approximate location</Btn>
            <Btn variant="outline" onClick={() => { setLocAllowed(false); setShowSheet(false); }}>Continue without location</Btn>
          </div>
        </div>
      )}

      <TopBar title="Check-in" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Weather */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 flex items-center gap-3">
          <Cloud size={22} style={{ color: "#64748B" }} />
          <div>
            <p className="text-sm font-bold">Cloudy, 28°C</p>
            <p className="text-[11px] text-muted-foreground">Weather is general context and does not require precise location.</p>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-bold mb-1.5 block">Note</label>
          <textarea className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm resize-none focus:outline-none" rows={3}
            placeholder="What's on your mind today?" value={note}
            onChange={(e) => { setNote(e.target.value); setError(""); }} />
        </div>

        {/* Mood */}
        <div>
          <label className="text-xs font-bold mb-2 block">Mood</label>
          <div className="grid grid-cols-3 gap-2">
            {moods.map((mood) => (
              <button key={mood} onClick={() => { setSelectedMood(mood === selectedMood ? "" : mood); setError(""); }}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ backgroundColor: selectedMood === mood ? ACCENT : "#F3F4F6", color: selectedMood === mood ? "white" : "#374151" }}>
                {moodEmojis[mood]} {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <label className="text-xs font-bold mb-2 block">Activity <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {activities.map((a) => (
              <button key={a} onClick={() => { const next = new Set(selectedActs); if (next.has(a)) next.delete(a); else next.add(a); setSelectedActs(next); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ backgroundColor: selectedActs.has(a) ? ACCENT : "#F3F4F6", color: selectedActs.has(a) ? "white" : "#374151" }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {locAllowed ? (
            <>
              <div className="relative w-full" style={{ height: 110 }}>
                <svg width="100%" height="110" viewBox="0 0 340 110" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                  <rect width="340" height="110" fill="#E8EDF4" />
                  {/* grid roads */}
                  <line x1="0" y1="36" x2="340" y2="36" stroke="#fff" strokeWidth="7" />
                  <line x1="0" y1="74" x2="340" y2="74" stroke="#fff" strokeWidth="5" />
                  <line x1="70" y1="0" x2="70" y2="110" stroke="#fff" strokeWidth="5" />
                  <line x1="160" y1="0" x2="160" y2="110" stroke="#fff" strokeWidth="7" />
                  <line x1="260" y1="0" x2="260" y2="110" stroke="#fff" strokeWidth="5" />
                  {/* blocks */}
                  <rect x="75" y="40" width="80" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="165" y="40" width="90" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="75" y="78" width="50" height="25" rx="3" fill="#D4DCE8" />
                  <rect x="5" y="40" width="60" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="5" y="78" width="60" height="25" rx="3" fill="#D4DCE8" />
                  <rect x="265" y="40" width="70" height="30" rx="3" fill="#D4DCE8" />
                  {/* park */}
                  <rect x="165" y="78" width="90" height="25" rx="3" fill="#C5D9BE" />
                  {/* pin */}
                  <circle cx="170" cy="55" r="10" fill="#4F46E5" opacity="0.15" />
                  <circle cx="170" cy="55" r="5" fill="#4F46E5" />
                  <circle cx="170" cy="55" r="2.5" fill="white" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Approximate location</p>
                  <p className="text-[11px] text-muted-foreground">Jurong East (approximate)</p>
                </div>
                <button onClick={() => setShowSheet(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border">Change</button>
              </div>
            </>
          ) : (
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Approximate location</p>
                <p className="text-[11px] text-muted-foreground">Not sharing location</p>
              </div>
              <button onClick={() => setShowSheet(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border">Add</button>
            </div>
          )}
        </div>

        {/* Visibility — read-only, set in Privacy Settings */}
        

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200"><p className="text-xs text-red-600">{error}</p></div>}
        <Btn onClick={save}>Save Check-in</Btn>
      </div>
    </div>
  );
}

function CheckinSuccessScreen({ navigate, checkins }: { navigate: (s: Screen) => void; checkins: CheckinItem[] }) {
  const last = checkins[checkins.length - 1];
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_LIGHT }}>
        <CheckCircle2 size={38} style={{ color: ACCENT }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">Check-in saved</h2>
        {last?.mood && <p className="text-sm text-muted-foreground mb-1">Mood: {last.mood}</p>}
        {last?.note && <p className="text-sm text-muted-foreground italic mb-2">"{last.note}"</p>}
        <PrivacyBadge level={last?.visibility || "Private"} />
        {last?.location && <p className="text-[11px] text-muted-foreground mt-2">📍 {last.location}</p>}
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn variant="outline" onClick={() => navigate("home")}>Return Home</Btn>
        <Btn onClick={() => navigate("checkin-timeline")}>View Timeline</Btn>
      </div>
    </div>
  );
}

function CheckinTimelineScreen({ navigate, goBack, checkins, deleteCheckin, setEditCheckin }: {
  navigate: (s: Screen) => void; goBack: () => void; checkins: CheckinItem[];
  deleteCheckin: (i: number) => void; setEditCheckin: (i: number) => void;
}) {
  const seed = [
    { timestamp: "Today, 2:15 PM",       mood: "Focused", note: "Working on project in library", location: "Jurong East", visibility: "Private" as const, weather: "Cloudy, 28°C"        },
    { timestamp: "Yesterday, 5:30 PM",   mood: "Happy",   note: "Great study session!",           location: undefined,     visibility: "Private" as const, weather: "Sunny, 31°C"         },
    { timestamp: "2 days ago, 10:00 AM", mood: "Calm",    note: "Morning lecture done",            location: undefined,     visibility: "Private" as const, weather: "Partly cloudy, 27°C" },
  ];
  const all = [...seed, ...checkins].slice(0, 8);

  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col relative">
      {/* Delete confirm bottom sheet */}
      {confirmIdx !== null && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="w-full bg-card rounded-t-3xl px-6 pt-5 pb-7 flex flex-col gap-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={17} style={{ color: "#DC2626" }} />
              </div>
              <div>
                <p className="font-bold text-sm">Delete this check-in?</p>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <button
              onClick={() => { deleteCheckin(confirmIdx); setConfirmIdx(null); }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-red-600">
              Delete
            </button>
            <button
              onClick={() => setConfirmIdx(null)}
              className="w-full py-2 text-sm font-semibold text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      <TopBar title="Check-in Timeline" onBack={goBack} rightEl={
        <button onClick={() => navigate("checkin-calendar")}><CalendarDays size={18} /></button>
      } />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-muted">
          <Lock size={12} style={{ color: "#6B7280" }} />
          <p className="text-xs text-muted-foreground font-medium">Only visible to you</p>
        </div>
        <div className="flex flex-col gap-3">
          {all.map((item, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[11px] text-muted-foreground">{item.timestamp}</p>
                <div className="flex items-center gap-2">
                  <PrivacyBadge level={item.visibility} />
                  <button
                    onClick={() => { setEditCheckin(i); navigate("checkin-edit"); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                    <Edit2 size={13} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setConfirmIdx(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                    <Trash2 size={13} style={{ color: "#DC2626" }} />
                  </button>
                </div>
              </div>
              {item.mood && <p className="font-semibold text-sm mb-1">{item.mood}</p>}
              {item.note && <p className="text-sm text-muted-foreground">"{item.note}"</p>}
              {item.location && <p className="text-[11px] text-muted-foreground mt-1.5">📍 {item.location} (approximate)</p>}
              {item.weather && <p className="text-[11px] text-muted-foreground mt-1">🌤 {item.weather}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckinEditScreen({ navigate, goBack, checkins, editIdx, updateCheckin }: {
  navigate: (s: Screen) => void; goBack: () => void;
  checkins: CheckinItem[]; editIdx: number; updateCheckin: (i: number, item: CheckinItem) => void;
}) {
  const seed = [
    { timestamp: "Today, 2:15 PM", mood: "Focused", note: "Working on project in library", location: "Jurong East", visibility: "Private" as const },
    { timestamp: "Yesterday, 5:30 PM", mood: "Happy", note: "Great study session!", location: undefined, visibility: "Private" as const },
    { timestamp: "2 days ago, 10:00 AM", mood: "Calm", note: "Morning lecture done", location: undefined, visibility: "Private" as const },
  ];
  const all = [...seed, ...checkins];
  const original = all[editIdx] ?? all[0];

  const moods = ["Happy", "Calm", "Focused", "Tired", "Stressed", "Not sure"];
  const moodEmojis: Record<string, string> = { Happy: "😊", Calm: "😌", Focused: "🎯", Tired: "😴", Stressed: "😟", "Not sure": "🤷" };
  const activities = ["Study", "Fitness", "Social", "Food", "Travel"];

  const [note, setNote] = useState(original.note);
  const [selectedMood, setSelectedMood] = useState(original.mood);
  const [visibility, setVisibility] = useState<"Private" | "Friends-only" | "Public">(original.visibility);
  const [locAllowed, setLocAllowed] = useState(!!original.location);
  const [selectedActs, setSelectedActs] = useState(new Set<string>());
  const [error, setError] = useState("");
  const [showSheet, setShowSheet] = useState(false);

  const save = () => {
    if (!note && !selectedMood) { setError("Please enter a note or select a mood to continue."); return; }
    updateCheckin(editIdx, {
      timestamp: original.timestamp,
      mood: selectedMood,
      note,
      location: locAllowed ? (original.location || "Jurong East (approximate)") : undefined,
      visibility,
    });
    goBack();
  };

  return (
    <div className="flex flex-col relative">
      {showSheet && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full bg-card rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="w-8 h-1 bg-border rounded-full mx-auto" />
            <h3 className="font-bold text-base">Location Settings</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We can attach an approximate area or district. This is optional and never uses precise, real-time, continuous, or background location.
            </p>
            <Btn onClick={() => { setLocAllowed(true); setShowSheet(false); }}>Allow approximate location</Btn>
            <Btn variant="outline" onClick={() => { setLocAllowed(false); setShowSheet(false); }}>Continue without location</Btn>
          </div>
        </div>
      )}

      <TopBar title="Edit Check-in" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-5">
        {/* Timestamp */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
          <Clock size={12} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-medium">{original.timestamp}</p>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-bold mb-1.5 block">Note</label>
          <textarea className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm resize-none focus:outline-none" rows={3}
            placeholder="What's on your mind today?" value={note}
            onChange={(e) => { setNote(e.target.value); setError(""); }} />
        </div>

        {/* Mood */}
        <div>
          <label className="text-xs font-bold mb-2 block">Mood</label>
          <div className="grid grid-cols-3 gap-2">
            {moods.map((mood) => (
              <button key={mood} onClick={() => { setSelectedMood(mood === selectedMood ? "" : mood); setError(""); }}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ backgroundColor: selectedMood === mood ? ACCENT : "#F3F4F6", color: selectedMood === mood ? "white" : "#374151" }}>
                {moodEmojis[mood]} {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div>
          <label className="text-xs font-bold mb-2 block">Activity <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {activities.map((a) => (
              <button key={a} onClick={() => { const n = new Set(selectedActs); if (n.has(a)) n.delete(a); else n.add(a); setSelectedActs(n); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ backgroundColor: selectedActs.has(a) ? ACCENT : "#F3F4F6", color: selectedActs.has(a) ? "white" : "#374151" }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {locAllowed ? (
            <>
              <div className="relative w-full" style={{ height: 110 }}>
                <svg width="100%" height="110" viewBox="0 0 340 110" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                  <rect width="340" height="110" fill="#E8EDF4" />
                  <line x1="0" y1="36" x2="340" y2="36" stroke="#fff" strokeWidth="7" />
                  <line x1="0" y1="74" x2="340" y2="74" stroke="#fff" strokeWidth="5" />
                  <line x1="70" y1="0" x2="70" y2="110" stroke="#fff" strokeWidth="5" />
                  <line x1="160" y1="0" x2="160" y2="110" stroke="#fff" strokeWidth="7" />
                  <line x1="260" y1="0" x2="260" y2="110" stroke="#fff" strokeWidth="5" />
                  <rect x="75" y="40" width="80" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="165" y="40" width="90" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="75" y="78" width="50" height="25" rx="3" fill="#D4DCE8" />
                  <rect x="5" y="40" width="60" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="5" y="78" width="60" height="25" rx="3" fill="#D4DCE8" />
                  <rect x="265" y="40" width="70" height="30" rx="3" fill="#D4DCE8" />
                  <rect x="165" y="78" width="90" height="25" rx="3" fill="#C5D9BE" />
                  <circle cx="170" cy="55" r="10" fill="#4F46E5" opacity="0.15" />
                  <circle cx="170" cy="55" r="5" fill="#4F46E5" />
                  <circle cx="170" cy="55" r="2.5" fill="white" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Approximate location</p>
                  <p className="text-[11px] text-muted-foreground">{original.location || "Jurong East (approximate)"}</p>
                </div>
                <button onClick={() => setShowSheet(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border">Change</button>
              </div>
            </>
          ) : (
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Approximate location</p>
                <p className="text-[11px] text-muted-foreground">Not sharing location</p>
              </div>
              <button onClick={() => setShowSheet(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border">Add</button>
            </div>
          )}
        </div>

        {/* Visibility */}
        <div>
          <label className="text-xs font-bold mb-2 block">Visibility</label>
          <div className="flex gap-2">
            {(["Private", "Friends-only", "Public"] as const).map((v) => (
              <button key={v} onClick={() => setVisibility(v)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                style={{ borderColor: visibility === v ? ACCENT : "#E5E7EB", backgroundColor: visibility === v ? ACCENT_LIGHT : "white", color: visibility === v ? ACCENT : "#374151" }}>
                {v === "Private" ? "🔒 Private" : v === "Friends-only" ? "👥 Friends" : "🌐 Public"}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200"><p className="text-xs text-red-600">{error}</p></div>}

        <Btn onClick={save}>Save Changes</Btn>
      </div>
    </div>
  );
}

function CheckinCalendarScreen({ goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  const checkinDates = new Set([1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22]);
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="flex flex-col">
      <TopBar title="Monthly Calendar" onBack={goBack} />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-muted">
          <Lock size={12} style={{ color: "#6B7280" }} />
          <p className="text-xs text-muted-foreground font-medium">Private · Only visible to you</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center mb-4">
            <button className="text-muted-foreground p-1"><ChevronLeft size={19} /></button>
            <h3 className="font-bold text-sm">July 2025</h3>
            <button className="text-muted-foreground p-1"><ChevronRight size={19} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(2)].map((_, i) => <div key={`e${i}`} />)}
            {[...Array(31)].map((_, i) => {
              const day = i + 1;
              const has = checkinDates.has(day);
              const today = day === 13;
              return (
                <div key={day} className="aspect-square flex items-center justify-center rounded-full text-xs"
                  style={{ backgroundColor: has ? ACCENT : today ? "#F3F4F6" : "transparent", color: has ? "white" : today ? ACCENT : "#374151", fontWeight: has || today ? 700 : 400 }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ACCENT }} />
          <p className="text-xs text-muted-foreground">Days with saved check-ins</p>
        </div>
      </div>
    </div>
  );
}

// ─── AI ─────────────────────────────────────────────────────────────────────

function AICustomizeScreen({ navigate, goBack, personas, activePersonaId, setEditingPersonaId }: {
  navigate: (s: Screen) => void;
  goBack: () => void;
  personas: Persona[];
  activePersonaId: string;
  setEditingPersonaId: (id: string) => void;
}) {
  const [tryInput, setTryInput] = useState("");
  const activePersona = personas.find((p) => p.id === activePersonaId) || personas[0];

  const responseStyleItems = [
    "Short responses",
    "Friendly and playful",
    "Clear and practical",
  ];

  const handleEditPersona = () => {
    setEditingPersonaId(activePersona.id);
    navigate("edit-persona");
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Your AI Companion" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-5 pb-6">

        {/* Active Persona card */}
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3"
          style={{ borderColor: ACCENT }}>
          <div className="flex items-center gap-3">
            <AvatarCircle name={activePersona.name} size={48} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight">{activePersona.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activePersona.relationship}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activePersona.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activePersona.traits.map((trait) => (
              <span key={trait} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>
                {trait}
              </span>
            ))}
          </div>
          <button
            onClick={handleEditPersona}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: ACCENT }}>
            Edit Persona
          </button>
          <button
            onClick={() => navigate("persona-management")}
            className="text-center text-sm font-semibold py-0.5"
            style={{ color: ACCENT }}>
            Manage Personas
          </button>
        </div>

        {/* Response Style summary */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Response Style</p>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
            {responseStyleItems.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Try Your Persona */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Try Your Persona</p>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <div className="max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed"
                  style={{ backgroundColor: ACCENT, color: "white", borderBottomRightRadius: 4 }}>
                  I have too many assignments and don't know where to start.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AvatarCircle name={activePersona.name} size={24} />
                <div className="max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed"
                  style={{ backgroundColor: "#F3F4F6", color: "#374151", borderBottomLeftRadius: 4 }}>
                  Start with the nearest deadline. List the three most urgent tasks, and we'll deal with the most important one first.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tryInput}
                onChange={(e) => setTryInput(e.target.value)}
                placeholder={`Ask ${activePersona.name} something…`}
                className="flex-1 px-3 py-2 rounded-xl bg-muted text-xs focus:outline-none border border-border"
              />
              <button
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: ACCENT }}>
                <Send size={14} color="white" />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy card */}
        <div className="rounded-2xl border border-border p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} style={{ color: ACCENT }} />
            <p className="text-xs font-bold">Information this Persona can use</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Profile summary, selected interests and the current conversation.
          </p>
          <button className="text-xs font-semibold text-left mt-0.5" style={{ color: ACCENT }}
            onClick={() => navigate("consent-settings")}>
            Review data access
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonaManagementScreen({ navigate, goBack, personas, setPersonas, activePersonaId, setActivePersonaId, setEditingPersonaId }: {
  navigate: (s: Screen) => void;
  goBack: () => void;
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  activePersonaId: string;
  setActivePersonaId: (id: string) => void;
  setEditingPersonaId: (id: string) => void;
}) {
  const [overflowOpenId, setOverflowOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showActiveWarning, setShowActiveWarning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const requestDelete = (id: string) => {
    if (id === activePersonaId) { setShowActiveWarning(true); setOverflowOpenId(null); return; }
    setDeleteConfirmId(id);
    setOverflowOpenId(null);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    setPersonas((prev) => prev.filter((p) => p.id !== deleteConfirmId));
    setDeleteConfirmId(null);
  };

  const handleEdit = (id: string) => {
    setEditingPersonaId(id);
    navigate("edit-persona");
    setOverflowOpenId(null);
  };

  const handleDuplicate = (persona: Persona) => {
    if (personas.length >= 5) { setOverflowOpenId(null); return; }
    const newPersona: Persona = { ...persona, id: `persona-${Date.now()}`, name: `${persona.name} (copy)` };
    setPersonas((prev) => [...prev, newPersona]);
    setOverflowOpenId(null);
  };

  const TEMPLATES = [
    { name: "Study Companion", relationship: "Study partner", description: "Focused, practical and academically supportive.", traits: ["Direct", "Reliable", "Encouraging"] as string[] },
    { name: "Campus Friend", relationship: "My digital friend", description: "Friendly, sociable and campus-aware.", traits: ["Gentle", "Calm", "Playful"] as string[] },
    { name: "Career Coach", relationship: "Coach", description: "Professional, goal-oriented and career-focused.", traits: ["Direct", "Honest", "Encouraging"] as string[] },
    { name: "Event Explorer", relationship: "Guide", description: "Enthusiastic about campus events and discovery.", traits: ["Curious", "Energetic", "Playful"] as string[] },
  ];

  const createPersona = (opts: { name: string; relationship: string; description: string; traits: string[] }) => {
    const newPersona: Persona = {
      id: `persona-${Date.now()}`,
      name: opts.name,
      relationship: opts.relationship,
      description: opts.description,
      traits: opts.traits,
      additionalPersonalityDetails: "",
      interests: ["Campus life"],
      responseLength: "Balanced",
      tones: ["Warm"],
      preferences: { leadWithMainPoint: true, correctWhenWrong: false, lightHumour: false, avoidPraise: false },
      additionalInstructions: "",
    };
    setPersonas((prev) => [...prev, newPersona]);
    setShowAddModal(false);
    setEditingPersonaId(newPersona.id);
    navigate("edit-persona");
  };

  const LABEL_COLORS: Record<string, { bg: string; color: string }> = {
    Warm: { bg: "#FEF3C7", color: "#D97706" },
    Short: { bg: "#D1FAE5", color: "#059669" },
    Honest: { bg: ACCENT_LIGHT, color: ACCENT },
    Direct: { bg: "#F3F4F6", color: "#6B7280" },
    Concise: { bg: "#D1FAE5", color: "#059669" },
  };
  const getLabelStyle = (label: string) => LABEL_COLORS[label] || { bg: "#F3F4F6", color: "#6B7280" };

  return (
    <div className="flex flex-col" onClick={() => overflowOpenId && setOverflowOpenId(null)}>
      <TopBar title="Persona Management" onBack={goBack} />
      <div className="px-5 py-4 pb-6 flex flex-col gap-3">

        {/* Info banner */}
        <div className="rounded-xl px-3.5 py-2.5 flex items-center gap-2" style={{ backgroundColor: ACCENT_LIGHT }}>
          <Info size={13} style={{ color: ACCENT, flexShrink: 0 }} />
          <p className="text-xs font-medium" style={{ color: ACCENT }}>Only one Persona can be active at a time.</p>
        </div>

        {personas.map((persona) => {
          const isActive = persona.id === activePersonaId;
          const isOverflowOpen = overflowOpenId === persona.id;
          const displayLabels = persona.traits.slice(0, 3);

          return (
            <div key={persona.id}
              className="relative rounded-2xl bg-card p-4 flex flex-col gap-3"
              style={{ border: `1.5px solid ${isActive ? ACCENT : "var(--border)"}`, cursor: isActive ? "default" : "pointer" }}
              onClick={() => { if (!isActive && !isOverflowOpen) setActivePersonaId(persona.id); }}>

              <div className="flex items-start gap-3">
                <AvatarCircle name={persona.name} size={40} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm leading-tight">{persona.name}</p>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: ACCENT, color: "white" }}>Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{persona.relationship}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{persona.description}</p>
                  {displayLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {displayLabels.map((label) => {
                        const s = getLabelStyle(label);
                        return (
                          <span key={label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: s.bg, color: s.color }}>{label}</span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Overflow menu */}
                <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOverflowOpenId(isOverflowOpen ? null : persona.id)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    style={{ color: "#9CA3AF" }}>
                    <MoreHorizontal size={16} />
                  </button>
                  {isOverflowOpen && (
                    <div className="absolute right-0 top-9 z-30 w-36 bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                      <button onClick={() => handleEdit(persona.id)}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-2">
                        <Pencil size={12} />Edit
                      </button>
                      <button onClick={() => handleDuplicate(persona)}
                        disabled={personas.length >= 5}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-40">
                        <UserPlus size={12} />Duplicate
                      </button>
                      <div className="h-px bg-border" />
                      <button onClick={() => requestDelete(persona.id)}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                        <Trash2 size={12} />Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {/* Create Persona */}
        {personas.length < 5 ? (
          <button onClick={() => setShowAddModal(true)}
            className="w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-80"
            style={{ borderColor: ACCENT, color: ACCENT, borderStyle: "solid" }}>
            <UserPlus size={15} style={{ color: ACCENT }} />Create Persona
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="w-full py-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: "#D1D5DB", borderColor: "#E5E7EB" }}>
              <UserPlus size={15} />Create Persona
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Maximum of 5 Personas reached.</p>
          </div>
        )}
      </div>

      {/* Add Persona modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="w-full bg-background rounded-t-2xl p-6 flex flex-col gap-4 max-h-[80%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="font-bold text-base">Create a Persona</p>
              <button onClick={() => setShowAddModal(false)} className="p-1"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Templates are starting points — you can customise everything afterwards.</p>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Start from a template</p>
              <div className="flex flex-col gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => createPersona(t)}
                    className="w-full px-4 py-3 rounded-xl border border-border text-left hover:bg-muted transition-colors">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              onClick={() => createPersona({ name: "New Persona", relationship: "My digital friend", description: "", traits: [] })}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold hover:bg-muted transition-colors">
              Create from scratch
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (() => {
        const target = personas.find((p) => p.id === deleteConfirmId);
        return (
          <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <div className="w-full bg-background rounded-t-2xl p-6 flex flex-col gap-4">
              <div className="text-center">
                <p className="font-bold text-base mb-1">Delete Persona?</p>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{target?.name}"</span>?
                </p>
                <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={confirmDelete}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#DC2626" }}>Delete</button>
                <button onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-3 rounded-xl border border-border text-sm font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Active persona warning */}
      {showActiveWarning && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="w-full bg-background rounded-t-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: "#FEF3C7" }}>
                <AlertTriangle size={22} style={{ color: "#D97706" }} />
              </div>
              <p className="font-bold text-base mb-1">Cannot Delete Active Persona</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Select another Persona first, then you can delete this one.
              </p>
            </div>
            <button onClick={() => setShowActiveWarning(false)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: ACCENT }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditPersonaScreen({ goBack, personas, setPersonas, editingPersonaId }: {
  navigate: (s: Screen) => void;
  goBack: () => void;
  personas: Persona[];
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
  editingPersonaId: string;
}) {
  const persona = personas.find((p) => p.id === editingPersonaId) || personas[0];

  const [name, setName] = useState(persona.name);
  const [relationship, setRelationship] = useState(persona.relationship);
  const [description, setDescription] = useState(persona.description);
  const [selectedTraits, setSelectedTraits] = useState<string[]>(persona.traits);
  const [additionalPersonalityDetails, setAdditionalPersonalityDetails] = useState(persona.additionalPersonalityDetails);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(persona.interests);
  const [customInterest, setCustomInterest] = useState("");
  const [responseLength, setResponseLength] = useState<"Short" | "Balanced" | "Detailed">(persona.responseLength);
  const [selectedTones, setSelectedTones] = useState<string[]>(persona.tones);
  const [preferences] = useState(persona.preferences);
  const [additionalInstructions, setAdditionalInstructions] = useState(persona.additionalInstructions);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [toneLimitMsg, setToneLimitMsg] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const ALL_TRAITS = ["Gentle", "Calm", "Honest", "Reliable", "Curious", "Energetic", "Thoughtful", "Confident"];
  const ALL_INTERESTS = ["Music", "Study planning", "Campus life", "Technology", "Events", "Movies"];
  const ALL_TONES = ["Friendly", "Direct", "Supportive", "Playful"];
  const RELATIONSHIPS = ["My digital friend", "Study partner", "Coach", "Guide", "Custom"];

  const PREVIEW_EXAMPLES = [
    {
      user: "I feel overwhelmed by my assignments.",
      reply: "Start with the nearest deadline. List your tasks, and we'll tackle the most urgent one first.",
    },
    {
      user: "I'm nervous about my presentation tomorrow.",
      reply: "That's normal. Run through your opening line twice, then we'll tidy up the rest together.",
    },
    {
      user: "What should I do this weekend on campus?",
      reply: "There's a music night on Saturday. Want me to check what else fits your interests?",
    },
  ];

  const isDirty = () =>
    name !== persona.name || relationship !== persona.relationship || description !== persona.description ||
    JSON.stringify(selectedTraits) !== JSON.stringify(persona.traits) ||
    additionalPersonalityDetails !== persona.additionalPersonalityDetails ||
    JSON.stringify(selectedInterests) !== JSON.stringify(persona.interests) ||
    responseLength !== persona.responseLength ||
    JSON.stringify(selectedTones) !== JSON.stringify(persona.tones) ||
    JSON.stringify(preferences) !== JSON.stringify(persona.preferences) ||
    additionalInstructions !== persona.additionalInstructions;

  const handleBack = () => { if (isDirty()) setShowDiscardDialog(true); else goBack(); };

  const handleSave = () => {
    setPersonas((prev) => prev.map((p) => p.id === editingPersonaId
      ? { ...p, name, relationship, description, traits: selectedTraits, additionalPersonalityDetails, interests: selectedInterests, responseLength, tones: selectedTones, preferences, additionalInstructions }
      : p));
    goBack();
  };

  const toggleTrait = (trait: string) => setSelectedTraits((prev) => {
    if (prev.includes(trait)) return prev.filter((t) => t !== trait);
    if (prev.length >= 5) return prev;
    return [...prev, trait];
  });

  const toggleInterest = (interest: string) => setSelectedInterests((prev) =>
    prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
  );

  const toggleTone = (tone: string) => setSelectedTones((prev) => {
    if (prev.includes(tone)) return prev.filter((t) => t !== tone);
    if (prev.length >= 2) {
      setToneLimitMsg(true);
      setTimeout(() => setToneLimitMsg(false), 2000);
      return prev;
    }
    return [...prev, tone];
  });

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) setSelectedInterests((prev) => [...prev, trimmed]);
    setCustomInterest("");
  };

  const SectionDivider = () => <div className="h-px bg-border" />;

  const previewName = name || persona.name;

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <div className="flex items-center px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="w-9">
          <button onClick={handleBack} className="p-1 rounded-full hover:bg-muted transition-colors">
            <ChevronLeft size={22} />
          </button>
        </div>
        <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">Edit {persona.name}</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 pb-48" style={{ scrollbarWidth: "none" }}>

        {/* Section 1 — Identity */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</p>

          <div>
            <label className="text-xs font-semibold block mb-1.5">Persona Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name"
              className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm border border-transparent focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5">Relationship</label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((rel) => (
                <button key={rel} onClick={() => setRelationship(rel)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ backgroundColor: relationship === rel ? ACCENT : "#F3F4F6", color: relationship === rel ? "white" : "#374151" }}>
                  {rel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Short Introduction</label>
            <p className="text-[11px] text-muted-foreground mb-2">Briefly describe who this Persona is.</p>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="A calm, intelligent and slightly playful digital companion."
              className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm border border-transparent focus:outline-none resize-none" />
          </div>
        </div>

        <SectionDivider />

        {/* Section 2 — Personality */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personality</p>
            <span className="text-[11px] text-muted-foreground">{selectedTraits.length}/5</span>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">Choose up to five traits.</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TRAITS.map((trait) => {
              const selected = selectedTraits.includes(trait);
              return (
                <button key={trait} onClick={() => toggleTrait(trait)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? ACCENT : "#F3F4F6",
                    color: selected ? "white" : "#374151",
                    border: `2px solid ${selected ? ACCENT : "transparent"}`,
                    opacity: !selected && selectedTraits.length >= 5 ? 0.4 : 1,
                  }}>
                  {trait}
                </button>
              );
            })}
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Additional Personality Details</label>
            <textarea rows={2} value={additionalPersonalityDetails}
              onChange={(e) => setAdditionalPersonalityDetails(e.target.value)}
              placeholder="For example: Listens carefully, but does not agree automatically."
              className="w-full px-3 py-2.5 rounded-xl bg-muted text-xs border border-transparent focus:outline-none resize-none" />
          </div>
        </div>

        <SectionDivider />

        {/* Section 3 — Interests */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interests</p>
          <p className="text-[11px] text-muted-foreground -mt-2">
            Interests influence conversation topics and examples, but do not change factual answers.
          </p>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...ALL_INTERESTS, ...selectedInterests])].map((interest) => {
              const selected = selectedInterests.includes(interest);
              return (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? ACCENT : "#F3F4F6",
                    color: selected ? "white" : "#374151",
                    border: `2px solid ${selected ? ACCENT : "transparent"}`,
                  }}>
                  {interest}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input type="text" value={customInterest} onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomInterest()}
              placeholder="Add interest…"
              className="flex-1 px-3 py-2 rounded-xl bg-muted text-xs border border-border focus:outline-none" />
            <button onClick={addCustomInterest}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: ACCENT_LIGHT, color: ACCENT }}>
              + Add
            </button>
          </div>
        </div>

        <SectionDivider />

        {/* Section 4 — Response Style */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Response Style</p>

          <div>
            <label className="text-xs font-semibold block mb-2">Response Length</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(["Short", "Balanced", "Detailed"] as const).map((len) => (
                <button key={len} onClick={() => setResponseLength(len)}
                  className="flex-1 py-2 text-xs font-semibold transition-colors"
                  style={{ backgroundColor: responseLength === len ? ACCENT : "transparent", color: responseLength === len ? "white" : "#6B7280" }}>
                  {len}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-xs font-semibold">Communication Style</label>
              <span className="text-[11px] text-muted-foreground">{selectedTones.length}/2 selected</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Choose up to two ways this Persona communicates.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TONES.map((tone) => {
                const selected = selectedTones.includes(tone);
                return (
                  <button key={tone} onClick={() => toggleTone(tone)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: selected ? ACCENT : "#F3F4F6",
                      color: selected ? "white" : "#374151",
                      border: `2px solid ${selected ? ACCENT : "transparent"}`,
                    }}>
                    {tone}
                  </button>
                );
              })}
            </div>
            {toneLimitMsg && (
              <p className="text-[11px] mt-2" style={{ color: ACCENT }}>Deselect one option first.</p>
            )}
          </div>
        </div>

        <SectionDivider />

        {/* Section 5 — Additional Instructions (accordion) */}
        <div>
          <button onClick={() => setInstructionsExpanded(!instructionsExpanded)}
            className="w-full flex items-center justify-between py-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Instructions</p>
            <ChevronRight size={16} className="text-muted-foreground transition-transform"
              style={{ transform: instructionsExpanded ? "rotate(90deg)" : "none" }} />
          </button>
          <p className="text-[11px] text-muted-foreground mt-1">Add specific preferences not covered by the settings above.</p>
          {instructionsExpanded && (
            <div className="mt-3 flex flex-col gap-1.5">
              <textarea rows={3} value={additionalInstructions} maxLength={500}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="For example: Respond in Chinese and avoid overly formal language."
                className="w-full px-3 py-2.5 rounded-xl bg-muted text-xs border border-border focus:outline-none resize-none" />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Avoid entering passwords or sensitive personal information.</p>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">{additionalInstructions.length}/500</span>
              </div>
            </div>
          )}
        </div>

        <SectionDivider />

        {/* Section 6 — Preview */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview Persona</p>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
            <div className="flex justify-end">
              <div className="max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed"
                style={{ backgroundColor: ACCENT, color: "white", borderBottomRightRadius: 4 }}>
                {PREVIEW_EXAMPLES[previewIndex].user}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AvatarCircle name={previewName} size={24} />
              <div className="max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed"
                style={{ backgroundColor: "#F3F4F6", color: "#374151", borderBottomLeftRadius: 4 }}>
                {PREVIEW_EXAMPLES[previewIndex].reply}
              </div>
            </div>
            <button
              onClick={() => setPreviewIndex((i) => (i + 1) % PREVIEW_EXAMPLES.length)}
              className="text-xs font-semibold self-start mt-0.5"
              style={{ color: ACCENT }}>
              Try another message
            </button>
          </div>
        </div>
      </div>

      {/* Sticky bottom actions */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card flex flex-col gap-2">
        <button onClick={handleSave}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: ACCENT }}>
          Save Changes
        </button>
        <button onClick={handleBack}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
          Cancel
        </button>
      </div>

      {/* Discard dialog */}
      {showDiscardDialog && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="w-full bg-background rounded-t-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <p className="font-bold text-base mb-1">Discard unsaved changes?</p>
              <p className="text-sm text-muted-foreground">Your Persona changes have not been saved.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowDiscardDialog(false)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}>
                Keep Editing
              </button>
              <button onClick={goBack}
                className="w-full py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIAssistantScreen({ navigate, goBack, consent }: { navigate: (s: Screen) => void; goBack: () => void; consent: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const suggested = ["Find campus events this week", "Suggest people I may know", "What can I do today on campus?", "Help me plan a study break"];

  const send = (text: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    const isSafe = !/(medical|diagnos|mental health|legal|emergency|crisis|therapy|prescription)/i.test(msg);
    if (!isSafe) {
      setMessages((p) => [...p, { role: "user", text: msg }, { role: "ai", text: "BOUNDARY" }]);
    } else {
      const replies: Record<string, string> = {
        "Find campus events this week": "Upcoming this week: Future of AI Symposium (Sat, 19 Jul, 2 PM) and NUS Career Fair (Fri, 25 Jul, 10 AM) — both match your Technology and Events interests.",
        "Suggest people I may know": "Based on shared Technology interests, you may want to connect with Priya Nair (CS Year 2) and Wei Zhen Lim (IS Year 2).",
        "What can I do today on campus?": "The Main Library has a Quiet Study Block tomorrow at 10 AM. The Innovation Centre has open facilities until 10 PM today.",
        "Help me plan a study break": "Try a 25-min Pomodoro break at the campus café, or a quick walk to the student lounge on Level 2 of the main building.",
      };
      const reply = replies[msg] || "I can help with campus events, activity suggestions, facility information, and connection suggestions within your consent settings.";
      setMessages((p) => [...p, { role: "user", text: msg }, { role: "ai", text: reply }]);
    }
    setInput("");
  };

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <TopBar title="AI Assistant" onBack={goBack} rightEl={
        <button onClick={() => navigate("ai-customize")}><Settings size={17} /></button>
      } />
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
        {!consent && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700 font-bold">Limited AI mode is active. General suggestions only.</p>
            <button className="text-[11px] mt-0.5 font-semibold" style={{ color: ACCENT }} onClick={() => navigate("consent-settings")}>
              Review consent settings
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: ACCENT }}>
                <Bot size={17} color="white" />
              </div>
              <div>
                <p className="font-bold text-sm">Campus AI</p>
                <p className="text-[11px] text-muted-foreground">How can I help you today?</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {suggested.map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="text-left px-4 py-3 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.text === "BOUNDARY") {
            return (
              <div key={i} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={15} style={{ color: "#DC2626" }} />
                  <p className="font-bold text-sm text-red-700">Boundary Notification</p>
                </div>
                <p className="text-xs text-red-600 leading-relaxed mb-3">
                  I can help with campus navigation, social check-ins, event discovery, and general university information. I cannot provide medical diagnosis, psychological treatment, legal advice, emergency response, crisis intervention, or unsafe advice.
                </p>
                <div className="flex gap-2 mb-2">
                  <button className="flex-1 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold">Campus Security</button>
                  <button className="flex-1 py-1.5 rounded-xl border border-red-300 text-red-600 text-xs font-bold">Wellness Center</button>
                </div>
                <button className="w-full py-1.5 rounded-xl border border-border text-xs font-semibold" onClick={() => setMessages([])}>
                  Start new request
                </button>
              </div>
            );
          }
          return (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed"
                style={{
                  backgroundColor: msg.role === "user" ? ACCENT : "#F3F4F6",
                  color: msg.role === "user" ? "white" : "#374151",
                  borderBottomRightRadius: msg.role === "user" ? 4 : undefined,
                  borderBottomLeftRadius: msg.role === "ai" ? 4 : undefined,
                }}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-border flex-shrink-0">
        <ConsentNote>AI only uses data allowed by your consent and privacy settings.</ConsentNote>
        <div className="flex gap-2 mt-2.5">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send("")}
            placeholder="Ask about campus events, activities..."
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-xs focus:outline-none" />
          <button onClick={() => send("")}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ACCENT }}>
            <Send size={15} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AISafetyScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 gap-5 min-h-full">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-50">
        <AlertTriangle size={26} style={{ color: "#DC2626" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-3 tracking-tight">Boundary Notification</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          I can help with campus navigation, social check-ins, event discovery, and general university information.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          I cannot provide medical diagnosis, psychological treatment, legal advice, emergency response, crisis intervention, or unsafe advice.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <button className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold">Campus Security</button>
        <button className="w-full py-3 rounded-xl border border-border text-sm font-semibold">Wellness Center</button>
        <Btn variant="outline" onClick={() => navigate("ai-assistant")}>Start new request</Btn>
      </div>
    </div>
  );
}

function AILimitedScreen({ navigate, goBack }: { navigate: (s: Screen) => void; goBack: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 gap-5 min-h-full">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
        <Bot size={26} style={{ color: "#D97706" }} />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2 tracking-tight">Limited AI</h2>
        <p className="text-sm font-bold text-amber-600 mb-3">Personalised context is off.</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          I can still provide general campus suggestions, but I will not use your profile details, interests, check-ins, event interest activity, or region.
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <Btn variant="outline" onClick={() => navigate("consent-settings")}>Review consent settings</Btn>
        <Btn onClick={() => navigate("ai-assistant")}>Continue with general suggestions</Btn>
      </div>
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

const LOCATION_POS: Record<string, { x: number; y: number }> = {
  "COM1 Foyer": { x: 62, y: 78 },
  "Science Park": { x: 272, y: 44 },
  "Library": { x: 210, y: 70 },
  "Library Study Zone": { x: 210, y: 70 },
  "Central Library": { x: 130, y: 48 },
  "University Cultural Centre": { x: 210, y: 60 },
  "Science Faculty": { x: 272, y: 44 },
};

function FootprintMap({ entries }: { entries: CheckinEntry[] }) {
  const withLoc = entries.filter((e) => e.location && LOCATION_POS[e.location]);
  const uniqueStops = withLoc.reduce((acc, e) => {
    if (!acc.find((s) => s.label === e.location)) {
      acc.push({ label: e.location!, time: e.time ?? e.date, ...LOCATION_POS[e.location!] });
    }
    return acc;
  }, [] as { label: string; time: string; x: number; y: number }[]);
  if (uniqueStops.length === 0) return null;
  const path = uniqueStops.map((s, i) => (i === 0 ? `M ${s.x} ${s.y}` : `L ${s.x} ${s.y}`)).join(" ");
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Footprint</p>
      </div>
      <svg width="100%" viewBox="0 0 334 120" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
        <rect width="334" height="120" fill="#EEF1F7" />
        <line x1="0" y1="60" x2="334" y2="60" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="90" x2="334" y2="90" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="30" x2="334" y2="30" stroke="#fff" strokeWidth="4" />
        <line x1="90" y1="0" x2="90" y2="120" stroke="#fff" strokeWidth="4" />
        <line x1="170" y1="0" x2="170" y2="120" stroke="#fff" strokeWidth="6" />
        <line x1="245" y1="0" x2="245" y2="120" stroke="#fff" strokeWidth="4" />
        <rect x="4" y="34" width="82" height="22" rx="3" fill="#D9DFE8" />
        <rect x="4" y="64" width="50" height="22" rx="3" fill="#D9DFE8" />
        <rect x="94" y="34" width="70" height="22" rx="3" fill="#D9DFE8" />
        <rect x="94" y="64" width="70" height="22" rx="3" fill="#C5D9BE" />
        <rect x="174" y="34" width="66" height="22" rx="3" fill="#D9DFE8" />
        <rect x="174" y="64" width="66" height="22" rx="3" fill="#D9DFE8" />
        <rect x="249" y="34" width="80" height="22" rx="3" fill="#D9DFE8" />
        <rect x="249" y="64" width="80" height="22" rx="3" fill="#C5D9BE" />
        {uniqueStops.length > 1 && <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />}
        {uniqueStops.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="8" fill="#4F46E5" opacity="0.15" />
            <circle cx={s.x} cy={s.y} r="4.5" fill="#4F46E5" />
            <circle cx={s.x} cy={s.y} r="2" fill="white" />
          </g>
        ))}
        {uniqueStops.length === 1 && <text x={uniqueStops[0].x} y={uniqueStops[0].y + 16} textAnchor="middle" fontSize="7" fill="#4F46E5" fontWeight="600">{uniqueStops[0].label}</text>}
        {uniqueStops.length > 1 && <>
          <text x={uniqueStops[0].x} y={uniqueStops[0].y + 16} textAnchor="middle" fontSize="7" fill="#4F46E5" fontWeight="600">{uniqueStops[0].label}</text>
          <text x={uniqueStops[uniqueStops.length - 1].x} y={uniqueStops[uniqueStops.length - 1].y + 16} textAnchor="middle" fontSize="7" fill="#4F46E5" fontWeight="600">{uniqueStops[uniqueStops.length - 1].label}</text>
        </>}
      </svg>
      <div className="px-4 pb-3 pt-1 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {uniqueStops.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4F46E5" }} />
            <div>
              <p className="text-[10px] font-semibold leading-tight">{s.label}</p>
              <p className="text-[9px] text-muted-foreground">{s.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampusRouteMap({ own = false }: { own?: boolean }) {
  // Simulated check-in waypoints across campus
  const stops = [
    { x: 62, y: 78, label: "COM1 Foyer", time: "Mon 9 AM" },
    { x: 130, y: 48, label: "Central Library", time: "Mon 2 PM" },
    { x: 210, y: 70, label: "University Cultural Centre", time: "Tue 11 AM" },
    { x: 272, y: 44, label: "Science Faculty", time: "Wed 10 AM" },
  ];
  const path = stops.map((s, i) => (i === 0 ? `M ${s.x} ${s.y}` : `L ${s.x} ${s.y}`)).join(" ");
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Footprint</p>
        {own && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold">Friends-only</span>}
      </div>
      <svg width="100%" viewBox="0 0 334 120" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
        {/* Base map */}
        <rect width="334" height="120" fill="#EEF1F7" />
        {/* Road grid */}
        <line x1="0" y1="60" x2="334" y2="60" stroke="#fff" strokeWidth="6" />
        <line x1="0" y1="90" x2="334" y2="90" stroke="#fff" strokeWidth="4" />
        <line x1="0" y1="30" x2="334" y2="30" stroke="#fff" strokeWidth="4" />
        <line x1="90" y1="0" x2="90" y2="120" stroke="#fff" strokeWidth="4" />
        <line x1="170" y1="0" x2="170" y2="120" stroke="#fff" strokeWidth="6" />
        <line x1="245" y1="0" x2="245" y2="120" stroke="#fff" strokeWidth="4" />
        {/* Buildings */}
        <rect x="4" y="34" width="82" height="22" rx="3" fill="#D9DFE8" />
        <rect x="4" y="64" width="50" height="22" rx="3" fill="#D9DFE8" />
        <rect x="94" y="34" width="70" height="22" rx="3" fill="#D9DFE8" />
        <rect x="94" y="64" width="70" height="22" rx="3" fill="#C5D9BE" />
        <rect x="174" y="34" width="66" height="22" rx="3" fill="#D9DFE8" />
        <rect x="174" y="64" width="66" height="22" rx="3" fill="#D9DFE8" />
        <rect x="249" y="34" width="80" height="22" rx="3" fill="#D9DFE8" />
        <rect x="249" y="64" width="80" height="22" rx="3" fill="#C5D9BE" />
        {/* Route path */}
        <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        {/* Stops */}
        {stops.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r="8" fill="#4F46E5" opacity="0.15" />
            <circle cx={s.x} cy={s.y} r="4.5" fill="#4F46E5" />
            <circle cx={s.x} cy={s.y} r="2" fill="white" />
          </g>
        ))}
        {/* Labels for first and last */}
        <text x={stops[0].x} y={stops[0].y + 16} textAnchor="middle" fontSize="7" fill="#4F46E5" fontWeight="600">{stops[0].label}</text>
        <text x={stops[stops.length - 1].x} y={stops[stops.length - 1].y + 16} textAnchor="middle" fontSize="7" fill="#4F46E5" fontWeight="600">{stops[stops.length - 1].label}</text>
      </svg>
      <div className="px-4 pb-3 pt-1 flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {stops.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4F46E5" }} />
            <div>
              <p className="text-[10px] font-semibold leading-tight">{s.label}</p>
              <p className="text-[9px] text-muted-foreground">{s.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ALL_INTERESTS = ["Study", "Technology", "Fitness", "Food", "Music", "Travel", "Sports", "Art", "Events", "Volunteering", "Social", "Gaming"];

function EditProfileScreen({ navigate, goBack, interests, setInterests }: {
  navigate: (s: Screen) => void; goBack: () => void;
  interests: string[]; setInterests: (v: string[]) => void;
}) {
  const [name, setName] = useState("Alex Chen");
  const [handle, setHandle] = useState("new_scholar_24");
  const [school, setSchool] = useState("NUS School of Computing");
  const [bio, setBio] = useState("Interested in AI, tech events, and campus life.");
  const [region, setRegion] = useState("Jurong East");
  const [localInterests, setLocalInterests] = useState(new Set(interests));
  const [saved, setSaved] = useState(false);

  const toggleTag = (tag: string) => {
    setLocalInterests((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  };

  const handleSave = () => {
    setInterests([...localInterests]);
    setSaved(true);
    setTimeout(() => { setSaved(false); goBack(); }, 900);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center px-4 py-3 border-b border-border bg-card">
        <button className="w-9" onClick={goBack}><ChevronLeft size={20} /></button>
        <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">Edit Profile</h1>
        <div className="w-9" />
      </div>
      <div className="flex-1 px-5 py-6 flex flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-border">
          <div className="relative">
            <AvatarCircle name={name || "Alex Chen"} size={72} />
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center">
              <Camera size={12} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Tap to change photo</p>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Display Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-muted text-sm font-medium outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">School / Community</label>
            <input value={school} onChange={(e) => setSchool(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Approximate Region</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-muted text-sm font-medium outline-none focus:ring-2 focus:ring-accent/30" />
            <p className="text-[11px] text-muted-foreground mt-1.5 px-1">Used to show nearby events. Exact address is never stored.</p>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interests</label>
              <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>{localInterests.size} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((tag) => {
                const on = localInterests.has(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: on ? ACCENT : "#F3F4F6",
                      color: on ? "white" : "#374151",
                      border: `2px solid ${on ? ACCENT : "transparent"}`,
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 px-1">Used for recommendations when your consent settings allow it.</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-8 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: saved ? "#059669" : "#4F46E5", color: "#fff" }}
        >
          {saved ? <><Check size={15} /> Saved</> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function OwnProfileScreen({ navigate, routeMapVisible, interests }: { navigate: (s: Screen) => void; routeMapVisible: boolean; interests: string[] }) {
  const entries = [
    { label: "Edit Profile", Icon: Pencil, screen: "profile-edit" as Screen },
    { label: "Check-in Timeline", Icon: Clock, screen: "checkin-timeline" as Screen },
    { label: "Monthly Calendar", Icon: CalendarDays, screen: "checkin-calendar" as Screen },
    { label: "Privacy Settings", Icon: Shield, screen: "privacy-settings" as Screen },
    { label: "Consent Settings", Icon: Lock, screen: "consent-settings" as Screen },
    { label: "Your AI Companion", Icon: Bot, screen: "ai-customize" as Screen },
  ];
  return (
    <div className="flex flex-col">
      <div className="flex items-center px-4 py-3 border-b border-border bg-card">
        <div className="w-9" />
        <h1 className="text-sm font-semibold flex-1 text-center tracking-tight">Profile</h1>
        <div className="w-9" />
      </div>
      <div className="px-5 py-6 flex flex-col items-center gap-3 border-b border-border">
        <div className="relative">
          <AvatarCircle name="Alex Chen" size={76} />
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center">
            <Camera size={12} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight">Alex Chen</h2>
          <p className="text-xs text-muted-foreground">@new_scholar_24</p>
          <p className="text-xs text-muted-foreground">NUS School of Computing</p>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">Interested in AI, tech events, and campus life.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {interests.map((i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-muted">{i}</span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Jurong East (approximate)</span>
          <PrivacyBadge level="Friends-only" />
        </div>
      </div>
      {routeMapVisible && (
        <div className="px-5 pt-4 pb-2">
          <CampusRouteMap own />
        </div>
      )}
      <div className="px-5 py-2 flex flex-col">
        {entries.map(({ label, Icon, screen }) => (
          <button key={label} onClick={() => navigate(screen)}
            className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Icon size={15} />
            </div>
            <span className="flex-1 text-sm font-semibold text-left">{label}</span>
            <ChevronRight size={15} className="text-muted-foreground" />
          </button>
        ))}
      </div>
      <div className="px-5 pb-6 pt-2">
        <button
          onClick={() => navigate("login")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold"
        >
          <LogOut size={15} />
          Log Out
        </button>
      </div>
    </div>
  );
}

function PrivacySettingsScreen({ goBack, routeMapVisible, setRouteMapVisible, defaultCheckinPrivacy, setDefaultCheckinPrivacy }: {
  navigate: (s: Screen) => void; goBack: () => void;
  routeMapVisible: boolean; setRouteMapVisible: (v: boolean) => void;
  defaultCheckinPrivacy: "Public" | "Friends-only" | "Private";
  setDefaultCheckinPrivacy: (v: "Public" | "Friends-only" | "Private") => void;
}) {
  type V = "Private" | "Friends-only" | "Public";
  const [settings, setSettings] = useState<Record<string, V>>({
    "Display name": "Public",
    "Interests": "Public",
    "Region": "Friends-only",
    "Interested events": "Friends-only",
  });
  const [localCheckinPrivacy, setLocalCheckinPrivacy] = useState<"Public" | "Friends-only" | "Private">(defaultCheckinPrivacy);
  const [saved, setSaved] = useState(false);
  const opts: V[] = ["Private", "Friends-only", "Public"];
  const desc: Record<V, string> = { Private: "Only you", "Friends-only": "You and established friends", Public: "All users" };

  const checkinOptions: { value: "Public" | "Friends-only" | "Private"; label: string; desc: string; icon: string }[] = [
    { value: "Public", label: "Public", desc: "Anyone on Campus Connect can see your check-ins.", icon: "🌐" },
    { value: "Friends-only", label: "Friends-only", desc: "Only your established friends can see your check-ins.", icon: "👥" },
    { value: "Private", label: "Private", desc: "Only you can see your check-ins.", icon: "🔒" },
  ];

  const handleSave = () => {
    setDefaultCheckinPrivacy(localCheckinPrivacy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col">
      <TopBar title="Privacy Settings" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-4">

        {/* Campus Route Map toggle */}
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-accent" />
              <p className="font-bold text-sm">Campus Route Map</p>
            </div>
            <button
              onClick={() => setRouteMapVisible(!routeMapVisible)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: routeMapVisible ? ACCENT : "#D1D5DB" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: routeMapVisible ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Show a map of your approximate campus check-in locations on your profile.
            {routeMapVisible ? " Visible to friends based on your check-in visibility settings." : " Currently hidden from all profiles."}
          </p>
        </div>

        {/* Default Check-in Privacy */}
        <div className="rounded-2xl border border-border p-4 flex flex-col gap-3">
          <div>
            <p className="font-bold text-sm">Default Check-in Privacy</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Choose who can see your future check-ins. New check-ins will automatically use this privacy setting.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {checkinOptions.map(({ value, label, desc: d, icon }) => {
              const selected = localCheckinPrivacy === value;
              return (
                <button
                  key={value}
                  onClick={() => setLocalCheckinPrivacy(value)}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-colors w-full"
                  style={{ backgroundColor: selected ? ACCENT_LIGHT : "#F9F9F7", border: `1.5px solid ${selected ? ACCENT : "transparent"}` }}
                >
                  {/* Radio circle */}
                  <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center"
                    style={{ borderColor: selected ? ACCENT : "#9CA3AF", backgroundColor: selected ? ACCENT : "transparent" }}>
                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold">{icon} {label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{d}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {saved && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#D1FAE5" }}>
              <Check size={13} style={{ color: "#059669" }} />
              <p className="text-xs font-semibold" style={{ color: "#059669" }}>Privacy settings updated</p>
            </div>
          )}
          <Btn onClick={handleSave}>Save Changes</Btn>
        </div>

        {/* Other privacy settings */}
        {Object.entries(settings).map(([field, current]) => (
          <div key={field} className="rounded-2xl border border-border p-4">
            <p className="font-bold text-sm mb-3">{field}</p>
            <div className="flex flex-col gap-2">
              {opts.map((opt) => (
                <button key={opt} onClick={() => setSettings((p) => ({ ...p, [field]: opt }))}
                  className="flex items-center justify-between py-2 px-3 rounded-xl transition-colors"
                  style={{ backgroundColor: current === opt ? ACCENT_LIGHT : "#F9F9F7", border: `1.5px solid ${current === opt ? ACCENT : "transparent"}` }}>
                  <div className="flex items-center gap-2"><PrivacyBadge level={opt} /><span className="text-xs text-muted-foreground">{desc[opt]}</span></div>
                  {current === opt && <Check size={13} style={{ color: ACCENT }} />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsentSettingsScreen({ navigate, goBack, consent, setConsent }: {
  navigate: (s: Screen) => void; goBack: () => void; consent: boolean; setConsent: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col">
      <TopBar title="Consent Settings" onBack={goBack} />
      <div className="px-5 py-4 flex flex-col gap-5">
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm">AI Personalisation</p>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-bold"
              style={{ backgroundColor: consent ? "#D1FAE5" : "#FEF3C7", color: consent ? "#059669" : "#D97706" }}>
              {consent ? "Active" : "Off"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {consent
              ? "AI personalisation is active. Your permitted profile data, interests, and event activity may be used for personalised suggestions."
              : "AI personalisation is off. Only general suggestions are available."}
          </p>
          {consent ? (
            <Btn variant="outline" onClick={() => { setConsent(false); navigate("ai-limited"); }}>
              Turn off AI personalisation
            </Btn>
          ) : (
            <Btn onClick={() => setConsent(true)}>Allow AI personalisation</Btn>
          )}
        </div>
        <ConsentNote>
          Turning off AI personalisation prevents future use of profile details, interests, check-ins, event interest activity, and region for AI and recommendation features.
        </ConsentNote>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const ONBOARDING_SCREENS = new Set<Screen>(["login", "register", "verify", "reg-complete", "profile-setup", "interest-setup", "data-consent", "less-personalised", "first-time-privacy"]);

function getNavActive(screen: Screen): string {
  if (["home", "home-limited", "friends-activity"].includes(screen)) return "home";
  if (["friends-page", "friend-requests", "friend-accepted", "friend-declined", "people-list", "friend-request-sent"].includes(screen)) return "friends";
  if (["events-list", "event-detail", "interested-people", "going-people", "event-status-saved", "reg-check"].includes(screen)) return "events";
  if (["ai-assistant", "ai-customize", "ai-safety", "ai-limited", "persona-management"].includes(screen)) return "ai";
  if (["own-profile", "privacy-settings", "consent-settings", "checkin-timeline", "checkin-calendar"].includes(screen)) return "profile";
  return "";
}

export default function App() {
  const [stack, setStack] = useState<Screen[]>(["login"]);
  const [consent, setConsent] = useState(true);
  const [sentRequests, setSentRequests] = useState(new Set<string>());
  const [friends, setFriends] = useState(new Set(["Priya Nair", "Sarah Lim", "Jayden Koh"]));
  const [interestedEvents, setInterestedEvents] = useState(new Set(["ai-symposium"]));
  const [goingEvents, setGoingEvents] = useState(new Set<string>());
  const [bookedEvents, setBookedEvents] = useState(new Set<string>());
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [editCheckinIdx, setEditCheckinIdx] = useState(0);
  const [viewingProfile, setViewingProfile] = useState("Priya Nair");
  const goToProfile = (name: string) => { setViewingProfile(name); navigate("public-profile"); };
  const [viewingEventId, setViewingEventId] = useState("ai-symposium");
  const goToEvent = (id: string) => { setViewingEventId(id); navigate("event-detail"); };
  const [routeMapVisible, setRouteMapVisible] = useState(true);
  const [defaultCheckinPrivacy, setDefaultCheckinPrivacy] = useState<"Public" | "Friends-only" | "Private">("Private");
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState("mio");
  const [editingPersonaId, setEditingPersonaId] = useState("mio");
  const [dismissedRecs, setDismissedRecs] = useState(new Set<string>());
  const [dismissedEvents, setDismissedEvents] = useState(new Set<string>());
  const [profileInterests, setProfileInterests] = useState(["Technology", "Study", "Events", "Fitness"]);

  const current = stack[stack.length - 1];
  const navigate = (s: Screen) => setStack((p) => [...p, s]);
  const goBack = () => setStack((p) => (p.length > 1 ? p.slice(0, -1) : p));

  const sendRequest = (name: string) => setSentRequests((p) => new Set([...p, name]));
  const dismissRec = (id: string) => setDismissedRecs((p) => new Set([...p, id]));
  const dismissEvent = (id: string) => setDismissedEvents((p) => new Set([...p, id]));
  const removeFriend = (name: string) => setFriends((p) => { const n = new Set(p); n.delete(name); return n; });
  const toggleInterest = (id: string) => setInterestedEvents((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleGoing = (id: string) => setGoingEvents((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleBooked = (id: string) => setBookedEvents((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const addCheckin = (item: CheckinItem) => setCheckins((p) => [...p, item]);
  const deleteCheckin = (idx: number) => {
    const seed = 3; // 3 seeded items in timeline
    if (idx >= seed) setCheckins((p) => p.filter((_, i) => i !== idx - seed));
  };
  const updateCheckin = (idx: number, item: CheckinItem) => {
    const seed = 3;
    if (idx >= seed) setCheckins((p) => p.map((c, i) => i === idx - seed ? item : c));
  };

  const showNav = !ONBOARDING_SCREENS.has(current) && current !== "edit-persona";

  const navNavigate = (s: Screen) => setStack([s]);

  const renderScreen = () => {
    const p = { navigate, goBack };
    switch (current) {
      case "login": return <LoginScreen navigate={navigate} />;
      case "register": return <RegisterScreen {...p} />;
      case "verify": return <VerifyScreen {...p} />;
      case "forgot-password": return <ForgotPasswordScreen navigate={navigate} goBack={goBack} />;
      case "reg-complete": return <RegCompleteScreen navigate={navigate} />;
      case "profile-setup": return <ProfileSetupScreen {...p} />;
      case "interest-setup": return <InterestSetupScreen {...p} />;
      case "data-consent": return <DataConsentScreen {...p} setConsent={setConsent} />;
      case "less-personalised": return <LessPersonalisedScreen navigate={navigate} />;
      case "first-time-privacy": return <FirstTimePrivacyScreen navigate={navigate} setDefaultCheckinPrivacy={setDefaultCheckinPrivacy} />;
      case "home": return <HomeScreen navigate={navigate} consent={consent} friends={friends} sentRequests={sentRequests} onSendRequest={sendRequest} dismissedRecs={dismissedRecs} onDismissRec={dismissRec} dismissedEvents={dismissedEvents} onDismissEvent={dismissEvent} goToProfile={goToProfile} interestedEvents={interestedEvents} toggleInterest={toggleInterest} goToEvent={goToEvent} />;
      case "home-limited": return <HomeLimitedScreen navigate={navigate} goToEvent={goToEvent} />;
      case "friends-activity": return <FriendsActivityScreen goBack={goBack} navigate={navigate} goToProfile={goToProfile} />;
      case "people-list": return <PeopleListScreen {...p} friends={friends} sentRequests={sentRequests} onSendRequest={sendRequest} dismissedRecs={dismissedRecs} onDismissRec={dismissRec} goToProfile={goToProfile} />;
      case "find-people": return <FindPeopleScreen {...p} friends={friends} sentRequests={sentRequests} onSendRequest={sendRequest} />;
      case "public-profile": return <PublicProfileScreen {...p} profileName={viewingProfile} sentRequests={sentRequests} onSendRequest={sendRequest} friends={friends} onRemoveFriend={removeFriend} goToEvent={goToEvent} />;
      case "friend-request-sent": return <FriendRequestSentScreen {...p} />;
      case "friend-requests": return <FriendRequestsScreen {...p} />;
      case "friend-accepted": return <FriendAcceptedScreen navigate={navigate} />;
      case "friend-declined": return <FriendDeclinedScreen navigate={navigate} />;
      case "friends-page": return <FriendsPageScreen {...p} />;
      case "events-list": return <EventsListScreen {...p} interestedEvents={interestedEvents} toggleInterest={toggleInterest} dismissedEvents={dismissedEvents} goToEvent={goToEvent} />;
      case "event-detail": return <EventDetailScreen {...p} interestedEvents={interestedEvents} toggleInterest={toggleInterest} goingEvents={goingEvents} toggleGoing={toggleGoing} bookedEvents={bookedEvents} toggleBooked={toggleBooked} goToProfile={goToProfile} eventId={viewingEventId} />;
      case "event-status-saved": return <EventStatusSavedScreen {...p} />;
      case "reg-check": return <RegistrationCheckScreen goBack={goBack} toggleGoing={toggleGoing} isGoing={goingEvents.has("ai-symposium")} />;
      case "interested-people": return <InterestedPeopleScreen {...p} goToProfile={goToProfile} />;
      case "going-people": return <GoingPeopleScreen {...p} isGoing={goingEvents.has("ai-symposium")} goToProfile={goToProfile} />;
      case "checkin": return <CheckinScreen {...p} addCheckin={addCheckin} defaultCheckinPrivacy={defaultCheckinPrivacy} />;
      case "checkin-success": return <CheckinSuccessScreen navigate={navigate} checkins={checkins} />;
      case "checkin-timeline": return <CheckinTimelineScreen {...p} checkins={checkins} deleteCheckin={deleteCheckin} setEditCheckin={setEditCheckinIdx} />;
      case "checkin-edit": return <CheckinEditScreen {...p} checkins={checkins} editIdx={editCheckinIdx} updateCheckin={updateCheckin} />;
      case "checkin-calendar": return <CheckinCalendarScreen navigate={navigate} goBack={goBack} />;
      case "ai-customize": return <AICustomizeScreen {...p} personas={personas} activePersonaId={activePersonaId} setEditingPersonaId={setEditingPersonaId} />;
      case "persona-management": return <PersonaManagementScreen {...p} personas={personas} setPersonas={setPersonas} activePersonaId={activePersonaId} setActivePersonaId={setActivePersonaId} setEditingPersonaId={setEditingPersonaId} />;
      case "edit-persona": return <EditPersonaScreen {...p} personas={personas} setPersonas={setPersonas} editingPersonaId={editingPersonaId} />;
      case "ai-assistant": return <AIAssistantScreen {...p} consent={consent} />;
      case "ai-safety": return <AISafetyScreen {...p} />;
      case "ai-limited": return <AILimitedScreen {...p} />;
      case "own-profile": return <OwnProfileScreen navigate={navigate} routeMapVisible={routeMapVisible} interests={profileInterests} />;
      case "profile-edit": return <EditProfileScreen navigate={navigate} goBack={goBack} interests={profileInterests} setInterests={setProfileInterests} />;
      case "privacy-settings": return <PrivacySettingsScreen navigate={navigate} goBack={goBack} routeMapVisible={routeMapVisible} setRouteMapVisible={setRouteMapVisible} defaultCheckinPrivacy={defaultCheckinPrivacy} setDefaultCheckinPrivacy={setDefaultCheckinPrivacy} />;
      case "consent-settings": return <ConsentSettingsScreen {...p} consent={consent} setConsent={setConsent} />;
      default: return <LoginScreen navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#E8E8E6", fontFamily: "'Outfit', sans-serif" }}>
      {/* Screen guide */}
      <div className="absolute top-4 left-4 right-4 flex justify-center">
        
      </div>

      {/* iPhone Frame */}
      <div className="relative flex-shrink-0" style={{ width: 390, height: 844 }}>
        {/* Outer shell */}
        <div className="absolute inset-0 rounded-[46px] shadow-2xl" style={{ backgroundColor: "#1C1C1E", padding: 10 }}>
          {/* Side buttons */}
          <div className="absolute left-[-3px] top-[120px] w-[3px] h-[34px] bg-[#2C2C2E] rounded-l-sm" />
          <div className="absolute left-[-3px] top-[164px] w-[3px] h-[60px] bg-[#2C2C2E] rounded-l-sm" />
          <div className="absolute left-[-3px] top-[232px] w-[3px] h-[60px] bg-[#2C2C2E] rounded-l-sm" />
          <div className="absolute right-[-3px] top-[160px] w-[3px] h-[80px] bg-[#2C2C2E] rounded-r-sm" />

          <div className="w-full h-full rounded-[38px] overflow-hidden bg-background flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {/* Dynamic island */}
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-50 w-28 h-8 bg-[#1C1C1E] rounded-full" style={{ top: 14 }} />

            <StatusBar />

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {renderScreen()}
            </div>

            {showNav && <BottomNav active={getNavActive(current)} navigate={navNavigate} />}
          </div>
        </div>
      </div>
    </div>
  );
}
