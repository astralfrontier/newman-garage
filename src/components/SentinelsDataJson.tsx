import {
  assoc,
  concat,
  difference,
  filter,
  find,
  flatten,
  groupBy,
  includes,
  isEmpty,
  isNil,
  join,
  map,
  or,
  partition,
  pluck,
  prop,
  propEq,
  reduce,
  reject,
  sortBy,
  split,
  startsWith,
  trim,
} from "ramda";
import { useMemo } from "react";

import {
  DeckData,
  Relationship,
  RichText,
  Setup,
} from "../../netlify/functions/notion-retrieve";
import {
  findCharacterSetupCards,
  findPrimarySetupCard,
  identifier,
  idToNemesis,
  idToPalette,
  setupOrderNumber,
} from "../utility";
import CopyableText from "./CopyableText";
import { SentinelsDataDisplayProps } from "./SentinelsData";

function richtextOneline(input: RichText): string {
  const blocks = map((block) => {
    let text = block.text.replaceAll("[H]", "{H}");
    if (block.italic) {
      text = `[i]${text}[/i]`;
    }
    if (block.bold) {
      text = `[b]${text}[/b]`;
    }
    if (block.underline) {
      text = `[u]${text}[/u]`;
    }
    return text;
  }, input);

  return join("", blocks);
}

function richtext(input: RichText): string[] {
  return split("\n", richtextOneline(input));
}

function deckOpeningLines(deckData: DeckData, speaker: Setup) {
  const [defaultQuote, everythingElse] = partition(
    propEq("default", "name"),
    deckData.relationships
  );

  const sortedRelationships = filter(
    (relationship: Relationship): boolean =>
      isNil(relationship.spoken_by) || isEmpty(relationship.spoken_by)
        ? true
        : includes(speaker.id)(relationship.spoken_by),
    [...defaultQuote, ...sortBy(prop("name"), everythingElse)]
  );

  const openingLines = reject(
    isEmpty,
    reduce(
      (lines, line: Relationship) =>
        assoc(line.name, richtextOneline(line.opening_line), lines),
      {},
      sortedRelationships
    )
  );

  return openingLines;
}

function heroCardToJson(
  deckData: DeckData,
  hero: Setup,
  variantTemplate?: Setup
) {
  if (hero.tags.includes("Hero")) {
    const openingLines = deckOpeningLines(deckData, hero);
    const nemesisIdentifiers = idToNemesis(deckData, hero.nemesis);

    const palette = idToPalette(deckData, hero.palette);

    const identifiers = variantTemplate
      ? {
          identifier: identifier(`${variantTemplate.name} Character`),
          promoIdentifier: identifier(`${hero.name} Character`),
        }
      : {
          identifier: identifier(`${hero.name} Character`),
        };

    return [
      {
        ...identifiers,
        count: 1,
        title: hero.name,
        body: hero.hero_power_name,
        backgroundColor: palette?.box_color || "ffffff",
        foilBackgroundColor: palette?.box_color || "ffffff",
        hitpointsColor: palette?.bottom_color || "ffffff",
        character: true,
        powers: richtext(hero.hero_power),
        icons: hero.icons,
        hitpoints: hero.hp,
        ...nemesisIdentifiers,
        incapacitatedAbilities: richtext(hero.hero_incap),
        flippedIcons: hero.hero_incap_icons,
        openingLines,
        complexity: hero.rating,
      },
    ];
  } else {
    return [];
  }
}

function villainCardPairToJson(deckData: DeckData, A: Setup, B: Setup) {
  const openingLines = deckOpeningLines(deckData, A);
  const nemesisIdentifiers = idToNemesis(deckData, A.nemesis);
  const flippedNemesisIdentifiers = idToNemesis(
    deckData,
    B.nemesis,
    "flippedNemesisIdentifiers"
  );

  const A_palette = idToPalette(deckData, A.palette);

  return [
    {
      identifier: identifier(`${A.name} Character`),
      count: 1,
      title: A.name,
      keywords: ["villain", ...difference(["Villain", "A"], A.tags)],
      body: A.villain_title,
      backgroundColor: A_palette?.box_color || "ffffff",
      foilBackgroundColor: A_palette?.box_color || "ffffff",
      character: true,
      hitpoints: A.hp,
      ...nemesisIdentifiers,
      setup: richtext(A.villain_setup),
      gameplay: richtext(A.villain_effects),
      advanced: richtextOneline(A.advanced),
      icons: A.icons,
      flippedHitpoints: B.hp,
      flippedBody: B.villain_title,
      flippedGameplay: richtext(B.villain_effects),
      flippedAdvanced: richtextOneline(B.advanced),
      flippedIcons: B.icons,
      ...flippedNemesisIdentifiers,
      difficulty: A.rating,
      challengeTitle: richtextOneline(A.challenge_name),
      challengeText: richtextOneline(A.challenge),
      openingLines,
    },
  ];
}

function villainCardsToJson(deckData: DeckData) {
  // Group keys have to be strings apparently
  const cardsGroupedInOrder = groupBy(
    (card: Setup) => `${setupOrderNumber(card)}`,
    deckData.setup
  );
  // ... but we only sort numerically
  const sortedKeys = Object.keys(cardsGroupedInOrder)
    .map((key) => parseInt(key))
    .sort((a, b) => a - b);

  let setupCards: unknown[] = [];

  for (let key of sortedKeys) {
    const cardsInThisSequence = cardsGroupedInOrder[`${key}`] || [];
    const A = find((card) => card.tags.includes("A"), cardsInThisSequence);
    const B = find((card) => card.tags.includes("B"), cardsInThisSequence);

    if (A && B) {
      setupCards = concat(setupCards, villainCardPairToJson(deckData, A, B));
    }
  }

  return setupCards;
}

function flavor(quote_text: RichText, isEnvironmentDeck: boolean) {
  let identifier = {};
  let buffer: string[] = [];
  let flavorQuotes = [];
  let flavorReference = {};
  let i;

  let text = richtext(quote_text);
  for (let line of text) {
    if (startsWith("-", line)) {
      flavorReference = { flavorReference: trim(line.substring(1)) };
    } else if ((i = line.indexOf(": ")) > -1) {
      // We found a new identifier, push any existing buffer
      if (buffer.length > 0) {
        flavorQuotes.push({
          ...identifier,
          text: join("{BR}", buffer),
        });
        buffer = [];
      }
      identifier = { identifier: line.substring(0, i) };
      buffer.push(line.substring(i + 2));
    } else {
      buffer.push(line);
    }
  }

  if (buffer.length > 0) {
    flavorQuotes.push({
      ...identifier,
      text: join("{BR}", buffer),
    });
  }

  if (
    "flavorReference" in flavorReference &&
    flavorQuotes.length == 1 &&
    "identifier" in flavorQuotes[0]
  ) {
    flavorReference = {
      flavorReference: `${flavorQuotes[0].identifier}, ${flavorReference.flavorReference}`,
    };
  }

  if (isEnvironmentDeck) {
    return {
      flavorText: join("", pluck("text", flavorQuotes)),
    };
  } else {
    // Eliminate empty quotes
    flavorQuotes = reject((quote: any) => isEmpty(quote.text), flavorQuotes);
    // Eliminate leading & trailing quotation marks
    flavorQuotes = map(
      (quote) => assoc("text", quote.text.replaceAll(/^\"|\"$/g, ""), quote),
      flavorQuotes
    );
    return {
      flavorQuotes,
      ...flavorReference,
    };
  }
}

function cardHp(hp: number | null): object {
  if (hp == null) {
    return {};
  } else if (hp > -1) {
    return { hitpoints: hp };
  } else {
    return {
      hitpoints: Math.abs(hp),
      hitpointsText: "*",
    };
  }
}

function cardsToJson(
  deckData: DeckData,
  _defaultPalette: string | undefined,
  isEnvironmentDeck: boolean
) {
  return map((card) => {
    const cardFlavor = flavor(card.quote_text, isEnvironmentDeck);
    const nemesisIdentifiers = idToNemesis(deckData, card.nemesis);

    const bodyAndPowers: any = {};
    if (card.effects.length > 0) {
      bodyAndPowers.body = richtext(card.effects);
    }
    if (card.powers.length > 0) {
      bodyAndPowers.powers = richtext(card.powers);
    }

    return {
      identifier: identifier(card.name),
      count: card.quantity,
      title: card.name,
      keywords: map((s) => s.toLowerCase(), card.keywords),
      icons: card.icons,
      ...bodyAndPowers,
      ...cardFlavor,
      ...cardHp(card.hp),
      ...nemesisIdentifiers,
    };
  }, deckData.cards);
}

function deckDataToJson(deckData: DeckData): any {
  const primarySetupCard = findPrimarySetupCard(deckData.setup);
  const defaultPalette = primarySetupCard.palette;
  const identifierCards = findCharacterSetupCards(deckData.setup).map((card) =>
    identifier(`${card.name} Character`)
  );

  const kind = find(
    (tag) => tag == "Hero" || tag == "Villain" || tag == "Environment",
    primarySetupCard.tags
  );

  const cards = cardsToJson(deckData, defaultPalette, kind == "Environment");

  const palette = idToPalette(deckData, primarySetupCard.palette);

  const preamble =
    kind == "Environment"
      ? {
          backgroundColor: palette?.box_color || "ffffff",
          difficulty: primarySetupCard.rating,
          shortName: identifier(`${primarySetupCard.name}`),
        }
      : {
          initialCardIdentifiers: identifierCards,
          promoCards: flatten(
            map(
              (card: Setup) => heroCardToJson(deckData, card, primarySetupCard),
              filter(
                (card) => card.tags.includes("Hero Variant"),
                deckData.setup
              )
            )
          ),
        };

  const output: any = {
    name: primarySetupCard.name,
    kind,
    expansionIdentifier: primarySetupCard.expansion,
    ...preamble,
    cards: [
      ...heroCardToJson(deckData, primarySetupCard),
      ...villainCardsToJson(deckData),
      ...sortBy(prop("identifier"), cards),
    ],
  };

  return output;
}

export default function SentinelsDataJson(props: SentinelsDataDisplayProps) {
  const jsonText = useMemo(
    () => JSON.stringify(deckDataToJson(props.deckData), null, 2),
    [props.deckData]
  );

  return (
    <>
      <CopyableText text={jsonText} />
    </>
  );
}
