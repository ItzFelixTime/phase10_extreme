// ===============================
// CONFIG
// ===============================
const SERVER_URL = "wss://phase10-extreme.onrender.com";

// ===============================
// DOM HELPERS
// ===============================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

// ===============================
// DOM ELEMENTS
// ===============================

// Screens
const screenStart = $("#screenStart");
const screenLobby = $("#screenLobby");
const screenGame = $("#screenGame");

// UI tags
const statusTag = $("#statusTag");
const roomTag = $("#roomTag");
const selfNameTag = $("#selfNameTag");

// Startscreen
const startName = $("#startName");
const avatarSelected = $("#avatarSelected");
const avatarGrid = $("#avatarGrid");
const avatarPrompt = $("#avatarPrompt");
const btnGenAvatar = $("#btnGenAvatar");
const avatarGenStatus = $("#avatarGenStatus");
const btnCreateRoom = $("#btnCreateRoom");
const btnJoinRoom = $("#btnJoinRoom");
const joinCode = $("#joinCode");
const startError = $("#startError");

// Lobby
const lobbyRoomCode = $("#lobbyRoomCode");
const lobbyRoleHint = $("#lobbyRoleHint");
const lobbyPlayers = $("#lobbyPlayers");
const btnLobbyStart = $("#btnLobbyStart");
const btnLeaveLobby = $("#btnLeaveLobby");

// Spielscreen
const num = $("#num");
const title = $("#title");
const rule = $("#rule");
const examplesEl = $("#examples");
const barfill = $("#barfill");
const hint = $("#hint");
const btnPrev = $("#btnPrev");
const btnNext = $("#btnNext");
const btnReset = $("#btnReset");
const btnFinish = $("#btnFinish");
const jump = $("#jump");

const scorePanel = $("#scorePanel");
const finisherInfo = $("#finisherInfo");
const lowInput = $("#low");
const highInput = $("#high");
const jokerInput = $("#joker");
const outPoints = $("#outPoints");
const submitScore = $("#submitScore");
const scoreStatus = $("#scoreStatus");

// Chat
const chatBox = $("#chatBox");
const chatInput = $("#chatInput");
const chatSend = $("#chatSend");

// Misc
const btnReconnect = $("#btnReconnect");


// ===============================
// GAME DATA
// ===============================
const phases = [
  { id:1, title:"Phase 1", rule:"Zwei Paare + 1 Drilling", examples:["(3,3) (9,9) (5,5,5)"] },
  { id:2, title:"Phase 2", rule:"Viererfolge, jede Karte andere Farbe", examples:["4–5–6–7 (alle Farben verschieden)"] },
  { id:3, title:"Phase 3", rule:"Zwei Drillinge (gerade + ungerade)", examples:["(2,2,2) und (7,7,7)"] },
  { id:4, title:"Phase 4", rule:"ABABA-Muster (Nachbarn wechseln)", examples:["1,2,1,2,1"] },
  { id:5, title:"Phase 5", rule:"6 Karten gleiche Farbe, Summe > 40", examples:["6× Blau, Summe z.B. 42"] },
  { id:6, title:"Phase 6", rule:"Sechserfolge (Farben egal)", examples:["G,R,G,R,G,R"] },
  { id:7, title:"Phase 7", rule:"Ein Paar + zwei unterschiedliche Drillinge", examples:["(K,K), (3,3,3), (8,8,8)"] },
  { id:8, title:"Phase 8", rule:"4× niedrig (1–6) + 4× hoch (7–12)", examples:["1,2,3,4 + 9,10,11,12"] },
  { id:9, title:"Phase 9", rule:"5 blaue Karten", examples:["Beliebige Werte"] },
  { id:10, title:"Phase 10", rule:"Zwei Fünferfolgen", examples:["2–3–4–5–6 & 8–9–10–11–12"] }
];

let ws = null;

// PLAYER STATE
let myId = null;
let myName = "";
let myAvatar = "😄";
let myAvatarUrl = null;
let myPhase = 1;
let roomId = null;
let hostId = null;

let players = {};


// ===============================
// WEBSOCKET CONNECTION
// ===============================
function connectWS() {
  ws = new WebSocket(SERVER_URL);

  ws.onopen = () => {
    statusTag.textContent = "🟢 Verbunden";
  };

  ws.onclose = () => {
    statusTag.textContent = "🔴 Offline";
  };

  ws.onerror = () => {
    statusTag.textContent = "🔴 Fehler";
  };

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);

    // Welcome
    if (msg.type === "welcome") {
      myId = msg.playerId;
      return;
    }

    // Room created
    if (msg.type === "roomCreated") {
      roomId = msg.roomId;
      hostId = msg.hostId;
      players = msg.players;
      showLobby();
      return;
    }

    // Joined room
    if (msg.type === "roomJoined") {
      roomId = msg.roomId;
      hostId = msg.hostId;
      players = msg.players;
      showLobby();
      return;
    }

    // Error joining
    if (msg.type === "joinError") {
      startError.textContent = msg.message;
      return;
    }

    // Lobby players update
    if (msg.type === "playersUpdated") {
      players = msg.players;
      renderLobbyPlayers();
      renderGamePlayers();
      return;
    }

    // KI Avatar updated
    if (msg.type === "avatarUpdated") {
      if (players[msg.id]) {
        players[msg.id].avatarUrl = msg.avatarUrl;

        if (msg.id === myId) {
          myAvatarUrl = msg.avatarUrl;
          avatarSelected.innerHTML = `<img src="${msg.avatarUrl}" class="avatarIcon">`;
        }

        renderLobbyPlayers();
        renderGamePlayers();
      }
      avatarGenStatus.textContent = "Avatar aktualisiert!";
      return;
    }

    if (msg.type === "avatarError") {
      avatarGenStatus.textContent = msg.message;
      return;
    }

    // Game started
    if (msg.type === "gameStarted") {
      showGame();
      return;
    }

    // Someone finished phase
    if (msg.type === "phaseDone") {
      scorePanel.classList.remove("hidden");
      finisherInfo.textContent = `${msg.name} hat die Phase beendet!`;
      lowInput.value = 0;
      highInput.value = 0;
      jokerInput.value = 0;
      outPoints.value = 0;
      return;
    }

    // Chat
    if (msg.type === "chat") {
      const div = document.createElement("div");
      div.className = "chatMsg";
      div.textContent = `${msg.name}: ${msg.text}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      return;
    }
  };
}

// Reconnect button
btnReconnect.onclick = connectWS;

connectWS();


// ===============================
// UI: START SCREEN
// ===============================
const emojiAvatars = ["🐶","🐱","🐸","🐵","🐼","🦊","🐯","🐰","🐙","🐧","🦁","🐢"];

function buildAvatarGrid() {
  avatarGrid.innerHTML = "";
  emojiAvatars.forEach((em) => {
    const d = document.createElement("div");
    d.textContent = em;
    d.onclick = () => {
      myAvatar = em;
      myAvatarUrl = null;
      avatarSelected.textContent = em;
    };
    avatarGrid.appendChild(d);
  });
}
buildAvatarGrid();

btnGenAvatar.onclick = () => {
  const prompt = avatarPrompt.value.trim();
  if (!prompt) {
    avatarGenStatus.textContent = "Bitte Prompt eingeben.";
    return;
  }

  avatarGenStatus.textContent = "Generiere…";

  ws.send(JSON.stringify({
    type: "generateAvatar",
    prompt
  }));
};


// ===============================
// LOBBY
// ===============================
function showLobby() {
  hide("#screenStart");
  hide("#screenGame");
  show("#screenLobby");

  lobbyRoomCode.textContent = roomId;
  lobbyRoleHint.textContent = myId === hostId ? "Du bist Host" : "Du bist Spieler";
  renderLobbyPlayers();
}

btnCreateRoom.onclick = () => {
  const name = startName.value.trim();
  if (!name) {
    startError.textContent = "Name eingeben!";
    return;
  }

  myName = name;

  ws.send(JSON.stringify({
    type: "createRoom",
    name,
    avatarUrl: myAvatarUrl,
    avatar: myAvatar
  }));
};

btnJoinRoom.onclick = () => {
  const name = startName.value.trim();
  if (!name) {
    startError.textContent = "Name eingeben!";
    return;
  }
  if (!joinCode.value.trim()) {
    startError.textContent = "Code eingeben!";
    return;
  }

  myName = name;

  ws.send(JSON.stringify({
    type: "joinRoom",
    name,
    roomId: joinCode.value.trim(),
    avatarUrl: myAvatarUrl,
    avatar: myAvatar
  }));
};

btnLobbyStart.onclick = () => {
  if (myId !== hostId) return;

  ws.send(JSON.stringify({ type:"startGame" }));
};

btnLeaveLobby.onclick = () => {
  location.reload();
};

function renderLobbyPlayers() {
  lobbyPlayers.innerHTML = "";
  for (const id in players) {
    const p = players[id];
    const row = document.createElement("div");
    row.className = "pRow";

    const av = p.avatarUrl
      ? `<img src="${p.avatarUrl}" class="avatarIcon">`
      : `<div class="avatarIcon" style="display:flex;align-items:center;justify-content:center;font-size:20px">${p.avatar || "😄"}</div>`;

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        ${av}
        <b>${p.name}</b> ${id === hostId ? "(Host)" : ""}
      </div>
    `;
    lobbyPlayers.appendChild(row);
  }
}


// ===============================
// GAME VIEW
// ===============================
function showGame() {
  hide("#screenStart");
  hide("#screenLobby");
  show("#screenGame");

  renderPhase();
  renderJump();
  renderGamePlayers();
}

function renderPhase() {
  const p = phases[myPhase - 1];
  num.textContent = p.id;
  title.textContent = p.title;
  rule.textContent = p.rule;
  examplesEl.innerHTML = p.examples.map(e => `<li>${e}</li>`).join("");
  barfill.style.width = (myPhase / 10 * 100) + "%";
  hint.textContent = `${myPhase} / 10`;
}

function renderJump() {
  jump.innerHTML = "";
  phases.forEach((p) => {
    const b = document.createElement("button");
    b.textContent = p.id;
    if (p.id === myPhase) b.classList.add("active");
    b.onclick = () => setPhase(p.id);
    jump.appendChild(b);
  });
}


// ===============================
// GAME EVENTS
// ===============================
function setPhase(n) {
  myPhase = Math.max(1, Math.min(10, n));
  renderPhase();

  ws.send(JSON.stringify({
    type: "setPhase",
    value: myPhase
  }));
}

btnPrev.onclick = () => setPhase(myPhase - 1);
btnNext.onclick = () => setPhase(myPhase + 1);
btnReset.onclick = () => setPhase(1);

btnFinish.onclick = () => {
  ws.send(JSON.stringify({ type:"phaseDone" }));
};


// ===============================
// SCORE
// ===============================
function updatePoints() {
  const low = parseInt(lowInput.value || 0, 10);
  const high = parseInt(highInput.value || 0, 10);
  const jok = parseInt(jokerInput.value || 0, 10);

  const pts = low * 5 + high * 10 + jok * 20;
  outPoints.value = pts;
}

lowInput.oninput = updatePoints;
highInput.oninput = updatePoints;
jokerInput.oninput = updatePoints;

submitScore.onclick = () => {
  const pts = parseInt(outPoints.value || 0, 10);

  ws.send(JSON.stringify({
    type: "scoreSubmit",
    points: pts
  }));

  scoreStatus.textContent = "Punkte gespeichert!";
  setTimeout(() => scorePanel.classList.add("hidden"), 1200);
};


// ===============================
// GAME PLAYER LIST
// ===============================
function renderGamePlayers() {
  const box = $("#playerList");
  box.innerHTML = "";

  for (const id in players) {
    const p = players[id];

    const row = document.createElement("div");
    row.className = "pRow";

    const av = p.avatarUrl
      ? `<img src="${p.avatarUrl}" class="avatarIcon">`
      : `<div class="avatarIcon" style="display:flex;align-items:center;justify-content:center;font-size:20px">${p.avatar || "😄"}</div>`;

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        ${av}
        <b>${p.name}</b>
      </div>
      <div>
        Phase ${p.phase} • ${p.score} Punkte
      </div>
    `;

    box.appendChild(row);
  }
}


// ===============================
// CHAT
// ===============================
chatSend.onclick = () => {
  const text = chatInput.value.trim();
  if (!text) return;

  ws.send(JSON.stringify({
    type:"chat",
    text
  }));

  chatInput.value = "";
};

chatInput.onkeypress = (e) => {
  if (e.key === "Enter") chatSend.onclick();
};
