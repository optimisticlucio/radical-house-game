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

// ----------- SWITCH SCREENS ---------------

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

function displayHostWaitMenu(roomCode = "MISSING", amountOfPeopleInRoom = 0) {
    currentScreen = "hostWaitMenu";
    document.body.innerHTML = '';

    let roomCodeDiv = document.createElement("div");
    roomCodeDiv.classList.add("testing-textbox");
    let roomCodeText = document.createElement("h2");
    roomCodeText.innerText = roomCode;
    roomCodeDiv.appendChild(document.createTextNode("ROOM CODE:"));
    roomCodeDiv.appendChild(roomCodeText);

    let numberOfPeopleDiv = document.createElement("div");
    numberOfPeopleDiv.classList.add("testing-textbox");
    numberOfPeopleDiv.appendChild(document.createTextNode("Number of people in room: "));
    let numberOfPeopleSpan = document.createElement("span");
    numberOfPeopleSpan.id = "numOfPeople";
    numberOfPeopleDiv.appendChild(numberOfPeopleSpan);

    updateAmountOfPeopleInWaitingRoom(amountOfPeopleInRoom);

    let gameStartButton = document.createElement("button");
    gameStartButton.innerText = "Start Game!";
    //TODO: Connect to function that sends game start request

    document.body.appendChild(roomCodeDiv, numberOfPeopleDiv, gameStartButton);
}

function displayPlayerWaitMenu(roomCode = "MISSING", userNumber = -1) {
    currentScreen = "waitMenu";
    document.body.innerHTML = '';

    let roomCodeDiv = document.createElement("div");
    roomCodeDiv.classList.add("testing-textbox");
    let roomCodeText = document.createElement("h2");
    roomCodeText.innerText = roomCode;
    roomCodeDiv.appendChild(document.createTextNode("Connected successfully to room number:"));
    roomCodeDiv.appendChild(roomCodeText);

    let userNumberDiv = document.createElement("div");
    userNumberDiv.classList.add("testing-textbox");
    userNumberDiv.appendChild(document.createTextNode("Your room code: " + userNumber));

    let pleaseWaitDiv = document.createElement("div");
    pleaseWaitDiv.classList.add("testing-textbox");
    pleaseWaitDiv.innerHTML = "Please wait for the game to be started by the host!";

    document.body.appendChild(roomCodeDiv, userNumberDiv, pleaseWaitDiv);
}

// ----------- UPDATE VISUALS ----------------------

function updateAmountOfPeopleInWaitingRoom(number = -1) {
    document.getElementById("numOfPeople").innerText = number;
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

function requestNewGameCreation() {
    sendMessageToSocket("CreateGame");
}

function requestGameJoin(gameCode) {
    let messageData = {
        "gameCode": gameCode
    };

    sendMessageToSocket("ConnectToGame", messageData);
}

// ---------- HANDLE INCOMING MESSAGES -----------------

// Ran whenever the websocket sends a message.
function handleIncomingMessage(event) {
    let parsedData = JSON.parse(event.data);

    if (parsedData["type"] === "StanceSnapshot") {
        // Snapshot! Let's refresh the window!
        handleSnapshotMessage(parsedData);
    }

    if (parsedData["type"] === "InvalidRequest") {
        console.log("[ERROR!] Sent malformed request! " + parsedData);
    }

    switch (currentScreen) {
        case "mainMenu":
            mainMenuIncomingMessages(parsedData);
            break;
        
        case "hostWaitMenu":
            hostWaitMenuIncomingMessages(parsedData);
            break;

        default:
            console.log("[ERROR!] Current screen is set to: " + currentScreen +". Not a valid screen! Incoming message discarded as a result.");
    }
}

// Starts a new screen depending on what happened.
function handleSnapshotMessage(data) {
    if (!data["content"]) {
        console.log("[ERROR!] Snapshot missing content: " + data);
        return;
    }
    switch(data["content"]["phase"]) {
        case "hostWaitingRoom":
            displayHostWaitMenu(data["content"]["code"], data["content"]["playerAmount"]);
            break;
        
        case "waitingRoom":
            displayPlayerWaitMenu(data["content"]["code"], data["content"]["playerNumber"]);
            break;

        default: 
            console.log("[ERROR!] Invalid snapshot phase: " + data);
    }
}

function mainMenuIncomingMessages(data) {
    switch (data["type"]) {
        default:
            console.log("[ERROR!] Invalid message type recieved for main menu: " + data);
    }
}

function hostWaitMenuIncomingMessages(data) {
    switch (data["type"]) {
        case "GameUpdate":
            switch(data["content"]["event"]) {
                case "playerJoin":
                    updateAmountOfPeopleInWaitingRoom(data["content"]["playerNum"]);
                    break;

                default:
                    console.log("[ERROR!] Recieved an invalid event for game data! " + data);
                    break;
            }
            break;


        default:
            console.log("[ERROR!] Invalid message type recieved for host wait menu: " + data);
    }
}


