const getLocalStorageValueByRegex = (regex: RegExp) => {
  const keys = Object.keys(localStorage);
  const key = keys.find((key) => key.match(regex));
  return key ? localStorage.getItem(key) : null;
};

const observer = new MutationObserver(() => {
  setTimeout(() => {
    const idToken = getLocalStorageValueByRegex(
      /^CognitoIdentityServiceProvider\..+\.idToken$/
    );
    const refreshToken = getLocalStorageValueByRegex(
      /^CognitoIdentityServiceProvider\..+\.refreshToken$/
    );
    console.log({ idToken, refreshToken });
    if (idToken && refreshToken) {
      chrome.storage.local.set({
        auth: { idToken, refreshToken },
      });
    }
  }, 500);
});

setTimeout(() => {
  const root = document.querySelector("#root");
  if (!root) {
    alert("[エラー] 管理者に問い合わせてください。(errorId:rnf)");
    return;
  }
  observer.observe(root, {
    childList: true,
  });
}, 500);
