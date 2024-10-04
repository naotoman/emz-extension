import { ConfigParameters, getConfigType } from "./parameters.type";

const devConfig: ConfigParameters = {
  apiUrl: "https://xxx.appsync-api.ap-northeast-1.amazonaws.com/graphql",
  siteUrl: "https://example.com",
};

// const prdConfig: ConfigParameters = {
//   apiUrl: "https://yyy.appsync-api.ap-northeast-1.amazonaws.com/graphql",
//   ...
// };

export const getConfig: getConfigType = (env) => {
  if (env === "development" || env == null) return devConfig;
  // if (env === "production") return prdConfig;
  throw new Error(`${env} is not a proper environment name.`);
};
