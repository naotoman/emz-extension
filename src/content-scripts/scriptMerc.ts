import { queryAndUpdateToken } from "./aws";
import { scrapeMerc, scrapeMshop } from "./scraper";

interface ItemState {
  isListed: boolean;
}

const batchGetItems = (() => {
  let itemCache: {
    searchUrls: Set<string>;
    result: Map<string, ItemState>;
  } = {
    searchUrls: new Set(),
    result: new Map(),
  };

  const isSetEqual = (a: Set<string>, b: Set<string>) => {
    if (a.size !== b.size) return false;
    for (const elem of a) {
      if (!b.has(elem)) return false;
    }
    return true;
  };

  return async (itemUrls: Set<string>): Promise<Map<string, ItemState>> => {
    // If it matches the cache, return the cache
    if (isSetEqual(itemUrls, itemCache.searchUrls)) {
      console.log("return cached item info");
      return itemCache.result;
    }

    let itemStates = [] as ItemState[];
    const itemUrlsArray = Array.from(itemUrls);
    for (let i = 0; i < itemUrlsArray.length; i += 100) {
      const query = `
            query MyQuery {
              batchGetItem(input: {urls: ${JSON.stringify(
                itemUrlsArray.slice(i, i + 100)
              )}}) {
                isListed
              }
            }
          `;
      const responseData = await queryAndUpdateToken(query);
      if (!responseData) {
        console.error("failed to get item info");
        return new Map();
      }
      itemStates = itemStates.concat(responseData.batchGetItem as ItemState[]);
    }

    itemCache = {
      searchUrls: itemUrls,
      result: new Map(itemStates.map((v, i) => [itemUrlsArray[i], v])),
    };
    return itemCache.result;
  };
})();

const overrideItem = (parent: Element, itemInfo: ItemState) => {
  const overlayImg = document.createElement("div");
  overlayImg.style.cssText =
    "content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); z-index: 998;";
  overlayImg.className = "extoverlay";
  parent.appendChild(overlayImg);

  const overrideTxt = document.createElement("div");
  overrideTxt.style.cssText =
    "color:white; position:absolute; top:50%; left:50%; transform: translate(-50%,-50%); font-size: xx-large; font-weight: bold; z-index: 999;";
  if (itemInfo.isListed) {
    overrideTxt.textContent = "LI";
  }
  overrideTxt.className = "extoverlay";
  parent.appendChild(overrideTxt);
};

const handleSearchMutation = async () => {
  const itemNodes = document.querySelectorAll<HTMLAnchorElement>(
    'a[data-location$=":item_thumbnail"]'
  );
  const itemUrls = new Set(Array.from(itemNodes).map((node) => node.href));
  const searchedItems = await batchGetItems(itemUrls);
  console.log("searchedItems", searchedItems);

  itemNodes.forEach((node) => {
    const picNode = node.querySelector("picture");
    if (picNode == null) {
      console.log("[ERROR] picture tag was not found.");
      return;
    }
    const overlayDivs = picNode.querySelectorAll("div.extoverlay");
    if (searchedItems.get(node.href) && overlayDivs.length === 0) {
      overrideItem(picNode, searchedItems.get(node.href)!);
    } else if (!searchedItems.get(node.href)) {
      overlayDivs.forEach((element) => element.remove());
    }
  });
};

// const handleItemMutationMerc = (extElem: Element) => {
//   const main = document.querySelector("main");
//   if (!main) return;
//   main.onclick = async () => {
//     const stock = scrapeMerc();
//     if (stock.stockStatus === "outofstock") {
//       console.log("out of stock");
//       return;
//     }
//     await chrome.storage.local.set({
//       stock: stock.stockData,
//     });
//     console.log("set stock", stock);
//   };
//   if (!main.contains(extElem)) {
//     main.prepend(extElem);
//   }
// };

// const handleItemMutationMshop = (extElem: Element) => {
//   const main = document.querySelector("main");
//   if (!main) return;
//   main.onclick = async () => {
//     const stock = scrapeMshop();
//     if (stock.stockStatus === "outofstock") {
//       console.log("out of stock");
//       return;
//     }
//     await chrome.storage.local.set({
//       stock: stock.stockData,
//     });
//     console.log("set stock", stock);
//   };
//   if (!main.contains(extElem)) {
//     main.prepend(extElem);
//   }
// };

const handleClickRegister = async (shippingYen: number) => {
  const stock = location.pathname.startsWith("/item/")
    ? scrapeMerc()
    : scrapeMshop();
  if (stock.stockStatus === "outofstock" || !stock.stockData) {
    console.log("out of stock");
    alert("売り切れの商品は登録できません");
    return;
  }
  const item = {
    shippingYen,
    orgUrl: stock.stockData.core.url,
    orgImageUrls: stock.stockData.core.imageUrls,
    orgPrice: stock.stockData.core.price,
    orgTitle: stock.stockData.core.title,
    orgDescription: stock.stockData.core.description,
    orgExtraParam: JSON.stringify(stock.stockData.extra),
  };

  const queryVariables = Object.entries(item)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join();

  const query = `
      mutation MyMutation {
        registerItemChatGpt(input: {${queryVariables}})
      }`;

  console.log(query);

  const responseData = await queryAndUpdateToken(query);
  if (!responseData) {
    throw new Error("failed to register item");
  }
};

const extElem = (() => {
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
  chrome.storage.local.get(["stock"]).then((result) => {
    if (result.stock?.url === location.href) {
      elem.style.border = "gold 2px solid";
    }
  });
  return elem;
})();

const extElemGpt = new (class {
  outerDiv: HTMLDivElement;
  registerBtn: HTMLButtonElement;
  constructor() {
    this.registerBtn = document.createElement("button");
    this.registerBtn.className = "emz-chatgpt-btn";
    this.registerBtn.onclick = () => {
      this.registerBtn.disabled = true;
      this.registerBtn.classList.add("emz-onclic");
      handleClickRegister(0)
        .then(() => {
          this.registerBtn.classList.remove("emz-onclic");
          this.registerBtn.classList.add("emz-validate");
        })
        .catch((e) => {
          console.error(e);
          alert("登録に失敗しました");
          this.registerBtn.disabled = false;
          this.registerBtn.classList.remove("emz-onclic");
        });
    };

    this.outerDiv = document.createElement("div");
    this.outerDiv.className = "emz-chatgpt-outerdiv";

    const css = `.emz-chatgpt-outerdiv {
  font-family: "Roboto", sans-serif;
  margin-top: 30px;
  width: 100%;
  height: 50px;
  text-align: center;
  display: flex;
  justify-content: center;
}
.emz-chatgpt-btn {
  outline: none;
  height: 50px;
  width: 240px;
  text-align: center;
  background: #fff;
  color: #1ECD97;
  border: 3px solid #1ECD97;
  border-radius: 40px;
  letter-spacing: 2px;
  text-shadow: 0;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.25s ease;
}
@media (prefers-color-scheme: dark) {
  .emz-chatgpt-btn {
    background: #333;
  }
}
.emz-chatgpt-btn:hover {
  color: white;
  background: #1ECD97;
}
.emz-chatgpt-btn:active {
  letter-spacing: 4px;
}
.emz-chatgpt-btn:after {
  content: "SUBMIT";
}
.emz-onclic {
  width: 50px;
  border-color: #bbbbbb;
  border-width: 3px;
  font-size: 0;
  border-left-color: #1ECD97;
  -webkit-animation: emzrotating 2s 0.25s linear infinite;
          animation: emzrotating 2s 0.25s linear infinite;
}
.emz-onclic:after {
  content: "";
}
.emz-onclic:hover {
  color: #1ECD97;
  background: white;
}
.emz-validate {
  font-size: 20px;
  color: white;
  background: #1ECD97;
}
.emz-validate:after {
  content: "✔";
 }
@-webkit-keyframes emzrotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes emzrotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.emz-chatgpt-btn:disabled {
  cursor: default;
}
`;
    const cssNode = document.createElement("style");
    cssNode.appendChild(document.createTextNode(css));

    this.outerDiv.append(cssNode);
    this.outerDiv.append(this.registerBtn);
  }
  attach() {
    const picNode = document.querySelector('div[data-testid="carousel"]');
    if (!picNode) return;
    const baseDiv = picNode.parentNode;
    if (baseDiv && !baseDiv.contains(this.outerDiv)) {
      this.registerBtn.classList.remove("emz-onclic");
      this.registerBtn.classList.remove("emz-validate");
      this.registerBtn.disabled = false;
      picNode.append(this.outerDiv);
    }
  }
})();

const observer = (() => {
  let randNum = 0;
  return new MutationObserver(() => {
    const tmp = Math.random();
    randNum = tmp;
    setTimeout(async () => {
      if (randNum !== tmp) return;
      if (location.pathname.startsWith("/item/")) {
        // handleItemMutationMerc(extElem);
        extElemGpt.attach();
      } else if (location.pathname.startsWith("/shops/product/")) {
        // handleItemMutationMshop(extElem);
        extElemGpt.attach();
      }
      await handleSearchMutation();
    }, 500);
  });
})();

observer.observe(document, {
  childList: true,
  subtree: true,
});

chrome.storage.onChanged.addListener((changes) => {
  console.log("storage changed", changes);
  if (changes.stock?.newValue?.core.url === location.href) {
    extElem.style.border = "gold 2px solid";
  } else {
    extElem.style.border = "none";
  }
});
