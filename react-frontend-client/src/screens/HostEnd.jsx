/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";

function HostEnd({ players }) {
  return (
    <div className="textbox">
      <h2>תוצאות</h2>
      <div css={css`display:flex; flex-direction: row;`}>
        {players.sort((a, b) => a.score > b.score ? 1 : -1).map((player, index) => {
          return <PlayerScore ranking={index} playerNumber={player.number} username={player.username} score={player.score} />
        })}
      </div>
    </div>
  );
}

function PlayerScore({ ranking, playerNumber, username, score }) {
  return (
    <div>
      <div css={css`display:flex; flex-direction: row;`}>
        <div css={css`font-size: 4em; display:flex;`}>{ranking}</div>
        <PlayerImg playerNumber={playerNumber} username={username} />
      </div>
      <span css={css`color: white; font-size: 2em;`}>{score}</span>
    </div>
  );
}

export default HostEnd;