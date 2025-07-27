/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import PlayerImg from "../misc/PlayerImg";

function HostEnd({ players }) {
  return (
    <>
      <div className="textbox">
        <p
          css={css`
            width: 100%;
            text-align: center;
            font-size: 2em;
          `}
        >
          תוצאות
        </p>
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          direction: ltr;
          gap: 1.5em;
        `}
      >
        {players
          .sort((a, b) => (a.score < b.score ? 1 : -1))
          .map((player, index) => {
            return (
              <PlayerScore
                ranking={index + 1}
                playerNumber={player.number}
                username={player.username}
                score={player.score}
              />
            );
          })}
      </div>
    </>
  );
}

function PlayerScore({ ranking, playerNumber, username, score }) {
  return (
    <div>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          align-items: center;
        `}
      >
        <div
          css={css`
            font-size: 4em;
            display: flex;
            color: #d85959ff;
            -webkit-text-stroke: 0.2ch #570f0fff;
            paint-order: stroke fill;
          `}
        >
          {ranking}
        </div>
        <div
          css={css`
            margin-top: 1em;
            margin-left: 0.2em;
            font-size: 1.5em;
          `}
        >
          <PlayerImg playerNumber={playerNumber} username={username} />
        </div>
      </div>
      <div
        css={css`
          color: white;
          font-size: 1em;
          color: white;
          width: 100%;
          text-align: center;
          height: 0;
          line-height: 0;
          -webkit-text-stroke: 0.2ch grey;
          paint-order: stroke fill;
          direction: rtl;
        `}
      >
        {score} נקודות
      </div>
    </div>
  );
}

export default HostEnd;
