/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";

function HostWaitingOnDebaters() {
  return (
    <div className="textbox">
      <h2>מתחבר לשרת...</h2>
    </div>
  );
}

export default HostWaitingOnDebaters;