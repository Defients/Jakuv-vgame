



import React from 'react';
import { GameState, GamePhase, ActionState, Card, Player, GameActionType } from '../types';
import AIThinkingIndicator from './AIThinkingIndicator';

interface ActionPanelProps {
  gameState: GameState;
  onDrawCard: () => void;
  onAction: (action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'placeEffectScore' | 'placeEffectRoyalty' | 'confirmDiscard' | 'royalMarriage' | 'restart') => void;
  isPlayerTurn: boolean;
  onPass: () => void;
  onPlayCounter: (cardId: string) => void;
  onResetGame: () => void;
}

const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' }> = ({ onClick, disabled, children, variant = 'primary' }) => {
    const baseClasses = 'w-full text-white font-bold py-2.5 px-4 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-indigo)] relative group transform hover:-translate-y-0.5 shadow-lg';
    
    const disabledClasses = 'disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none disabled:border-slate-700 disabled:transform-none disabled:opacity-50';
    
    let variantClasses = '';
    switch(variant) {
        case 'secondary':
            variantClasses = `bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-[var(--neutral-glow)]/30 focus:ring-[var(--neutral-glow)] shadow-black/30`;
            break;
        case 'danger':
            variantClasses = `bg-gradient-to-br from-[var(--opponent-glow)]/80 to-[var(--accent-red)]/70 hover:from-[var(--opponent-glow)]/100 hover:to-[var(--accent-red)]/90 focus:ring-[var(--opponent-glow)] text-white shadow-[var(--opponent-glow)]/30`;
            break;
        case 'primary':
        default:
            variantClasses = `bg-gradient-to-br from-[var(--player-glow)]/80 to-[var(--accent-lavender)]/70 hover:from-[var(--player-glow)]/100 hover:to-[var(--accent-lavender)]/90 focus:ring-[var(--player-glow)] text-black shadow-[var(--player-glow)]/30`;
            break;
    }

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses} ${disabledClasses}`}>
             <span className="absolute top-0 left-0 w-full h-full bg-black/10 group-hover:bg-transparent transition-colors duration-300 rounded-md"></span>
             <span className="relative">{children}</span>
        </button>
    )
};

const ActionPanel: React.FC<ActionPanelProps> = ({ gameState, onDrawCard, onAction, isPlayerTurn, onPass, onPlayCounter, onResetGame }) => {
  const { phase, actionState, selectedCardId, players, currentPlayerIndex, effectContext, selectedCardIds, actionContext, counterStack } = gameState;
  
  const renderContent = () => {
    if (phase === GamePhase.GAME_OVER) {
        return <p className="text-center text-lg font-bold text-[var(--text-light)]">Game Over</p>;
    }
    
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isAI && phase !== GamePhase.COUNTER) {
      return <AIThinkingIndicator />;
    }

    if (phase === GamePhase.COUNTER) {
        if (currentPlayer.isAI) {
            return <AIThinkingIndicator />;
        }
        if (!actionContext) return null;

        const opponent = players.find(p => p.id === actionContext.playerId)!;
        
        const getValidCounters = () => {
            const lastCounter = counterStack.length > 0 ? counterStack[counterStack.length-1] : null;
            if(lastCounter) { // Denial of denial
                return currentPlayer.hand.filter(c => c.rank === 'A');
            }
            switch(actionContext.type) {
                case 'ROYAL_PLAY':
                case 'ROYAL_MARRIAGE':
                    return currentPlayer.hand.filter(c => c.rank === 'K');
                case 'SCUTTLE':
                     return currentPlayer.hand.filter(c => c.rank === '9');
                case 'BASE_EFFECT':
                case 'RUMMAGER_EFFECT':
                    return currentPlayer.hand.filter(c => c.rank === 'A');
                case 'SECOND_QUEEN_EDICT':
                    return currentPlayer.hand.filter(c => ['A', '9', 'K'].includes(c.rank));
                default:
                    return [];
            }
        };
        const validCounters = getValidCounters();

        return (
            <div className="space-y-3">
                 <h3 className="text-xl font-bold mb-2 text-[var(--opponent-glow)]" style={{textShadow: `0 0 8px var(--opponent-glow)`}}>Counter Phase!</h3>
                 <p className="text-sm text-slate-300 mb-4">{opponent.name} wants to {actionContext.counterVerb}.</p>
                 {validCounters.map(card => (
                    <ActionButton key={card.id} onClick={() => onPlayCounter(card.id)} variant="danger">
                        Counter with {card.rank}
                    </ActionButton>
                 ))}
                 <ActionButton onClick={onPass} variant="secondary">Pass</ActionButton>
            </div>
        )
    }

    if (!isPlayerTurn) {
        return <p className="text-center text-lg italic text-[var(--text-dark)]">Waiting for opponent...</p>;
    }

    switch(actionState) {
        case ActionState.AWAITING_OVERCHARGE_DISCARD: return <p className="text-center text-lg text-[var(--accent-red)] animate-pulse">Overcharged! Your score is over 21. Click cards in your Score or Royalty rows to discard.</p>
        case ActionState.AWAITING_END_TURN_DISCARD: return <p className="text-center text-lg text-[var(--warning-glow)] animate-pulse">Hand limit exceeded. Click cards in your hand to discard.</p>
        case ActionState.AWAITING_NINE_PEEK_CHOICE: return <p className="text-center text-lg text-[var(--accent-magenta)] animate-pulse">Awaiting choice for Nine's effect...</p>
        case ActionState.AWAITING_LUCKY_DRAW_CHOICE: return <p className="text-center text-lg text-[var(--player-glow)] animate-pulse">Lucky Draw: Choose a card to play...</p>
        case ActionState.AWAITING_FARMER_CHOICE: return <p className="text-center text-lg text-lime-400 animate-pulse">The Farmer: Choose a card to put back...</p>
        case ActionState.AWAITING_RUMMAGER_CHOICE: return <p className="text-center text-lg text-orange-400 animate-pulse">Rummager: Choose a card to take...</p>
        case ActionState.AWAITING_JACK_PLACEMENT:
            const stolenCard = effectContext?.type === 'JACK_STEAL' ? effectContext.stolenCard : null;
            if (!stolenCard) return null;
            const canPlaceInRoyalty = ['J', 'Q', 'K'].includes(stolenCard.rank);
            return (
                <div className="space-y-3">
                    <h3 className="text-xl font-bold mb-2 text-[var(--player-glow)]" style={{textShadow: `0 0 8px var(--player-glow)`}}>Place Stolen Card</h3>
                    <p className="text-sm text-slate-400 mb-4">Place the stolen {stolenCard.rank} in one of your rows.</p>
                    <ActionButton onClick={() => onAction('placeEffectScore')}>Place in Score Row</ActionButton>
                    <ActionButton onClick={() => onAction('placeEffectRoyalty')} disabled={!canPlaceInRoyalty}>Place in Royalty Row</ActionButton>
                </div>
            );
        case ActionState.AWAITING_JACK_TARGET: return <p className="text-center text-lg text-[var(--player-glow)] animate-pulse">Select a card in any Score Row to steal...</p>
        case ActionState.AWAITING_SCUTTLE_TARGET: return <p className="text-center text-lg text-[var(--accent-red)] animate-pulse">Select a card in any Score Row to scuttle...</p>
        case ActionState.AWAITING_SWAP_HAND_CARD: return <p className="text-center text-lg text-[var(--warning-glow)] animate-pulse">Select a card from your hand to swap...</p>
        case ActionState.AWAITING_SOFT_RESET_TARGET_ROW: return <p className="text-center text-lg text-[var(--accent-magenta)] animate-pulse">Soft Reset: Select a row to target...</p>
        case ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE:
            return (
                 <div className="space-y-3">
                    <h3 className="text-xl font-bold mb-2 text-[var(--accent-magenta)]" style={{textShadow: `0 0 8px var(--accent-magenta)`}}>Soft Reset</h3>
                    <p className="text-sm text-slate-400 mb-4">Select 1 or 2 cards to discard from the highlighted row.</p>
                    <ActionButton onClick={() => onAction('confirmDiscard')} disabled={selectedCardIds.length === 0} variant="danger">
                        Confirm Discard ({selectedCardIds.length})
                    </ActionButton>
                </div>
            )
        case ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE: return <p className="text-center text-lg text-[var(--warning-glow)] animate-pulse">Interrogator: Choose a card to steal...</p>
        case ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE: return <p className="text-center text-lg text-[var(--accent-magenta)] animate-pulse">Soft Reset: Choose a draw option...</p>
    }
    
    if (phase === GamePhase.PLAYER1_START) {
      return (
        <div className="space-y-2">
            <h3 className="text-xl font-bold mb-2">First Turn Action</h3>
            <p className="text-sm text-slate-400 mb-4">As the starting player, you have a limited turn. Click 'Draw Card' to draw, or click a card in the Swap Bar to take/swap. Any action on this first turn will end your turn.</p>
            <ActionButton onClick={onDrawCard} variant='secondary'>Draw Card</ActionButton>
        </div>
      );
    }

    if ([ActionState.AWAITING_INTERROGATOR_CHOICE, ActionState.AWAITING_MIMIC_CHOICE].includes(actionState)) {
      return <p className="text-center text-lg text-[var(--warning-glow)] animate-pulse">Choose an option...</p>;
    }


    const cardIsSelected = actionState === ActionState.CARD_SELECTED && selectedCardId !== null;
    const player = players[currentPlayerIndex];
    const selectedHandCard = cardIsSelected
      ? player.hand.find(c => c.id === selectedCardId)
      : null;

    const isRoyal = selectedHandCard ? ['J', 'Q', 'K'].includes(selectedHandCard.rank) : false;
    const isKing = selectedHandCard ? selectedHandCard.rank === 'K' : false;
    const hasEffect = selectedHandCard ? ['J', '7', '6', '4', '3', '2'].includes(selectedHandCard.rank) : false;
    
    let canDoRoyalMarriage = false;
    if (selectedHandCard && (selectedHandCard.rank === 'K' || selectedHandCard.rank === 'Q')) {
        const partnerRank = selectedHandCard.rank === 'K' ? 'Q' : 'K';
        const partnerCard = player.hand.find(c => c.rank === partnerRank && c.color === selectedHandCard.color);
        if (partnerCard) {
            canDoRoyalMarriage = true;
        }
    }


    return (
      <div className="space-y-3">
        <h3 className="text-xl font-bold mb-2 text-[var(--player-glow)]" style={{textShadow: `0 0 8px var(--player-glow)`}}>Your Turn</h3>
        <p className="text-sm text-[var(--text-dark)] mb-4">Select a card to play, draw, or interact with the Swap Bar (once per turn).</p>
        <ActionButton onClick={() => onAction('playScore')} disabled={!cardIsSelected || isKing}>Play to Score Row</ActionButton>
        <ActionButton onClick={() => onAction('playRoyalty')} disabled={!cardIsSelected || !isRoyal}>Play to Royalty Row</ActionButton>
        <ActionButton onClick={() => onAction('royalMarriage')} disabled={!canDoRoyalMarriage}>Royal Marriage</ActionButton>
        <ActionButton onClick={() => onAction('playForEffect')} disabled={!cardIsSelected || !hasEffect} variant="secondary">Play for Effect</ActionButton>
        <ActionButton onClick={() => onAction('scuttle')} disabled={!cardIsSelected} variant="secondary">Scuttle</ActionButton>
        <ActionButton onClick={onDrawCard} variant="secondary">Draw a Card</ActionButton>
        <div className="pt-4 mt-4 border-t border-[var(--neutral-glow)]/20">
            <ActionButton onClick={() => onAction('restart')} variant="danger">Restart Game</ActionButton>
        </div>
      </div>
    );
  };

  return (
    <div className="glassmorphic p-4 rounded-xl h-full flex flex-col justify-center">
      {renderContent()}
    </div>
  );
};

export default ActionPanel;