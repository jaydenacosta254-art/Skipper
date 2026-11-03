import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { Star, Target, Trophy, MessageSquare, CalendarDays, Users, Palette, Medal, BarChart3, Plus, Send, Heart, Crown, Sparkles, Search, Gamepad2 } from "lucide-react";

const tabs = [
  ["games","My games",Gamepad2],["missions","Missions",Target],["community","Community",MessageSquare],
  ["compete","Compete",Trophy],["customize","Customize",Palette],["stats","Statistics",BarChart3]
];
const games = ["Retro Bowl","Eaglercraft 1.8.8","Roof Top Run","Chicken Royale","OpenGuessr","Basket Bros","Neon Racers","Trivia Clash","Party Arena"];
const missions = [
  {id:"play1",title:"Warm up",detail:"Open a game today",xp:25},
  {id:"favorite1",title:"Build your collection",detail:"Favorite one game",xp:20},
  {id:"community1",title:"Say hello",detail:"Create a community post",xp:20},
  {id:"review1",title:"Help the arcade",detail:"Review a game",xp:30},
  {id:"weekly3",title:"Arcade regular",detail:"Play three different games this week",xp:75}
];
const titles = ["Rookie","Game Explorer","Arcade Ace","Community Star","NEXUS Legend"];
const cosmetics = [
  {id:"banner_sunset",name:"Sunset Banner",price:150,kind:"banner",value:"sunset"},
  {id:"banner_neon",name:"Neon Banner",price:250,kind:"banner",value:"neon"},
  {id:"title_ace",name:"Arcade Ace title",price:200,kind:"title",value:"Arcade Ace"},
  {id:"title_star",name:"Community Star title",price:300,kind:"title",value:"Community Star"},
  {id:"chat_glow",name:"Glow Chat Accent",price:180,kind:"chat",value:"glow"}
];
export default function NexusFeatures({session,username,stats,onlineCount,isAdmin=false,setNotice=()=>{}}) {
  const [tab,setTab]=useState("games"),[favorites,setFavorites]=useState([]),[posts,setPosts]=useState([]),[polls,setPolls]=useState([]),[events,setEvents]=useState([]),[tournaments,setTournaments]=useState([]),[reviews,setReviews]=useState([]),[owned,setOwned]=useState([]),[profileRows,setProfileRows]=useState([]),[draft,setDraft]=useState(""),[pollDraft,setPollDraft]=useState({question:"",a:"",b:""}),[eventDraft,setEventDraft]=useState({title:"",date:""}),[reviewDraft,setReviewDraft]=useState({game:"Retro Bowl",rating:5,body:""}),[compare,setCompare]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const userId=session?.user?.id;
  const xp=stats?.xp||0;
  const level=Math.floor(xp/100)+1;
  const completed=useMemo(()=>{try{return JSON.parse(localStorage.getItem("nexus_missions_"+(userId||"guest"))||"[]")}catch{return[]}},[userId]);
  const [done,setDone]=useState(completed);
  const [earned,setEarned]=useState(()=>{try{return JSON.parse(localStorage.getItem("nexus_cosmetics_"+(userId||"guest"))||"[]")}catch{return[]}});
  const [equipped,setEquipped]=useState(()=>{try{return JSON.parse(localStorage.getItem("nexus_equipped_"+(userId||"guest"))||"{}")}catch{return{}}});
  const [season,setSeason]=useState("Season 1");
  const [reviewFilter,setReviewFilter]=useState("All");
  const signedIn=Boolean(userId&&supabase);
  async function load(){
    if(!supabase)return;
    setBusy(true);setError("");
    const tasks=[
      supabase.from("nexus_favorites").select("game_name").eq("user_id",userId||"00000000-0000-0000-0000-000000000000"),
      supabase.from("nexus_forum_posts").select("*").order("created_at",{ascending:false}).limit(40),
      supabase.from("nexus_polls").select("*").order("created_at",{ascending:false}).limit(20),
      supabase.from("nexus_events").select("*").order("event_date",{ascending:true}).limit(20),
      supabase.from("nexus_tournaments").select("*").order("created_at",{ascending:false}).limit(20),
      supabase.from("nexus_game_reviews").select("*").order("created_at",{ascending:false}).limit(30),
      supabase.from("nexus_player_stats").select("username,xp,level,games_played").order("xp",{ascending:false}).limit(20)
    ];
    const results=await Promise.all(tasks);
    if(results[0].data)setFavorites(results[0].data.map(x=>x.game_name));
    if(results[1].data)setPosts(results[1].data);
    if(results[2].data)setPolls(results[2].data);
    if(results[3].data)setEvents(results[3].data);
    if(results[4].data)setTournaments(results[4].data);
    if(results[5].data)setReviews(results[5].data);
    if(results[6].data)setProfileRows(results[6].data);
    const failure=results.find(x=>x.error&&x.error.code!=="PGRST205");
    if(failure)setError("Some community data could not load. Check that the NEXUS features SQL has been run in Supabase.");
    setBusy(false);
  }
  useEffect(()=>{load();},[userId]);
  function localSave(key,value){localStorage.setItem(key,JSON.stringify(value));}
  async function toggleFavorite(name){
    if(!signedIn){setNotice("Sign in to save favorites across devices.");return;}
    if(favorites.includes(name)){
      const {error}=await supabase.from("nexus_favorites").delete().eq("user_id",userId).eq("game_name",name);
      if(error){setError(error.message);return;}setFavorites(v=>v.filter(x=>x!==name));
    }else{
      const {error}=await supabase.from("nexus_favorites").insert({user_id:userId,game_name:name});
      if(error){setError(error.message);return;}setFavorites(v=>[...v,name]);
    }
  }
  async function createPost(e){e.preventDefault();if(!signedIn){setNotice("Sign in to post in the community.");return;}if(!draft.trim())return;const {error}=await supabase.from("nexus_forum_posts").insert({user_id:userId,username,title:draft.trim().slice(0,90),body:draft.trim()});if(error){setError(error.message);return;}setDraft("");load();}
  async function createPoll(e){e.preventDefault();if(!signedIn){setNotice("Sign in to create a poll.");return;}if(!pollDraft.question.trim()||!pollDraft.a.trim()||!pollDraft.b.trim())return;const {error}=await supabase.from("nexus_polls").insert({user_id:userId,username,question:pollDraft.question,options:[pollDraft.a,pollDraft.b],votes:{}});if(error){setError(error.message);return;}setPollDraft({question:"",a:"",b:""});load();}
  async function vote(poll,option){if(!signedIn){setNotice("Sign in to vote.");return;}const votes=poll.votes||{};if(votes[userId])return;const next={...votes,[userId]:option};const {error}=await supabase.from("nexus_polls").update({votes:next}).eq("id",poll.id);if(error){setError(error.message);return;}setPolls(v=>v.map(p=>p.id===poll.id?{...p,votes:next}:p));}
  async function createEvent(e){e.preventDefault();if(!signedIn||!isAdmin){setNotice("Only signed-in admins can publish events.");return;}const {error}=await supabase.from("nexus_events").insert({user_id:userId,title:eventDraft.title.trim(),event_date:eventDraft.date});if(error){setError(error.message);return;}setEventDraft({title:"",date:""});load();}
  async function createTournament(){if(!signedIn){setNotice("Sign in to create a tournament.");return;}const name=window.prompt("Tournament name?");if(!name?.trim())return;const {error}=await supabase.from("nexus_tournaments").insert({user_id:userId,username,title:name.trim(),game_name:"Community tournament",status:"Open"});if(error){setError(error.message);return;}load();}
  async function submitReview(e){e.preventDefault();if(!signedIn){setNotice("Sign in to review games.");return;}const {error}=await supabase.from("nexus_game_reviews").upsert({user_id:userId,username,game_name:reviewDraft.game,rating:Number(reviewDraft.rating),body:reviewDraft.body.trim()},{onConflict:"user_id,game_name"});if(error){setError(error.message);return;}setReviewDraft(v=>({...v,body:""}));load();}
  function finishMission(m){if(done.includes(m.id))return;const next=[...done,m.id];setDone(next);localSave("nexus_missions_"+(userId||"guest"),next);setNotice("Mission completed! +"+m.xp+" XP. Mission rewards are tracked here; account XP sync is coming with the rewards backend update.");}
  function buy(item){if(earned.includes(item.id)||xp<item.price){setNotice(xp<item.price?"You need more XP for that item.":"You already own that item.");return;}const next=[...earned,item.id];setEarned(next);localSave("nexus_cosmetics_"+(userId||"guest"),next);setNotice(item.name+" unlocked!");}
  function equip(item){const next={...equipped,[item.kind]:item.value};setEquipped(next);localSave("nexus_equipped_"+(userId||"guest"),next);setNotice(item.name+" equipped.");}
  const seasonRows=profileRows.slice().sort((a,b)=>(b.xp||0)-(a.xp||0));
  const filteredReviews=reviews.filter(r=>reviewFilter==="All"||r.game_name===reviewFilter);
  return <div className="nexus-features">
    <div className="page-title-row"><div><div className="eyebrow">THE NEXUS EXPANSION</div><h1>Everything hub</h1><p className="muted">Your games, goals, community, competitions, and customization.</p></div><span className="live-tag"><Sparkles size={14}/> EXPANDED</span></div>
    <div className="feature-tabs">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
    {error&&<div className="feature-error">{error}</div>}
    {tab==="games"&&<div className="feature-columns"><section className="feature-panel"><h2><Heart/> Favorite games</h2><p className="muted">Save games to build your personal arcade collection.</p><div className="feature-game-grid">{games.map(g=><button key={g} className={favorites.includes(g)?"feature-game saved":"feature-game"} onClick={()=>toggleFavorite(g)}><span>{favorites.includes(g)?"★":"☆"}</span>{g}</button>)}</div></section><section className="feature-panel"><h2><Star/> Game reviews</h2><p className="muted">Share a rating and help players find good games.</p><form className="feature-form" onSubmit={submitReview}><select value={reviewDraft.game} onChange={e=>setReviewDraft(v=>({...v,game:e.target.value}))}>{games.map(g=><option key={g}>{g}</option>)}</select><select value={reviewDraft.rating} onChange={e=>setReviewDraft(v=>({...v,rating:e.target.value}))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} stars</option>)}</select><textarea value={reviewDraft.body} onChange={e=>setReviewDraft(v=>({...v,body:e.target.value}))} placeholder="What did you think? (optional)" maxLength={500}/><button className="primary-btn"><Send size={15}/> Submit review</button></form><div className="feature-filter"><select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option>All</option>{games.map(g=><option key={g}>{g}</option>)}</select></div>{filteredReviews.slice(0,8).map(r=><article className="feature-list-item" key={r.id}><b>{r.game_name}</b><span>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span><small>by {r.username}</small>{r.body&&<p>{r.body}</p>}</article>)}</section></div>}
    {tab==="missions"&&<div className="feature-columns"><section className="feature-panel"><h2><Target/> Daily & weekly missions</h2><p className="muted">Complete goals and track your progress.</p>{missions.map(m=><article className="mission-row" key={m.id}><div><b>{m.title}</b><p>{m.detail}</p><small>Reward: {m.xp} XP</small></div><button className={done.includes(m.id)?"secondary-btn":"primary-btn"} disabled={done.includes(m.id)} onClick={()=>finishMission(m)}>{done.includes(m.id)?"Completed":"Mark complete"}</button></article>)}</section><section className="feature-panel"><h2><CalendarDays/> Featured game & community events</h2><p className="muted">Events posted by NEXUS admins.</p>{events.length?events.map(ev=><article className="feature-list-item" key={ev.id}><b>{ev.title}</b><small>{new Date(ev.event_date).toLocaleString()}</small></article>):<p className="feature-empty">No upcoming events have been posted yet.</p>}{isAdmin&&<form className="feature-form" onSubmit={createEvent}><input required placeholder="Event name" value={eventDraft.title} onChange={e=>setEventDraft(v=>({...v,title:e.target.value}))}/><input required type="datetime-local" value={eventDraft.date} onChange={e=>setEventDraft(v=>({...v,date:e.target.value}))}/><button className="primary-btn">Publish event</button></form>}</section></div>}
    {tab==="community"&&<div className="feature-columns"><section className="feature-panel"><h2><MessageSquare/> Community forums</h2><p className="muted">Start discussions, share ideas, and ask the community.</p><form className="feature-form" onSubmit={createPost}><textarea required maxLength={500} placeholder="Start a discussion..." value={draft} onChange={e=>setDraft(e.target.value)}/><button className="primary-btn"><Plus size={15}/> Publish post</button></form>{posts.length?posts.map(p=><article className="feature-list-item" key={p.id}><b>{p.title}</b><small>by {p.username} · {new Date(p.created_at).toLocaleDateString()}</small><p>{p.body}</p></article>):<p className="feature-empty">Be the first to start a discussion.</p>}</section><section className="feature-panel"><h2><Users/> Community polls</h2><p className="muted">Vote on what should happen next.</p><form className="feature-form" onSubmit={createPoll}><input placeholder="Poll question" value={pollDraft.question} onChange={e=>setPollDraft(v=>({...v,question:e.target.value}))}/><input placeholder="Option one" value={pollDraft.a} onChange={e=>setPollDraft(v=>({...v,a:e.target.value}))}/><input placeholder="Option two" value={pollDraft.b} onChange={e=>setPollDraft(v=>({...v,b:e.target.value}))}/><button className="primary-btn">Create poll</button></form>{polls.map(p=><article className="feature-list-item" key={p.id}><b>{p.question}</b>{(p.options||[]).map(o=><button className="poll-option" key={o} disabled={Boolean((p.votes||{})[userId])} onClick={()=>vote(p,o)}>{o} <small>{Object.values(p.votes||{}).filter(v=>v===o).length} votes</small></button>)}</article>)}</section></div>}
    {tab==="compete"&&<div className="feature-columns"><section className="feature-panel"><h2><Trophy/> Tournaments</h2><p className="muted">Create a community tournament and invite people to join.</p><button className="primary-btn" onClick={createTournament}><Plus size={15}/> Create tournament</button>{tournaments.map(t=><article className="feature-list-item" key={t.id}><b>{t.title}</b><small>{t.game_name} · {t.status} · by {t.username}</small></article>)}{!tournaments.length&&<p className="feature-empty">No tournaments yet. Start the first one!</p>}</section><section className="feature-panel"><h2><Medal/> Seasonal leaderboard</h2><p className="muted">Season 1 · XP rankings. Seasonal resets and rewards require admin scheduling.</p><div className="season-label"><span>{season}</span><select value={season} onChange={e=>setSeason(e.target.value)}><option>Season 1</option><option>Season 2</option><option>Season 3</option></select></div>{seasonRows.map((r,i)=><div className="feature-rank" key={r.username}><b>#{i+1} {r.username}</b><span>{r.xp||0} XP · Level {r.level||1}</span></div>)}</section></div>}
    {tab==="customize"&&<div className="feature-columns"><section className="feature-panel"><h2><Palette/> Customization shop</h2><p className="muted">Unlock profile banners, titles, and chat accents with XP.</p><div className="cosmetic-preview"><div className={"cosmetic-banner "+(equipped.banner||"default")}>{username}<small>{equipped.title||"NEXUS Player"}</small></div></div>{cosmetics.map(item=><article className="shop-row" key={item.id}><div><b>{item.name}</b><small>{item.price} XP · {item.kind}</small></div>{earned.includes(item.id)?<button className="secondary-btn" onClick={()=>equip(item)}>{equipped[item.kind]===item.value?"Equipped":"Equip"}</button>:<button className="primary-btn" disabled={xp<item.price} onClick={()=>buy(item)}>Unlock</button>}</article>)}</section><section className="feature-panel"><h2><Crown/> Player titles & profile style</h2><p className="muted">Titles you've earned or unlocked.</p>{titles.map((t,i)=><div className="feature-rank" key={t}><b>{t}</b><span>{i===0?"Available":i===1&&level>=2?"Unlocked":i===2&&level>=5?"Unlocked":i===3&&level>=8?"Unlocked":i===4&&level>=10?"Unlocked":"Reach level "+(i*3+2)}</span></div>)}<h3>Friends groups</h3><p className="muted">Use your People page to manage friend requests and direct messages. Group folders are stored locally in this first version.</p><button className="secondary-btn" onClick={()=>setNotice("Friend groups are on the next social update list.")}>Manage friend groups</button></section></div>}
    {tab==="stats"&&<div className="feature-columns"><section className="feature-panel"><h2><BarChart3/> Your player statistics</h2><div className="feature-stat-grid"><div><b>{xp}</b><small>Total XP</small></div><div><b>{level}</b><small>Level</small></div><div><b>{stats?.games_played||0}</b><small>Games played</small></div><div><b>{favorites.length}</b><small>Favorites</small></div></div><h3>Compare players</h3><form className="feature-form" onSubmit={async e=>{e.preventDefault();if(!compare.trim())return;const {data}=await supabase.from("nexus_player_stats").select("username,xp,level,games_played").ilike("username",compare.trim()).maybeSingle();setProfileRows(data?[data]:[]);}}><input placeholder="Enter a username" value={compare} onChange={e=>setCompare(e.target.value)}/><button className="primary-btn"><Search size={15}/> Compare</button></form>{profileRows.map(r=><div className="feature-rank" key={r.username}><b>{r.username}</b><span>{r.xp} XP · Level {r.level} · {r.games_played} games</span></div>)}</section><section className="feature-panel"><h2><Sparkles/> Game recommendations</h2><p className="muted">Suggestions based on your saved games.</p>{(favorites.length?games.filter(g=>!favorites.includes(g)).slice(0,4):games.slice(0,4)).map(g=><div className="feature-list-item" key={g}><b>{g}</b><small>{favorites.length?"Try something outside your favorites":"Favorite games to personalize recommendations"}</small></div>)}<h3>Admin analytics</h3>{isAdmin?<div className="feature-stat-grid"><div><b>{onlineCount||0}</b><small>Online now</small></div><div><b>{profileRows.length}</b><small>Leaderboard rows loaded</small></div><div><b>{posts.length}</b><small>Forum posts</small></div><div><b>{tournaments.length}</b><small>Tournaments</small></div></div>:<p className="muted">Admin-only analytics are available to moderators and administrators.</p>}</section></div>}
    {busy&&<p className="feature-empty">Loading community features…</p>}
    <p className="feature-footnote">Some features need a signed-in account. Your missions and cosmetic unlocks currently save on this browser; competitive rewards and protected XP purchases need a server-side rewards upgrade before launch.</p>
  </div>;
}
