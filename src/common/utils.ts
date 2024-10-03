export const waitQuerySelectorAll = async <T extends Element>(
  query: string,
  node: Element | Document = document
) => {
  let oldObjs = node.querySelectorAll<T>(query);
  let newObjs = oldObjs;
  for (
    let i = 0;
    i < 50 &&
    (i === 0 || newObjs.length === 0 || oldObjs.length !== newObjs.length);
    i++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    oldObjs = newObjs;
    newObjs = node.querySelectorAll<T>(query);
  }
  return newObjs;
};

export const wrappedFetch = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  const data: T = await response.json();
  return data;
};
