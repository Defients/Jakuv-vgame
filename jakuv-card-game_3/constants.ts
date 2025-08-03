
import { Rank, Suit, CardColor } from './types';

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', '?'];
export const SUITS: Suit[] = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];

export const SUIT_COLORS: Record<Suit, CardColor> = {
  [Suit.Hearts]: CardColor.Red,
  [Suit.Diamonds]: CardColor.Red,
  [Suit.Clubs]: CardColor.Black,
  [Suit.Spades]: CardColor.Black,
};

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, // Initial value
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 4, // In Score Row. Special handling needed.
  'Q': 2,
  'K': 7,
  '?': 0,
};

export const PLAYER1_ID = 'player1';
export const AI_ID = 'player2';
export const HAND_LIMIT = 9;
export const WINNING_SCORE = 21;
export const SWAP_BAR_SIZE = 3;