// import { useState } from 'react'
import "./App.css";
import * as HostScreens from "./screens/GameHostScreens.jsx";

export const SCREENS = {
  LOADING_SCREEN: "loading_screen",
  MAIN_MENU: "main_menu",
  HOST_PREGAME_SCREEN: "host_pregame_screen",
  PLAYER_PREGAME_SCREEN: "player_pregame_screen",
  HOST_WAITING_ON_DEBATERS: "host_waiting_on_debaters",
  PLAYER_WAITING_ON_DEBATERS: "player_waiting_on_debaters",
  DEBATER_INPUT_ANSWER: "debater_input_answer",
  DEBATER_DEBATE: "debater_debate",
  PLAYER_DEBATE: "player_debate",
  HOST_DEBATE: "host_debate",
  PLAYER_END: "player_end",
  HOST_END: "host_end"
}

export function SwitchWindows(targetWindow, recievedData) {
  switch (targetWindow) {
    default:
      console.error(`SwitchWindow recieved invalid target window: ${targetWindow}`);
      break;
  }
}

export function App() {
  return (
    <>
      <h2>TODO: Make something</h2>
      <h3>ניסיון נסיון</h3>
    </>
  );
}

export default App;