
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Player, Card, GamePhase, ActionState, AceValue, Rank, Suit, CardColor, GameAction, AIAction, LogEntry } from './types';
import { PLAYER1_ID, AI_ID, WINNING_SCORE, HAND_LIMIT, SWAP_BAR_SIZE } from './constants';
import { createInitialGameState, getCardValue, calculatePlayerScore, findCard, moveCard, shuffleDeck, dealInitialCards } from './services/gameLogic';
import { makeAiChoice } from './services/aiService';
import { getAiTurn, getAiCounterDecision } from './services/geminiAiService';
import GameBoard from './components/GameBoard';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { CosmoTechSigil } from './components/icons';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const initializeGame = useCallback(() => {
    setGameState(createInitialGameState());
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const updateGameState = useCallback((updater: (draft: GameState) => void) => {
    setGameState(produce(updater));
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'system') => {
    updateGameState(draft => {
      const newEntry: LogEntry = { id: uuidv4(), type, message };
      if (type === 'ai-reasoning') {
          newEntry.isRevealed = false;
      }
      draft.log.unshift(newEntry);
    });
  }, [updateGameState]);

    const setWinner = useCallback((draft: GameState, winnerId: string, reason: string) => {
        const winner = draft.players.find(p => p.id === winnerId);
        if (winner && !draft.winner) {
            draft.winner = winner;
            draft.phase = GamePhase.GAME_OVER;
            draft.winReason = reason;
            winner.isImmune = true;
            // Truncate long winner names
            const winnerName = winner.name.length > 20 ? `${winner.name.substring(0, 17)}...` : winner.name;
            addLog(`${winnerName} wins! Their rows are now immune to all effects.`, 'system');
        }
    }, [addLog]);

    const ensureDeckHasCards = useCallback((draft: GameState): boolean => {
        if (draft.deck.length > 0) return true;

        if (draft.discardPile.length > 0) {
            addLog("Deck is empty. Shuffling discard pile and refreshing Swap Bar.", 'system');
            
            const cardsToReshuffle = [...draft.discardPile];
            draft.swapBar.forEach(card => {
                if (card) cardsToReshuffle.push(card);
            });
            draft.swapBar = [];

            draft.deck = shuffleDeck(cardsToReshuffle);
            draft.discardPile = [];
            
            // Refresh Swap Bar
            for (let i = 0; i < SWAP_BAR_SIZE; i++) {
                if (draft.deck.length > 0) {
                    draft.swapBar.push(draft.deck.pop()!);
                } else {
                    draft.swapBar.push(null);
                }
            }
            if (draft.swapBar.length > 0) {
                const faceUpIndex = Math.floor(SWAP_BAR_SIZE / 2);
                draft.swapBar.forEach((card, index) => {
                    if (card) card.isFaceUp = (index === faceUpIndex);
                });
            }

            return true;
        }

        // Exhaustion Win Condition
        addLog("Deck and discard pile are empty! Determining winner by score...", 'system');
        const p1 = draft.players[0];
        const p2 = draft.players[1];
        const score1 = calculatePlayerScore(p1);
        const score2 = calculatePlayerScore(p2);
        const diff1 = Math.abs(WINNING_SCORE - score1);
        const diff2 = Math.abs(WINNING_SCORE - score2);

        if (diff1 < diff2) {
            setWinner(draft, p1.id, "Won by Exhaustion (Closest to 21)!");
        } else if (diff2 < diff1) {
            setWinner(draft, p2.id, "Won by Exhaustion (Closest to 21)!");
        } else {
            addLog("Scores are tied! Checking tiebreakers...", 'system');
            const royalty1 = p1.royaltyRow.length;
            const royalty2 = p2.royaltyRow.length;
            if (royalty1 > royalty2) {
                setWinner(draft, p1.id, "Won by Tiebreaker (Most Royalty Cards)!");
            } else if (royalty2 > royalty1) {
                setWinner(draft, p2.id, "Won by Tiebreaker (Most Royalty Cards)!");
            } else {
                addLog("Royalty cards are tied! Checking hand size...", 'system');
                const hand1 = p1.hand.length;
                const hand2 = p2.hand.length;
                if (hand1 < hand2) {
                    setWinner(draft, p1.id, "Won by Tiebreaker (Fewest Cards in Hand)!");
                } else if (hand2 < hand1) {
                    setWinner(draft, p2.id, "Won by Tiebreaker (Fewest Cards in Hand)!");
                } else {
                    addLog("Hand sizes are tied! Winner is chosen randomly.", 'system');
                    const randomWinner = Math.random() < 0.5 ? p1 : p2;
                    setWinner(draft, randomWinner.id, "Won by Final Tiebreaker (Random)!");
                }
            }
        }
        return false;
    }, [addLog, setWinner]);

    const startTurn = useCallback((draft: GameState) => {
        const isFirstTurnOfGame = draft.turn === 1;
        const currentPlayer = draft.players[draft.currentPlayerIndex];
        
        addLog(`--- Turn ${Math.ceil(draft.turn/2)} for ${currentPlayer.name} ---`, 'system');

        // --- Maintenance Phase (starts from turn 2 onwards) ---
        if (!isFirstTurnOfGame) {
            addLog(`Maintenance Phase...`, 'system');
            
            const playerOrderForCheck = [
                draft.players[draft.currentPlayerIndex],
                draft.players[draft.currentPlayerIndex === 0 ? 1 : 0]
            ];
            
            let winnerFound = false;

            playerOrderForCheck.forEach(p => {
                if(p.isImmune || winnerFound) return;
                
                const acesOnBoard = [...p.scoreRow, ...p.royaltyRow].filter(c => c.rank === 'A');
                if (acesOnBoard.length > 0) {
                    addLog(`${p.name}'s Aces are cycling.`, p.isAI ? 'ai' : 'player');
                    acesOnBoard.forEach(ace => {
                        const oldValue = ace.aceValue || 1;
                        ace.aceValue = (oldValue === 1 ? 3 : oldValue === 3 ? 5 : 1) as AceValue;
                    });
                }
                 if (calculatePlayerScore(p) === WINNING_SCORE) {
                    setWinner(draft, p.id, "Won during Maintenance Phase!");
                    winnerFound = true;
                }
            });
            
            if (winnerFound) return;
        }

        // Reset states for the new turn
        draft.actionState = ActionState.IDLE;
        draft.selectedCardId = null;
        draft.effectCardId = null;
        draft.selectedCardIds = [];
        draft.selectedSwapCardId = null;
        draft.swapUsedThisTurn = false;
        draft.luckyDrawChainUsed = false;
        draft.effectContext = null;
        draft.optionChoices = [];

        // Set phase for the new player's turn
        draft.phase = currentPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.PLAYER_TURN;
    }, [addLog, setWinner]);

  const endTurn = useCallback(() => {
    updateGameState(draft => {
        if (!draft || draft.phase === GamePhase.GAME_OVER) return;

        const currentPlayer = draft.players[draft.currentPlayerIndex];

        if (currentPlayer.hand.length > HAND_LIMIT) {
            draft.actionState = ActionState.AWAITING_END_TURN_DISCARD;
            addLog(`${currentPlayer.name} must discard ${currentPlayer.hand.length - HAND_LIMIT} card(s) to end their turn.`, 'system');
            draft.phase = currentPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.PLAYER_TURN;
            return;
        }

        if (calculatePlayerScore(currentPlayer) === WINNING_SCORE) {
            setWinner(draft, currentPlayer.id, "Reached 21 Points!");
            return;
        }
        
        draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
        draft.turn += 1;
        
        const nextPlayer = draft.players[draft.currentPlayerIndex];
        
        // --- Overcharge Check ---
        if (calculatePlayerScore(nextPlayer) > WINNING_SCORE) {
            addLog(`${nextPlayer.name} is Overcharged! Must discard from rows until score is ${WINNING_SCORE} or less.`, 'system');
            draft.actionState = ActionState.AWAITING_OVERCHARGE_DISCARD;
            draft.phase = nextPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.PLAYER_TURN;
            return;
        }

        startTurn(draft);
    });
  }, [addLog, updateGameState, setWinner, startTurn]);
  
  const { requestAction, resolveAction } = useMemo(() => {
    function resolveAction(draft: GameState, action: GameAction, success: boolean): boolean {
        const player = draft.players.find(p => p.id === action.playerId)!;
        const opponent = draft.players.find(p => p.id !== action.playerId)!;

        if (!success) {
            addLog(`${player.name}'s action was countered!`, 'system');
            return true; // Turn ends
        } else if (draft.counterStack.length > 0) {
            addLog(`The action was not countered and resolves successfully!`, 'system');
        }
        
        let turnShouldEnd = true;

        switch(action.type) {
            case 'PLAY_CARD':
            case 'ROYAL_PLAY': {
                const { cardId, row } = action.payload;
                const cardResult = findCard(player.hand, cardId);
                if (cardResult) {
                    const { card, cardIndex } = cardResult;
                    
                    const isSecondQueenPlay = card.rank === 'Q' && row === 'royaltyRow' && player.royaltyRow.filter(c => c.rank === 'Q').length === 1;
                    const isSecondEightPlay = card.rank === '8' && row === 'scoreRow' && player.scoreRow.filter(c => c.rank === '8').length === 1;

                    card.isFaceUp = true;
                    player.hand.splice(cardIndex, 1);
                    player[row].push(card);
                    addLog(`${player.name} plays a ${card.rank} to their ${row === 'scoreRow' ? 'Score' : 'Royalty'} Row.`, player.isAI ? 'ai' : 'player');

                    if (isSecondQueenPlay) {
                        turnShouldEnd = false;
                        requestAction({
                            id: uuidv4(),
                            type: 'SECOND_QUEEN_EDICT',
                            playerId: player.id,
                            payload: {},
                            counterVerb: 'use the Second Queen Edict',
                        });
                    }
                    
                    if (isSecondEightPlay) {
                        addLog(`Second Eight Played: ${opponent.name} must play with their hand revealed!`, 'system');
                        opponent.handRevealedUntilTurn = draft.turn + 2;
                    }
                    
                    if (card.rank === '8' && row === 'scoreRow') {
                        card.oneTimeProtection = true;
                        addLog(`The 8 gains one-time protection from scuttling.`, 'system');
                        if (player.royaltyRow.some(c => c.rank === 'Q')) {
                            addLog(`Queen synergy: The 8 lets ${player.name} draw a card.`, player.isAI ? 'ai' : 'player');
                            if(ensureDeckHasCards(draft)) {
                                const drawnCard = draft.deck.pop()!;
                                drawnCard.isFaceUp = false;
                                player.hand.push(drawnCard);
                            }
                        }
                    }
                    
                    if (card.rank === '5' && row === 'scoreRow') {
                        turnShouldEnd = false;
                        if (draft.discardPile.length > 0) {
                            requestAction({
                                id: uuidv4(),
                                type: 'RUMMAGER_EFFECT',
                                playerId: player.id,
                                payload: {},
                                counterVerb: 'use the Rummager retrieval effect',
                            });
                        } else {
                            addLog(`Rummager effect has no cards to choose from.`, 'system');
                            turnShouldEnd = true;
                        }
                    }
                }
                break;
            }
            case 'SECOND_QUEEN_EDICT': {
                addLog(`Second Queen Edict: ${player.name} draws 1, ${opponent.name} discards 1.`, 'system');
                if (ensureDeckHasCards(draft)) {
                    const drawnCard = draft.deck.pop()!;
                    drawnCard.isFaceUp = !player.isAI;
                    player.hand.push(drawnCard);
                }
                if (opponent.hand.length > 0) {
                    const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                    draft.discardPile.push(opponent.hand.splice(randomIndex, 1)[0]);
                }
                break;
            }
            case 'RUMMAGER_EFFECT': {
                turnShouldEnd = false; 
                const choices: Card[] = [];
                if (draft.discardPile.length > 0) choices.push(draft.discardPile[draft.discardPile.length - 1]);
                if (draft.discardPile.length > 1) choices.push(draft.discardPile[0]);
                choices.forEach(c => c.isFaceUp = true);
                draft.cardChoices = [...new Map(choices.map(item => [item['id'], item])).values()];
                draft.cardChoiceContext = { type: 'RUMMAGER' };
                draft.actionState = ActionState.AWAITING_RUMMAGER_CHOICE;
                addLog(`Rummager: Choose a card from the discard pile.`, 'system');
                break;
            }
            case 'SCUTTLE': {
                const { attackerCardId, targetCardId, targetOwnerId } = action.payload;
                const targetOwner = draft.players.find(p => p.id === targetOwnerId)!;
                const attackerCardResult = findCard(player.hand, attackerCardId);
                const targetCardResult = findCard(targetOwner.scoreRow, targetCardId);

                if (attackerCardResult && targetCardResult) {
                    const { card: attackerCard } = attackerCardResult;
                    if (targetCardResult.card.oneTimeProtection) {
                        addLog(`Scuttle failed! ${targetOwner.name}'s 8 was protected. The protection is now gone.`, 'system');
                        targetOwner.scoreRow[targetCardResult.cardIndex].oneTimeProtection = false;
                        moveCard(player.hand, draft.discardPile, attackerCardId);
                    } else {
                        addLog(`${player.name} scuttles ${targetOwner.name}'s ${targetCardResult.card.rank} with a ${attackerCard.rank}.`, player.isAI ? 'ai' : 'player');
                        moveCard(player.hand, draft.discardPile, attackerCardId);
                        moveCard(targetOwner.scoreRow, draft.discardPile, targetCardId);

                        if (attackerCard.rank === '9') {
                            turnShouldEnd = false;
                            addLog(`Nine's effect: Peeking at top 2 cards...`, 'system');
                            if (ensureDeckHasCards(draft)) {
                                draft.actionState = ActionState.AWAITING_NINE_PEEK_CHOICE;
                                const numToPeek = Math.min(2, draft.deck.length);
                                draft.cardChoices = draft.deck.splice(draft.deck.length - numToPeek, numToPeek).reverse();
                                draft.cardChoiceContext = { type: 'NINE_SCUTTLE_PEEK' };
                            } else {
                                turnShouldEnd = true;
                            }
                        }
                    }
                }
                break;
            }
            case 'BASE_EFFECT': {
                const { cardId, rank } = action.payload;
                const resolveEffect = (rankToResolve: Rank) => {
                    if (rankToResolve === 'J') {
                        addLog(`Jack's Steal: Select a card from any Score Row.`, 'system');
                        draft.actionState = ActionState.AWAITING_JACK_TARGET;
                    } else if (rankToResolve === '7') {
                        if (!ensureDeckHasCards(draft) || draft.deck.length < 2) { addLog(`Lucky Draw failed. Not enough cards in deck.`, 'error'); turnShouldEnd = true; return; }
                        addLog(`Lucky Draw: Choose a card to play to your Score Row. The other goes to your hand.`, 'system');
                        draft.cardChoices = draft.deck.splice(draft.deck.length - 2, 2).reverse();
                        draft.cardChoices.forEach(c => c.isFaceUp = true);
                        draft.cardChoiceContext = { type: 'LUCKY_DRAW' };
                        draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
                    } else if (rankToResolve === '6') {
                        if (!ensureDeckHasCards(draft) || draft.deck.length < 3) { addLog(`The Farmer failed. Not enough cards in deck.`, 'error'); turnShouldEnd = true; return; }
                        addLog(`The Farmer: Choose a card to place back on top of the deck. The others go to your hand.`, 'system');
                        draft.cardChoices = draft.deck.splice(draft.deck.length - 3, 3).reverse();
                        draft.cardChoices.forEach(c => c.isFaceUp = true);
                        draft.cardChoiceContext = { type: 'FARMER' };
                        draft.actionState = ActionState.AWAITING_FARMER_CHOICE;
                    } else if (rankToResolve === '4') {
                        addLog(`Soft Reset: Select a card in any Score or Royalty row to target that row.`, 'system');
                        draft.actionState = ActionState.AWAITING_SOFT_RESET_TARGET_ROW;
                    } else if (rankToResolve === '3') {
                        addLog(`Interrogator: Choose an effect to resolve.`, 'system');
                        draft.optionChoices = [
                            { label: 'Force opponent to discard 2 random cards', value: 'discard' },
                            { label: 'View 3 of opponent\'s cards, then steal 1', value: 'steal' },
                        ];
                        draft.actionState = ActionState.AWAITING_INTERROGATOR_CHOICE;
                    }
                };
                
                turnShouldEnd = false;

                if (cardId) {
                    const cardResult = findCard(player.hand, cardId);
                    if (cardResult) {
                       player.hand.splice(cardResult.cardIndex, 1);
                       draft.discardPile.push(cardResult.card);
                       draft.effectCardId = cardId;
                    } else {
                       // Card may have been discarded by Mimic already
                       if (draft.discardPile[draft.discardPile.length - 1]?.id === cardId) {
                         draft.effectCardId = cardId;
                       }
                    }
                }
                
                if (rank === '2') {
                    addLog(`Mimic: Choose a Base Effect to copy.`, 'system');
                    draft.optionChoices = [ { label: '3 - Interrogator', value: '3' }, { label: '4 - Soft Reset', value: '4' }, { label: '6 - The Farmer', value: '6' }, { label: '7 - Lucky Draw', value: '7' }];
                    draft.actionState = ActionState.AWAITING_MIMIC_CHOICE;
                } else {
                    resolveEffect(rank);
                }
                break;
            }
            case 'ROYAL_MARRIAGE': {
                const { kingId, queenId } = action.payload;
                addLog(`${player.name} plays a Royal Marriage!`, player.isAI ? 'ai' : 'player');
                moveCard(player.hand, player.royaltyRow, kingId)!.isFaceUp = true;
                moveCard(player.hand, player.royaltyRow, queenId)!.isFaceUp = true;
                break;
            }
        }
        
        draft.selectedCardId = null;
        if (calculatePlayerScore(player) === WINNING_SCORE) {
          setWinner(draft, player.id, "Reached 21 Points!");
          turnShouldEnd = false;
        }
        
        return turnShouldEnd;
    }

    function requestAction(action: GameAction) {
      updateGameState(draft => {
          if (action.isUncounterable) {
              const turnShouldEnd = resolveAction(draft, action, true);
              if (turnShouldEnd) {
                setTimeout(() => endTurn(), 500);
              }
          } else {
              addLog(`${draft.players.find(p => p.id === action.playerId)?.name} is attempting to ${action.counterVerb}...`, 'system');
              draft.actionContext = action;
              draft.counterStack = [];
              draft.consecutivePasses = 0;
              draft.phase = GamePhase.COUNTER;
              draft.actionState = ActionState.AWAITING_COUNTER;
              draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
          }
      });
    }

    return { requestAction, resolveAction };
  }, [addLog, endTurn, setWinner, ensureDeckHasCards, updateGameState]);

  const handlePass = useCallback(() => {
    updateGameState(draft => {
        if (!draft || draft.phase !== GamePhase.COUNTER || !draft.actionContext) return;

        const passingPlayer = draft.players[draft.currentPlayerIndex];
        addLog(`${passingPlayer.name} passes.`, passingPlayer.isAI ? 'ai' : 'player');
        
        draft.consecutivePasses += 1;
        const isActionFromOpponent = draft.actionContext.playerId !== passingPlayer.id;

        // If the opponent to the action passes, the action succeeds.
        if (isActionFromOpponent) {
            const success = draft.counterStack.length % 2 === 0;
            const originalAction = { ...draft.actionContext };
            draft.currentPlayerIndex = draft.players.findIndex(p => p.id === originalAction.playerId) as 0 | 1;
            
            const turnShouldEnd = resolveAction(draft, originalAction, success);
            
            draft.actionContext = null;
            draft.counterStack = [];
            draft.phase = draft.players[draft.currentPlayerIndex].isAI ? GamePhase.AI_THINKING : GamePhase.PLAYER_TURN;
            if (turnShouldEnd) {
                draft.actionState = ActionState.IDLE;
                setTimeout(() => endTurn(), 500);
            }
        } else { // Current player passed on countering a counter
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0; // Turn flips back
            // Since there must be 2 passes to resolve, we wait for the other player
        }
    });
  }, [resolveAction, updateGameState, endTurn, addLog]);

  const handlePlayCounter = useCallback((cardId: string) => {
    updateGameState(draft => {
        if (!draft || draft.phase !== GamePhase.COUNTER) return;
        const player = draft.players[draft.currentPlayerIndex];
        const cardResult = findCard(player.hand, cardId);
        if (cardResult) {
            addLog(`${player.name} counters with a ${cardResult.card.rank}!`, player.isAI ? 'ai' : 'player');
            moveCard(player.hand, draft.counterStack, cardId);
            draft.consecutivePasses = 0;
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
        }
    });
  }, [updateGameState, addLog]);
  
  const handleDrawCard = useCallback(() => {
    if (!gameState || gameState.phase === GamePhase.GAME_OVER) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    
    updateGameState(draft => {
      if (!draft) return;
      if (!ensureDeckHasCards(draft)) return;

      const drawnCard = draft.deck.pop()!;
      drawnCard.isFaceUp = !player.isAI;
      draft.players[draft.currentPlayerIndex].hand.push(drawnCard);
      addLog(`${player.name} draws a card.`, player.isAI ? 'ai' : 'player');
    });
    
    setTimeout(() => endTurn(), 500);
  }, [gameState, addLog, endTurn, updateGameState, ensureDeckHasCards]);
  
  const handlePlayCard = useCallback((cardId: string, row: 'scoreRow' | 'royaltyRow') => {
    if(!gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const cardResult = findCard(player.hand, cardId);
    if (!cardResult) return;
    const { card } = cardResult;
    
    if (row === 'royaltyRow' && !['J', 'Q', 'K'].includes(card.rank)) {
        addLog(`Invalid Action: Only royalty (J, Q, K) can be played to the Royalty Row.`, 'error');
        updateGameState(draft => {
            draft.actionState = ActionState.IDLE;
            draft.selectedCardId = null;
        });
        return;
    }
    if (card.rank === 'K' && row === 'scoreRow') {
        addLog('Invalid Action: Kings can only be played to the Royalty Row.', 'error');
        updateGameState(draft => {
            draft.actionState = ActionState.IDLE;
            draft.selectedCardId = null;
        });
        return;
    }

    const isRoyalPlay = (card.rank === 'J' && row === 'royaltyRow') || ['Q', 'K'].includes(card.rank);

    requestAction({
        id: uuidv4(),
        type: isRoyalPlay ? 'ROYAL_PLAY' : 'PLAY_CARD',
        playerId: player.id,
        payload: { cardId, row },
        counterVerb: `play a ${card.rank}`,
        isUncounterable: (card.rank === '5' && row === 'scoreRow') || (card.rank === 'J' && row === 'scoreRow')
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handleScuttle = useCallback((attackerCardId: string, targetCardId: string, targetOwnerId: string) => {
    if(!gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const targetOwner = gameState.players.find(p => p.id === targetOwnerId)!;
    
    const attackerCardResult = findCard(player.hand, attackerCardId);
    const targetCardResult = findCard(targetOwner.scoreRow, targetCardId);
    
    if (!attackerCardResult || !targetCardResult) return;
    
    const attackerCard = attackerCardResult.card;
    const targetCard = targetCardResult.card;
    
    const isProtectedByQueen = targetOwner.royaltyRow.some(c => c.rank === 'Q');
    const targetIsAce = targetCard.rank === 'A';
    const attackerIsTen = attackerCard.rank === '10';

    if (targetOwner.isImmune || ((isProtectedByQueen || targetIsAce) && !attackerIsTen)) {
        addLog(`Scuttle failed. Target is protected.`, 'error');
        updateGameState(draft => { draft.actionState = ActionState.IDLE; draft.selectedCardId = null; });
        return;
    }
    
    const attackerIsRoyal = ['J', 'Q', 'K'].includes(attackerCard.rank);
    if (!attackerIsRoyal && getCardValue(attackerCard, 'scoreRow') < getCardValue(targetCard, 'scoreRow')) {
        addLog(`Scuttle failed. ${attackerCard.rank} is not strong enough.`, 'error');
        updateGameState(draft => { draft.actionState = ActionState.IDLE; draft.selectedCardId = null; });
        return;
    }
    
    requestAction({
        id: uuidv4(),
        type: 'SCUTTLE',
        playerId: player.id,
        payload: { attackerCardId, targetCardId, targetOwnerId },
        counterVerb: `scuttle a ${targetCard.rank}`
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handlePlayForEffect = useCallback((cardId: string) => {
    if(!gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const opponent = gameState.players[player.id === PLAYER1_ID ? 1 : 0];
    const cardResult = findCard(player.hand, cardId);
    if (!cardResult) return;
    const { card } = cardResult;

    if (opponent.isImmune && ['J', '4', '3'].includes(card.rank)) {
        addLog(`Effect failed! Opponent's rows are immune.`, 'error');
        updateGameState(draft => { draft.actionState = ActionState.IDLE; draft.selectedCardId = null; });
        return;
    }
     if(card.rank === 'J') {
        const anyPlayerHasTargets = gameState.players.some(p => p.scoreRow.length > 0 && !p.isImmune);
        const opponentProtected = opponent.royaltyRow.some(c => c.rank === 'Q');
        const opponentIsOnlyTarget = !player.scoreRow.some(c => c.rank) && opponent.scoreRow.some(c => c.rank);
        if (!anyPlayerHasTargets || (opponentIsOnlyTarget && opponentProtected)) {
             addLog(`Jack's effect failed. No valid targets.`, 'error');
             updateGameState(draft => { draft.actionState = ActionState.IDLE; draft.selectedCardId = null; });
             return;
        }
    }

    requestAction({
        id: uuidv4(),
        type: 'BASE_EFFECT',
        playerId: player.id,
        payload: { cardId, rank: card.rank },
        isUncounterable: card.rank === '6', // The Farmer is uncounterable
        counterVerb: `use the ${card.rank}'s effect`
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handleRoyalMarriage = useCallback((cardId: string) => {
    if(!gameState) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const selected = findCard(player.hand, cardId);
    if (!selected) return;
    const partnerRank = selected.card.rank === 'K' ? 'Q' : 'K';
    const partner = findCard(player.hand, c => c.rank === partnerRank && c.color === selected.card.color);
    if (!partner) return;
    
    requestAction({
        id: uuidv4(),
        type: 'ROYAL_MARRIAGE',
        playerId: player.id,
        payload: { kingId: selected.card.rank === 'K' ? selected.card.id : partner.card.id, queenId: selected.card.rank === 'Q' ? selected.card.id : partner.card.id },
        counterVerb: `play a Royal Marriage`
    });
  }, [gameState, requestAction]);

  const handleEffectPlacement = useCallback((row: 'scoreRow' | 'royaltyRow') => {
    let turnShouldEnd = true;
    updateGameState(draft => {
        if (!draft || !draft.effectContext || draft.effectContext.type !== 'JACK_STEAL') return;
        
        const player = draft.players[draft.currentPlayerIndex];
        const { stolenCard } = draft.effectContext;
        
        player[row].push(stolenCard);
        addLog(`${player.name} places the stolen ${stolenCard.rank} in their ${row === 'scoreRow' ? 'Score' : 'Royalty'} Row.`, player.isAI ? 'ai' : 'player');
        
        if (calculatePlayerScore(player) === WINNING_SCORE) {
            setWinner(draft, player.id, "Reached 21 Points!");
            turnShouldEnd = false;
        }

        draft.effectContext = null;
        draft.actionState = ActionState.IDLE;
        draft.effectCardId = null;
    });
    if(turnShouldEnd){
        setTimeout(() => endTurn(), 500);
    }
  }, [addLog, endTurn, updateGameState, setWinner]);
  
  const handleCardChoice = useCallback((chosenCardId: string) => {
    let turnShouldEnd = true;
    updateGameState(draft => {
        if (!draft || !draft.cardChoiceContext || draft.phase === GamePhase.GAME_OVER) return;
        
        const player = draft.players[draft.currentPlayerIndex];
        const chosenCard = draft.cardChoices.find(c => c.id === chosenCardId);
        if (!chosenCard) return;

        switch(draft.cardChoiceContext.type) {
            case 'NINE_SCUTTLE_PEEK': {
                const otherCard = draft.cardChoices.find(c => c.id !== chosenCardId);
                addLog(`${player.name} puts a card on top of the deck and draws the other.`, player.isAI ? 'ai' : 'player');
                if (otherCard) draft.deck.push(otherCard);
                draft.deck.push(chosenCard); 
                if (ensureDeckHasCards(draft)) {
                    const cardToDraw = draft.deck.pop()!;
                    cardToDraw.isFaceUp = !player.isAI;
                    player.hand.push(cardToDraw);
                }
                break;
            }
            case 'LUCKY_DRAW': {
                const otherCard = draft.cardChoices.find(c => c.id !== chosenCardId)!;

                if (chosenCard.rank === '7' && !draft.luckyDrawChainUsed) {
                    draft.luckyDrawChainUsed = true;
                    addLog(`Lucky Draw chains! You chose another 7. You get another Lucky Draw.`, player.isAI ? 'ai' : 'player');
                    otherCard.isFaceUp = !player.isAI;
                    player.hand.push(otherCard);
                    draft.discardPile.push(chosenCard);
                    
                    if (!ensureDeckHasCards(draft) || draft.deck.length < 2) { 
                        addLog(`Lucky Draw chain failed. Not enough cards in deck.`, 'error'); 
                        turnShouldEnd = true; 
                    } else {
                        draft.cardChoices = draft.deck.splice(draft.deck.length - 2, 2).reverse();
                        draft.cardChoices.forEach(c => c.isFaceUp = true);
                        draft.cardChoiceContext = { type: 'LUCKY_DRAW' };
                        draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
                        turnShouldEnd = false;
                    }

                } else {
                    addLog(`${player.name} plays the ${chosenCard.rank} to their Score Row and keeps the ${otherCard.rank}.`, player.isAI ? 'ai' : 'player');
                    chosenCard.isFaceUp = true;
                    player.scoreRow.push(chosenCard);
                    otherCard.isFaceUp = !player.isAI;
                    player.hand.push(otherCard);
                }
                break;
            }
            case 'FARMER': {
                const otherCards = draft.cardChoices.filter(c => c.id !== chosenCardId);
                addLog(`${player.name} puts a card back on the deck and keeps two.`, player.isAI ? 'ai' : 'player');
                chosenCard.isFaceUp = false;
                draft.deck.push(chosenCard);
                otherCards.forEach(card => {
                    card.isFaceUp = !player.isAI;
                    player.hand.push(card);
                });
                break;
            }
            case 'RUMMAGER': {
                const cardResult = findCard(draft.discardPile, chosenCardId);
                if (cardResult) {
                    moveCard(draft.discardPile, player.hand, chosenCardId);
                    cardResult.card.isFaceUp = !player.isAI;
                    addLog(`${player.name} retrieves the ${cardResult.card.rank} from the discard pile.`, player.isAI ? 'ai' : 'player');
                }
                break;
            }
            case 'INTERROGATOR_STEAL': {
                const effectContext = draft.effectContext;
                if (effectContext?.type !== 'INTERROGATOR_REVEAL') return;

                const opponent = draft.players.find(p => p.id === effectContext.revealedFrom)!;
                const stolenCardResult = findCard(draft.cardChoices, chosenCardId);
                
                if (stolenCardResult) {
                    const stolenCard = stolenCardResult.card;
                    const returnedCards = draft.cardChoices.filter(c => c.id !== chosenCardId);

                    stolenCard.isFaceUp = !player.isAI;
                    player.hand.push(stolenCard);
                    addLog(`${player.name} steals a ${stolenCard.rank} from ${opponent.name}.`, player.isAI ? 'ai' : 'player');
                    
                    returnedCards.forEach(card => opponent.hand.push(card));
                }
                
                draft.cardChoices = [];
                draft.effectContext = null;
                draft.effectCardId = null;
                break;
            }
        }

        if(turnShouldEnd) {
          draft.cardChoices = [];
          draft.cardChoiceContext = null;
          draft.actionState = ActionState.IDLE;
          draft.effectCardId = null;
        }


        if (calculatePlayerScore(player) === WINNING_SCORE) {
          setWinner(draft, player.id, "Reached 21 Points!");
          turnShouldEnd = false;
        }
    });
    if (turnShouldEnd) {
      setTimeout(() => endTurn(), 500);
    }
  }, [addLog, endTurn, updateGameState, setWinner, ensureDeckHasCards]);

    const handleOptionChoice = useCallback((choice: string) => {
        let turnShouldEnd = false;
        updateGameState(draft => {
            if (!draft || draft.actionState === ActionState.IDLE) return;
            const player = draft.players[draft.currentPlayerIndex];
            const opponent = draft.players[draft.currentPlayerIndex === 0 ? 1 : 0];

            switch(draft.actionState) {
                case ActionState.AWAITING_MIMIC_CHOICE: {
                    if (!draft.effectCardId) return;
                    addLog(`${player.name} chooses to mimic the effect of a ${choice}.`, player.isAI ? 'ai' : 'player');
                    
                    const cardResult = findCard(draft.discardPile, draft.effectCardId);
                    
                    const mimicAction: GameAction = {
                        id: uuidv4(),
                        type: 'BASE_EFFECT',
                        playerId: player.id,
                        payload: { cardId: cardResult?.card.id, rank: choice as Rank },
                        isUncounterable: choice === '6',
                        counterVerb: `mimic a ${choice}`
                    };
                    draft.phase = GamePhase.PLAYER_TURN;
                    draft.actionState = ActionState.IDLE;
                    draft.optionChoices = [];
                    requestAction(mimicAction);
                    break;
                }
                case ActionState.AWAITING_INTERROGATOR_CHOICE: {
                    if (!draft.effectCardId) return;
                    
                    if (choice === 'discard') {
                        if (opponent.hand.length < 2) {
                            addLog(`Interrogator fails. Opponent has fewer than 2 cards.`, 'error');
                        } else {
                            addLog(`Interrogator forces ${opponent.name} to discard 2 cards at random.`, 'system');
                            for (let i = 0; i < 2; i++) {
                                const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                                const discardedCard = opponent.hand.splice(randomIndex, 1)[0];
                                draft.discardPile.push(discardedCard);
                            }
                        }
                        turnShouldEnd = true;
                    } else if (choice === 'steal') {
                         if (opponent.hand.length === 0) {
                            addLog(`Interrogator fails. Opponent has no cards.`, 'error');
                            turnShouldEnd = true;
                            return;
                        }
                        addLog(`Interrogator: ${opponent.name} must reveal 3 cards. ${player.name} will steal one.`, 'system');
                        const cardsToRevealCount = Math.min(3, opponent.hand.length);
                        const revealedCards: Card[] = [];
                        const handCopy = [...opponent.hand];
                        for(let i=0; i < cardsToRevealCount; i++) {
                             const randomIndex = Math.floor(Math.random() * handCopy.length);
                             revealedCards.push(handCopy.splice(randomIndex, 1)[0]);
                        }
                        revealedCards.forEach(c => {
                          const idx = opponent.hand.findIndex(hc => hc.id === c.id);
                          if(idx > -1) opponent.hand.splice(idx, 1);
                        });

                        revealedCards.forEach(c => c.isFaceUp = true);
                        draft.cardChoices = revealedCards;
                        draft.cardChoiceContext = { type: 'INTERROGATOR_STEAL' };
                        draft.effectContext = { type: 'INTERROGATOR_REVEAL', revealedFrom: opponent.id };
                        draft.actionState = ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE;
                    }
                    draft.optionChoices = [];
                    if (turnShouldEnd) {
                        draft.effectCardId = null;
                        draft.actionState = ActionState.IDLE;
                    }
                    break;
                }
                case ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE: {
                    const effectContext = draft.effectContext;
                    if (effectContext?.type !== 'SOFT_RESET') return;
                    
                    const source = choice;
                    addLog(`${player.name} draws a card from ${source}.`, player.isAI ? 'ai' : 'player');
                    let drawnCard: Card | null | undefined = null;

                    if (source === 'Top of Deck' && ensureDeckHasCards(draft)) drawnCard = draft.deck.pop();
                    else if (source === 'Bottom of Deck' && ensureDeckHasCards(draft)) drawnCard = draft.deck.shift();
                    else if (source === 'Discard Pile') {
                        const justDiscardedIds = effectContext.discardedCards.map(c => c.id);
                        const validDiscardPile = draft.discardPile.filter(c => !justDiscardedIds.includes(c.id));
                        if (validDiscardPile.length > 0) {
                            const cardToDraw = validDiscardPile[validDiscardPile.length - 1];
                            const mainIndex = draft.discardPile.findIndex(c => c.id === cardToDraw.id);
                            if (mainIndex > -1) {
                                drawnCard = draft.discardPile.splice(mainIndex, 1)[0];
                            }
                        }
                    } else if (source.startsWith('Swap Bar')) {
                        const swapIndex = parseInt(source.split(' ')[2], 10);
                        drawnCard = draft.swapBar[swapIndex];
                        draft.swapBar[swapIndex] = null;
                    }

                    if (drawnCard) {
                        drawnCard.isFaceUp = !player.isAI;
                        player.hand.push(drawnCard);
                    } else {
                        addLog(`Could not draw from ${source} as it was empty.`, 'error');
                    }
                    
                    draft.effectContext = null;
                    draft.actionState = ActionState.IDLE;
                    draft.optionChoices = [];
                    draft.effectCardId = null;
                    turnShouldEnd = true;
                    break;
                }
            }
        });

        if (turnShouldEnd) {
            setTimeout(() => endTurn(), 500);
        }
    }, [endTurn, updateGameState, requestAction, ensureDeckHasCards, addLog]);

  const handleTakeSwapFaceUp = useCallback((cardId: string) => {
    updateGameState(draft => {
        if (!draft) return;
        const player = draft.players[draft.currentPlayerIndex];
        const cardIndex = draft.swapBar.findIndex(c => c?.id === cardId);
        if (cardIndex === -1 || draft.swapBar[cardIndex] === null) return;

        const card = draft.swapBar[cardIndex]!;
        card.isFaceUp = !player.isAI;
        player.hand.push(card);
        draft.swapBar[cardIndex] = null;
        draft.swapUsedThisTurn = true;
        addLog(`${player.name} takes the face-up ${card.rank} from the Swap Bar.`, 'player');
    });
     setTimeout(() => endTurn(), 500);
  }, [addLog, endTurn, updateGameState]);

  const handleSwapWithFaceDown = useCallback((handCardId: string, swapCardId: string) => {
    updateGameState(draft => {
        if (!draft) return;
        const player = draft.players[draft.currentPlayerIndex];
        const handCardResult = findCard(player.hand, handCardId);
        const swapCardIndex = draft.swapBar.findIndex(c => c?.id === swapCardId);

        if (!handCardResult || swapCardIndex === -1 || draft.swapBar[swapCardIndex] === null) return;
        
        const handCard = handCardResult.card;
        const swapCard = draft.swapBar[swapCardIndex]!;

        player.hand.splice(handCardResult.cardIndex, 1, swapCard);
        draft.swapBar[swapCardIndex] = handCard;
        
        swapCard.isFaceUp = !player.isAI;
        handCard.isFaceUp = true;
        
        draft.swapUsedThisTurn = true;
        addLog(`${player.name} swaps a ${handCard.rank} for a card from the Swap Bar.`, 'player');

        draft.actionState = ActionState.IDLE;
        draft.selectedCardId = null;
        draft.selectedSwapCardId = null;
    });

    if (gameState?.phase === GamePhase.PLAYER1_START) {
        setTimeout(() => endTurn(), 500);
    }
  }, [gameState, addLog, endTurn, updateGameState]);

  const handlePeekDecision = useCallback((swap: boolean) => {
    updateGameState(draft => {
        if (!draft || draft.actionState !== ActionState.AWAITING_SWAP_PEEK_CONFIRMATION) return;

        if (swap) {
            draft.actionState = ActionState.AWAITING_SWAP_HAND_CARD;
            addLog("Select a card from your hand to swap.", 'system');
        } else {
            draft.actionState = ActionState.IDLE;
            draft.selectedSwapCardId = null;
            addLog("Swap cancelled.", 'system');
        }
    });
  }, [updateGameState, addLog]);

  const handleCardClick = useCallback((card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => {
    if (!gameState || gameState.phase === GamePhase.GAME_OVER) return;
    const isCurrentPlayer = gameState.players[gameState.currentPlayerIndex].id === owner.id;
    if (!isCurrentPlayer && ![ActionState.AWAITING_SCUTTLE_TARGET, ActionState.AWAITING_JACK_TARGET, ActionState.AWAITING_SOFT_RESET_TARGET_ROW, ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE].includes(gameState.actionState)) return;

    let shouldEndTurnAfterDiscard = false;

    updateGameState(draft => {
        if (!draft || draft.winner) return;
        const player = draft.players[draft.currentPlayerIndex];
        
        switch(draft.actionState) {
            case ActionState.IDLE:
            case ActionState.CARD_SELECTED:
                if (location === 'hand' && owner.id === player.id) {
                    draft.selectedCardId = card.id === draft.selectedCardId ? null : card.id;
                    draft.actionState = card.id === draft.selectedCardId ? ActionState.CARD_SELECTED : ActionState.IDLE;
                } else if (location === 'swapBar') {
                    if (draft.swapUsedThisTurn) {
                        addLog("You have already used the Swap Bar this turn.", 'error');
                        return;
                    }
                    if (card.isFaceUp) {
                      handleTakeSwapFaceUp(card.id);
                    } else {
                        draft.actionState = ActionState.AWAITING_SWAP_PEEK_CONFIRMATION;
                        draft.selectedSwapCardId = card.id;
                        addLog("You peek at a face-down card in the Swap Bar.", 'player');
                    }
                }
                break;
            case ActionState.AWAITING_SWAP_HAND_CARD:
                 if (location === 'hand' && owner.id === player.id && draft.selectedSwapCardId) {
                    handleSwapWithFaceDown(card.id, draft.selectedSwapCardId);
                 }
                break;
            case ActionState.AWAITING_SCUTTLE_TARGET:
                 if (location === 'scoreRow' && draft.selectedCardId) {
                    handleScuttle(draft.selectedCardId, card.id, owner.id);
                 }
                break;
            case ActionState.AWAITING_JACK_TARGET:
                 if (location === 'scoreRow' && draft.selectedCardId) {
                    if (owner.isImmune) {
                        addLog(`Jack's effect failed! That player's rows are immune.`, 'error');
                        draft.actionState = ActionState.IDLE;
                        draft.selectedCardId = null;
                        return;
                    }
                    if (owner.id !== player.id) {
                        const isProtectedByQueen = owner.royaltyRow.some(c => c.rank === 'Q');
                        if(isProtectedByQueen) {
                            addLog(`Jack's effect failed. Target is protected by a Queen.`, 'error');
                            draft.actionState = ActionState.IDLE;
                            draft.selectedCardId = null;
                            return;
                        }
                    }

                    const stolenCardResult = findCard(owner.scoreRow, card.id);
                    if (!stolenCardResult) return;
                    owner.scoreRow.splice(stolenCardResult.cardIndex, 1);
                    addLog(`${player.name} steals a ${stolenCardResult.card.rank} from ${owner.name}. Choose where to place it.`, player.isAI ? 'ai' : 'player');
                    draft.effectContext = { type: 'JACK_STEAL', stolenCard: stolenCardResult.card };
                    draft.actionState = ActionState.AWAITING_JACK_PLACEMENT;
                    draft.selectedCardId = null;
                 }
                break;
            case ActionState.AWAITING_SOFT_RESET_TARGET_ROW:
                if(location === 'scoreRow' || location === 'royaltyRow') {
                    if (owner.isImmune) {
                        addLog(`Soft Reset failed! That player's rows are immune.`, 'error');
                        draft.actionState = ActionState.IDLE;
                        draft.selectedCardId = null;
                        return;
                    }
                    addLog(`Targeted ${owner.name}'s ${location}. Choose 1 or 2 cards to discard.`, 'system');
                    draft.effectContext = { type: 'SOFT_RESET', targetPlayerId: owner.id, targetRow: location, discardedCards: [] };
                    draft.actionState = ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE;
                }
                break;
            case ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE:
                if(draft.effectContext?.type === 'SOFT_RESET' && draft.effectContext.targetPlayerId === owner.id && draft.effectContext.targetRow === location) {
                    const alreadySelected = draft.selectedCardIds.includes(card.id);
                    if(alreadySelected) {
                        draft.selectedCardIds = draft.selectedCardIds.filter(id => id !== card.id);
                    } else if (draft.selectedCardIds.length < 2) {
                        draft.selectedCardIds.push(card.id);
                    }
                }
                break;
            case ActionState.AWAITING_END_TURN_DISCARD:
                if (location === 'hand' && owner.id === player.id) {
                    moveCard(player.hand, draft.discardPile, card.id);
                    addLog(`${player.name} discards a ${card.rank}.`, player.isAI ? 'ai' : 'player');
                    if (player.hand.length <= HAND_LIMIT) {
                        shouldEndTurnAfterDiscard = true;
                        draft.actionState = ActionState.IDLE;
                    }
                }
                break;
            case ActionState.AWAITING_OVERCHARGE_DISCARD:
                 if ((location === 'scoreRow' || location === 'royaltyRow') && owner.id === player.id) {
                    moveCard(player[location], draft.discardPile, card.id);
                    addLog(`${player.name} discards a ${card.rank} due to being Overcharged.`, player.isAI ? 'ai' : 'player');
                    if (calculatePlayerScore(player) <= WINNING_SCORE) {
                        addLog(`${player.name} is no longer Overcharged.`, 'system');
                        startTurn(draft);
                    }
                 }
                break;
        }
    });
    if (shouldEndTurnAfterDiscard) {
      setTimeout(() => endTurn(), 500);
    }
  }, [gameState, addLog, updateGameState, handleTakeSwapFaceUp, handleSwapWithFaceDown, handleScuttle, endTurn, startTurn]);

  const handleAction = useCallback((action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'placeEffectScore' | 'placeEffectRoyalty' | 'confirmDiscard' | 'royalMarriage' | 'restart') => {
    if (action === 'restart') {
        handleResetGame();
        return;
    }

    if (!gameState || (!gameState.selectedCardId && !['placeEffectScore', 'placeEffectRoyalty', 'confirmDiscard'].includes(action))) return;
    
    let turnShouldEnd = false;
    
    updateGameState(draft => {
        if (!draft || draft.phase === GamePhase.GAME_OVER) return;

        const cardId = draft.selectedCardId;

        switch(action) {
            case 'playScore': 
                if (cardId) handlePlayCard(cardId, 'scoreRow'); 
                break;
            case 'playRoyalty': 
                if (cardId) handlePlayCard(cardId, 'royaltyRow'); 
                break;
            case 'royalMarriage':
                if (cardId) handleRoyalMarriage(cardId);
                break;
            case 'scuttle':
                draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
                addLog("Select a card in any Score Row to scuttle.", 'system');
                break;
            case 'playForEffect': 
                if (cardId) handlePlayForEffect(cardId); 
                break;
            case 'placeEffectScore': 
                handleEffectPlacement('scoreRow'); 
                break;
            case 'placeEffectRoyalty': 
                handleEffectPlacement('royaltyRow'); 
                break;
            case 'confirmDiscard': {
                const effectContext = draft.effectContext;
                if (effectContext?.type === 'SOFT_RESET' && draft.selectedCardIds.length > 0) {
                    const player = draft.players[draft.currentPlayerIndex];
                    const targetPlayer = draft.players.find(p => p.id === effectContext.targetPlayerId)!;
                    const targetRow = effectContext.targetRow;
                    
                    const discardedCards: Card[] = [];
                    const idsToDiscard = [...draft.selectedCardIds];

                    idsToDiscard.forEach(idToDiscard => {
                       const cardResult = findCard(targetPlayer[targetRow], idToDiscard);
                       if(cardResult){
                           targetPlayer[targetRow].splice(cardResult.cardIndex, 1);
                           discardedCards.push(cardResult.card);
                       }
                    });

                    draft.discardPile.push(...discardedCards);
                    addLog(`${player.name} discards ${discardedCards.length} card(s) from ${targetPlayer.name}'s ${targetRow}.`, player.isAI ? 'ai' : 'player');

                    draft.selectedCardId = null;
                    draft.selectedCardIds = [];
                    effectContext.discardedCards = discardedCards;

                    if (discardedCards.length === 1) {
                        if (ensureDeckHasCards(draft)) {
                            const drawnCard = draft.deck.pop()!;
                            drawnCard.isFaceUp = !player.isAI;
                            player.hand.push(drawnCard);
                            addLog(`${player.name} draws a card.`, player.isAI ? 'ai' : 'player');
                        }
                        draft.effectCardId = null;
                        turnShouldEnd = true;
                    } else if (discardedCards.length === 2) {
                        const choices: { label: string, value: string }[] = [];
                        
                        if (draft.deck.length > 0) choices.push({ label: 'Draw from Top of Deck', value: 'Top of Deck' });
                        if (draft.deck.length > 1) choices.push({ label: 'Draw from Bottom of Deck', value: 'Bottom of Deck' });
                        
                        const validDiscardPile = draft.discardPile.filter(c => !discardedCards.some(dc => dc.id === c.id));
                        if (validDiscardPile.length > 0) {
                            const topDiscard = validDiscardPile[validDiscardPile.length - 1];
                            choices.push({ label: `Draw from Discard Pile (${topDiscard.rank})`, value: 'Discard Pile' });
                        }

                        draft.swapBar.forEach((c, i) => {
                            if(c) choices.push({ label: `Draw from Swap Bar (${c.rank})`, value: `Swap Bar ${i}` });
                        });

                        if(choices.length > 0) {
                            draft.optionChoices = choices;
                            draft.actionState = ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE;
                            draft.effectContext = effectContext;
                        } else {
                             addLog('Nowhere to draw from.', 'system');
                             draft.effectCardId = null;
                             turnShouldEnd = true;
                        }
                    } else {
                         draft.effectCardId = null;
                         turnShouldEnd = true;
                    }
                }
                break;
              }
        }
    });

    if (turnShouldEnd) {
        setTimeout(() => endTurn(), 500);
    }
  }, [gameState, handlePlayCard, handlePlayForEffect, handleEffectPlacement, updateGameState, addLog, endTurn, handleRoyalMarriage, ensureDeckHasCards]);

  useEffect(() => {
    if (!gameState || gameState.winner) return;
    const isAisTurn = gameState.players[gameState.currentPlayerIndex].isAI;
    if (!isAisTurn) return;

    const performAiTurn = async () => {
        if (!gameState) return; // Re-check gameState after async gap

        const { actionState, phase: currentPhase, actionContext, counterStack, players, currentPlayerIndex } = gameState;
        const aiPlayer = players[currentPlayerIndex];

        if (currentPhase === GamePhase.COUNTER && actionContext) {
            const getValidCountersFromState = (): Card[] => {
                const lastCounter = counterStack.length > 0 ? counterStack[counterStack.length - 1] : null;
                if (lastCounter) return aiPlayer.hand.filter(c => c.rank === 'A');

                switch (actionContext.type) {
                    case 'ROYAL_PLAY': case 'ROYAL_MARRIAGE': return aiPlayer.hand.filter(c => c.rank === 'K');
                    case 'SCUTTLE': return aiPlayer.hand.filter(c => c.rank === '9');
                    case 'BASE_EFFECT': case 'RUMMAGER_EFFECT': return aiPlayer.hand.filter(c => c.rank === 'A');
                    case 'SECOND_QUEEN_EDICT': return aiPlayer.hand.filter(c => ['A', '9', 'K'].includes(c.rank));
                    default: return [];
                }
            };
            
            const validCounters = getValidCountersFromState();
            const decision = await getAiCounterDecision(gameState, validCounters);
            
            addLog(`AI Reasoning: ${decision.reasoning}`, 'ai-reasoning');

            if (decision.decision === 'pass' || !decision.cardId) {
                handlePass();
            } else {
                handlePlayCounter(decision.cardId);
            }
            return;
        }

        if (actionState === ActionState.IDLE && currentPhase === GamePhase.AI_THINKING) {
            const result = await getAiTurn(gameState);
            if (!result) { handleDrawCard(); return; } // Fallback

            addLog(`AI Reasoning: ${result.reasoning}`, 'ai-reasoning');
            const { action } = result as { action: AIAction };
            
            // Execute the action from Gemini
            switch (action.type) {
                case 'DRAW': handleDrawCard(); break;
                case 'PLAY_CARD': handlePlayCard(action.cardId, action.row); break;
                case 'SCUTTLE':
                    const opponentId = gameState.players.find(p => p.id !== aiPlayer.id)!.id;
                    handleScuttle(action.attackerCardId, action.targetCardId, opponentId);
                    break;
                case 'PLAY_FOR_EFFECT': handlePlayForEffect(action.cardId); break;
                case 'ROYAL_MARRIAGE': handleRoyalMarriage(action.cardId); break;
            }
        } else {
            // For mid-turn deterministic choices, use the simple AI
            const choice = makeAiChoice(gameState);
            if (!choice) return;
            addLog(`AI is resolving a choice for ${actionState}.`, 'ai');

            updateGameState(draft => {
                if(!draft) return;
                 switch(actionState) {
                    case ActionState.AWAITING_OVERCHARGE_DISCARD: {
                        const discardChoice = choice as { cardId: string };
                        const scoreRowCard = aiPlayer.scoreRow.find(c => c.id === discardChoice.cardId);
                        if (scoreRowCard) {
                            moveCard(draft.players[draft.currentPlayerIndex].scoreRow, draft.discardPile, discardChoice.cardId);
                        } else {
                            const royaltyRowCard = aiPlayer.royaltyRow.find(c => c.id === discardChoice.cardId)!;
                             moveCard(draft.players[draft.currentPlayerIndex].royaltyRow, draft.discardPile, discardChoice.cardId);
                        }
                        addLog(`${aiPlayer.name} discards a card due to being Overcharged.`, 'ai');
                        if (calculatePlayerScore(draft.players[draft.currentPlayerIndex]) <= WINNING_SCORE) {
                            addLog(`${aiPlayer.name} is no longer Overcharged.`, 'system');
                            startTurn(draft);
                        }
                        break;
                    }
                    case ActionState.AWAITING_END_TURN_DISCARD: {
                        const discardChoice = choice as { cardId: string };
                        const cardToDiscard = aiPlayer.hand.find(c => c.id === discardChoice.cardId)!;
                         moveCard(draft.players[draft.currentPlayerIndex].hand, draft.discardPile, cardToDiscard.id);
                        addLog(`${aiPlayer.name} discards a ${cardToDiscard.rank}.`, 'ai');
                        if (draft.players[draft.currentPlayerIndex].hand.length <= HAND_LIMIT) {
                            setTimeout(() => endTurn(), 100);
                        }
                        break;
                    }
                    case ActionState.AWAITING_NINE_PEEK_CHOICE:
                    case ActionState.AWAITING_RUMMAGER_CHOICE:
                    case ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE:
                        handleCardChoice((choice as { cardId: string }).cardId);
                        break;
                    case ActionState.AWAITING_MIMIC_CHOICE:
                    case ActionState.AWAITING_INTERROGATOR_CHOICE:
                    case ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE:
                        handleOptionChoice((choice as { optionValue: string }).optionValue);
                        break;
                    case ActionState.AWAITING_JACK_TARGET:
                    case ActionState.AWAITING_SOFT_RESET_TARGET_ROW: {
                        const targetChoice = choice as { targetPlayerId: string; targetRow: 'scoreRow' | 'royaltyRow', cardId: string };
                        const targetPlayer = gameState.players.find(p => p.id === targetChoice.targetPlayerId)!;
                        const targetCard = targetPlayer[targetChoice.targetRow].find(c => c.id === targetChoice.cardId)!;
                        handleCardClick(targetCard, targetPlayer, targetChoice.targetRow);
                        break;
                    }
                    case ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE:
                        if (draft.effectContext?.type === 'SOFT_RESET') {
                           draft.selectedCardIds = (choice as { cardIds: string[] }).cardIds;
                           handleAction('confirmDiscard');
                        }
                        break;
                    case ActionState.AWAITING_JACK_PLACEMENT:
                        handleEffectPlacement('scoreRow'); // AI defaults to score row
                        break;
                 }
            });
        }
    };

    const timeoutId = setTimeout(performAiTurn, 1500);

    return () => {
        clearTimeout(timeoutId);
    };
  }, [gameState, addLog, handleDrawCard, handlePlayCard, handlePlayForEffect, handleScuttle, handleCardChoice, handleOptionChoice, handleCardClick, handleAction, handleEffectPlacement, updateGameState, handleRoyalMarriage, handlePass, handlePlayCounter, endTurn, startTurn]);


  const handleStartNewGame = () => {
    updateGameState(draft => {
      dealInitialCards(draft);
    });
  };
  
  const handleResetGame = () => {
    updateGameState(draft => {
      Object.assign(draft, createInitialGameState());
    })
  };

  const handleToggleLogVisibility = useCallback((logId: string) => {
    updateGameState(draft => {
      const logEntry = draft.log.find(log => log.id === logId);
      if (logEntry && logEntry.type === 'ai-reasoning') {
        logEntry.isRevealed = !logEntry.isRevealed;
      }
    });
  }, [updateGameState]);

  const humanPlayer = useMemo(() => gameState?.players.find(p => !p.isAI), [gameState]);
  const aiPlayer = useMemo(() => gameState?.players.find(p => p.isAI), [gameState]);
  const humanPlayerScore = useMemo(() => humanPlayer ? calculatePlayerScore(humanPlayer) : 0, [humanPlayer]);
  const aiPlayerScore = useMemo(() => aiPlayer ? calculatePlayerScore(aiPlayer) : 0, [aiPlayer]);

  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }
  
  const WinnerModal = () => {
    if (!gameState.winner) return null;
    
    const winnerName = gameState.winner.name.length > 20 ? `${gameState.winner.name.substring(0, 17)}...` : gameState.winner.name;
    const winnerGlow = gameState.winner.isAI ? 'var(--opponent-glow)' : 'var(--player-glow)';

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div 
          className="glassmorphic p-8 rounded-2xl text-center shadow-2xl border-2 max-w-md w-full relative overflow-hidden"
          style={{ borderColor: winnerGlow }}
        >
          <div 
            className="absolute inset-0 animate-[glow-pulse_4s_infinite]" 
            style={{ '--shadow-color': winnerGlow, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='${encodeURIComponent(winnerGlow)}' fill-opacity='0.15' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.99-7.5L26 15v18.5l-13 7.5L0 33.5V15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` } as React.CSSProperties}
          ></div>
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-[float_5s_ease-in-out_infinite]">
                <CosmoTechSigil className="w-24 h-24" style={{ color: winnerGlow, filter: `drop-shadow(0 0 12px ${winnerGlow})` }} />
            </div>
            <h2 className="text-5xl font-bold mb-4" style={{ textShadow: `0 0 20px ${winnerGlow}, 0 0 8px ${winnerGlow}` }}>{winnerName} Wins!</h2>
            <p className="text-xl text-[var(--text-secondary)] mb-8">{gameState.winReason}</p>
            <button
              onClick={handleResetGame}
              className="font-bold py-3 px-8 rounded-md transition-all duration-300 transform hover:scale-105 shadow-lg text-xl"
              style={{ 
                  backgroundColor: winnerGlow,
                  color: 'var(--bg-dark-void)',
                  boxShadow: `0 0 25px -5px ${winnerGlow}`
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <>
      <GameBoard
        gameState={gameState}
        player={humanPlayer}
        opponent={aiPlayer}
        playerScore={humanPlayerScore}
        opponentScore={aiPlayerScore}
        onCardClick={handleCardClick}
        onCardChoice={handleCardChoice}
        onOptionChoice={handleOptionChoice}
        onDrawCard={handleDrawCard}
        onAction={handleAction}
        onPass={handlePass}
        onPlayCounter={handlePlayCounter}
        onPeekDecision={handlePeekDecision}
        onStartNewGame={handleStartNewGame}
        onToggleLogVisibility={handleToggleLogVisibility}
        onResetGame={handleResetGame}
      />
      <WinnerModal />
    </>
  );
};

export default App;