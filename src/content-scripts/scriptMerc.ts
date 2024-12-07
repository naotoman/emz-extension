import { queryAndUpdateToken } from "./aws";
import { scrapeMerc, scrapeMshop } from "./scraper";

interface ItemState {
  isListed: boolean;
}

const batchGetItems = (() => {
  let itemCache: {
    searchUrls: string[];
    result: Map<string, ItemState>;
  } = {
    searchUrls: [],
    result: new Map(),
  };

  const isArrayEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0, n = a.length; i < n; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  return async (itemUrls: string[]): Promise<Map<string, ItemState>> => {
    // If it matches the cache, return the cache
    if (isArrayEqual(itemUrls, itemCache.searchUrls)) {
      console.log("return cached item info");
      return itemCache.result;
    }

    const query = `
      query MyQuery {
        batchGetItem(input: {urls: ${JSON.stringify(itemUrls)}}) {
          isListed
        }
      }
    `;
    const responseData = await queryAndUpdateToken(query);
    if (!responseData) {
      console.error("failed to get item info");
      return new Map();
    }
    const itemStates = responseData.batchGetItem as ItemState[];

    itemCache = {
      searchUrls: itemUrls,
      result: new Map(itemStates.map((v, i) => [itemUrls[i], v])),
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
    'li[data-testid="item-cell"] a[data-testid="thumbnail-link"]'
  );
  const itemUrls = Array.from(itemNodes).map((node) => node.href);
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
    return;
  }
  const item = {
    shippingYen,
    orgUrl: stock.stockData.core.url,
    orgImageUrls: stock.stockData.core.imageUrls,
    orgPrice: stock.stockData.core.price,
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

  // const responseData = await queryAndUpdateToken(query);
  // if (!responseData) {
  //   console.error("failed to register item");
  //   alert("登録に失敗しました");
  // }
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
  constructor() {
    const showDimensionExamples = (weightKg: number) => {
      const volume = weightKg * 5000;
      const calcDims = (r1: number, r2: number) => {
        const base = Math.cbrt(volume / (r1 * r2));
        return (
          Math.floor(base * r1) +
          " " +
          Math.floor(base * r2) +
          " " +
          Math.floor(base)
        );
      };
      return `(${calcDims(2, 1.5)}), (${calcDims(1.8, 1.3)}), (${calcDims(
        1.5,
        1.1
      )})`;
    };

    const selectShipping = document.createElement("select");
    selectShipping.className = "emmext-select";
    selectShipping.innerHTML = `
    <option value="0" selected>自動（chatgpt）</option>
    <option value="1670">小型包装物（500g 最長60cm 合計90cm）</option>
    <option value="3000">FedEx 500g ${showDimensionExamples(0.5)}</option>
    <option value="3300">FedEx 1kg ${showDimensionExamples(1)}</option>
    <option value="3700">FedEx 2kg ${showDimensionExamples(2)}</option>
    <option value="5000">FedEx 3kg ${showDimensionExamples(3)}</option>
    <option value="5800">FedEx 4kg ${showDimensionExamples(4)}</option>
    <option value="7100">FedEx 5kg ${showDimensionExamples(5)}</option>
    `;

    const selectDiv = document.createElement("div");
    selectDiv.id = "emmext-selectdiv";
    selectDiv.append(selectShipping);

    const registerBtn = document.createElement("button");
    registerBtn.id = "emmext-registerbtn";
    registerBtn.textContent = "登録";
    registerBtn.onclick = async () =>
      handleClickRegister(Number(selectShipping.value));

    this.outerDiv = document.createElement("div");
    this.outerDiv.id = "emmext-outerdiv";

    const css = `#emmext-outerdiv {
  display: flex;
  align-items: center;
  margin-top: 16px;
  height: 40px;
}
#emmext-registerbtn {
  height: 100%;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  width: 60px;
  cursor: pointer;
  font-weight: bold;
}
#emmext-selectdiv {
  height: 100%;
  margin-right: 16px;
}
.emmext-select {
  height: 100%;
  width: 120px;
  padding: 3px;
  border: 1px solid #cccccc;
  border-radius: 4px;
  font-size: 0.8rem;
}
`;
    const cssNode = document.createElement("style");
    cssNode.appendChild(document.createTextNode(css));

    this.outerDiv.append(cssNode);
    this.outerDiv.append(selectDiv);
    this.outerDiv.append(registerBtn);
  }
  attach() {
    const picNode = document.querySelector('div[data-testid="carousel"]');
    if (!picNode) return;
    const baseDiv = picNode.parentNode;
    if (baseDiv && !baseDiv.contains(this.outerDiv)) {
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
      if (location.pathname === "/search") {
        await handleSearchMutation();
      } else if (location.pathname.startsWith("/item/")) {
        // handleItemMutationMerc(extElem);
        extElemGpt.attach();
      } else if (location.pathname.startsWith("/shops/product/")) {
        // handleItemMutationMshop(extElem);
        extElemGpt.attach();
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
  if (changes.stock?.newValue?.core.url === location.href) {
    extElem.style.border = "gold 2px solid";
  } else {
    extElem.style.border = "none";
  }
});
