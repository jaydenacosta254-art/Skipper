import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Activity, ArrowRight, Bell, ChevronDown, CircleHelp, Gamepad2, Gauge, Globe,
  Hash, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search,
  Settings, Shield, Sparkles, Users, X, Zap, Trophy, Brain, Puzzle, Compass, Joystick, PartyPopper, CarFront, Goal, CalendarDays, UserRound,
  Medal, Flame, Star, Palette, Crown, CheckCircle2, Gift, Target
} from "lucide-react";
import { supabase } from "./supabase";
import NexusFeatures from "./NexusFeatures";
import NexusWorld from "./NexusWorld";
import NexusUpgradeCenter from "./NexusUpgradeCenter";
import NexusSiteManager from "./NexusSiteManager";
import { AdminSeasonalEvents, SeasonalEventsPage } from "./NexusEvents";

const API = "https://nexus-api-7rxk.onrender.com";
const starterGames = [
  {
    name: "Retro Bowl",
    type: "Sports",
    players: "Single-player",
    mode: "single",
    color: "green",
    icon: "🏈",
    description: "Play the retro-style American football game.",
    externalUrl: "https://retro-bowl-six.vercel.app"
  },
  {
    name: "Eaglercraft 1.8.8",
    type: "Adventure",
    players: "Single-player · Online servers",
    mode: "single",
    color: "green",
    icon: "⛏️",
    description: "Explore, build, and play a Minecraft-style browser world.",
    externalUrl: "https://eaglercraft.q13x.com/1.8.8_2/js/"
  },
  {
    name: "Roof Top Run",
    type: "Adventure",
    players: "Single-player",
    mode: "single",
    color: "orange",
    icon: "🏃",
    description: "Run, jump, and race across the rooftops in Roof Top Run.",
    externalUrl: "/Skipper/rooftoprun/index.html"
  },
  {
    name: "Chicken Royale",
    type: "Adventure",
    players: "Single-player",
    mode: "single",
    color: "blue",
    icon: "🏫",
    description: "Drop into Chicken Royale and battle to be the last player standing.",
    externalUrl: "/Skipper/classroom/index.html"
  },
  {
    name: "OpenGuessr",
    type: "Puzzle",
    players: "Single-player",
    mode: "single",
    color: "blue",
    icon: "🌍",
    description: "Explore real-world locations and guess where you are.",
    externalUrl: "https://openguessr.com/"
  },
  {
    name: "Basket Bros",
    type: "Sports",
    players: "1v1 · Online / local",
    mode: "external-multiplayer",
    color: "orange",
    icon: "🏀",
    description: "Challenge someone to a fast-paced one-on-one basketball match.",
    externalUrl: "https://basketbros.io/"
  }
];;

const PROFILE_BACKGROUNDS = {
  violet: "linear-gradient(135deg, #6546b8, #24224f)",
  sunset: "linear-gradient(135deg, #e47761, #68418e)",
  ocean: "linear-gradient(135deg, #167b9e, #21365e)",
  forest: "linear-gradient(135deg, #28795c, #183a3b)",
  midnight: "linear-gradient(135deg, #30364e, #111827)"
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [guestProfile, setGuestProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("nexus_guest_profile") || "null"); } catch { return null; } });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: "", avatar_url: "", bio: "", status: "Available" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [guest, setGuest] = useState(() => localStorage.getItem("nexus_guest") || "");
  const [page, setPage] = useState("home");
  const [worldGameToOpen, setWorldGameToOpen] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatFile, setChatFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [dmTarget, setDmTarget] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmText, setDmText] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [gameSubmissions, setGameSubmissions] = useState([]);
  const [channel, setChannel] = useState("general");
  const [rooms, setRooms] = useState([]);
  const [myLobby, setMyLobby] = useState(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyError, setLobbyError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (!searchOpen) return;
    const closeSearchOnOutsideClick = (event) => {
      const target = event.target;
      const clickedInsideSearch = target instanceof Element && target.closest(".search-wrap");
      if (!clickedInsideSearch) setSearchOpen(false);
    };
    // Capture phase ensures other components cannot stop the outside-click handler.
    document.addEventListener("pointerdown", closeSearchOnOutsideClick, true);
    document.addEventListener("click", closeSearchOnOutsideClick, true);
    return () => {
      document.removeEventListener("pointerdown", closeSearchOnOutsideClick, true);
      document.removeEventListener("click", closeSearchOnOutsideClick, true);
    };
  }, [searchOpen]);
  const [adminStats, setAdminStats] = useState({ online: 0, rooms: 0, games: 3 });
  const [playerStats, setPlayerStats] = useState({ xp: 0, level: 1, games_played: 0, daily_claim_date: null, selected_theme: "violet" });
  const [activityFeed, setActivityFeed] = useState([]);
  const [playerLeaderboard, setPlayerLeaderboard] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [siteGames, setSiteGames] = useState(starterGames);
  const [siteAnnouncements, setSiteAnnouncements] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ allowGameSubmissions: true, showOnlineStats: true });
  const [siteConfigBusy, setSiteConfigBusy] = useState(false);

  const username = profile?.username || guestProfile?.username || guest || "Guest";
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!supabase) return;
    supabase.from("nexus_site_config").select("games, announcements, settings").eq("id", "main").maybeSingle().then(({ data, error }) => {
      if (error) { console.warn("NEXUS site config is not available yet:", error.message); return; }
      if (data) {
        if (Array.isArray(data.games) && data.games.length) setSiteGames(data.games);
        if (Array.isArray(data.announcements)) setSiteAnnouncements(data.announcements);
        if (data.settings && typeof data.settings === "object") setSiteSettings(old => ({ ...old, ...data.settings }));
      }
    });
  }, []);

  async function saveSiteConfig(next) {
    if (!supabase || !session?.user || !isAdmin) throw new Error("Admin sign-in is required to save site settings.");
    setSiteConfigBusy(true);
    try {
      const { error } = await supabase.from("nexus_site_config").upsert({
        id: "main", games: next.games, announcements: next.announcements,
        settings: next.settings, updated_by: session.user.id, updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (error) throw error;
      setSiteGames(next.games); setSiteAnnouncements(next.announcements); setSiteSettings(next.settings);
      setNotice("NEXUS site content and settings saved.");
    } finally { setSiteConfigBusy(false); }
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user || !supabase) { setProfile(null); return; }
    let cancelled = false;
    async function loadProfile() {
      const user = session.user;
      const { data } = await supabase.from("profiles").select("username, role, avatar_url, bio, status, profile_attributes, profile_background").eq("id", user.id).maybeSingle();
      if (data) {
        if (!cancelled) setProfile(data);
        return;
      }
      const metadataName = String(user.user_metadata?.username || user.email?.split("@")[0] || "member").trim().slice(0, 24);
      const cleanName = metadataName.length >= 2 ? metadataName : `member_${user.id.slice(0, 8)}`;
      let { data: created, error } = await supabase.from("profiles").upsert(
        { id: user.id, username: cleanName, role: "member", avatar_url: null, bio: "", status: "Available", profile_attributes: [], profile_background: "violet" }, { onConflict: "id" }
      ).select("username, role, avatar_url, bio, status, profile_attributes, profile_background").single();
      if (error) {
        const fallbackName = `${cleanName.slice(0, 15)}_${user.id.slice(0, 6)}`;
        const retry = await supabase.from("profiles").upsert(
          { id: user.id, username: fallbackName, role: "member" }, { onConflict: "id" }
        ).select("username, role, avatar_url, bio, status, profile_attributes, profile_background").single();
        created = retry.data;
      }
      if (!cancelled) setProfile(created || { username: cleanName, role: "member" });
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [session]);


  useEffect(() => {
    let cancelled = false;
    const guestKey = "nexus_player_stats_" + username.toLowerCase();
    if (!session?.user || !supabase) {
      try {
        const saved = JSON.parse(localStorage.getItem(guestKey) || "null");
        setPlayerStats(saved || { xp: 0, level: 1, games_played: 0, daily_claim_date: null, selected_theme: "violet" });
      } catch {}
      return () => { cancelled = true; };
    }
    setRewardsLoading(true);
    Promise.all([
      supabase.from("nexus_player_stats").select("xp,level,games_played,daily_claim_date,selected_theme").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("friend_requests").select("sender_id,receiver_id").eq("status", "accepted"),
      supabase.from("nexus_player_stats").select("username,xp,level,games_played").order("xp", { ascending: false }).limit(10)
    ]).then(async ([statsResult, friendsResult, leaderboardResult]) => {
      if (cancelled) return;
      if (statsResult.data) setPlayerStats(statsResult.data);
      else setPlayerStats({ xp: 0, level: 1, games_played: 0, daily_claim_date: null, selected_theme: "violet" });
      const friendIds = (friendsResult.data || []).map(row => row.sender_id === session.user.id ? row.receiver_id : row.sender_id);
      const activityResult = friendIds.length
        ? await supabase.from("nexus_game_activity").select("username,activity_type,detail,created_at").in("user_id", friendIds).order("created_at", { ascending: false }).limit(12)
        : { data: [] };
      setActivityFeed(activityResult.data || []);
      setPlayerLeaderboard(leaderboardResult.data || []);
      setRewardsLoading(false);
    }).catch(() => setRewardsLoading(false));
    return () => { cancelled = true; };
  }, [session, username]);

  useEffect(() => {
    if (!username || username === "Guest") return;
    const s = io(API || window.location.origin, { transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("connect", () => s.emit("presence:join", { username }));
    s.on("presence:update", setOnline);
    s.on("chat:message", m => setMessages(old => [...old.filter(x => x.id !== m.id).slice(-99), m]));
    s.on("chat:history", history => setMessages(history || []));
    s.on("message:updated", m => setMessages(old => old.map(x => x.id === m.id ? m : x)));
    s.on("message:deleted", ({ id }) => setMessages(old => old.filter(x => x.id !== id)));
    s.on("chat:system", m => setMessages(old => [...old, { ...m, system: true }]));
    s.on("lobby:list", setRooms);
    s.on("lobby:created", lobby => { setMyLobby(lobby); setPage("games"); });
    s.on("lobby:update", setMyLobby);
    s.on("lobby:error", setLobbyError);
    s.on("game:started", info => setNotice(`${info.game} is starting! Players: ${info.players.join(", ")}`));
    fetch(`${API}/api/stats`).then(r => r.json()).then(setAdminStats).catch(() => {});
    return () => s.disconnect();
  }, [username]);

  useEffect(() => { if (socket) socket.emit("chat:join", { channel }); }, [socket, channel]);

  useEffect(() => {
    if (!session?.user || !supabase) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from("friend_requests").select("*").or("sender_id.eq." + uid + ",receiver_id.eq." + uid).order("created_at", { ascending: false }),
      supabase.from("nexus_notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(30)
    ]).then(([friendsResult, notesResult]) => {
      setFriendRequests(friendsResult.data || []);
      setNotifications(notesResult.data || []);
    });
    if (profile?.role === "admin") {
      supabase.from("chat_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).then(({data}) => setReports(data || []));
      supabase.from("game_submissions").select("*").eq("status", "pending").order("created_at", { ascending: false }).then(({data}) => setGameSubmissions(data || []));
    }
  }, [session, profile]);

  const initials = username.slice(0, 1).toUpperCase();
  const nav = [
    { id: "home", label: "Overview", icon: LayoutDashboard },
    { id: "games", label: "Games & lobbies", icon: Gamepad2 },
    { id: "rewards", label: "Rewards & levels", icon: Trophy },
    { id: "chat", label: "Community chat", icon: MessageCircle },
    { id: "friends", label: "People", icon: Users },
    { id: "events", label: "Seasonal events", icon: CalendarDays },
    { id: "features", label: "Everything hub", icon: Sparkles },
    { id: "profile", label: "Edit profile", icon: UserRound },
    { id: "world", label: "NEXUS World", icon: Globe },
    ...(isAdmin ? [{ id: "admin", label: "Admin panel", icon: Shield }] : [])
  ];
  const searchTerm = globalSearch.trim().toLowerCase();
  const searchResults = searchTerm ? [
    ...nav.filter(item => item.label.toLowerCase().includes(searchTerm)).map(item => ({type:"Section",title:item.label,detail:"Open this section",page:item.id})),
    ...siteGames.filter(game => (game.name+" "+game.type+" "+game.description).toLowerCase().includes(searchTerm)).map(game => ({type:"Game",title:game.name,detail:game.type+" · "+game.players,page:"games"})),
    ...online.filter(name => name.toLowerCase().includes(searchTerm)).map(name => ({type:"Member",title:name,detail:"Currently online",page:"friends"})),
    ...messages.filter(message => !message.system && ((message.text||message.message||"").toLowerCase().includes(searchTerm) || (message.username||"").toLowerCase().includes(searchTerm))).slice(-5).reverse().map(message => ({type:"Chat message",title:message.username||"Community member",detail:String(message.text||message.message||"").slice(0,90),page:"chat"}))
  ].slice(0,9) : [];
  function openSearchResult(result) { if (result.page === "profile") openProfilePage(); else setPage(result.page); setGlobalSearch(""); setSearchOpen(false); setNotice(result.type==="Chat message" ? "Opened community chat. Search for the message there." : result.type==="Game" ? "Opened the Games hub." : result.type==="Member" ? "Opened People to view members." : "Opened "+result.title+"."); }

  async function submitAuth(e) {
    e.preventDefault(); setAuthError(""); setAuthSuccess(""); setAuthBusy(true);
    try {
      if (!supabase) throw new Error("Connect Supabase first. See the README setup guide, or continue as a guest.");
      if (authMode === "signup") {
        const cleanName = usernameInput.trim() || email.split("@")[0];
        if (cleanName.length < 2) throw new Error("Username must be at least 2 characters.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: cleanName }
          }
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          setAuthSuccess("Account created! You're now signed in to Nexus.");
        } else {
          setAuthError("Your account was created, but Supabase is still requiring email confirmation. Turn off email confirmations in Supabase Authentication settings, then try signing up again.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) { setAuthError(err.message || "Something went wrong."); }
    finally { setAuthBusy(false); }
  }

  function prepareProfileDraft() {
    setProfileDraft({
      username,
      avatar_url: profile?.avatar_url || guestProfile?.avatar_url || "",
      bio: profile?.bio || guestProfile?.bio || "",
      status: profile?.status || guestProfile?.status || "Available",
      profile_attributes: profile?.profile_attributes || guestProfile?.profile_attributes || [],
      profile_background: profile?.profile_background || guestProfile?.profile_background || "violet"
    });
    setProfileError(""); setProfileFile(null);
  }
  function openProfileEditor() {
    prepareProfileDraft();
    setProfileOpen(true);
  }
  function openProfilePage() {
    prepareProfileDraft();
    setProfileOpen(false);
    setPage("profile");
  }
  async function saveProfile(e) {
    e.preventDefault(); setProfileError("");
    const allowedStatuses = ["Available", "Away", "Busy", "Do Not Disturb"];
    const clean = { username: profileDraft.username.trim().slice(0,24), avatar_url: profileDraft.avatar_url.trim(), bio: profileDraft.bio.trim().slice(0,160), status: allowedStatuses.includes(profileDraft.status) ? profileDraft.status : "Available", profile_attributes: [...new Set((Array.isArray(profileDraft.profile_attributes) ? profileDraft.profile_attributes : []).map(value => String(value).trim().slice(0,20)).filter(Boolean))].slice(0,5), profile_background: Object.hasOwn(PROFILE_BACKGROUNDS, profileDraft.profile_background) ? profileDraft.profile_background : "violet" };
    if (profileFile && (!profileFile.type.startsWith("image/") || profileFile.size > 5 * 1024 * 1024)) return setProfileError("Choose an image smaller than 5 MB.");
    if (profileFile && (!session?.user || !supabase)) return setProfileError("File uploads require a signed-in account. You can still use an image URL.");
    if (clean.username.length < 2) return setProfileError("Username must be at least 2 characters.");
    if (session?.user && supabase) {
      setProfileBusy(true);
      try {
        if (profileFile) {
          const safeName = profileFile.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
          const filePath = `${session.user.id}/${Date.now()}-${safeName || "avatar"}`;
          const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(filePath, profileFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: profileFile.type
          });
          if (uploadError) throw uploadError;
          const { data: publicData } = supabase.storage.from("profile-avatars").getPublicUrl(filePath);
          clean.avatar_url = publicData.publicUrl;
        }
        const { data, error } = await supabase.from("profiles").update(clean).eq("id", session.user.id).select("username, role, avatar_url, bio, status, profile_attributes, profile_background").single();
        if (error) throw error;
        setProfile(data);
        setProfileDraft({ ...clean });
        setProfileFile(null);
      } catch (err) {
        setProfileBusy(false);
        return setProfileError(err.message || "The profile picture could not be uploaded.");
      }
      setProfileBusy(false);
    } else {
      const next = { ...clean };
      setGuestProfile(next); localStorage.setItem("nexus_guest_profile", JSON.stringify(next));
      if (guest) { localStorage.setItem("nexus_guest", clean.username); setGuest(clean.username); }
    }
    setProfileOpen(false); setNotice("Your profile has been updated.");
  }
  function enterGuest(e) {
    e.preventDefault();
    const name = usernameInput.trim().slice(0, 24);
    if (!name) return setAuthError("Choose a username first.");
    localStorage.setItem("nexus_guest", name); setGuest(name); setAuthError("");
  }
  async function signOut() {
    if (supabase && session) await supabase.auth.signOut();
    localStorage.removeItem("nexus_guest"); setGuest(""); setProfile(null); setSession(null);
  }
  function sendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || !socket) return;
    socket.emit("chat:message", { channel, username, text: messageText });
    setMessageText("");
  }
  async function sendChatMessage(e) {
    e.preventDefault();
    if ((!messageText.trim() && !chatFile) || !socket) return;
    let attachment = null;
    if (chatFile) {
      if (!session?.user || !supabase) return setNotice("Sign in to upload chat attachments.");
      if (chatFile.size > 10 * 1024 * 1024) return setNotice("Attachments must be 10 MB or smaller.");
      const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = session.user.id + "/" + Date.now() + "-" + safeName;
      const { error } = await supabase.storage.from("chat-uploads").upload(path, chatFile);
      if (error) return setNotice(error.message);
      attachment = { name: chatFile.name, url: supabase.storage.from("chat-uploads").getPublicUrl(path).data.publicUrl };
    }
    socket.emit("chat:message", { channel, username, text: messageText.trim(), attachment, replyTo: replyTo ? { id: replyTo.id, username: replyTo.username, text: replyTo.text } : null });
    setMessageText(""); setChatFile(null); setReplyTo(null);
  }
  function reactToMessage(messageId, emoji) { socket?.emit("message:react", { channel, messageId, emoji, username }); }
  function editMessage(message) {
    const next = window.prompt("Edit your message:", message.text);
    if (next?.trim()) socket?.emit("message:edit", { channel, messageId: message.id, username, text: next });
  }
  function deleteMessage(message) {
    if (window.confirm("Delete this message?")) socket?.emit("message:delete", { channel, messageId: message.id, username });
  }
  async function blockUser(targetName) {
    if (!session?.user || !supabase) return setNotice("Sign in to block members.");
    const { data: target } = await supabase.from("profiles").select("id").eq("username", targetName).maybeSingle();
    if (!target || target.id === session.user.id) return setNotice("That account could not be found.");
    const { error } = await supabase.from("blocked_users").upsert({ blocker_id: session.user.id, blocked_id: target.id }, { onConflict: "blocker_id,blocked_id" });
    setNotice(error ? error.message : "Member blocked.");
  }
  async function addFriend(targetName) {
    if (!session?.user || !supabase) return setNotice("Sign in to add friends.");
    const { data: target } = await supabase.from("profiles").select("id,username").eq("username", targetName).maybeSingle();
    if (!target || target.id === session.user.id) return setNotice("That account could not be found.");
    const { error } = await supabase.from("friend_requests").insert({ sender_id: session.user.id, receiver_id: target.id });
    if (error) return setNotice(error.message);
    await supabase.from("nexus_notifications").insert({ user_id: target.id, actor_id: session.user.id, kind: "friend_request", body: username + " sent you a friend request." });
    setNotice("Friend request sent to " + target.username + ".");
  }
  async function respondFriend(request, accept) {
    const { error } = await supabase.from("friend_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", request.id);
    if (error) return setNotice(error.message);
    setFriendRequests(old => old.map(x => x.id === request.id ? { ...x, status: accept ? "accepted" : "declined" } : x));
    if (accept) await supabase.from("nexus_notifications").insert({ user_id: request.sender_id, actor_id: session.user.id, kind: "friend_accepted", body: username + " accepted your friend request." });
  }
  async function openDM(displayName) {
    if (!session?.user) return setNotice("Sign in to send private messages.");
    const { data: target } = await supabase.from("profiles").select("id,username").eq("username", displayName).maybeSingle();
    if (!target) return setNotice("That member needs a registered account for private messages.");
    const userId = target.id;
    setDmTarget({ id: userId, username: target.username });
    const uid = session.user.id;
    const { data, error } = await supabase.from("direct_messages").select("*").or("and(sender_id.eq." + uid + ",receiver_id.eq." + userId + "),and(sender_id.eq." + userId + ",receiver_id.eq." + uid + ")").order("created_at");
    if (error) setNotice(error.message); else setDmMessages(data || []);
  }
  async function sendDM(e) {
    e.preventDefault();
    if (!dmTarget || !dmText.trim()) return;
    const { data, error } = await supabase.from("direct_messages").insert({ sender_id: session.user.id, receiver_id: dmTarget.id, body: dmText.trim() }).select().single();
    if (error) return setNotice(error.message);
    setDmMessages(old => [...old, data]); setDmText("");
    await supabase.from("nexus_notifications").insert({ user_id: dmTarget.id, actor_id: session.user.id, kind: "direct_message", body: "New message from " + username + "." });
  }
  async function markNotificationRead(note) {
    await supabase.from("nexus_notifications").update({ read: true }).eq("id", note.id);
    setNotifications(old => old.map(n => n.id === note.id ? { ...n, read: true } : n));
  }
  async function reportMessage(message) {
    if (!session?.user || !supabase) return setNotice("Sign in to report messages.");
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    const { error } = await supabase.from("chat_reports").insert({ reporter_id: session.user.id, message_id: message.id, channel, reported_username: message.username, message_text: message.text || "", reason: reason.trim() });
    setNotice(error ? error.message : "Report submitted to moderators.");
  }
  async function reviewGameSubmission(item, status) {
    const { error } = await supabase.from("game_submissions").update({ status }).eq("id", item.id);
    if (error) return setNotice(error.message);
    setGameSubmissions(old => old.filter(x => x.id !== item.id));
    setNotice("Game submission " + status + ".");
  }
  async function updateReport(report, status) {
    const { error } = await supabase.from("chat_reports").update({ status }).eq("id", report.id);
    if (error) return setNotice(error.message);
    setReports(old => old.filter(r => r.id !== report.id));
  }


  async function savePlayerStats(next) {
    setPlayerStats(next);
    if (!session?.user || !supabase) {
      localStorage.setItem("nexus_player_stats_" + username.toLowerCase(), JSON.stringify(next));
      return;
    }
    const { error } = await supabase.from("nexus_player_stats").upsert({ user_id: session.user.id, username, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) setNotice("Rewards could not sync. Run the NEXUS rewards SQL setup in Supabase.");
  }
  async function recordGame(gameName) {
    const key = "nexus_played_today_" + username.toLowerCase();
    const today = new Date().toISOString().slice(0,10);
    let played = {};
    try { played = JSON.parse(localStorage.getItem(key) || "{}"); } catch {}
    if (played[gameName] === today) return;
    played[gameName] = today;
    localStorage.setItem(key, JSON.stringify(played));
    const xp = (playerStats.xp || 0) + 10;
    await savePlayerStats({ ...playerStats, xp, level: Math.floor(xp / 100) + 1, games_played: (playerStats.games_played || 0) + 1 });
    const activity = { username, activity_type: "played", detail: "Played " + gameName, created_at: new Date().toISOString() };
    setActivityFeed(old => [activity, ...old].slice(0,12));
    if (session?.user && supabase) await supabase.from("nexus_game_activity").insert({ user_id: session.user.id, ...activity });
    setNotice("You earned 10 XP for playing " + gameName + "!");
  }
  async function claimDailyChallenge() {
    const today = new Date().toISOString().slice(0,10);
    if (playerStats.daily_claim_date === today) return setNotice("You already claimed today's challenge reward.");
    const xp = (playerStats.xp || 0) + 25;
    await savePlayerStats({ ...playerStats, xp, level: Math.floor(xp / 100) + 1, daily_claim_date: today });
    const activity = { username, activity_type: "challenge", detail: "Completed the daily NEXUS challenge", created_at: new Date().toISOString() };
    setActivityFeed(old => [activity, ...old].slice(0,12));
    if (session?.user && supabase) await supabase.from("nexus_game_activity").insert({ user_id: session.user.id, ...activity });
    setNotice("Daily challenge complete! You earned 25 XP.");
  }
  async function chooseTheme(theme) { await savePlayerStats({ ...playerStats, selected_theme: theme }); }
  function createLobby(game, isPrivate = false) { setLobbyError(""); socket?.emit("lobby:create", { username, game, isPrivate }); recordGame(game); }
  function joinLobby(code) { setLobbyError(""); socket?.emit("lobby:join", { username, code }); }
  function leaveLobby() { socket?.emit("lobby:leave", { username, code: myLobby?.code }); setMyLobby(null); }
  function startLobby() { socket?.emit("lobby:start", { username, code: myLobby?.code }); }

  if (!session && !guest) return <AuthScreen {...{
    authMode, setAuthMode, email, setEmail, password, setPassword,
    usernameInput, setUsernameInput, authError, authSuccess, authBusy, submitAuth, enterGuest
  }} />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>NEXUS</span><button className="mobile-close icon-btn" onClick={() => setMobileNav(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
      <div className="workspace-card"><div className="workspace-icon">N</div><div><b>Nexus Community</b><small>Free community</small></div><span className="online-dot"/></div>
      <div className="nav-label">MENU</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { if (item.id === "profile") openProfilePage(); else setPage(item.id); setMobileNav(false); }}><item.icon size={18}/><span>{item.label}</span>{item.id === "chat" && <i className="nav-ping"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Explore the community and find your next game.</p><button onClick={() => setPage("games")}>Explore games <ArrowRight size={14}/></button></div><div className="user-card"><button className="profile-trigger" onClick={openProfileEditor} title="Edit your profile"><ProfileAvatar username={username} url={profile?.avatar_url || guestProfile?.avatar_url}/><span className="user-meta"><b>{username}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></span></button><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{nav.find(n => n.id === page)?.label || "Overview"}</b></div><div className="top-actions"><div className="search-wrap"><div className="search-box"><Search size={16}/><input value={globalSearch} placeholder="Search Nexus..." aria-label="Search NEXUS" onFocus={()=>setSearchOpen(true)} onChange={e=>{setGlobalSearch(e.target.value);setSearchOpen(true);}} onKeyDown={e=>{if(e.key==="Escape"){setSearchOpen(false);setGlobalSearch("");} if(e.key==="Enter"&&searchResults[0])openSearchResult(searchResults[0]);}}/><kbd>Enter</kbd></div>{searchOpen&&<div className="global-search-results">{globalSearch.trim()?searchResults.length?searchResults.map((result,index)=><button key={result.type+result.title+index} onMouseDown={e=>e.preventDefault()} onClick={()=>openSearchResult(result)}><span className="search-result-type">{result.type}</span><b>{result.title}</b><small>{result.detail}</small></button>):<div className="search-no-results">No results found for “{globalSearch}”.</div>:<><div className="search-quick-heading">QUICK SEARCH</div><button className="search-quick-item" onMouseDown={e=>e.preventDefault()} onClick={()=>{setPage("games");setSearchOpen(false);}}><Gamepad2 size={15}/><span><b>Games</b><small>Find games in NEXUS</small></span></button><button className="search-quick-item" onMouseDown={e=>e.preventDefault()} onClick={()=>{setPage("friends");setSearchOpen(false);}}><Users size={15}/><span><b>People</b><small>Find community members</small></span></button></>}</div>}</div><div className="notification-wrap"><button className="icon-btn notification" type="button" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><Bell size={18}/><i/></button>{notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications"><div className="notification-popover-head"><b>Notifications</b><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={15}/></button></div><div className="notification-items">{notifications.length ? notifications.map(n => <button key={n.id} className={"notification-item " + (n.read ? "read" : "")} onClick={() => markNotificationRead(n)}><b>{n.kind.replace("_", " ")}</b><span>{n.body}</span><small>{new Date(n.created_at).toLocaleString()}</small></button>) : <div className="notification-empty"><Bell size={22}/><b>You are all caught up</b><span>New notifications will appear here.</span></div>}</div></div>}</div><button className="top-profile-button" onClick={openProfileEditor} title="Edit your profile"><ProfileAvatar username={username} url={profile?.avatar_url || guestProfile?.avatar_url} small/></button></div></header>
      <div className="page-content">
        {notice && <div className="notice"><Sparkles size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {page === "home" && <HomePage username={username} online={online} rooms={rooms} setPage={setPage} setNotice={setNotice} games={siteGames} announcements={siteAnnouncements} settings={siteSettings}/>}
        {page === "games" && <GamesPage games={siteGames} socket={socket} username={username} session={session} rooms={rooms} myLobby={myLobby} lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} lobbyError={lobbyError} createLobby={createLobby} joinLobby={joinLobby} leaveLobby={leaveLobby} startLobby={startLobby} recordGame={recordGame} gameToOpen={worldGameToOpen} onGameOpenHandled={() => setWorldGameToOpen("")}/>}
        {page === "rewards" && <RewardsPage username={username} stats={playerStats} activity={activityFeed} leaderboard={playerLeaderboard} loading={rewardsLoading} onClaimDaily={claimDailyChallenge} onChooseTheme={chooseTheme}/>}
        {page === "events" && <SeasonalEventsPage/>}
        {page === "profile" && <div className="profile-editor-page"><div className="page-title-row"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Edit your profile</h1><p className="muted">Change how your profile looks to the NEXUS community.</p></div><span className="live-tag"><UserRound size={14}/> PROFILE SETTINGS</span></div><ProfileEditor embedded draft={profileDraft} setDraft={setProfileDraft} onSave={saveProfile} onClose={() => setPage("features")} busy={profileBusy} error={profileError} file={profileFile} setFile={setProfileFile} username={username} avatarUrl={profile?.avatar_url || guestProfile?.avatar_url}/></div>}
        {page === "chat" && <ChatPage username={username} online={online} messages={messages} channel={channel} setChannel={setChannel} messageText={messageText} setMessageText={setMessageText} sendMessage={sendChatMessage} chatFile={chatFile} setChatFile={setChatFile} replyTo={replyTo} setReplyTo={setReplyTo} reactToMessage={reactToMessage} editMessage={editMessage} deleteMessage={deleteMessage} reportMessage={reportMessage}/>}
        {page === "features" && <><NexusFeatures session={session} username={username} stats={playerStats} onlineCount={online.length} games={siteGames} isAdmin={isAdmin} setNotice={setNotice}/><NexusUpgradeCenter games={siteGames} username={username} userId={session?.user?.id} stats={playerStats} activity={activityFeed} notifications={notifications} isAdmin={isAdmin} onOpenGame={game => { setWorldGameToOpen(game.name); setPage("games"); }} onCreateParty={game => createLobby(game, true)} onGo={destination => { if (destination === "profile") openProfilePage(); else setPage(destination); }} setNotice={setNotice}/></> }
        {page === "world" && <NexusWorld session={session} username={username} profile={profile} games={siteGames} online={online} activity={activityFeed} isAdmin={isAdmin} onOpenGames={() => setPage("games")} onPlayGame={game => { setWorldGameToOpen(game.name); setPage("games"); }} onProfileUpdate={status => setProfile(old => old ? { ...old, status } : old)} setNotice={setNotice}/> }
        {page === "friends" && <PeoplePage username={username} online={online} session={session} friendRequests={friendRequests} addFriend={addFriend} respondFriend={respondFriend} openDM={openDM} blockUser={blockUser} dmTarget={dmTarget} dmMessages={dmMessages} dmText={dmText} setDmText={setDmText} sendDM={sendDM} closeDM={() => setDmTarget(null)}/>}
        {page === "admin" && (isAdmin ? <AdminPage games={siteGames} announcements={siteAnnouncements} settings={siteSettings} onSaveSiteConfig={saveSiteConfig} siteConfigBusy={siteConfigBusy} stats={adminStats} online={online} reports={reports} updateReport={updateReport} gameSubmissions={gameSubmissions} reviewGameSubmission={reviewGameSubmission}/> : <div className="empty-state"><Shield/><h2>Admin access required</h2><p>Your account does not have administrator permissions.</p></div>)}
      </div>
    </main>
    {profileOpen && <ProfileEditor draft={profileDraft} setDraft={setProfileDraft} onSave={saveProfile} onClose={() => setProfileOpen(false)} busy={profileBusy} error={profileError} file={profileFile} setFile={setProfileFile} username={username} avatarUrl={profile?.avatar_url || guestProfile?.avatar_url}/>}
  </div>;
}

function ProfileAvatar({ username, url, small = false }) {
  const initials = (username || "G").slice(0,1).toUpperCase();
  return url ? <img className={`avatar profile-avatar-image ${small ? "small" : ""}`} src={url} alt={`${username}'s profile`} onError={e => { e.currentTarget.style.display = "none"; }}/> : <div className={`avatar ${small ? "small" : ""}`}>{initials}</div>;
}

function ProfileEditor({ draft, setDraft, onSave, onClose, busy, error, file, setFile, username, avatarUrl, embedded = false }) {
  const change = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const previewBackground = PROFILE_BACKGROUNDS[draft.profile_background] || PROFILE_BACKGROUNDS.violet;
  return <div className={embedded ? "profile-editor-embedded" : "profile-modal-backdrop"} onMouseDown={e => { if (!embedded && e.target === e.currentTarget) onClose(); }}>
    <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
      <div className="profile-modal-head"><div><div className="eyebrow">MAKE IT YOURS</div><h2 id="profile-editor-title">Edit profile</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X/></button></div>
      <div className="profile-preview profile-preview-custom" style={{ background: previewBackground }}><ProfileAvatar username={draft.username || username} url={draft.avatar_url || avatarUrl}/><div><b>{draft.username || username}</b><small>{draft.status || "Available"}</small></div></div>
      <form className="profile-form" onSubmit={onSave}>
        <label>Username<input value={draft.username} onChange={e => change("username", e.target.value)} maxLength={24} minLength={2} required/></label>
        <label>Upload profile picture<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}/><small>{file ? `Selected: ${file.name}` : "Choose an image from your device (max 5 MB)."} Uploads are saved to your account.</small></label>\n        <label>Or use a profile picture URL<input type="url" value={draft.avatar_url} onChange={e => { change("avatar_url", e.target.value); if (file) setFile(null); }} placeholder="https://example.com/photo.jpg"/><small>Paste a direct link to an image instead.</small></label>
        <label>Status<select value={draft.status || "Available"} onChange={e => change("status", e.target.value)}><option value="Available">🟢 Available</option><option value="Away">🌙 Away</option><option value="Busy">🔴 Busy</option><option value="Do Not Disturb">⛔ Do Not Disturb</option></select></label>
        <label>About me<textarea value={draft.bio} onChange={e => change("bio", e.target.value)} maxLength={160} rows={3} placeholder="Tell the community a little about yourself..."/></label>
        <label>Profile attributes<input value={(draft.profile_attributes || []).join(", ")} onChange={e => change("profile_attributes", e.target.value.split(",").map(value => value.trim()).filter(Boolean).slice(0,5))} maxLength={120} placeholder="Fun, Helpful, Competitive"/><small>Add up to 5 short tags, separated by commas.</small></label>
        <label>Profile background<select value={draft.profile_background || "violet"} onChange={e => change("profile_background", e.target.value)}><option value="violet">Violet glow</option><option value="sunset">Sunset</option><option value="ocean">Ocean</option><option value="forest">Forest</option><option value="midnight">Midnight</option></select><small>This background appears on your People card.</small></label>
        {error && <div className="form-error">{error}</div>}
        <div className="profile-form-actions"><button className="quiet-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save changes"} <ArrowRight size={16}/></button></div>
      </form>
    </section>
  </div>;
}

function AuthScreen(p) {
  return <div className="auth-screen"><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/><div className="auth-panel"><div className="auth-brand"><div className="brand-mark"><Sparkles/></div><span>NEXUS</span></div><div className="auth-eyebrow"><span/> YOUR COMMUNITY STARTS HERE</div><h1>{p.authMode === "login" ? "Welcome back." : "Find your people."}</h1><p className="auth-sub">Play together. Talk about everything. Make it yours.</p><form onSubmit={p.submitAuth} className="auth-form">
    {p.authMode === "signup" && <label>Username<input value={p.usernameInput} onChange={e => p.setUsernameInput(e.target.value)} placeholder="Your display name" maxLength={24} required/></label>}
    <label>Email address<input type="email" value={p.email} onChange={e => p.setEmail(e.target.value)} placeholder="you@example.com" required/></label>
    <label>Password<input type="password" value={p.password} onChange={e => p.setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required/></label>
    {p.authError && <div className="form-error">{p.authError}</div>}
    {p.authSuccess && <div className="form-success" role="status">{p.authSuccess}</div>}
    <button className="primary-btn full" disabled={p.authBusy}>{p.authBusy ? "Please wait..." : p.authMode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17}/></button>
  </form><div className="auth-switch">{p.authMode === "login" ? "New to Nexus?" : "Already have an account?"} <button onClick={() => p.setAuthMode(p.authMode === "login" ? "signup" : "login")}>{p.authMode === "login" ? "Create an account" : "Sign in"}</button></div><div className="auth-divider"><span/> OR <span/></div><form onSubmit={p.enterGuest} className="guest-form"><input value={p.usernameInput} onChange={e => p.setUsernameInput(e.target.value)} placeholder="Choose a guest username" maxLength={24}/><button className="secondary-btn">Continue as guest</button></form><p className="auth-foot">By continuing, you agree to be respectful and follow community rules.</p></div><div className="auth-caption">A PLACE TO PLAY, CONNECT & CREATE <span>✦</span></div></div>;
}

function HomePage({ username, online, rooms, setPage, setNotice, games = starterGames, announcements = [], settings = {} }) {
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase();
  return <><div className="welcome-row"><div><div className="eyebrow">{todayLabel} <span>✦</span> YOUR SPACE</div><h1>Good to see you, {username}.</h1><p className="muted">Your people are here. What are we doing today?</p></div><button className="primary-btn" onClick={() => setPage("games")}><Plus size={17}/> Find a game</button></div>
    {announcements.length > 0 && <section className="home-announcements"><b>📢 Community announcements</b>{announcements.slice(0,3).map(a=><p key={a.id || a.text}>{a.text}</p>)}</section>}<section className="hero-card"><div className="hero-glow"/><div className="hero-content"><div className="hero-pill"><Zap size={13}/> THE COMMUNITY HUB</div><h2>Make every moment<br/><span>count together.</span></h2><p>Jump into a game, catch up with friends, or start something new. Your next favorite moment is one click away.</p><div className="hero-buttons"><button className="white-btn" onClick={() => setPage("games")}>Explore games <ArrowRight size={16}/></button><button className="text-btn" onClick={() => setPage("chat")}>Open community chat</button></div></div><div className="hero-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="hero-cube">✦</div><div className="float-card float-top"><span>✦</span><div><b>Good vibes</b><small>always online</small></div></div><div className="float-card float-bottom"><div className="mini-avatars"><i>J</i><i>M</i><i>A</i></div><div><b>{online.length} online</b><small>playing together</small></div></div></div></section>
    <div className="section-heading"><div><h2>Your community</h2><p>Here's what's happening right now.</p></div><button className="subtle-link" onClick={() => setPage("friends")}>View people <ArrowRight size={14}/></button></div>
    {settings.showOnlineStats !== false && <div className="stat-grid"><StatCard icon={Users} label="People online" value={online.length} note="Connected right now" tone="purple"/><StatCard icon={Gamepad2} label="Active lobbies" value={rooms.length} note="Ready for players" tone="blue"/><StatCard icon={MessageCircle} label="Chat channels" value="04" note="Places to talk" tone="orange"/><StatCard icon={Activity} label="Community status" value="Live" note="Everything looks good" tone="green"/></div>}
    <div className="section-heading game-heading"><div><h2>Pick your next adventure</h2><p>Something fun is always around the corner.</p></div><button className="subtle-link" onClick={() => setPage("games")}>All games <ArrowRight size={14}/></button></div>
    <div className="game-grid">{games.map(g => <GameCard key={g.name} game={g} onClick={() => setPage("games")}/>)}</div>
  </>;
}
function StatCard({ icon: Icon, label, value, note, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note"><span/> {note}</div></div>; }
const gameIconMap = { "Party Arena": PartyPopper, "Neon Racers": CarFront, "Retro Bowl": Goal, "Basket Bros": Trophy, "Trivia Clash": Brain, "Puzzle Pop": Puzzle, "Pixel Quest": Compass, "Arcade Rush": Joystick };
function GameCard({ game, onClick }) { const Icon=gameIconMap[game.name]||Gamepad2; return <button className={`game-card ${game.color}`} onClick={onClick}><div className="game-art"><span className="game-art-icon"><Icon size={34} strokeWidth={1.8}/></span><div className="art-shine"/></div><div className="game-info"><div className="game-type">{game.type} <span>•</span> {game.players}</div><h3>{game.name}</h3><p>{game.description}</p><div className="game-play">View details <ArrowRight size={15}/></div></div></button>; }

function GamesPage({ games = starterGames, rooms, myLobby, lobbyCode, setLobbyCode, lobbyError, createLobby, joinLobby, leaveLobby, startLobby, session, socket, username, recordGame, gameToOpen, onGameOpenHandled }) {
  const [category,setCategory]=useState("All"),[search,setSearch]=useState(""),[recent,setRecent]=useState(()=>{try{return JSON.parse(localStorage.getItem("nexus_recent_games")||"[]")}catch{return[]}}),[selected,setSelected]=useState(null),[embeddedGame,setEmbeddedGame]=useState(null),[activeMini,setActiveMini]=useState(null),[activeGame,setActiveGame]=useState(null),[gameState,setGameState]=useState(null),[answer,setAnswer]=useState(""),[submitOpen,setSubmitOpen]=useState(false),[submission,setSubmission]=useState({name:"",url:"",description:"",category:"Action"}),[submitMessage,setSubmitMessage]=useState(""),[leaderboard,setLeaderboard]=useState([]);
  const categories=["All",...new Set(games.map(g=>g.type))];
  const visible=games.filter(g=>(category==="All"||g.type===category)&&((g.name+" "+g.description).toLowerCase().includes(search.toLowerCase())));
  const multiplayerGames=visible.filter(g=>g.mode==="multiplayer"||g.mode==="external-multiplayer"||g.name==="Party Arena");
  const singlePlayerGames=visible.filter(g=>g.name!=="Party Arena"&&(g.mode==="single"||g.mode==="coming"));
  useEffect(()=>{if(!supabase)return;supabase.from("game_scores").select("username,game_name,score").order("score",{ascending:false}).limit(10).then(({data})=>setLeaderboard(data||[]));},[]);
  useEffect(()=>{if(!socket)return;const started=info=>{setActiveGame(info);setGameState(null);setAnswer("");},state=s=>setGameState(s),question=q=>{setGameState(q);setAnswer("");},ended=()=>{setActiveGame(null);setGameState(null);};socket.on("game:started",started);socket.on("race:state",state);socket.on("trivia:state",state);socket.on("trivia:question",question);socket.on("game:ended",ended);return()=>{socket.off("game:started",started);socket.off("race:state",state);socket.off("trivia:state",state);socket.off("trivia:question",question);socket.off("game:ended",ended);};},[socket]);
  function launch(game){const next=[game.name,...recent.filter(n=>n!==game.name)].slice(0,6);setRecent(next);localStorage.setItem("nexus_recent_games",JSON.stringify(next));setSelected(game);}
  function openExternal(game){const next=[game.name,...recent.filter(n=>n!==game.name)].slice(0,6);setRecent(next);localStorage.setItem("nexus_recent_games",JSON.stringify(next));recordGame?.(game.name);setSelected(null);setEmbeddedGame(game);}
  function openExternalTab(game){const next=[game.name,...recent.filter(n=>n!==game.name)].slice(0,6);setRecent(next);localStorage.setItem("nexus_recent_games",JSON.stringify(next));recordGame?.(game.name);window.open(game.openUrl,"_blank","noopener,noreferrer");}
  async function submitGame(e){e.preventDefault();setSubmitMessage("");if(!session?.user||!supabase){setSubmitMessage("Sign in to submit a game.");return;}try{const {error}=await supabase.from("game_submissions").insert({user_id:session.user.id,name:submission.name.trim(),url:submission.url.trim(),description:submission.description.trim(),category:submission.category});if(error)throw error;setSubmitMessage("Game submitted for review!");setSubmission({name:"",url:"",description:"",category:"Action"});}catch(err){setSubmitMessage(err.message||"Could not submit game.");}}
  function closeGame(){socket?.emit("lobby:leave",{code:activeGame?.code,username});setActiveGame(null);setGameState(null);}
  useEffect(()=>{if(!gameToOpen)return;const game=games.find(item=>item.name===gameToOpen);if(game){if(game.externalUrl)openExternal(game);else if(game.openUrl)openExternalTab(game);else launch(game);}onGameOpenHandled?.();},[gameToOpen]);
  const EmbeddedIcon=embeddedGame?(gameIconMap[embeddedGame.name]||Gamepad2):Gamepad2;
  if(submitOpen)return <div className="games-page"><div className="page-title-row"><div><div className="eyebrow">NEXUS ARCADE</div><h1>Submit a game</h1><p className="muted">Suggest a browser game for the NEXUS team to review.</p></div><button className="quiet-btn" onClick={()=>setSubmitOpen(false)}>← Back to games</button></div><section className="social-panel game-submit-panel"><h2>Game submission</h2><p className="muted">Share the game name, its website, and a short description.</p><form onSubmit={submitGame}><label>Game name<input required maxLength={60} value={submission.name} onChange={e=>setSubmission({...submission,name:e.target.value})}/></label><label>Game URL<input required type="url" value={submission.url} onChange={e=>setSubmission({...submission,url:e.target.value})} placeholder="https://..."/></label><label>Category<select value={submission.category} onChange={e=>setSubmission({...submission,category:e.target.value})}>{["Action","Adventure","Puzzle","Racing","Party","Trivia","Other"].map(x=><option key={x}>{x}</option>)}</select></label><label>Description<textarea maxLength={240} value={submission.description} onChange={e=>setSubmission({...submission,description:e.target.value})}/></label><button className="primary-btn">Send for review</button>{submitMessage&&<p className="muted">{submitMessage}</p>}</form></section></div>;
  if(activeMini)return <section className="playable-game"><div className="playable-head"><div><div className="eyebrow">NEXUS ARCADE · SINGLE PLAYER</div><h1>{activeMini}</h1><p>Play and try to beat your best score.</p></div><button className="quiet-btn" onClick={()=>setActiveMini(null)}>Exit game</button></div><MiniGame name={activeMini}/></section>;
  if(activeGame&&["Neon Racers","Trivia Clash","Party Arena"].includes(activeGame.game))return <section className="playable-game"><div className="playable-head"><div><div className="eyebrow">NEXUS MULTIPLAYER · ROOM {activeGame.code}</div><h1>{activeGame.game}</h1><p>{(activeGame.players||[]).join(" · ")}</p></div><button className="quiet-btn" onClick={closeGame}>Exit game</button></div>{activeGame.game==="Party Arena"?<MiniGame name="Party Arena"/>:activeGame.game==="Neon Racers"?<div className="race-game"><div className="race-intro"><span>🏁</span><div><h2>Neon Sprint</h2><p>Tap BOOST as fast as you can. First racer to the finish wins!</p></div></div><div className="race-track">{(gameState?.players||activeGame.players||[]).map(p=><div className="race-lane" key={p}><div className="race-name">{p}{p===username?" (you)":""}</div><div className="race-road"><div className="race-progress" style={{width:(gameState?.progress?.[p]||0)+"%"}}/><span className="race-car" style={{left:"calc("+(gameState?.progress?.[p]||0)+"% - 17px)"}}>🏎️</span><span className="race-finish">🏁</span></div></div>)}</div>{gameState?.winner?<div className="game-result">🏆 {gameState.winner} won the race!</div>:<button className="race-boost" onClick={()=>socket?.emit("race:boost",{code:activeGame.code,username})}>⚡ BOOST!</button>}<p className="game-help">Every boost moves your car forward. Keep tapping!</p></div>:<TriviaGame gameState={gameState} answer={answer} setAnswer={setAnswer} socket={socket} code={activeGame.code} username={username} host={activeGame.host}/>}</section>;
  return <div className="games-page">
    <div className="page-title-row"><div><div className="eyebrow">NEXUS ARCADE</div><h1>Games hub</h1><p className="muted">Choose a game, invite friends, or play solo.</p></div><span className="live-tag"><i/> MULTIPLAYER READY</span></div>
    {myLobby&&<section className="lobby-panel"><div><div className="eyebrow">YOUR LOBBY · {myLobby.code}</div><h2>{myLobby.game}</h2><p>{myLobby.players.length} player{myLobby.players.length===1?"":"s"} in this room</p><div className="player-chips">{myLobby.players.map((n,i)=><span key={n+i}>{n}</span>)}</div></div><div className="lobby-actions"><button className="secondary-btn" onClick={()=>navigator.clipboard?.writeText(myLobby.code)}>Copy code</button>{!myLobby.started&&<button className="primary-btn" onClick={startLobby}>Start game <ArrowRight size={16}/></button>}<button className="quiet-btn" onClick={leaveLobby}>Leave</button></div></section>}
    {lobbyError&&<div className="form-error">{lobbyError}</div>}
    <div className="games-toolbar"><div><h2>Game library</h2><p className="muted">Find something to play.</p></div><button className="secondary-btn" onClick={()=>setSubmitOpen(true)}><Plus size={15}/> Submit a game</button></div>
    <input className="game-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search games..."/>
    <div className="game-categories">{categories.map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <section className="game-shelf"><div className="game-shelf-heading"><div><span className="game-shelf-icon multiplayer-shelf-icon"><Users size={17}/></span><div><h2>Multiplayer games</h2><p>Start a NEXUS room or open an online multiplayer game.</p></div></div><span className="game-shelf-count">{multiplayerGames.length} games</span></div>
      <div className="library-grid game-library-grid">{multiplayerGames.map(g=>{const Icon=gameIconMap[g.name]||Gamepad2;const nativeLobby=g.mode==="multiplayer"||g.name==="Party Arena";const external=Boolean(g.externalUrl);return <article className="library-card game-library-card" key={g.name}><div className={"library-icon "+g.color}><Icon size={27}/></div><div className="library-copy"><h3>{g.name}</h3><p>{g.description}</p><small>{g.type} · {g.players}</small><div className="game-card-actions">{external?<button className="primary-btn" onClick={()=>openExternal(g)}>Play game <ArrowRight size={15}/></button>:nativeLobby?<button className="primary-btn" onClick={()=>createLobby(g.name)}>Play with friends <ArrowRight size={15}/></button>:<button className="secondary-btn" disabled>Coming soon</button>}</div></div></article>;})}{!multiplayerGames.length&&<div className="games-empty">No multiplayer games match your search.</div>}</div>
    </section>
    <section className="game-shelf single-shelf"><div className="game-shelf-heading"><div><span className="game-shelf-icon single-shelf-icon"><Gamepad2 size={18}/></span><div><h2>Single-player games</h2><p>Play on your own, at your own pace.</p></div></div><span className="game-shelf-count">{singlePlayerGames.length} games</span></div>
      <div className="library-grid game-library-grid">{singlePlayerGames.map(g=>{const Icon=gameIconMap[g.name]||Gamepad2;const ready=Boolean(g.externalUrl)||g.mode==="coming";return <article className="library-card game-library-card" key={g.name}><div className={"library-icon "+g.color}><Icon size={27}/></div><div className="library-copy"><h3>{g.name}</h3><p>{g.description}</p><small>{g.type} · Single-player</small><div className="game-card-actions">{g.openUrl?<button className="primary-btn" onClick={()=>openExternalTab(g)}>Play game <ArrowRight size={15}/></button>:g.externalUrl?<button className="primary-btn" onClick={()=>{launch(g);setEmbeddedGame(g)}}>Play game <ArrowRight size={15}/></button>:ready?<button className="primary-btn" onClick={()=>{launch(g);setSelected(null);setActiveMini(g.name)}}>Play game <ArrowRight size={15}/></button>:<button className="secondary-btn" onClick={()=>launch(g)}>Details</button>}</div></div></article>;})}{!singlePlayerGames.length&&<div className="games-empty">No single-player games match your search.</div>}</div>
    </section>
    {recent.length>0&&<section className="game-section"><h2>Recently viewed</h2><div className="recent-games">{recent.map(n=>{const g=games.find(x=>x.name===n);return g?<button key={n} onClick={()=>g.openUrl?openExternalTab(g):g.externalUrl?openExternal(g):launch(g)}>{g.name}</button>:null;})}</div></section>}
    <div className="games-lower-grid"><section className="join-panel"><div className="panel-icon"><Hash/></div><h2>Join a friend's lobby</h2><p>Enter a lobby code or join a public room. Private rooms stay out of the public list.</p><button className="secondary-btn full" onClick={()=>createLobby("Party Arena",true)}>Create private Party Arena room</button><input className="code-input" value={lobbyCode} onChange={e=>setLobbyCode(e.target.value.toUpperCase())} placeholder="E.G. A4B29F" maxLength={12}/><button className="primary-btn full" onClick={()=>joinLobby(lobbyCode)}>Join lobby <ArrowRight size={16}/></button><div className="join-divider"/><div className="eyebrow">PUBLIC LOBBIES <span className="count">{rooms.length}</span></div>{rooms.length?rooms.map(r=><div className="room-row" key={r.code}><div className="room-avatar">🎮</div><div><b>{r.game}</b><small>{r.players.length} players · {r.code}</small></div><button onClick={()=>joinLobby(r.code)}>Join</button></div>):<div className="empty-small">No public lobbies yet. Create one!</div>}</section><section className="join-panel"><div className="panel-icon"><Trophy/></div><h2>Leaderboard</h2><p>Top scores submitted by players.</p>{leaderboard.length?leaderboard.map((r,i)=><div className="room-row" key={i}><b>#{i+1} {r.username}</b><small>{r.game_name}</small><strong>{r.score}</strong></div>):<div className="empty-small">No scores yet. Scores will appear when games report them.</div>}</section></div>
    {embeddedGame&&<div className="external-game-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEmbeddedGame(null)}}><section className="external-game-shell"><header><div><b><EmbeddedIcon size={16}/> {embeddedGame.name}</b><span>External game · {embeddedGame.mode==="external-multiplayer"?"multiplayer":"single-player"}</span></div><div className="external-game-actions"><button className="secondary-btn" onClick={()=>document.getElementById("nexus-external-game")?.requestFullscreen?.()}>Fullscreen</button><button className="quiet-btn" onClick={()=>setEmbeddedGame(null)}>Close</button></div></header><iframe id="nexus-external-game" src={embeddedGame.externalUrl} title={embeddedGame.name} allow="fullscreen; autoplay; gamepad" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/><p>Having trouble loading? <a href={embeddedGame.externalUrl} target="_blank" rel="noreferrer">Open in a new tab</a>.</p></section></div>}
    {selected&&<div className="game-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="game-modal"><button className="quiet-btn" onClick={()=>setSelected(null)}>Close</button><div className="game-modal-icon">{selected.icon}</div><div className="eyebrow">{selected.type} · {selected.players}</div><h2>{selected.name}</h2><p>{selected.description}</p><p className="muted">{selected.mode==="multiplayer"?"Create a lobby and invite friends with its code.":selected.mode==="single"?"A single-player game.":"This game is still being prepared for NEXUS."}</p>{selected.mode==="multiplayer"&&<button className="primary-btn" onClick={()=>{createLobby(selected.name);setSelected(null)}}>Play with friends <ArrowRight size={15}/></button>}</section></div>}
   </div>;
}

function MiniGame({name}) {
  const [score,setScore]=useState(0),[moves,setMoves]=useState(0),[done,setDone]=useState(false),[cards,setCards]=useState(()=>Array.from({length:16},(_,i)=>i%8).sort(()=>Math.random()-.5)),[revealed,setRevealed]=useState([]),[matched,setMatched]=useState([]),[player,setPlayer]=useState(12),[target,setTarget]=useState(7),[seconds,setSeconds]=useState(30);
  useEffect(()=>{if(done)return;const timer=setInterval(()=>setSeconds(v=>{if(v<=1){clearInterval(timer);setDone(true);return 0;}return v-1;}),1000);return()=>clearInterval(timer);},[done]);
  function reset(){setScore(0);setMoves(0);setDone(false);setSeconds(30);setRevealed([]);setMatched([]);setCards(Array.from({length:16},(_,i)=>i%8).sort(()=>Math.random()-.5));setPlayer(12);setTarget(7);}
  function choose(i){if(done||matched.includes(i)||revealed.includes(i)||revealed.length===2)return;const next=[...revealed,i];setRevealed(next);if(next.length===2){setMoves(v=>v+1);if(cards[next[0]]===cards[next[1]]){setMatched(v=>[...v,...next]);setScore(v=>v+10);setTimeout(()=>setRevealed([]),350);}else setTimeout(()=>setRevealed([]),650);}}
  const memory=name==="Puzzle Pop",quest=name==="Pixel Quest",rush=name==="Arcade Rush";
  useEffect(()=>{if(memory&&matched.length===16)setDone(true);if(quest&&score>=50)setDone(true);},[memory,matched.length,quest,score]);
  return <div className="mini-game"><div className="mini-game-stats"><span>⭐ Score: <b>{score}</b></span><span>⏱ {seconds}s</span>{memory&&<span>Moves: {moves}</span>}</div>
    {memory?<><h2>Memory Match</h2><p>Find all eight matching pairs.</p><div className="memory-grid">{cards.map((v,i)=><button key={i} disabled={matched.includes(i)||done} className={matched.includes(i)?"matched":""} onClick={()=>choose(i)}>{revealed.includes(i)||matched.includes(i)?["🍎","🚀","🐧","⭐","🎲","🎈","🍕","💎"][v]:"?"}</button>)}</div></>:quest?<><h2>Pixel Quest</h2><p>Collect five stars using the arrow controls.</p><div className="quest-grid">{Array.from({length:25},(_,i)=><div key={i}>{i===player?"🧑":i===target?"⭐":""}</div>)}</div><div className="quest-controls"><button onClick={()=>setPlayer(p=>Math.max(0,p-5))}>↑</button><div><button onClick={()=>setPlayer(p=>Math.max(0,p-1))}>←</button><button onClick={()=>setPlayer(p=>Math.min(24,p+5))}>↓</button><button onClick={()=>setPlayer(p=>Math.min(24,p+1))}>→</button></div></div><button className="primary-btn" onClick={()=>{setScore(v=>v+10);setTarget(Math.floor(Math.random()*25));}}>Collect star</button></>:rush?<><h2>Arcade Rush</h2><p>Hit the target as many times as possible in 30 seconds.</p><button className="rush-target" onClick={()=>{setScore(v=>v+1);setTarget(Math.floor(Math.random()*25));}}>✦</button></>:<><h2>Party Arena</h2><p>Tap the party button 20 times before time runs out.</p><button className="party-tap" onClick={()=>{setScore(v=>v+1);setMoves(v=>{if(v+1>=20)setDone(true);return v+1;});}}>🎉 TAP!</button><p>{moves}/20 taps</p></>}
    {done&&<div className="mini-game-result"><h2>🏆 Round complete!</h2><p>Your score: <b>{score}</b></p><button className="primary-btn" onClick={reset}>Play again</button></div>}
    {!done&&<button className="secondary-btn" onClick={reset}>Restart</button>}
  </div>;
}

function TriviaGame({gameState,answer,setAnswer,socket,code,username,host}) {
  const question=gameState?.question, answered=gameState?.answered?.includes(username);
  return <div className="trivia-game"><div className="trivia-top"><div><div className="eyebrow">TRIVIA CLASH · LIVE MATCH</div><h2>{question?"Question "+(gameState.index+1)+" of "+gameState.total:"Ready to play?"}</h2></div><div className="trivia-score">{(gameState?.scores||[]).map(s=><span key={s.username}>{s.username}: <b>{s.score}</b></span>)}</div></div>{question?<><div className="trivia-question"><small>QUESTION {gameState.index+1}</small><h3>{question.text}</h3></div><div className="trivia-options">{question.options.map((option,i)=><button key={option} disabled={answered} className={answer===option?"chosen":""} onClick={()=>setAnswer(option)}>{String.fromCharCode(65+i)}. {option}</button>)}</div><div className="trivia-actions">{!answered&&<button className="primary-btn" disabled={!answer} onClick={()=>socket?.emit("trivia:answer",{code,username,answer})}>Submit answer</button>}{answered&&<span className="muted">Answer submitted. Waiting for the host to continue…</span>}{host===username&&<button className="secondary-btn" onClick={()=>socket?.emit("trivia:next",{code,username})}>Next question</button>}</div><p className="game-help">{gameState.answered?.length||0} of {gameState.players?.length||0} players answered.</p></>:<div className="trivia-wait"><p>Waiting for the host to begin the first question.</p>{host===username&&<button className="primary-btn" onClick={()=>socket?.emit("trivia:next",{code,username})}>Start Trivia Clash</button>}</div>}{gameState?.finished&&<div className="game-result">🏆 Trivia Clash complete! Check the final scores above.</div>}</div>;
}

function ChatPage({ username, online, messages, channel, setChannel, messageText, setMessageText, sendMessage, chatFile, setChatFile, replyTo, setReplyTo, reactToMessage, editMessage, deleteMessage, reportMessage }) {
 const channels=["general","gaming","memes","introductions"];
 const shown=messages.filter(m=>!m.system||m.text?.includes(channel));
 return <div className="chat-layout"><aside className="chat-channels"><div className="chat-space"><div className="workspace-icon">N</div><div><b>Nexus Community</b><small>Community server</small></div></div><div className="nav-label">TEXT CHANNELS</div>{channels.map(c=><button key={c} className={"channel-btn "+(channel===c?"selected":"")} onClick={()=>setChannel(c)}><Hash size={16}/>{c}</button>)}<div className="chat-online"><div className="nav-label">ONLINE — {online.length}</div>{online.map((n,i)=><div className="online-person" key={n+i}><span className="avatar tiny">{n.slice(0,1).toUpperCase()}</span>{n}<i/></div>)}</div></aside><section className="chat-main"><div className="chat-header"><div><h2><Hash size={19}/>{channel}</h2><p>A place for good conversations.</p></div><span className="live-tag"><i/> CONNECTED</span></div><div className="message-list">{shown.map(m=><div className={"message "+(m.system?"system-message":"")} key={m.id||m.at}><div className="avatar">{m.system?"✦":m.username?.slice(0,1).toUpperCase()}</div><div className="message-body"><div className="message-meta"><b>{m.username||"Nexus"}</b><small>{m.at?new Date(m.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""} {m.edited?"(edited)":""}</small></div>{m.replyTo&&<small className="reply-context">Replying to {m.replyTo.username}: {m.replyTo.text}</small>}<p>{m.text}</p>{m.attachment&&<a className="chat-attachment" href={m.attachment.url} target="_blank" rel="noreferrer">📎 {m.attachment.name}</a>}{!m.system&&<div className="message-tools"><button type="button" onClick={()=>setReplyTo(m)}>Reply</button>{["👍","❤️","😂","🎉","👀"].map(e=><button type="button" key={e} onClick={()=>reactToMessage(m.id,e)}>{e} {m.reactions?.[e]?.length||""}</button>)}{m.username===username&&<><button type="button" onClick={()=>editMessage(m)}>Edit</button><button type="button" onClick={()=>deleteMessage(m)}>Delete</button></>}<button type="button" onClick={()=>reportMessage(m)}>Report</button></div>}</div></div>)}{!shown.length&&<div className="chat-empty"><div>✦</div><h3>Welcome to #{channel}</h3><p>This is the beginning of the conversation. Say hello!</p></div>}</div>{replyTo&&<div className="reply-banner">Replying to {replyTo.username}<button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></div>}<form className="message-composer" onSubmit={sendMessage}><label className="attach-button" title="Attach image or PDF">＋<input type="file" accept="image/*,application/pdf" onChange={e=>setChatFile(e.target.files?.[0]||null)}/></label><input value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder={chatFile?chatFile.name:"Message #"+channel} maxLength={1000}/><button className="send-btn" disabled={!messageText.trim()&&!chatFile}><ArrowRight/></button></form></section></div>;
}
function PeoplePage({ username, online, session, friendRequests, addFriend, respondFriend, openDM, blockUser, dmTarget, dmMessages, dmText, setDmText, sendDM, closeDM }) {
 const [memberProfiles,setMemberProfiles]=useState({});
 useEffect(()=>{if(!supabase||!session?.user||!online.length){setMemberProfiles({});return;}supabase.from("profiles").select("username,status,avatar_url,bio,profile_attributes,profile_background").in("username",online).then(({data})=>setMemberProfiles(Object.fromEntries((data||[]).map(row=>[row.username,row]))));},[online,session]);
 const incoming=friendRequests.filter(r=>r.receiver_id===session?.user?.id&&r.status==="pending");
 const accepted=friendRequests.filter(r=>r.status==="accepted");
 return <><div className="page-title-row"><div><div className="eyebrow">YOUR COMMUNITY</div><h1>People & friends</h1><p className="muted">Connect with members and start private conversations.</p></div><span className="live-tag"><i/> {online.length} ONLINE</span></div>{!session&&<div className="form-error">Sign in to use friends and private messages.</div>}{incoming.length>0&&<section className="social-panel"><h2>Friend requests</h2>{incoming.map(r=><div className="social-row" key={r.id}><span>Incoming friend request</span><button onClick={()=>respondFriend(r,true)}>Accept</button><button onClick={()=>respondFriend(r,false)}>Decline</button></div>)}</section>}<section className="social-panel"><h2>Friends ({accepted.length})</h2>{accepted.length?accepted.map(r=><div className="social-row" key={r.id}><span>Friend connection</span><small>Accepted</small></div>):<p className="muted">Accepted friends will appear here.</p>}</section><div className="section-heading"><div><h2>People online</h2><p>Send a friend request to someone in the community.</p></div></div><div className="people-grid">{online.map((n,i)=>{const member=memberProfiles[n]||{};const isSelf=n.toLowerCase()===String(username||"").toLowerCase();return <div className="person-card profile-person-card" key={n+i} style={{background:PROFILE_BACKGROUNDS[member.profile_background]||PROFILE_BACKGROUNDS.violet}}><ProfileAvatar username={n} url={member.avatar_url}/><div className="profile-person-info"><b>{n}{isSelf?" (You)":""}</b><small><i/> {member.status || "Online now"}</small>{member.bio&&<small>{member.bio}</small>}{Array.isArray(member.profile_attributes)&&member.profile_attributes.length>0&&<div className="profile-person-meta">{member.profile_attributes.slice(0,5).map(attribute=><span className="profile-attribute" key={attribute}>{attribute}</span>)}</div>}</div>{!isSelf&&<><button className="secondary-btn" onClick={()=>addFriend(n)}>Add friend</button><button className="secondary-btn" onClick={()=>openDM(n)}>Message</button><button className="quiet-btn" onClick={()=>blockUser(n)}>Block</button></>}</div>})}{!online.length&&<div className="empty-state"><Users/><h2>It's quiet in here</h2><p>When people connect, they'll show up here.</p></div>}</div>{dmTarget&&<section className="dm-panel"><div className="dm-head"><h2>Message {dmTarget.username}</h2><button onClick={closeDM}>Close</button></div><div className="dm-history">{dmMessages.map(m=><p key={m.id}><b>{m.sender_id===session?.user?.id?"You":dmTarget.username}:</b> {m.body}</p>)}</div><form className="message-composer" onSubmit={sendDM}><input value={dmText} onChange={e=>setDmText(e.target.value)} placeholder="Write a private message..." maxLength={2000}/><button className="send-btn" disabled={!dmText.trim()}><ArrowRight/></button></form></section>}</>;
}

function RewardsPage({ username, stats, activity, leaderboard, loading, onClaimDaily, onChooseTheme }) {
  const xp = stats?.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  const progress = xp % 100;
  const today = new Date().toISOString().slice(0,10);
  const claimed = stats?.daily_claim_date === today;
  const achievements = [
    { name: "First Steps", description: "Play your first game", icon: Star, unlocked: (stats?.games_played || 0) >= 1 },
    { name: "Game Explorer", description: "Play five games", icon: Compass, unlocked: (stats?.games_played || 0) >= 5 },
    { name: "Level Three", description: "Reach level 3", icon: Crown, unlocked: level >= 3 },
    { name: "Daily Champion", description: "Complete a daily challenge", icon: Flame, unlocked: Boolean(stats?.daily_claim_date) }
  ];
  const themes = [{ id: "violet", name: "Violet", unlock: 0 }, { id: "ocean", name: "Ocean", unlock: 100 }, { id: "ember", name: "Ember", unlock: 250 }, { id: "emerald", name: "Emerald", unlock: 500 }];
  return <div className="rewards-page">
    <div className="page-title-row"><div><div className="eyebrow">YOUR PROGRESS</div><h1>Rewards & levels</h1><p className="muted">Play, complete challenges, and unlock your NEXUS style.</p></div><span className="live-tag"><Trophy size={14}/> LEVEL {level}</span></div>
    <section className="xp-hero"><div className="xp-level-icon"><Crown size={30}/></div><div className="xp-main"><div className="eyebrow">NEXUS LEVEL {level}</div><h2>{xp.toLocaleString()} XP</h2><p>{100-progress} XP until level {level+1}</p><div className="xp-track"><span style={{width:progress+"%"}}/></div></div><div className="xp-total"><b>{stats?.games_played || 0}</b><small>Games played</small></div></section>
    <div className="rewards-grid">
      <section className="reward-card daily-card"><div className="reward-card-heading"><span className="reward-icon"><Target/></span><span className="eyebrow">DAILY CHALLENGE</span></div><h2>Play a game today</h2><p>Open any game in NEXUS to complete today's challenge, then claim your reward.</p><div className="daily-reward"><Gift size={18}/> +25 XP</div><button className="primary-btn full" disabled={claimed} onClick={onClaimDaily}>{claimed?"Reward claimed today":"Claim daily reward"}</button><small className="muted">One reward per day. Your progress is saved on this device or account.</small></section>
      <section className="reward-card"><div className="reward-card-heading"><span className="reward-icon"><Medal/></span><span className="eyebrow">ACHIEVEMENTS</span></div><h2>Your milestones</h2><div className="achievement-list">{achievements.map(a=>{const Icon=a.icon;return <div className={"achievement-row "+(a.unlocked?"unlocked":"locked")} key={a.name}><span><Icon size={19}/></span><div><b>{a.name}</b><small>{a.description}</small></div><strong>{a.unlocked?<CheckCircle2 size={18}/>:"Locked"}</strong></div>})}</div></section>
    </div>
    <section className="reward-card theme-card"><div className="reward-card-heading"><span className="reward-icon"><Palette/></span><span className="eyebrow">PROFILE CUSTOMIZATION</span></div><h2>Choose your profile theme</h2><p className="muted">Unlock more colors as you level up.</p><div className="theme-options">{themes.map(t=>{const unlocked=xp>=t.unlock;return <button key={t.id} className={"theme-option theme-swatch-"+t.id+(stats?.selected_theme===t.id?" selected":"")} disabled={!unlocked} onClick={()=>onChooseTheme(t.id)}><span/><b>{t.name}</b><small>{unlocked?(stats?.selected_theme===t.id?"Selected":"Unlocked"):"Unlock at "+t.unlock+" XP"}</small></button>})}</div></section>
    <section className="reward-card global-leaderboard"><div className="reward-card-heading"><span className="reward-icon"><Trophy/></span><span className="eyebrow">GLOBAL LEADERBOARD</span></div><h2>Top NEXUS players</h2>{leaderboard?.length?leaderboard.map((player,i)=><div className="activity-row" key={player.username+i}><b className="rank-number">#{i+1}</b><div><b>{player.username}</b><small>Level {player.level} · {player.games_played} games</small></div><strong>{player.xp} XP</strong></div>):<div className="empty-small">No ranked players yet. Start earning XP to appear here.</div>}</section>
    <section className="reward-card activity-card"><div className="reward-card-heading"><span className="reward-icon"><Activity/></span><span className="eyebrow">FRIENDS ACTIVITY</span></div><h2>Community activity</h2><p className="muted">Recent games and challenges shared by your accepted NEXUS friends.</p>{loading?<p className="muted">Loading activity…</p>:activity?.length?activity.map((item,i)=><div className="activity-row" key={item.id||item.created_at+i}><span className="activity-avatar">{(item.username||"N").slice(0,1).toUpperCase()}</span><div><b>{item.username}</b><small>{item.detail}</small></div><time>{new Date(item.created_at).toLocaleDateString()}</time></div>):<div className="empty-small">No friend activity yet. Add friends and their game activity will appear here.</div>}</section>
  </div>;
}

function AdminPage({ stats, online, reports=[], updateReport, gameSubmissions=[], reviewGameSubmission, games=[], announcements=[], settings={}, onSaveSiteConfig, siteConfigBusy=false }) {
 return <><div className="page-title-row"><div><div className="eyebrow">CONTROL CENTER</div><h1>Admin dashboard</h1><p className="muted">Community activity and moderation.</p></div><span className="admin-tag"><Shield size={14}/> ADMINISTRATOR</span></div><div className="stat-grid"><StatCard icon={Users} label="Online users" value={stats.online} note="Live connections" tone="purple"/><StatCard icon={Gamepad2} label="Active lobbies" value={stats.rooms} note="Open game rooms" tone="blue"/><StatCard icon={Gauge} label="Game catalog" value={stats.games} note="Available experiences" tone="orange"/><StatCard icon={Activity} label="API status" value="Online" note="Server responding" tone="green"/></div><section className="social-panel"><h2>Game submissions ({gameSubmissions.length})</h2>{gameSubmissions.length?gameSubmissions.map(item=><div className="report-row" key={item.id}><div><b>{item.name} · {item.category}</b><p>{item.description}</p><a href={item.url} target="_blank" rel="noreferrer">Open submitted game</a></div><button onClick={()=>reviewGameSubmission(item,"approved")}>Approve</button><button onClick={()=>reviewGameSubmission(item,"rejected")}>Reject</button></div>):<p className="muted">No pending game submissions.</p>}</section><section className="social-panel"><h2>Moderation queue ({reports.length})</h2>{reports.length?reports.map(r=><div className="report-row" key={r.id}><div><b>{r.reported_username} in #{r.channel}</b><p>{r.message_text}</p><small>Reason: {r.reason}</small></div><button onClick={()=>updateReport(r,"reviewed")}>Mark reviewed</button><button onClick={()=>updateReport(r,"dismissed")}>Dismiss</button></div>):<p className="muted">No open reports.</p>}</section><AdminSeasonalEvents/><NexusSiteManager games={games} announcements={announcements} settings={settings} onSave={onSaveSiteConfig} busy={siteConfigBusy}/><div className="section-heading"><div><h2>Online members</h2><p>Currently connected to Nexus.</p></div></div><div className="people-grid">{online.map((n,i)=><div className="person-card" key={n+i}><div className="avatar">{n.slice(0,1).toUpperCase()}</div><b>{n}</b><span className="online-pill">Online</span></div>)}</div></>;
}