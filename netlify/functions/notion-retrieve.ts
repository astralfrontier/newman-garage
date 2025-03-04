import { Handler } from "@netlify/functions";
import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  ChildDatabaseBlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import {
  concat,
  difference,
  filter,
  join,
  keys,
  map,
  pathOr,
  pluck,
  propOr,
  reduce,
} from "ramda";

interface RetrieveHandlerRequest {
  id: string;
  access_token: string;
}

/**
 * Rich text handling:
 *
 * RichText is an array of RichTextBlock objects.
 * Each block contains text and a list of booleans, indicating which markup applies to that block.
 * To turn rich text into plain text, concatenate all the "text" properties of the RichText array.
 * We capture more attributes (e.g. strikethrough, code, color) than Sentinels actually supports,
 * just in case.
 */

export interface RichTextBlock {
  text: string;
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}

export type RichText = RichTextBlock[];

export type ReferenceId<T> = string;

export interface DeckData {
  palettes: Palette[];
  setup: Setup[];
  cards: Card[];
  relationships: Relationship[];
}

export interface Palette {
  id: ReferenceId<Palette>;
  name: string;
  scaling: string;
  top_color: string;
  box_color: string;
  bottom_color: string;
  art_credit: RichText;
}

export interface Setup {
  id: ReferenceId<Setup>;
  name: string;
  palette?: ReferenceId<Palette> | undefined;
  expansion: string;
  rating: number | null;
  hp: number | null;
  tags: string[];
  icons: string[];
  hero_power_name: string;
  hero_power: RichText;
  hero_incap_icons: string[];
  hero_incap: RichText;
  villain_title: string;
  villain_setup: RichText;
  villain_effects: RichText;
  advanced: RichText;
  challenge_name: RichText;
  challenge: RichText;
  nemesis: ReferenceId<Relationship>[];
}

export interface Card {
  id: ReferenceId<Card>;
  name: string;
  palette?: ReferenceId<Palette> | undefined;
  quantity: number;
  keywords: string[];
  icons: string[];
  hp: number | null;
  effects: RichText;
  powers: RichText;
  quote_text: RichText;
  nemesis: ReferenceId<Relationship>[];
}

export interface Relationship {
  id: ReferenceId<Relationship>;
  name: string;
  spoken_by?: ReferenceId<Setup>[] | undefined;
  opening_line: RichText;
}

/**
 * Return a Notion page property by name.
 * Notion objects have a "type" property,
 * then a data property named the same as the value of "type",
 * so just return that.
 */
function prop(data: PageObjectResponse, name: string): any {
  const propData = data.properties[name];
  if (propData) {
    return propOr(null, propData.type, propData);
  }
  // TODO: else throw error
}

function stripSmartQuotes(input: string): string {
  return input.replaceAll(/[‘’]/g, "'").replaceAll(/[“”]/g, '"');
}

function richtext(data: any[]): RichText {
  return map(
    (block) => ({
      text: stripSmartQuotes(block.plain_text),
      bold: block.annotations.bold,
      italic: block.annotations.italic,
      strikethrough: block.annotations.strikethrough,
      underline: block.annotations.underline,
      code: block.annotations.code,
      color: block.annotations.color,
    }),
    data || []
  );
}

function plaintext(data: any): string {
  return stripSmartQuotes(join("", pluck("plain_text", data)));
}

/**
 * Return an array of strings from a Notion select field
 * @param data
 * @returns
 */
function tag(data: any): string {
  return data?.name;
}

/**
 * Return an array of strings from a Notion multi-select field
 * @param data
 * @returns
 */
function tags(data: any): string[] {
  return pluck("name", data);
}

function id<T>(data: any): ReferenceId<T> {
  return data[0]?.id;
}

function ids<T>(data: any): ReferenceId<T>[] {
  return pluck("id", data);
}

function parsePalette(data: PageObjectResponse[]): Palette[] {
  return map(
    (row) => ({
      id: row.id,
      name: plaintext(prop(row, "Name")),
      scaling: tag(prop(row, "Scaling")),
      top_color: plaintext(prop(row, "Top Color")),
      box_color: plaintext(prop(row, "Box Color")),
      bottom_color: plaintext(prop(row, "Bottom Color")),
      art_credit: richtext(prop(row, "Art Credit")),
    }),
    data
  );
}

function parseSetup(data: PageObjectResponse[]): Setup[] {
  return map(
    (row) => ({
      id: row.id,
      name: plaintext(prop(row, "Name")),
      palette: id<Palette>(prop(row, "Palette")),
      expansion: plaintext(prop(row, "Expansion")),
      rating: prop(row, "Rating"),
      hp: prop(row, "HP"),
      tags: tags(prop(row, "Tags")),
      icons: tags(prop(row, "Icons")),
      hero_power_name: plaintext(prop(row, "Hero Power Name")),
      hero_power: richtext(prop(row, "Hero Power")),
      hero_incap_icons: tags(prop(row, "Hero Incap Icons")),
      hero_incap: richtext(prop(row, "Hero Incap")),
      villain_title: plaintext(prop(row, "Villain Title")),
      villain_setup: richtext(prop(row, "Villain Setup")),
      villain_effects: richtext(prop(row, "Villain Effects")),
      advanced: richtext(prop(row, "Advanced")),
      challenge_name: richtext(prop(row, "Challenge Name")),
      challenge: richtext(prop(row, "Challenge")),
      nemesis: ids<Relationship>(prop(row, "Nemesis")),
    }),
    data
  );
}

function parseCards(data: PageObjectResponse[]): Card[] {
  return map(
    (row) => ({
      id: row.id,
      name: plaintext(prop(row, "Name")),
      palette: id<Palette>(prop(row, "Palette")),
      quantity: prop(row, "Quantity") || 1,
      keywords: tags(prop(row, "Keywords")),
      icons: tags(prop(row, "Icons")),
      hp: prop(row, "HP"),
      effects: richtext(prop(row, "Effects")),
      powers: richtext(prop(row, "Powers")),
      quote_text: richtext(prop(row, "Quote Text")),
      nemesis: ids<Relationship>(prop(row, "Nemesis")),
    }),
    data
  );
}

function parseRelationships(data: PageObjectResponse[]): Relationship[] {
  return map(
    (row) => ({
      id: row.id,
      name: plaintext(prop(row, "Name")),
      spoken_by: ids<Setup>(prop(row, "Spoken By")),
      opening_line: richtext(prop(row, "Opening Line")),
    }),
    data
  );
}

/**
 * Retrieves all the blocks on a page or database and returns them
 * @param block_id the GUID of the block to retrieve
 */
async function fetchBlock(notion: Client, block_id: string) {
  let has_more: boolean = true;
  let start_cursor: string | undefined = undefined;
  let data: (PartialBlockObjectResponse | BlockObjectResponse)[] = [];

  while (has_more) {
    const response = await notion.blocks.children.list({
      block_id,
      start_cursor,
      page_size: 50,
    });
    data = data.concat(response.results);
    start_cursor = response.next_cursor || undefined;
    has_more = response.has_more;
  }

  return data;
}

async function fetchDatabase(notion: Client, database_id: string) {
  let has_more: boolean = true;
  let start_cursor: string | undefined = undefined;
  let data: PageObjectResponse[] = [];

  while (has_more) {
    const response = await notion.databases.query({
      database_id,
      start_cursor,
      page_size: 50,
    });
    data = data.concat(response.results as PageObjectResponse[]);
    start_cursor = response.next_cursor || undefined;
    has_more = response.has_more;
  }

  return data;
}

const notionRetrieveHandler: Handler = async (event, _context) => {
  const body: RetrieveHandlerRequest = JSON.parse(event.body || "");

  const notion = new Client({
    auth: body.access_token,
  });

  try {
    const childBlocks = await fetchBlock(notion, body.id);
    const databaseBlocks = filter(
      (block) => propOr("unknown", "type", block) === "child_database",
      childBlocks as ChildDatabaseBlockObjectResponse[]
    );
    const databaseNames = map(
      (database) => pathOr("NO_NAME", ["child_database", "title"], database),
      databaseBlocks
    );

    const databaseContents = await Promise.all(
      map((database) => fetchDatabase(notion, database.id), databaseBlocks)
    );

    const databasesByName: { [key: string]: PageObjectResponse[] } = {};
    for (let i = 0; i < databaseNames.length; i++) {
      databasesByName[databaseNames[i]] = databaseContents[i];
    }

    const missingKeys = difference(keys(databasesByName), [
      "Palettes",
      "Setup",
      "Cards",
      "Relationships",
    ]);
    if (missingKeys.length) {
      const errorMessage = `Missing databases: ${missingKeys.join(", ")}`;
      console.log(errorMessage);
      return {
        statusCode: 500,
        body: errorMessage,
      };
    }

    const palettes = parsePalette(databasesByName["Palettes"]);
    const setup = parseSetup(databasesByName["Setup"]);
    const cards = parseCards(databasesByName["Cards"]);
    const relationships = parseRelationships(databasesByName["Relationships"]);

    if (!palettes || !setup || !cards || !relationships) {
      return {
        statusCode: 500,
        body: JSON.stringify({ palettes, setup, cards, relationships }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ palettes, setup, cards, relationships }),
      };
    }
  } catch (e: any) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify(e),
    };
  }
};

export { notionRetrieveHandler as handler };
