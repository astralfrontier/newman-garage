import {
  difference,
  find,
  flatten,
  head,
  intersection,
  isEmpty,
  isNil,
  join,
  map,
  pluck,
  prop,
  reject,
  sortBy,
  split,
  startsWith,
  trim,
} from "ramda";
import React, { useMemo } from "react";

import {
  Card,
  DeckData,
  Palette,
  RichText,
  Setup,
} from "../../netlify/functions/notion-retrieve";
import { findPrimarySetupCard, identifier, idToPalette } from "../utility";
import CopyableText from "./CopyableText";
import { SentinelsDataDisplayProps } from "./SentinelsData";

const PREAMBLE = "##version 107";

function richtextOneline(input: RichText | undefined): string {
  if (!input) {
    return "";
  }

  const blocks = map((block) => {
    let text = block.text.replaceAll("!", "\\!").replaceAll(/[\{\}]/g, "/");
    if (block.italic) {
      text = `/${text}/`;
    }
    if (block.bold) {
      text = `!${text}!`;
    }
    if (block.underline) {
      text = `_${text}_`;
    }
    return text;
  }, input);

  return join("", blocks);
}

function richtext(input: RichText): string[] {
  return split("\n", richtextOneline(input));
}

function richtextEscaped(input: RichText): string {
  return richtextOneline(input).replaceAll("\n", "\\n");
}

function bodyAndPowers(card: Card) {
  const effects = richtextEscaped(card.effects);
  const powers = card.powers.length
    ? map((line) => `!Power: !>${line}<`, richtext(card.powers))
    : [];
  return `${effects}${
    card.effects.length && card.powers.length ? "\\n" : ""
  }${join("\\n", powers)}`;
}

function cardHp(hp: number | null): string {
  if (hp == null) {
    return "0";
  } else if (hp > -1) {
    return `${hp}`;
  } else {
    return "*";
  }
}

function cardQuote(quote_text: RichText): string {
  // Buckle up...
  // So the rule for Card Creator is that:
  //   1. If a line starts with @, always append a new line, it's the book name
  //   2. If a line contains a hero name identifier (HeroName: "Text"), start a new line
  //   2. Otherwise, append "\rline" to the previous line
  const lines: string[] = [];
  for (let line of richtext(quote_text)) {
    if (startsWith("-", line)) {
      lines.push(`@${trim(line.substring(1))}`);
    } else if (line.includes(': "')) {
      lines.push(line.replace(': "', '|"'));
    } else if (lines.length == 0) {
      lines.push(line);
    } else {
      lines[lines.length - 1] = `${lines[lines.length - 1]}\\r${line}`;
    }
  }
  const finalText = join("\n", lines);
  return isEmpty(finalText) ? "null" : finalText;
}

function cardToOutput(
  deckData: DeckData,
  card: Card,
  defaultPalette?: Palette
): string {
  const palette = idToPalette(deckData, card.palette) || defaultPalette;

  return `
[[title]] ${card.name}
[[quantity]] ${card.quantity}
[[keywords]] ${card.keywords.join(", ")}
[[hp]] ${cardHp(card.hp)}
[[text]] ${bodyAndPowers(card)}
[[quote]]
${cardQuote(card.quote_text)}
[[artpos]] ${palette?.scaling}
[[art]] images\\${identifier(card.name)}.png
[[footer]] ${richtextOneline(palette?.art_credit) || "No art credit"}
[[save]]
`;
}

function cardsToOutput(deckData: DeckData, defaultPalette?: Palette): string {
  const cardOutput = map(
    (card) => cardToOutput(deckData, card, defaultPalette),
    sortBy((card) => identifier(prop("name", card)), deckData.cards) as Card[]
  );
  return join("", cardOutput);
}

function heroCardIncap(hero_incap: RichText): string {
  const remappedLines = map((line) => `{ ${line}`, richtext(hero_incap));
  return join("\n", remappedLines);
}

function heroCard(
  deckData: DeckData,
  card: Setup,
  defaultPalette?: Palette
): string {
  const palette = idToPalette(deckData, card.palette) || defaultPalette;

  return `##hero
[[name]] ${card.name}
[[hp]] ${card.hp}
[[powername]] ${card.hero_power_name}
[[power]] ${richtextEscaped(card.hero_power)}
[[art]] images\\${identifier(card.name)}A.png
[[nemesis]] blank.png
[[artscale]] ${palette?.scaling || "center"}
[[topcolor]] ${palette?.top_color || "ffffff"}
[[btmcolor]] ${palette?.bottom_color || "ffffff"}
[[boxcolor]] ${palette?.box_color || "ffffff"}
[[footer]] ${richtextOneline(palette?.art_credit) || "No art credit"}
[[save]]

##hero-incap
[[art]] images\\${identifier(card.name)}B.png
${heroCardIncap(card.hero_incap)}
[[artscale]] ${palette?.scaling || "center"}
[[boxcolor]] ${palette?.box_color || "ffffff"}
[[footer]] ${richtextOneline(palette?.art_credit) || "No art credit"}
[[save]]

`;
}

function heroCards(deckData: DeckData, defaultPalette?: Palette): string {
  const primaryHeroCard = findPrimarySetupCard(deckData.setup);

  return `${join(
    "\n",
    map((card) => heroCard(deckData, card, defaultPalette), deckData.setup)
  )}

##hero-deck
[[name]] ${primaryHeroCard?.name}
`;
}

function heroDeck(deckData: DeckData, defaultPalette?: Palette): string {
  return `${PREAMBLE}
##suppress-narrator

${heroCards(deckData, defaultPalette)}
${cardsToOutput(deckData, defaultPalette)}
`;
}

function villainCard(
  deckData: DeckData,
  card: Setup,
  defaultPalette?: Palette
): string {
  const palette = idToPalette(deckData, card.palette) || defaultPalette;
  const AorB = head(intersection(["A", "B"], card.tags));

  return `##villain
[[name]] ${card.name}
[[art]] images\\${identifier(card.name)}${AorB}.png
[[artscale]] ${palette?.scaling || "stretched"}
[[footer]] ${richtextOneline(palette?.art_credit) || "No art credit"}
[[boxcolor]] ${palette?.box_color || "ffffff"}
[[topcolor]] ${palette?.top_color || "ffffff"}
[[btmcolor]] ${palette?.bottom_color || "ffffff"}
[[keywords]] ${join(", ", difference(card.tags, ["A", "B"]))}
[[hp]] ${card.hp}
[[nemesis]] blank.png
[[title]] ${card.villain_title}
[[save]]

##villain-setup
[[name]] ${card.name}
[[art]] images\\${identifier(card.name)}Back.png
[[artscale]] ${palette?.scaling || "stretched"}
[[footer]] ${richtextOneline(palette?.art_credit) || "No art credit"}
[[boxcolor]] ${palette?.box_color || "ffffff"}
[[topcolor]] ${palette?.top_color || "ffffff"}
[[btmcolor]] ${palette?.bottom_color || "ffffff"}
[[title]] ${card.villain_title}
[[setup]] ${richtextEscaped(card.villain_setup)}
[[gameplay]] ${richtextEscaped(card.villain_effects)}
[[advanced]] ${richtextEscaped(card.advanced)}
[[save]]

`;
}

function villainCards(deckData: DeckData, defaultPalette?: Palette): string {
  const primaryVillainCard = findPrimarySetupCard(deckData.setup);

  return `${join(
    "\n",
    map((card) => villainCard(deckData, card, defaultPalette), deckData.setup)
  )}

##villain-deck
[[name]] ${primaryVillainCard?.name}
`;
}

function villainDeck(deckData: DeckData, defaultPalette?: Palette): string {
  return `${PREAMBLE}
##suppress-narrator

${villainCards(deckData, defaultPalette)}
${cardsToOutput(deckData, defaultPalette)}
`;
}

function environmentDeck(deckData: DeckData, defaultPalette?: Palette): string {
  return `${PREAMBLE}
##environment
${join(
  "\n",
  map((card) => `[[name]] ${card.name}`, deckData.setup)
)}
${cardsToOutput(deckData, defaultPalette)}

`;
}

function deckDataToCardBuilder(deckData: DeckData): string {
  const paletteId = head(reject(isNil, pluck("palette", deckData.setup)));
  const defaultPalette = idToPalette(deckData, paletteId);

  // Will contain one of "Hero", "Villain", or "Environment"
  const deckType = find(
    (tag) => ["Hero", "Villain", "Environment"].includes(tag),
    flatten(pluck("tags", deckData.setup))
  );

  switch (deckType) {
    case "Hero":
      return heroDeck(deckData, defaultPalette);
    case "Villain":
      return villainDeck(deckData, defaultPalette);
    case "Environment":
      return environmentDeck(deckData, defaultPalette);
    default:
      return "ERROR: no Hero, Villain, or Environment Setup detected";
  }
}

export default function SentinelsDataCardBuilder(
  props: SentinelsDataDisplayProps
) {
  const jsonText = useMemo(
    () => deckDataToCardBuilder(props.deckData),
    [props.deckData]
  );

  return (
    <>
      <CopyableText text={jsonText} />
    </>
  );
}
