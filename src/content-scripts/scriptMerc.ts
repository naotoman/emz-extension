import { queryAndUpdateToken } from "./aws";

interface ItemState {
  isListed: boolean;
}

const scrapeItemPage = () => {
  // TODO: Implement
  return {
    url: location.href,
  };
};

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

  return async (itemUrls: string[]) => {
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

const handleSearchMutation = async () => {
  const itemNodes = document.querySelectorAll<HTMLAnchorElement>(
    'li[data-testid="item-cell"] a[data-testid="thumbnail-link"]'
  );
  const itemUrls = Array.from(itemNodes).map((node) => node.href);
  const registeredItems = await batchGetItems(itemUrls);
  console.log("registeredItems", registeredItems);
};

const handleItemMutation = (extElem: Element) => {
  const main = document.querySelector("main");
  if (!main) return;
  main.onclick = async () => {
    const stock = scrapeItemPage();
    await chrome.storage.local.set({
      stock: stock,
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
        handleItemMutation(extElem);
      } else if (location.pathname.startsWith("/shops/product/")) {
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
  if (changes.stock?.newValue?.url === location.href) {
    extElem.style.border = "gold 2px solid";
  } else {
    extElem.style.border = "none";
  }
});
