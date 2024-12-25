import { queryAndUpdateToken } from "./aws";
import { Merc, Mshop, scrapeMerc, scrapeMshop, ScrapeResult } from "./scraper";

const handleClick = async () => {
  let stock: ScrapeResult<Merc | Mshop>;
  if (location.pathname.startsWith("/item/")) {
    stock = scrapeMerc();
  } else if (location.pathname.startsWith("/shops/product/")) {
    stock = scrapeMshop();
  } else {
    throw new Error("invalid path");
  }

  if (stock.stockStatus === "outofstock" || !stock.stockData) {
    console.log("out of stock");
    alert("売り切れの商品は登録できません");
    return;
  }
  const item = {
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

export const createItemSubmitButton = () => {
  const outerDiv = document.createElement("div");
  outerDiv.className = "emz-isb-outerdiv";

  const registerBtn = document.createElement("button");
  registerBtn.className = "emz-isb-btn";
  registerBtn.onclick = () => {
    registerBtn.disabled = true;
    registerBtn.classList.add("emz-isb-onclic");
    handleClick()
      .then(() => {
        registerBtn.classList.remove("emz-isb-onclic");
        registerBtn.classList.add("emz-isb-validate");
      })
      .catch((e) => {
        console.error(e);
        alert("登録に失敗しました");
        registerBtn.disabled = false;
        registerBtn.classList.remove("emz-isb-onclic");
      });
  };

  outerDiv.append(registerBtn);
  return outerDiv;
};

export const createItemSubmitButtonCssNode = () => {
  const css = `.emz-isb-outerdiv {
        font-family: "Roboto", sans-serif;
        margin-top: 30px;
        width: 100%;
        height: 50px;
        text-align: center;
        display: flex;
        justify-content: center;
      }
      .emz-isb-btn {
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
        .emz-isb-btn {
          background: #333;
        }
      }
      .emz-isb-btn:hover {
        color: white;
        background: #1ECD97;
      }
      .emz-isb-btn:active {
        letter-spacing: 4px;
      }
      .emz-isb-btn:after {
        content: "SUBMIT";
      }
      .emz-isb-onclic {
        width: 50px;
        border-color: #bbbbbb;
        border-width: 3px;
        font-size: 0;
        border-left-color: #1ECD97;
        -webkit-animation: emzrotating 2s 0.25s linear infinite;
                animation: emzrotating 2s 0.25s linear infinite;
      }
      .emz-isb-onclic:after {
        content: "";
      }
      .emz-isb-onclic:hover {
        color: #1ECD97;
        background: white;
      }
      .emz-isb-validate {
        font-size: 20px;
        color: white;
        background: #1ECD97;
      }
      .emz-isb-validate:after {
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
      .emz-isb-btn:disabled {
        cursor: default;
      }
      `;
  const cssNode = document.createElement("style");
  cssNode.appendChild(document.createTextNode(css));
  return cssNode;
};
