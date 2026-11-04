import React, { useState } from "react";
import { Plus, Save, Trash2, Gamepad2, Megaphone, Settings, X } from "lucide-react";

export default function NexusSiteManager({ games = [], announcements = [], settings = {}, onSave, busy = false }) {
  const [draftGames, setDraftGames] = useState(games);
  const [draftAnnouncements, setDraftAnnouncements] = useState(announcements);
  const [draftSettings, setDraftSettings] = useState({ allowGameSubmissions: true, showOnlineStats: true, ...settings });
  const [newGame, setNewGame] = useState({ name:"", type:"Action", players:"Single-player", mode:"single", color:"blue", icon:"🎮", description:"", externalUrl:"" });
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");

  function addGame(e) {
    e.preventDefault();
    if (!newGame.name.trim() || !newGame.externalUrl.trim()) return setError("Add a game name and game URL.");
    if (draftGames.some(g => g.name.toLowerCase() === newGame.name.trim().toLowerCase())) return setError("A game with that name already exists.");
    setDraftGames(old => [...old, { ...newGame, name:newGame.name.trim(), description:newGame.description.trim(), externalUrl:newGame.externalUrl.trim() }]);
    setNewGame({ name:"", type:"Action", players:"Single-player", mode:"single", color:"blue", icon:"🎮", description:"", externalUrl:"" });
    setError("");
  }
  function updateGame(index, key, value) { setDraftGames(old => old.map((g,i) => i === index ? { ...g, [key]:value } : g)); }
  function addAnnouncement(e) {
    e.preventDefault();
    if (!announcement.trim()) return;
    setDraftAnnouncements(old => [{ id:Date.now().toString(), text:announcement.trim(), created_at:new Date().toISOString() }, ...old].slice(0,10));
    setAnnouncement("");
  }
  async function save() {
    setError("");
    if (draftGames.some(g => !g.name?.trim() || !g.externalUrl?.trim())) return setError("Every game needs a name and URL.");
    try { await onSave({ games:draftGames, announcements:draftAnnouncements, settings:draftSettings }); }
    catch (e) { setError(e.message || "Could not save site settings."); }
  }
  return <div className="site-manager">
    <div className="page-title-row"><div><div className="eyebrow">SITE CONFIGURATION</div><h2>Manage NEXUS content</h2><p className="muted">Changes here update the website without editing its source code.</p></div><button className="primary-btn" onClick={save} disabled={busy}><Save size={16}/>{busy ? "Saving..." : "Save all changes"}</button></div>
    <section className="social-panel"><h2><Gamepad2 size={18}/> Game catalog ({draftGames.length})</h2><p className="muted">Add, edit, or remove games shown in the Games and home sections.</p>
      {draftGames.map((g,i)=><div className="site-manager-game" key={g.name+"-"+i}>
        <input aria-label="Game name" value={g.name} onChange={e=>updateGame(i,"name",e.target.value)} placeholder="Game name"/>
        <input aria-label="Icon" value={g.icon||"🎮"} onChange={e=>updateGame(i,"icon",e.target.value)} placeholder="Icon"/>
        <input aria-label="Category" value={g.type||""} onChange={e=>updateGame(i,"type",e.target.value)} placeholder="Category"/>
        <select value={g.mode||"single"} onChange={e=>updateGame(i,"mode",e.target.value)}><option value="single">Single-player</option><option value="multiplayer">Multiplayer</option><option value="external-multiplayer">External multiplayer</option><option value="coming">Coming soon</option></select>
        <input aria-label="Player label" value={g.players||""} onChange={e=>updateGame(i,"players",e.target.value)} placeholder="Player label"/>
        <input aria-label="Game URL" value={g.externalUrl||g.openUrl||""} onChange={e=>updateGame(i,"externalUrl",e.target.value)} placeholder="Game URL"/>
        <input className="site-manager-description" aria-label="Description" value={g.description||""} onChange={e=>updateGame(i,"description",e.target.value)} placeholder="Description"/>
        <button className="quiet-btn" onClick={()=>setDraftGames(old=>old.filter((_,n)=>n!==i))} aria-label={"Remove "+g.name}><Trash2 size={15}/> Remove</button>
      </div>)}
      <form className="site-manager-add" onSubmit={addGame}><h3><Plus size={16}/> Add a game</h3><div className="site-manager-fields">
        <input required placeholder="Game name" value={newGame.name} onChange={e=>setNewGame({...newGame,name:e.target.value})}/>
        <input placeholder="Icon (emoji)" value={newGame.icon} onChange={e=>setNewGame({...newGame,icon:e.target.value})}/>
        <input placeholder="Category" value={newGame.type} onChange={e=>setNewGame({...newGame,type:e.target.value})}/>
        <select value={newGame.mode} onChange={e=>setNewGame({...newGame,mode:e.target.value})}><option value="single">Single-player</option><option value="multiplayer">Multiplayer</option><option value="external-multiplayer">External multiplayer</option><option value="coming">Coming soon</option></select>
        <input placeholder="Players label" value={newGame.players} onChange={e=>setNewGame({...newGame,players:e.target.value})}/>
        <input required placeholder="Game URL" value={newGame.externalUrl} onChange={e=>setNewGame({...newGame,externalUrl:e.target.value})}/>
        <input className="site-manager-description" placeholder="Description" value={newGame.description} onChange={e=>setNewGame({...newGame,description:e.target.value})}/>
      </div><button className="secondary-btn"><Plus size={15}/> Add game</button></form>
    </section>
    <section className="social-panel"><h2><Megaphone size={18}/> Homepage announcements</h2><p className="muted">Post a message that appears on the NEXUS home screen.</p><form className="site-manager-add" onSubmit={addAnnouncement}><input value={announcement} onChange={e=>setAnnouncement(e.target.value)} maxLength={180} placeholder="Write a homepage announcement..." /><button className="secondary-btn"><Plus size={15}/> Publish to draft</button></form>
      {draftAnnouncements.map(a=><div className="site-manager-announcement" key={a.id}><span>{a.text}</span><button className="icon-btn" onClick={()=>setDraftAnnouncements(old=>old.filter(x=>x.id!==a.id))} aria-label="Remove announcement"><X size={15}/></button></div>)}
    </section>
    <section className="social-panel"><h2><Settings size={18}/> Community settings</h2>
      <label className="site-manager-toggle"><span><b>Allow game submissions</b><small>Let members submit games for admin review.</small></span><input type="checkbox" checked={!!draftSettings.allowGameSubmissions} onChange={e=>setDraftSettings(s=>({...s,allowGameSubmissions:e.target.checked}))}/></label>
      <label className="site-manager-toggle"><span><b>Show online stats on home</b><small>Display live community statistics.</small></span><input type="checkbox" checked={!!draftSettings.showOnlineStats} onChange={e=>setDraftSettings(s=>({...s,showOnlineStats:e.target.checked}))}/></label>
    </section>
    {error && <p className="form-error">{error}</p>}
    <div className="site-manager-bottom"><button className="primary-btn" onClick={save} disabled={busy}><Save size={16}/>{busy ? "Saving..." : "Save all changes"}</button></div>
  </div>;
}
