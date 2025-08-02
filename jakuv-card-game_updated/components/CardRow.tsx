import React from 'react';
import { Player, Card, GameState, ActionState } from '../types';
import CardComponent from './Card';
import { Shield } from './icons';

interface CardRowProps {
  title: string;
  cards: Card[];
  location: 'scoreRow' | 'royaltyRow';
  onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
  onCardHover: (card: Card | null) => void;
  gameState: GameState;
  player: Player;
  id: string;
  icon: React.ReactNode;
}

const CardRow: React.FC<CardRowProps> = ({ title, cards, location, onCardClick, onCardHover, gameState, player, id, icon }) => {
  const { actionState, selectedCardId, selectedCardIds, effectContext } = gameState;
  
  const isOpponent = player.isAI;
  const isRowTargetableForSoftReset = actionState === ActionState.AWAITING_SOFT_RESET_TARGET_ROW && cards.length > 0;
  const isRowActiveForSoftResetDiscard = actionState === ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE 
    && effectContext?.type === 'SOFT_RESET'
    && effectContext.targetPlayerId === player.id
    && effectContext.targetRow === location;
  const isRowActiveForOvercharge = actionState === ActionState.AWAITING_OVERCHARGE_DISCARD && gameState.players[gameState.currentPlayerIndex].id === player.id;
  const isProtectedByQueen = location === 'scoreRow' && player.royaltyRow.some(c => c.rank === 'Q');
  const isRoyaltyRow = location === 'royaltyRow';

  let statusText = '';
  let statusColor = 'text-[var(--text-dark)]';

  if (location === 'scoreRow') {
    if (isProtectedByQueen) {
      statusText = 'Protected';
      statusColor = 'text-[var(--player-glow)]';
    } else {
      statusText = 'Vulnerable';
    }
  } else if (location === 'royaltyRow') {
    statusText = 'Royals Only';
  }

  return (
    <div className={`flex-1 flex flex-col glassmorphic p-3 rounded-lg ${isRoyaltyRow ? 'bg-[rgba(44,26,76,0.6)]' : ''}`}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0 px-1">
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-sm text-[var(--text-light)] uppercase tracking-wider">{title} ({cards.length})</h3>
        </div>
        {statusText && (
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${statusColor}`}>
                {isProtectedByQueen && location === 'scoreRow' && <Shield className="w-3.5 h-3.5" />}
                <span className="italic">({statusText})</span>
            </div>
        )}
      </div>
      <div 
        id={id} 
        className={`flex flex-wrap justify-center content-start gap-4 bg-black/20 p-2 rounded-lg min-h-[170px] transition-all duration-300 flex-grow ${isRowTargetableForSoftReset || isRowActiveForSoftResetDiscard ? 'ring-2 ring-[var(--accent-magenta)]' : ''} ${isRowActiveForOvercharge ? 'ring-2 ring-[var(--accent-red)] animate-pulse' : ''} ${isRoyaltyRow ? 'shadow-[inset_0_0_20px_rgba(156,136,255,0.1)]' : ''}`}>
        {cards.length > 0 ? (
            cards.map((card) => {
                const isTargetableForScuttle = location === 'scoreRow' && actionState === ActionState.AWAITING_SCUTTLE_TARGET && isOpponent;
                const isTargetableForJack = location === 'scoreRow' && actionState === ActionState.AWAITING_JACK_TARGET && isOpponent;
                const isSelectableForDiscard = isRowActiveForSoftResetDiscard;
                
                const isClickable = isTargetableForScuttle || isTargetableForJack || isRowTargetableForSoftReset || isSelectableForDiscard || isRowActiveForOvercharge;

                return (
                    <div key={card.id} className="transition-transform duration-200 animate-card-place hover:-translate-y-2 hover:!z-50">
                       <CardComponent
                          card={card}
                          size="normal"
                          onClick={isClickable ? () => onCardClick(card, player, location) : undefined}
                          onHover={onCardHover}
                          isSelected={selectedCardIds.includes(card.id)}
                          isTargetable={isTargetableForScuttle || isTargetableForJack || isRowTargetableForSoftReset || isRowActiveForOvercharge}
                          isProtected={isProtectedByQueen}
                      />
                    </div>
                );
            })
        ) : <p className="text-[var(--text-dark)] italic self-center mx-auto">Empty</p>}
      </div>
    </div>
  );
};

export default CardRow;