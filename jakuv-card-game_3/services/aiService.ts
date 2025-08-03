
import { GameState, Card, Rank, ActionState, Player, AIAction } from '../types';
import { getCardValue, calculatePlayerScore, getValidMoves } from './gameLogic';
import { WINNING_SCORE, HAND_LIMIT } from '../constants';

// This file now only contains the logic for deterministic, mid-turn AI choices.
// High-level strategic decisions are handled by geminiAiService.
  
export type AIChoice = 
  | { cardId: string; }
  | { cardIds: string[]; }
  | { optionValue: string; }
  | { targetPlayerId: string; targetRow: 'scoreRow' | 'royaltyRow', cardId: string}
  | { placementRow: 'scoreRow' | 'royaltyRow' };


export const makeAiChoice = (gameState: GameState): AIChoice | null => {
    const { actionState, cardChoices, optionChoices, effectContext, players, currentPlayerIndex } = gameState;
    const aiPlayer = players[currentPlayerIndex];
    const opponent = players[currentPlayerIndex === 0 ? 1 : 0];
    const currentScore = calculatePlayerScore(aiPlayer);

    switch(actionState) {
        case ActionState.AWAITING_OVERCHARGE_DISCARD: {
            if (calculatePlayerScore(aiPlayer) <= WINNING_SCORE) return null;
            const scoreRowCards = aiPlayer.scoreRow.map(c => ({...c, value: getCardValue(c, 'scoreRow')}));
            const royaltyRowCards = aiPlayer.royaltyRow.map(c => ({...c, value: getCardValue(c, 'royaltyRow')}));
            const allBoardCards = [...scoreRowCards, ...royaltyRowCards];
            if (allBoardCards.length === 0) return null; // Should not happen if overcharged

            allBoardCards.sort((a,b) => a.value - b.value); // Discard lowest value first
            const cardToDiscard = allBoardCards[0];
            return { cardId: cardToDiscard.id };
        }
        case ActionState.AWAITING_END_TURN_DISCARD: {
            if (aiPlayer.hand.length <= HAND_LIMIT) return null;
            // Discard lowest value card
            const cardToDiscard = [...aiPlayer.hand].sort((a,b) => getCardValue(a, 'scoreRow') - getCardValue(b, 'scoreRow'))[0];
            return { cardId: cardToDiscard.id };
        }
        case ActionState.AWAITING_NINE_PEEK_CHOICE:
        case ActionState.AWAITING_RUMMAGER_CHOICE:
        case ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE:
            return { cardId: [...cardChoices].sort((a,b) => getCardValue(b, 'scoreRow') - getCardValue(a, 'scoreRow'))[0].id };
        
        case ActionState.AWAITING_FARMER_CHOICE:
            return { cardId: [...cardChoices].sort((a,b) => getCardValue(a, 'scoreRow') - getCardValue(b, 'scoreRow'))[0].id };

        case ActionState.AWAITING_LUCKY_DRAW_CHOICE: {
            const choiceA = cardChoices[0];
            const choiceB = cardChoices[1];
            const valueA = getCardValue(choiceA, 'scoreRow');
            const valueB = getCardValue(choiceB, 'scoreRow');
            const scoreA = currentScore + valueA;
            const scoreB = currentScore + valueB;
            if (scoreA > WINNING_SCORE && scoreB > WINNING_SCORE) return { cardId: valueA < valueB ? choiceA.id : choiceB.id };
            if (scoreA > WINNING_SCORE) return { cardId: choiceB.id };
            if (scoreB > WINNING_SCORE) return { cardId: choiceA.id };
            return { cardId: scoreA > scoreB ? choiceA.id : choiceB.id };
        }
        
        case ActionState.AWAITING_INTERROGATOR_CHOICE:
            // Prefer stealing if opponent has few cards, otherwise force discard.
            return { optionValue: opponent.hand.length <= 3 ? 'steal' : 'discard' };
            
        case ActionState.AWAITING_MIMIC_CHOICE:
            // Choose the best effect based on the game state. Very simplified logic.
            if (opponent.scoreRow.length > 1 && !opponent.isImmune) return { optionValue: '4' }; // Soft Reset
            if (opponent.hand.length > 3) return { optionValue: '3' }; // Interrogator
            if (aiPlayer.hand.length < 3) return { optionValue: '6' }; // Farmer
            return { optionValue: '7' }; // Lucky Draw

        case ActionState.AWAITING_SOFT_RESET_TARGET_ROW: {
             if (opponent.isImmune) return null; // Can't target immune player
            // Target opponent's score row if it has cards, otherwise royalty row.
            const targetPlayer = opponent;
            let targetRow: 'scoreRow' | 'royaltyRow' = 'scoreRow';
            if (targetPlayer.scoreRow.length === 0 && targetPlayer.royaltyRow.length > 0) {
                targetRow = 'royaltyRow';
            }
            if (targetPlayer[targetRow].length === 0) return null; // No valid target
            const cardToClick = targetPlayer[targetRow][0];
            return { targetPlayerId: targetPlayer.id, targetRow, cardId: cardToClick.id };
        }

        case ActionState.AWAITING_SOFT_RESET_CHOICE: {
            if (effectContext?.type !== 'SOFT_RESET') return null;
            const targetPlayer = players.find(p => p.id === effectContext.targetPlayerId)!;
            const targetRow = effectContext.targetRow;
            const cardsInRow = [...targetPlayer[targetRow]];
            cardsInRow.sort((a,b) => getCardValue(b, targetRow) - getCardValue(a, targetRow));
            // AI discards the highest value cards
            const cardsToDiscard = cardsInRow.slice(0, Math.min(2, cardsInRow.length));
            return { cardIds: cardsToDiscard.map(c => c.id) };
        }
        
        case ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE: {
            // AI prefers swap bar > discard > top of deck > bottom
            const swapChoice = optionChoices.find(o => o.value.startsWith('Swap Bar'));
            if(swapChoice) return { optionValue: swapChoice.value };
            const discardChoice = optionChoices.find(o => o.value === 'Discard Pile');
            if(discardChoice) return { optionValue: discardChoice.value };
            const topDeckChoice = optionChoices.find(o => o.value === 'Top of Deck');
            if(topDeckChoice) return { optionValue: topDeckChoice.value };
            return { optionValue: optionChoices[0].value };
        }

        case ActionState.AWAITING_JACK_PLACEMENT: {
            if (effectContext?.type !== 'JACK_STEAL') return null;
            const stolenCard = effectContext.stolenCard;
            const canBeRoyal = ['J', 'Q', 'K'].includes(stolenCard.rank);
            // Prefer royalty row if possible, as it's often worth more or provides protection
            if (canBeRoyal) {
                return { placementRow: 'royaltyRow' };
            }
            return { placementRow: 'scoreRow' };
        }

        case ActionState.AWAITING_JACK_TARGET: {
             if(opponent.scoreRow.length === 0 || opponent.isImmune) return null;
             const bestTarget = [...opponent.scoreRow].sort((a,b) => getCardValue(b, 'scoreRow') - getCardValue(a, 'scoreRow'))[0];
             return { targetPlayerId: opponent.id, targetRow: 'scoreRow', cardId: bestTarget.id };
        }
    }
    return null;
}

export const getBasicAiTurn = (gameState: GameState): { action: AIAction, reasoning: string } => {
    const validMoves = getValidMoves(gameState);
    if (validMoves.length === 0) return { action: { type: 'DRAW' }, reasoning: 'Local AI: No other valid moves.' };

    const aiPlayer = gameState.players[gameState.currentPlayerIndex];
    const opponent = gameState.players[gameState.currentPlayerIndex === 0 ? 1 : 0];
    const currentScore = calculatePlayerScore(aiPlayer);

    // 1. Winning move
    for (const move of validMoves) {
        if (move.type === 'PLAY_CARD') {
            const card = aiPlayer.hand.find(c => c.id === move.cardId);
            if (card) {
                const cardValue = getCardValue(card, move.row);
                if (currentScore + cardValue === WINNING_SCORE) {
                    return { action: move, reasoning: `Local AI: Playing ${card.rank}${card.suit} for a winning score of 21.` };
                }
            }
        }
    }

    // 2. High-value setup (Royal Marriage)
    const royalMarriageMove = validMoves.find(m => m.type === 'ROYAL_MARRIAGE');
    if (royalMarriageMove) {
        const card = aiPlayer.hand.find(c => c.id === (royalMarriageMove as any).cardId)!;
        return { action: royalMarriageMove, reasoning: `Local AI: Performing Royal Marriage with ${card.rank}${card.suit}.` };
    }
    
    // 3. High-value scuttle
    const scuttleMoves = validMoves.filter(m => m.type === 'SCUTTLE') as Extract<AIAction, {type: 'SCUTTLE'}>[];
    if (scuttleMoves.length > 0) {
        scuttleMoves.sort((a, b) => {
            const targetA = opponent.scoreRow.find(c => c.id === a.targetCardId);
            const targetB = opponent.scoreRow.find(c => c.id === b.targetCardId);
            if (!targetA || !targetB) return 0;
            return getCardValue(targetB, 'scoreRow') - getCardValue(targetA, 'scoreRow');
        });
        const bestScuttle = scuttleMoves[0];
        const targetCard = opponent.scoreRow.find(c => c.id === bestScuttle.targetCardId);
        if (targetCard && getCardValue(targetCard, 'scoreRow') >= 8) {
             return { action: bestScuttle, reasoning: `Local AI: Scuttling high-value target ${targetCard.rank}${targetCard.suit}.` };
        }
    }

    // 4. Good point play (don't bust)
    const pointMoves = validMoves.filter(m => m.type === 'PLAY_CARD') as Extract<AIAction, {type: 'PLAY_CARD'}>[];
    const safePointMoves = pointMoves.filter(move => {
        const card = aiPlayer.hand.find(c => c.id === move.cardId);
        if (!card) return false;
        return currentScore + getCardValue(card, move.row) <= WINNING_SCORE;
    });

    if (safePointMoves.length > 0) {
        safePointMoves.sort((a, b) => {
            const cardA = aiPlayer.hand.find(c => c.id === a.cardId);
            const cardB = aiPlayer.hand.find(c => c.id === b.cardId);
            if (!cardA || !cardB) return 0;
            return getCardValue(cardB, b.row) - getCardValue(cardA, a.row);
        });
        const bestPlay = safePointMoves[0];
        const card = aiPlayer.hand.find(c => c.id === bestPlay.cardId)!;
        return { action: bestPlay, reasoning: `Local AI: Playing ${card.rank}${card.suit} for points.` };
    }
    
    // 5. Default to Draw
    const drawMove = validMoves.find(m => m.type === 'DRAW');
    if (drawMove) {
      return { action: drawMove, reasoning: 'Local AI: No optimal play found, drawing a card.' };
    }

    // Fallback if draw is not available for some reason
    return { action: validMoves[0], reasoning: 'Local AI: Defaulting to first available action.' };
};


export const getBasicCounterDecision = (gameState: GameState, validCounterCards: Card[]): { decision: 'pass' | 'counter', cardId: string | null, reasoning: string } => {
    if (validCounterCards.length > 0) {
        // Simple logic: always counter if possible with the first available card.
        return {
            decision: 'counter',
            cardId: validCounterCards[0].id,
            reasoning: 'Local AI: A valid counter card is available, so I will use it.'
        };
    }
    return {
        decision: 'pass',
        cardId: null,
        reasoning: 'Local AI: No valid cards to counter with.'
    };
};
