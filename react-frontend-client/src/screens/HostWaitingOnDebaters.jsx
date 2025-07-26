/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";
import Timer from "../misc/Timer";

function HostWaitingOnDebaters({ debaters, timeleft }) {
  return (
    <div className="textbox">
      <h2>השחקנים האלה כרגע חושבים על תשובות!</h2>

      <div css={css`display: flex; justify-content: center;`}>
        {debaters.map(({playerNumber, username}) => (
        <PlayerImg playerNumber={playerNumber} username={username} />
      ))}
      </div>

      <div css={css`margin: auto; width: fit-content;`}>
        <Timer roundLength={timeleft} />
      </div>
    </div>
  );
}

export default HostWaitingOnDebaters;