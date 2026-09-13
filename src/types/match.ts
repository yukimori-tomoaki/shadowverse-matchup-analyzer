export type Turn = "先攻" | "後攻" | string;
export type MatchResult = "WIN" | "LOSS";

export type MatchRecord = {
  id: string;
  date: string;
  displayDate: string;
  myDeck: string;
  opponentDeck: string;
  turn: Turn;
  result: MatchResult;
  memo: string;
};

export type MatchFilters = {
  period: "all" | "today" | "7days" | "30days" | "custom";
  startDate: string;
  endDate: string;
  myDeck: string;
  turn: "all" | "先攻" | "後攻";
};

export type MatchupCell = {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  label: string;
};

export type MatchupStats = {
  myDeck: string;
  opponentDeck: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  firstWins: number;
  firstTotal: number;
  secondWins: number;
  secondTotal: number;
};
