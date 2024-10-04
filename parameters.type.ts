export interface ConfigParameters {
  apiUrl: string;
  siteUrl: string;
}

export type getConfigType = (env: string) => ConfigParameters;
