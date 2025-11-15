{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // ===============================\
// WebSocket Server URL\
// ===============================\
// Wenn dein Render/Server sp\'e4ter l\'e4uft: hier ersetzen!\
let ws = new WebSocket("wss://CHANGE_ME.yourserver.com");\
// Beispiel sp\'e4ter: "wss://ws.deinedomain.de"\
// ===============================\
\
let myId = null;\
let players = \{\};\
\
const nameInput = document.getElementById("nameInput");\
const myPhaseBox = document.getElementById("myPhase");\
const phasePrev = document.getElementById("phasePrev");\
const phaseNext = document.getElementById("phaseNext");\
const finishBtn = document.getElementById("finishBtn");\
const playerList = document.getElementById("playerList");\
\
const scorePanel = document.getElementById("scorePanel");\
const finisherInfo = document.getElementById("finisherInfo");\
const low = document.getElementById("low");\
const high = document.getElementById("high");\
const joker = document.getElementById("joker");\
const submitScore = document.getElementById("submitScore");\
\
// Render player list\
function renderPlayers() \{\
  playerList.innerHTML = "";\
  Object.entries(players).forEach(([id, p]) => \{\
    let div = document.createElement("div");\
    div.innerHTML = `$\{id === myId ? "\uc0\u55357 \u57314 " : "\u55357 \u56420 "\} <b>$\{p.name\}</b>\
                      \'96 Phase $\{p.phase\}\
                      \'96 \uc0\u931  $\{p.score\}`;\
    playerList.appendChild(div);\
  \});\
\}\
\
// WebSocket events\
ws.onmessage = (ev) => \{\
  const msg = JSON.parse(ev.data);\
\
  if (msg.type === "welcome") \{\
    myId = msg.id;\
    players = msg.players;\
    nameInput.value = players[myId].name;\
    myPhaseBox.textContent = players[myId].phase;\
    renderPlayers();\
  \}\
\
  if (msg.type === "players") \{\
    players = msg.players;\
    renderPlayers();\
  \}\
\
  if (msg.type === "roundStart") \{\
    scorePanel.classList.remove("hidden");\
    finisherInfo.textContent = `$\{msg.name\} hat die Phase beendet!`;\
  \}\
\
  if (msg.type === "scoreUpdate") \{\
    players[msg.id].score = msg.total;\
    renderPlayers();\
  \}\
\};\
\
// Name \'e4ndern\
nameInput.onchange = () => \{\
  ws.send(JSON.stringify(\{ type: "setName", value: nameInput.value \}));\
\};\
\
// Phase \'e4ndern\
phasePrev.onclick = () => \{\
  let p = Math.max(1, players[myId].phase - 1);\
  ws.send(JSON.stringify(\{ type: "setPhase", value: p \}));\
\};\
\
phaseNext.onclick = () => \{\
  let p = Math.min(10, players[myId].phase + 1);\
  ws.send(JSON.stringify(\{ type: "setPhase", value: p \}));\
\};\
\
// Phase beendet\
finishBtn.onclick = () => \{\
  ws.send(JSON.stringify(\{ type: "phaseDone" \}));\
\};\
\
// Punkte abschicken\
submitScore.onclick = () => \{\
  let lowN = parseInt(low.value || 0, 10);\
  let highN = parseInt(high.value || 0, 10);\
  let jokerN = parseInt(joker.value || 0, 10);\
\
  let points = lowN * 5 + highN * 10 + jokerN * 20;\
\
  ws.send(\
    JSON.stringify(\{\
      type: "scoreSubmit",\
      points,\
    \})\
  );\
\
  low.value = "0";\
  high.value = "0";\
  joker.value = "0";\
\
  scorePanel.classList.add("hidden");\
\};}