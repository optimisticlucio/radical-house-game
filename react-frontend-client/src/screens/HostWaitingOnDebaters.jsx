/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";
import Timer from "../misc/Timer";

function HostWaitingOnDebaters({ debaters, timeleft }) {
  return (
    <div className="textbox">
      <h2>השחקנים האלה כרגע חושבים על תשובות!</h2>
      {debaters.map(({playerNumber, username}) => (
        <PlayerImg playerNumber={playerNumber} username={username} />
      ))}

      <Timer roundLength={timeleft} />
    </div>
  );
}

export default HostWaitingOnDebaters;