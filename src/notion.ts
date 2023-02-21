export interface SearchResult {
  id: string;
  title: string;
  url: string;
}

async function callNotion(endpoint: string, body: object): Promise<any> {
  const response = await fetch(`/.netlify/functions/${endpoint}`, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    redirect: "follow",
    body: JSON.stringify(body)
  })
  const data = await response.json()
  return data
}

export async function notionSearch(query: string): Promise<SearchResult[]> {
  const data: SearchResult[] = await callNotion("notion-search", {query})
  return data;
}

export async function notionRetrieve(id: string): Promise<any> {
  const data = await callNotion("notion-retrieve", {id})
  return data;
}