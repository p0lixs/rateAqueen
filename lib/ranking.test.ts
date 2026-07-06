import { describe, expect, it } from "vitest";
import { calculateResults } from "./ranking";
import type { Queen } from "./types";

const queens: Queen[] = [
  { id: "a", name: "Alba", image_url: "" },
  { id: "b", name: "Berta", image_url: "" },
  { id: "c", name: "Carmen", image_url: "" },
];

describe("calculateResults", () => {
  it("calculates average positional points", () => {
    const results = calculateResults(queens, [["a", "b", "c"], ["b", "a", "c"]]);
    expect(results.map(({ id, average }) => [id, average])).toEqual([["a", 2.5], ["b", 2.5], ["c", 1]]);
  });

  it("uses first places and then name to break ties", () => {
    const firstPlaceWinner = calculateResults(queens, [["b", "a", "c"], ["b", "a", "c"], ["a", "c", "b"]]);
    expect(firstPlaceWinner[0].id).toBe("b");
    expect(calculateResults(queens.slice(0, 2), []).map((queen) => queen.id)).toEqual(["a", "b"]);
  });

  it("returns zero scores safely when there are no ballots", () => {
    expect(calculateResults(queens, []).every((queen) => queen.average === 0 && queen.first_places === 0)).toBe(true);
  });
});
