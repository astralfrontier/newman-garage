import pascalcase from "pascalcase";
import { filter, find, head, isNil, map, pluck, propEq, reject } from "ramda";

import {
  DeckData,
  Palette,
  ReferenceId,
  Relationship,
  Setup,
} from "../netlify/functions/notion-retrieve";

/**
 * Turn a card name, e.g. "Foo Bar" into a pascal-cased slug, e.g. "FooBar"
 * @param input a card name or other string
 * @returns a pascal-cased slug
 */
export function identifier(input: string): string {
  return pascalcase(input.replace(/['"-]+/g, ""));
}

export function setupOrderNumber(card: Setup): number {
  const orderNumber = card.tags.find((tag) => parseInt(tag)) || "1";
  return parseInt(orderNumber) || 1;
}

export function findCharacterSetupCards(setup: Setup[]): Setup[] {
  const primaryCards = reject(
    (card: Setup) =>
      card.tags.includes("Hero Variant") || card.tags.includes("B"),
    setup
  );
  const candidates = primaryCards.length > 0 ? primaryCards : setup;
  const sortedCandidates = candidates.toSorted(
    (a, b) => setupOrderNumber(a) - setupOrderNumber(b)
  );
  return sortedCandidates || setup;
}

/**
 * Since Setup can have multiple entries, e.g. Villain A and Villain B,
 * find the card that represents the main character or environment
 * @param setup all setup cards in the deck
 * @returns the primary setup card
 */
export function findPrimarySetupCard(setup: Setup[]): Setup {
  const primaryCards = reject(
    (card: Setup) =>
      card.tags.includes("Hero Variant") ||
      card.tags.includes("B") ||
      setupOrderNumber(card) > 1,
    setup
  );
  const candidates = primaryCards.length > 0 ? primaryCards : setup;
  const sortedCandidates = candidates.toSorted(
    (a, b) => setupOrderNumber(a) - setupOrderNumber(b)
  );
  return head(sortedCandidates) || setup[0];
}

export function idToPalette(
  deckData: DeckData,
  id: ReferenceId<Palette> | undefined
): Palette | undefined {
  return find(propEq(id, "id"), deckData.palettes);
}

export function idToNemesis(
  deckData: DeckData,
  ids: ReferenceId<Relationship>[],
  keyName: string = "nemesisIdentifiers"
): { [key: string]: string[] } {
  const matchingNemeses = filter(
    (nemesis) => ids.includes(nemesis.id),
    deckData.relationships
  );
  const nemesisNames = pluck("name", matchingNemeses);
  const nemesisIdentifiers = map(
    (name) => name.replace(/Character$/, ""),
    nemesisNames
  );
  const O: any = {};
  if (nemesisIdentifiers.length) {
    O[keyName] = nemesisIdentifiers;
  }
  return O;
}
