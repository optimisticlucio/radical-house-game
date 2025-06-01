const SERVER_ADDRESS = "127.0.0.1:8080"
const socket = new WebSocket("ws://" + SERVER_ADDRESS)
let currentScreen = "";

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
        serverDeadNotification();
        socket.close(); // optional: close if still hanging
    }
}, 3000); // 3 seconds — adjust as needed

socket.addEventListener("open", (event) => {
    connected = true;
    clearTimeout(handshakeTimeout);
    console.log("Connected to server! Attempting handshake.");

    if (performHandshake()) {
        console.log("Handshake successful!");
        displayMainMenu();
        socket.addEventListener("message", handleIncomingMessage);
    } else {
        console.log("Handshake failed!");
        serverDeadNotification();
    }
});

socket.addEventListener("close", (event) => {
    console.log("Websocket closed!");
    serverDeadNotification();
});

// ---------------- FRONTEND ------------------------

// Initializes a countdown script for all timers in the current DOM.
function setupTimers() {
    function timerDecrementation(timer) {
        let currentTime = parseInt(timer.innerHTML, 10);
        if (currentTime > 0) {
            timer.innerHTML = currentTime - 1;
        } 
    }

    let timers = document.getElementsByClassName("timer");
    console.log(timers);
    for (let timer of timers) {
        if (!timer.dataset.timer_set) {
            setInterval(() => timerDecrementation(timer), 1000);
            timer.dataset.timer_set = true;
        }
    }  
}

function serverDeadNotification() {
    currentScreen = "serverDead";
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("Host server unreachable :("));

    document.body.appendChild(mainDiv);
}

function displayMainMenu() {
    currentScreen = "mainMenu";
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("Host server reached :)"));

    let startGameDiv = document.createElement("div");
    startGameDiv.classList.add("testing-textbox");
    let startGameButton = document.createElement("button");
    startGameButton.onclick = requestNewGameCreation;
    startGameButton.innerText = "Start New Game";
    startGameDiv.appendChild(startGameButton);
    
    let joinGameDiv = document.createElement("div");
    joinGameDiv.classList.add("testing-textbox");
    let joinGameButton = document.createElement("button");
    joinGameButton.onclick = requestGameJoin;
    joinGameButton.innerText = "Join Game";
    joinGameDiv.appendChild(joinGameButton);

    // TODO: Setup main menu and buttons.

    document.body.append(mainDiv, startGameDiv, joinGameDiv);
}

// ----------- SERVER COMMUNICATION --------------------

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
        "type": messageType
    };
    if (messageContents !== null) {
        request["contents"] = JSON.stringify(messageContents)
    }

    socket.send(JSON.stringify(request));
}

// Ran whenever the websocket sends a message.
function handleIncomingMessage(event) {
    
}


function requestNewGameCreation() {
    sendMessageToSocket("CreateGame");
}

function requestGameJoin(gameCode) {
    let messageData = {
        "gameCode": gameCode
    };

    sendMessageToSocket("ConnectToGame", messageData);
}