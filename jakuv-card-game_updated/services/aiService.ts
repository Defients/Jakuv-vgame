
import { GameState, Card, Rank, ActionState, Player } from '../types';
import { getCardValue, calculatePlayerScore } from './gameLogic';
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

        case ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE: {
            if (effectContext?.type !== 'SOFT_RESET') return null;
            const targetPlayer = players.find(p => p.id === effectContext.targetPlayerId)!;
            const targetRow = effectContext.targetRow;
            const cardsInRow = [...targetPlayer[targetRow]];
            cardsInRow.sort((a,b) => getCardValue(b, targetRow) - getCardValue(a, targetRow));
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