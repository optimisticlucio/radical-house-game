/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";

// Timer component counting down visually
export default function Timer({ roundLength }) {
  const [timeLeft, setTimeLeft] = useState(roundLength);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft]);

  return <div className="timer">שניות נותרות: {timeLeft}</div>;
}