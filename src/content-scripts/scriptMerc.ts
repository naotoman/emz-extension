import { queryAndUpdateToken } from "./aws";
import {
  createItemSubmitButton,
  createItemSubmitButtonCssNode,
} from "./ItemSubmitButton";

let itemSubmitButton = createItemSubmitButton();
const itemSubmitButtonCssNode = createItemSubmitButtonCssNode();

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

const renderItemThumbnails = async () => {
  const itemNodes = document.querySelectorAll<HTMLAnchorElement>(
    'a[data-location$=":item_thumbnail"]'
  );

  itemNodes.forEach((node) => {
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "emz-thumbnail";
    overlayDiv.style.cssText =
      "content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 998;";
    overlayDiv.onclick = async (e) => {
      e.preventDefault();
      const query = `
        mutation MyMutation {
          pushItemToSqs(input: {orgUrl: ${JSON.stringify(node.href)}})
        }`;
      console.log(query);
      const responseData = await queryAndUpdateToken(query);
      if (!responseData) {
        throw new Error("failed to register item");
      }
    };
    const picNode = node.querySelector("picture");
    if (picNode && !picNode.querySelector("div.emz-thumbnail")) {
      picNode.append(overlayDiv);
    }
  });

  const itemUrls = new Set(Array.from(itemNodes).map((node) => node.href));
  const searchedItems = await batchGetItems(itemUrls);
  console.log("searchedItems", searchedItems);

  itemNodes.forEach((node) => {
    const picNode = node.querySelector("picture");
    const overlayDiv =
      picNode?.querySelector<HTMLDivElement>("div.emz-thumbnail");
    if (searchedItems.get(node.href) && overlayDiv) {
      overlayDiv.style.cssText =
        "content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); z-index: 998;";
    }
  });
};

const renderWholeExtension = async () => {
  if (
    location.pathname.startsWith("/shops/product/") ||
    location.pathname.startsWith("/item/")
  ) {
    const picNode = document.querySelector('div[data-testid="carousel"]');
    const baseDiv = picNode?.parentNode;
    if (baseDiv && !baseDiv.contains(itemSubmitButton)) {
      itemSubmitButton = createItemSubmitButton();
      baseDiv.append(itemSubmitButton);
    }
  }
  const headerNode = document.querySelector("header");
  if (headerNode && !headerNode.contains(itemSubmitButtonCssNode)) {
    headerNode.append(itemSubmitButtonCssNode);
  }
  await renderItemThumbnails();
};

const observer = (() => {
  let randNum = 0;
  return new MutationObserver(() => {
    const tmp = Math.random();
    randNum = tmp;
    setTimeout(async () => {
      if (randNum !== tmp) return;
      console.log("mutation observer triggered");
      await renderWholeExtension();
    }, 500);
  });
})();

observer.observe(document, {
  childList: true,
  subtree: true,
});
