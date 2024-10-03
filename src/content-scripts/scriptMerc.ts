const scrapeItemPage = () => {
  // const index = location.pathname.split("/")[1];
  // if (index === "item") {
  //   return scrapeItemPageMercari();
  // } else if (index === "shops") {
  //   return scrapeItemPageShop();
  // } else {
  //   throw new Error("URLが無効です。");
  // }
  return {
    url: location.href,
  };
};

const handleSearchMutation = () => {
  // overrideSearchUi()
  //   .then(() => console.log("done overrideSearchUi"))
  //   .catch((err) => console.log(err));
  console.log("handleSearchMutation");
};

const handleItemMutation = (extElem: Element) => {
  const main = document.querySelector("main");
  if (main) {
    main.onclick = () => {
      const itemInfo = scrapeItemPage();
      chrome.storage.local
        .set({
          ITEM_INFO: itemInfo,
        })
        .then(() => console.log("set ITEM_INFO", itemInfo));
    };
    if (!main.contains(extElem)) {
      main.prepend(extElem);
    }
  }
};

const extElem = (() => {
  const outerDiv = (() => {
    const elem = document.createElement("div");
    elem.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      pointer-events: none;
    `;
    chrome.storage.local.get(["ITEM_INFO"]).then((result) => {
      if (!result.ITEM_INFO) return;
      if (result.ITEM_INFO.url === location.href) {
        elem.style.border = "gold 2px solid";
      }
    });
    return elem;
  })();
  return outerDiv;
})();

const observer = (() => {
  let randNum = 0;
  return new MutationObserver(() => {
    const tmp = Math.random();
    randNum = tmp;
    setTimeout(() => {
      if (randNum !== tmp) return;
      if (location.pathname === "/search") {
        handleSearchMutation();
      } else if (location.pathname.startsWith("/item/")) {
        handleItemMutation(extElem);
      } else if (location.pathname.startsWith("/shops/")) {
        handleItemMutation(extElem);
      }
    }, 500);
  });
})();

observer.observe(document, {
  childList: true,
  subtree: true,
});

chrome.storage.onChanged.addListener((changes) => {
  console.log("storage changed", changes);
  if (!changes.ITEM_INFO) return;
  if (changes.ITEM_INFO.newValue.url === location.href) {
    extElem.style.border = "gold 2px solid";
  } else {
    extElem.style.border = "none";
  }
});
