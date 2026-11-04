import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Bell, CalendarDays, Check, Gamepad2, PartyPopper, Star, Trophy, Users, X } from "lucide-react";
import { supabase } from "./supabase";
import "./NexusUpgradeCenter.css";

const achievements = [
  { id: "first-game", title: "First Launch", detail: "Open your first game", test: s => s.games_played >= 1 },
  { id: "arcade-regular", title: "Arcade Regular", detail: "Play 10 games", test: s => s.games_played >= 10 },
  { id: "level-five", title: "Level 5", detail: "Reach level 5", test: s => s.level >= 5 },
  { id: "collector", title: "Collector", detail: "Favorite 3 games", test: s => s.favorites >= 3 }
];

export default function NexusUpgradeCenter({ games = [], username, userId, stats = {}, activity = [], notifications = [], isAdmin = false, onOpenGame = () => {}, onCreateParty = () => {}, onGo = () => {}, setNotice = () => {} }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventError, setEventError] = useState("");
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [showcase, setShowcase] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nexus_achievement_showcase_" + (username || "guest")) || "[]"); } catch { return []; }
  });
  const [questDone, setQuestDone] = useState(() => {
    const key = "nexus_upgrade_quests_" + new Date().toISOString().slice(0, 10) + "_" + (username || "guest");
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });
  const [questGame, setQuestGame] = useState(games[0]?.name || "");
  const [eventBusy, setEventBusy] = useState(false);
  const [eventDraft, setEventDraft] = useState({ title: "", date: "" });
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.from("nexus_events").select("id,title,event_date").gte("event_date", new Date().toISOString()).order("event_date", { ascending: true }).limit(8)
      .then(({ data, error }) => { if (!active) return; if (error) setEventError("Events could not load. Check the NEXUS feature database setup."); else setEvents(data || []); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("nexus_daily_quest_progress").select("quest_ids").eq("user_id", userId).eq("quest_date", today).maybeSingle()
      .then(({ data }) => {
        if (!active || !data?.quest_ids) return;
        setQuestDone(data.quest_ids);
        localStorage.setItem("nexus_upgrade_quests_" + today + "_" + (username || "guest"), JSON.stringify(data.quest_ids));
      });
    return () => { active = false; };
  }, [userId, username]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    Promise.all([
      supabase.from("nexus_favorites").select("game_name").eq("user_id", userId),
      supabase.from("nexus_achievement_showcase").select("achievement_ids").eq("user_id", userId).maybeSingle()
    ]).then(([favoritesResult, showcaseResult]) => {
      if (!active) return;
      setFavoriteCount((favoritesResult.data || []).length);
      if (showcaseResult.data?.achievement_ids) {
        setShowcase(showcaseResult.data.achievement_ids);
        localStorage.setItem("nexus_achievement_showcase_" + (username || "guest"), JSON.stringify(showcaseResult.data.achievement_ids));
      }
    });
    return () => { active = false; };
  }, [userId, username]);

  const gameNames = useMemo(() => games.map(g => typeof g === "string" ? g : g?.name).filter(Boolean), [games]);
  const player = { games_played: Number(stats.games_played || 0), level: Number(stats.level || 1), favorites: Number(favoriteCount || stats.favorites || 0) };
  const unlocked = achievements.filter(a => a.test(player));
  const saveShowcase = next => {
    setShowcase(next);
    localStorage.setItem("nexus_achievement_showcase_" + (username || "guest"), JSON.stringify(next));
    if (supabase && userId) supabase.from("nexus_achievement_showcase").upsert({ user_id: userId, achievement_ids: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).then(({ error }) => { if (error) setNotice("Achievement showcase could not sync. Run the NEXUS upgrade SQL setup."); });
  };
  const completeQuest = id => {
    const next = [...new Set([...questDone, id])];
    setQuestDone(next);
    const key = "nexus_upgrade_quests_" + new Date().toISOString().slice(0, 10) + "_" + (username || "guest");
    localStorage.setItem(key, JSON.stringify(next));
    if (supabase && userId) supabase.from("nexus_daily_quest_progress").upsert({ user_id: userId, quest_date: new Date().toISOString().slice(0, 10), quest_ids: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,quest_date" }).then(({ error }) => { if (error) setNotice("Daily quest progress could not sync. Run the NEXUS upgrade SQL setup."); });
  };
  const launchGame = game => {
    if (!game) return;
    completeQuest("play");
    onOpenGame(game);
  };
  async function publishEvent(e) {
    e.preventDefault();
    if (!supabase || !isAdmin) return;
    setEventBusy(true);
    const { data, error } = await supabase.from("nexus_events").insert({ user_id: (await supabase.auth.getUser()).data.user?.id, title: eventDraft.title.trim(), event_date: new Date(eventDraft.date).toISOString() }).select("id,title,event_date").single();
    setEventBusy(false);
    if (error) { setEventError(error.message); return; }
    setEvents(rows => [...rows, data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
    setEventDraft({ title: "", date: "" });
    setNotice("NEXUS event published.");
  }

  return <section className="upgrade-center">
    <div className="upgrade-heading"><div><span className="eyebrow">NEXUS PLATFORM UPGRADES</span><h2>Your next level starts here</h2><p className="muted">Game discovery, daily goals, social play, and your player legacy.</p></div><span className="upgrade-live"><Activity size={14}/> CONNECTED HUB</span></div>
    <div className="upgrade-grid">
      <article className="upgrade-card upgrade-wide">
        <div className="upgrade-card-head"><div><Gamepad2/><h3>Game library pages</h3></div><span>{gameNames.length} games</span></div>
        <p className="muted">Open a game's details, then launch it directly inside the Games tab.</p>
        <div className="upgrade-game-grid">{games.map(game => <button key={game.name} className="upgrade-game" onClick={() => setSelectedGame(game)}><span className="upgrade-game-icon">{game.icon || "🎮"}</span><span><b>{game.name}</b><small>{game.type || "Browser game"} · {game.players || "Play now"}</small></span><ArrowRight size={15}/></button>)}</div>
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Trophy/><h3>Daily quests</h3></div><span>{questDone.length}/3</span></div>
        <p className="muted">Small goals to keep your arcade moving. Progress resets each day.</p>
        <div className="upgrade-quest"><div><b>Launch a game</b><small>Open any game from its details page.</small></div><button disabled={questDone.includes("play")} onClick={() => { setSelectedGame(games[0] || null); }}>{questDone.includes("play") ? <Check size={16}/> : "Start"}</button></div>
        <div className="upgrade-quest"><div><b>Explore the community</b><small>Visit the NEXUS community chat.</small></div><button disabled={questDone.includes("community")} onClick={() => { completeQuest("community"); onGo("chat"); }}> {questDone.includes("community") ? <Check size={16}/> : "Visit"} </button></div>
        <div className="upgrade-quest"><div><b>Plan a game session</b><small>Open the Games tab to create a private lobby.</small></div><button disabled={questDone.includes("party")} onClick={() => { completeQuest("party"); onGo("games"); }}>{questDone.includes("party") ? <Check size={16}/> : "Open"}</button></div>
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><PartyPopper/><h3>Play with your party</h3></div></div>
        <p className="muted">Start a private lobby for a game and share its invite code with friends.</p>
        <select value={questGame} onChange={e => setQuestGame(e.target.value)}>{gameNames.map(name => <option key={name}>{name}</option>)}</select>
        <button className="upgrade-primary" onClick={() => { const game = games.find(g => g.name === questGame) || games[0]; if (game) onCreateParty(game.name); }}> <Users size={15}/> Create private party</button>
        <small className="upgrade-hint">Party creation uses the existing NEXUS private-lobby system.</small>
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Activity/><h3>Friend activity</h3></div></div>
        <p className="muted">Recent things happening around your community.</p>
        {activity.slice(0, 5).map((item, i) => <div className="upgrade-feed-row" key={(item.created_at || "") + i}><b>{item.username || "Player"}</b><span>{item.detail || "is active on NEXUS"}</span><small>{item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}</small></div>)}
        {!activity.length && <p className="upgrade-empty">Friend activity will appear here when people play.</p>}
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Star/><h3>Achievement showcase</h3></div><span>{unlocked.length} unlocked</span></div>
        <p className="muted">Choose achievements to feature in your local player showcase.</p>
        {achievements.map(item => <label className="upgrade-achievement" key={item.id}><input type="checkbox" disabled={!item.test(player)} checked={showcase.includes(item.id)} onChange={e => saveShowcase(e.target.checked ? [...showcase, item.id] : showcase.filter(id => id !== item.id))}/><span><b>{item.title}</b><small>{item.detail}{!item.test(player) ? " · Locked" : ""}</small></span>{item.test(player) && <Check size={15}/>}</label>)}
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><CalendarDays/><h3>Seasonal events</h3></div></div>
        <p className="muted">Upcoming events published by NEXUS admins.</p>
        {events.map(event => <div className="upgrade-event" key={event.id}><b>{event.title}</b><small>{new Date(event.event_date).toLocaleString()}</small></div>)}
        {!events.length && <p className="upgrade-empty">{eventError || "No upcoming events yet."}</p>}
        {isAdmin && <form className="upgrade-event-form" onSubmit={publishEvent}><input required maxLength={100} placeholder="Event title" value={eventDraft.title} onChange={e => setEventDraft(v => ({...v,title:e.target.value}))}/><input required type="datetime-local" value={eventDraft.date} onChange={e => setEventDraft(v => ({...v,date:e.target.value}))}/><button className="upgrade-primary" disabled={eventBusy}>{eventBusy ? "Publishing…" : "Publish event"}</button></form>}
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Bell/><h3>Notification center</h3></div><span>{notifications.filter(n => !n.read).length} new</span></div>
        <p className="muted">A quick view of your latest account notifications.</p>
        <button className="upgrade-secondary" onClick={() => setNotificationOpen(v => !v)}>{notificationOpen ? "Hide notifications" : "Show notifications"}</button>
        {notificationOpen && <div className="upgrade-notifications">{notifications.slice(0, 6).map(n => <div key={n.id}><b>{String(n.kind || "Update").replaceAll("_", " ")}</b><span>{n.body}</span><small>{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</small></div>)}{!notifications.length && <p className="upgrade-empty">You're all caught up.</p>}</div>}
      </article>
      <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Star/><h3>Reviews & customization</h3></div></div>
        <p className="muted">Use the existing review system to rate games, or customize your profile with earned cosmetics.</p>
        <button className="upgrade-secondary" onClick={() => setNotice("Use the My games tab above for game reviews and the Customize tab for the profile shop.")}>Find reviews & cosmetics <ArrowRight size={14}/></button>
      </article>
      {isAdmin && <article className="upgrade-card">
        <div className="upgrade-card-head"><div><Trophy/><h3>Admin control center</h3></div></div>
        <p className="muted">Manage reports, game submissions, moderation, and platform activity.</p>
        <button className="upgrade-primary" onClick={() => onGo("admin")}>Open admin tools <ArrowRight size={14}/></button>
      </article>}
    </div>
    {selectedGame && <div className="upgrade-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedGame(null); }}><section className="upgrade-game-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-game-title"><button className="upgrade-modal-close" onClick={() => setSelectedGame(null)} aria-label="Close"><X size={18}/></button><span className="upgrade-game-icon big">{selectedGame.icon || "🎮"}</span><span className="eyebrow">NEXUS GAME DETAILS</span><h2 id="upgrade-game-title">{selectedGame.name}</h2><p>{selectedGame.description || "Open this game from the NEXUS Games hub."}</p><div className="upgrade-game-meta"><span>{selectedGame.type || "Game"}</span><span>{selectedGame.players || "Play now"}</span></div><button className="upgrade-primary" onClick={() => launchGame(selectedGame)}> <Gamepad2 size={16}/> Play in NEXUS Games</button></section></div>}
  </section>;
}
