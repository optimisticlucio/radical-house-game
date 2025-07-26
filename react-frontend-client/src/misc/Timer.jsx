/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";

// Timer component counting down visually
export default function Timer({ roundLength }) {
  const [timeLeft, setTimeLeft] = useState(roundLength);

  const style=css`
    color: white;
    font-weight: bold;
    -webkit-text-stroke: 0.4ch black;
    paint-order: stroke fill;
    font-size: 2em;
    width: 4ch;
    text-align:center;
    margin: .5ch 0;
  `;

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft]);

  return <div className="timer" css={style}>{timeLeft}</div>;
}