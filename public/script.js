const socket = io();

let username = prompt("Enter your name:");
let roomId = "main";
socket.emit("joinRoom", { roomId, username });

let isMaster = false;
let attempts = 3;
let timerInterval;

const playerList = document.getElementById("playerList");
const playerCount = document.getElementById("playerCount");
const scoreboard = document.getElementById("scoreList");
const messages = document.getElementById("messages");

const lobby = document.getElementById("lobby");
const masterControls = document.getElementById("masterControls");
const game = document.getElementById("game");
const gameQuestion = document.getElementById("gameQuestion");
const guessInput = document.getElementById("guessInput");
const submitGuess = document.getElementById("submitGuess");
const attemptsLeft = document.getElementById("attemptsLeft");
const timer = document.getElementById("timer");

const questionInput = document.getElementById("question");
const answerInput = document.getElementById("answer");
const startGame = document.getElementById("startGame");

const chatInput = document.getElementById("chatInput");
const sendChat = document.getElementById("sendChat");

socket.on("role", (data) => {
  isMaster = data.isMaster;
  lobby.classList.remove("hidden");
  if (isMaster) masterControls.classList.remove("hidden");
});

socket.on("updatePlayers", ({ players }) => {
  playerCount.textContent = players.length;
  playerList.innerHTML = "";
  players.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.username;
    playerList.appendChild(li);
  });
});

startGame.addEventListener("click", () => {
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();
  if (!question || !answer) return alert("Question and answer required!");
  socket.emit("createQuestion", { roomId, question, answer });
  questionInput.value = "";
  answerInput.value = "";
});

socket.on("startGame", ({ question }) => {
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
  gameQuestion.textContent = question;
  attempts = 3;
  attemptsLeft.textContent = attempts;
  startTimer();
});

submitGuess.addEventListener("click", () => {
  const guess = guessInput.value.trim();
  if (!guess || attempts <= 0) return;
  socket.emit("submitGuess", { roomId, guess });
  attempts--;
  attemptsLeft.textContent = attempts;
  guessInput.value = "";
});

socket.on("gameOver", ({ winner, answer, scores }) => {
  stopTimer();
  alert(winner === socket.id ? "🎉 You won!" : `Game Over. Winner: ${winner}`);
  game.classList.add("hidden");
  lobby.classList.remove("hidden");
  updateScores(scores);
});

socket.on("timeExpired", ({ answer }) => {
  stopTimer();
  alert(`Time's up! The correct answer was: ${answer}`);
  game.classList.add("hidden");
  lobby.classList.remove("hidden");
});

function startTimer() {
  let timeLeft = 60;
  timer.textContent = `Time left: ${timeLeft}s`;
  timerInterval = setInterval(() => {
    timeLeft--;
    timer.textContent = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      socket.emit("timeUp", { roomId });
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateScores(scores) {
  scoreboard.innerHTML = "";
  for (const id in scores) {
    const li = document.createElement("li");
    li.textContent = `${id}: ${scores[id]} pts`;
    scoreboard.appendChild(li);
  }
}

sendChat.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (!message) return;
  socket.emit("sendMessage", { roomId, username, message });
  chatInput.value = "";
});

socket.on("chatMessage", ({ username, message }) => {
  const li = document.createElement("li");
  li.textContent = `${username}: ${message}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
});
