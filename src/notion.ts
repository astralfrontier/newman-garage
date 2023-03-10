import { SearchResult } from "../netlify/functions/notion-search";

async function callNotion(endpoint: string, body: object): Promise<any> {
  const response = await fetch(`/.netlify/functions/${endpoint}`, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.blob();
    throw new Error(await error.text());
  }
  const data = await response.json();
  return data;
}

export async function notionSearch(query: string, access_token: string): Promise<SearchResult[]> {
  const data: SearchResult[] = await callNotion("notion-search", { query, access_token });
  return data;
}

export async function notionRetrieve(id: string, access_token: string): Promise<any> {
  const data = await callNotion("notion-retrieve", { id, access_token });
  return data;
}

export function notionErrorText(error: any): string {
  // A lot could go wrong. Try and present something helpful.
  let errorText;
  if (error.message) {
    try {
      let errorData = JSON.parse(error.message);
      let body = JSON.parse(errorData.body);
      errorText = body.message;
    } catch (e) {
      errorText = `${error.message}`
    }
  }
  // Last chance
  if (!errorText) {
    errorText = JSON.stringify(error);
  }
  return errorText;
}
