import React, { useEffect, useState } from "react";
import { Plus, Save, Trash2, Gamepad2, Megaphone, Settings, X } from "lucide-react";

export default function NexusSiteManager({ games = [], announcements = [], settings = {}, onSave, onUploadImage, busy = false }) {
  const [draftGames, setDraftGames] = useState(games);
  const [draftAnnouncements, setDraftAnnouncements] = useState(announcements);
  const [draftSettings, setDraftSettings] = useState({ allowGameSubmissions: true, showOnlineStats: true, ...settings });
  const [newGame, setNewGame] = useState({ name:"", type:"Action", players:"Single-player", mode:"single", color:"blue", icon:"🎮", imageUrl:"", description:"", externalUrl:"", htmlCode:"", openMode:"embed" });
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setDraftGames(games); setDraftAnnouncements(announcements); setDraftSettings({ allowGameSubmissions:true, showOnlineStats:true, ...settings }); }, [games, announcements, settings]);

  function addGame(e) {
    e.preventDefault();
    const name = newGame.name.trim();
    const url = newGame.externalUrl.trim();
    const htmlCode = newGame.htmlCode.trim();
    if (!name || (!url && !htmlCode)) return setError("Add a game name and either a game URL or HTML code.");
    if (draftGames.some(g => g.name?.trim().toLowerCase() === name.toLowerCase())) return setError("A game with that name already exists.");
    setDraftGames(old => [...old, {
      ...newGame,
      id: "custom-" + Date.now(),
      name,
      description: newGame.description.trim(),
      externalUrl: url,
      openUrl: "",
      url: "",
      htmlCode: url ? "" : htmlCode,
      openMode: "embed"
    }]);
    setNewGame({ name:"", type:"Action", players:"Single-player", mode:"single", color:"blue", icon:"🎮", imageUrl:"", description:"", externalUrl:"", htmlCode:"", openMode:"embed" });
    setError("");
  }
  function updateGame(index, key, value) {
    setDraftGames(old => old.map((g,i) => {
      if (i !== index) return g;
      const next = { ...g, [key]:value };
      if (key === "externalUrl") {
        next.openUrl = "";
        next.url = "";
        if (value.trim()) {
          next.htmlCode = "";
          next.openMode = "embed";
        }
      } else if (key === "htmlCode" && value.trim()) {
        next.externalUrl = "";
        next.openUrl = "";
        next.url = "";
        next.openMode = "embed";
      }
      return next;
    }));
  }
  async function uploadImage(file, index = null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Game images must be 5 MB or smaller.");
    if (!onUploadImage) return setError("Image uploads are not available right now.");
    try {
      setError("");
      const url = await onUploadImage(file);
      if (index === null) setNewGame(old => ({ ...old, imageUrl:url }));
      else updateGame(index, "imageUrl", url);
    } catch (e) { setError(e.message || "Could not upload the game image."); }
  }
  function addAnnouncement(e) {
    e.preventDefault();
    if (!announcement.trim()) return;
    setDraftAnnouncements(old => [{ id:Date.now().toString(), text:announcement.trim(), created_at:new Date().toISOString() }, ...old].slice(0,10));
    setAnnouncement("");
  }
  async function save() {
    setError("");
    const normalizedGames = draftGames.map(g => {
      const url = String(g.externalUrl || g.openUrl || g.url || "").trim();
      const htmlCode = String(g.htmlCode || "").trim();
      return { ...g, externalUrl:url, openUrl:"", url:"", htmlCode:url ? "" : htmlCode };
    });
    if (normalizedGames.some(g => !g.name?.trim() || (!g.externalUrl && !g.htmlCode))) return setError("Every game needs a name and either a URL or HTML code.");
    try {
      await onSave({ games:normalizedGames, announcements:draftAnnouncements, settings:draftSettings });
    } catch (e) { setError(e.message || "Could not save site settings."); }
  }
  return <div className="site-manager">
    <div className="page-title-row"><div><div className="eyebrow">SITE CONFIGURATION</div><h2>Manage NEXUS content</h2><p className="muted">Changes here update the website without editing its source code.</p></div><button className="primary-btn" onClick={save} disabled={busy}><Save size={16}/>{busy ? "Saving..." : "Save all changes"}</button></div>
    <section className="social-panel"><h2><Gamepad2 size={18}/> Game catalog ({draftGames.length})</h2><p className="muted">Add, edit, or remove games shown in the Games and home sections.</p>
      {draftGames.map((g,i)=><div className="site-manager-game" key={g.id || "game-"+i}>
        <input aria-label="Game name" value={g.name} onChange={e=>updateGame(i,"name",e.target.value)} placeholder="Game name"/>
        <div className="site-manager-image-field"><label>Game image<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0],i)}/></label>{g.imageUrl ? <img src={g.imageUrl} alt={g.name+" icon preview"}/> : <span className="site-manager-image-fallback">{g.icon||"🎮"}</span>}</div>
        <input aria-label="Icon emoji fallback" value={g.icon||"🎮"} onChange={e=>updateGame(i,"icon",e.target.value)} placeholder="Fallback emoji"/>
        <select aria-label="Category" value={g.type||"Action"} onChange={e=>updateGame(i,"type",e.target.value)}><option value="Action">Action</option><option value="Adventure">Adventure</option><option value="Arcade">Arcade</option><option value="Puzzle">Puzzle</option><option value="Sports">Sports</option><option value="Racing">Racing</option><option value="Strategy">Strategy</option><option value="Simulation">Simulation</option><option value="Other">Other</option></select>
        <select value={g.mode||"single"} onChange={e=>updateGame(i,"mode",e.target.value)}><option value="single">Single-player</option><option value="multiplayer">Multiplayer</option><option value="external-multiplayer">External multiplayer</option><option value="coming">Coming soon</option></select>
        <input aria-label="Player label" value={g.players||""} onChange={e=>updateGame(i,"players",e.target.value)} placeholder="Player label"/>
        <input aria-label="Game URL" type="url" value={g.externalUrl||g.openUrl||g.url||""} onChange={e=>updateGame(i,"externalUrl",e.target.value)} placeholder="Game URL (takes priority over HTML)"/>
        <textarea className="site-manager-description" aria-label="Game HTML code" rows={6} spellCheck={false} value={g.htmlCode||""} onChange={e=>updateGame(i,"htmlCode",e.target.value)} placeholder="Paste the full HTML game code here (optional if using a URL)"/>
        <select aria-label="Game opening method" value={g.htmlCode?.trim()?"embed":(g.openMode||(g.openUrl&&!g.externalUrl?"new-tab":"embed"))} disabled={!!g.htmlCode?.trim()} onChange={e=>updateGame(i,"openMode",e.target.value)}><option value="embed">Embed inside NEXUS</option><option value="new-tab">Open in a new tab</option></select>
        <input className="site-manager-description" aria-label="Description" value={g.description||""} onChange={e=>updateGame(i,"description",e.target.value)} placeholder="Description"/>
        <button className="quiet-btn" onClick={()=>setDraftGames(old=>old.filter((_,n)=>n!==i))} aria-label={"Remove "+g.name}><Trash2 size={15}/> Remove</button>
      </div>)}
      <form className="site-manager-add" onSubmit={addGame}><h3><Plus size={16}/> Add a game</h3><div className="site-manager-fields">
        <input required placeholder="Game name" value={newGame.name} onChange={e=>setNewGame({...newGame,name:e.target.value})}/>
        <div className="site-manager-image-field"><label>Upload game image<input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])}/></label>{newGame.imageUrl ? <img src={newGame.imageUrl} alt="New game image preview"/> : <span className="site-manager-image-fallback">{newGame.icon||"🎮"}</span>}</div>
        <input placeholder="Fallback icon (emoji)" value={newGame.icon} onChange={e=>setNewGame({...newGame,icon:e.target.value})}/>
        <select aria-label="Game category" value={newGame.type} onChange={e=>setNewGame({...newGame,type:e.target.value})}><option value="Action">Action</option><option value="Adventure">Adventure</option><option value="Arcade">Arcade</option><option value="Puzzle">Puzzle</option><option value="Sports">Sports</option><option value="Racing">Racing</option><option value="Strategy">Strategy</option><option value="Simulation">Simulation</option><option value="Other">Other</option></select>
        <select aria-label="Player type" value={newGame.mode} onChange={e=>setNewGame({...newGame,mode:e.target.value,players:e.target.value==="single"?"Single-player":e.target.value==="multiplayer"?"Multiplayer":e.target.value==="external-multiplayer"?"Online multiplayer":"Coming soon"})}><option value="single">Single-player</option><option value="multiplayer">Multiplayer</option><option value="external-multiplayer">External multiplayer</option><option value="coming">Coming soon</option></select>
        
        <input type="url" placeholder="Game URL (takes priority over HTML)" value={newGame.externalUrl} onChange={e=>setNewGame(old=>({...old,externalUrl:e.target.value,htmlCode:e.target.value.trim()?"":old.htmlCode,openMode:"embed"}))}/>
        <textarea className="site-manager-description" rows={7} spellCheck={false} placeholder="Or paste the full HTML game code here..." value={newGame.htmlCode} onChange={e=>setNewGame(old=>({...old,htmlCode:e.target.value,externalUrl:e.target.value.trim()?"":old.externalUrl,openMode:"embed"}))}/>
        <p className="muted site-manager-embed-note">New games open inside NEXUS. A URL takes priority and clears pasted HTML; pasting HTML clears the URL so the two sources cannot conflict.</p>
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
