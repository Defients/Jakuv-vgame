


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GameState, Player, Card, GamePhase, ActionState, AceValue, Rank, Suit, CardColor, GameAction, AIAction, LogEntry, TutorialAction, TutorialActionType, CardChoiceType, GameSettings, PlayerStats, GameTheme, Achievement, GameAnalysis, EffectType } from './types';
import { PLAYER1_ID, AI_ID, WINNING_SCORE, HAND_LIMIT, SWAP_BAR_SIZE } from './constants';
import { createInitialGameState, getCardValue, calculatePlayerScore, findCard, moveCard, shuffleDeck, dealInitialCards, getValidCounterCards } from './services/gameLogic';
import { makeAiChoice, getBasicAiTurn, getBasicCounterDecision } from './services/aiService';
import { getAiTurn, getAiCounterDecision, getAiDialogue, getGameAnalysis } from './services/geminiAiService';
import { createTutorialGameState, advanceTutorialStep } from './services/tutorialService';
import GameBoard from './components/GameBoard';
import WinnerModal from './components/WinnerModal';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { ADVANCED_CARD_RULES } from './components/Card';
import CampaignScreen from './components/CampaignScreen';
import { CHARACTERS } from './data/characters';
import SettingsModal from './components/SettingsModal';
import ProfileModal from './components/ProfileModal';
import AchievementToast from './components/AchievementToast';
import { ALL_ACHIEVEMENTS } from './data/achievements';
import AchievementsModal from './components/AchievementsModal';
import AnalysisModal from './components/AnalysisModal';
import StartScreen from './components/StartScreen';
import ActionResolutionToast from './components/ActionResolutionToast';


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeRule, setActiveRule] = useState<{ rank: Rank; rule: React.ReactNode } | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);
  const dialogueTimerRef = useRef<number | null>(null);

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isAchievementsModalOpen, setAchievementsModalOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState<Achievement[]>([]);
  const [activeToast, setActiveToast] = useState<Achievement | null>(null);
  const [actionResolution, setActionResolution] = useState<{ text: string, success: boolean } | null>(null);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [gameAnalysis, setGameAnalysis] = useState<{ analysis: GameAnalysis | null; isLoading: boolean; error: string | null }>({
      analysis: null,
      isLoading: false,
      error: null,
  });

  const [settings, setSettings] = useState<GameSettings>({
      animationSpeed: 'normal',
      alwaysShowAIReasoning: false,
      theme: 'cosmotech',
      aiProvider: 'gemini',
      autoPassDelay: '3',
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      unlockedAchievements: [],
  });

  // Load settings and stats from localStorage on initial render
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('jakuv-settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      const savedStats = localStorage.getItem('jakuv-stats');
      if (savedStats) {
        setPlayerStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  // Apply visual settings to the root element
  useEffect(() => {
    document.documentElement.setAttribute('data-animation-speed', settings.animationSpeed);
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  const unlockAchievement = useCallback((achievementId: string) => {
    if (playerStats.unlockedAchievements.includes(achievementId)) {
        return; // Already unlocked
    }

    const achievement = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (achievement) {
        console.log(`Unlocked achievement: ${achievement.name}`);
        setPlayerStats(prevStats => {
            const newStats = {
                ...prevStats,
                unlockedAchievements: [...prevStats.unlockedAchievements, achievementId]
            };
            localStorage.setItem('jakuv-stats', JSON.stringify(newStats));
            return newStats;
        });
        setToastQueue(prevQueue => [...prevQueue, achievement]);
    }
  }, [playerStats.unlockedAchievements]);

  // Effect to process the achievement toast queue
  useEffect(() => {
    if (toastQueue.length > 0 && !activeToast) {
      const [nextToast, ...remainingQueue] = toastQueue;
      setActiveToast(nextToast);
      setToastQueue(remainingQueue);
    }
  }, [toastQueue, activeToast]);

  const handleSettingsChange = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem('jakuv-settings', JSON.stringify(newSettings));
  };
  
  const handleResetStats = () => {
      const newStats = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, unlockedAchievements: [] };
      setPlayerStats(newStats);
      localStorage.setItem('jakuv-stats', JSON.stringify(newStats));
  };

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
          newEntry.isRevealed = settings.alwaysShowAIReasoning;
      }
      draft.log.unshift(newEntry);
    });
  }, [updateGameState, settings.alwaysShowAIReasoning]);

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
            
            // Update stats & achievements if it wasn't a tutorial game
            if (!draft.tutorial) {
              const opponent = draft.players.find(p => p.id !== winnerId)!;

              setPlayerStats(prevStats => {
                  const gamesWon = winnerId === PLAYER1_ID ? prevStats.gamesWon + 1 : prevStats.gamesWon;
                  const newStats = {
                      ...prevStats,
                      gamesPlayed: prevStats.gamesPlayed + 1,
                      gamesWon: gamesWon,
                      gamesLost: winnerId === AI_ID ? prevStats.gamesLost + 1 : prevStats.gamesLost,
                  };
                  localStorage.setItem('jakuv-stats', JSON.stringify(newStats));
                  return newStats;
              });

              if (winnerId === PLAYER1_ID) {
                  unlockAchievement('first_win');
                  if (calculatePlayerScore(winner) === WINNING_SCORE) unlockAchievement('hit_21');
                  if (reason.includes("Overcharged")) unlockAchievement('overcharge_win');
                  if(draft.deckReshuffled) unlockAchievement('deck_out_win');
                  if (calculatePlayerScore(opponent) <= 10) unlockAchievement('flawless_victory');
                  if (draft.maxScoreDeficit >= 10) unlockAchievement('comeback_king');
              }
            }
        }
    }, [addLog, unlockAchievement]);
    
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
            
            draft.deckReshuffled = true;
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
            
            // Check score deficit for achievement tracking before ending the turn
            if (!currentPlayer.isAI) {
                const p1 = draft.players.find(p => !p.isAI)!;
                const p2 = draft.players.find(p => p.isAI)!;
                const p1Score = calculatePlayerScore(p1);
                const p2Score = calculatePlayerScore(p2);
                const currentDeficit = p2Score - p1Score;
                if (currentDeficit > draft.maxScoreDeficit) {
                    draft.maxScoreDeficit = currentDeficit;
                }
            }
    
            if (calculatePlayerScore(currentPlayer) === WINNING_SCORE) {
                setWinner(draft, currentPlayer.id, "Reached 21 Points!");
                return;
            }
    
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
            draft.turn += 1;
            const nextPlayer = draft.players[draft.currentPlayerIndex];
    
            if (calculatePlayerScore(nextPlayer) > WINNING_SCORE) {
                setWinner(draft, currentPlayer.id, "Opponent was Overcharged!");
                return;
            }
    
            startTurn(draft);
        });
    }, [updateGameState, setWinner, startTurn, addLog]);
  
  const { requestAction, resolveAction } = useMemo(() => {
    function resolveAction(draft: GameState, action: GameAction, success: boolean): boolean {
        const player = draft.players.find(p => p.id === action.playerId)!;
    
        // Discard all cards used in the counter phase and reset state
        const isDenialOfDenial = draft.counterStack.length > 0 && draft.counterStack.some(c => c.rank === 'A');
        
        draft.counterStack.forEach(card => {
            card.isFaceUp = true;
            draft.discardPile.push(card);
        });

        if (!player.isAI && isDenialOfDenial) {
            unlockAchievement('denial_of_denial');
        }

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
                if (!player.isAI && ['J', 'Q', 'K'].includes(card!.rank)) unlockAchievement('royal_play');
                break;
            }
            case 'SCUTTLE': {
                const { attackerCardId, targetCardId } = action.payload;
                const opponent = draft.players.find(p => p.id !== player.id)!;
                const attackerCard = findCard(player.hand, attackerCardId)!.card;
                moveCard(player.hand, draft.discardPile, attackerCardId);
                moveCard(opponent.scoreRow, draft.discardPile, targetCardId);
                if (!player.isAI) {
                    unlockAchievement('scuttler');
                    if (attackerCard.rank === '10') unlockAchievement('demolition_expert');
                }
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
                    moveCard(player.hand, draft.discardPile, card1.id);
                    endTurn();
                    return false;
                }
                const { card: card2 } = card2Result;

                moveCard(player.hand, player.royaltyRow, card1.id)!.isFaceUp = true;
                moveCard(player.hand, player.royaltyRow, card2.id)!.isFaceUp = true;
                if (!player.isAI) unlockAchievement('royal_marriage');
                break;
            }
            case 'BASE_EFFECT': {
                const { cardId } = action.payload;
                const cardResult = findCard(player.hand, cardId);
                if (!cardResult) return false;
                const { card } = cardResult;
                if (!player.isAI) unlockAchievement('effect_player');

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
  }, [addLog, updateGameState, endTurn, ensureDeckHasCards, unlockAchievement]);

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

    let shouldResolve = false;
    let resolutionSuccess = false;
    let isUncounterable = false;

    updateGameState(draft => {
        if (draft.phase !== GamePhase.COUNTER && !(draft.phase === GamePhase.AI_THINKING && draft.actionContext)) return;
        
        const passer = draft.players[draft.currentPlayerIndex];
        addLog(`${passer.name} passed.`, passer.isAI ? 'ai' : 'player', 'info');
        draft.consecutivePasses += 1;

        if (draft.consecutivePasses >= 2) {
            addLog('Both players passed. The action resolves.', 'system', 'info');
            shouldResolve = true;
            resolutionSuccess = draft.counterStack.length % 2 === 0;
            isUncounterable = draft.actionContext!.isUncounterable;
            resolveAction(draft, draft.actionContext!, resolutionSuccess);
        } else {
            draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
            const nextPlayer = draft.players[draft.currentPlayerIndex];
            addLog(`${nextPlayer.name} can respond.`, 'system', 'counter');
            draft.phase = nextPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.COUNTER;
        }
    });

    if (shouldResolve && !isUncounterable) {
        setActionResolution({ text: resolutionSuccess ? 'Success!' : 'Countered!', success: resolutionSuccess });
        setTimeout(() => setActionResolution(null), 1500);
    }
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
        
        if (!player.isAI) unlockAchievement('counter_play');

        draft.consecutivePasses = 0;
        draft.currentPlayerIndex = draft.currentPlayerIndex === 0 ? 1 : 0;
        const nextPlayer = draft.players[draft.currentPlayerIndex];
        addLog(`${nextPlayer.name} can respond to the counter.`, 'system', 'counter');
        draft.phase = nextPlayer.isAI ? GamePhase.AI_THINKING : GamePhase.COUNTER;
    });
  }, [gameState, handleTutorialAction, updateGameState, addLog, unlockAchievement]);
  
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
            if (!player.isAI) unlockAchievement('jack_of_all_trades');

            addLog(`${player.name} placed the stolen ${stolenCard.rank}${stolenCard.suit} in their ${row === 'scoreRow' ? 'Score Row' : 'Royalty Row'}.`, player.isAI ? 'ai' : 'player', 'play');

            draft.effectContext = null;
            draft.actionState = ActionState.IDLE;
        }
    });
    // Call endTurn *after* the state has been updated.
    endTurn();
  }, [addLog, endTurn, updateGameState, unlockAchievement]);
  
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
            if (!player.isAI) unlockAchievement('swap_master');
            
            addLog(`${player.name} took the ${takenCard.rank}${takenCard.suit} from the Swap Bar.`, player.isAI ? 'ai' : 'player', 'swap');
            draft.swapUsedThisTurn = true;
            
            endTurn();
        }
    });
  }, [addLog, endTurn, updateGameState, unlockAchievement]);

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
            if (!player.isAI) unlockAchievement('swap_master');

            draft.swapBar[swapCardResult.cardIndex] = handCardResult.card;
            player.hand[handCardResult.cardIndex] = swapCardResult.card;
            
            addLog(`${player.name} swapped a card for a surprise from the Swap Bar, receiving a ${swappedInCardRank}.`, player.isAI ? 'ai' : 'player', 'swap');
            draft.actionState = ActionState.IDLE;
            draft.selectedCardId = null;
            draft.swapUsedThisTurn = true;
            endTurn();
        }
    });
  }, [addLog, endTurn, updateGameState, unlockAchievement]);

  const handleDiscardSelection = useCallback((cardId: string) => {
      updateGameState(draft => {
          const index = draft.selectedCardIds.indexOf(cardId);
          if (index > -1) {
              draft.selectedCardIds.splice(index, 1);
          } else {
              draft.selectedCardIds.push(cardId);
          }
      });
  }, [updateGameState]);

  const handleConfirmDiscard = useCallback(() => {
      updateGameState(draft => {
          if (draft.actionState !== ActionState.AWAITING_OVERCHARGE_DISCARD && draft.actionState !== ActionState.AWAITING_END_TURN_DISCARD) return;

          const player = draft.players[draft.currentPlayerIndex];
          
          if (draft.actionState === ActionState.AWAITING_OVERCHARGE_DISCARD) {
              addLog(`${player.name} discarded ${draft.selectedCardIds.length} card(s) due to being Overcharged.`, 'system', 'warning');
              draft.selectedCardIds.forEach(id => {
                  if (!moveCard(player.scoreRow, draft.discardPile, id)) {
                      moveCard(player.royaltyRow, draft.discardPile, id);
                  }
              });
              draft.selectedCardIds = [];
              draft.actionState = ActionState.IDLE;
              // Player has resolved overcharge, now they can start their turn
              startTurn(draft);
          } else if (draft.actionState === ActionState.AWAITING_END_TURN_DISCARD) {
              addLog(`${player.name} discarded ${draft.selectedCardIds.length} card(s) to meet the hand limit.`, 'system', 'warning');
              draft.selectedCardIds.forEach(id => {
                  moveCard(player.hand, draft.discardPile, id);
              });
              draft.selectedCardIds = [];
              draft.actionState = ActionState.IDLE;
              // This was the last part of the turn, so proceed to the next player
              endTurn();
          }
      });
  }, [updateGameState, addLog, endTurn, startTurn]);
  
  const handleConfirmSoftResetDiscard = useCallback((cardIdsToDiscard: string[]) => {
      updateGameState(draft => {
          if (draft.actionState !== ActionState.AWAITING_SOFT_RESET_CHOICE || !draft.effectContext || draft.effectContext.type !== 'SOFT_RESET') return;
          
          const player = draft.players[draft.currentPlayerIndex];
          const { initiatorId, targetRow } = draft.effectContext;

          addLog(`${player.name} discarded ${cardIdsToDiscard.length} card(s) due to Soft Reset.`, player.isAI ? 'ai' : 'player', 'effect');

          cardIdsToDiscard.forEach(id => {
              moveCard(player[targetRow], draft.discardPile, id);
          });
          
          // Cleanup
          draft.effectContext = null;
          draft.actionState = ActionState.IDLE;
          draft.selectedCardIds = [];

          // The turn of the person who played the '4' now ends.
          draft.currentPlayerIndex = draft.players.findIndex(p => p.id === initiatorId)! as (0 | 1);
          endTurn();
      });
  }, [updateGameState, addLog, endTurn]);

  const handleCardClick = useCallback((card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => {
    if (gameState?.phase === GamePhase.TUTORIAL) { 
        handleTutorialAction('cardClick', card.id); 
        return; 
    }
    if (!gameState || gameState.phase === GamePhase.GAME_OVER) return;

    const { actionState, players, currentPlayerIndex, selectedCardId, swapUsedThisTurn } = gameState;
    const currentPlayer = players[currentPlayerIndex];
    const isMyTurn = currentPlayer.id === owner.id;

    // --- Discard Selection Logic ---
    if (isMyTurn) {
        if (
            (actionState === ActionState.AWAITING_END_TURN_DISCARD && location === 'hand') ||
            (actionState === ActionState.AWAITING_OVERCHARGE_DISCARD && ['scoreRow', 'royaltyRow'].includes(location)) ||
            (actionState === ActionState.AWAITING_SOFT_RESET_CHOICE && ['scoreRow', 'royaltyRow'].includes(location))
        ) {
            handleDiscardSelection(card.id);
            return;
        }
    }

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
                    draft.effectContext = { type: 'JACK_STEAL', stolenCard: { ...cardToStealResult.card }, initiatorId: currentPlayer.id };
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
                const targetedPlayer = draft.players.find(p => p.id === owner.id)!;
                draft.effectContext = { type: 'SOFT_RESET', targetPlayerId: owner.id, targetRow: location as 'scoreRow' | 'royaltyRow', discardedCards: [], initiatorId: currentPlayer.id };
                addLog(`${currentPlayer.name} targeted ${owner.name}'s ${location === 'scoreRow' ? 'Score Row' : 'Royalty Row'}.`, currentPlayer.isAI ? 'ai' : 'player', 'effect');
                
                // Switch control to the targeted player to make their choice
                draft.currentPlayerIndex = draft.players.findIndex(p => p.id === owner.id)! as (0 | 1);
                draft.actionState = ActionState.AWAITING_SOFT_RESET_CHOICE;
                draft.selectedCardIds = [];

                if (targetedPlayer.isAI) {
                    draft.phase = GamePhase.AI_THINKING;
                } else {
                    draft.phase = GamePhase.PLAYER_TURN;
                }
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
}, [gameState, handleTutorialAction, handleTakeSwapFaceUp, handleSurpriseSwap, updateGameState, handleScuttle, addLog, handleDiscardSelection]);

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
  }, [gameState, handlePlayCard, handleScuttle, handlePlayForEffect, handleRoyalMarriage, handleDrawCard, updateGameState]);

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
        addLog(`AI chose multiple cards for Soft Reset.`, 'ai-reasoning', 'system');
        handleConfirmSoftResetDiscard(choice.cardIds!);
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
  }, [addLog, handleOptionChoice, handleCardChoice, updateGameState, handleCardClick, endTurn, handleEffectPlacement, handleConfirmSoftResetDiscard]);

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

  const activeCharacter = useMemo(() => gameState?.activeMissionId ? CHARACTERS[gameState.activeMissionId] : null, [gameState?.activeMissionId]);
  const humanPlayer = useMemo(() => gameState?.players.find(p => !p.isAI), [gameState]);
  const aiPlayer = useMemo(() => gameState?.players.find(p => p.isAI), [gameState]);

  const handleRequestAnalysis = useCallback(async () => {
    if (!gameState || !humanPlayer || !aiPlayer) return;
    
    setGameAnalysis({ analysis: null, isLoading: true, error: null });
    setAnalysisModalOpen(true);
    
    try {
        const analysisResult = await getGameAnalysis(gameState.log, humanPlayer, aiPlayer);
        if (analysisResult) {
            setGameAnalysis({ analysis: analysisResult, isLoading: false, error: null });
        } else {
            throw new Error("Received no analysis from the service.");
        }
    } catch (e: any) {
        console.error("Analysis failed:", e);
        setGameAnalysis({ analysis: null, isLoading: false, error: e.message || 'An unknown error occurred.' });
    }
  }, [gameState, humanPlayer, aiPlayer]);

  useEffect(() => {
    if (!gameState || gameState.winner || gameState.phase === GamePhase.TUTORIAL) return;
    
    if (gameState.phase === GamePhase.AI_THINKING) {
        const aiPlayer = gameState.players[gameState.currentPlayerIndex];
        
        // AI Discard Logic (Overcharge or Hand Limit)
        if (gameState.actionState === ActionState.AWAITING_OVERCHARGE_DISCARD || gameState.actionState === ActionState.AWAITING_END_TURN_DISCARD) {
            setTimeout(() => {
                const choice = makeAiChoice(gameState);
                if (choice && 'cardId' in choice) {
                    const cardToDiscardResult = findCard([...aiPlayer.hand, ...aiPlayer.scoreRow, ...aiPlayer.royaltyRow], choice.cardId);
                    if(cardToDiscardResult) {
                       addLog(`AI is discarding ${cardToDiscardResult.card.rank}${cardToDiscardResult.card.suit}.`, 'ai-reasoning', 'system');
                       updateGameState(draft => {
                            const player = draft.players[draft.currentPlayerIndex];
                            if (draft.actionState === ActionState.AWAITING_OVERCHARGE_DISCARD) {
                                if (!moveCard(player.scoreRow, draft.discardPile, choice.cardId)) {
                                    moveCard(player.royaltyRow, draft.discardPile, choice.cardId);
                                }
                            } else {
                                moveCard(player.hand, draft.discardPile, choice.cardId);
                            }
                       });
                    }
                } else {
                    // AI believes it's done discarding.
                    updateGameState(draft => {
                      if (draft.actionState === ActionState.AWAITING_OVERCHARGE_DISCARD) {
                         startTurn(draft);
                      } else {
                         endTurn();
                      }
                    });
                }
            }, 1000);
        }
        // AI Counter Decision
        else if (gameState.actionContext) {
             setTimeout(async () => {
                const validCounters = getValidCounterCards(gameState);
                
                let decision;
                if (settings.aiProvider === 'local') {
                    decision = getBasicCounterDecision(gameState, validCounters);
                } else {
                    decision = await getAiCounterDecision(gameState, validCounters);
                }
                
                addLog(decision.reasoning, 'ai-reasoning', 'system');
                if (decision.decision === 'counter' && decision.cardId) {
                    handlePlayCounter(decision.cardId);
                } else {
                    handlePass();
                }
            }, 1500);
        }
        // AI Turn Decision (No action context)
        else if (gameState.actionState === ActionState.IDLE) {
            setTimeout(async () => {
                let choice;
                if (settings.aiProvider === 'local') {
                    choice = getBasicAiTurn(gameState);
                } else {
                    choice = await getAiTurn(gameState);
                }

                if (choice) {
                    addLog(choice.reasoning, 'ai-reasoning', 'system');

                    if (settings.aiProvider === 'gemini' && activeCharacter) {
                        try {
                            const dialogueResponse = await getAiDialogue(gameState, activeCharacter, choice);
                            if (dialogueResponse?.dialogue) {
                                showDialogue(dialogueResponse.dialogue);
                            } else {
                                throw new Error("No dialogue generated");
                            }
                        } catch (e) {
                             console.error("Failed to generate AI dialogue, using fallback.", e);
                             const lines = activeCharacter.dialogue.onPlay;
                             const newLine = lines[Math.floor(Math.random() * lines.length)];
                             showDialogue(newLine);
                        }
                    }

                    handleAiAction(choice.action);
                }
            }, 1500);
        }
        // AI mid-turn choice (e.g., from an effect, or forced discard)
        else {
            setTimeout(() => {
                handleAiMidTurnChoice(gameState);
            }, 1500);
        }
    }
  }, [gameState, settings.aiProvider, addLog, handlePass, handlePlayCounter, handleAiAction, handleAiMidTurnChoice, endTurn, startTurn, updateGameState, showDialogue, activeCharacter]);


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

  const humanPlayerScore = useMemo(() => humanPlayer ? calculatePlayerScore(humanPlayer) : 0, [humanPlayer, gameState?.players]);
  const aiPlayerScore = useMemo(() => aiPlayer ? calculatePlayerScore(aiPlayer) : 0, [aiPlayer, gameState?.players]);
  
  const isAnyModalOpen = isSettingsModalOpen || isProfileModalOpen || isAchievementsModalOpen || isAnalysisModalOpen;
  const canAnalyze = !gameState?.tutorial && settings.aiProvider === 'gemini';


  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen">Loading Game...</div>;
  }

  const renderContent = () => {
    switch (gameState.phase) {
      case GamePhase.START_SCREEN:
        return (
          <StartScreen
            onStartNewGame={handleStartNewGame}
            onStartTutorial={handleStartTutorial}
            onStartCampaign={handleStartCampaign}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        );
      case GamePhase.CAMPAIGN_SELECTION:
        return (
          <CampaignScreen
            onStartMission={handleStartMission}
            onBack={() => initializeGame()}
            campaignProgress={gameState.campaignProgress}
          />
        );
      default:
        return (
          <GameBoard
            gameState={gameState}
            player={humanPlayer}
            opponent={aiPlayer}
            playerScore={humanPlayerScore}
            opponentScore={aiPlayerScore}
            onCardClick={handleCardClick}
            onCardHover={handleCardHover}
            onCardChoice={handleCardChoice}
            onOptionChoice={handleOptionChoice}
            onDrawCard={handleDrawCard}
            onAction={handleAction}
            onPass={handlePass}
            onPlayCounter={handlePlayCounter}
            onConfirmDiscard={handleConfirmDiscard}
            onConfirmSoftResetDiscard={handleConfirmSoftResetDiscard}
            onStartNewGame={handleStartNewGame}
            onStartTutorial={handleStartTutorial}
            onStartCampaign={handleStartCampaign}
            onToggleLogVisibility={handleToggleLogVisibility}
            onResetGame={handleResetGame}
            onMainMenu={handleMainMenu}
            onTutorialNext={() => handleTutorialAction('next')}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onOpenProfile={() => setProfileModalOpen(true)}
            onOpenAchievements={() => setAchievementsModalOpen(true)}
            settings={settings}
            isModalOpen={isAnyModalOpen}
            activeRule={activeRule}
            activeCharacter={activeCharacter}
            activeDialogue={activeDialogue}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}

      <AchievementToast achievement={activeToast} onDone={() => setActiveToast(null)} />
      
      <ActionResolutionToast resolution={actionResolution} />

      {gameState.winner && (
        <WinnerModal
          winner={gameState.winner}
          winReason={gameState.winReason || ''}
          onResetGame={handleResetGame}
          onAnalyzeGame={handleRequestAnalysis}
          canAnalyze={canAnalyze}
        />
      )}
      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModalOpen(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
      {isProfileModalOpen && (
        <ProfileModal
          stats={playerStats}
          onClose={() => setProfileModalOpen(false)}
          onResetStats={handleResetStats}
        />
      )}
      {isAchievementsModalOpen && (
        <AchievementsModal
          unlockedAchievementIds={playerStats.unlockedAchievements}
          onClose={() => setAchievementsModalOpen(false)}
        />
      )}
      {isAnalysisModalOpen && (
        <AnalysisModal
          analysisState={gameAnalysis}
          onClose={() => setAnalysisModalOpen(false)}
        />
      )}
    </>
  );
};

export default App;