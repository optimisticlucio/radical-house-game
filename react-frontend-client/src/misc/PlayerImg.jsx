/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
export function PlayerImg({ playerNumber }) {
  return (
    <img
      src={`/assets/img/player-icons/${playerNumber}.png`}
      className="character-icon"
      alt={`Player ${playerNumber}`}
      id={`player${playerNumber}`}
      css={css`
        width: 2em;
        `}
    />
  );
}
