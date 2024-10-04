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
  const itemCache: {
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

    const storage = await chrome.storage.local.get("auth");
    if (!storage.auth) {
      console.log("auth not found");
      return;
    }

    const res = await fetch(__API_URL__, {
      method: "POST",
      headers: {
        "Content-Type": "application/graphql",
        Authorization: storage.auth.idToken,
      },
      body: JSON.stringify({
        query: query,
      }),
    });

    console.log("res", res.json());

    itemCache.searchUrls = itemUrls;
    // itemCache.result = res;
    return res;
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
