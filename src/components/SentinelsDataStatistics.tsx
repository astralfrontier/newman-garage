import { append, assoc, identity, join, keys, map, prop, reduce, sortBy } from "ramda";
import React from "react";

import { DeckData } from "../../netlify/functions/notion-retrieve";
import { SentinelsDataDisplayProps } from "./SentinelsData";

interface DeckStatistics {
  cardCount: number;
  cardsByKeyword: Record<string,string[]>;
  cardsByIcon: Record<string,string[]>;
}

function cardsByField(deckData: DeckData, field: string) {
  return reduce(
    (collection, card) => reduce(
      (collection: Record<string,string[]>, value) => assoc(value, append(card.name, collection[value] || []), collection),
      collection,
      (prop(field, card) as unknown) as string[]
    ),
    {} as Record<string,string[]>,
    deckData.cards
  )
}

function deckStatistics(deckData: DeckData): DeckStatistics {
  const cardCount = reduce((sum, card) => sum + card.quantity, 0, deckData.cards)
  const cardsByKeyword = cardsByField(deckData, "keywords")
  const cardsByIcon = cardsByField(deckData, "icons")

  return {
    cardCount,
    cardsByKeyword,
    cardsByIcon
  }
}

function CardsBy({header, data}: {header: string, data: Record<string,string[]>}) {
  return (
    <>
      <h3>{header}</h3>

      <ul>
      {map(key => (
        <li>
          <strong>{key}</strong>:{' '}
          {join(' -- ', data[key])}
        </li>
      ), sortBy(identity, keys(data)) as string[])}
      </ul>
    </>
  )
}

export default function SentinelsDataDebug(props: SentinelsDataDisplayProps) {
  const stats = deckStatistics(props.deckData)

  return (
    <>
      <div className="content">
        <p>
          <strong>Card Count:</strong> {stats.cardCount} ({props.deckData.cards.length} unique cards)
        </p>
        <CardsBy header="Cards by Keyword" data={stats.cardsByKeyword} />
        <CardsBy header="Cards by Icon" data={stats.cardsByIcon} />
      </div>
    </>
  );
}
