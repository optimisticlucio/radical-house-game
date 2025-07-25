/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";
import { requestGameStart } from "../ServerComm";

export let UpdatePlayersInWaitingRoom = (players) => {};
function registerUpdatePlayersInWaitingRoom(fn) {
  UpdatePlayersInWaitingRoom = fn;
}

function HostPregame({ roomCode = "MISSING" }) {
    const [players, setPlayers] = useState([]);

    useEffect(() => {
      registerUpdatePlayersInWaitingRoom(setPlayers);
    }, []);

    useEffect( () => {    
      console.log(`Value of Players is ${JSON.stringify(players)}`);
    }, [players])

  return (
    <>
      <div className="textbox">
        <h1>התחברו למשחק!</h1>
        <h2>קוד חדר: {roomCode}</h2>
      </div>

    <div className="textbox">
        {players.length < 3 && <p css={css`text-align:center`}>
            צריך לפחות 3 שחקנים בשביל לשחק!
        </p>}
        <div css={css`
        display:flex;
        gap: 1em;
        `}>
        {players.map(({username, playerNumber}) => {
          return (<>
              <PlayerImg playerNumber={playerNumber} />
          </>)
        })}
      </div>
    </div>
      

      <button onClick={requestGameStart}>התחל משחק!</button>
    </>
  );
}

export default HostPregame;
