




export enum Suit {
  Spades = '♠',
  Clubs = '♣',
  Hearts = '♥',
  Diamonds = '♦',
}

export enum CardColor {
  Red = 'Red',
  Black = 'Black',
}

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | '?';

export type AceValue = 1 | 3 | 5;

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  color: CardColor;
  isFaceUp: boolean;
  aceValue?: AceValue;
  oneTimeProtection?: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  scoreRow: Card[];
  royaltyRow: Card[];
  isAI: boolean;
  handRevealedUntilTurn: number;
  isImmune: boolean;
}

export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  CAMPAIGN_SELECTION = 'CAMPAIGN_SELECTION',
  TUTORIAL = 'TUTORIAL',
  PLAYER1_START = 'PLAYER1_START',
  PLAYER_TURN = 'PLAYER_TURN',
  AI_THINKING = 'AI_THINKING',
  GAME_OVER = 'GAME_OVER',
  COUNTER = 'COUNTER',
}

export enum ActionState {
  IDLE = 'IDLE',
  CARD_SELECTED = 'CARD_SELECTED',
  AWAITING_SCUTTLE_TARGET = 'AWAITING_SCUTTLE_TARGET',
  AWAITING_SURPRISE_SWAP_TARGET = 'AWAITING_SURPRISE_SWAP_TARGET',
  
  // Card Choice States
  AWAITING_NINE_PEEK_CHOICE = 'AWAITING_NINE_PEEK_CHOICE',
  AWAITING_LUCKY_DRAW_CHOICE = 'AWAITING_LUCKY_DRAW_CHOICE',
  AWAITING_FARMER_CHOICE = 'AWAITING_FARMER_CHOICE',
  AWAITING_RUMMAGER_CHOICE = 'AWAITING_RUMMAGER_CHOICE',
  AWAITING_INTERROGATOR_STEAL_CHOICE = 'AWAITING_INTERROGATOR_STEAL_CHOICE',
  
  // Effect Targeting/Placement States
  AWAITING_JACK_TARGET = 'AWAITING_JACK_TARGET',
  AWAITING_JACK_PLACEMENT = 'AWAITING_JACK_PLACEMENT',
  AWAITING_SOFT_RESET_TARGET_ROW = 'AWAITING_SOFT_RESET_TARGET_ROW',
  AWAITING_SOFT_RESET_CHOICE = 'AWAITING_SOFT_RESET_CHOICE',
  
  // Option Choice States (Button Modals)
  AWAITING_INTERROGATOR_CHOICE = 'AWAITING_INTERROGATOR_CHOICE',
  AWAITING_MIMIC_CHOICE = 'AWAITING_MIMIC_CHOICE',
  AWAITING_SOFT_RESET_DRAW_CHOICE = 'AWAITING_SOFT_RESET_DRAW_CHOICE',
  
  // New States
  AWAITING_END_TURN_DISCARD = 'AWAITING_END_TURN_DISCARD',
  AWAITING_ROYAL_MARRIAGE_CONFIRMATION = 'AWAITING_ROYAL_MARRIAGE_CONFIRMATION',
  AWAITING_OVERCHARGE_DISCARD = 'AWAITING_OVERCHARGE_DISCARD',
  AWAITING_COUNTER = 'AWAITING_COUNTER',
}

export type AIAction = 
  | { type: 'PLAY_CARD'; cardId: string; row: 'scoreRow' | 'royaltyRow' }
  | { type: 'SCUTTLE'; attackerCardId: string; targetCardId: string }
  | { type: 'PLAY_FOR_EFFECT'; cardId: string }
  | { type: 'ROYAL_MARRIAGE'; cardId: string }
  | { type: 'DRAW' };

export type GameActionType = 'PLAY_CARD' | 'SCUTTLE' | 'ROYAL_PLAY' | 'BASE_EFFECT' | 'ROYAL_MARRIAGE' | 'COUNTER' | 'RUMMAGER_EFFECT' | 'SECOND_QUEEN_EDICT';

export interface GameAction {
    id: string;
    type: GameActionType;
    playerId: string;
    payload: any;
    initiatorCard?: Card;
    isUncounterable?: boolean;
    counterVerb: string;
}


export type CardChoiceType = 'NINE_SCUTTLE_PEEK' | 'LUCKY_DRAW' | 'FARMER' | 'RUMMAGER' | 'INTERROGATOR_STEAL';

export type EffectType = 
    | { type: 'JACK_STEAL', stolenCard: Card, initiatorId: string } 
    | { type: 'SOFT_RESET', targetPlayerId: string, targetRow: 'scoreRow' | 'royaltyRow', discardedCards: Card[], initiatorId: string };

export interface LogEntry {
  id: string;
  type: 'player' | 'ai' | 'system' | 'ai-reasoning' | 'error';
  message: string;
  isRevealed?: boolean;
  icon?: 'play' | 'scuttle' | 'draw' | 'effect' | 'swap' | 'system' | 'win' | 'info' | 'counter' | 'warning';
}

export type TutorialActionType = 'cardClick' | 'actionButton' | 'draw' | 'next' | 'any' | 'cardChoice' | 'optionChoice' | 'playCounter' | 'pass';

export interface TutorialAction {
    type: TutorialActionType;
    value?: any; // e.g., cardId, button action name, boolean for peek
}

export interface TutorialStep {
    prompt: string | React.ReactNode;
    highlights?: string[]; // CSS selectors for elements to highlight
    allowedActions: TutorialAction[];
    setup?: (draft: GameState) => void; // Function to mutate the game state for this step
    isFinal?: boolean; // indicates the end of a chapter
}

export interface TutorialState {
    chapter: number;
    step: number;
    steps: TutorialStep[];
}

export type GameTheme = 'cosmotech' | 'crimson' | 'veridian';

export interface GameSettings {
  animationSpeed: 'normal' | 'fast' | 'instant';
  alwaysShowAIReasoning: boolean;
  theme: GameTheme;
  aiProvider: 'gemini' | 'local';
  autoPassDelay: 'off' | '2' | '3' | '5';
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  unlockedAchievements: string[];
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    secretDescription: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    isSecret: boolean;
}


export interface GameState {
  deck: Card[];
  discardPile: Card[];
  swapBar: (Card | null)[];
  players: [Player, Player];
  currentPlayerIndex: 0 | 1;
  turn: number;
  phase: GamePhase;
  winner: Player | null;
  winReason: string | null;
  log: LogEntry[];
  actionState: ActionState;
  selectedCardId: string | null;
  effectCardId: string | null;
  selectedSwapCardId: string | null;
  swapUsedThisTurn: boolean;
  deckReshuffled: boolean;
  maxScoreDeficit: number;
  
  // For multi-step effects
  cardChoices: Card[];
  cardChoiceContext: { type: CardChoiceType, payload?: any } | null;
  optionChoices: { label: string, value: string }[];
  effectContext: EffectType | null;
  selectedCardIds: string[]; // For multi-card selection like Soft Reset
  
  // For Counter system
  actionContext: GameAction | null;
  counterStack: Card[];
  consecutivePasses: number;
  luckyDrawChainUsed: boolean;

  // For Tutorial System
  tutorial: TutorialState | null;

  // For Campaign System
  activeMissionId: string | null;
  campaignProgress: string[];
}

export interface GameAnalysis {
    title: string;
    summary: string;
    keyMoments: {
        turn: number;
        description: string;
    }[];
    tips: string[];
}