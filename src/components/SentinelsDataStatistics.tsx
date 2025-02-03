import {
  append,
  assoc,
  identity,
  keys,
  map,
  propOr,
  reduce,
  sortBy,
} from "ramda";
import React, { useMemo } from "react";

import { DeckData } from "../../netlify/functions/notion-retrieve";
import preflightWarnings from "../preflight";
import { SentinelsDataDisplayProps } from "./SentinelsData";
import classes from "./SentinelsDataStatistics.module.sass";

interface DeckStatistics {
  cardCount: number;
  cardsByKeyword: Record<string, string[]>;
  cardsByIcon: Record<string, string[]>;
}

/**
 * Given a field e.g. 'keywords',
 * return a dictionary of (keyword value => [cards containing keyword])
 * @param deckData
 * @param field
 * @returns
 */
function cardsByField(
  deckData: DeckData,
  field: string
): { [key: string]: string[] } {
  return reduce(
    (collection, card) =>
      reduce(
        (collection: Record<string, string[]>, value) =>
          assoc(value, append(card.name, collection[value] || []), collection),
        collection,
        propOr([], field, card) as string[]
      ),
    {} as Record<string, string[]>,
    deckData.cards
  );
}

function deckStatistics(deckData: DeckData): DeckStatistics {
  const cardCount = reduce(
    (sum, card) => sum + card.quantity,
    0,
    deckData.cards
  );
  const cardsByKeyword = cardsByField(deckData, "keywords");
  const cardsByIcon = cardsByField(deckData, "icons");

  return {
    cardCount,
    cardsByKeyword,
    cardsByIcon,
  };
}

function CardsBy({
  header,
  data,
}: {
  header: string;
  data: Record<string, string[]>;
}) {
  return (
    <>
      <h3>{header}</h3>

      <table className="table is-fullwidth is-hoverable">
        <tbody>
          {map(
            (key) => (
              <tr key={key}>
                <td className={classes.cardsByKey}>
                  <strong>{key}</strong>
                </td>
                <td>
                  {map(
                    (card) => (
                      <span key={card}>
                        <span className="tag is-info">{card}</span>{" "}
                      </span>
                    ),
                    data[key]
                  )}
                </td>
              </tr>
            ),
            sortBy(identity, keys(data)) as string[]
          )}
        </tbody>
      </table>
    </>
  );
}

export default function SentinelsDataDebug(props: SentinelsDataDisplayProps) {
  const warnings = useMemo(
    () => preflightWarnings(props.deckData),
    [props.deckData]
  );
  const stats = useMemo(() => deckStatistics(props.deckData), [props.deckData]);

  return (
    <>
      {warnings.length == 0 ? (
        <></>
      ) : (
        <article className="message is-warning">
          <div className="message-header">
            <p>Preflight Warnings</p>
          </div>
          <div className="message-body">
            <ul>
              {map(
                (warning) => (
                  <li key={warning}>{warning}</li>
                ),
                warnings
              )}
            </ul>
          </div>
        </article>
      )}
      <div className="content">
        <p>
          <strong>Card Count:</strong> {stats.cardCount} (
          {props.deckData.cards.length} unique cards)
        </p>
        <CardsBy header="Cards by Keyword" data={stats.cardsByKeyword} />
        <CardsBy header="Cards by Icon" data={stats.cardsByIcon} />
      </div>
    </>
  );
}
