import React, { useRef, useState, useLayoutEffect } from 'react';
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
  const { actionState, selectedCardId, selectedCardIds, effectContext, players, currentPlayerIndex } = gameState;
  const rowContainerRef = useRef<HTMLDivElement>(null);
  const [cardOffset, setCardOffset] = useState(128);

  const cardWidth = 112; // w-28 is 7rem, 1rem=16px so 112px
  const defaultCardGap = 16; // was gap-4

  useLayoutEffect(() => {
    const container = rowContainerRef.current;
    if (!container) return;

    const calculateLayout = () => {
      const numCards = cards.length;
      if (numCards <= 1) {
        setCardOffset(cardWidth + defaultCardGap);
        return;
      }

      // p-2 on container means 8px padding on each side.
      const containerWidth = container.clientWidth - 16;
      const totalNaturalWidth = numCards * cardWidth + (numCards - 1) * defaultCardGap;

      if (totalNaturalWidth > containerWidth) {
        // Overlap needed
        const newOffset = (containerWidth - cardWidth) / (numCards - 1);
        setCardOffset(Math.min(newOffset, cardWidth + defaultCardGap));
      } else {
        // No overlap needed, use default spacing
        setCardOffset(cardWidth + defaultCardGap);
      }
    };

    const observer = new ResizeObserver(calculateLayout);
    observer.observe(container);
    
    calculateLayout(); // Also run on card changes

    return () => observer.disconnect();
  }, [cards.length, cardWidth, defaultCardGap]);

  const isMyTurn = players[currentPlayerIndex].id === player.id;
  const isOpponent = player.isAI;
  const isRowTargetableForSoftReset = actionState === ActionState.AWAITING_SOFT_RESET_TARGET_ROW && cards.length > 0;
  
  const isPlayerBeingForcedToDiscard = isMyTurn && actionState === ActionState.AWAITING_SOFT_RESET_CHOICE && effectContext?.type === 'SOFT_RESET' && effectContext.targetPlayerId === player.id && effectContext.targetRow === location;
  
  const isRowActiveForOvercharge = isMyTurn && actionState === ActionState.AWAITING_OVERCHARGE_DISCARD;
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
        ref={rowContainerRef}
        className={`relative bg-black/20 p-2 rounded-lg min-h-[170px] transition-all duration-300 flex-grow flex items-center justify-center ${isRowTargetableForSoftReset ? 'ring-2 ring-[var(--accent-magenta)]' : ''} ${isPlayerBeingForcedToDiscard ? 'ring-2 ring-[var(--accent-red)]' : ''} ${isRowActiveForOvercharge ? 'ring-2 ring-[var(--accent-red)] animate-pulse' : ''} ${isRoyaltyRow ? 'shadow-[inset_0_0_20px_rgba(156,136,255,0.1)]' : ''} ${isProtectedByQueen ? 'queen-protected-row' : ''}`}>
        {cards.length > 0 ? (
            cards.map((card, index) => {
                const isTargetableForScuttle = location === 'scoreRow' && actionState === ActionState.AWAITING_SCUTTLE_TARGET && isOpponent;
                const isTargetableForJack = location === 'scoreRow' && actionState === ActionState.AWAITING_JACK_TARGET && isOpponent;
                
                const isSelectedForDiscard = (isRowActiveForOvercharge || isPlayerBeingForcedToDiscard) && selectedCardIds.includes(card.id);
                const isClickableForDiscard = isRowActiveForOvercharge || isPlayerBeingForcedToDiscard;

                const isClickable = isTargetableForScuttle || isTargetableForJack || isRowTargetableForSoftReset || isClickableForDiscard;

                const style: React.CSSProperties = {
                    zIndex: index,
                    marginLeft: index > 0 ? `${cardOffset - cardWidth}px` : '0px',
                };

                return (
                    <div 
                        key={card.id} 
                        className="transition-all duration-300 animate-card-place hover:-translate-y-5 hover:scale-115 hover:!z-50"
                        style={style}
                    >
                       <CardComponent
                          card={card}
                          size="normal"
                          onClick={isClickable ? () => onCardClick(card, player, location) : undefined}
                          onHover={onCardHover}
                          isSelected={selectedCardId === card.id && !isRowActiveForOvercharge && !isPlayerBeingForcedToDiscard}
                          isDiscardSelection={isSelectedForDiscard}
                          isTargetable={isTargetableForScuttle || isTargetableForJack || isRowTargetableForSoftReset || isPlayerBeingForcedToDiscard}
                          isProtected={isProtectedByQueen}
                      />
                    </div>
                );
            })
        ) : <p className="absolute inset-0 flex items-center justify-center text-[var(--text-dark)] italic">Empty</p>}
      </div>
    </div>
  );
};

export default CardRow;