import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes } from "node:crypto";

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [process.env.CLIENT_ORIGIN, "https://jaydenacosta254-art.github.io", "http://localhost:5173"].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

const rooms = new Map();
const users = new Map();
const chatMessages = new Map();


app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Nexus API" }));
app.get("/api/stats", (_req, res) => res.json({
  online: users.size,
  rooms: rooms.size,
  games: 3
}));

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

io.on("connection", (socket) => {
  socket.on("presence:join", ({ username }) => {
    const safeName = String(username || "Guest").slice(0, 24);
    users.set(socket.id, safeName);
    socket.emit("lobby:list", [...rooms.values()].filter(room => !room.private));
    io.emit("presence:update", [...users.values()]);
  });

  socket.on("chat:join", ({ channel }) => {
    const room = String(channel || "general").slice(0, 40);
    for (const joined of socket.rooms) if (joined.startsWith("chat:")) socket.leave(joined);
    socket.join(`chat:${room}`);
    socket.emit("chat:history", chatMessages.get(room) || []);
    socket.emit("chat:system", { text: `You joined #${room}`, at: Date.now() });
  });

  socket.on("chat:message", (payload = {}) => {
    const { channel, username, text } = payload;
    const message = String(text || "").trim().slice(0, 1000);
    const room = String(channel || "general").slice(0, 40);
    if (!message) return;
    const item = { id: randomBytes(8).toString("hex"), username: String(username || "Guest").slice(0,24), text: message, attachment: payload.attachment || null, replyTo: payload.replyTo || null, reactions: {}, edited: false, at: Date.now() };
    const history = chatMessages.get(room) || [];
    history.push(item);
    chatMessages.set(room, history.slice(-100));
    io.to(`chat:${room}`).emit("chat:message", item);
  });

  socket.on("message:react", ({ channel, messageId, emoji, username }) => {
    const room=String(channel||"general").slice(0,40);
    const item=(chatMessages.get(room)||[]).find(m=>m.id===messageId);
    if(!item||!["👍","❤️","😂","🎉","👀"].includes(emoji)) return;
    item.reactions[emoji]=item.reactions[emoji]||[];
    item.reactions[emoji]=item.reactions[emoji].includes(username)?item.reactions[emoji].filter(n=>n!==username):[...item.reactions[emoji],String(username||"Guest").slice(0,24)];
    io.to("chat:"+room).emit("message:updated",item);
  });
  socket.on("message:edit", ({channel,messageId,username,text}) => {
    const room=String(channel||"general").slice(0,40);
    const item=(chatMessages.get(room)||[]).find(m=>m.id===messageId);
    const clean=String(text||"").trim().slice(0,1000);
    if(!item||item.username!==username||!clean) return;
    item.text=clean; item.edited=true; io.to("chat:"+room).emit("message:updated",item);
  });
  socket.on("message:delete", ({channel,messageId,username}) => {
    const room=String(channel||"general").slice(0,40);
    const history=chatMessages.get(room)||[];
    const item=history.find(m=>m.id===messageId);
    if(!item||item.username!==username) return;
    chatMessages.set(room,history.filter(m=>m.id!==messageId));
    io.to("chat:"+room).emit("message:deleted",{id:messageId});
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