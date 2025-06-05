const SERVER_ADDRESS = "radical-house-game.onrender.com"
const socket = new WebSocket("wss://" + SERVER_ADDRESS)
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
function activateTimers() {
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

// Returns an img that displays the icon of a certain player
function getPlayerImg(playerNumber) {
    let playerImg = document.createElement("img");
    playerImg.src = "./assets/img/player-icons/" + playerNumber + ".png";
    playerImg.classList.add("character-icon");

    return playerImg;
}

// Returns a timer with a certain amount of seconds left in it. You need to run activateTimers after!
function getTimer(seconds) {
    let newTimer = document.createElement("div");
    newTimer.classList.add("testing-textbox");
    newTimer.classList.add("timer");
    newTimer.innerHTML = seconds;
    return newTimer;
}

// ----------- SWITCH SCREENS ---------------

function serverDeadNotification() {
    currentScreen = "serverDead";
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("איבדנו חיבור לשרת :("));

    document.body.appendChild(mainDiv);
}

function displayMainMenu() {
    currentScreen = "mainMenu";
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("התחברנו לשרת :)"));

    let startGameDiv = document.createElement("div");
    startGameDiv.classList.add("testing-textbox");
    let startGameButton = document.createElement("button");
    startGameButton.onclick = requestNewGameCreation;
    startGameButton.innerText = "התחל משחק חדש";
    startGameDiv.appendChild(startGameButton);
    
    let joinGameDiv = document.createElement("div");
    joinGameDiv.classList.add("testing-textbox");
    let joinGameTextInput = document.createElement("input");
    joinGameTextInput.type = "text";
    joinGameTextInput.placeholder = "הכניסו קוד לחדר.."
    // TODO: Validate that the inputted room code is a valid one?
    joinGameDiv.appendChild(joinGameTextInput);
    let joinGameButton = document.createElement("button");
    joinGameButton.onclick = (() => requestGameJoin(joinGameTextInput.value));
    joinGameButton.innerText = "התחבר למשחק קיים";
    joinGameDiv.appendChild(joinGameButton);

    document.body.append(mainDiv, startGameDiv, joinGameDiv);
}

function displayHostWaitMenu(roomCode = "MISSING", amountOfPeopleInRoom = 0) {
    currentScreen = "hostWaitMenu";
    document.body.innerHTML = '';

    let roomCodeDiv = document.createElement("div");
    roomCodeDiv.classList.add("testing-textbox");
    let roomCodeText = document.createElement("h2");
    roomCodeText.innerText = roomCode;
    roomCodeDiv.appendChild(document.createTextNode("קוד חדר:"));
    roomCodeDiv.appendChild(roomCodeText);

    let numberOfPeopleDiv = document.createElement("div");
    numberOfPeopleDiv.classList.add("testing-textbox");
    numberOfPeopleDiv.appendChild(document.createTextNode("מספר האנשים בחדר: "));
    let numberOfPeopleSpan = document.createElement("span");
    numberOfPeopleSpan.id = "numOfPeople";
    numberOfPeopleDiv.appendChild(numberOfPeopleSpan);

    let gameStartButton = document.createElement("button");
    gameStartButton.innerText = "התחילו את המשחק!";
    gameStartButton.onclick = requestGameStart;

    document.body.append(roomCodeDiv, numberOfPeopleDiv, gameStartButton);
    updateAmountOfPeopleInWaitingRoom(amountOfPeopleInRoom);
}

function displayPlayerWaitMenu(roomCode = "MISSING", userNumber = -1) {
    currentScreen = "waitMenu";
    document.body.innerHTML = '';

    let roomCodeDiv = document.createElement("div");
    roomCodeDiv.classList.add("testing-textbox");
    let roomCodeText = document.createElement("h2");
    roomCodeText.innerText = roomCode;
    roomCodeDiv.appendChild(document.createTextNode("התחברנו בהצלחה לחדר מספר:"));
    roomCodeDiv.appendChild(roomCodeText);

    let qrCodeDiv = document.createElement("div");
    let qrCodeImg = document.createElement("img");
    qrCodeImg.src = "/assets/img/qr-code.jpg";
    qrCodeDiv.append(document.createTextNode("סרקו אותי בשביל לשחק!"), qrCodeImg);

    let userNumberDiv = document.createElement("div");
    userNumberDiv.classList.add("testing-textbox");
    userNumberDiv.appendChild(document.createTextNode("מספר השחקן שלך: " + userNumber + "\n"));
    userNumberDiv.appendChild(document.createElement("br"));
    userNumberDiv.appendChild(document.createElement("br"));
    let playerImg = getPlayerImg(userNumber);
    userNumberDiv.appendChild(playerImg);   

    let pleaseWaitDiv = document.createElement("div");
    pleaseWaitDiv.classList.add("testing-textbox");
    pleaseWaitDiv.innerHTML = "אנא חכו שהמארח יתחיל את המשחק!";

    document.body.append(roomCodeDiv, qrCodeDiv, userNumberDiv, pleaseWaitDiv);
}

function displayHostStanceTakingScreen(debaterNumbers, roundLength = null) {
    currentScreen = "hostStanceTakingScreen";
    document.body.innerHTML = '';

    if (roundLength) {
        document.body.append(getTimer(roundLength));
        activateTimers();
    }

    let playerDiv = document.createElement("div");
    playerDiv.classList.add("testing-textbox");
    let playerIcons = debaterNumbers.map(getPlayerImg);
    playerDiv.append(...playerIcons);
    let playerAnnouncement = document.createElement("h2");
    playerAnnouncement.innerHTML = "השחקנים הללו חושבים עדיין...";
    playerDiv.append(playerAnnouncement);

    let pleaseWaitDiv = document.createElement("div");
    pleaseWaitDiv.classList.add("testing-textbox");
    pleaseWaitDiv.innerHTML = "בבקשה תחכו שהשחקנים יחשבו על תשובות מעניינות. בנתיים, אפשר לנוח!";

    document.body.append(playerDiv, pleaseWaitDiv);
}

function displayPlayerWaitStanceScreen() {
    currentScreen = "playerWaitStanceScreen";
    document.body.innerHTML = '';

    let pleaseWaitDiv = document.createElement("div");
    pleaseWaitDiv.classList.add("testing-textbox");
    pleaseWaitDiv.innerHTML = "אנא חכו שהשאר יחשבו על תשובה!";

    document.body.append(pleaseWaitDiv);
}

function displayPlayerTakeStanceScreen(question) {
    currentScreen = "playerTakeStanceScreen";
    document.body.innerHTML = '';

    let youNextDiv = document.createElement("div");
    youNextDiv.classList.add("testing-textbox");
    youNextDiv.innerHTML = "אתם הבאים! תחשבו על תשובה עסיסית לשאלה הזו:";

    const inputBox = document.createElement("div");
    inputBox.classList.add("testing-textbox");
    const inputQuestion = document.createElement("strong");
    inputQuestion.innerHTML = question;
    const inputSpace = document.createElement("input");
    inputSpace.type = "text";
    inputSpace.placeholder = "מה אתם חושבים?"
    const inputButton = document.createElement("button");
    inputButton.innerText = "שלחו תשובה!";
    inputButton.onclick = (() => sendDebaterStance(inputSpace.value));
    inputBox.append(inputQuestion, document.createElement("hr"), inputSpace, inputButton);

    document.body.append(youNextDiv, inputBox);
}

function displayHostDebateScreen(question = "Question Not Set In Frontend!", debaters = [{"number": 0, "stance": "Debaters Not Passed in Frontend!"}], undecidedPlayers = [0,0,0], roundLength = 90) {
    currentScreen = "hostDebateScreen";
    document.body.innerHTML = '';
    console.log(debaters);

    const debateTimer = getTimer(roundLength);

    const debateQuestion = document.createElement("div");
    debateQuestion.classList.add("testing-textbox", "debate-question");
    debateQuestion.innerHTML = `<p>שאלה:</p><h2>${question}</h2>`;

    const debateOptions = document.createElement("div");
    debateOptions.classList.add("debate-options");
    const debaterPodiums = debaters.map((debater) => {
        const podium = document.createElement("div");
        podium.classList.add("testing-textbox", "player-stance");
        podium.id = `player${debater.number}Podium`;
        const supporterBox = document.createElement("div");
        supporterBox.classList.add("supporters");
        podium.append(getPlayerImg(debater["number"]), document.createTextNode(debater["position"]), document.createElement("hr"), supporterBox);
        return podium;
    });
    debateOptions.append(...debaterPodiums);

    const undecidedPodium = document.createElement("div");
    undecidedPodium.classList.add("testing-textbox", "player-stance");
    undecidedPodium.id = `undecidedPodium`;
    const undecidedSupporters = document.createElement("div");
    undecidedSupporters.classList.add("supporters");
    const nonDebaterIcons = undecidedPlayers.map(getPlayerImg);
    undecidedSupporters.append(...nonDebaterIcons);
    undecidedPodium.append(document.createTextNode("לא תומכים באף אחד"), document.createElement("hr"), undecidedSupporters)

    document.body.append(debateTimer, debateQuestion, debateOptions, undecidedPodium);
    activateTimers();
}

function displayDebaterDebateScreen() {
    currentScreen = "debaterDebateScreen";
    document.body.innerHTML = '';
    // TODO: Implement.

    let youNextDiv = document.createElement("div");
    youNextDiv.classList.add("testing-textbox");
    youNextDiv.innerHTML = "אל תסתכלו על הטלפון! תשכנעו את הקהל!";

    document.body.append(youNextDiv);
}

function displayPlayerDebateScreen(debaters = [0, 0]) {
    currentScreen = "playerDebateScreen";
    document.body.innerHTML = '';
    // TODO: Implement.

    let pickFaveDiv = document.createElement("div");
    pickFaveDiv.classList.add("testing-textbox");
    pickFaveDiv.innerHTML = "במי אתם תומכים? (לא הספקתי לתכנת את הכפתורים שיעבדו, סורי!)";

    const debaterButtons = debaters.map( (debaterNumber) => {
        const debaterButton = document.createElement("button");
        debaterButton.append(getPlayerImg(debaterNumber));
        return debaterButton;
    });

    const abstainButton = document.createElement("button");
    abstainButton.innerHTML = "לא תומך בשניהם!";
    //TODO: Connect to function that sets who you support.

    document.body.append(pickFaveDiv, document.createElement("hr"), ...debaterButtons, abstainButton);
}

function displayHostLeaderboard() {
    currentScreen = "hostLeaderboard";
    document.body.innerHTML = '';

    // TODO: Implement.

    let youNextDiv = document.createElement("div");
    youNextDiv.classList.add("testing-textbox");
    youNextDiv.innerHTML = "סוף המשחק הגיע! עדיין לא תכנתתי לוח של מי שקביל הכי הרבה נקודות, סורי!";

    document.body.append(youNextDiv);
}

function displayPlayerLeaderboard() {
    currentScreen = "playerLeaderboard";
    document.body.innerHTML = '';

    // TODO: Implement.
    

    let youNextDiv = document.createElement("div");
    youNextDiv.classList.add("testing-textbox");
    youNextDiv.innerHTML = "זה הכל, תודה ששיחקתם!";

    document.body.append(youNextDiv);
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
        request["content"] = messageContents;
    }

    socket.send(JSON.stringify(request));
    console.log("[SENT MESSAGE] " + JSON.stringify(request));
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

function requestGameStart() {
    sendMessageToSocket("GameAction", {
        "action": "startGame"
    });
}

function sendDebaterStance(stance){
    sendMessageToSocket("GameAction", {
        "action": "inputStance",
        "stance": stance
    });
}

function sendDebaterPreference(debaterNumber) {
    sendMessageToSocket("GameAction", {
        "action": "inputSupport",
        "debater": debaterNumber
    });
}

// ---------- HANDLE INCOMING MESSAGES -----------------

// Ran whenever the websocket sends a message.
function handleIncomingMessage(event) {
    if (event.data[0] != '{') {
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
        console.log("[ERROR!] Sent malformed request! " + JSON.stringify(parsedData));
        return;
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
        console.log("[ERROR!] Snapshot missing content: " + JSON.stringify(data));
        return;
    }
    switch(data["content"]["phase"]) {
        case "hostWaitingRoom":
            displayHostWaitMenu(data["content"]["code"], data["content"]["playerAmount"]);
            break;
        
        case "waitingRoom":
            displayPlayerWaitMenu(data["content"]["code"], data["content"]["playerNumber"]);
            break;

        case "stanceTaking":
            if (data["content"]["type"] == "host") {
                displayHostStanceTakingScreen(data["content"]["debaters"].split(","), data["content"]["secondsLeft"]);
            }
            else if (data["content"]["type"] == "debaterStanceMissing") {
                displayPlayerTakeStanceScreen(data["content"]["question"]);
            }
            else if (data["content"]["type"] == "debaterStanceGiven") {
                displayPlayerWaitStanceScreen();
            }
            else { // type should be "pickingPlayer"
                displayPlayerWaitStanceScreen();
            }
            break;
        
        case "discussion":
            if (data["content"]["type"] == "host") {
                const debaters = data["content"]["debaters"].split(",");

                let debaterInfo = [];
                for (let debaterNumber of debaters) {
                    debaterInfo.push({"number": debaterNumber, "position": data["content"][`position${debaterNumber}`]});
                }

                displayHostDebateScreen(data["content"]["question"], debaterInfo, data["content"]["undecidedPlayers"].split(","), data["content"]["secondsLeft"]);
            }
            else if (data["content"]["type"] == "debater") {
                displayDebaterDebateScreen();
            }
            else { // type should be "pickingPlayer"
                displayPlayerDebateScreen(data["content"]["debaters"].split(","));
            }
            break;

        case "gameEnd":
            if (data["content"]["type"] == "host") {
                displayHostLeaderboard();
            }
            else {
                displayPlayerLeaderboard();
            }
            break;

        default: 
            console.log("[ERROR!] Invalid snapshot phase: " + JSON.stringify(data));
    }
}

function mainMenuIncomingMessages(data) {
    switch (data["type"]) {
        default:
            console.log("[ERROR!] Invalid message type recieved for main menu: " + JSON.stringify(data));
    }
}

function hostWaitMenuIncomingMessages(data) {
    switch (data["type"]) {
        case "GameUpdate":
            switch(data["content"]["event"]) {
                case "playerLeft":
                case "playerJoin":
                    updateAmountOfPeopleInWaitingRoom(data["content"]["totalPlayers"]);
                    break;

                default:
                    console.log("[ERROR!] Recieved an invalid event for game data! " + JSON.stringify(data));
                    break;
            }
            break;


        default:
            console.log("[ERROR!] Invalid message type recieved for host wait menu: " + JSON.stringify(data));
    }
}


