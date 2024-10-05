export interface ConfigParameters {
  apiUrl: string;
  siteUrl: string;
  userPoolClientID: string;
}

export type getConfigType = (env: string) => ConfigParameters;
