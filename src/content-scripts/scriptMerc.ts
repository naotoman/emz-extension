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
      result: new Map(
        itemStates.filter(Boolean).map((v, i) => [itemUrls[i], v])
      ),
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
  const registeredItems = await batchGetItems(itemUrls);
  console.log("registeredItems", registeredItems);

  itemNodes.forEach((node) => {
    const picNode = node.querySelector("picture");
    if (picNode == null) {
      console.log("[ERROR] picture tag was not found.");
      return;
    }
    const overlayDivs = picNode.querySelectorAll("div.extoverlay");
    if (registeredItems.has(node.href) && overlayDivs.length === 0) {
      overrideItem(picNode, registeredItems.get(node.href)!);
    } else if (!registeredItems.has(node.href)) {
      overlayDivs.forEach((element) => element.remove());
    }
  });
};

const handleItemMutationMerc = (extElem: Element) => {
  const main = document.querySelector("main");
  if (!main) return;
  main.onclick = async () => {
    const stock = scrapeMerc();
    if (stock.stockStatus === "outofstock") {
      console.log("out of stock");
      return;
    }
    await chrome.storage.local.set({
      stock: stock.stockData,
    });
    console.log("set stock", stock);
  };
  if (!main.contains(extElem)) {
    main.prepend(extElem);
  }
};

const handleItemMutationMshop = (extElem: Element) => {
  const main = document.querySelector("main");
  if (!main) return;
  main.onclick = async () => {
    const stock = scrapeMshop();
    if (stock.stockStatus === "outofstock") {
      console.log("out of stock");
      return;
    }
    await chrome.storage.local.set({
      stock: stock.stockData,
    });
    console.log("set stock", stock);
  };
  if (!main.contains(extElem)) {
    main.prepend(extElem);
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
        handleItemMutationMerc(extElem);
      } else if (location.pathname.startsWith("/shops/product/")) {
        handleItemMutationMshop(extElem);
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
