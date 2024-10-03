import { useEffect, useState } from "react";
// import { getAwsIdentity } from "../common/aws";
import "./App.css";

function App() {
  const [label, setLabel] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    chrome.storage.local.get(["AWS_USERNAME"]).then((res) => {
      setLabel(res.AWS_USERNAME || "ログインしていません");
    });
  }, []);

  const handleClick = async () => {
    const trimmedKey = secretKey.trim();
    if (!trimmedKey) {
      setWarning("シークレットキーを入力してください");
      return;
    }
    try {
      // const awsIdentity = await getAwsIdentity(trimmedKey);
      const awsIdentity = { username: "test", account: "test" };
      await chrome.storage.local.set({
        AWS_KEYS_ENCRYPTED: trimmedKey,
        AWS_USERNAME: awsIdentity.username,
        AWS_ACCOUNT: awsIdentity.account,
      });
      window.close();
    } catch (err) {
      setWarning("シークレットキーが間違っています");
      console.error(err);
    }
  };

  return (
    <>
      <div id="text-username">{label}</div>
      <input
        id="text-key"
        type="text"
        value={secretKey}
        placeholder="シークレットキー"
        onChange={(e) => setSecretKey(e.target.value)}
      />
      <div id="warning">{warning}</div>
      <button id="submit-btn" onClick={handleClick}>
        入力
      </button>
    </>
  );
}

export default App;
