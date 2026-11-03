import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomBytes } from "node:crypto";

const app = express();
const httpServer = createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"] }
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

io.on("connection", (socket) => {
  socket.on("presence:join", ({ username }) => {
    const safeName = String(username || "Guest").slice(0, 24);
    users.set(socket.id, safeName);
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

  socket.on("lobby:create", ({ username, game }) => {
    const code = makeCode();
    const lobby = {
      code,
      game: String(game || "Party Arena").slice(0, 40),
      host: String(username || "Guest").slice(0, 24),
      players: [String(username || "Guest").slice(0, 24)],
      started: false
    };
    rooms.set(code, lobby);
    socket.join(`lobby:${code}`);
    socket.emit("lobby:created", lobby);
    io.emit("lobby:list", [...rooms.values()]);
  });

  socket.on("lobby:join", ({ code, username }) => {
    const key = String(code || "").toUpperCase().slice(0, 12);
    const lobby = rooms.get(key);
    if (!lobby) return socket.emit("lobby:error", "That lobby code was not found.");
    const name = String(username || "Guest").slice(0, 24);
    if (!lobby.players.includes(name)) lobby.players.push(name);
    socket.join(`lobby:${key}`);
    io.to(`lobby:${key}`).emit("lobby:update", lobby);
    io.emit("lobby:list", [...rooms.values()]);
  });

  socket.on("lobby:start", ({ code, username }) => {
    const lobby = rooms.get(String(code || "").toUpperCase());
    if (!lobby) return;
    if (lobby.host !== username) return socket.emit("lobby:error", "Only the host can start this lobby.");
    lobby.started = true;
    io.to(`lobby:${lobby.code}`).emit("lobby:update", lobby);
    io.to(`lobby:${lobby.code}`).emit("game:started", { game: lobby.game, players: lobby.players });
  });

  socket.on("lobby:leave", ({ code, username }) => {
    const key = String(code || "").toUpperCase();
    const lobby = rooms.get(key);
    socket.leave(`lobby:${key}`);
    if (lobby) {
      lobby.players = lobby.players.filter(p => p !== username);
      if (!lobby.players.length || lobby.host === username) rooms.delete(key);
      else io.to(`lobby:${key}`).emit("lobby:update", lobby);
      io.emit("lobby:list", [...rooms.values()]);
    }
  });

  socket.on("disconnect", () => {
    users.delete(socket.id);
    io.emit("presence:update", [...users.values()]);
  });
});

const port = Number(process.env.PORT || 3001);
httpServer.listen(port, () => console.log(`Nexus server running on http://localhost:${port}`));