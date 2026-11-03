import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Activity, ArrowRight, Bell, ChevronDown, CircleHelp, Gamepad2, Gauge,
  Hash, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search,
  Settings, Shield, Sparkles, Users, X, Zap
} from "lucide-react";
import { supabase } from "./supabase";

const API = import.meta.env.VITE_SERVER_URL || "";
const starterGames = [
  { name: "Party Arena", type: "Party game", players: "2–8 players", color: "violet", icon: "🎉", description: "Quick rounds, ridiculous surprises, and bragging rights." },
  { name: "Neon Racers", type: "Racing", players: "2–6 players", color: "blue", icon: "🏎️", description: "Race your friends through glowing obstacle courses." },
  { name: "Trivia Clash", type: "Trivia", players: "2–12 players", color: "orange", icon: "🧠", description: "Put your random knowledge to the test." }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [guest, setGuest] = useState(() => localStorage.getItem("nexus_guest") || "");
  const [page, setPage] = useState("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [channel, setChannel] = useState("general");
  const [rooms, setRooms] = useState([]);
  const [myLobby, setMyLobby] = useState(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyError, setLobbyError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [adminStats, setAdminStats] = useState({ online: 0, rooms: 0, games: 3 });

  const username = profile?.username || guest || "Guest";
  const isAdmin = profile?.role === "admin";

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
      const { data } = await supabase.from("profiles").select("username, role").eq("id", user.id).maybeSingle();
      if (data) {
        if (!cancelled) setProfile(data);
        return;
      }
      const metadataName = String(user.user_metadata?.username || user.email?.split("@")[0] || "member").trim().slice(0, 24);
      const cleanName = metadataName.length >= 2 ? metadataName : `member_${user.id.slice(0, 8)}`;
      let { data: created, error } = await supabase.from("profiles").upsert(
        { id: user.id, username: cleanName, role: "member" }, { onConflict: "id" }
      ).select("username, role").single();
      if (error) {
        const fallbackName = `${cleanName.slice(0, 15)}_${user.id.slice(0, 6)}`;
        const retry = await supabase.from("profiles").upsert(
          { id: user.id, username: fallbackName, role: "member" }, { onConflict: "id" }
        ).select("username, role").single();
        created = retry.data;
      }
      if (!cancelled) setProfile(created || { username: cleanName, role: "member" });
    }
    loadProfile();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!username || username === "Guest") return;
    const s = io(API || window.location.origin, { transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("connect", () => s.emit("presence:join", { username }));
    s.on("presence:update", setOnline);
    s.on("chat:message", m => setMessages(old => [...old.slice(-99), m]));
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

  const initials = username.slice(0, 1).toUpperCase();
  const nav = [
    { id: "home", label: "Overview", icon: LayoutDashboard },
    { id: "games", label: "Games & lobbies", icon: Gamepad2 },
    { id: "chat", label: "Community chat", icon: MessageCircle },
    { id: "friends", label: "People", icon: Users },
    ...(isAdmin ? [{ id: "admin", label: "Admin panel", icon: Shield }] : [])
  ];

  async function submitAuth(e) {
    e.preventDefault(); setAuthError(""); setAuthSuccess(""); setAuthBusy(true);
    try {
      if (!supabase) throw new Error("Connect Supabase first. See the README setup guide, or continue as a guest.");
      if (authMode === "signup") {
        const cleanName = usernameInput.trim() || email.split("@")[0];
        if (cleanName.length < 2) throw new Error("Username must be at least 2 characters.");
        const emailRedirectTo = window.location.hostname.endsWith("github.io")
          ? `${window.location.origin}/Skipper/`
          : `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: { username: cleanName }
          }
        });
        if (error) throw error;
        setAuthSuccess("Account created! Check your inbox for the confirmation link. After you click it, Nexus will sign you in automatically.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) { setAuthError(err.message || "Something went wrong."); }
    finally { setAuthBusy(false); }
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
  function createLobby(game) { setLobbyError(""); socket?.emit("lobby:create", { username, game }); }
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
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileNav(false); }}><item.icon size={18}/><span>{item.label}</span>{item.id === "chat" && <i className="nav-ping"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Explore the community and find your next game.</p><button onClick={() => setPage("games")}>Explore games <ArrowRight size={14}/></button></div><div className="user-card"><div className="avatar">{initials}</div><div className="user-meta"><b>{username}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></div><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{nav.find(n => n.id === page)?.label || "Overview"}</b></div><div className="top-actions"><div className="search-box"><Search size={16}/><input placeholder="Search Nexus..." onKeyDown={e => e.key === "Enter" && setNotice("Search is ready to connect to your content index.")}/><kbd>⌘ K</kbd></div><div className="notification-wrap"><button className="icon-btn notification" type="button" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><Bell size={18}/><i/></button>{notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications"><div className="notification-popover-head"><b>Notifications</b><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={15}/></button></div><div className="notification-empty"><Bell size={22}/><b>You are all caught up</b><span>New notifications will appear here.</span></div></div>}</div><div className="avatar small">{initials}</div></div></header>
      <div className="page-content">
        {notice && <div className="notice"><Sparkles size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {page === "home" && <HomePage username={username} online={online} rooms={rooms} setPage={setPage} setNotice={setNotice}/>}
        {page === "games" && <GamesPage rooms={rooms} myLobby={myLobby} lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} lobbyError={lobbyError} createLobby={createLobby} joinLobby={joinLobby} leaveLobby={leaveLobby} startLobby={startLobby}/>}
        {page === "chat" && <ChatPage username={username} online={online} messages={messages} channel={channel} setChannel={setChannel} messageText={messageText} setMessageText={setMessageText} sendMessage={sendMessage}/>}
        {page === "friends" && <PeoplePage online={online}/>}
        {page === "admin" && (isAdmin ? <AdminPage stats={adminStats} online={online}/> : <div className="empty-state"><Shield/><h2>Admin access required</h2><p>Your account does not have administrator permissions.</p></div>)}
      </div>
    </main>
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

function HomePage({ username, online, rooms, setPage, setNotice }) {
  return <><div className="welcome-row"><div><div className="eyebrow">MONDAY, NOVEMBER 2, 2026 <span>✦</span> YOUR SPACE</div><h1>Good to see you, {username}.</h1><p className="muted">Your people are here. What are we doing today?</p></div><button className="primary-btn" onClick={() => setPage("games")}><Plus size={17}/> Find a game</button></div>
    <section className="hero-card"><div className="hero-glow"/><div className="hero-content"><div className="hero-pill"><Zap size={13}/> THE COMMUNITY HUB</div><h2>Make every moment<br/><span>count together.</span></h2><p>Jump into a game, catch up with friends, or start something new. Your next favorite moment is one click away.</p><div className="hero-buttons"><button className="white-btn" onClick={() => setPage("games")}>Explore games <ArrowRight size={16}/></button><button className="text-btn" onClick={() => setPage("chat")}>Open community chat</button></div></div><div className="hero-art"><div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="hero-cube">✦</div><div className="float-card float-top"><span>✦</span><div><b>Good vibes</b><small>always online</small></div></div><div className="float-card float-bottom"><div className="mini-avatars"><i>J</i><i>M</i><i>A</i></div><div><b>{online.length} online</b><small>playing together</small></div></div></div></section>
    <div className="section-heading"><div><h2>Your community</h2><p>Here's what's happening right now.</p></div><button className="subtle-link" onClick={() => setPage("friends")}>View people <ArrowRight size={14}/></button></div>
    <div className="stat-grid"><StatCard icon={Users} label="People online" value={online.length} note="Connected right now" tone="purple"/><StatCard icon={Gamepad2} label="Active lobbies" value={rooms.length} note="Ready for players" tone="blue"/><StatCard icon={MessageCircle} label="Chat channels" value="04" note="Places to talk" tone="orange"/><StatCard icon={Activity} label="Community status" value="Live" note="Everything looks good" tone="green"/></div>
    <div className="section-heading game-heading"><div><h2>Pick your next adventure</h2><p>Something fun is always around the corner.</p></div><button className="subtle-link" onClick={() => setPage("games")}>All games <ArrowRight size={14}/></button></div>
    <div className="game-grid">{starterGames.map(g => <GameCard key={g.name} game={g} onClick={() => setPage("games")}/>)}</div>
  </>;
}
function StatCard({ icon: Icon, label, value, note, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note"><span/> {note}</div></div>; }
function GameCard({ game, onClick }) { return <button className={`game-card ${game.color}`} onClick={onClick}><div className="game-art"><span>{game.icon}</span><div className="art-shine"/></div><div className="game-info"><div className="game-type">{game.type} <span>•</span> {game.players}</div><h3>{game.name}</h3><p>{game.description}</p><div className="game-play">View game <ArrowRight size={15}/></div></div></button>; }

function GamesPage({ rooms, myLobby, lobbyCode, setLobbyCode, lobbyError, createLobby, joinLobby, leaveLobby, startLobby }) {
  return <><div className="page-title-row"><div><div className="eyebrow">PLAY TOGETHER</div><h1>Games & lobbies</h1><p className="muted">Pick a game or join friends with a lobby code.</p></div><span className="live-tag"><i/> LIVE SERVERS</span></div>
    {myLobby && <section className="lobby-panel"><div><div className="eyebrow">YOUR LOBBY · {myLobby.code}</div><h2>{myLobby.game}</h2><p>{myLobby.players.length} player{myLobby.players.length === 1 ? "" : "s"} in this room</p><div className="player-chips">{myLobby.players.map(n => <span key={n}>{n}</span>)}</div></div><div className="lobby-actions"><button className="secondary-btn" onClick={() => navigator.clipboard?.writeText(myLobby.code)}>Copy code</button>{!myLobby.started && <button className="primary-btn" onClick={startLobby}>Start game <ArrowRight size={16}/></button>}<button className="quiet-btn" onClick={leaveLobby}>Leave</button></div></section>}
    {lobbyError && <div className="form-error">{lobbyError}</div>}
    <div className="games-layout"><div><div className="section-heading"><div><h2>Game library</h2><p>Choose your kind of fun.</p></div></div><div className="library-grid">{starterGames.map(g => <div className="library-card" key={g.name}><div className={`library-icon ${g.color}`}>{g.icon}</div><div className="library-copy"><h3>{g.name}</h3><p>{g.description}</p><small>{g.players}</small></div><button className="icon-btn add-game" title={`Create ${g.name} lobby`} onClick={() => createLobby(g.name)}><Plus/></button></div>)}</div></div>
    <aside className="join-panel"><div className="panel-icon"><Hash/></div><h2>Got an invite?</h2><p>Enter a lobby code from a friend and jump right in.</p><input className="code-input" value={lobbyCode} onChange={e => setLobbyCode(e.target.value.toUpperCase())} placeholder="E.G. A4B29F" maxLength={12}/><button className="primary-btn full" onClick={() => joinLobby(lobbyCode)}>Join lobby <ArrowRight size={16}/></button><div className="join-divider"/><div className="eyebrow">PUBLIC LOBBIES <span className="count">{rooms.length}</span></div>{rooms.length ? rooms.map(r => <div className="room-row" key={r.code}><div className="room-avatar">🎮</div><div><b>{r.game}</b><small>{r.players.length} players · {r.code}</small></div><button onClick={() => joinLobby(r.code)}>Join</button></div>) : <div className="empty-small">No public lobbies yet. Create one!</div>}</aside></div>
  </>;
}

function ChatPage({ username, online, messages, channel, setChannel, messageText, setMessageText, sendMessage }) {
  const channels = ["general", "gaming", "memes", "introductions"];
  return <div className="chat-layout"><aside className="chat-channels"><div className="chat-space"><div className="workspace-icon">N</div><div><b>Nexus Community</b><small>Community server</small></div></div><div className="nav-label">TEXT CHANNELS</div>{channels.map(c => (
  <button
    key={c}
    className={`channel-btn ${channel === c ? "selected" : ""}`}
    onClick={() => setChannel(c)}
  >
    <Hash size={16}/>{c}
  </button>
))}<div className="chat-online"><div className="nav-label">ONLINE — {online.length}</div>{online.map((n,i) => <div className="online-person" key={`${n}-${i}`}><span className="avatar tiny">{n.slice(0,1).toUpperCase()}</span>{n}<i/></div>)}</div></aside><section className="chat-main"><div className="chat-header"><div><h2><Hash size={19}/>{channel}</h2><p>A place for good conversations.</p></div><span className="live-tag"><i/> CONNECTED</span></div><div className="message-list">{messages.filter(m => !m.system || m.text?.includes(channel)).map(m => <div className={`message ${m.system ? "system-message" : ""}`} key={m.id || `${m.at}-${m.text}`}><div className="avatar">{m.system ? "✦" : m.username?.slice(0,1).toUpperCase()}</div><div className="message-body"><div className="message-meta"><b>{m.username || "Nexus"}</b><small>{m.at ? new Date(m.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : ""}</small></div><p>{m.text}</p></div></div>)}{messages.length === 0 && <div className="chat-empty"><div>✦</div><h3>Welcome to #{channel}</h3><p>This is the beginning of the conversation. Say hello!</p></div>}</div><form className="message-composer" onSubmit={sendMessage}><button type="button" className="icon-btn"><Plus/></button><input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder={`Message #${channel}`} maxLength={1000}/><button className="send-btn" disabled={!messageText.trim()}><ArrowRight/></button></form></section></div>;
}

function PeoplePage({ online }) {
  return <><div className="page-title-row"><div><div className="eyebrow">YOUR COMMUNITY</div><h1>People</h1><p className="muted">See who's hanging out in Nexus right now.</p></div><span className="live-tag"><i/> {online.length} ONLINE</span></div><div className="people-grid">{online.map((n,i) => <div className="person-card" key={`${n}-${i}`}><div className="avatar large">{n.slice(0,1).toUpperCase()}</div><div><b>{n}</b><small><i/> Online now</small></div><span className="member-tag">MEMBER</span></div>)}{!online.length && <div className="empty-state"><Users/><h2>It's quiet in here</h2><p>When people connect, they'll show up here.</p></div>}</div></>;
}
function AdminPage({ stats, online }) {
  return <><div className="page-title-row"><div><div className="eyebrow">CONTROL CENTER</div><h1>Admin dashboard</h1><p className="muted">A quick look at your community's activity.</p></div><span className="admin-tag"><Shield size={14}/> ADMINISTRATOR</span></div><div className="stat-grid"><StatCard icon={Users} label="Online users" value={stats.online} note="Live connections" tone="purple"/><StatCard icon={Gamepad2} label="Active lobbies" value={stats.rooms} note="Open game rooms" tone="blue"/><StatCard icon={Gauge} label="Game catalog" value={stats.games} note="Available experiences" tone="orange"/><StatCard icon={Activity} label="API status" value="Online" note="Server responding" tone="green"/></div><div className="admin-note"><Shield/><div><b>Admin tools starter</b><p>This dashboard currently displays live server statistics. Add moderation actions and audit logging only after implementing server-side role checks and permission policies. Never trust a role stored only in the browser.</p></div></div><div className="section-heading"><div><h2>Online members</h2><p>Currently connected to Nexus.</p></div></div><div className="people-grid">{online.map((n,i) => <div className="person-card" key={`${n}-${i}`}><div className="avatar">{n.slice(0,1).toUpperCase()}</div><b>{n}</b><span className="online-pill">Online</span></div>)}</div></>;
}