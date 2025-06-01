

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
        // TODO: Make sure we don't double setup a timer.
        setInterval(() => timerDecrementation(timer), 1000);
    }   
}