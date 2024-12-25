import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["auth"]).then((res) => {
      if (res.auth) {
        setLabel("ログイン済み");
      } else {
        setLabel("ログインしていません");
      }
    });
  }, []);

  return (
    <>
      <div id="text-username">{label}</div>
    </>
  );
}

export default App;
