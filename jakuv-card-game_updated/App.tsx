
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameState, Player, Card, GamePhase, ActionState, AceValue, Rank, Suit, CardColor, GameAction, AIAction, LogEntry, TutorialAction, TutorialActionType, CardChoiceType } from './types';
import { PLAYER1_ID, AI_ID, WINNING_SCORE, HAND_LIMIT, SWAP_BAR_SIZE } from './constants';
import { createInitialGameState, getCardValue, calculatePlayerScore, findCard, moveCard, shuffleDeck, dealInitialCards, getValidCounterCards } from './services/gameLogic';
import { makeAiChoice } from './services/aiService';
import { getAiTurn, getAiCounterDecision } from './services/geminiAiService';
import { createTutorialGameState, advanceTutorialStep } from './services/tutorialService';
import GameBoard from './components/GameBoard';
import WinnerModal from './components/WinnerModal';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { ADVANCED_CARD_RULES } from './components/Card';
import CampaignScreen from './components/CampaignScreen';
import { CHARACTERS } from './data/characters';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeRule, setActiveRule] = useState<{ rank: Rank; rule: React.ReactNode } | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const dialogueTimerRef = useRef<number | null>(null);


  const initializeGame = useCallback(() => {
    setGameState(createInitialGameState());
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const updateGameState = useCallback((updater: (draft: GameState) => void) => {
    setGameState(produce(updater));
  }, []);
  
  const showDialogue = useCallback((text: string) => {
    if (dialogueTimerRef.current) {
        clearTimeout(dialogueTimerRef.current);
    }
    setActiveDialogue(text);
    // Persist for 3-7 seconds depending on message length
    const duration = Math.max(3000, Math.min(7000, text.length * 75)); 
    dialogueTimerRef.current = window.setTimeout(() => {
        setActiveDialogue(null);
    }, duration);
  }, []);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'system', icon?: LogEntry['icon']) => {
    updateGameState(draft => {
      if (draft.phase === GamePhase.TUTORIAL) return; // Don't log during tutorial
      const newEntry: LogEntry = { id: uuidv4(), type, message, icon };
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
            const winnerName = winner.name.length > 20 ? `${winner.name.substring(0, 17)}...` : winner.name;
            addLog(`${winnerName} wins! Their rows are now immune to all effects.`, 'system', 'win');
            
            // Campaign Progress
            if (winnerId === PLAYER1_ID && draft.activeMissionId && !draft.campaignProgress.includes(draft.activeMissionId)) {
                draft.campaignProgress.push(draft.activeMissionId);
            }
        }
    }, [addLog]);
    
    const handleResetGame = useCallback(() => {
        const currentProgress = gameState?.campaignProgress || [];
        const activeMissionId = gameState?.activeMissionId;

        if (activeMissionId) {
            // Restarting a mission
            updateGameState(draft => {
                const character = CHARACTERS[activeMissionId];
                if (character) {
                    Object.assign(draft, createInitialGameState());
                    draft.campaignProgress = currentProgress;
                    draft.activeMissionId = activeMissionId;
                    draft.players[1].name = character.name;
                    dealInitialCards(draft);
                }
            });
        } else {
            // Restarting a standard game
            updateGameState(draft => {
              Object.assign(draft, createInitialGameState());
              draft.campaignProgress = currentProgress; // Persist campaign progress
              dealInitialCards(draft);
            })
        }
    }, [gameState, updateGameState]);
    
    const handleMainMenu = useCallback(() => {
        const currentProgress = gameState?.campaignProgress || [];
        updateGameState(draft => {
          Object.assign(draft, createInitialGameState());
          draft.campaignProgress = currentProgress;
        })
    }, [gameState, updateGameState]);


    const ensureDeckHasCards = useCallback((draft: GameState): boolean => {
        if (draft.deck.length > 0) return true;

        if (draft.discardPile.length > 0) {
            addLog("Deck is empty. Shuffling discard pile and refreshing Swap Bar.", 'system', 'info');
            
            const cardsToReshuffle = [...draft.discardPile];
            draft.swapBar.forEach(card => {
                if (card) cardsToReshuffle.push(card);
            });
            draft.swapBar = [];

            draft.deck = shuffleDeck(cardsToReshuffle);
            draft.discardPile = [];
            
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

        addLog("Deck and discard pile are empty! Determining winner by score...", 'system', 'info');
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
            // Tiebreaker logic...
        }
        return false;
    }, [addLog, setWinner]);

    const startTurn = useCallback((draft: GameState) => {
        const currentPlayer = draft.players[draft.currentPlayerIndex];
        
        // --- Maintenance Phase ---
        if (draft.turn > 1) {
            // Cycle Aces
            [...currentPlayer.scoreRow, ...currentPlayer.royaltyRow].forEach(card => {
                if (card.rank === 'A') {
                    const nextValue: AceValue = card.aceValue === 1 ? 3 : card.aceValue === 3 ? 5 : 1;
                    card.aceValue = nextValue;
                    addLog(`${currentPlayer.name}'s Ace is now worth ${nextValue} points.`, 'system', 'info');
                }
            });
        }
    
        addLog(`--- Turn ${Math.ceil(draft.turn/2)} for ${currentPlayer.name} ---`, 'system');
    
        draft.actionState = ActionState.IDLE;
        draft.selectedCardId = null;
        draft.swapUsedThisTurn = false;
        draft.phase = currentPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.PLAYER_TURN;
    }, [addLog]);

    const endTurn = useCallback(() => {
        updateGameState(draft => {
            if (!draft || draft.phase === GamePhase.GAME_OVER) return;
            const currentPlayer = draft.players[draft.currentPlayerIndex];
    
            if (currentPlayer.hand.length > HAND_LIMIT) {
                addLog(`${currentPlayer.name} has more than ${HAND_LIMIT} cards and must discard.`, 'system', 'warning');
                draft.actionState = ActionState.AWAITING_END_TURN_DISCARD;
                if (currentPlayer.isAI) {
                    draft.phase = GamePhase.AI_THINKING;
                }
                return; 
            }
    
            if (calculatePlayerScore(currentPlayer) === WINNING_SCORE) {
                setWinner(draft, currentPlayer.id, "Reached 21 Points!");
                return;
            }
    
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
            draft.turn += 1;
            const nextPlayer = draft.players[draft.currentPlayerIndex];
    
            if (calculatePlayerScore(nextPlayer) > WINNING_SCORE) {
                addLog(`${nextPlayer.name} is Overcharged! They must discard cards.`, 'system', 'warning');
                draft.actionState = ActionState.AWAITING_OVERCHARGE_DISCARD;
                if (nextPlayer.isAI) {
                    draft.phase = GamePhase.AI_THINKING;
                }
                return;
            }
    
            startTurn(draft);
        });
    }, [updateGameState, setWinner, startTurn, addLog]);
  
  const { requestAction, resolveAction } = useMemo(() => {
    function resolveAction(draft: GameState, action: GameAction, success: boolean): boolean {
        const player = draft.players.find(p => p.id === action.playerId)!;
    
        // Discard all cards used in the counter phase and reset state
        draft.counterStack.forEach(card => {
            card.isFaceUp = true;
            draft.discardPile.push(card);
        });
        draft.actionContext = null;
        draft.counterStack = [];
        draft.consecutivePasses = 0;
    
        if (!success) {
            addLog(`Action to ${action.counterVerb} was countered.`, 'system', 'warning');
            const cardToDiscardId = action.payload.cardId || action.payload.attackerCardId;
            if (cardToDiscardId) {
                const cardResult = findCard(player.hand, cardToDiscardId);
                if (cardResult) {
                    moveCard(player.hand, draft.discardPile, cardToDiscardId);
                }
            }
            endTurn();
            return false;
        }
    
        if (!action.isUncounterable) {
            addLog(`Action to ${action.counterVerb} was successful.`, 'system', 'info');
        }
    
        switch (action.type) {
            case 'PLAY_CARD':
            case 'ROYAL_PLAY': {
                const { cardId, row } = action.payload;
                const card = moveCard(player.hand, player[row], cardId);
                if (card) {
                    card.isFaceUp = true;
                    if (card.rank === '8') {
                        card.oneTimeProtection = true;
                        addLog(`${player.name}'s ${card.rank}${card.suit} gained a one-time protection shield.`, 'system', 'effect');
                    }
                }
                break;
            }
            case 'SCUTTLE': {
                const { attackerCardId, targetCardId } = action.payload;
                const opponent = draft.players.find(p => p.id !== player.id)!;
                moveCard(player.hand, draft.discardPile, attackerCardId);
                moveCard(opponent.scoreRow, draft.discardPile, targetCardId);
                break;
            }
            case 'ROYAL_MARRIAGE': {
                const { cardId } = action.payload;
                const card1Result = findCard(player.hand, cardId);

                if (!card1Result) {
                    addLog(`Royal Marriage failed: The ${action.initiatorCard?.rank}${action.initiatorCard?.suit} was not in hand after the counter phase.`, 'error', 'warning');
                    endTurn();
                    return false;
                }
                const { card: card1 } = card1Result;

                const partnerRank = card1.rank === 'K' ? 'Q' : 'K';
                const card2Result = findCard(player.hand, c => c.rank === partnerRank && c.color === card1.color);

                if (!card2Result) {
                    addLog(`Royal Marriage failed: The partner card was not in hand after the counter phase.`, 'error', 'warning');
                    // The action is consumed, so the initiator card is discarded.
                    moveCard(player.hand, draft.discardPile, card1.id);
                    endTurn();
                    return false;
                }
                const { card: card2 } = card2Result;

                moveCard(player.hand, player.royaltyRow, card1.id)!.isFaceUp = true;
                moveCard(player.hand, player.royaltyRow, card2.id)!.isFaceUp = true;
                break;
            }
            case 'BASE_EFFECT': {
                const { cardId } = action.payload;
                const cardResult = findCard(player.hand, cardId);
                if (!cardResult) return false;
                const { card } = cardResult;

                if (card.rank === '5') {
                    moveCard(player.hand, player.scoreRow, cardId);
                    draft.actionState = ActionState.AWAITING_RUMMAGER_CHOICE;
                    draft.cardChoices = draft.discardPile.filter(c => c.id !== cardId);
                    draft.cardChoiceContext = { type: 'RUMMAGER' };
                } else {
                    moveCard(player.hand, draft.discardPile, cardId);
                    switch (card.rank) {
                        case 'J':
                            draft.actionState = ActionState.AWAITING_JACK_TARGET;
                            draft.effectCardId = cardId;
                            break;
                        case '7':
                            if (!ensureDeckHasCards(draft)) { endTurn(); break; }
                            const luckyDrawChoices = [];
                            if(draft.deck.length > 0) luckyDrawChoices.push(draft.deck.pop()!);
                            if(draft.deck.length > 0) luckyDrawChoices.push(draft.deck.pop()!);
                            if (luckyDrawChoices.length > 0) {
                                draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
                                draft.cardChoices = luckyDrawChoices;
                                draft.cardChoiceContext = { type: 'LUCKY_DRAW' };
                            } else {
                                addLog("Not enough cards in deck for Lucky Draw.", 'system', 'warning');
                                endTurn();
                            }
                            break;
                        case '6':
                            if (!ensureDeckHasCards(draft)) { endTurn(); break; }
                            const farmerChoices = [];
                            for(let i=0; i<3; i++) {
                                if (draft.deck.length > 0) farmerChoices.push(draft.deck.pop()!);
                            }
                             if (farmerChoices.length > 0) {
                                draft.actionState = ActionState.AWAITING_FARMER_CHOICE;
                                draft.cardChoices = farmerChoices;
                                draft.cardChoiceContext = { type: 'FARMER' };
                            } else {
                                addLog("Not enough cards in deck for Farmer.", 'system', 'warning');
                                endTurn();
                            }
                            break;
                        case '4':
                            draft.actionState = ActionState.AWAITING_SOFT_RESET_TARGET_ROW;
                            break;
                        case '3':
                            draft.actionState = ActionState.AWAITING_INTERROGATOR_CHOICE;
                            draft.optionChoices = [
                                { label: 'View & Steal a card', value: 'steal' },
                                { label: 'Force discard a random card', value: 'discard' }
                            ];
                            break;
                        case '2':
                            draft.actionState = ActionState.AWAITING_MIMIC_CHOICE;
                            draft.optionChoices = [
                                { label: '3: Interrogator', value: '3' },
                                { label: '4: Soft Reset', value: '4' },
                                { label: '5: Rummager', value: '5' },
                                { label: '6: Farmer', value: '6' },
                                { label: '7: Lucky Draw', value: '7' },
                            ];
                            break;
                    }
                }
                if (player.isAI) {
                    draft.phase = GamePhase.AI_THINKING;
                }
                return true; // Don't end turn; waiting for effect's next step.
            }
        }
    
        endTurn();
        return true;
    }

    function requestAction(action: GameAction) {
      updateGameState(draft => {
         if (action.isUncounterable) {
             addLog(`Action to ${action.counterVerb} is uncounterable and resolves immediately.`, 'system', 'info');
             resolveAction(draft, action, true);
             return;
         }
         draft.actionState = ActionState.IDLE;
         draft.selectedCardId = null;
         draft.actionContext = action;
         draft.phase = GamePhase.COUNTER;
         draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
         draft.consecutivePasses = 0;
         const responder = draft.players[draft.currentPlayerIndex];
         addLog(`${responder.name} can respond to the action.`, 'system', 'counter');
         if (responder.isAI) {
            draft.phase = GamePhase.AI_THINKING;
         }
      });
    }

    return { requestAction, resolveAction };
  }, [addLog, updateGameState, endTurn, ensureDeckHasCards]);

  const handleTutorialAction = useCallback((type: TutorialActionType, value?: any) => {
      updateGameState(draft => {
          if (!draft.tutorial) return;
          const { allowedActions } = draft.tutorial.steps[draft.tutorial.step];
          
          const isActionAllowed = allowedActions.some(allowed => 
              (allowed.type === 'any') ||
              (allowed.type === type && (allowed.value === undefined || allowed.value === value)) ||
              (allowed.type === type && Array.isArray(allowed.value) && allowed.value.includes(value))
          );

          if (isActionAllowed) {
              advanceTutorialStep(draft, { type, value });
          }
      });
  }, [updateGameState]);

  const handlePass = useCallback(() => {
    if (gameState?.phase === GamePhase.TUTORIAL) { handleTutorialAction('pass'); return; }
    updateGameState(draft => {
        if (draft.phase !== GamePhase.COUNTER && !(draft.phase === GamePhase.AI_THINKING && draft.actionContext)) return;
        
        const passer = draft.players[draft.currentPlayerIndex];
        addLog(`${passer.name} passed.`, passer.isAI ? 'ai' : 'player', 'info');
        draft.consecutivePasses += 1;

        if (draft.consecutivePasses >= 2) {
            addLog('Both players passed. The action resolves.', 'system', 'info');
            // An even number of counters means the original action succeeds.
            const success = draft.counterStack.length % 2 === 0;
            resolveAction(draft, draft.actionContext!, success);
        } else {
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
            const nextPlayer = draft.players[draft.currentPlayerIndex];
            addLog(`${nextPlayer.name} can respond.`, 'system', 'counter');
            draft.phase = nextPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.COUNTER;
        }
    });
  }, [gameState, handleTutorialAction, updateGameState, addLog, resolveAction]);

  const handlePlayCounter = useCallback((cardId: string) => {
     if (gameState?.phase === GamePhase.TUTORIAL) { handleTutorialAction('playCounter', cardId); return; }
     updateGameState(draft => {
        if (draft.phase !== GamePhase.COUNTER && !(draft.phase === GamePhase.AI_THINKING && draft.actionContext)) return;

        const player = draft.players[draft.currentPlayerIndex];
        const cardResult = findCard(player.hand, cardId);
        if (!cardResult) {
            addLog(`Counter failed: Card not found in hand.`, 'error', 'warning');
            return;
        }
        const { card } = cardResult;

        moveCard(player.hand, draft.counterStack, cardId)!.isFaceUp = true;
        addLog(`${player.name} countered with ${card.rank}${card.suit}.`, player.isAI ? 'ai' : 'player', 'counter');
        
        draft.consecutivePasses = 0;
        draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
        const nextPlayer = draft.players[draft.currentPlayerIndex];
        addLog(`${nextPlayer.name} can respond to the counter.`, 'system', 'counter');
        draft.phase = nextPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.COUNTER;
    });
  }, [gameState, handleTutorialAction, updateGameState, addLog]);
  
  const handleDrawCard = useCallback(() => {
    if (gameState?.phase === GamePhase.TUTORIAL) { 
        handleTutorialAction('draw'); 
        return; 
    }
    if (!gameState || gameState.phase === GamePhase.GAME_OVER || gameState.swapUsedThisTurn) return;
    updateGameState(draft => {
        if(!ensureDeckHasCards(draft)) return;
        const player = draft.players[draft.currentPlayerIndex];
        const card = draft.deck.pop()!;
        card.isFaceUp = true;
        player.hand.push(card);
        addLog(`${player.name} drew a card.`, player.isAI ? 'ai' : 'player', 'draw');
        draft.selectedCardId = null;
        endTurn();
    })
  }, [gameState, handleTutorialAction, addLog, endTurn, updateGameState, ensureDeckHasCards]);
  
  const handlePlayCard = useCallback((row: 'scoreRow' | 'royaltyRow') => {
    if(!gameState || !gameState.selectedCardId) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const cardId = gameState.selectedCardId;

    const cardResult = findCard(player.hand, cardId);
    if (!cardResult) {
        addLog(`Play card failed: The selected card is no longer in your hand.`, 'error', 'warning');
        updateGameState(draft => { draft.selectedCardId = null; draft.actionState = ActionState.IDLE; });
        return;
    }
    const { card } = cardResult;

    addLog(`${player.name} played ${card.rank}${card.suit} to their ${row === 'scoreRow' ? 'Score Row' : 'Royalty Row'}.`, player.isAI ? 'ai' : 'player', 'play');
    
    const actionType = ['J','Q','K'].includes(card.rank) ? 'ROYAL_PLAY' : 'PLAY_CARD';
    const isUncounterable = card.rank === '8';

    requestAction({
        id: uuidv4(),
        type: actionType,
        playerId: player.id,
        payload: { cardId, row },
        initiatorCard: card,
        isUncounterable,
        counterVerb: `play the ${card.rank}${card.suit}`
    })
  }, [gameState, addLog, requestAction, updateGameState]);

  const handleScuttle = useCallback((targetCardId: string) => {
    if(!gameState || !gameState.selectedCardId) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const attackerCardId = gameState.selectedCardId;
    const opponent = gameState.players.find(p => p.id !== player.id)!;

    const attackerCardResult = findCard(player.hand, attackerCardId);
    if (!attackerCardResult) {
        addLog(`Scuttle failed: The attacking card is no longer in your hand.`, 'error', 'warning');
        updateGameState(draft => { draft.selectedCardId = null; draft.actionState = ActionState.IDLE; });
        return;
    }
    const { card: attackerCard } = attackerCardResult;

    const targetCardResult = findCard(opponent.scoreRow, targetCardId);
    if (!targetCardResult) {
        addLog(`Scuttle failed: The target card is no longer on the opponent's board.`, 'error', 'warning');
        updateGameState(draft => { draft.actionState = ActionState.IDLE; }); // Keep card selected for retry
        return;
    }
    const { card: targetCard } = targetCardResult;

    addLog(`${player.name} attempts to scuttle ${targetCard.rank}${targetCard.suit} with ${attackerCard.rank}${attackerCard.suit}.`, player.isAI ? 'ai' : 'player', 'scuttle');
    requestAction({
        id: uuidv4(),
        type: 'SCUTTLE',
        playerId: player.id,
        payload: { attackerCardId, targetCardId },
        initiatorCard: attackerCard,
        counterVerb: `scuttle their ${targetCard.rank}${targetCard.suit}`
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handlePlayForEffect = useCallback(() => {
    if(!gameState || !gameState.selectedCardId) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const cardId = gameState.selectedCardId;

    const cardResult = findCard(player.hand, cardId);
    if (!cardResult) {
        addLog(`Play for effect failed: The selected card is no longer in your hand.`, 'error', 'warning');
        updateGameState(draft => { draft.selectedCardId = null; draft.actionState = ActionState.IDLE; });
        return;
    }
    const { card } = cardResult;
    
    addLog(`${player.name} used the effect of ${card.rank}${card.suit}.`, player.isAI ? 'ai' : 'player', 'effect');
    const isUncounterable = card.rank === '6';

    requestAction({
        id: uuidv4(),
        type: 'BASE_EFFECT',
        playerId: player.id,
        payload: { cardId },
        initiatorCard: card,
        isUncounterable,
        counterVerb: `use the effect of ${card.rank}${card.suit}`
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handleRoyalMarriage = useCallback(() => {
    if (!gameState || !gameState.selectedCardId) return;
    const player = gameState.players[gameState.currentPlayerIndex];
    const cardId = gameState.selectedCardId;

    const cardResult = findCard(player.hand, cardId);
    if (!cardResult) {
      addLog(`Error: Could not perform Royal Marriage. The selected card is missing.`, 'error', 'warning');
      updateGameState(draft => { draft.selectedCardId = null; draft.actionState = ActionState.IDLE; });
      return;
    }
    const { card } = cardResult;
    
    requestAction({
        id: uuidv4(),
        type: 'ROYAL_MARRIAGE',
        playerId: player.id,
        payload: { cardId },
        initiatorCard: card,
        counterVerb: `perform a Royal Marriage with ${card.rank}${card.suit}`
    });
  }, [gameState, addLog, requestAction, updateGameState]);

  const handleEffectPlacement = useCallback((row: 'scoreRow' | 'royaltyRow') => {
    updateGameState(draft => {
        if (draft.effectContext?.type === 'JACK_STEAL') {
            const player = draft.players[draft.currentPlayerIndex];
            const stolenCard = draft.effectContext.stolenCard;
            
            player[row].push(stolenCard);

            addLog(`${player.name} placed the stolen ${stolenCard.rank}${stolenCard.suit} in their ${row === 'scoreRow' ? 'Score Row' : 'Royalty Row'}.`, player.isAI ? 'ai' : 'player', 'play');

            draft.effectContext = null;
            draft.actionState = ActionState.IDLE;

            if (player.isAI) {
                // If AI just placed, we must manually end the turn.
                // The main game loop won't do it because the phase might still be AI_THINKING but the action is over.
                draft.phase = GamePhase.PLAYER_TURN; // Force phase change before calling endTurn
            }
        }
    });
    // Call endTurn *after* the state has been updated.
    endTurn();
  }, [addLog, endTurn, updateGameState]);
  
  const handleCardChoice = useCallback((chosenCardId: string) => {
    if (gameState?.phase === GamePhase.TUTORIAL) {
        handleTutorialAction('cardChoice', chosenCardId);
        return;
    }
    
    updateGameState(draft => {
        if (!draft.cardChoiceContext || draft.cardChoices.length === 0) return;

        const player = draft.players[draft.currentPlayerIndex];
        const chosenCard = draft.cardChoices.find(c => c.id === chosenCardId);
        if (!chosenCard) return;

        const isAI = player.isAI;
        const logType = isAI ? 'ai' : 'player';

        switch(draft.cardChoiceContext.type) {
            case 'FARMER': {
                const cardsToKeep = draft.cardChoices.filter(c => c.id !== chosenCardId);
                cardsToKeep.forEach(c => c.isFaceUp = true);
                player.hand.push(...cardsToKeep);
                draft.deck.push(chosenCard);
                addLog(`${player.name} kept 2 cards and returned 1 to the deck.`, logType, 'effect');
                endTurn();
                break;
            }
            case 'LUCKY_DRAW': {
                const cardToPlay = chosenCard;
                const cardToDiscard = draft.cardChoices.find(c => c.id !== chosenCardId);
                
                cardToPlay.isFaceUp = true;
                player.scoreRow.push(cardToPlay);
                if (cardToDiscard) {
                    draft.discardPile.push(cardToDiscard);
                }
                addLog(`${player.name} played the ${cardToPlay.rank}${cardToPlay.suit} from their Lucky Draw.`, logType, 'play');
                
                if (calculatePlayerScore(player) === WINNING_SCORE) {
                    setWinner(draft, player.id, "Reached 21 Points with a Lucky Draw!");
                } else {
                    endTurn();
                }
                break;
            }
            case 'RUMMAGER': {
                const cardIndexInDiscard = draft.discardPile.findIndex(c => c.id === chosenCardId);
                if (cardIndexInDiscard !== -1) {
                    const [takenCard] = draft.discardPile.splice(cardIndexInDiscard, 1);
                    takenCard.isFaceUp = true;
                    player.hand.push(takenCard);
                    addLog(`${player.name} took the ${takenCard.rank}${takenCard.suit} from the discard pile.`, logType, 'effect');
                }
                endTurn();
                break;
            }
            case 'INTERROGATOR_STEAL': {
                const opponent = draft.players[draft.currentPlayerIndex === 0 ? 1 : 0];
                moveCard(opponent.hand, player.hand, chosenCardId);
                addLog(`${player.name} stole a card from ${opponent.name}'s hand.`, logType, 'effect');
                opponent.handRevealedUntilTurn = 0;
                endTurn();
                break;
            }
        }
        
        // Cleanup state
        draft.actionState = ActionState.IDLE;
        draft.cardChoices = [];
        draft.cardChoiceContext = null;
    });
  }, [gameState, handleTutorialAction, addLog, endTurn, updateGameState, setWinner]);

  const handleOptionChoice = useCallback((choice: string) => {
        if (gameState?.phase === GamePhase.TUTORIAL) {
            handleTutorialAction('optionChoice', choice);
            return;
        }
        updateGameState(draft => {
            const player = draft.players[draft.currentPlayerIndex];
            const opponent = draft.players[draft.currentPlayerIndex === 0 ? 1 : 0];

            const executeEffect = (rank: Rank) => {
                 switch (rank) {
                    case '7': // Lucky Draw
                        if (!ensureDeckHasCards(draft)) { endTurn(); return; }
                        const luckyDrawChoices = [];
                        if(draft.deck.length > 0) luckyDrawChoices.push(draft.deck.pop()!);
                        if(draft.deck.length > 0) luckyDrawChoices.push(draft.deck.pop()!);
                        if (luckyDrawChoices.length > 0) {
                            draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
                            draft.cardChoices = luckyDrawChoices;
                            draft.cardChoiceContext = { type: 'LUCKY_DRAW' };
                        } else {
                            addLog("Not enough cards in deck for Lucky Draw.", 'system', 'warning');
                            endTurn();
                        }
                        break;
                    case '6': // Farmer
                        if (!ensureDeckHasCards(draft)) { endTurn(); return; }
                        const farmerChoices = [];
                        for(let i=0; i<3; i++) {
                            if (draft.deck.length > 0) farmerChoices.push(draft.deck.pop()!);
                        }
                         if (farmerChoices.length > 0) {
                            draft.actionState = ActionState.AWAITING_FARMER_CHOICE;
                            draft.cardChoices = farmerChoices;
                            draft.cardChoiceContext = { type: 'FARMER' };
                        } else {
                            addLog("Not enough cards in deck for Farmer.", 'system', 'warning');
                            endTurn();
                        }
                        break;
                    case '5': // Rummager
                        // Mimicking a 5 doesn't play a card to the score row, it just lets you take one from discard
                        draft.actionState = ActionState.AWAITING_RUMMAGER_CHOICE;
                        draft.cardChoices = [...draft.discardPile];
                        draft.cardChoiceContext = { type: 'RUMMAGER' };
                        break;
                    case '4': // Soft Reset
                        draft.actionState = ActionState.AWAITING_SOFT_RESET_TARGET_ROW;
                        break;
                    case '3': // Interrogator
                        draft.actionState = ActionState.AWAITING_INTERROGATOR_CHOICE;
                        draft.optionChoices = [
                            { label: 'View & Steal a card', value: 'steal' },
                            { label: 'Force discard a random card', value: 'discard' }
                        ];
                        // This re-prompts the modal, so we run the logic again when they choose 'steal' or 'discard'
                        return;
                }
            };
            
            if (draft.actionState === ActionState.AWAITING_MIMIC_CHOICE) {
                addLog(`${player.name} mimics the effect of a ${choice}.`, player.isAI ? 'ai' : 'player', 'effect');
                executeEffect(choice as Rank);
            } else if (draft.actionState === ActionState.AWAITING_INTERROGATOR_CHOICE) {
                addLog(`${player.name} chose to ${choice} the opponent.`, player.isAI ? 'ai' : 'player', 'effect');
                if (choice === 'steal') {
                    if (opponent.hand.length === 0) {
                        addLog(`${opponent.name}'s hand is empty. The effect fizzles.`, 'system', 'warning');
                        endTurn();
                        return;
                    }
                    draft.actionState = ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE;
                    draft.cardChoices = opponent.hand.map(c => ({...c, isFaceUp: true}));
                    draft.cardChoiceContext = { type: 'INTERROGATOR_STEAL', payload: { revealedFrom: opponent.id } };
                    opponent.handRevealedUntilTurn = draft.turn + 1;
                } else if (choice === 'discard') {
                     if (opponent.hand.length > 0) {
                        const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                        const cardToDiscard = opponent.hand[randomIndex];
                        moveCard(opponent.hand, draft.discardPile, cardToDiscard.id);
                        addLog(`${player.name} forced ${opponent.name} to discard a random card.`, 'system', 'effect');
                        endTurn();
                    } else {
                        addLog(`${opponent.name}'s hand is empty. The effect fizzles.`, 'system', 'warning');
                        endTurn();
                    }
                }
            }

            draft.optionChoices = []; // Clear options after one is chosen
            if (player.isAI && draft.actionState !== ActionState.IDLE) {
                draft.phase = GamePhase.AI_THINKING;
            }
    });
}, [gameState, handleTutorialAction, endTurn, updateGameState, addLog, ensureDeckHasCards]);

  const handleTakeSwapFaceUp = useCallback((cardId: string) => {
    updateGameState(draft => {
        if (draft.swapUsedThisTurn) return;
        const player = draft.players[draft.currentPlayerIndex];
        const cardResult = findCard(draft.swapBar, cardId);

        if (cardResult) {
            const takenCard = cardResult.card;
            
            draft.swapBar[cardResult.cardIndex] = null;
            
            takenCard.isFaceUp = true;
            player.hand.push(takenCard);
            
            addLog(`${player.name} took the ${takenCard.rank}${takenCard.suit} from the Swap Bar.`, player.isAI ? 'ai' : 'player', 'swap');
            draft.swapUsedThisTurn = true;
            
            endTurn();
        }
    });
  }, [addLog, endTurn, updateGameState]);

  const handleSurpriseSwap = useCallback((handCardId: string, swapCardId: string) => {
    updateGameState(draft => {
        if (draft.swapUsedThisTurn) return;
        const player = draft.players[draft.currentPlayerIndex];
        const handCardResult = findCard(player.hand, handCardId);
        const swapCardResult = findCard(draft.swapBar, swapCardId);

        if (handCardResult && swapCardResult) {
            handCardResult.card.isFaceUp = true;
            swapCardResult.card.isFaceUp = true;
            
            const swappedInCardRank = swapCardResult.card.rank;

            draft.swapBar[swapCardResult.cardIndex] = handCardResult.card;
            player.hand[handCardResult.cardIndex] = swapCardResult.card;
            
            addLog(`${player.name} swapped a card for a surprise from the Swap Bar, receiving a ${swappedInCardRank}.`, player.isAI ? 'ai' : 'player', 'swap');
            draft.actionState = ActionState.IDLE;
            draft.selectedCardId = null;
            draft.swapUsedThisTurn = true;
            endTurn();
        }
    });
  }, [addLog, endTurn, updateGameState]);

  const handleCardClick = useCallback((card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => {
    if (gameState?.phase === GamePhase.TUTORIAL) { 
        handleTutorialAction('cardClick', card.id); 
        return; 
    }
    if (!gameState || gameState.phase === GamePhase.GAME_OVER) return;

    const { actionState, players, currentPlayerIndex, selectedCardId, swapUsedThisTurn } = gameState;
    const currentPlayer = players[currentPlayerIndex];
    const isMyTurn = currentPlayer.id === owner.id;

    // --- Surprise Swap Logic ---
    if (actionState === ActionState.AWAITING_SURPRISE_SWAP_TARGET && location === 'swapBar' && !card.isFaceUp && !swapUsedThisTurn) {
        handleSurpriseSwap(selectedCardId!, card.id);
        return;
    }

    // --- Logic for targeting an opponent's card ---
    if (currentPlayer.id !== owner.id) {
        if (actionState === ActionState.AWAITING_SCUTTLE_TARGET && selectedCardId) {
            handleScuttle(card.id);
            return;
        }
        if (actionState === ActionState.AWAITING_JACK_TARGET && location === 'scoreRow') {
            updateGameState(draft => {
                const opponent = draft.players.find(p => p.id === owner.id)!;
                const cardToStealResult = findCard(opponent.scoreRow, card.id);
                if (cardToStealResult) {
                    draft.effectContext = { type: 'JACK_STEAL', stolenCard: { ...cardToStealResult.card } };
                    moveCard(opponent.scoreRow, [], card.id);
                    draft.actionState = ActionState.AWAITING_JACK_PLACEMENT;
                    addLog(`${currentPlayer.name} stole the ${card.rank}${card.suit}.`, currentPlayer.isAI ? 'ai' : 'player', 'effect');
                    if (currentPlayer.isAI) draft.phase = GamePhase.AI_THINKING;
                }
            });
            return;
        }
        if (actionState === ActionState.AWAITING_SOFT_RESET_TARGET_ROW && ['scoreRow', 'royaltyRow'].includes(location)) {
            updateGameState(draft => {
                draft.actionState = ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE;
                draft.effectContext = { type: 'SOFT_RESET', targetPlayerId: owner.id, targetRow: location as 'scoreRow' | 'royaltyRow', discardedCards: [] };
                addLog(`${currentPlayer.name} targeted ${owner.name}'s ${location === 'scoreRow' ? 'Score Row' : 'Royalty Row'}.`, currentPlayer.isAI ? 'ai' : 'player', 'effect');
                if (currentPlayer.isAI) draft.phase = GamePhase.AI_THINKING;
            });
            return;
        }
    }
    
    // --- Take face-up card from Swap Bar ---
    if (location === 'swapBar' && isMyTurn && !swapUsedThisTurn && card.isFaceUp) {
        handleTakeSwapFaceUp(card.id);
        return;
    }
    
    // --- Player Hand card selection ---
    if (location === 'hand' && isMyTurn) {
        updateGameState(draft => {
            if (draft.selectedCardId === card.id) {
                draft.selectedCardId = null; // Toggle off
                draft.actionState = ActionState.IDLE; // Reset any targeting state
            } else {
                draft.selectedCardId = card.id; // Select new card
                draft.actionState = ActionState.CARD_SELECTED;
            }
        });
    }
}, [gameState, handleTutorialAction, handleTakeSwapFaceUp, handleSurpriseSwap, updateGameState, handleScuttle, addLog]);

  const handleAction = useCallback((action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'royalMarriage' | 'surpriseSwap' | 'placeEffectScore' | 'placeEffectRoyalty') => {
    if (gameState?.phase === GamePhase.TUTORIAL) { 
        handleTutorialAction('actionButton', action);
        return;
    }
    if (!gameState || (!gameState.selectedCardId && !['placeEffectScore', 'placeEffectRoyalty'].includes(action))) return;
    
    if (action === 'placeEffectScore') {
        handleEffectPlacement('scoreRow');
        return;
    }
    if (action === 'placeEffectRoyalty') {
        handleEffectPlacement('royaltyRow');
        return;
    }

    if (action === 'scuttle') {
        updateGameState(draft => {
            draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
            addLog('Select an opponent\'s Score Row card to scuttle.', 'system', 'info');
        });
        return;
    }
    if (action === 'surpriseSwap') {
        if(gameState.swapUsedThisTurn) return;
        updateGameState(draft => {
            draft.actionState = ActionState.AWAITING_SURPRISE_SWAP_TARGET;
            addLog('Select a face-down card from the Swap Bar.', 'system', 'info');
        });
        return;
    }

    if (action === 'playScore') handlePlayCard('scoreRow');
    if (action === 'playRoyalty') handlePlayCard('royaltyRow');
    if (action === 'playForEffect') handlePlayForEffect();
    if (action === 'royalMarriage') handleRoyalMarriage();
  }, [gameState, handleTutorialAction, updateGameState, addLog, handlePlayCard, handlePlayForEffect, handleRoyalMarriage, handleEffectPlacement]);

  const handleAiAction = useCallback((aiChoice: AIAction) => {
    if (!gameState || !gameState.players[gameState.currentPlayerIndex].isAI) return;
    
    if (gameState.activeMissionId) {
        const character = CHARACTERS[gameState.activeMissionId];
        if (character?.dialogue?.onPlay) {
            const lines = character.dialogue.onPlay;
            const newLine = lines[Math.floor(Math.random() * lines.length)];
            showDialogue(newLine);
        }
    }

    // AI needs to "select" a card before performing an action with it
    updateGameState(draft => {
        if ('cardId' in aiChoice && aiChoice.cardId) {
            draft.selectedCardId = aiChoice.cardId;
        } else if ('attackerCardId' in aiChoice && aiChoice.attackerCardId) {
            draft.selectedCardId = aiChoice.attackerCardId;
        }
    });

    // Use a timeout to make it seem like the AI is performing a subsequent action
    setTimeout(() => {
        switch (aiChoice.type) {
            case 'PLAY_CARD':
                handlePlayCard(aiChoice.row);
                break;
            case 'SCUTTLE':
                // The handleScuttle function is now designed to be called with the target card ID
                // after the attacker has been selected and the action state is AWAITING_SCUTTLE_TARGET.
                // We'll simulate this flow for the AI.
                updateGameState(draft => { draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET; });
                handleScuttle(aiChoice.targetCardId);
                break;
            case 'PLAY_FOR_EFFECT':
                handlePlayForEffect();
                break;
            case 'ROYAL_MARRIAGE':
                handleRoyalMarriage();
                break;
            case 'DRAW':
                handleDrawCard();
                break;
        }
    }, 100);
  }, [gameState, handlePlayCard, handleScuttle, handlePlayForEffect, handleRoyalMarriage, handleDrawCard, showDialogue, updateGameState]);

  const handleAiMidTurnChoice = useCallback((gameStateForChoice: GameState) => {
    const choice = makeAiChoice(gameStateForChoice);
    if (!choice) {
        addLog("AI had no mid-turn choice to make.", 'ai-reasoning', 'info');
        // If AI can't make a choice, it might be stuck. End turn as a safety measure.
        if (gameStateForChoice.players[gameStateForChoice.currentPlayerIndex].isAI) {
            if(gameStateForChoice.actionState === ActionState.AWAITING_JACK_PLACEMENT) {
                 // AI must choose a row
                handleEffectPlacement('scoreRow'); // Default to score row
            } else {
                endTurn();
            }
        }
        return;
    }

    if ('optionValue' in choice) {
        addLog(`AI chose an option.`, 'ai-reasoning', 'system');
        handleOptionChoice(choice.optionValue);
    } else if ('cardId' in choice && !('targetRow' in choice)) {
        addLog(`AI chose a card.`, 'ai-reasoning', 'system');
        handleCardChoice(choice.cardId);
    } else if ('cardIds' in choice) {
        // This handles multi-card choices like Soft Reset.
        // The logic for player multi-select is also complex, so this might need more work.
        addLog(`AI chose multiple cards.`, 'ai-reasoning', 'system');
        updateGameState(draft => {
            draft.selectedCardIds = choice.cardIds!;
        });
        // We'd need a handler for the 'confirm' action here, which seems to be missing.
        // For now, this is a placeholder for that logic.
    } else if ('targetPlayerId' in choice) {
        // This handles targeting actions like Jack's steal.
        addLog(`AI is targeting a card.`, 'ai-reasoning', 'system');
        const opponent = gameStateForChoice.players.find(p => p.id === choice.targetPlayerId)!;
        const targetCardResult = findCard(opponent[choice.targetRow], choice.cardId);
        if (targetCardResult) {
            handleCardClick(targetCardResult.card, opponent, choice.targetRow);
        }
    } else if('placementRow' in choice) {
        addLog(`AI chose to place a card.`, 'ai-reasoning', 'system');
        handleEffectPlacement(choice.placementRow as 'scoreRow' | 'royaltyRow');
    }
  }, [addLog, handleOptionChoice, handleCardChoice, updateGameState, handleCardClick, endTurn, handleEffectPlacement]);

  const handleCardHover = useCallback((card: Card | null) => {
    if (card) {
      const rule = ADVANCED_CARD_RULES[card.rank];
      if (rule) {
        setActiveRule({ rank: card.rank, rule });
      }
    } else {
      setActiveRule(null);
    }
  }, []);


  useEffect(() => {
    if (!gameState || gameState.winner || gameState.phase === GamePhase.TUTORIAL) return;
    
    if (gameState.phase === GamePhase.AI_THINKING) {
        // AI Turn Decision
        if (gameState.actionContext === null && gameState.actionState === ActionState.IDLE) {
            setTimeout(async () => {
                const choice = await getAiTurn(gameState);
                if (choice) {
                    addLog(choice.reasoning, 'ai-reasoning', 'system');
                    handleAiAction(choice.action);
                }
            }, 1500);
        }
        // AI Counter Decision
        else if (gameState.actionContext) {
             setTimeout(async () => {
                const validCounters = getValidCounterCards(gameState);
                
                const decision = await getAiCounterDecision(gameState, validCounters);
                addLog(decision.reasoning, 'ai-reasoning', 'system');
                if (decision.decision === 'counter' && decision.cardId) {
                    handlePlayCounter(decision.cardId);
                } else {
                    handlePass();
                }
            }, 1500);
        }
        // AI mid-turn choice (e.g., from an effect)
        else {
            setTimeout(() => {
                handleAiMidTurnChoice(gameState);
            }, 1500);
        }
    }
  }, [gameState, addLog, handlePass, handlePlayCounter, handleAiAction, handleAiMidTurnChoice]);


  const handleStartNewGame = () => {
    updateGameState(draft => {
      dealInitialCards(draft);
    });
  };

  const handleStartCampaign = () => {
    updateGameState(draft => {
        draft.phase = GamePhase.CAMPAIGN_SELECTION;
    });
  };

  const handleStartMission = (missionId: string) => {
    updateGameState(draft => {
        const character = CHARACTERS[missionId];
        if (character) {
            draft.activeMissionId = missionId;
            draft.players[1].name = character.name;
            dealInitialCards(draft);
        }
    });
  };

  const handleStartTutorial = (chapterIndex: number) => {
      setGameState(createTutorialGameState(chapterIndex));
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
  const activeCharacter = gameState?.activeMissionId ? CHARACTERS[gameState.activeMissionId] : null;


  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  if (gameState.phase === GamePhase.CAMPAIGN_SELECTION) {
      return <CampaignScreen onStartMission={handleStartMission} onBack={() => initializeGame()} campaignProgress={gameState.campaignProgress} />;
  }

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
        onStartNewGame={handleStartNewGame}
        onStartTutorial={handleStartTutorial}
        onStartCampaign={handleStartCampaign}
        onToggleLogVisibility={handleToggleLogVisibility}
        onResetGame={handleResetGame}
        onMainMenu={handleMainMenu}
        onTutorialNext={() => handleTutorialAction('next')}
        onCardHover={handleCardHover}
        activeRule={activeRule}
        activeCharacter={activeCharacter}
        activeDialogue={activeDialogue}
      />
      {gameState.winner && (
        <WinnerModal 
            winner={gameState.winner}
            winReason={gameState.winReason || ''}
            onResetGame={handleResetGame}
        />
      )}
    </>
  );
};

export default App;
