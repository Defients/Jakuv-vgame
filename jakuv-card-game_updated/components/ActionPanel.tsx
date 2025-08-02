import React from 'react';
import { GameState, Rank, ActionState, GamePhase } from '../types';
import { PlayCardIcon, DrawCardIcon, SwapIcon, EffectIcon, ScuttleIcon, Shield, WinnerTrophyIcon, PassIcon } from './icons';

interface ActionPanelProps {
    gameState: GameState;
    onAction: (action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'royalMarriage' | 'surpriseSwap' | 'placeEffectScore' | 'placeEffectRoyalty') => void;
    onDrawCard: () => void;
    onPass: () => void;
    activeRule: { rank: Rank; rule: React.ReactNode } | null;
}

const ActionButton: React.FC<{
    id?: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
    children: React.ReactNode;
    primary?: boolean;
    isGlowing?: boolean;
}> = ({ id, onClick, disabled, title, children, primary = false, isGlowing = false }) => {
    const baseClasses = 'w-full flex items-center gap-3 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-indigo)] relative group transform disabled:cursor-not-allowed';
    const disabledClasses = 'bg-slate-800 text-slate-500 shadow-none opacity-60';
    const primaryClasses = `bg-gradient-to-br from-[var(--player-glow)] to-[var(--accent-lavender)] text-black shadow-lg hover:shadow-xl shadow-[var(--player-glow)]/40 hover:shadow-[var(--accent-lavender)]/50 hover:-translate-y-0.5 focus:ring-[var(--player-glow)]`;
    const secondaryClasses = `bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600 hover:border-[var(--neutral-glow)] focus:ring-[var(--neutral-glow)] shadow-md hover:shadow-lg shadow-black/30 hover:-translate-y-0.5`;
    const warningClasses = `bg-gradient-to-br from-[var(--warning-glow)] to-amber-500 text-black shadow-lg hover:shadow-xl shadow-[var(--warning-glow)]/40 hover:shadow-amber-500/50 hover:-translate-y-0.5 focus:ring-[var(--warning-glow)]`;

    const glowClasses = !disabled && isGlowing ? 'animate-action-glow' : '';

    return (
        <button id={id} onClick={onClick} disabled={disabled} title={title} className={`${baseClasses} ${disabled ? disabledClasses : (primary ? (id === 'action-btn-pass' ? warningClasses : primaryClasses) : secondaryClasses)} ${glowClasses}`}>
            {children}
        </button>
    );
};

const ActionPanel: React.FC<ActionPanelProps> = ({ gameState, onAction, onDrawCard, onPass, activeRule }) => {
    const { phase, players, currentPlayerIndex, selectedCardId, swapUsedThisTurn, actionState, turn, effectContext } = gameState;
    const player = players.find(p => !p.isAI)!;
    const isMyTurn = players[currentPlayerIndex].id === player.id;
    const selectedCard = selectedCardId ? player.hand.find(c => c.id === selectedCardId) : null;
    
    const isPlayer1FirstTurn = turn === 1 && isMyTurn;

    const canDoTurnAction = isMyTurn && !swapUsedThisTurn && phase === GamePhase.PLAYER_TURN && ![ActionState.AWAITING_SCUTTLE_TARGET, ActionState.AWAITING_SURPRISE_SWAP_TARGET, ActionState.AWAITING_JACK_PLACEMENT].includes(actionState);
    let turnActionReason = "";
    if (swapUsedThisTurn) turnActionReason = "Swap action already used this turn.";
    else if (!isMyTurn) turnActionReason = "Not your turn.";
    else if (phase !== GamePhase.PLAYER_TURN) turnActionReason = "Cannot perform this action now.";
    else if (actionState === ActionState.AWAITING_SCUTTLE_TARGET) turnActionReason = "Select a card to scuttle.";
    else if (actionState === ActionState.AWAITING_SURPRISE_SWAP_TARGET) turnActionReason = "Select a card to swap with.";
    else if (actionState === ActionState.AWAITING_JACK_PLACEMENT) turnActionReason = "Choose where to place the stolen card.";


    const canDraw = canDoTurnAction && !isPlayer1FirstTurn;
    const drawReason = isPlayer1FirstTurn ? "Cannot draw on the first turn." : turnActionReason;
    
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


    return (
        <div className="glassmorphic p-4 rounded-xl flex flex-col flex-grow min-h-0">
            <h3 className="text-xl font-bold text-center mb-3 text-[var(--text-light)] border-b-2 border-[var(--neutral-glow)]/20 pb-2 uppercase tracking-wider flex-shrink-0">
                Actions
            </h3>
            
            <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0">
                {/* Contextual Action Blocks */}
                {isPlacingStolenCard ? (
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
                         <ActionButton id="action-btn-pass" onClick={onPass} primary>
                            <PassIcon className="w-5 h-5" /> Pass
                        </ActionButton>
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

            {/* Rules Display */}
            <div className="mt-auto pt-3 border-t border-slate-600/80 flex-shrink-0">
                 <div className="bg-black/30 p-3 rounded-md min-h-[120px] text-slate-300 text-sm flex items-center justify-center">
                    {activeRule ? (
                        <div className="animate-fade-in space-y-2 text-left w-full">
                             <h4 className="text-lg font-bold text-center text-[var(--accent-lavender)]">Rank: {activeRule.rank}</h4>
                             <p className="text-xs text-[var(--text-light)] leading-relaxed">{activeRule.rule}</p>
                        </div>
                    ) : (
                        <p className="text-center italic text-slate-400">Hover over a card to see its rules.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionPanel;
