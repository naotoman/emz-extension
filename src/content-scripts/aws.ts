const getIdToken = async (refreshToken: string) => {
  const res = await fetch("https://cognito-idp.ap-northeast-1.amazonaws.com", {
    method: "POST",
    headers: {
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      "Content-Type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify({
      AuthFlow: "REFRESH_TOKEN",
      ClientId: __USER_POOL_CLIENT_ID__,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
  });
  console.log(res.status, res.statusText);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  console.log(data);
  return data.AuthenticationResult.IdToken as string;
};

const apiPost = async (query: string, idToken: string) => {
  const res = await fetch(__API_URL__, {
    method: "POST",
    headers: {
      "Content-Type": "application/graphql",
      Authorization: idToken,
    },
    body: JSON.stringify({
      query: query,
    }),
  });

  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data.data;
};

export const queryAndUpdateToken = async (query: string) => {
  const storage = await chrome.storage.local.get("auth");
  if (!storage.auth) {
    console.log("auth not found");
    return null;
  }
  let data = await apiPost(query, storage.auth.idToken);
  if (data) {
    return data;
  }

  console.log("query failed. refreshing token...");
  const idToken = await getIdToken(storage.auth.refreshToken);
  if (!idToken) {
    console.log("failed to refresh token");
    await chrome.storage.local.remove("auth");
    return null;
  }
  await chrome.storage.local.set({
    auth: { idToken, refreshToken: storage.auth.refreshToken },
  });
  data = await apiPost(query, idToken);
  return data;
};
