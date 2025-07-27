import { PlayerImg } from "../misc/PlayerImg";
import { sendDebaterPreference } from "../ServerComm";

export default function PlayerDebate( {debaters}) {
  return (
    <div className="textbox">
      <h2>במי אתם תומכים?</h2>
      <div css={css`display:flex; flex-direction: column; gap: 0.5em;`}>
        {debaters.map((playerNumber) => {
            return <button onClick={sendDebaterPreference(playerNumber)}>
                <PlayerImg playerNumber={playerNumber} />
            </button>
        })}
        <button onClick={sendDebaterPreference(-1)}>
                אני לא תומכ.ת בשניהם!
            </button>
      </div>
    </div>
  );
}
