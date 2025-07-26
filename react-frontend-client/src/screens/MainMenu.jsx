/** @jsxImportSource @emotion/react */
import { useState } from "react";
import { requestNewGameCreation, requestGameJoin } from "../ServerComm.jsx";
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
      <img src="/assets/img/logo.png" />

      <button className="textbox" onClick={() => setCurrentScreen(SCREENS.GAME_RULES)}>
        חוקי המשחק
      </button>
      <button className="textbox" onClick={() => setCurrentScreen(SCREENS.CONNECT)}>
        התחבר למשחק קיים
      </button>
      <button className="textbox" onClick={() => requestNewGameCreation()}>צור משחק חדש</button>
    </div>
  );
}

function GameExplanation({ setCurrentScreen }) {
  return (
    <>
      <div className="textbox">
        <h1>חוקי המשחק</h1>
        <p>
      בכל סיבוב – שני שחקנים מקבלים שאלה. <br/>
      על שני השחקנים לכתוב תשובה. <br/>
      לאחר מכן על השחקנים לשכנע את הקהל בתשובתם. <br/>
      שאר השחקנים מצביעים: מי שכנע יותר? <br/>
      המנצח בסיבוב -  מי שהצביעו לו יותר. <br/>
        </p>
      </div>
      <button className="textbox" onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}>
        סגור חלון
      </button>
    </>
  );
}

function ConnectToGame({ setCurrentScreen }) {
  return (
    <>
      <div className="textbox">
        <h2>כתוב את קוד החדר</h2>
        <input type="text" id="roomcode"></input>
        <br />
        <button onClick={() => requestGameJoin(document.getElementById("roomcode").value)}>
          התחבר
        </button>
      </div>
      <button className="textbox" onClick={() => setCurrentScreen(SCREENS.MAIN_MENU)}>
        סגור חלון
      </button>
    </>
  );
}

export default WindowSwitcher;
