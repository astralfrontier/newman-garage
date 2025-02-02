import { Handler } from "@netlify/functions";
import { Client } from "@notionhq/client";

import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
  DatabaseObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { find, map, path, pathEq, propEq, reject, values } from "ramda";

interface SearchHandlerRequest {
  query: string;
  access_token: string;
}

export interface SearchResult {
  id: string;
  title: string;
  cover: string | undefined | null;
  url: string;
}

function notionResultToSearchResult(
  notionResult:
    | PageObjectResponse
    | PartialPageObjectResponse
    | PartialDatabaseObjectResponse
    | DatabaseObjectResponse
): SearchResult {
  const result = notionResult as PageObjectResponse;
  const titleProperty = find(
    propEq("title", "type"),
    values(result.properties)
  );
  return {
    id: result.id,
    title: path(["title", 0, "plain_text"], titleProperty) || "No Title",
    cover: path(["cover", "external", "url"], result),
    url: result.url,
  };
}

const notionSearchHandler: Handler = async (event, _context) => {
  const body: SearchHandlerRequest = JSON.parse(event.body || "");

  const notion = new Client({
    auth: body.access_token,
  });

  try {
    let has_more: boolean = true;
    let start_cursor: string | undefined = undefined;
    let nonDatabasePages: (
      | PageObjectResponse
      | PartialPageObjectResponse
      | PartialDatabaseObjectResponse
      | DatabaseObjectResponse
    )[] = [];

    while (has_more) {
      const response = await notion.search({
        query: body.query,
        filter: {
          value: "page",
          property: "object",
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
        start_cursor,
        page_size: 25,
      });
      nonDatabasePages = nonDatabasePages.concat(
        reject(pathEq("database_id", ["parent", "type"]), response.results)
      );
      start_cursor = response.next_cursor || undefined;
      has_more = response.has_more;
    }

    const final: SearchResult[] = map(
      notionResultToSearchResult,
      nonDatabasePages
    );

    return {
      statusCode: 200,
      body: JSON.stringify(final),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      body: JSON.stringify(e),
    };
  }
};

export { notionSearchHandler as handler };
