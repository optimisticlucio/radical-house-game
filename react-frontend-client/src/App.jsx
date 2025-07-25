import { useEffect, useState } from "react";
import "./App.css";
import { initializeConnection } from "./ServerComm";
import MainMenu from "./screens/MainMenu";
import LoadingScreen from "./screens/LoadingScreen";
import Disconnected from "./screens/Disconnected";
import HostPregame from "./screens/HostPregame";
import HostWaitingOnDebaters from "./screens/HostWaitingOnDebaters";
import HostDebateScreen from "./screens/HostDebate";

export const SCREENS = {
  DISCONNECTED: "DISCONNECTED",
  LOADING_SCREEN: "LOADING_SCREEN",
  MAIN_MENU: "MAIN_MENU",
  HOST_PREGAME_SCREEN: "HOST_PREGAME_SCREEN",
  PLAYER_PREGAME_SCREEN: "PLAYER_PREGAME_SCREEN",
  HOST_WAITING_ON_DEBATERS: "HOST_WAITING_ON_DEBATERS",
  PLAYER_WAITING_ON_DEBATERS: "PLAYER_WAITING_ON_DEBATERS",
  DEBATER_INPUT_ANSWER: "DEBATER_INPUT_ANSWER",
  DEBATER_DEBATE: "DEBATER_DEBATE",
  PLAYER_DEBATE: "PLAYER_DEBATE",
  HOST_DEBATE: "HOST_DEBATE",
  PLAYER_END: "PLAYER_END",
  HOST_END: "HOST_END",
};

export let SwitchWindows = (targetWindow, receivedData) => {};
export function registerSwitchWindows(fn) {
  SwitchWindows = fn;
}

export let exportedCurrentScreen = "";

export function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.LOADING_SCREEN);
  const [serverData, setServerData] = useState([]);

  useEffect(() => {
    // Display currentScreen every time there's a change.
    console.log(`currentScreen set to ${currentScreen}`);
    exportedCurrentScreen = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    // Display data every time there's a change.
    console.log(`serverData set to ${JSON.stringify(serverData)}`);
  }, [serverData]);

  useEffect(() => {
    // Register setState handlers globally
    registerSwitchWindows((targetWindow, receivedData) => {
      if (!(targetWindow in SCREENS)) {
        console.warn(`Received invalid target window: ${targetWindow}!`);
        return;
      }

      setCurrentScreen(targetWindow);
      setServerData(receivedData);
    }
    
  );
    console.log("SwitchWindows assigned.");
    initializeConnection();
  }, []);



  return (
    <>
      {currentScreen === SCREENS.DISCONNECTED && <Disconnected />}
      {currentScreen === SCREENS.LOADING_SCREEN && <LoadingScreen />}
      {currentScreen === SCREENS.MAIN_MENU && <MainMenu />}
      {currentScreen === SCREENS.HOST_PREGAME_SCREEN && <HostPregame roomCode={serverData.code} />}
      {currentScreen === SCREENS.HOST_WAITING_ON_DEBATERS && <HostWaitingOnDebaters 
          debaters={serverData.debatersWithNames
            .match(/\(([^)]+)\)/g) // extract each "(1,Alice)" part
            .map(item => {
              const [playerNumber, username] = item.slice(1, -1).split(",");
              return { playerNumber: Number(playerNumber), username };
            })} 
        />}
      {currentScreen === SCREENS.HOST_DEBATE && <HostDebateScreen
          question = {serverData.question}
          debaters = {serverData.debaters.split(",").map(number => ({number, position: serverData[`position${number}`]}))}
          undecidedPlayers = {serverData.undecidedPlayers.split(",")}
          roundLength = {serverData.secondsLeft}
      />}
      {!(currentScreen in SCREENS) && (
        <h2>ERROR: currentScreen is set to an invalid screen!</h2>
      )}
    </>
  );
}

export default App;
