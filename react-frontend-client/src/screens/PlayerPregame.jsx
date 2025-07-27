import PlayerImg from "../PlayerImg.jsx";

export default function PlayerPregame( {playerNumber, username}) {
  return (
    <div className="textbox">
      <h2>אנא תחכו שהמשחק יתחיל!</h2>
      <br />
      <PlayerImg playerNumber={playerNumber} username={username} />
    </div>
  );
}
