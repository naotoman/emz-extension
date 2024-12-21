import { useEffect, useState } from "react";
import "./App.css";
import Command from "./command";

function App() {
  const [label, setLabel] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [toggle, setToggle] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["isGptEnabled", "auth"]).then((res) => {
      setToggle(Boolean(res.isGptEnabled));
      if (res.auth) {
        setLabel("ログイン済み");
      } else {
        setLabel("ログインしていません");
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ isGptEnabled: toggle }).then(() => {});
  }, [toggle]);

  return (
    <>
      <div id="text-username">{label}</div>
      {showHidden && (
        <div
          className={toggle ? "switch on" : "switch"}
          onClick={() => setToggle(!toggle)}
        ></div>
      )}
      <Command triggerAction={() => setShowHidden(true)} />
    </>
  );
}

export default App;
