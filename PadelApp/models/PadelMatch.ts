export interface PadelMatch {
  creatorId: string;
  minLevel: number;
  maxLevel: number;
  date: string;
  club: string;
  isMixed: boolean;
  isCompetitive: boolean;
  players: string[];
}