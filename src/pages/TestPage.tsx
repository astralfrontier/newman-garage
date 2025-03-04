import React from "react";
import { useParams } from "react-router-dom";

import { DeckData } from "../../netlify/functions/notion-retrieve";
import * as challengerPark from "../../samples/challenger-park.json";
import * as mercury from "../../samples/mercury.json";
import * as netherwarden from "../../samples/netherwarden.json";
import * as spaceBug from "../../samples/Space_Bug.json";
import * as unmute from "../../samples/unmute.json";
import * as unmuteMulti from "../../samples/unmute-multi.json";
import SentinelsData from "../components/SentinelsData";
import DefaultLayout from "../layouts/Default";

interface TestPageProps {
  children?: React.ReactNode;
}

export default function TestPage(_props: TestPageProps) {
  const { deckName } = useParams();

  let deckData: DeckData | undefined;

  switch (deckName) {
    case "challengerpark":
      deckData = challengerPark;
      break;
    case "mercury":
      deckData = mercury;
      break;
    case "netherwarden":
      deckData = netherwarden;
      break;
    case "spacebug":
      deckData = spaceBug;
      break;
    case "unmute":
      deckData = unmute;
      break;
    case "unmute-multi":
      deckData = unmuteMulti;
      break;
  }

  return (
    <>
      <DefaultLayout>
        {deckData ? <SentinelsData deckData={deckData} /> : <></>}
      </DefaultLayout>
    </>
  );
}
