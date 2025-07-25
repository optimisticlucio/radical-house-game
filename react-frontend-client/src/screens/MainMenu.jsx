/** @jsxImportSource @emotion/react */
import { useState } from "react";
import { requestNewGameCreation } from "../ServerComm.jsx";
import { css } from "@emotion/react";

const SCREENS = {
  MAIN_MENU: "MAIN_MENU",
  GAME_RULES: "GAME_RULES",
  CONNECT: "CONNECT",
};

function WindowSwitcher() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.MAIN_MENU);

  return (
    <>
      {currentScreen === SCREENS.MAIN_MENU && (
        <MainMenu setCurrentScreen={setCurrentScreen} />
      )}
      {currentScreen === SCREENS.GAME_RULES && (
        <GameExplanation setCurrentScreen={setCurrentScreen} />
      )}
      {currentScreen === SCREENS.CONNECT && (
        <ConnectToGame setCurrentScreen={setCurrentScreen} />
      )}
      {!(currentScreen in SCREENS) && (
        <h2>ERROR: currentScreen is set to an invalid screen in MainMenu!</h2>
      )}
    </>
  );
}

function MainMenu({ setCurrentScreen }) {
    const style = css`
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    `;

  return (
    <div css={style}>
        <button onClick={() => setCurrentScreen(SCREENS.GAME_RULES)}>
            חוקי המשחק
        </button>
        <button onClick={() => setCurrentScreen(SCREENS.CONNECT)}>
            התחבר למשחק קיים
        </button>
        <button onClick={() => requestNewGameCreation()}>
            צור משחק חדש
        </button>
    </div>
  );
}

function GameExplanation({ setCurrentScreen }) {
  return (
    <>
      <h2>TODO: Make something</h2>
      <h3>ניסיון נסיון</h3>
      <button onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}>
        סגור חלון
      </button>
    </>
  );
}

function ConnectToGame({ setCurrentScreen }) {
  return (
    <>
      <h2>TODO: Make something</h2>
      <h3>ניסיון נסיון</h3>
      <button onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}>
        סגור חלון
      </button>
    </>
  );
}

export default WindowSwitcher;
