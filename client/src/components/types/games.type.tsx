export interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export interface Card {
  id: string;
  emoji: string;
  matched: boolean;
}

export interface User {
  id: string;
  name: string;
}

export interface Scores {
  [userId: string]: number;
}

 