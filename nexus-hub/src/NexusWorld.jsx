import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  Dices, Clock3, FolderPlus, Target, Flag, Activity, UserRound,
  Users, Sparkles, LayoutGrid, Image, Newspaper, Lightbulb, Send,
  Plus, Check, X, MessageCircle, LogIn, LogOut, Gamepad2
} from "lucide-react";
import "./NexusWorld.css";

const challenges = [
  { id: "daily-pick", title: "Try the featured game", detail: "Play the NEXUS game of the day." },
  { id: "new-genre", title: "Explore a new genre", detail: "Open a game you have not played recently." },
  { id: "community-voice", title: "Share an idea", detail: "Send a suggestion to the NEXUS team." }
];
const decorations = [
  { id: "none", label: "Classic", className: "" },
  { id: "orbit", label: "Orbit", className: "world-decoration-orbit" },
  { id: "spark", label: "Sparkles", className: "world-decoration-spark" },
  { id: "pulse", label: "Pulse", className: "world-decoration-pulse" }
];
const backgrounds = [
  { id: "violet", label: "Violet", value: "linear-gradient(135deg,#272044,#141827 65%)" },
  { id: "ocean", label: "Ocean", value: "linear-gradient(135deg,#10374a,#141827 65%)" },
  { id: "ember", label: "Ember", value: "linear-gradient(135deg,#4a2b24,#141827 65%)" },
  { id: "forest", label: "Forest", value: "linear-gradient(135deg,#153c33,#141827 65%)" }
];

function readLocal(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; }
  catch { return fallback; }
}
function dayIndex(length) {
  const date = new Date();
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return day % length;
}
function weekIndex(length) {
  const date = new Date();
  const start = new Date(date.getFullYear(), 0, 1);
  const week = Math.floor(((date - start) / 86400000 + start.getDay()) / 7);
  return week % length;
}

export default function NexusWorld({
  session, username, profile, games = [], online = [], activity = [],
  isAdmin = false, onOpenGames = () => {}, setNotice = () => {}
}) {
  const userId = session?.user?.id;
  const playable = useMemo(() => games.filter(game => game.externalUrl), [games]);
  const dailyGame = playable[dayIndex(Math.max(playable.length, 1))] || games[0];
  const weeklyGame = playable[weekIndex(Math.max(playable.length, 1))] || dailyGame;
  const [tab, setTab] = useState("arcade");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState([]);
  const [collectionName, setCollectionName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [groupRows, setGroupRows] = useState([]);
  const [memberRows, setMemberRows] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupDraft, setGroupDraft] = useState({ name: "", description: "" });
  const [groupMessage, setGroupMessage] = useState("");
  const [showcaseGames, setShowcaseGames] = useState([]);
  const [communityShowcases, setCommunityShowcases] = useState([]);
  const [news, setNews] = useState([]);
  const [newsDraft, setNewsDraft] = useState({ title: "", body: "" });
  const [suggestionDraft, setSuggestionDraft] = useState({ name: "", url: "", reason: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportDraft, setReportDraft] = useState({ game: games[0]?.name || "", reason: "Game will not load", details: "" });
  const [status, setStatus] = useState(profile?.status || readLocal("nexus_world_status", "Available"));
  const [recentGames] = useState(() => readLocal("nexus_recent_games", []));
  const [doneChallenges, setDoneChallenges] = useState(() => readLocal("nexus_world_challenges_" + (userId || "guest"), []));
  const [style, setStyle] = useState(() => readLocal("nexus_world_style_" + (userId || "guest"), {
    decoration: "none", layout: "spotlight", background: "violet"
  }));
  const signedIn = Boolean(userId && supabase);
  const myGroupIds = memberRows.map(row => row.group_id);

  async function load() {
    if (!supabase) return;
    if (!userId) {
      setCollections([]); setCollectionItems([]); setGroupRows([]); setMemberRows([]);
      setSuggestions([]); setReports([]);
      const { data } = await supabase.from("nexus_news_posts").select("*").order("published_at", { ascending: false }).limit(20);
      setNews(data || []);
      return;
    }
    setBusy(true);
    setError("");
    const jobs = [
      supabase.from("nexus_game_collections").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("nexus_game_collection_items").select("*").eq("user_id", userId),
      supabase.from("nexus_groups").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("nexus_group_members").select("group_id,user_id,role").eq("user_id", userId),
      supabase.from("nexus_profile_showcase").select("featured_games").eq("user_id", userId).maybeSingle(),
      supabase.from("nexus_news_posts").select("*").order("published_at", { ascending: false }).limit(20),
      supabase.from("nexus_profile_showcase").select("username,featured_games").order("updated_at", { ascending: false }).limit(30)
    ];
    if (isAdmin) {
      jobs.push(supabase.from("nexus_game_suggestions").select("*").order("created_at", { ascending: false }).limit(50));
      jobs.push(supabase.from("nexus_game_reports").select("*").order("created_at", { ascending: false }).limit(50));
    }
    const results = await Promise.all(jobs);
    const required = results.slice(0, 6);
    if (required.some(result => result.error)) {
      setError("Some NEXUS World features need their database setup. Run nexus_world_features.sql in Supabase SQL Editor.");
    }
    if (results[0].data) setCollections(results[0].data);
    if (results[1].data) setCollectionItems(results[1].data);
    if (results[2].data) setGroupRows(results[2].data);
    if (results[3].data) setMemberRows(results[3].data);
    if (results[4].data?.featured_games) setShowcaseGames(results[4].data.featured_games);
    if (results[5].data) setNews(results[5].data);
    if (results[6].data) setCommunityShowcases(results[6].data);
    if (isAdmin) {
      if (results[7]?.data) setSuggestions(results[7].data);
      if (results[8]?.data) setReports(results[8].data);
    }
    setBusy(false);
  }

  useEffect(() => { load(); }, [userId, isAdmin]);
  useEffect(() => {
    if (!selectedGroup || !signedIn) { setGroupMessages([]); return; }
    supabase.from("nexus_group_messages").select("*").eq("group_id", selectedGroup)
      .order("created_at", { ascending: true }).limit(80)
      .then(({ data, error: loadError }) => {
        if (loadError) setError("Group messages could not load. Check the NEXUS World SQL setup.");
        else setGroupMessages(data || []);
      });
  }, [selectedGroup, signedIn]);

  function openGame(game) {
    if (!game) return;
    if (game.externalUrl) {
      const target = game.externalUrl.startsWith("/")
        ? new URL(game.externalUrl, window.location.href).href
        : game.externalUrl;
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      onOpenGames();
      setNotice("Open the Games hub to launch " + game.name + ".");
    }
  }
  function chooseRandom() {
    if (!playable.length) return onOpenGames();
    const choice = playable[Math.floor(Math.random() * playable.length)];
    setNotice("Random pick: " + choice.name);
    openGame(choice);
  }
  function saveStyle(next) {
    setStyle(next);
    localStorage.setItem("nexus_world_style_" + (userId || "guest"), JSON.stringify(next));
  }
  function markChallenge(id) {
    if (doneChallenges.includes(id)) return;
    const next = [...doneChallenges, id];
    setDoneChallenges(next);
    localStorage.setItem("nexus_world_challenges_" + (userId || "guest"), JSON.stringify(next));
    setNotice("Challenge marked complete. This tracker does not award XP yet.");
  }
  async function createCollection(e) {
    e.preventDefault();
    if (!signedIn) return setNotice("Sign in to save game collections.");
    const clean = collectionName.trim().slice(0, 40);
    if (!clean) return;
    const { data, error: saveError } = await supabase.from("nexus_game_collections")
      .insert({ user_id: userId, name: clean }).select().single();
    if (saveError) return setError(saveError.message);
    setCollections(rows => [data, ...rows]);
    setCollectionName("");
    setSelectedCollection(data.id);
  }
  async function addToCollection(gameName) {
    const collection = collections.find(row => row.id === selectedCollection);
    if (!collection) return setNotice("Create or choose a collection first.");
    const { data, error: saveError } = await supabase.from("nexus_game_collection_items")
      .insert({ user_id: userId, collection_id: collection.id, game_name: gameName }).select().single();
    if (saveError) return setError(saveError.code === "23505" ? "That game is already in this collection." : saveError.message);
    setCollectionItems(rows => [...rows, data]);
  }
  async function createGroup(e) {
    e.preventDefault();
    if (!signedIn) return setNotice("Sign in to create a community group.");
    const name = groupDraft.name.trim().slice(0, 40);
    if (!name) return;
    const { data, error: createError } = await supabase.from("nexus_groups")
      .insert({ owner_id: userId, name, description: groupDraft.description.trim().slice(0, 180) }).select().single();
    if (createError) return setError(createError.message);
    const { error: memberError } = await supabase.from("nexus_group_members")
      .insert({ group_id: data.id, user_id: userId, role: "owner" });
    if (memberError) return setError("Group created, but membership setup failed: " + memberError.message);
    setGroupRows(rows => [data, ...rows]);
    setMemberRows(rows => [...rows, { group_id: data.id, user_id: userId, role: "owner" }]);
    setGroupDraft({ name: "", description: "" });
    setSelectedGroup(data.id);
  }
  async function joinGroup(group) {
    if (!signedIn) return setNotice("Sign in to join community groups.");
    const { error: joinError } = await supabase.from("nexus_group_members")
      .insert({ group_id: group.id, user_id: userId, role: "member" });
    if (joinError) return setError(joinError.code === "23505" ? "You already joined this group." : joinError.message);
    setMemberRows(rows => [...rows, { group_id: group.id, user_id: userId, role: "member" }]);
    setSelectedGroup(group.id);
  }
  async function leaveGroup(group) {
    if (group.owner_id === userId) return setNotice("Group owners cannot leave their own group. Delete or transfer the group instead.");
    const { error: leaveError } = await supabase.from("nexus_group_members").delete()
      .eq("group_id", group.id).eq("user_id", userId);
    if (leaveError) return setError(leaveError.message);
    setMemberRows(rows => rows.filter(row => row.group_id !== group.id));
    if (selectedGroup === group.id) setSelectedGroup("");
  }
  async function sendGroupMessage(e) {
    e.preventDefault();
    if (!signedIn || !selectedGroup || !groupMessage.trim()) return;
    const { data, error: sendError } = await supabase.from("nexus_group_messages")
      .insert({ group_id: selectedGroup, user_id: userId, username, body: groupMessage.trim().slice(0, 800) })
      .select().single();
    if (sendError) return setError(sendError.message);
    setGroupMessages(rows => [...rows, data]);
    setGroupMessage("");
  }
  async function saveShowcase() {
    if (!signedIn) return setNotice("Sign in to publish your player showcase.");
    const { error: saveError } = await supabase.from("nexus_profile_showcase")
      .upsert({ user_id: userId, username, featured_games: showcaseGames.slice(0, 4), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (saveError) return setError(saveError.message);
    setNotice("Your player showcase is saved.");
  }
  async function updateStatus(next) {
    setStatus(next);
    localStorage.setItem("nexus_world_status", next);
    if (signedIn) {
      const { error: saveError } = await supabase.from("profiles").update({ status: next }).eq("id", userId);
      if (saveError) setError(saveError.message);
    }
  }
  async function publishNews(e) {
    e.preventDefault();
    if (!signedIn || !isAdmin) return setNotice("Only administrators can publish NEXUS news.");
    const { data, error: saveError } = await supabase.from("nexus_news_posts")
      .insert({ author_id: userId, title: newsDraft.title.trim().slice(0, 90), body: newsDraft.body.trim().slice(0, 1200) })
      .select().single();
    if (saveError) return setError(saveError.message);
    setNews(rows => [data, ...rows]);
    setNewsDraft({ title: "", body: "" });
  }
  async function submitSuggestion(e) {
    e.preventDefault();
    if (!signedIn) return setNotice("Sign in to suggest a game.");
    const { error: saveError } = await supabase.from("nexus_game_suggestions")
      .insert({ user_id: userId, username, name: suggestionDraft.name.trim().slice(0, 60),
        url: suggestionDraft.url.trim() || null, reason: suggestionDraft.reason.trim().slice(0, 400) });
    if (saveError) return setError(saveError.message);
    setSuggestionDraft({ name: "", url: "", reason: "" });
    setNotice("Thanks! Your game suggestion was sent to the NEXUS team.");
  }
  async function submitGameReport(e) {
    e.preventDefault();
    if (!signedIn) return setNotice("Sign in to report a game.");
    const { error: saveError } = await supabase.from("nexus_game_reports")
      .insert({ reporter_id: userId, game_name: reportDraft.game, reason: reportDraft.reason, details: reportDraft.details.trim().slice(0, 500) });
    if (saveError) return setError(saveError.message);
    setReportDraft(v => ({ ...v, details: "" }));
    setNotice("Game report sent to the moderators.");
  }
  async function moderate(kind, row, statusValue) {
    const table = kind === "report" ? "nexus_game_reports" : "nexus_game_suggestions";
    const { error: updateError } = await supabase.from(table).update({ status: statusValue }).eq("id", row.id);
    if (updateError) return setError(updateError.message);
    if (kind === "report") setReports(rows => rows.filter(item => item.id !== row.id));
    else setSuggestions(rows => rows.filter(item => item.id !== row.id));
  }

  const selectedItems = collectionItems.filter(item => item.collection_id === selectedCollection);
  const selectedGroupRow = groupRows.find(group => group.id === selectedGroup);
  const previewBackground = backgrounds.find(item => item.id === style.background)?.value || backgrounds[0].value;

  return <main className="nexus-world">
    <div className="page-title-row"><div><div className="eyebrow">THE NEXT SIDE OF NEXUS</div><h1>NEXUS World</h1><p className="muted">Discover games, build your corner of the community, and make it yours.</p></div><span className="live-tag"><Sparkles size={14}/> 15 NEW FEATURES</span></div>
    <div className="world-tabs">
      {[
        ["arcade", "Arcade", Gamepad2], ["social", "Social", Users],
        ["style", "Customize", Sparkles], ["community", "Community", Newspaper]
      ].map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16}/>{label}</button>)}
    </div>
    {error && <div className="feature-error">{error}</div>}
    {tab === "arcade" && <>
      <section className="world-hero" style={{ background: previewBackground }}>
        <div><span className="world-kicker">GAME OF THE DAY</span><h2>{dailyGame?.name || "NEXUS Arcade"}</h2><p>{dailyGame?.description || "Explore the NEXUS game library."}</p><div className="world-actions"><button className="primary-btn" onClick={() => openGame(dailyGame)}>Play today's pick <Gamepad2 size={15}/></button><button className="secondary-btn" onClick={chooseRandom}><Dices size={15}/> Random game</button></div></div>
        <div className="world-hero-art">✦</div>
      </section>
      <div className="world-grid">
        <section className="world-panel"><h2><Clock3/> Recently played</h2><p className="muted">Your latest game visits on this browser.</p>
          {recentGames.length ? <div className="world-chip-list">{recentGames.map(name => <button key={name} onClick={() => openGame(games.find(game => game.name === name))}>{name}</button>)}</div> : <p className="world-empty">Your recent games will show here after you open something in the Games hub.</p>}
        </section>
        <section className="world-panel"><h2><Target/> Game challenges</h2><p className="muted">Small goals to help you explore. Completion is tracked on this browser.</p>
          {challenges.map(item => <div className="world-challenge" key={item.id}><div><b>{item.title}</b><small>{item.detail}</small></div><button disabled={doneChallenges.includes(item.id)} onClick={() => markChallenge(item.id)}>{doneChallenges.includes(item.id) ? <><Check size={14}/> Done</> : "Mark done"}</button></div>)}
        </section>
        <section className="world-panel"><h2><FolderPlus/> Game collections</h2><p className="muted">Organize games into your own folders.</p>
          <form className="world-form" onSubmit={createCollection}><input maxLength={40} value={collectionName} onChange={e => setCollectionName(e.target.value)} placeholder="New collection name"/><button className="primary-btn"><Plus size={14}/> Create</button></form>
          {collections.length > 0 && <><select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}><option value="">Choose a collection</option>{collections.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select><div className="world-collection-list">{selectedItems.map(item => <span key={item.id}>{item.game_name}</span>)}</div><div className="world-add-games">{games.map(game => <button key={game.name} onClick={() => addToCollection(game.name)}>{game.name} <Plus size={12}/></button>)}</div></>}
        </section>
        <section className="world-panel"><h2><Flag/> Report a game</h2><p className="muted">Tell moderators when a game is broken or has a problem.</p>
          <form className="world-form vertical" onSubmit={submitGameReport}><select value={reportDraft.game} onChange={e => setReportDraft(v => ({...v, game:e.target.value}))}>{games.map(game => <option key={game.name}>{game.name}</option>)}</select><select value={reportDraft.reason} onChange={e => setReportDraft(v => ({...v, reason:e.target.value}))}>{["Game will not load","Broken controls","Incorrect game link","Inappropriate content","Other"].map(reason => <option key={reason}>{reason}</option>)}</select><textarea value={reportDraft.details} onChange={e => setReportDraft(v => ({...v, details:e.target.value}))} placeholder="Extra details (optional)" maxLength={500}/><button className="primary-btn"><Send size={14}/> Send report</button></form>
        </section>
      </div>
      <section className="world-panel world-weekly"><span className="world-kicker">FEATURED THIS WEEK</span><h2>{weeklyGame?.name || "Community pick"}</h2><p>{weeklyGame?.description}</p><button className="secondary-btn" onClick={() => openGame(weeklyGame)}>Check it out <Gamepad2 size={14}/></button></section>
    </>}
    {tab === "social" && <>
      <div className="world-grid">
        <section className="world-panel"><h2><Activity/> Live community</h2><p className="muted">Members connected to NEXUS right now.</p><div className="world-online-list">{online.map((name, index) => <span key={name + index}><i/>{name}</span>)}{!online.length && <p className="world-empty">No one else is online right now.</p>}</div>
          <h3>Recent friend activity</h3>{activity.slice(0, 5).map((item, index) => <div className="world-activity" key={item.created_at + index}><b>{item.username}</b><span>{item.detail}</span><small>{new Date(item.created_at).toLocaleString()}</small></div>)}{!activity.length && <p className="world-empty">Friend activity appears as people play.</p>}
        </section>
        <section className="world-panel"><h2><UserRound/> Player status</h2><p className="muted">Choose what other players see on your profile.</p><select value={status} onChange={e => updateStatus(e.target.value)}>{["Available","Gaming","Looking for players","Away","Do not disturb"].map(value => <option key={value}>{value}</option>)}</select><p className="world-note">Your status is saved to your profile when signed in, or to this browser as a guest.</p>
          <h3>Player showcase</h3><p className="muted">Pin up to four games to feature on your player card.</p><div className="world-check-grid">{games.map(game => <label key={game.name}><input type="checkbox" checked={showcaseGames.includes(game.name)} disabled={!showcaseGames.includes(game.name) && showcaseGames.length >= 4} onChange={e => setShowcaseGames(rows => e.target.checked ? [...rows, game.name] : rows.filter(name => name !== game.name))}/>{game.name}</label>)}</div><button className="primary-btn" onClick={saveShowcase}>Save showcase</button>
        </section>
      </div>
      <section className="world-panel"><h2><Sparkles/> Community player showcases</h2><p className="muted">Games other members have pinned to their player cards.</p><div className="world-showcases">{communityShowcases.map((row, index) => <article key={row.username + index}><b>{row.username}</b><div>{(row.featured_games || []).map(name => <span key={name}>{name}</span>)}</div></article>)}{!communityShowcases.length && <p className="world-empty">Member showcases will appear here when players save them.</p>}</div></section>
      <section className="world-panel"><h2><Users/> Community groups</h2><p className="muted">Create a group or join one to share a private group discussion.</p>
        <form className="world-form" onSubmit={createGroup}><input required maxLength={40} placeholder="Group name" value={groupDraft.name} onChange={e => setGroupDraft(v => ({...v,name:e.target.value}))}/><input maxLength={180} placeholder="Short description" value={groupDraft.description} onChange={e => setGroupDraft(v => ({...v,description:e.target.value}))}/><button className="primary-btn"><Plus size={14}/> Create group</button></form>
        <div className="world-groups">{groupRows.map(group => { const isMember = myGroupIds.includes(group.id) || group.owner_id === userId; return <article key={group.id} className="world-group-card"><div><b>{group.name}</b><small>{group.description || "A NEXUS community group"}</small></div>{isMember ? <button className="secondary-btn" onClick={() => setSelectedGroup(group.id)}>Open</button> : <button className="primary-btn" onClick={() => joinGroup(group)}>Join</button>}</article>; })}{!groupRows.length && <p className="world-empty">No groups yet. Start the first one.</p>}</div>
        {selectedGroupRow && myGroupIds.includes(selectedGroup) && <div className="world-group-chat"><div className="world-group-chat-head"><b>{selectedGroupRow.name}</b><button className="quiet-btn" onClick={() => leaveGroup(selectedGroupRow)} disabled={selectedGroupRow.owner_id === userId}>Leave group</button></div><div className="world-group-messages">{groupMessages.map(message => <p key={message.id}><b>{message.username}:</b> {message.body}</p>)}{!groupMessages.length && <small>No messages yet. Say hello to your group.</small>}</div><form className="world-form" onSubmit={sendGroupMessage}><input value={groupMessage} onChange={e => setGroupMessage(e.target.value)} maxLength={800} placeholder="Message the group..."/><button className="primary-btn"><Send size={14}/> Send</button></form></div>}
      </section>
    </>}
    {tab === "style" && <>
      <section className="world-panel"><h2><Sparkles/> Animated profile decorations</h2><p className="muted">Choose a small animated effect for your player showcase.</p><div className="world-decoration-options">{decorations.map(item => <button key={item.id} className={style.decoration === item.id ? "selected" : ""} onClick={() => saveStyle({...style, decoration:item.id})}>{item.label}</button>)}</div>
        <div className={"world-profile-preview " + (decorations.find(item => item.id === style.decoration)?.className || "")}><div className="world-preview-glow">✦</div><b>{username}</b><small>{status} · NEXUS player</small><div className="world-preview-games">{(showcaseGames.length ? showcaseGames : recentGames.slice(0, 3)).map(name => <span key={name}>{name}</span>)}</div></div>
      </section>
      <div className="world-grid">
        <section className="world-panel"><h2><LayoutGrid/> Profile layout</h2><p className="muted">Pick how your profile showcase is arranged.</p><div className="world-layout-options">{[["spotlight","Spotlight"],["compact","Compact"],["tiles","Game tiles"]].map(([value,label]) => <button key={value} className={style.layout === value ? "selected" : ""} onClick={() => saveStyle({...style,layout:value})}>{label}</button>)}</div><div className={"world-layout-preview layout-" + style.layout}><div>Profile</div><div>Games</div><div>Achievements</div></div>
        </section>
        <section className="world-panel"><h2><Image/> Game page background</h2><p className="muted">Set the background used in your NEXUS World panels.</p><div className="world-background-options">{backgrounds.map(item => <button key={item.id} className={style.background === item.id ? "selected" : ""} onClick={() => saveStyle({...style,background:item.id})}><span style={{background:item.value}}/>{item.label}</button>)}</div><div className="world-background-preview" style={{background:previewBackground}}>Your NEXUS theme</div>
        </section>
      </div>
      <p className="world-note">Decoration, layout, and background preferences save on this browser. The decoration preview is animated here; it is not yet shown on every profile card across the site.</p>
    </>}
    {tab === "community" && <>
      <section className="world-panel"><h2><Newspaper/> NEXUS News</h2><p className="muted">Official announcements and updates from the NEXUS team.</p>
        {isAdmin && <form className="world-form vertical" onSubmit={publishNews}><input required maxLength={90} value={newsDraft.title} onChange={e => setNewsDraft(v => ({...v,title:e.target.value}))} placeholder="Announcement title"/><textarea required maxLength={1200} value={newsDraft.body} onChange={e => setNewsDraft(v => ({...v,body:e.target.value}))} placeholder="Write an update..."/><button className="primary-btn"><Plus size={14}/> Publish news</button></form>}
        {news.map(post => <article className="world-news-item" key={post.id}><div><b>{post.title}</b><small>{new Date(post.published_at).toLocaleString()}</small></div><p>{post.body}</p></article>)}{!news.length && <p className="world-empty">No announcements yet.</p>}
      </section>
      <section className="world-panel"><h2><Lightbulb/> Suggest a game</h2><p className="muted">Recommend a game for the NEXUS library. Suggestions go to the moderators for review.</p>
        <form className="world-form vertical" onSubmit={submitSuggestion}><input required maxLength={60} value={suggestionDraft.name} onChange={e => setSuggestionDraft(v => ({...v,name:e.target.value}))} placeholder="Game name"/><input type="url" value={suggestionDraft.url} onChange={e => setSuggestionDraft(v => ({...v,url:e.target.value}))} placeholder="Game URL (optional)"/><textarea maxLength={400} value={suggestionDraft.reason} onChange={e => setSuggestionDraft(v => ({...v,reason:e.target.value}))} placeholder="Why should it be added?"/><button className="primary-btn"><Send size={14}/> Send suggestion</button></form>
      </section>
      {isAdmin && <div className="world-grid">
        <section className="world-panel"><h2>Game reports ({reports.length})</h2>{reports.map(row => <article className="world-moderation-item" key={row.id}><b>{row.game_name}</b><small>{row.reason} · {row.details || "No extra details"}</small><button onClick={() => moderate("report",row,"reviewed")}>Mark reviewed</button></article>)}{!reports.length && <p className="world-empty">No open reports.</p>}</section>
        <section className="world-panel"><h2>Game suggestions ({suggestions.length})</h2>{suggestions.map(row => <article className="world-moderation-item" key={row.id}><b>{row.name}</b><small>by {row.username} · {row.url || "No URL"} · {row.reason}</small><button onClick={() => moderate("suggestion",row,"reviewed")}>Mark reviewed</button></article>)}{!suggestions.length && <p className="world-empty">No suggestions waiting.</p>}</section>
      </div>}
    </>}
    {busy && <p className="world-note">Loading NEXUS World…</p>}
    <p className="world-note">Some features work locally until you sign in. Collections, groups, showcase, news, reports, and suggestions need the NEXUS World SQL setup in Supabase. Challenges and visual customization save on this browser. </p>
  </main>;
}
