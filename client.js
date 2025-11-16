// client.js

const WS_URL = "wss://phase10-extreme.onrender.com";
let ws = null;

let myId = null;
let myRoomId = null;
let hostId = null;
let players = {}; // id -> {name, avatar, phase, score}
let currentScreen = "start";
let myAvatar = "🐶";

const AVATARS = [
  "🐶","🐱","🐸","🐵","🐼","🦊","🐯","🐰","🐙","🐧","🦁","🐢",
  "😄","😂","🙂","😎","🤓","😡","😱","😴","😍","🤯","😇","🤠"
];

// ------ DOM ------
const $ = s => document.querySelector(s);

// Header
const statusTag     = $("#statusTag");
const roomTag       = $("#roomTag");
const selfNameTag   = $("#selfNameTag");
const btnReconnect  = $("#btnReconnect");

// Screens
const screenStart = $("#screenStart");
const screenLobby = $("#screenLobby");
const screenGame  = $("#screenGame");

// Start
const startName      = $("#startName");
const avatarSelected = $("#avatarSelected");
const avatarGrid     = $("#avatarGrid");
const btnCreateRoom  = $("#btnCreateRoom");
const joinCode       = $("#joinCode");
const btnJoinRoom    = $("#btnJoinRoom");
const startError     = $("#startError");

// Lobby
const lobbyRoomCode = $("#lobbyRoomCode");
const lobbyRoleHint = $("#lobbyRoleHint");
const lobbyPlayers  = $("#lobbyPlayers");
const btnLeaveLobby = $("#btnLeaveLobby");
const btnLobbyStart = $("#btnLobbyStart");

// Game – Phase
const num       = $("#num");
const titleEl   = $("#title");
const ruleEl    = $("#rule");
const examplesEl= $("#examples");
const barfill   = $("#barfill");
const hintEl    = $("#hint");
const jump      = $("#jump");
const btnPrev   = $("#btnPrev");
const btnNext   = $("#btnNext");
const btnReset  = $("#btnReset");
const btnFinish = $("#btnFinish");

// Game – Score
const scorePanel   = $("#scorePanel");
const finisherInfo = $("#finisherInfo");
const scoreInputs  = $("#scoreInputs");
const low    = $("#low");
const high   = $("#high");
const joker  = $("#joker");
const outPoints = $("#outPoints");
const btnSubmit  = $("#submitScore");
const scoreStatus= $("#scoreStatus");

// Players & Chat
const playerList = $("#playerList");
const chatBox    = $("#chatBox");
const chatInput  = $("#chatInput");
const chatSend   = $("#chatSend");

// ------ Helpers ------

function setStatus(text, ok=false){
  statusTag.textContent = (ok ? "🟢 " : "🔴 ") + text;
}

function showScreen(name){
  currentScreen = name;
  screenStart.classList.add("hidden");
  screenLobby.classList.add("hidden");
  screenGame .classList.add("hidden");
  if(name==="start") screenStart.classList.remove("hidden");
  if(name==="lobby") screenLobby.classList.remove("hidden");
  if(name==="game")  screenGame .classList.remove("hidden");
}

function currentPhaseId(){
  if(!myId || !players[myId]) return 1;
  const p = players[myId].phase || 1;
  return Math.max(1, Math.min(10, p));
}

// ------ Phasen ------
const phases = [
  {id:1,title:"Phase 1",rule:"Zwei Paare + 1 Drilling.",examples:["z.B. (3,3) (9,9) (5,5,5)"]},
  {id:2,title:"Phase 2",rule:"Viererfolge, jede Karte muss eine andere Farbe haben.",examples:["z.B. 4–5–6–7 mit vier verschiedenen Farben"]},
  {id:3,title:"Phase 3",rule:"Zwei Drillinge: einer gerade Zahlen, der andere ungerade.",examples:["z.B. (2,2,2) und (7,7,7)"]},
  {id:4,title:"Phase 4",rule:"Fünfer-Reihe; Kartennachbarn wechseln sich ab.",examples:["Muster 1–2–1–2–1 oder 5–4–5–4–5"]},
  {id:5,title:"Phase 5",rule:"Sechs Karten derselben Farbe; Summe > 40.",examples:["z.B. 6× Blau, Gesamtsumme über 40"]},
  {id:6,title:"Phase 6",rule:"Sechserfolge; Farben beliebig.",examples:["z.B. Grün, Rot, Gelb, Lila, Grün, Rot"]},
  {id:7,title:"Phase 7",rule:"Ein Paar und zwei unterschiedliche Drillinge.",examples:["(K,K), (3,3,3), (8,8,8)"]},
  {id:8,title:"Phase 8",rule:"Vier niedrige (1–6) und vier hohe Karten (7–12).",examples:["z.B. 1,2,3,6 & 8,9,10,12"]},
  {id:9,title:"Phase 9",rule:"Fünf blaue Karten.",examples:["Beliebige Werte, Hauptsache 5× Blau"]},
  {id:10,title:"Phase 10",rule:"Zwei Fünferfolgen.",examples:["2–3–4–5–6 und 8–9–10–11–12"]},
];

function renderPhase(){
  const id = currentPhaseId();
  const ph = phases[id-1] || phases[0];
  num.textContent   = ph.id;
  titleEl.textContent = ph.title;
  ruleEl.textContent  = ph.rule;
  examplesEl.innerHTML = (ph.examples||[]).map(x=>`<li>${x}</li>`).join("");
  barfill.style.width  = (ph.id/10*100) + "%";
  hintEl.textContent   = `${ph.id} / 10`;

  jump.innerHTML = "";
  phases.forEach(p=>{
    const b = document.createElement("button");
    b.className = "chip" + (p.id===id ? " active" : "");
    b.textContent = p.id;
    b.onclick = ()=> send({type:"setPhase", value:p.id});
    jump.appendChild(b);
  });
}

// ------ Players Rendering ------

function renderPlayers(){
  lobbyPlayers.innerHTML = "";
  playerList.innerHTML   = "";

  Object.entries(players).forEach(([id,p])=>{
    const isMe   = id === myId;
    const isHost = id === hostId;
    const avatar = p.avatar || "🐶";
    const label  = `${avatar} ${p.name||"Spieler"}${isMe?" (Du)":""}${isHost?" [Host]":""}`;

    const lobRow = document.createElement("div");
    lobRow.className="rowItem";
    lobRow.innerHTML = `<div>${label}</div>`;
    lobbyPlayers.appendChild(lobRow);

    const gameRow = document.createElement("div");
    gameRow.className="rowItem";
    gameRow.innerHTML = `<div>${label}</div><div>Phase ${p.phase||1} • Σ ${p.score||0}</div>`;
    playerList.appendChild(gameRow);
  });

  const me = players[myId];
  selfNameTag.textContent = me ? (me.name||"Spieler") : "—";
  roomTag.textContent = myRoomId || "—";

  renderPhase();
}

// ------ Chat ------

function addChatMessage(name, text, isSystem=false){
  const div = document.createElement("div");
  div.className = "chatMsg";
  if(isSystem){
    div.innerHTML = `<span class="chatSystem">${text}</span>`;
  } else {
    div.innerHTML = `<span class="chatName">${name}:</span>${text}`;
  }
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendChat(){
  const txt = (chatInput.value||"").trim();
  if(!txt) return;
  chatInput.value = "";
  send({type:"chat", text:txt});
}

// ------ Punkte ------
function calcPoints(){
  const lowN   = Math.max(0, parseInt(low.value   || "0",10));
  const highN  = Math.max(0, parseInt(high.value  || "0",10));
  const jokerN = Math.max(0, parseInt(joker.value || "0",10));
  const pts = lowN*5 + highN*10 + jokerN*20;
  outPoints.value = String(pts);
  return pts;
}

// ------ WebSocket ------

function connect(){
  if(ws && (ws.readyState===WebSocket.OPEN || ws.readyState===WebSocket.CONNECTING)) return;
  setStatus("Verbinde...", false);
  ws = new WebSocket(WS_URL);

  ws.onopen = ()=> setStatus("Verbunden – noch keinem Raum beigetreten", true);
  ws.onclose= ()=> setStatus("Getrennt", false);
  ws.onerror= ()=> setStatus("Fehler – keine Verbindung", false);

  ws.onmessage = ev=>{
    let msg;
    try{ msg = JSON.parse(ev.data); }catch{return;}

    // Raum erstellt
    if(msg.type==="roomCreated"){
      myId     = msg.playerId;
      myRoomId = msg.roomId;
      hostId   = msg.hostId;
      players  = msg.players || {};
      lobbyRoomCode.textContent = myRoomId;
      lobbyRoleHint.textContent = "Du bist der Host dieses Raums.";
      btnLobbyStart.disabled = false;
      showScreen("lobby");
      renderPlayers();
      addChatMessage("System",`Raum ${myRoomId} erstellt.`,true);
      return;
    }

    // Raum beigetreten
    if(msg.type==="roomJoined"){
      myId     = msg.playerId;
      myRoomId = msg.roomId;
      hostId   = msg.hostId;
      players  = msg.players || {};
      lobbyRoomCode.textContent = myRoomId;
      lobbyRoleHint.textContent = hostId===myId ? "Du bist der Host." : "Du bist Spieler in diesem Raum.";
      btnLobbyStart.disabled = hostId!==myId;
      showScreen("lobby");
      renderPlayers();
      addChatMessage("System",`Du bist Raum ${myRoomId} beigetreten.`,true);
      return;
    }

    if(msg.type==="roomError"){
      startError.textContent = msg.message || "Unbekannter Fehler.";
      return;
    }

    // Spieler-Update
    if(msg.type==="players"){
      hostId  = msg.hostId || hostId;
      players = msg.players || {};
      renderPlayers();
      if(currentScreen==="lobby"){
        lobbyRoleHint.textContent = hostId===myId ? "Du bist der Host." : "Du bist Spieler in diesem Raum.";
        btnLobbyStart.disabled = hostId!==myId;
      }
      return;
    }

    // Spielstart
    if(msg.type==="roomStart"){
      showScreen("game");
      renderPlayers();
      addChatMessage("System","Das Spiel wurde gestartet.",true);
      return;
    }

    // Runde startet (Phase beendet)
    if(msg.type==="roundStart"){
      const isFinisher = msg.finisher === myId;
      const pname = players[msg.finisher]?.name || msg.name || "Jemand";
      finisherInfo.textContent = isFinisher
        ? "Du hast diese Runde beendet. Du bekommst 0 Punkte."
        : `${pname} hat diese Runde beendet. Trage deine Restkarten ein.`;

      if(isFinisher){
        scoreInputs.style.display = "none";
        outPoints.value = "0";
      } else {
        scoreInputs.style.display = "";
        low.value="0"; high.value="0"; joker.value="0";
        calcPoints();
      }
      scoreStatus.textContent = "";
      scorePanel.classList.remove("hidden");
      return;
    }

    // Score-Update
    if(msg.type==="scoreUpdate"){
      if(players[msg.id]){
        players[msg.id].score = msg.total;
        renderPlayers();
      }
      scoreStatus.textContent = "Punkte aktualisiert.";
      return;
    }

    // Chat
    if(msg.type==="chat"){
      const p = players[msg.id];
      const name = p ? `${p.avatar||""} ${p.name||"Spieler"}` : "Spieler";
      addChatMessage(name, msg.text);
      return;
    }
  };
}

function send(obj){
  if(ws && ws.readyState===WebSocket.OPEN){
    ws.send(JSON.stringify(obj));
  } else {
    setStatus("Nicht verbunden – neu verbinden.", false);
  }
}

// ------ Avatar-Grid ------

function renderAvatarGrid(){
  avatarGrid.innerHTML = "";
  AVATARS.forEach(em=>{
    const btn = document.createElement("button");
    btn.type="button";
    btn.className = "avatarChip" + (em===myAvatar ? " active":"");
    btn.textContent = em;
    btn.onclick = ()=>{
      myAvatar = em;
      avatarSelected.textContent = em;
      document.querySelectorAll(".avatarChip").forEach(c=>c.classList.remove("active"));
      btn.classList.add("active");
    };
    avatarGrid.appendChild(btn);
  });
}

// ------ UI Events ------

// Raum erstellen
btnCreateRoom.onclick = ()=>{
  startError.textContent = "";
  const name = (startName.value||"").trim() || "Spieler";
  connect();
  send({type:"createRoom", name, avatar:myAvatar});
};

// Raum beitreten
btnJoinRoom.onclick = ()=>{
  startError.textContent = "";
  const name = (startName.value||"").trim() || "Spieler";
  const code = (joinCode.value||"").trim();
  if(!code){
    startError.textContent = "Bitte einen Raumcode eingeben.";
    return;
  }
  connect();
  send({type:"joinRoom", roomId:code, name, avatar:myAvatar});
};

// Name-Änderung
startName.onchange = ()=>{
  const name = (startName.value||"").trim() || "Spieler";
  send({type:"setName", value:name});
};

// Reconnect
btnReconnect.onclick = ()=> connect();

// Lobby verlassen
btnLeaveLobby.onclick = ()=> {
  location.reload();
};

// Lobby: Spiel starten
btnLobbyStart.onclick = ()=>{
  if(hostId !== myId) return;
  send({type:"startGame"});
};

// Phase Buttons
btnPrev.onclick  = ()=> send({type:"setPhase", value: currentPhaseId()-1});
btnNext.onclick  = ()=> send({type:"setPhase", value: currentPhaseId()+1});
btnReset.onclick = ()=> send({type:"setPhase", value:1});

// Phase beendet
btnFinish.onclick = ()=> send({type:"phaseDone"});

// Score Inputs
[low,high,joker].forEach(el=>el.addEventListener("input", calcPoints));

// Score abschicken
btnSubmit.onclick = ()=>{
  if(!myId || !players[myId]) return;
  const isFinisher = finisherInfo.textContent.includes("Du hast diese Runde beendet");
  const pts = isFinisher ? 0 : calcPoints();
  send({type:"scoreSubmit", points:pts});
  scorePanel.classList.add("hidden");
  scoreStatus.textContent = "";
};

// Chat
chatSend.onclick = sendChat;
chatInput.addEventListener("keydown", e=>{
  if(e.key==="Enter") sendChat();
});

// ------ Init ------
renderAvatarGrid();
showScreen("start");
renderPhase();
connect();
