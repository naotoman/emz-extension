import "./ebay.css";

const getDescription = () => {
  const desc = document
    .querySelector<HTMLIFrameElement>("#se-rte-frame__summary")
    ?.contentWindow?.document.querySelector("html")?.outerHTML;
  if (!desc) {
    throw new Error("description could not be found.");
  }
  return desc;
};

const getEbayCategory = () => {
  const categoryNode = document.querySelector(
    'div.summary__category button[name="categoryId"]'
  );
  const leafCategory = categoryNode?.textContent;
  let parentTxt = categoryNode?.nextElementSibling?.textContent;
  if (!leafCategory || !parentTxt) {
    throw new Error("category could not be found.");
  }
  if (parentTxt.startsWith("in ")) {
    parentTxt = parentTxt.slice(3); // "in " の長さは3文字
  }
  // ' > 'で分割し、各要素の前後の空白をトリム
  const parents = parentTxt.split(" > ").map((item) => item.trim());
  const categoryPath = [...parents, leafCategory];
  return categoryPath;
};

const getStoreCategories = () => {
  try {
    const categoryText = document
      .querySelector(
        'div.summary__category button[name="primaryStoreCategoryId"] span'
      )
      ?.textContent?.trim();
    const categories = categoryText?.split(" > ").map((item) => item.trim());
    if (!categories || categories.length === 0) {
      throw new Error("store categories is empty");
    }
    return categories;
  } catch (err) {
    console.error(err);
    throw new Error("ストアカテゴリが取得できませんでした。");
  }
};

const getCondition = async () => {
  const root = document.querySelector("div.summary__condition");
  const conditionId = root?.querySelector<HTMLOptionElement>(
    'select[name="condition"] option[selected]'
  )?.value;
  if (conditionId) {
    return { ebayCondition: conditionId };
  }
  const conditionDesc = root
    ?.querySelector("#summary-condition-field-value")
    ?.textContent?.trim()
    .toLowerCase();
  if (!conditionDesc) {
    return { ebayConditionSrc: conditionDesc };
  }
  throw new Error("コンディションを取得できませんでした");
};

const getConditionDescription = () => {
  const desc = document
    .querySelector<HTMLTextAreaElement>(
      'div.summary__condition textarea[name="itemConditionDescription"]'
    )
    ?.value.trim();
  if (desc) {
    return { ebayConditionDescription: desc };
  } else {
    return {};
  }
};

const getTitle = () => {
  const title = document.querySelector<HTMLInputElement>(
    'div.summary__title input[name="title"]'
  )?.value;
  if (!title) {
    throw new Error("eBayのタイトルが取得できませんでした。");
  }
  return title;
};

const getAttributeLabel = (attributeNode: Element) => {
  // UPCは無視する
  // const upcNode = attributeNode.querySelector(
  //   'div.se-field__label-container label.field__label'
  // );
  // if (upcNode) {
  //   return upcNode.textContent;
  // }
  const label = attributeNode.querySelector(
    'div.summary__attributes--label [id*="item-specific-dropdown-label"]'
  )?.textContent;
  return label || "";
};

const getAttributeValue = (attributeNode: Element) => {
  // UPCは無視する;
  // const upcNode = attributeNode.querySelector(
  //   'input[name="universalProductCode"]'
  // );
  // if (upcNode) {
  //   return [upcNode.value];
  // }

  const valueNode = attributeNode.querySelector(
    "div.summary__attributes--value"
  );
  const inputField = valueNode?.querySelector<HTMLInputElement>(
    'input[name^="attributes."]'
  );
  if (inputField) {
    return [inputField.value];
  }

  const radioField = valueNode?.querySelector(
    'button[class~="summary__attributes--pill"][aria-pressed="true"]'
  );
  if (radioField) {
    return [radioField.textContent || ""];
  }

  const selectedNode = valueNode?.querySelector(
    'span[name^="selectedOptions-attributes"]'
  );
  if (!selectedNode) {
    return [];
  }

  const selectetValues = [
    ...[...selectedNode.querySelectorAll("div.menu__item")].map((item) =>
      // FIXME: wholeTextがtypescriptでエラーになる
      // @ts-ignore
      item.querySelector("span")?.firstChild?.wholeText?.trim()
    ),
    ...[...selectedNode.querySelectorAll("div.filter-menu__item")].map((item) =>
      item
        .querySelector("span.filter-menu__text")
        // FIXME: wholeTextがtypescriptでエラーになる
        // @ts-ignore
        ?.firstChild?.wholeText?.trim()
    ),
  ]
    .filter((item) => item != null)
    .filter((item) => item);
  return selectetValues;
};

const getAttributes = () => {
  const containerNodes = document.querySelectorAll(
    "div.summary__attributes div.summary__attributes--fields"
  );
  if (containerNodes.length === 0) {
    throw new Error("attribute nodes is empty");
  }
  const attrs = [];
  for (const container of containerNodes) {
    let attrLabel = undefined;
    let attrValue = undefined;
    try {
      attrLabel = getAttributeLabel(container);
      attrValue = getAttributeValue(container);
      if (attrLabel && attrValue.length > 0 && attrValue[0]) {
        attrs.push({ name: attrLabel, values: attrValue });
      }
    } catch (err) {
      console.error(err);
      console.log({
        attrLabel: attrLabel,
        attrValue: attrValue,
      });
    }
  }
  return attrs.reduce((acc: { [prop: string]: string[] }, obj) => {
    acc[obj.name] = obj.values;
    return acc;
  }, {});
};

const handleClickRegister = async (shippingYen: number) => {
  const data = await chrome.storage.local.get(["stock"]);
  if (!data.stock) {
    console.log("stock data is empty");
    return;
  }

  try {
    const item = {
      shippingYen,
      ebayTitle: getTitle(),
      ebayDescription: getDescription(),
      ebayCategorySrc: getEbayCategory(),
      ebayStoreCategorySrc: getStoreCategories(),
      ...getCondition(),
      ...getConditionDescription(),
      ebayAspectParam: JSON.stringify(getAttributes()),
      orgUrl: data.stock.core.url,
      orgImageUrls: data.stock.core.imageUrls,
      orgPrice: data.stock.core.price,
      orgExtraParam: JSON.stringify(data.stock.extra),
    };
    console.log(item);

    // const query = `
    //   mutation MyMutation {
    //     registerItem(input: ${JSON.stringify(item)})
    //   }`;

    // const responseData = await queryAndUpdateToken(query);
    // if (!responseData) {
    //   console.error("failed to get item info");
    //   throw new Error("商品情報の登録に失敗しました");
    // }
  } catch (err) {
    console.error(err);
    alert(err);
  }
};

const extElem = new (class {
  img: HTMLImageElement;
  titleDiv: HTMLDivElement;
  outerDiv: HTMLDivElement;
  constructor() {
    this.img = document.createElement("img");
    this.img.src = "";
    this.img.id = "emmext-img";
    this.titleDiv = document.createElement("div");
    this.titleDiv.id = "emmext-titlediv";
    this.titleDiv.textContent = "";

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
    <option value="1670">小型包装物（500g 最長60cm 合計90cm）</option>
    <option value="3000" selected>FedEx 500g ${showDimensionExamples(
      0.5
    )}</option>
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

    this.outerDiv.append(registerBtn);
    this.outerDiv.append(selectDiv);
    this.outerDiv.append(this.img);
    this.outerDiv.append(this.titleDiv);

    chrome.storage.local.get(["stock"]).then((data) => {
      if (!data.stock) return;
      this.setTitle(data.stock.core.title);
      this.setImg(data.stock.core.imageUrls[0]);
    });
  }
  attach() {
    const headerNode = document.querySelector("div.header");
    if (headerNode && !headerNode.contains(this.outerDiv)) {
      headerNode.prepend(this.outerDiv);
    }
  }
  setTitle(title: string) {
    this.titleDiv.textContent = title;
  }
  setImg(src: string) {
    this.img.src = src;
  }
})();

setTimeout(() => {
  extElem.attach();
}, 500);

chrome.storage.onChanged.addListener((changes) => {
  console.log("storage changed", changes);
  if (!changes.stock) return;
  extElem.setTitle(changes.stock.newValue.core.title);
  extElem.setImg(changes.stock.newValue.core.imageUrls[0]);
});

const observer = (() => {
  let randNum = 0;
  return new MutationObserver(() => {
    const tmp = Math.random();
    randNum = tmp;
    setTimeout(() => {
      if (randNum !== tmp) return;
      console.log("mutation observed");
      document
        .querySelector<HTMLDivElement>("div.summary__photos")
        ?.style.setProperty("display", "none");
      [
        ...document.querySelectorAll<HTMLDivElement>(
          "div.summary__title div.smry--section"
        ),
      ]
        .slice(1)
        .forEach((node) => {
          node.style.setProperty("display", "none");
        });
    }, 500);
  });
})();

observer.observe(document, {
  childList: true,
  subtree: true,
});
