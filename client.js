// ===============================
// WebSocket Server URL
// ===============================
// Wenn dein Render/Server später läuft: hier ersetzen!
let ws = new WebSocket("wss://phase10-extreme.onrender.com);
// Beispiel später: "wss://ws.deinedomain.de"
// ===============================

let myId = null;
let players = {};

const nameInput = document.getElementById("nameInput");
const myPhaseBox = document.getElementById("myPhase");
const phasePrev = document.getElementById("phasePrev");
const phaseNext = document.getElementById("phaseNext");
const finishBtn = document.getElementById("finishBtn");
const playerList = document.getElementById("playerList");

const scorePanel = document.getElementById("scorePanel");
const finisherInfo = document.getElementById("finisherInfo");
const low = document.getElementById("low");
const high = document.getElementById("high");
const joker = document.getElementById("joker");
const submitScore = document.getElementById("submitScore");

// Render player list
function renderPlayers() {
  playerList.innerHTML = "";
  Object.entries(players).forEach(([id, p]) => {
    let div = document.createElement("div");
    div.innerHTML = `${id === myId ? "🟢" : "👤"} <b>${p.name}</b>
                      – Phase ${p.phase}
                      – Σ ${p.score}`;
    playerList.appendChild(div);
  });
}

// WebSocket events
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);

  if (msg.type === "welcome") {
    myId = msg.id;
    players = msg.players;
    nameInput.value = players[myId].name;
    myPhaseBox.textContent = players[myId].phase;
    renderPlayers();
  }

  if (msg.type === "players") {
    players = msg.players;
    renderPlayers();
  }

  if (msg.type === "roundStart") {
    scorePanel.classList.remove("hidden");
    finisherInfo.textContent = `${msg.name} hat die Phase beendet!`;
  }

  if (msg.type === "scoreUpdate") {
    players[msg.id].score = msg.total;
    renderPlayers();
  }
};

// Name ändern
nameInput.onchange = () => {
  ws.send(JSON.stringify({ type: "setName", value: nameInput.value }));
};

// Phase ändern
phasePrev.onclick = () => {
  let p = Math.max(1, players[myId].phase - 1);
  ws.send(JSON.stringify({ type: "setPhase", value: p }));
};

phaseNext.onclick = () => {
  let p = Math.min(10, players[myId].phase + 1);
  ws.send(JSON.stringify({ type: "setPhase", value: p }));
};

// Phase beendet
finishBtn.onclick = () => {
  ws.send(JSON.stringify({ type: "phaseDone" }));
};

// Punkte abschicken
submitScore.onclick = () => {
  let lowN = parseInt(low.value || 0, 10);
  let highN = parseInt(high.value || 0, 10);
  let jokerN = parseInt(joker.value || 0, 10);

  let points = lowN * 5 + highN * 10 + jokerN * 20;

  ws.send(
    JSON.stringify({
      type: "scoreSubmit",
      points,
    })
  );

  low.value = "0";
  high.value = "0";
  joker.value = "0";

  scorePanel.classList.add("hidden");
};
