/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";

// Podium component with label and supporters (players)
function Podium({ id, label, players }) {
  return (
    <div className="testing-textbox player-stance" id={id}>
      <div>{label}</div>
      <hr />
      <div className="supporters">
        {players.map((num) => (
          <PlayerImg key={num} playerNumber={num} />
        ))}
      </div>
    </div>
  );
}

// Timer component counting down visually
function DebateTimer({ roundLength }) {
  const [timeLeft, setTimeLeft] = useState(roundLength);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft]);

  return <div className="timer">Time Left: {timeLeft}s</div>;
}

export const movePlayerToPodium = (playerNum, targetPodiumId) => {};
function registerMovePlayerToPodium(fn) {
  movePlayerToPodium = fn;
}

// Main Host Debate Screen component
export default function HostDebateScreen({
  question = "Question Not Set In Frontend!",
  debaters = [{ number: 0, stance: "Debaters Not Passed in Frontend!" }],
  undecidedPlayers = [],
  roundLength = 90,
}) {
  // Map playerNumber => podium id to track player positions
  // Initially debaters are assigned to their podium, undecidedPlayers to 'undecided' podium
  // We'll structure state as: { podiumId: [playerNums] }
  const [podiums, setPodiums] = useState(() => {
    const init = {};

    debaters.forEach((debater) => {
      const pid = `player${debater.number}Podium`;
      init[pid] = [debater.number];
    });

    init["undecidedPodium"] = [...undecidedPlayers];
    return init;
  });

  // If you receive updated player positions from server messages, update `podiums` state accordingly
  // Example move function, could be called from parent or effect:
  useEffect(() => {
    let fn = (playerNum, targetPodiumId) => {
      setPodiums((prev) => {
        const newPodiums = {};

        // Remove playerNum from all podium arrays
        for (const pid in prev) {
          newPodiums[pid] = prev[pid].filter((p) => p !== playerNum);
        }

        // Add playerNum to target podium
        if (!newPodiums[targetPodiumId]) {
          newPodiums[targetPodiumId] = [];
        }
        newPodiums[targetPodiumId].push(playerNum);

        return newPodiums;
      });
      
    }
    registerMovePlayerToPodium(fn);
  })

  return (
    <>
      <DebateTimer roundLength={roundLength} />

      <div className="testing-textbox debate-question">
        <p>שאלה:</p>
        <h2>{question}</h2>
      </div>

      <div className="debate-options">
        {debaters.map((debater) => {
          const pid = `player${debater.number}Podium`;
          return (
            <Podium
              key={pid}
              id={pid}
              label={debater.position || `Debater ${debater.number}`}
              players={podiums[pid] || []}
            />
          );
        })}

        <Podium
          id="undecidedPodium"
          label="לא תומכים באף אחד"
          players={podiums["undecidedPodium"] || []}
        />
      </div>
    </>
  );
}