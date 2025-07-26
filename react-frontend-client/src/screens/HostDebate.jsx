/** @jsxImportSource @emotion/react */
import { useState, useEffect } from "react";
import { css } from "@emotion/react";
import { PlayerImg } from "../misc/PlayerImg";
import Timer from "../misc/Timer";

// Podium component with label and supporters (players)
function Podium({ id, label, players, flip=false }) {
  return (
    <div className="podium" id={id}
      css={css`font-size:1.5em;`}>
      <div className="textbox" 
        css={css`flex-grow:1;`}>
        <p>
          {label}
        </p>
        <span>
          מספר תומכים: {players.length - 1}
        </span>
      </div>
      <div className={`podiumSupporters ${flip && "flip"}`}>
        {players.map((num) => (
          <PlayerImg key={num} playerNumber={num} />
        ))}
      </div>
      <div className="podiumFloor"></div>
    </div>
  );
}

export let movePlayerToPodium = (playerNum, targetPodiumId) => {};
function registerMovePlayerToPodium(fn) {
  movePlayerToPodium = fn;
}

function DebaterPodium({ podiums, number, position, flip = false }) {
  const pid = `player${number}Podium`;
  return <Podium
          key={pid}
          id={pid}
          label={position || `לא שלחת תשובה. תמציא משהו!`}
          players={podiums[pid] || []}
          flip={flip}
        />
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

    init["player-1Podium"] = [...undecidedPlayers];
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
        if (!newPodiums[`player${targetPodiumId}Podium`]) {
          newPodiums[`player${targetPodiumId}Podium`] = [];
        }
        newPodiums[`player${targetPodiumId}Podium`].push(playerNum);

        console.log(`Set New Podiums to ${JSON.stringify(newPodiums)}`);
        return newPodiums;
      });
      
    }
    registerMovePlayerToPodium(fn);
  },[])

  return (
    <>
      <div className="textbox">
        <h2 css={css`text-align: center`}>{question}</h2>
      </div>

      <div css={css`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        `}>
        <DebaterPodium podiums={podiums} flip={true} {...debaters[0]}/>
        <Timer roundLength={roundLength} />
        <DebaterPodium podiums={podiums} {...debaters[1]}/>
      </div>

      <div className="undecidedPodium">
        <div className="podiumSupporters">
          {podiums["player-1Podium"].map((num) => (
            <PlayerImg key={num} playerNumber={num} />
          ))}
        </div>
        <div className="podiumFloor"></div>
      </div>
    </>
  );
}