



import { Card, GameState, Player, Rank, Suit, CardColor, GamePhase, ActionState, AceValue, LogEntry, AIAction } from '../types';
import { SUITS, RANKS, SUIT_COLORS, RANK_VALUES, PLAYER1_ID, AI_ID, SWAP_BAR_SIZE } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { CHARACTERS } from '../data/characters';

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
  let deck = createDeck();
  const playerHand: Card[] = [];
  const aiHand: Card[] = [];

  // Campaign-specific hand for AI
  if (draft.activeMissionId) {
    const character = CHARACTERS[draft.activeMissionId];
    if (character?.openingHand) {
      character.openingHand.forEach(cardInfo => {
        const cardIndex = deck.findIndex(c => c.rank === cardInfo.rank && c.suit === cardInfo.suit);
        if (cardIndex !== -1) {
          const [card] = deck.splice(cardIndex, 1);
          aiHand.push({ ...card, isFaceUp: false });
        }
      });
    }
  }

  // Standard dealing
  const cardsToDeal = draft.activeMissionId ? 3 : 3; // 3 for player, AI gets rest if needed
  
  // Player gets 3 cards
  for (let i = 0; i < 3; i++) {
     if(deck.length > 0) playerHand.push({ ...deck.pop()!, isFaceUp: true });
  }

  // AI gets cards if not a campaign mission with a pre-defined hand
  if (!draft.activeMissionId) {
    for (let i = 0; i < 3; i++) {
        if(deck.length > 0) aiHand.push({ ...deck.pop()!, isFaceUp: false });
    }
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
  draft.deckReshuffled = false;
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
    deckReshuffled: false,
    maxScoreDeficit: 0,
    cardChoices: [],
    cardChoiceContext: null,
    optionChoices: [],
    effectContext: null,
    selectedCardIds: [],
    actionContext: null,
    counterStack: [],
    consecutivePasses: 0,
    luckyDrawChainUsed: false,
    tutorial: null,
    activeMissionId: null,
    campaignProgress: [],
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

    // Move the original card object from source to destination.
    const [movedCard] = source.splice(cardResult.cardIndex, 1);
    if (!movedCard) return null;
    destination.push(movedCard);

    // Get a reference to the card now in the destination array.
    const cardInDestination = destination[destination.length - 1];

    if (cardInDestination) {
        // If a card is not face up (e.g., from an AI's hand), it must be revealed
        // when moved to a public area like a score row or the discard pile.
        if (!cardInDestination.isFaceUp) {
            cardInDestination.isFaceUp = true;
        }
    }
    
    return cardInDestination;
};

export const getValidMoves = (gameState: GameState): AIAction[] => {
    const validMoves: AIAction[] = [];
    const aiPlayer = gameState.players[gameState.currentPlayerIndex];
    const humanPlayer = gameState.players[gameState.currentPlayerIndex === 0 ? 1 : 0];

    // Play Card
    aiPlayer.hand.forEach(card => {
        if (card.rank !== 'K') validMoves.push({ type: 'PLAY_CARD', cardId: card.id, row: 'scoreRow' });
        if (['J', 'Q', 'K'].includes(card.rank)) validMoves.push({ type: 'PLAY_CARD', cardId: card.id, row: 'royaltyRow' });
    });

    // Scuttle
    const isProtectedByQueen = humanPlayer.royaltyRow.some(c => c.rank === 'Q');
    if (humanPlayer.scoreRow.length > 0 && !humanPlayer.isImmune) {
        humanPlayer.scoreRow.forEach(target => {
            aiPlayer.hand.forEach(attacker => {
                const attackerIsRoyal = ['J', 'Q', 'K'].includes(attacker.rank);
                const canAttack = attackerIsRoyal || (getCardValue(attacker, 'scoreRow') >= getCardValue(target, 'scoreRow'));
                const targetIsImmune = target.rank === 'A' || target.oneTimeProtection;
                const canBypass = attacker.rank === '10';
                if(canAttack && (!targetIsImmune || canBypass) && (!isProtectedByQueen || canBypass)) {
                    validMoves.push({ type: 'SCUTTLE', attackerCardId: attacker.id, targetCardId: target.id });
                }
            });
        });
    }

    // Play for Effect
    aiPlayer.hand.forEach(card => {
         if (['J', '7', '6', '4', '3', '2'].includes(card.rank)) {
            validMoves.push({ type: 'PLAY_FOR_EFFECT', cardId: card.id });
         }
    });

    // Royal Marriage
    const kingsInHand = aiPlayer.hand.filter(c => c.rank === 'K');
    for (const king of kingsInHand) {
        const partnerQueen = aiPlayer.hand.find(c => c.rank === 'Q' && c.color === king.color);
        if (partnerQueen) validMoves.push({ type: 'ROYAL_MARRIAGE', cardId: king.id });
    }
    
    // Draw
    validMoves.push({ type: 'DRAW' });

    return validMoves;
};

export const getValidCounterCards = (gameState: GameState): Card[] => {
  const { players, currentPlayerIndex, actionContext, counterStack, tutorial } = gameState;
  if (!actionContext) return [];

  const currentPlayer = players[currentPlayerIndex];

  if (tutorial) {
      // In tutorial, the valid cards are given in the hand.
      return currentPlayer.hand.filter(c => ['A', 'K', '9'].includes(c.rank));
  }

  const lastCounter = counterStack.length > 0 ? counterStack[counterStack.length - 1] : null;

  // Denial of Denial: An Ace can counter a counter.
  if (lastCounter) {
    return currentPlayer.hand.filter(c => c.rank === 'A');
  }

  // Counter the initial action
  switch (actionContext.type) {
    case 'ROYAL_PLAY':
    case 'ROYAL_MARRIAGE':
      // A King can counter a Royal play.
      return currentPlayer.hand.filter(c => c.rank === 'K');
    
    case 'SCUTTLE':
      // A 9 can counter a Scuttle.
      return currentPlayer.hand.filter(c => c.rank === '9');

    case 'BASE_EFFECT':
    case 'RUMMAGER_EFFECT':
      // An Ace can counter standard effects.
      return currentPlayer.hand.filter(c => c.rank === 'A');

    case 'SECOND_QUEEN_EDICT':
      return currentPlayer.hand.filter(c => ['A', '9', 'K'].includes(c.rank));

    default:
      // Other actions like PLAY_CARD are not counterable by default.
      return [];
  }
};