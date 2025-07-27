/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

export default function PlayerImg({ playerNumber, username }) {
  return (
    <img
      src={`/assets/img/player-icons/${playerNumber}.png`}
      className="character-icon"
      alt={`Player ${playerNumber}`}
      id={`player${playerNumber}`}
      css={css`
        width: 2em;
        object-fit: contain;
      `}
    />
  );
}
