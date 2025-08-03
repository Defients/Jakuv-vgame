


import React, { useState, useEffect, useRef } from 'react';
import { GameState, Rank, ActionState, GamePhase, Card, Player, GameSettings } from '../types';
import { PlayCardIcon, DrawCardIcon, SwapIcon, EffectIcon, ScuttleIcon, Shield, WinnerTrophyIcon, PassIcon } from './icons';
import CardComponent from './Card';
import { WINNING_SCORE, HAND_LIMIT } from '../constants';
import { getCardValue } from '../services/gameLogic';


interface ActionPanelProps {
    gameState: GameState;
    player: Player;
    playerScore: number;
    onAction: (action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'royalMarriage' | 'surpriseSwap' | 'placeEffectScore' | 'placeEffectRoyalty') => void;
    onDrawCard: () => void;
    onPass: () => void;
    onConfirmDiscard: () => void;
    onConfirmSoftResetDiscard: (cardIds: string[]) => void;
    onCardHover: (card: Card | null) => void;
    activeRule: { rank: Rank; rule: React.ReactNode } | null;
    settings: GameSettings;
}

const RuleDetails: React.FC<{ rank: Rank; rule: React.ReactNode }> = ({ rank, rule }) => {
    if (typeof rule !== 'string') {
        return <div className="text-xs text-[var(--text-light)] leading-relaxed">{rule}</div>;
    }

    const parseRule = (text: string): React.ReactNode[] => {
        const regex = /(\w+(?:\s\w+)*:)|(\b(?:A|K|Q|J|10|[2-9])s?\b)|(\([^)]+\))|(\d+\s*→\s*\d+\s*→\s*\d+(?:\s*→\s*\d+)?)/g;
        
        let lastIndex = 0;
        const elements: React.ReactNode[] = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                elements.push(text.substring(lastIndex, match.index));
            }
            
            const [fullMatch, keyword, cardRank, parenthesized, cycle] = match;

            if (keyword) {
                elements.push(<strong key={match.index} className="text-[var(--accent-lavender)] font-bold block mt-2 first:mt-0">{keyword}</strong>);
            } else if (cardRank) {
                elements.push(<span key={match.index} className="font-bold text-[var(--accent-warning)]">{cardRank}</span>);
            } else if (parenthesized) {
                elements.push(<em key={match.index} className="text-[var(--text-secondary)] italic">{parenthesized}</em>);
            } else if (cycle) {
                elements.push(<span key={match.index} className="text-[var(--accent-cyan)] font-semibold">{cycle}</span>);
            }
            
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            elements.push(text.substring(lastIndex));
        }

        return elements;
    };

    return (
        <div className="animate-fade-in space-y-1 text-left w-full">
            <h4 className="text-lg font-bold text-center text-[var(--accent-lavender)] mb-2">Rank: {rank}</h4>
            <p className="text-xs text-[var(--text-light)] leading-relaxed">
                {parseRule(rule).map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)}
            </p>
        </div>
    );
};

const ActionButton: React.FC<{
    id?: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
    primary?: boolean;
    isGlowing?: boolean;
    warning?: boolean;
}> = ({ id, onClick, disabled, title, children, primary = false, isGlowing = false, warning = false }) => {
    const [isShaking, setShaking] = React.useState(false);

    const handleClick = () => {
        if (disabled) {
            setShaking(true);
            setTimeout(() => setShaking(false), 400); // Animation duration is 0.4s
        } else {
            onClick();
        }
    };

    const baseClasses = 'w-full flex items-center gap-3 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-indigo)] relative group transform disabled:cursor-not-allowed';
    const disabledClasses = 'bg-slate-800 text-slate-500 shadow-none opacity-60';
    const primaryClasses = `bg-gradient-to-br from-[var(--player-glow)] to-[var(--accent-lavender)] text-black shadow-lg hover:shadow-xl shadow-[var(--player-glow)]/40 hover:shadow-[var(--accent-lavender)]/50 hover:-translate-y-0.5 focus:ring-[var(--player-glow)]`;
    const secondaryClasses = `bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600 hover:border-[var(--neutral-glow)] focus:ring-[var(--neutral-glow)] shadow-md hover:shadow-lg shadow-black/30 hover:-translate-y-0.5`;
    const warningClasses = `bg-gradient-to-br from-[var(--warning-glow)] to-amber-500 text-black shadow-lg hover:shadow-xl shadow-[var(--warning-glow)]/40 hover:shadow-amber-500/50 hover:-translate-y-0.5 focus:ring-[var(--warning-glow)]`;
    const shakeClass = isShaking ? 'animate-shake' : '';
    const glowClasses = !disabled && isGlowing ? 'animate-action-glow' : '';
    
    let activeClasses = secondaryClasses;
    if (primary) activeClasses = primaryClasses;
    if (warning) activeClasses = warningClasses;


    return (
        <button id={id} onClick={handleClick} disabled={disabled} title={title} className={`${baseClasses} ${disabled ? disabledClasses : activeClasses} ${glowClasses} ${shakeClass}`}>
            {children}
        </button>
    );
};

const ActionStackDisplay: React.FC<{ gameState: GameState, onCardHover: (card: Card | null) => void }> = ({ gameState, onCardHover }) => {
    const { actionContext, counterStack, players } = gameState;
    if (!actionContext) return null;

    const initiatorCard = actionContext.initiatorCard;
    const allStackCards: Card[] = initiatorCard ? [initiatorCard, ...counterStack] : [...counterStack];

    const initiatorPlayerId = actionContext.playerId;
    const responderPlayerId = players.find(p => p.id !== initiatorPlayerId)!.id;
    
    return (
        <div className="bg-black/30 p-3 rounded-md min-h-[120px] flex flex-col animate-fade-in">
             <h4 className="text-lg font-bold text-center text-[var(--accent-lavender)] mb-2 flex-shrink-0">Action Stack</h4>
             <div className="flex-grow flex items-center overflow-x-auto overflow-y-hidden custom-scrollbar pb-3 space-x-4 px-1">
                 {allStackCards.map((card, index) => {
                    const isInitiator = index === 0;
                    const cardOwnerId = index % 2 === 0 ? initiatorPlayerId : responderPlayerId;
                    const cardOwner = players.find(p => p.id === cardOwnerId);

                    return (
                        <div key={card.id || index} className="flex items-center gap-2 animate-card-place flex-shrink-0">
                            <div className="w-20 flex-shrink-0">
                                <CardComponent card={{...card, isFaceUp: true}} size="small" onHover={onCardHover} />
                            </div>
                            <div className="text-xs w-24">
                                <p className="font-bold truncate" style={{ color: cardOwner?.isAI ? 'var(--opponent-glow)' : 'var(--player-glow)' }}>
                                    {cardOwner?.name}
                                </p>
                                <p className="text-[var(--text-light)]">{isInitiator ? 'Initiates:' : 'Counters with:'}</p>
                                <p className="text-[var(--text-secondary)] font-semibold">{card.rank}{card.suit}</p>
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>
    )
}

const DiscardActions: React.FC<{ gameState: GameState, player: Player, playerScore: number, onConfirmDiscard: () => void, onConfirmSoftResetDiscard: (cardIds: string[]) => void }> = ({ gameState, player, playerScore, onConfirmDiscard, onConfirmSoftResetDiscard }) => {
    const { actionState, selectedCardIds } = gameState;

    let message = "";
    let subMessage = "";
    let buttonDisabled = true;

    if (actionState === ActionState.AWAITING_OVERCHARGE_DISCARD) {
        const selectedCardsOnBoard = [...player.scoreRow, ...player.royaltyRow].filter(c => selectedCardIds.includes(c.id));
        
        let scoreReduction = 0;
        selectedCardsOnBoard.forEach(c => {
             scoreReduction += getCardValue(c, player.scoreRow.find(sc => sc.id === c.id) ? 'scoreRow' : 'royaltyRow');
        });

        const finalScore = playerScore - scoreReduction;
        message = `You are Overcharged at ${playerScore}!`;
        subMessage = `Discard cards to reach ${WINNING_SCORE} or less. New Score: ${finalScore}`;
        
        if (finalScore <= WINNING_SCORE) {
            buttonDisabled = false;
        }

        return (
            <div className="my-4 p-4 border-2 border-dashed border-[var(--accent-red)] rounded-lg space-y-3 animate-fade-in bg-[var(--accent-red)]/10">
                <h4 className="text-center font-bold text-lg text-[var(--accent-red)] uppercase">Discard Required</h4>
                <p className="text-center text-sm font-bold text-white">{message}</p>
                <p className="text-center text-sm text-[var(--text-secondary)]">{subMessage}</p>
                <ActionButton id="action-btn-confirm-discard" onClick={() => onConfirmDiscard()} disabled={buttonDisabled} warning>
                    Confirm Discard
                </ActionButton>
            </div>
        );

    } else if(actionState === ActionState.AWAITING_SOFT_RESET_CHOICE) {
        message = 'Opponent used Soft Reset on you!';
        subMessage = `Select up to 2 cards from the highlighted row to discard. (${selectedCardIds.length} / 2 selected)`;
        buttonDisabled = selectedCardIds.length > 2;
        if(selectedCardIds.length <= 2) {
             subMessage = `Ready to discard ${selectedCardIds.length} card(s).`
             buttonDisabled = false
        }
        
         return (
            <div className="my-4 p-4 border-2 border-dashed border-[var(--accent-magenta)] rounded-lg space-y-3 animate-fade-in bg-[var(--accent-magenta)]/10">
                <h4 className="text-center font-bold text-lg text-[var(--accent-magenta)] uppercase">Forced Discard</h4>
                <p className="text-center text-sm font-bold text-white">{message}</p>
                <p className="text-center text-sm text-[var(--text-secondary)]">{subMessage}</p>
                <ActionButton id="action-btn-confirm-soft-reset" onClick={() => onConfirmSoftResetDiscard(selectedCardIds)} disabled={buttonDisabled} warning>
                    Confirm Discard
                </ActionButton>
            </div>
        );

    } else { // AWAITING_END_TURN_DISCARD
        const cardsToDiscardCount = player.hand.length - HAND_LIMIT;
        const remainingToDiscard = cardsToDiscardCount - selectedCardIds.length;
        message = `Hand limit is ${HAND_LIMIT}.`;
        subMessage = `Select ${remainingToDiscard} more card(s) to discard.`
        
        if (remainingToDiscard <= 0) {
            subMessage = `Ready to discard ${selectedCardIds.length} card(s).`;
            buttonDisabled = false;
        }

        return (
            <div className="my-4 p-4 border-2 border-dashed border-[var(--accent-red)] rounded-lg space-y-3 animate-fade-in bg-[var(--accent-red)]/10">
                <h4 className="text-center font-bold text-lg text-[var(--accent-red)] uppercase">Discard Required</h4>
                <p className="text-center text-sm font-bold text-white">{message}</p>
                <p className="text-center text-sm text-[var(--text-secondary)]">{subMessage}</p>
                <ActionButton id="action-btn-confirm-discard" onClick={() => onConfirmDiscard()} disabled={buttonDisabled} warning>
                    Confirm Discard
                </ActionButton>
            </div>
        );
    }
};

const AutoPassButton: React.FC<{ onPass: () => void, delay: GameSettings['autoPassDelay'] }> = ({ onPass, delay }) => {
    const delayInSeconds = delay === 'off' ? 0 : parseInt(delay, 10);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>();

    useEffect(() => {
        if (delayInSeconds === 0) return; // Auto-pass is off

        let animationFrameId: number;

        const animate = (time: number) => {
            if (startTimeRef.current === undefined) {
                startTimeRef.current = time;
            }
            
            if (!isPaused) {
                const elapsedTime = time - startTimeRef.current;
                const newProgress = Math.min((elapsedTime / (delayInSeconds * 1000)) * 100, 100);

                setProgress(newProgress);
                
                if (newProgress >= 100) {
                    onPass();
                    return; // Stop the animation
                }
            } else {
                // Adjust start time to account for the pause
                const elapsedBeforePause = (progress / 100) * (delayInSeconds * 1000);
                startTimeRef.current = time - elapsedBeforePause;
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            startTimeRef.current = undefined;
            setProgress(0);
        };
    }, [delayInSeconds, onPass, isPaused, progress]);

    const handleMouseEnter = () => setIsPaused(true);
    const handleMouseLeave = () => setIsPaused(false);

    const hasTimer = delayInSeconds > 0;

    return (
        <div 
            id="action-btn-pass" 
            onClick={onPass} 
            onMouseEnter={hasTimer ? handleMouseEnter : undefined}
            onMouseLeave={hasTimer ? handleMouseLeave : undefined}
            title={hasTimer ? "Hover to pause auto-pass timer" : "Pass your turn"}
            className="relative flex items-center justify-center gap-3 w-full text-black font-bold h-16 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-indigo)] group transform cursor-pointer overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg hover:shadow-xl shadow-amber-500/40 hover:shadow-amber-500/50 hover:-translate-y-0.5 focus:ring-amber-500"
        >
            {hasTimer && (
                <div className="absolute top-0 left-0 h-full bg-black/40" style={{ width: `${100 - progress}%`, transition: isPaused ? 'none' : 'width 0.05s linear' }} />
            )}
            <div className="relative flex items-center gap-3" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}>
                <PassIcon className="w-6 h-6" />
                <span className="text-xl">Pass</span>
            </div>
        </div>
    );
};


const ActionPanel: React.FC<ActionPanelProps> = ({ gameState, player, playerScore, onAction, onDrawCard, onPass, onConfirmDiscard, onConfirmSoftResetDiscard, onCardHover, activeRule, settings }) => {
    const { phase, players, currentPlayerIndex, selectedCardId, swapUsedThisTurn, actionState, turn, effectContext } = gameState;
    const isMyTurn = players[currentPlayerIndex].id === player.id;
    const selectedCard = selectedCardId ? player.hand.find(c => c.id === selectedCardId) : null;
    
    const isPlayer1FirstTurn = turn === 1 && isMyTurn;

    const canDoTurnAction = isMyTurn && !swapUsedThisTurn && (phase === GamePhase.PLAYER_TURN || phase === GamePhase.PLAYER1_START) && ![ActionState.AWAITING_SCUTTLE_TARGET, ActionState.AWAITING_SURPRISE_SWAP_TARGET, ActionState.AWAITING_JACK_PLACEMENT].includes(actionState);
    let turnActionReason = "";
    if (swapUsedThisTurn) turnActionReason = "Swap action already used this turn.";
    else if (!isMyTurn) turnActionReason = "Not your turn.";
    else if (phase !== GamePhase.PLAYER_TURN && phase !== GamePhase.PLAYER1_START) turnActionReason = "Cannot perform this action now.";
    else if (actionState === ActionState.AWAITING_SCUTTLE_TARGET) turnActionReason = "Select a card to scuttle.";
    else if (actionState === ActionState.AWAITING_SURPRISE_SWAP_TARGET) turnActionReason = "Select a card to swap with.";
    else if (actionState === ActionState.AWAITING_JACK_PLACEMENT) turnActionReason = "Choose where to place the stolen card.";


    const canDraw = canDoTurnAction;
    const drawReason = turnActionReason;
    
    const canTakeSwap = isMyTurn && !swapUsedThisTurn;

    // Card-specific action validation
    const canPlayScore = !!(!isPlayer1FirstTurn && selectedCard && selectedCard.rank !== 'K');
    const playScoreReason = isPlayer1FirstTurn ? "Cannot play cards on first turn." : !selectedCard ? "Select a card first" : selectedCard.rank === 'K' ? "Kings cannot be played to Score Row." : "";
    
    const canPlayRoyalty = !!(!isPlayer1FirstTurn && selectedCard && ['J', 'Q', 'K'].includes(selectedCard.rank));
    const playRoyaltyReason = isPlayer1FirstTurn ? "Cannot play cards on first turn." : !selectedCard ? "Select a card first" : !['J', 'Q', 'K'].includes(selectedCard?.rank || '') ? "Only J, Q, K can be played to Royalty Row." : "";

    const canScuttle = !!(!isPlayer1FirstTurn && selectedCard);
    const scuttleReason = isPlayer1FirstTurn ? "Cannot scuttle on first turn." : !selectedCard ? "Select a card first" : "";
    
    const canPlayForEffect = !!(!isPlayer1FirstTurn && selectedCard && ['J', '7', '6', '5', '4', '3', '2'].includes(selectedCard.rank));
    const playEffectReason = isPlayer1FirstTurn ? "Cannot use effects on first turn." : !selectedCard ? "Select a card first" : !['J', '7', '6', '5', '4', '3', '2'].includes(selectedCard?.rank || '') ? "This card has no special effect to play." : "";
    
    let canDoRoyalMarriage = false;
    if (!isPlayer1FirstTurn && selectedCard && (selectedCard.rank === 'K' || selectedCard.rank === 'Q')) {
        const partnerRank = selectedCard.rank === 'K' ? 'Q' : 'K';
        if (player.hand.some(c => c.rank === partnerRank && c.color === selectedCard.color)) {
            canDoRoyalMarriage = true;
        }
    }
    const royalMarriageReason = isPlayer1FirstTurn ? "Cannot perform Royal Marriage on first turn." : !canDoRoyalMarriage ? "Requires a matching color King and Queen in hand." : "";

    const canSurpriseSwap = !!(canTakeSwap && selectedCard);
    const surpriseSwapReason = swapUsedThisTurn ? "Swap action already used." : !selectedCard ? "Select a card from your hand first." : "";

    // Jack Placement specific logic
    const isPlacingStolenCard = actionState === ActionState.AWAITING_JACK_PLACEMENT && effectContext?.type === 'JACK_STEAL';
    const stolenCardIsRoyal = !!(isPlacingStolenCard && ['J', 'Q', 'K'].includes(effectContext.stolenCard.rank));
    
    const isDiscarding = isMyTurn && (actionState === ActionState.AWAITING_OVERCHARGE_DISCARD || actionState === ActionState.AWAITING_END_TURN_DISCARD || actionState === ActionState.AWAITING_SOFT_RESET_CHOICE);
    
    const getActionStatusText = () => {
        if (!isMyTurn) return '';
        switch (actionState) {
            case ActionState.AWAITING_SCUTTLE_TARGET: return "Select an opponent's card to Scuttle.";
            case ActionState.AWAITING_JACK_TARGET: return "Select an opponent's Score Row card to steal.";
            case ActionState.AWAITING_SURPRISE_SWAP_TARGET: return "Select a face-down card from the Swap Bar.";
            case ActionState.AWAITING_SOFT_RESET_TARGET_ROW: return "Select an opponent's row to target.";
            default: return '';
        }
    }
    const actionStatusText = getActionStatusText();

    return (
        <div className="glassmorphic p-4 rounded-xl flex flex-col flex-grow min-h-0">
            <h3 className="text-xl font-bold text-center mb-3 text-[var(--text-light)] border-b-2 border-[var(--neutral-glow)]/20 pb-2 uppercase tracking-wider flex-shrink-0">
                Actions
            </h3>
            
            <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0">
                { actionStatusText && (
                    <div className="text-center p-2 bg-black/20 rounded-md text-[var(--accent-warning)] font-semibold animate-fade-in">{actionStatusText}</div>
                )}
                {isDiscarding ? (
                     <DiscardActions gameState={gameState} player={player} playerScore={playerScore} onConfirmDiscard={onConfirmDiscard} onConfirmSoftResetDiscard={onConfirmSoftResetDiscard} />
                ) : isPlacingStolenCard ? (
                    <div className="my-4 p-3 border-2 border-dashed border-[var(--warning-glow)] rounded-lg space-y-3 animate-fade-in">
                        <h4 className="text-center font-bold text-[var(--warning-glow)]">Place Stolen Card</h4>
                        <ActionButton id="action-btn-placeScore" onClick={() => onAction('placeEffectScore')}>
                            <PlayCardIcon className="w-5 h-5" /> Place in Score Row
                        </ActionButton>
                        <ActionButton id="action-btn-placeRoyalty" onClick={() => onAction('placeEffectRoyalty')} disabled={!stolenCardIsRoyal} title={!stolenCardIsRoyal ? 'Only J, Q, K can be placed here.' : ''}>
                            <WinnerTrophyIcon className="w-5 h-5" /> Place in Royalty Row
                        </ActionButton>
                    </div>
                ) : phase === GamePhase.COUNTER && isMyTurn ? (
                    <div className="my-4 p-4 border-2 border-dashed border-[var(--warning-glow)] rounded-lg space-y-3 animate-fade-in bg-[var(--warning-glow)]/10">
                        <h4 className="text-center font-bold text-lg text-[var(--warning-glow)]">Respond to Action</h4>
                         <AutoPassButton onPass={onPass} delay={settings.autoPassDelay} />
                        <p className="text-center text-sm text-[var(--text-secondary)]">Or play a valid counter card from your hand.</p>
                    </div>
                ) : (
                    <>
                        {/* Always-on Actions */}
                        <ActionButton id="action-btn-draw" onClick={onDrawCard} disabled={!canDraw} title={!canDraw ? drawReason : "Draw a card and end your turn."}>
                            <DrawCardIcon className="w-5 h-5" /> Draw Card
                        </ActionButton>
                        
                        {/* Card-based Actions */}
                        <div className="h-px w-full bg-slate-600 my-4"></div>
                        
                        <div className={`transition-opacity duration-300 space-y-3 ${selectedCard ? 'opacity-100' : 'opacity-40'}`}>
                            <h4 className={`text-center font-bold transition-colors ${selectedCard ? 'text-white' : 'text-slate-500'}`}>
                                {selectedCard ? `${selectedCard.rank}${selectedCard.suit} Selected` : 'Select a Card'}
                            </h4>
                            <ActionButton id="action-btn-playScore" onClick={() => onAction('playScore')} disabled={!canPlayScore} title={playScoreReason} isGlowing={!!selectedCard && canPlayScore}>
                                <PlayCardIcon className="w-5 h-5" /> Play to Score
                            </ActionButton>
                            <ActionButton id="action-btn-playRoyalty" onClick={() => onAction('playRoyalty')} disabled={!canPlayRoyalty} title={playRoyaltyReason} isGlowing={!!selectedCard && canPlayRoyalty}>
                                <WinnerTrophyIcon className="w-5 h-5" /> Play to Royalty
                            </ActionButton>
                            <ActionButton id="action-btn-royalMarriage" onClick={() => onAction('royalMarriage')} disabled={!canDoRoyalMarriage} title={royalMarriageReason} isGlowing={!!selectedCard && canDoRoyalMarriage}>
                                <Shield className="w-5 h-5" /> Royal Marriage
                            </ActionButton>
                            <ActionButton id="action-btn-playForEffect" onClick={() => onAction('playForEffect')} disabled={!canPlayForEffect} title={playEffectReason} isGlowing={!!selectedCard && canPlayForEffect}>
                                <EffectIcon className="w-5 h-5" /> Play for Effect
                            </ActionButton>
                            <ActionButton id="action-btn-scuttle" onClick={() => onAction('scuttle')} disabled={!canScuttle} title={scuttleReason} isGlowing={!!selectedCard && canScuttle}>
                                <ScuttleIcon className="w-5 h-5" /> Scuttle
                            </ActionButton>
                            <ActionButton id="action-btn-surpriseSwap" onClick={() => onAction('surpriseSwap')} disabled={!canSurpriseSwap} title={surpriseSwapReason} isGlowing={!!selectedCard && canSurpriseSwap}>
                                <SwapIcon className="w-5 h-5" /> Surprise Swap
                            </ActionButton>
                        </div>
                    </>
                )}
            </div>

            {/* Rules Display / Action Stack */}
            <div className="mt-auto pt-3 border-t border-slate-600/80 flex-shrink-0 min-h-[144px]">
                 {gameState.actionContext ? (
                    <ActionStackDisplay gameState={gameState} onCardHover={onCardHover} />
                 ) : (
                    <div className="bg-black/30 p-3 rounded-md min-h-[120px] text-slate-300 text-sm flex items-center justify-center">
                        {activeRule ? (
                            <RuleDetails rank={activeRule.rank} rule={activeRule.rule} />
                        ) : (
                            <p className="text-center italic text-slate-400">Hover over a card to see its rules.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActionPanel;