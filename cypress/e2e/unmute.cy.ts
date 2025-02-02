// https://www.chaijs.com/api/bdd/

import { find, propEq } from "ramda";

describe("Unmute data", () => {
  it("loads the statistics page", () => {
    cy.visit("/test/unmute/home");
  });

  describe("Digital JSON", () => {
    const digitalJson = (cy, callback) => {
      cy.get("#sentinels-tab-digital .copyable-text").then((element) => {
        const innerText = JSON.parse(element.text().replace(/^Copy/, ""));
        callback(innerText);
      });
    };

    const cardNamed = (cards: any, name: string): any => {
      return find(propEq(name, "title"), cards);
    };

    beforeEach(() => {
      cy.visit("/test/unmute/digital");
    });

    it("does not include any Hero cards", () => {
      digitalJson(cy, (deck) => {
        for (let card of deck.cards) {
          expect(card).not.to.have.property("powers");
        }
      });
    });

    it("has 16 opening lines", () => {
      digitalJson(cy, (deck) => {
        const openingLines = cardNamed(deck.cards, "Unmute").openingLines;
        expect(Object.keys(openingLines)).to.have.lengthOf(16);
      });
    });

    it("does not have opening lines for Menagerie.Radiance and Menagerie.Concord", () => {
      digitalJson(cy, (deck) => {
        const openingLines = cardNamed(deck.cards, "Unmute").openingLines;
        expect(openingLines).not.to.have.property("Menagerie.Radiance");
        expect(openingLines).not.to.have.property("Menagerie.Concord");
      });
    });

    it("has Menagerie.Mercury as a nemesis", () => {
      digitalJson(cy, (deck) => {
        const nemesisIdentifiers = cardNamed(
          deck.cards,
          "Unmute"
        ).nemesisIdentifiers;
        expect(nemesisIdentifiers).to.contain("Menagerie.Mercury");
      });
    });

    it("has Ego Trip with Menagerie.Radiance as a nemesis", () => {
      digitalJson(cy, (deck) => {
        const nemesisIdentifiers = cardNamed(
          deck.cards,
          "Ego Trip"
        ).nemesisIdentifiers;
        expect(nemesisIdentifiers).to.contain("Menagerie.Radiance");
      });
    });

    it("has Fractal with Menagerie.Concord as a nemesis", () => {
      digitalJson(cy, (deck) => {
        const nemesisIdentifiers = cardNamed(
          deck.cards,
          "Fractal"
        ).nemesisIdentifiers;
        expect(nemesisIdentifiers).to.contain("Menagerie.Concord");
      });
    });

    it("has Rabid Fans with no nemesis", () => {
      digitalJson(cy, (deck) => {
        const card = cardNamed(deck.cards, "Rabid Fans");
        expect(card).not.to.have.property("nemesisIdentifiers");
      });
    });
  });

  describe("Card Creator", () => {
    it("loads the Card Creator page", () => {
      cy.visit("/test/unmute/cc");
    });
  });
});
