// ============================
// WebSocket Verbindung
// ============================

const WS_URL = "wss://phase10-extreme.onrender.com";
let ws = null;
let myId = null;
let players = {}; // id -> {name, phase, score}

// ===== DOM =====
const $ = s => document.querySelector(s);

const statusTag   = $("#statusTag");
const selfNameTag = $("#selfNameTag");
const nameInput   = $("#nameInput");
const btnReconnect= $("#btnReconnect");

const num     = $("#num");
const titleEl = $("#title");
const ruleEl  = $("#rule");
const examplesEl = $("#examples");
const barfill = $("#barfill");
const hintEl  = $("#hint");
const jump    = $("#jump");

const btnPrev  = $("#btnPrev");
const btnNext  = $("#btnNext");
const btnReset = $("#btnReset");
const btnFinish= $("#btnFinish");

const scorePanel   = $("#scorePanel");
const finisherInfo = $("#finisherInfo");
const scoreInputs  = $("#scoreInputs");
const low   = $("#low");
const high  = $("#high");
const joker = $("#joker");
const outPoints = $("#outPoints");
const btnSubmit  = $("#submitScore");
const scoreStatus= $("#scoreStatus");

const playerList  = $("#playerList");

function setStatus(text, ok=false){
  statusTag.textContent = (ok ? "🟢 " : "🔴 ") + text;
}

// ============================
// Phasen-Definition
// ============================

const phases = [
  {id:1,title:'Phase 1',rule:'Zwei Paare + 1 Drilling.',examples:['z.B. (3,3) (9,9) (5,5,5)']},
  {id:2,title:'Phase 2',rule:'Viererfolge, jede Karte muss eine andere Farbe haben.',examples:['z.B. 4–5–6–7 mit vier verschiedenen Farben']},
  {id:3,title:'Phase 3',rule:'Zwei Drillinge: einer gerade Zahlen, der andere ungerade.',examples:['z.B. (2,2,2) und (7,7,7)']},
  {id:4,title:'Phase 4',rule:'Fünfer-Reihe; Kartennachbarn wechseln sich ab.',examples:['Muster 1–2–1–2–1 oder 5–4–5–4–5']},
  {id:5,title:'Phase 5',rule:'Sechs Karten derselben Farbe; Summe > 40.',examples:['z.B. 6× Blau, Gesamtsumme über 40']},
  {id:6,title:'Phase 6',rule:'Sechserfolge; Farben beliebig.',examples:['z.B. Grün, Rot, Gelb, Lila, Grün, Rot']},
  {id:7,title:'Phase 7',rule:'Ein Paar und zwei unterschiedliche Drillinge.',examples:['(K,K), (3,3,3), (8,8,8)']},
  {id:8,title:'Phase 8',rule:'Vier niedrige (1–6) und vier hohe Karten (7–12).',examples:['z.B. 1,2,3,6 & 8,9,10,12']},
  {id:9,title:'Phase 9',rule:'Fünf blaue Karten.',examples:['Beliebige Werte, Hauptsache 5× Blau']},
  {id:10,title:'Phase 10',rule:'Zwei Fünferfolgen.',examples:['2–3–4–5–6 und 8–9–10–11–12']},
];

function currentPhaseId(){
  if(!myId || !players[myId]) return 1;
  return Math.min(10, Math.max(1, players[myId].phase || 1));
}

function renderPhase(){
  const id = currentPhaseId();
  const ph = phases[id-1] || phases[0];
  num.textContent = ph.id;
  titleEl.textContent = ph.title;
  ruleEl.textContent  = ph.rule;
  examplesEl.innerHTML = (ph.examples||[]).map(x=>`<li>${x}</li>`).join("");
  barfill.style.width  = (ph.id/10*100) + "%";
  hintEl.textContent   = `${ph.id} / 10`;

  // Jump Chips
  jump.innerHTML = "";
  for(const p of phases){
    const b = document.createElement("button");
    b.className = "chip" + (p.id === id ? " active" : "");
    b.textContent = p.id;
    b.onclick = () => sendSetPhase(p.id);
    jump.appendChild(b);
  }
}

// ============================
// Spieler-liste rendern
// ============================

function renderPlayers(){
  playerList.innerHTML = "";
  Object.entries(players).forEach(([id, p])=>{
    const row = document.createElement("div");
    row.className = "rowItem";
    const me = (id === myId) ? "🟢" : "👤";
    row.innerHTML = `
      <div>${me} <b>${p.name}</b> ${id===myId?'<span class="muted">(Du)</span>':''}</div>
      <div>Phase ${p.phase} • Σ ${p.score}</div>
    `;
    playerList.appendChild(row);
  });

  if(myId && players[myId]){
    selfNameTag.textContent = players[myId].name;
    if(!nameInput.value) nameInput.value = players[myId].name;
  }

  renderPhase();
}

// ============================
// WebSocket verbinden
// ============================

function connect(){
  if(ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)){
    return;
  }
  setStatus("Verbinde...", false);
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    setStatus("Verbunden", true);
  };

  ws.onclose = () => {
    setStatus("Getrennt", false);
  };

  ws.onerror = () => {
    setStatus("Fehler – keine Verbindung", false);
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }

    if(msg.type === "welcome"){
      myId = msg.id;
      players = msg.players || {};
      if(players[myId] && !players[myId].name){
        players[myId].name = "Spieler";
      }
      if(!nameInput.value && players[myId]){
        nameInput.value = players[myId].name;
      }
      renderPlayers();
    }

    if(msg.type === "players"){
      players = msg.players || {};
      renderPlayers();
    }

    if(msg.type === "roundStart"){
      const isFinisher = (msg.finisher === myId);
      const name = msg.name || "Jemand";
      finisherInfo.textContent = isFinisher
        ? "Du hast diese Runde beendet. Du bekommst 0 Punkte."
        : `${name} hat diese Runde beendet. Trage deine Restkarten ein.`;
      scoreStatus.textContent = "";
      if(isFinisher){
        scoreInputs.style.display = "none";
        outPoints.value = "0";
      }else{
        scoreInputs.style.display = "";
        low.value = "0";
        high.value = "0";
        joker.value = "0";
        calcPoints();
      }
      scorePanel.classList.remove("hidden");
    }

    if(msg.type === "scoreUpdate"){
      if(players[msg.id]){
        players[msg.id].score = msg.total;
        renderPlayers();
      }
      scoreStatus.textContent = "Punkte aktualisiert.";
    }
  };
}

// ============================
// Senden-Helfer
// ============================

function send(msg){
  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify(msg));
  }
}

function sendSetPhase(newPhase){
  newPhase = Math.max(1, Math.min(10, newPhase));
  send({type:"setPhase", value:newPhase});
}

// ============================
// UI Events
// ============================

btnReconnect.onclick = () => connect();

nameInput.onchange = () => {
  const v = nameInput.value.trim() || "Spieler";
  send({type:"setName", value:v});
};

btnPrev.onclick = () => {
  const p = currentPhaseId();
  sendSetPhase(p-1);
};
btnNext.onclick = () => {
  const p = currentPhaseId();
  sendSetPhase(p+1);
};
btnReset.onclick = () => {
  sendSetPhase(1);
};

btnFinish.onclick = () => {
  send({type:"phaseDone"});
};

// Punkte berechnen: 0–9 => 5, 10–12 => 10, Joker => 20
function calcPoints(){
  const lowN   = Math.max(0, parseInt(low.value || "0",10));
  const highN  = Math.max(0, parseInt(high.value|| "0",10));
  const jokerN = Math.max(0, parseInt(joker.value||"0",10));
  const pts = lowN*5 + highN*10 + jokerN*20;
  outPoints.value = String(pts);
  return pts;
}
[low,high,joker].forEach(inp => inp.addEventListener("input", calcPoints));

btnSubmit.onclick = () => {
  if(!myId || !players[myId]) return;
  const isFinisher = finisherInfo.textContent.includes("Du hast diese Runde beendet");
  const points = isFinisher ? 0 : calcPoints();
  send({type:"scoreSubmit", points});
  scorePanel.classList.add("hidden");
  scoreStatus.textContent = "";
};

// Start
connect();
renderPhase();
