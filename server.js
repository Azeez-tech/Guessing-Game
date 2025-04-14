const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

let sessions = {}; // { roomId: { players: [], scores: {}, gameState: {} } }

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinRoom", ({ roomId, username }) => {
    socket.join(roomId);
    if (!sessions[roomId]) {
      sessions[roomId] = {
        players: [],
        scores: {},
        gameMaster: socket.id,
        gameState: null,
      };
    }
    sessions[roomId].players.push({ id: socket.id, username });
    sessions[roomId].scores[socket.id] =
      sessions[roomId].scores[socket.id] || 0;

    io.to(roomId).emit("updatePlayers", {
      players: sessions[roomId].players,
    });

    socket.emit("role", {
      isMaster: socket.id === sessions[roomId].gameMaster,
    });
  });

  socket.on("createQuestion", ({ roomId, question, answer }) => {
    if (!sessions[roomId]) return;
    sessions[roomId].gameState = {
      question,
      answer,
      active: true,
      startTime: Date.now(),
      answered: false,
    };
    io.to(roomId).emit("startGame", { question });
  });

  socket.on("submitGuess", ({ roomId, guess }) => {
    const session = sessions[roomId];
    if (
      !session ||
      !session.gameState ||
      !session.gameState.active ||
      session.gameState.answered
    )
      return;

    const correct =
      guess.trim().toLowerCase() ===
      session.gameState.answer.trim().toLowerCase();
    if (correct) {
      session.gameState.active = false;
      session.gameState.answered = true;
      session.scores[socket.id] += 10;

      io.to(roomId).emit("gameOver", {
        winner: socket.id,
        answer: session.gameState.answer,
        scores: session.scores,
      });
    }
  });

  socket.on("timeUp", ({ roomId }) => {
    const session = sessions[roomId];
    if (
      session &&
      session.gameState &&
      session.gameState.active &&
      !session.gameState.answered
    ) {
      session.gameState.active = false;
      io.to(roomId).emit("timeExpired", { answer: session.gameState.answer });
    }
  });

  socket.on("sendMessage", ({ roomId, message, username }) => {
    io.to(roomId).emit("chatMessage", { username, message });
  });

  socket.on("disconnecting", () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      const session = sessions[roomId];
      if (!session) return;
      session.players = session.players.filter((p) => p.id !== socket.id);
      delete session.scores[socket.id];

      if (session.players.length === 0) {
        delete sessions[roomId];
      } else {
        io.to(roomId).emit("updatePlayers", {
          players: session.players,
        });
      }
    });
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
