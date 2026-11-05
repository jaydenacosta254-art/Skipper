import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [process.env.CLIENT_ORIGIN, "https://jaydenacosta254-art.github.io", "http://localhost:5173"].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_BASE_URL = SUPABASE_URL.endsWith("/") ? SUPABASE_URL.slice(0, -1) : SUPABASE_URL;
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

if (!supabaseAdmin) {
  console.warn("NEXUS chat persistence is disabled. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Render environment.");
}

const rooms = new Map();
const users = new Map();


app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Nexus API" }));
app.get("/api/stats", (_req, res) => res.json({
  online: users.size,
  rooms: rooms.size,
  games: 3
}));

function cleanDisplayName(value) {
  const name = String(value || "Guest").trim().replace(/\s+/g, " ").slice(0, 24);
  return name || "Guest";
}

function cleanChannel(value) {
  return String(value || "general").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "general";
}

function toClientChatMessage(row) {
  return {
    id: row.id,
    username: row.username,
    text: row.body || "",
    attachment: row.attachment || null,
    replyTo: row.reply_to || null,
    reactions: row.reactions || {},
    edited: Boolean(row.edited),
    at: new Date(row.created_at).getTime()
  };
}

async function verifySupabaseUser(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error("Chat authentication is not configured on the NEXUS server yet.");
  }
  const response = await fetch(SUPABASE_BASE_URL + "/auth/v1/user", {
    headers: {
      apikey: SUPABASE_PUBLIC_KEY,
      Authorization: "Bearer " + accessToken
    }
  });
  if (!response.ok) throw new Error("Your NEXUS sign-in could not be verified. Please sign in again.");
  const user = await response.json();
  if (!user?.id) throw new Error("Your NEXUS sign-in could not be verified. Please sign in again.");

  let username = user.user_metadata?.username || user.email?.split("@")[0] || "Member";
  try {
    const profileUrl = new URL(SUPABASE_BASE_URL + "/rest/v1/profiles");
    profileUrl.searchParams.set("id", "eq." + user.id);
    profileUrl.searchParams.set("select", "username");
    const profileResponse = await fetch(profileUrl, {
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Authorization: "Bearer " + accessToken
      }
    });
    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles?.[0]?.username) username = profiles[0].username;
    }
  } catch (error) {
    console.warn("NEXUS chat could not load the account display name:", error.message);
  }

  return { userId: user.id, guestId: null, username: cleanDisplayName(username) };
}

function makeCode() {
  return randomBytes(3).toString("hex").toUpperCase();
}

const triviaQuestions = [
  {text:"Which planet is known as the Red Planet?",options:["Venus","Mars","Jupiter","Mercury"],answer:"Mars"},
  {text:"How many sides does a hexagon have?",options:["Five","Six","Seven","Eight"],answer:"Six"},
  {text:"What is the largest ocean on Earth?",options:["Atlantic","Indian","Arctic","Pacific"],answer:"Pacific"},
  {text:"Which animal is the largest mammal?",options:["African elephant","Blue whale","Giraffe","Hippopotamus"],answer:"Blue whale"},
  {text:"What is 9 × 8?",options:["64","72","81","80"],answer:"72"},
  {text:"Which gas do plants absorb from the atmosphere?",options:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],answer:"Carbon dioxide"},
  {text:"Which continent is the Sahara Desert in?",options:["Asia","Africa","Australia","South America"],answer:"Africa"},
  {text:"What is the chemical symbol for gold?",options:["Ag","Gd","Au","Go"],answer:"Au"}
];
const gameSessions = new Map();
function publicTriviaState(session){const q=triviaQuestions[session.index];return{index:session.index,total:triviaQuestions.length,question:q?{text:q.text,options:q.options}:null,scores:Object.entries(session.scores).map(([username,score])=>({username,score})),answered:Object.keys(session.answers),players:session.players,finished:session.finished};}

io.use(async (socket, next) => {
  try {
    const accessToken = String(socket.handshake.auth?.accessToken || "");
    if (accessToken) {
      socket.data.identity = await verifySupabaseUser(accessToken);
    } else {
      socket.data.identity = {
        userId: null,
        guestId: randomUUID(),
        username: cleanDisplayName(socket.handshake.auth?.guestName || "Guest")
      };
    }
    next();
  } catch (error) {
    next(new Error(error.message || "NEXUS chat authentication failed."));
  }
});

io.on("connection", (socket) => {
  socket.on("presence:join", () => {
    const safeName = socket.data.identity?.username || "Guest";
    users.set(socket.id, safeName);
    socket.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
    io.emit("presence:update", [...users.values()]);
  });

  socket.on("chat:join", async (payload = {}) => {
    const room = cleanChannel(payload.channel);
    for (const joined of socket.rooms) {
      if (joined.startsWith("chat:")) socket.leave(joined);
    }
    socket.join("chat:" + room);
    if (!supabaseAdmin) {
      socket.emit("chat:error", "Chat history is temporarily unavailable. The NEXUS server needs its Supabase service key configured.");
      return;
    }
    const { data, error } = await supabaseAdmin
      .from("nexus_chat_messages")
      .select("id,channel,user_id,guest_id,username,body,attachment,reply_to,reactions,edited,created_at")
      .eq("channel", room)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("NEXUS chat history load failed:", error.message);
      socket.emit("chat:error", "Could not load chat history. Please try again.");
      return;
    }
    socket.emit("chat:history", (data || []).reverse().map(toClientChatMessage));
    socket.emit("chat:system", { text: "You joined #" + room, at: Date.now() });
  });

  socket.on("chat:message", async (payload = {}) => {
    if (!supabaseAdmin) return socket.emit("chat:error", "Chat storage is not configured on the NEXUS server yet.");
    const identity = socket.data.identity;
    const body = String(payload.text || "").trim().slice(0, 1000);
    const room = cleanChannel(payload.channel);
    const rawAttachment = payload.attachment;
    const rawUrl = String(rawAttachment?.url || "");
    let attachment = null;
    if (identity?.userId && rawAttachment && SUPABASE_URL) {
      const prefix = SUPABASE_BASE_URL + "/storage/v1/object/public/chat-uploads/" + identity.userId + "/";
      if (rawUrl.startsWith(prefix) && rawUrl.length <= 2048) {
        attachment = {
          name: String(rawAttachment.name || "Attachment").replaceAll("/", "_").slice(0, 120),
          url: rawUrl
        };
      }
    }
    if (!body && !attachment) return;
    const replyTo = payload.replyTo && typeof payload.replyTo === "object"
      ? {
          id: String(payload.replyTo.id || "").slice(0, 64),
          username: cleanDisplayName(payload.replyTo.username),
          text: String(payload.replyTo.text || "").slice(0, 200)
        }
      : null;
    const { data, error } = await supabaseAdmin
      .from("nexus_chat_messages")
      .insert({
        channel: room,
        user_id: identity?.userId || null,
        guest_id: identity?.guestId || null,
        username: identity?.username || "Guest",
        body,
        attachment,
        reply_to: replyTo
      })
      .select("id,channel,user_id,guest_id,username,body,attachment,reply_to,reactions,edited,created_at")
      .single();
    if (error) {
      console.error("NEXUS chat message save failed:", error.message);
      socket.emit("chat:error", "Your message could not be saved. Please try again.");
      return;
    }
    io.to("chat:" + room).emit("chat:message", toClientChatMessage(data));
  });

  socket.on("message:react", async (payload = {}) => {
    if (!supabaseAdmin) return socket.emit("chat:error", "Chat storage is not configured on the NEXUS server yet.");
    const room = cleanChannel(payload.channel);
    const emoji = String(payload.emoji || "");
    if (!["👍", "❤️", "😂", "🎉", "👀"].includes(emoji)) return;
    const identity = socket.data.identity;
    const { data: message, error: loadError } = await supabaseAdmin
      .from("nexus_chat_messages")
      .select("*")
      .eq("id", payload.messageId)
      .eq("channel", room)
      .maybeSingle();
    if (loadError || !message) return;
    const reactions = message.reactions && typeof message.reactions === "object" ? { ...message.reactions } : {};
    const actor = identity?.userId || identity?.guestId;
    if (!actor) return;
    const actors = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    reactions[emoji] = actors.includes(actor) ? actors.filter(id => id !== actor) : [...actors, actor];
    const { data, error } = await supabaseAdmin
      .from("nexus_chat_messages")
      .update({ reactions })
      .eq("id", message.id)
      .select("id,channel,user_id,guest_id,username,body,attachment,reply_to,reactions,edited,created_at")
      .single();
    if (error) return socket.emit("chat:error", "That reaction could not be saved.");
    io.to("chat:" + room).emit("message:updated", toClientChatMessage(data));
  });

  socket.on("message:edit", async (payload = {}) => {
    if (!supabaseAdmin) return socket.emit("chat:error", "Chat storage is not configured on the NEXUS server yet.");
    const identity = socket.data.identity;
    const room = cleanChannel(payload.channel);
    const body = String(payload.text || "").trim().slice(0, 1000);
    if (!body || !identity) return;
    let query = supabaseAdmin.from("nexus_chat_messages").update({ body, edited: true }).eq("id", payload.messageId).eq("channel", room);
    query = identity.userId ? query.eq("user_id", identity.userId) : query.eq("guest_id", identity.guestId);
    const { data, error } = await query
      .select("id,channel,user_id,guest_id,username,body,attachment,reply_to,reactions,edited,created_at")
      .maybeSingle();
    if (error || !data) {
      socket.emit("chat:error", "You can only edit your own messages.");
      return;
    }
    io.to("chat:" + room).emit("message:updated", toClientChatMessage(data));
  });

  socket.on("message:delete", async (payload = {}) => {
    if (!supabaseAdmin) return socket.emit("chat:error", "Chat storage is not configured on the NEXUS server yet.");
    const identity = socket.data.identity;
    const room = cleanChannel(payload.channel);
    if (!identity) return;
    let query = supabaseAdmin.from("nexus_chat_messages").delete().eq("id", payload.messageId).eq("channel", room);
    query = identity.userId ? query.eq("user_id", identity.userId) : query.eq("guest_id", identity.guestId);
    const { data, error } = await query.select("id").maybeSingle();
    if (error || !data) {
      socket.emit("chat:error", "You can only delete your own messages.");
      return;
    }
    io.to("chat:" + room).emit("message:deleted", { id: data.id });
  });

  socket.on("lobby:create", ({ username, game, isPrivate = false }) => {
    const code = makeCode();
    const lobby = {
      code,
      game: String(game || "Party Arena").slice(0, 40),
      host: String(username || "Guest").slice(0, 24),
      players: [String(username || "Guest").slice(0, 24)],
      started: false,
      private: Boolean(isPrivate)
    };
    rooms.set(code, lobby);
    socket.join(`lobby:${code}`);
    socket.emit("lobby:created", lobby);
    io.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
  });

  socket.on("lobby:join", ({ code, username }) => {
    const key = String(code || "").toUpperCase().slice(0, 12);
    const lobby = rooms.get(key);
    if (!lobby) return socket.emit("lobby:error", "That lobby code was not found.");
    const name = String(username || "Guest").slice(0, 24);
    if (!lobby.players.includes(name)) lobby.players.push(name);
    socket.join(`lobby:${key}`);
    io.to(`lobby:${key}`).emit("lobby:update", lobby);
    io.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
  });


  socket.on("race:boost",({code,username})=>{const key=String(code||"").toUpperCase(),lobby=rooms.get(key),session=gameSessions.get(key);if(!lobby||lobby.game!=="Neon Racers"||!session||!lobby.players.includes(username)||session.winner)return;session.progress[username]=Math.min(100,(session.progress[username]||0)+4);if(session.progress[username]>=100)session.winner=username;io.to("lobby:"+key).emit("race:state",{players:lobby.players,progress:session.progress,winner:session.winner});});
  socket.on("trivia:next",({code,username})=>{const key=String(code||"").toUpperCase(),lobby=rooms.get(key);if(!lobby||lobby.game!=="Trivia Clash"||lobby.host!==username)return;let session=gameSessions.get(key);if(!session)session={index:-1,scores:Object.fromEntries(lobby.players.map(p=>[p,0])),answers:{},players:[...lobby.players],finished:false};if(session.index>=triviaQuestions.length-1){session.finished=true;gameSessions.set(key,session);io.to("lobby:"+key).emit("trivia:state",publicTriviaState(session));return;}session.index++;session.answers={};session.finished=false;gameSessions.set(key,session);io.to("lobby:"+key).emit("trivia:question",publicTriviaState(session));});
  socket.on("trivia:answer",({code,username,answer})=>{const key=String(code||"").toUpperCase(),lobby=rooms.get(key),session=gameSessions.get(key);if(!lobby||!session||session.finished||!lobby.players.includes(username)||session.answers[username])return;const q=triviaQuestions[session.index];if(!q)return;const correct=String(answer||"")===q.answer;session.answers[username]={answer:String(answer||""),correct};if(correct)session.scores[username]=(session.scores[username]||0)+1;io.to("lobby:"+key).emit("trivia:state",publicTriviaState(session));});
  socket.on("game:leave",({code,username})=>{const key=String(code||"").toUpperCase();socket.leave("lobby:"+key);const session=gameSessions.get(key);if(session?.progress)delete session.progress[username];});

  socket.on("lobby:start", ({ code, username }) => {
    const lobby = rooms.get(String(code || "").toUpperCase());
    if (!lobby) return;
    if (lobby.host !== username) return socket.emit("lobby:error", "Only the host can start this lobby.");
    lobby.started = true;
    io.to(`lobby:${lobby.code}`).emit("lobby:update", lobby);
    io.to(`lobby:${lobby.code}`).emit("game:started", { game: lobby.game, players: lobby.players, code: lobby.code, host: lobby.host });
    if(lobby.game==="Neon Racers"){const progress=Object.fromEntries(lobby.players.map(p=>[p,0]));gameSessions.set(lobby.code,{progress,winner:null});io.to("lobby:"+lobby.code).emit("race:state",{players:lobby.players,progress,winner:null});}
  });

  socket.on("lobby:leave", ({ code, username }) => {
    const key = String(code || "").toUpperCase();
    const lobby = rooms.get(key);
    socket.leave(`lobby:${key}`);
    if (lobby) {
      lobby.players = lobby.players.filter(p => p !== username);
      if (!lobby.players.length || lobby.host === username) { rooms.delete(key); gameSessions.delete(key); }
      else io.to(`lobby:${key}`).emit("lobby:update", lobby);
      io.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
    }
  });

  socket.on("disconnecting", () => {
    const username = users.get(socket.id);
    if (!username) return;

    // Remove disconnected players from every lobby they were actually in.
    // Keep the player listed if another tab/device with the same username
    // is still connected to that same lobby.
    for (const roomName of socket.rooms) {
      if (!roomName.startsWith("lobby:")) continue;
      const code = roomName.slice("lobby:".length);
      const lobby = rooms.get(code);
      if (!lobby) continue;

      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      const anotherSession = roomSockets && [...roomSockets].some(id =>
        id !== socket.id && users.get(id) === username
      );
      if (!anotherSession) lobby.players = lobby.players.filter(name => name !== username);

      if (!lobby.players.length || lobby.host === username) {
        rooms.delete(code);
        gameSessions.delete(code);
      } else {
        io.to(roomName).emit("lobby:update", lobby);
      }
      io.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
    }
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("presence:update", [...users.values()]);
  });
});

const port = Number(process.env.PORT || 3001);
httpServer.listen(port, () => console.log(`Nexus server running on http://localhost:${port}`));