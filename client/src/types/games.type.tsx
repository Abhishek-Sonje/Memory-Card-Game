export interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export interface GameCard {
  id: string;
  emoji: string;
  value: number | null;
 
  matched: boolean;
}

export interface User {
  id: string;
  name: string;
}

export interface Scores {
  [userId: string]: number;
}

 
