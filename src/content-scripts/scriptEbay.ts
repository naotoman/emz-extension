import { queryAndUpdateToken } from "./aws";
import "./ebay.css";

interface UserInfo {
  shippingFees: [{ value: number; desc: string }];
  fulfillmentPolicies: [{ policyId: string; desc: string }];
}

const getDescription = () => {
  const desc = document
    .querySelector('div.summary__description textarea[name="description"]')
    ?.textContent?.trim();
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

const getCondition = () => {
  const root = document.querySelector("div.summary__condition");
  const conditionId = root?.querySelector<HTMLOptionElement>(
    'select[name="condition"] option[selected]'
  )?.value;
  if (conditionId) {
    return { ebayCondition: conditionId };
  }
  const conditionDesc = root
    ?.querySelector("#summary-condition-field-value")
    ?.textContent?.trim();
  if (conditionDesc) {
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

const handleClickRegister = async (
  shippingYen: number,
  ebayFulfillmentPolicy: string
) => {
  const data = await chrome.storage.local.get(["stock"]);
  if (!data.stock) {
    console.log("stock data is empty");
    return;
  }

  try {
    const item = {
      shippingYen,
      ebayFulfillmentPolicy,
      ebayTitle: getTitle(),
      ebayDescription: getDescription(),
      ebayCategorySrc: getEbayCategory(),
      ebayStoreCategorySrc: getStoreCategories(),
      ...getCondition(),
      ...getConditionDescription(),
      ebayAspectParam: JSON.stringify(getAttributes()),
      orgTitle: data.stock.core.title,
      orgUrl: data.stock.core.url,
      orgImageUrls: data.stock.core.imageUrls,
      orgPrice: data.stock.core.price,
      orgExtraParam: JSON.stringify(data.stock.extra),
    };
    console.log(item);

    const queryVariables = Object.entries(item)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join();

    const query = `
      mutation MyMutation {
        registerItem(input: {${queryVariables}})
      }`;

    const responseData = await queryAndUpdateToken(query);
    if (!responseData) {
      console.error("failed to get item info");
      throw new Error("商品情報の登録に失敗しました");
    }
  } catch (err) {
    console.error(err);
    alert(err);
  }
};

const getUserInfo = async () => {
  const query = `
    query MyQuery {
      getUserInfo {
        shippingFees {
          desc
          value
        }
        fulfillmentPolicies {
          desc
          policyId
        }
      }
    }
  `;
  const responseData = await queryAndUpdateToken(query);
  console.log(responseData);
  return responseData.getUserInfo as UserInfo;
};

const ExtensionElements = class {
  img: HTMLImageElement;
  titleDiv: HTMLDivElement;
  outerDiv: HTMLDivElement;
  selectShipping: HTMLSelectElement;
  inputShipping: HTMLInputElement;
  selectFulfilment: HTMLSelectElement;
  inputFulfilment: HTMLInputElement;

  constructor() {
    this.img = document.createElement("img");
    this.img.src = "";
    this.img.id = "emmext-img";
    this.titleDiv = document.createElement("div");
    this.titleDiv.id = "emmext-titlediv";
    this.titleDiv.textContent = "";

    const shippingLabel = document.createElement("label");
    shippingLabel.textContent = "送料:";
    shippingLabel.className = "emmext-label";

    // Create select for shipping
    this.selectShipping = document.createElement("select");
    this.selectShipping.className = "emmext-select";

    // Create input for shipping
    this.inputShipping = document.createElement("input");
    this.inputShipping.type = "number";
    this.inputShipping.className = "emmext-freetext";
    this.inputShipping.style.display = "none";

    const shippingDiv = document.createElement("div");
    shippingDiv.append(shippingLabel);
    shippingDiv.append(this.selectShipping);
    shippingDiv.append(this.inputShipping);

    // Create toggle for shipping
    const shippingToggle = document.createElement("input");
    shippingToggle.type = "checkbox";
    shippingToggle.id = "emmext-shipping-toggle";
    shippingToggle.className = "emmext-toggleCheckbox";

    // Add event listener for shipping toggle
    shippingToggle.addEventListener("change", (e) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      this.selectShipping.style.display = isChecked ? "none" : "inline-block";
      this.inputShipping.style.display = isChecked ? "inline-block" : "none";
    });

    const shippingToggleLabel = document.createElement("label");
    shippingToggleLabel.setAttribute("for", "emmext-shipping-toggle");
    shippingToggleLabel.className = "emmext-toggleContainer";

    const shippingToggleDiv1 = document.createElement("div");
    shippingToggleDiv1.textContent = "選択";
    const shippingToggleDiv2 = document.createElement("div");
    shippingToggleDiv2.textContent = "入力";

    shippingToggleLabel.append(shippingToggleDiv1);
    shippingToggleLabel.append(shippingToggleDiv2);

    shippingDiv.append(shippingToggle);
    shippingDiv.append(shippingToggleLabel);

    const fulfilmentLabel = document.createElement("label");
    fulfilmentLabel.textContent = "配送ポリシー:";
    fulfilmentLabel.className = "emmext-label";

    // Create select for fulfillment
    this.selectFulfilment = document.createElement("select");
    this.selectFulfilment.className = "emmext-select";

    // Create input for fulfillment
    this.inputFulfilment = document.createElement("input");
    this.inputFulfilment.type = "text";
    this.inputFulfilment.className = "emmext-freetext";
    this.inputFulfilment.style.display = "none";

    const fulfilmentDiv = document.createElement("div");
    fulfilmentDiv.append(fulfilmentLabel);
    fulfilmentDiv.append(this.selectFulfilment);
    fulfilmentDiv.append(this.inputFulfilment);

    // Create toggle for fulfillment
    const fulfillmentToggle = document.createElement("input");
    fulfillmentToggle.type = "checkbox";
    fulfillmentToggle.id = "emmext-fulfillment-toggle";
    fulfillmentToggle.className = "emmext-toggleCheckbox";

    // Add event listener for fulfillment toggle
    fulfillmentToggle.addEventListener("change", (e) => {
      const isChecked = (e.target as HTMLInputElement).checked;
      this.selectFulfilment.style.display = isChecked ? "none" : "inline-block";
      this.inputFulfilment.style.display = isChecked ? "inline-block" : "none";
    });

    const fulfillmentToggleLabel = document.createElement("label");
    fulfillmentToggleLabel.setAttribute("for", "emmext-fulfillment-toggle");
    fulfillmentToggleLabel.className = "emmext-toggleContainer";

    const fulfillmentToggleDiv1 = document.createElement("div");
    fulfillmentToggleDiv1.textContent = "選択";
    const fulfillmentToggleDiv2 = document.createElement("div");
    fulfillmentToggleDiv2.textContent = "入力";

    fulfillmentToggleLabel.append(fulfillmentToggleDiv1);
    fulfillmentToggleLabel.append(fulfillmentToggleDiv2);

    fulfilmentDiv.append(fulfillmentToggle);
    fulfilmentDiv.append(fulfillmentToggleLabel);

    const selectDiv = document.createElement("div");
    selectDiv.id = "emmext-selectdiv";

    selectDiv.append(fulfilmentDiv);
    selectDiv.append(shippingDiv);

    const registerBtn = document.createElement("button");
    registerBtn.className = "emmext-registerbtn";
    registerBtn.onclick = () => {
      registerBtn.disabled = true;
      registerBtn.classList.add("emz-onclic");
      this.handleClickRegister()
        .then(() => {
          registerBtn.classList.remove("emz-onclic");
          registerBtn.classList.add("emz-validate");
        })
        .catch((e) => {
          console.error(e);
          alert("登録に失敗しました");
        })
        .finally(() => {
          setTimeout(() => {
            registerBtn.disabled = false;
            registerBtn.classList.remove("emz-onclic");
            registerBtn.classList.remove("emz-validate");
          }, 1200);
        });
    };

    this.outerDiv = document.createElement("div");
    this.outerDiv.id = "emmext-outerdiv";

    this.outerDiv.append(this.img);
    this.outerDiv.append(this.titleDiv);
    this.outerDiv.append(selectDiv);
    this.outerDiv.append(registerBtn);
  }
  setTitle(title: string) {
    this.titleDiv.textContent = title;
  }
  setImg(src: string) {
    this.img.src = src;
  }
  setShippingOptions(shippingFees: UserInfo["shippingFees"]) {
    this.selectShipping.innerHTML = shippingFees
      .map(
        (fee) =>
          `<option value="${fee.value}">${fee.value}円 ${fee.desc}</option>`
      )
      .join("");
  }
  setFulfilmentOptions(fulfillmentPolicies: UserInfo["fulfillmentPolicies"]) {
    this.selectFulfilment.innerHTML = fulfillmentPolicies
      .map(
        (policy) =>
          `<option value="${policy.policyId}">${policy.policyId} ${policy.desc}</option>`
      )
      .join("");
  }
  handleClickRegister() {
    const shippingValue =
      this.inputShipping.style.display === "none"
        ? this.selectShipping.value
        : this.inputShipping.value;

    const fulfillmentValue =
      this.inputFulfilment.style.display === "none"
        ? this.selectFulfilment.value
        : this.inputFulfilment.value;

    return handleClickRegister(Number(shippingValue), fulfillmentValue);
  }
};

const main = async () => {
  const storage = await chrome.storage.local.get(["isGptEnabled", "stock"]);
  if (storage.isGptEnabled) return;
  const extElems = new ExtensionElements();
  if (storage.stock) {
    extElems.setTitle(storage.stock.core.title);
    extElems.setImg(storage.stock.core.imageUrls[0]);
  }
  const userInfo = await getUserInfo();
  extElems.setShippingOptions(userInfo.shippingFees);
  extElems.setFulfilmentOptions(userInfo.fulfillmentPolicies);

  setTimeout(() => {
    const headerNode = document.querySelector("div.header");
    if (headerNode && !headerNode.contains(extElems.outerDiv)) {
      headerNode.prepend(extElems.outerDiv);
    }
  }, 500);

  chrome.storage.onChanged.addListener((changes) => {
    console.log("storage changed", changes);
    if (!changes.stock) return;
    extElems.setTitle(changes.stock.newValue.core.title);
    extElems.setImg(changes.stock.newValue.core.imageUrls[0]);
  });
};

main().catch((err) => {
  console.error(err);
});
