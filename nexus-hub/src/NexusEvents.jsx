import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react";
import { supabase } from "./supabase";
import "./NexusEvents.css";

function eventStatus(event, now = Date.now()) {
  const start = new Date(event.event_date).getTime();
  const end = event.end_date ? new Date(event.end_date).getTime() : null;
  if (start > now) return "Upcoming";
  if (end && end < now) return "Ended";
  return "Live now";
}

function EventCard({ event }) {
  return <article className="nexus-event-card">
    <div className="nexus-event-card-top">
      <span className={"nexus-event-kind " + (event.event_type === "current" ? "current" : "seasonal")}>
        {event.event_type === "current" ? "CURRENT EVENT" : "SEASONAL EVENT"}
      </span>
      <span className={"nexus-event-status " + eventStatus(event).toLowerCase().replaceAll(" ", "-")}>{eventStatus(event)}</span>
    </div>
    <h3>{event.title}</h3>
    <p><CalendarDays size={14}/> Starts {new Date(event.event_date).toLocaleString()}</p>
    {event.end_date && <p><Clock3 size={14}/> Ends {new Date(event.end_date).toLocaleString()}</p>}
  </article>;
}

export function SeasonalEventsPage() {
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    supabase.from("nexus_events").select("id,title,event_date,end_date,event_type").order("event_date", { ascending: true }).limit(50)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError("Events could not load. Please check the NEXUS upgrade database setup.");
        else setEvents(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const currentEvents = useMemo(() => events.filter(event => event.event_type === "current" && eventStatus(event) !== "Ended"), [events]);
  const seasonalEvents = useMemo(() => events.filter(event => event.event_type !== "current" && eventStatus(event) !== "Ended"), [events]);
  const visible = tab === "current" ? currentEvents : seasonalEvents;

  return <div className="nexus-events-page">
    <div className="page-title-row">
      <div><div className="eyebrow">WHAT'S HAPPENING</div><h1>Seasonal events</h1><p className="muted">See what's happening now and what's coming up across NEXUS.</p></div>
      <span className="live-tag"><CalendarDays size={14}/> EVENT BOARD</span>
    </div>
    <div className="nexus-event-tabs">
      <button className={tab === "current" ? "active" : ""} onClick={() => setTab("current")}>Current events <span>{currentEvents.length}</span></button>
      <button className={tab === "seasonal" ? "active" : ""} onClick={() => setTab("seasonal")}>Seasonal events <span>{seasonalEvents.length}</span></button>
    </div>
    {loading ? <div className="empty-state"><p>Loading events…</p></div> : error ? <div className="form-error">{error}</div> : visible.length
      ? <div className="nexus-event-grid">{visible.map(event => <EventCard event={event} key={event.id}/>)}</div>
      : <div className="nexus-event-empty"><CalendarDays size={28}/><h2>No {tab === "current" ? "current" : "seasonal"} events yet</h2><p>Check back here for new NEXUS events.</p></div>}
  </div>;
}

export function AdminSeasonalEvents() {
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState({ title: "", type: "seasonal", start: "", end: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadEvents() {
    if (!supabase) return;
    const { data, error: queryError } = await supabase.from("nexus_events").select("id,title,event_date,end_date,event_type").order("event_date", { ascending: true }).limit(100);
    if (queryError) setError("Events could not load. Run the latest NEXUS SQL setup.");
    else { setEvents(data || []); setError(""); }
  }
  useEffect(() => { loadEvents(); }, []);

  async function publishEvent(e) {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not connected.");
    if (!draft.title.trim() || !draft.start) return;
    const start = new Date(draft.start);
    const end = draft.end ? new Date(draft.end) : null;
    if (end && end <= start) return setError("The end time must be after the start time.");
    setBusy(true); setError("");
    const { data: authData } = await supabase.auth.getUser();
    const { data, error: insertError } = await supabase.from("nexus_events").insert({
      user_id: authData.user?.id,
      title: draft.title.trim().slice(0, 100),
      event_date: start.toISOString(),
      end_date: end ? end.toISOString() : null,
      event_type: draft.type
    }).select("id,title,event_date,end_date,event_type").single();
    setBusy(false);
    if (insertError) { setError(insertError.message); return; }
    setEvents(rows => [...rows, data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
    setDraft({ title: "", type: "seasonal", start: "", end: "" });
  }

  async function removeEvent(event) {
    if (!window.confirm("Delete this event from the NEXUS event board?")) return;
    const { error: deleteError } = await supabase.from("nexus_events").delete().eq("id", event.id);
    if (deleteError) { setError(deleteError.message); return; }
    setEvents(rows => rows.filter(row => row.id !== event.id));
  }

  return <section className="social-panel nexus-admin-events">
    <div className="nexus-admin-events-heading"><div><h2><CalendarDays size={18}/> Seasonal events</h2><p className="muted">Publish current or seasonal events. Published events appear on the public Seasonal Events tab.</p></div></div>
    <form className="nexus-admin-event-form" onSubmit={publishEvent}>
      <label>Event name<input required maxLength={100} value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} placeholder="Example: Winter Arcade Festival"/></label>
      <label>Event type<select value={draft.type} onChange={e => setDraft(v => ({ ...v, type: e.target.value }))}><option value="current">Current event</option><option value="seasonal">Seasonal event</option></select></label>
      <label>Start date and time<input required type="datetime-local" value={draft.start} onChange={e => setDraft(v => ({ ...v, start: e.target.value }))}/></label>
      <label>End date and time (optional)<input type="datetime-local" value={draft.end} onChange={e => setDraft(v => ({ ...v, end: e.target.value }))}/></label>
      <button className="primary-btn" disabled={busy}><Plus size={15}/>{busy ? "Publishing…" : "Publish event"}</button>
    </form>
    {error && <div className="form-error">{error}</div>}
    <div className="nexus-admin-event-list">
      {events.length ? events.map(event => <div className="nexus-admin-event-row" key={event.id}>
        <div><b>{event.title}</b><small>{event.event_type === "current" ? "Current event" : "Seasonal event"} · {new Date(event.event_date).toLocaleString()}</small></div>
        <button className="quiet-btn" type="button" onClick={() => removeEvent(event)} aria-label={"Delete " + event.title}><Trash2 size={15}/> Delete</button>
      </div>) : <p className="muted">No events have been published yet.</p>}
    </div>
  </section>;
}
