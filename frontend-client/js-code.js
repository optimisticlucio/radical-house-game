const SERVER_ADDRESS = "127.0.0.1:8080"
const socket = new WebSocket("ws://" + SERVER_ADDRESS)

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
    } else {
        console.log("Handshake failed!");
        serverDeadNotification();
    }
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
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("Host server unreachable :("));

    document.body.appendChild(mainDiv);
}

function displayMainMenu() {
    document.body.innerHTML = '';

    let mainDiv = document.createElement("div");
    mainDiv.classList.add("testing-textbox");
    mainDiv.appendChild(document.createTextNode("Host server reached :)"));
    // TODO: Setup main menu and buttons.

    document.body.appendChild(mainDiv);
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
