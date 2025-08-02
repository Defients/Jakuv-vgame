

import { Card, GameState, Player, Rank, Suit, CardColor, GamePhase, ActionState, AceValue, LogEntry } from '../types';
import { SUITS, RANKS, SUIT_COLORS, RANK_VALUES, PLAYER1_ID, AI_ID, SWAP_BAR_SIZE } from '../constants';
import { v4 as uuidv4 } from 'uuid';

// Fisher-Yates shuffle algorithm
export const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if(rank === '?') continue; // Don't create '?' cards in the deck
      deck.push({
        id: uuidv4(),
        rank,
        suit,
        color: SUIT_COLORS[suit],
        isFaceUp: false,
        ...(rank === 'A' && { aceValue: 1 }),
      });
    }
  }
  return shuffleDeck(deck);
};

export const dealInitialCards = (draft: GameState): void => {
  const deck = createDeck();
  const playerHand: Card[] = [];
  const aiHand: Card[] = [];

  // Soft-Start Asymmetry: 3 cards each
  for (let i = 0; i < 3; i++) {
    playerHand.push({ ...deck.pop()!, isFaceUp: true });
    aiHand.push({ ...deck.pop()!, isFaceUp: false });
  }

  draft.players[0].hand = playerHand;
  draft.players[1].hand = aiHand;

  const swapBar: (Card | null)[] = [];
  for (let i = 0; i < SWAP_BAR_SIZE; i++) {
    if (deck.length > 0) {
      swapBar.push(deck.pop()!);
    } else {
      swapBar.push(null);
    }
  }

  // Set the middle card of the Swap Bar to be face-up
  if (swapBar.length > 0) {
    const faceUpIndex = Math.floor(SWAP_BAR_SIZE / 2);
    swapBar.forEach((card, index) => {
      if (card) {
        card.isFaceUp = (index === faceUpIndex);
      }
    });
  }
  
  draft.deck = deck;
  draft.swapBar = swapBar;
  draft.discardPile = [];
  draft.log = [
      { id: uuidv4(), type: 'system', message: `Game started with Soft-Start Asymmetry rule.`},
      { id: uuidv4(), type: 'system', message: `${SWAP_BAR_SIZE} cards placed in the Swap Bar.`}
  ];
  draft.phase = GamePhase.PLAYER1_START;
  draft.turn = 1;
  draft.currentPlayerIndex = 0;
};

export const createInitialGameState = (): GameState => {
  const players: [Player, Player] = [
    { id: PLAYER1_ID, name: 'Player 1', hand: [], scoreRow: [], royaltyRow: [], isAI: false, handRevealedUntilTurn: 0, isImmune: false },
    { id: AI_ID, name: 'Jakuv AI', hand: [], scoreRow: [], royaltyRow: [], isAI: true, handRevealedUntilTurn: 0, isImmune: false },
  ];

  return {
    deck: [],
    discardPile: [],
    swapBar: [],
    players,
    currentPlayerIndex: 0,
    turn: 0,
    phase: GamePhase.START_SCREEN,
    winner: null,
    winReason: null,
    log: [],
    actionState: ActionState.IDLE,
    selectedCardId: null,
    effectCardId: null,
    selectedSwapCardId: null,
    swapUsedThisTurn: false,
    cardChoices: [],
    cardChoiceContext: null,
    optionChoices: [],
    effectContext: null,
    selectedCardIds: [],
    actionContext: null,
    counterStack: [],
    consecutivePasses: 0,
    luckyDrawChainUsed: false,
  };
};

export const getCardValue = (card: Card, row: 'scoreRow' | 'royaltyRow'): number => {
  if (card.rank === 'A') {
    return card.aceValue || 1;
  }
  if (card.rank === 'J') {
    return row === 'royaltyRow' ? 5 : 4;
  }
  return RANK_VALUES[card.rank];
};

export const calculatePlayerScore = (player: Player): number => {
  let score = 0;
  player.scoreRow.forEach(card => {
    score += getCardValue(card, 'scoreRow');
  });
  player.royaltyRow.forEach(card => {
    score += getCardValue(card, 'royaltyRow');
  });
  return score;
};

export const findCard = (location: (Card | null)[], predicate: string | ((card: Card) => boolean)): { card: Card, cardIndex: number } | null => {
    const cardIndex = typeof predicate === 'string'
        ? location.findIndex(c => c?.id === predicate)
        : location.findIndex(c => c ? predicate(c) : false);

    if (cardIndex === -1) return null;
    const card = location[cardIndex];
    if (!card) return null;
    return { card, cardIndex };
};


export const moveCard = (source: (Card | null)[], destination: (Card | null)[], cardId: string): Card | null => {
    const cardResult = findCard(source, cardId);
    if (!cardResult) return null;
    source.splice(cardResult.cardIndex, 1);
    destination.push(cardResult.card);
    return cardResult.card;
};