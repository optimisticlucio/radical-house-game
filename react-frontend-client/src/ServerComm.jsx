import { SwitchWindows, SCREENS } from "./App.jsx";

const SERVER_ADDRESS = "radical-house-game.onrender.com";
let socket;
let currentScreen = "";

export function initializeConnection() {
    if (socket) return;
    socket = new WebSocket("wss://" + SERVER_ADDRESS);

    // Log incoming messages
    socket.addEventListener("message", (event) => {
    console.log("[SERVER MESSAGE] " + event.data);
    });

    // Flag to detect if we connected successfully
    let connected = false;

    // TIMEOUT fallback: call this if connection doesn't open in time
    const handshakeTimeout = setTimeout(() => {
    if (!connected) {
        console.log("Handshake timed out — server likely dead.");
        SwitchWindows(SCREENS.DISCONNECTED);
        socket.close(); // optional: close if still hanging
    }
    }, 3000); // 3 seconds — adjust as needed

    socket.addEventListener("open", (event) => {
    connected = true;
    clearTimeout(handshakeTimeout);
    console.log("Connected to server! Attempting handshake.");

    if (performHandshake()) {
        console.log("Handshake successful!");
        SwitchWindows(SCREENS.MAIN_MENU);
        socket.addEventListener("message", handleIncomingMessage);
    } else {
        console.log("Handshake failed!");
        SwitchWindows(SCREENS.DISCONNECTED);
    }
    });

    socket.addEventListener("close", (event) => {
    console.log("Websocket closed!");
    SwitchWindows(SCREENS.DISCONNECTED);
    });
}

function performHandshake() {
  return new Promise((resolve) => {
    function handleMessage(event) {
      if (event.data === "WELCOME") {
        resolve(true);
      } else {
        resolve(false);
      }
      // Remove this handler after the first message is processed
      socket.removeEventListener("message", handleMessage);
    }

    socket.addEventListener("message", handleMessage);
    socket.send("HELLO GAME");
  });
}

// Given a message type and optional contents, sends it to the server.
function sendMessageToSocket(messageType, messageContents = null) {
  let request = {
    type: messageType,
  };
  if (messageContents !== null) {
    request["content"] = messageContents;
  }

  socket.send(JSON.stringify(request));
  console.log("[SENT MESSAGE] " + JSON.stringify(request));
}

export function requestNewGameCreation() {
  sendMessageToSocket("CreateGame");
}

export function requestGameJoin(gameCode) {
  let messageData = {
    gameCode: gameCode,
  };

  sendMessageToSocket("ConnectToGame", messageData);
}

export function requestGameStart() {
  sendMessageToSocket("GameAction", {
    action: "startGame",
  });
}

function sendDebaterStance(stance) {
  sendMessageToSocket("GameAction", {
    action: "inputStance",
    stance: stance,
  });
}

function sendDebaterPreference(debaterNumber) {
  sendMessageToSocket("GameAction", {
    action: "inputSupport",
    debater: debaterNumber,
  });
}

// ---------- HANDLE INCOMING MESSAGES -----------------

// Ran whenever the websocket sends a message.
function handleIncomingMessage(event) {
  if (event.data[0] != "{") {
    console.log("Recieved non-JSON message. " + event.data);
    return;
  }
  let parsedData = JSON.parse(event.data);

  if (parsedData["type"] === "StanceSnapshot") {
    // Snapshot! Let's refresh the window!
    handleSnapshotMessage(parsedData);
    return;
  }

  if (parsedData["type"] === "InvalidRequest") {
    console.log(
      "[ERROR!] Sent malformed request! " + JSON.stringify(parsedData),
    );
    return;
  }

  switch (currentScreen) {
    case "mainMenu":
      mainMenuIncomingMessages(parsedData);
      break;

    case "hostWaitMenu":
      hostWaitMenuIncomingMessages(parsedData);
      break;

    case "hostDebateScreen":
      hostDebateScreenIncomingMessages(parsedData);
      break;
    default:
      console.log(
        "[ERROR!] Current screen is set to: " +
          currentScreen +
          ". Not a valid screen! Incoming message discarded as a result.",
      );
  }
}

// Starts a new screen depending on what happened.
function handleSnapshotMessage(data) {
  if (!data["content"]) {
    console.log("[ERROR!] Snapshot missing content: " + JSON.stringify(data));
    return;
  }
  switch (data["content"]["phase"]) {
    case "hostWaitingRoom":
      SwitchWindows(SCREENS.HOST_PREGAME_SCREEN, data["content"]);
      break;

    case "waitingRoom":
      SwitchWindows(SCREENS.PLAYER_PREGAME_SCREEN, data["content"]);
      break;

    case "stanceTaking":
      if (data["content"]["type"] == "host") {
        SwitchWindows(SCREENS.HOST_WAITING_ON_DEBATERS, data["content"]);
      } else if (data["content"]["type"] == "debaterStanceMissing") {
        SwitchWindows(SCREENS.DEBATER_INPUT_ANSWER, data["content"]);
      } else if (data["content"]["type"] == "debaterStanceGiven") {
        SwitchWindows(SCREENS.PLAYER_WAITING_ON_DEBATERS, data["content"]);
      } else {
        // type should be "pickingPlayer"
        SwitchWindows(SCREENS.PLAYER_WAITING_ON_DEBATERS, data["content"]);
      }
      break;

    case "discussion":
      if (data["content"]["type"] == "host") {
        const debaters = data["content"]["debaters"].split(",");

        let debaterInfo = [];
        for (let debaterNumber of debaters) {
          debaterInfo.push({
            number: debaterNumber,
            position: data["content"][`position${debaterNumber}`],
          });
        }

        SwitchWindows(SCREENS.HOST_DEBATE, data["content"]);
      } else if (data["content"]["type"] == "debater") {
        SwitchWindows(SCREENS.DEBATER_DEBATE, data["content"]);
      } else {
        // type should be "pickingPlayer"
        SwitchWindows(SCREENS.PLAYER_DEBATE, data["content"]);
      }
      break;

    case "gameEnd":
      if (data["content"]["type"] == "host") {
        SwitchWindows(SCREENS.HOST_END, data["content"]);
      } else {
        SwitchWindows(SCREENS.PLAYER_END, data["content"]);
      }
      break;

    default:
      console.log("[ERROR!] Invalid snapshot phase: " + JSON.stringify(data));
  }
}

function mainMenuIncomingMessages(data) {
  switch (data["type"]) {
    default:
      console.log(
        "[ERROR!] Invalid message type recieved for main menu: " +
          JSON.stringify(data),
      );
  }
}

function hostWaitMenuIncomingMessages(data) {
  switch (data["type"]) {
    case "GameUpdate":
      switch (data["content"]["event"]) {
        case "playerLeft":
        case "playerJoin":
          updateAmountOfPeopleInWaitingRoom(data["content"]["totalPlayers"]);
          break;

        default:
          console.log(
            "[ERROR!] Recieved an invalid event for game data! " +
              JSON.stringify(data),
          );
          break;
      }
      break;

    default:
      console.log(
        "[ERROR!] Invalid message type recieved for host wait menu: " +
          JSON.stringify(data),
      );
  }
}

function hostDebateScreenIncomingMessages(data) {
  switch (data["type"]) {
    case "GameUpdate":
      switch (data["content"]["event"]) {
        case "movePlayerToPodium":
          movePlayerToPodium(
            data["content"]["playerToMove"],
            data["content"]["targetPodium"],
          );
          break;

        default:
          console.log(
            "[ERROR!] Recieved an invalid event for game data! " +
              JSON.stringify(data),
          );
          break;
      }
      break;

    default:
      console.log(
        "[ERROR!] Invalid message type recieved for main menu: " +
          JSON.stringify(data),
      );
  }
}
