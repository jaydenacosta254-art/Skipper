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
  const [guestProfile, setGuestProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("nexus_guest_profile") || "null"); } catch { return null; } });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ username: "", avatar_url: "", bio: "", status: "" });
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
  const [channel, setChannel] = useState("general");
  const [rooms, setRooms] = useState([]);
  const [myLobby, setMyLobby] = useState(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyError, setLobbyError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [adminStats, setAdminStats] = useState({ online: 0, rooms: 0, games: 3 });

  const username = profile?.username || guestProfile?.username || guest || "Guest";
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
      const { data } = await supabase.from("profiles").select("username, role, avatar_url, bio, status").eq("id", user.id).maybeSingle();
      if (data) {
        if (!cancelled) setProfile(data);
        return;
      }
      const metadataName = String(user.user_metadata?.username || user.email?.split("@")[0] || "member").trim().slice(0, 24);
      const cleanName = metadataName.length >= 2 ? metadataName : `member_${user.id.slice(0, 8)}`;
      let { data: created, error } = await supabase.from("profiles").upsert(
        { id: user.id, username: cleanName, role: "member", avatar_url: null, bio: "", status: "Available" }, { onConflict: "id" }
      ).select("username, role, avatar_url, bio, status").single();
      if (error) {
        const fallbackName = `${cleanName.slice(0, 15)}_${user.id.slice(0, 6)}`;
        const retry = await supabase.from("profiles").upsert(
          { id: user.id, username: fallbackName, role: "member" }, { onConflict: "id" }
        ).select("username, role, avatar_url, bio, status").single();
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
    if (profile?.role === "admin") supabase.from("chat_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).then(({data}) => setReports(data || []));
  }, [session, profile]);

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

  function openProfileEditor() {
    setProfileDraft({ username, avatar_url: profile?.avatar_url || guestProfile?.avatar_url || "", bio: profile?.bio || guestProfile?.bio || "", status: profile?.status || guestProfile?.status || "Available" });
    setProfileError(""); setProfileFile(null); setProfileOpen(true);
  }
  async function saveProfile(e) {
    e.preventDefault(); setProfileError("");
    const clean = { username: profileDraft.username.trim().slice(0,24), avatar_url: profileDraft.avatar_url.trim(), bio: profileDraft.bio.trim().slice(0,160), status: profileDraft.status.trim().slice(0,40) || "Available" };
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
        const { data, error } = await supabase.from("profiles").update(clean).eq("id", session.user.id).select("username, role, avatar_url, bio, status").single();
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
  async function updateReport(report, status) {
    const { error } = await supabase.from("chat_reports").update({ status }).eq("id", report.id);
    if (error) return setNotice(error.message);
    setReports(old => old.filter(r => r.id !== report.id));
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
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Explore the community and find your next game.</p><button onClick={() => setPage("games")}>Explore games <ArrowRight size={14}/></button></div><div className="user-card"><button className="profile-trigger" onClick={openProfileEditor} title="Edit your profile"><ProfileAvatar username={username} url={profile?.avatar_url || guestProfile?.avatar_url}/><span className="user-meta"><b>{username}</b><small>{isAdmin ? "Administrator" : "Community member"}</small></span></button><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> <b>{nav.find(n => n.id === page)?.label || "Overview"}</b></div><div className="top-actions"><div className="search-box"><Search size={16}/><input placeholder="Search Nexus..." onKeyDown={e => e.key === "Enter" && setNotice("Search is ready to connect to your content index.")}/><kbd>⌘ K</kbd></div><div className="notification-wrap"><button className="icon-btn notification" type="button" title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(open => !open)}><Bell size={18}/><i/></button>{notificationsOpen && <div className="notification-popover" role="dialog" aria-label="Notifications"><div className="notification-popover-head"><b>Notifications</b><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={15}/></button></div><div className="notification-items">{notifications.length ? notifications.map(n => <button key={n.id} className={"notification-item " + (n.read ? "read" : "")} onClick={() => markNotificationRead(n)}><b>{n.kind.replace("_", " ")}</b><span>{n.body}</span><small>{new Date(n.created_at).toLocaleString()}</small></button>) : <div className="notification-empty"><Bell size={22}/><b>You are all caught up</b><span>New notifications will appear here.</span></div>}</div></div>}</div><button className="top-profile-button" onClick={openProfileEditor} title="Edit your profile"><ProfileAvatar username={username} url={profile?.avatar_url || guestProfile?.avatar_url} small/></button></div></header>
      <div className="page-content">
        {notice && <div className="notice"><Sparkles size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
        {page === "home" && <HomePage username={username} online={online} rooms={rooms} setPage={setPage} setNotice={setNotice}/>}
        {page === "games" && <GamesPage rooms={rooms} myLobby={myLobby} lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} lobbyError={lobbyError} createLobby={createLobby} joinLobby={joinLobby} leaveLobby={leaveLobby} startLobby={startLobby}/>}
        {page === "chat" && <ChatPage username={username} online={online} messages={messages} channel={channel} setChannel={setChannel} messageText={messageText} setMessageText={setMessageText} sendMessage={sendChatMessage} chatFile={chatFile} setChatFile={setChatFile} replyTo={replyTo} setReplyTo={setReplyTo} reactToMessage={reactToMessage} editMessage={editMessage} deleteMessage={deleteMessage} reportMessage={reportMessage}/>}
        {page === "friends" && <PeoplePage online={online} session={session} friendRequests={friendRequests} addFriend={addFriend} respondFriend={respondFriend} openDM={openDM} blockUser={blockUser} dmTarget={dmTarget} dmMessages={dmMessages} dmText={dmText} setDmText={setDmText} sendDM={sendDM} closeDM={() => setDmTarget(null)}/>}
        {page === "admin" && (isAdmin ? <AdminPage stats={adminStats} online={online} reports={reports} updateReport={updateReport}/> : <div className="empty-state"><Shield/><h2>Admin access required</h2><p>Your account does not have administrator permissions.</p></div>)}
      </div>
    </main>
    {profileOpen && <ProfileEditor draft={profileDraft} setDraft={setProfileDraft} onSave={saveProfile} onClose={() => setProfileOpen(false)} busy={profileBusy} error={profileError} file={profileFile} setFile={setProfileFile} username={username} avatarUrl={profile?.avatar_url || guestProfile?.avatar_url}/>}
  </div>;
}

function ProfileAvatar({ username, url, small = false }) {
  const initials = (username || "G").slice(0,1).toUpperCase();
  return url ? <img className={`avatar profile-avatar-image ${small ? "small" : ""}`} src={url} alt={`${username}'s profile`} onError={e => { e.currentTarget.style.display = "none"; }}/> : <div className={`avatar ${small ? "small" : ""}`}>{initials}</div>;
}

function ProfileEditor({ draft, setDraft, onSave, onClose, busy, error, file, setFile, username, avatarUrl }) {
  const change = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  return <div className="profile-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
      <div className="profile-modal-head"><div><div className="eyebrow">MAKE IT YOURS</div><h2 id="profile-editor-title">Edit profile</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X/></button></div>
      <div className="profile-preview"><ProfileAvatar username={draft.username || username} url={draft.avatar_url || avatarUrl}/><div><b>{draft.username || username}</b><small>{draft.status || "Available"}</small></div></div>
      <form className="profile-form" onSubmit={onSave}>
        <label>Username<input value={draft.username} onChange={e => change("username", e.target.value)} maxLength={24} minLength={2} required/></label>
        <label>Upload profile picture<input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}/><small>{file ? `Selected: ${file.name}` : "Choose an image from your device (max 5 MB)."} Uploads are saved to your account.</small></label>\n        <label>Or use a profile picture URL<input type="url" value={draft.avatar_url} onChange={e => { change("avatar_url", e.target.value); if (file) setFile(null); }} placeholder="https://example.com/photo.jpg"/><small>Paste a direct link to an image instead.</small></label>
        <label>Status<input value={draft.status} onChange={e => change("status", e.target.value)} maxLength={40} placeholder="Available"/></label>
        <label>About me<textarea value={draft.bio} onChange={e => change("bio", e.target.value)} maxLength={160} rows={3} placeholder="Tell the community a little about yourself..."/></label>
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

function ChatPage({ username, online, messages, channel, setChannel, messageText, setMessageText, sendMessage, chatFile, setChatFile, replyTo, setReplyTo, reactToMessage, editMessage, deleteMessage, reportMessage }) {
 const channels=["general","gaming","memes","introductions"];
 const shown=messages.filter(m=>!m.system||m.text?.includes(channel));
 return <div className="chat-layout"><aside className="chat-channels"><div className="chat-space"><div className="workspace-icon">N</div><div><b>Nexus Community</b><small>Community server</small></div></div><div className="nav-label">TEXT CHANNELS</div>{channels.map(c=><button key={c} className={"channel-btn "+(channel===c?"selected":"")} onClick={()=>setChannel(c)}><Hash size={16}/>{c}</button>)}<div className="chat-online"><div className="nav-label">ONLINE — {online.length}</div>{online.map((n,i)=><div className="online-person" key={n+i}><span className="avatar tiny">{n.slice(0,1).toUpperCase()}</span>{n}<i/></div>)}</div></aside><section className="chat-main"><div className="chat-header"><div><h2><Hash size={19}/>{channel}</h2><p>A place for good conversations.</p></div><span className="live-tag"><i/> CONNECTED</span></div><div className="message-list">{shown.map(m=><div className={"message "+(m.system?"system-message":"")} key={m.id||m.at}><div className="avatar">{m.system?"✦":m.username?.slice(0,1).toUpperCase()}</div><div className="message-body"><div className="message-meta"><b>{m.username||"Nexus"}</b><small>{m.at?new Date(m.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""} {m.edited?"(edited)":""}</small></div>{m.replyTo&&<small className="reply-context">Replying to {m.replyTo.username}: {m.replyTo.text}</small>}<p>{m.text}</p>{m.attachment&&<a className="chat-attachment" href={m.attachment.url} target="_blank" rel="noreferrer">📎 {m.attachment.name}</a>}{!m.system&&<div className="message-tools"><button type="button" onClick={()=>setReplyTo(m)}>Reply</button>{["👍","❤️","😂","🎉","👀"].map(e=><button type="button" key={e} onClick={()=>reactToMessage(m.id,e)}>{e} {m.reactions?.[e]?.length||""}</button>)}{m.username===username&&<><button type="button" onClick={()=>editMessage(m)}>Edit</button><button type="button" onClick={()=>deleteMessage(m)}>Delete</button></>}<button type="button" onClick={()=>reportMessage(m)}>Report</button></div>}</div></div>)}{!shown.length&&<div className="chat-empty"><div>✦</div><h3>Welcome to #{channel}</h3><p>This is the beginning of the conversation. Say hello!</p></div>}</div>{replyTo&&<div className="reply-banner">Replying to {replyTo.username}<button type="button" onClick={()=>setReplyTo(null)}>Cancel</button></div>}<form className="message-composer" onSubmit={sendMessage}><label className="attach-button" title="Attach image or PDF">＋<input type="file" accept="image/*,application/pdf" onChange={e=>setChatFile(e.target.files?.[0]||null)}/></label><input value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder={chatFile?chatFile.name:"Message #"+channel} maxLength={1000}/><button className="send-btn" disabled={!messageText.trim()&&!chatFile}><ArrowRight/></button></form></section></div>;
}
function PeoplePage({ online, session, friendRequests, addFriend, respondFriend, openDM, blockUser, dmTarget, dmMessages, dmText, setDmText, sendDM, closeDM }) {
 const incoming=friendRequests.filter(r=>r.receiver_id===session?.user?.id&&r.status==="pending");
 const accepted=friendRequests.filter(r=>r.status==="accepted");
 return <><div className="page-title-row"><div><div className="eyebrow">YOUR COMMUNITY</div><h1>People & friends</h1><p className="muted">Connect with members and start private conversations.</p></div><span className="live-tag"><i/> {online.length} ONLINE</span></div>{!session&&<div className="form-error">Sign in to use friends and private messages.</div>}{incoming.length>0&&<section className="social-panel"><h2>Friend requests</h2>{incoming.map(r=><div className="social-row" key={r.id}><span>Incoming friend request</span><button onClick={()=>respondFriend(r,true)}>Accept</button><button onClick={()=>respondFriend(r,false)}>Decline</button></div>)}</section>}<section className="social-panel"><h2>Friends ({accepted.length})</h2>{accepted.length?accepted.map(r=><div className="social-row" key={r.id}><span>Friend connection</span><small>Accepted</small></div>):<p className="muted">Accepted friends will appear here.</p>}</section><div className="section-heading"><div><h2>People online</h2><p>Send a friend request to someone in the community.</p></div></div><div className="people-grid">{online.map((n,i)=><div className="person-card" key={n+i}><div className="avatar large">{n.slice(0,1).toUpperCase()}</div><div><b>{n}</b><small><i/> Online now</small></div><button className="secondary-btn" onClick={()=>addFriend(n)}>Add friend</button><button className="secondary-btn" onClick={()=>openDM(n)}>Message</button><button className="quiet-btn" onClick={()=>blockUser(n)}>Block</button></div>)}{!online.length&&<div className="empty-state"><Users/><h2>It's quiet in here</h2><p>When people connect, they'll show up here.</p></div>}</div>{dmTarget&&<section className="dm-panel"><div className="dm-head"><h2>Message {dmTarget.username}</h2><button onClick={closeDM}>Close</button></div><div className="dm-history">{dmMessages.map(m=><p key={m.id}><b>{m.sender_id===session?.user?.id?"You":dmTarget.username}:</b> {m.body}</p>)}</div><form className="message-composer" onSubmit={sendDM}><input value={dmText} onChange={e=>setDmText(e.target.value)} placeholder="Write a private message..." maxLength={2000}/><button className="send-btn" disabled={!dmText.trim()}><ArrowRight/></button></form></section>}</>;
}
function AdminPage({ stats, online, reports=[], updateReport }) {
 return <><div className="page-title-row"><div><div className="eyebrow">CONTROL CENTER</div><h1>Admin dashboard</h1><p className="muted">Community activity and moderation.</p></div><span className="admin-tag"><Shield size={14}/> ADMINISTRATOR</span></div><div className="stat-grid"><StatCard icon={Users} label="Online users" value={stats.online} note="Live connections" tone="purple"/><StatCard icon={Gamepad2} label="Active lobbies" value={stats.rooms} note="Open game rooms" tone="blue"/><StatCard icon={Gauge} label="Game catalog" value={stats.games} note="Available experiences" tone="orange"/><StatCard icon={Activity} label="API status" value="Online" note="Server responding" tone="green"/></div><section className="social-panel"><h2>Moderation queue ({reports.length})</h2>{reports.length?reports.map(r=><div className="report-row" key={r.id}><div><b>{r.reported_username} in #{r.channel}</b><p>{r.message_text}</p><small>Reason: {r.reason}</small></div><button onClick={()=>updateReport(r,"reviewed")}>Mark reviewed</button><button onClick={()=>updateReport(r,"dismissed")}>Dismiss</button></div>):<p className="muted">No open reports.</p>}</section><div className="section-heading"><div><h2>Online members</h2><p>Currently connected to Nexus.</p></div></div><div className="people-grid">{online.map((n,i)=><div className="person-card" key={n+i}><div className="avatar">{n.slice(0,1).toUpperCase()}</div><b>{n}</b><span className="online-pill">Online</span></div>)}</div></>;
}