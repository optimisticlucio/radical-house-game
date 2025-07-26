/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";

function HostEnd({ players }) {
  return (
    <>
    <div className="textbox">
      <h2>תוצאות</h2>
    </div>
      <div css={css`display:flex; flex-direction: row; direction: ltr`}>
        {players.sort((a, b) => a.score > b.score ? 1 : -1).map((player, index) => {
          return <PlayerScore ranking={index + 1} playerNumber={player.number} username={player.username} score={player.score} />
        })}
      </div>
    </>
  );
}

function PlayerScore({ ranking, playerNumber, username, score }) {
  return (
    <div>
      <div css={css`display:flex; flex-direction: row; align-items: center;`}>
        <div css={css`font-size: 4em; display:flex;`}>{ranking}</div>
        <div css={css`margin-top: 1em;`}>
          <PlayerImg playerNumber={playerNumber} username={username} />
        </div>
      </div>
      <span css={css`color: white; font-size: 2em;`}>{score}</span>
    </div>
  );
}

export default HostEnd;