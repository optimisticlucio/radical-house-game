import { sendDebaterStance } from "../ServerComm";

export default function DebaterInputAnswer({question}) {
  return (
    <>
        <div className="textbox">
        <h2>{question}</h2>
        </div>
        <div className="textbox">
            <input type="text" id="debaterStance"/>
            <button onClick={sendDebaterStance(document.getElementById("debaterStance").value)}>שלח דעה!</button>
        </div>
    </>
  );
}
