export type Hole = {
  number: number;
  par: number;
  handicap: number;
  yardages: Record<string, number>;
};

export type Tee = {
  name: string;
  color: string;
};

export type Course = {
  id: string;
  name: string;
  tees: Tee[];
  holes: Hole[];
};

export type Player = {
  id: string;
  name: string;
  handicap: number;
  team?: 'A' | 'B';
  dropdownValue?: string;
};

export type PlayMode = 'Individual' | 'Teams';
export type GameFormat = 'Skins' | 'Match Play' | 'Stroke Play';

export type GameSettings = {
  numPlayers: number;
  players: Player[];
  courseId: string;
  selectedTee: string;
  playMode: PlayMode;
  gameFormat: GameFormat;
  handicapAdjusted: boolean;
};

export type Scores = Record<number, Record<string, number>>;

export type SavedGame = {
  id: string;
  date: string;
  time: string;
  settings: GameSettings;
  scores: Scores;
  courseName: string;
  winnerSummary?: string;
};
