import type { Queen, Result } from "./types";

export function calculateResults(queens: Queen[], ballots: string[][]): Result[] {
  const scores = new Map(queens.map((queen) => [queen.id, { total: 0, firsts: 0 }]));
  for (const ranking of ballots) {
    ranking.forEach((id, index) => {
      const score = scores.get(id);
      if (score) {
        score.total += ranking.length - index;
        if (index === 0) score.firsts++;
      }
    });
  }
  return queens.map((queen) => ({
    ...queen,
    average: ballots.length ? scores.get(queen.id)!.total / ballots.length : 0,
    first_places: scores.get(queen.id)!.firsts,
  })).sort((a, b) => b.average - a.average || b.first_places - a.first_places || a.name.localeCompare(b.name, "es"));
}
