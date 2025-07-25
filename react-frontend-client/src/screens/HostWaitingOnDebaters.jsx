/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";

function HostWaitingOnDebaters({ debaters }) {
  return (
    <div className="textbox">
      <h2>השחקנים האלה כרגע חושבים על תשובות!</h2>
      {debaters.map(({playerNumber, username}) => (
        <PlayerImg playerNumber={playerNumber} username={username} />
      ))}
    </div>
  );
}

export default HostWaitingOnDebaters;