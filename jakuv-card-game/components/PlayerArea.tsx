


import React, { useState, useEffect, useRef } from 'react';
import { Player, Card, GameState, GamePhase, ActionState } from '../types';
import CardComponent from './Card';

interface PlayerAreaProps {
  player: Player;
  score: number;
  isCurrentPlayer: boolean;
  isOpponent: boolean;
  onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
  gameState: GameState;
}

const CardRow: React.FC<{
  title: string;
  cards: Card[];
  location: 'hand' | 'scoreRow' | 'royaltyRow';
  onCardClick: PlayerAreaProps['onCardClick'];
  gameState: GameState;
  isOpponent: boolean;
  player: Player;
  className?: string;
}> = ({ title, cards, location, onCardClick, gameState, isOpponent, player, className }) => {
  const { actionState, selectedCardId, selectedCardIds, effectContext, turn } = gameState;
  const isHand = location === 'hand';
  const isHandAwaitingSwap = isHand && actionState === ActionState.AWAITING_SWAP_HAND_CARD;
  const isEndTurnDiscard = !isOpponent && isHand && actionState === ActionState.AWAITING_END_TURN_DISCARD;
  const shouldRevealHand = isOpponent && isHand && player.handRevealedUntilTurn > turn;
    
  const isRowTargetableForSoftReset = actionState === ActionState.AWAITING_SOFT_RESET_TARGET_ROW && !isHand && cards.length > 0;
  const isRowActiveForSoftResetDiscard = actionState === ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE 
    && effectContext?.type === 'SOFT_RESET'
    && effectContext.targetPlayerId === player.id
    && effectContext.targetRow === location;
  const isRowActiveForOvercharge = !isHand && actionState === ActionState.AWAITING_OVERCHARGE_DISCARD && gameState.players[gameState.currentPlayerIndex].id === player.id;
  const isProtectedByQueen = location === 'scoreRow' && player.royaltyRow.some(c => c.rank === 'Q');


  return (
    <div className={className}>
      <h3 className="font-bold text-lg mb-2 text-[var(--text-dark)] uppercase tracking-wider">
        {title} ({cards.length})
      </h3>
      <div className={`flex content-start gap-2 bg-black/20 p-2 rounded-lg min-h-[160px] ${isHand ? 'relative' : 'flex-wrap'} ${isRowTargetableForSoftReset || isRowActiveForSoftResetDiscard ? 'ring-2 ring-[var(--accent-magenta)]' : ''} ${isEndTurnDiscard ? 'ring-2 ring-[var(--warning-glow)]' : ''} ${isRowActiveForOvercharge ? 'ring-2 ring-[var(--accent-red)] animate-pulse' : ''}`}>
        {cards.length > 0 ? (
          cards.map((card, index) => {
            const isPlayerCardInHand = !isOpponent && isHand;
            const isTargetableForScuttle = location === 'scoreRow' && actionState === ActionState.AWAITING_SCUTTLE_TARGET;
            const isTargetableForJack = location === 'scoreRow' && actionState === ActionState.AWAITING_JACK_TARGET;
            const isSelectableForDiscard = isRowActiveForSoftResetDiscard;
            
            const isClickable = isPlayerCardInHand || isTargetableForScuttle || isTargetableForJack || isRowTargetableForSoftReset || isSelectableForDiscard || isEndTurnDiscard || isRowActiveForOvercharge;

            const cardToRender = (isOpponent && isHand && !shouldRevealHand) 
                ? { ...card, isFaceUp: false } 
                : { ...card, isFaceUp: card.isFaceUp || shouldRevealHand };

            let cardStyle: React.CSSProperties = {};
            if (isHand) {
                const cardCount = cards.length;
                const cardWidth = 112; // w-28 = 7rem = 112px
                const overlap = cardCount > 6 ? -62 : -52;
                const anglePerCard = Math.min(8, 70 / cardCount);
                const totalAngle = anglePerCard * (cardCount - 1);
                const startAngle = -totalAngle / 2;
                const rotation = startAngle + index * anglePerCard;
                
                const totalWidth = (cardCount - 1) * (cardWidth + overlap);
                const startOffset = -totalWidth / 2;
                const xOffset = startOffset + index * (cardWidth + overlap);

                cardStyle = {
                    position: 'absolute',
                    left: '50%',
                    bottom: '0px',
                    transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
                    transformOrigin: 'bottom center',
                    zIndex: index,
                };
            }

            return (
              <div key={card.id} style={cardStyle} className={`transition-transform duration-200 ${isHand ? 'hover:-translate-y-5 hover:!z-50' : ''}`}>
                 <CardComponent
                    card={cardToRender}
                    onClick={
                    isClickable
                        ? () => onCardClick(card, player, location)
                        : undefined
                    }
                    isSelected={(!isOpponent && selectedCardId === card.id) || selectedCardIds.includes(card.id)}
                    isTargetable={isTargetableForScuttle || isTargetableForJack || (isHandAwaitingSwap) || isRowTargetableForSoftReset || isEndTurnDiscard || isRowActiveForOvercharge}
                    isProtected={isProtectedByQueen}
                />
              </div>
            );
          })
        ) : (
          <p className="text-[var(--text-dark)] italic self-center mx-auto">Empty</p>
        )}
      </div>
    </div>
  );
};

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, score, isCurrentPlayer, isOpponent, onCardClick, gameState }) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevScore = useRef(score);
  
  const glowColor = isOpponent ? 'var(--opponent-glow)' : 'var(--player-glow)';
  const areaClasses = isCurrentPlayer ? `animate-[border-glow_2s_infinite_ease-in-out]` : `border-[var(--neutral-glow)]/20`;
  const immunityClasses = player.isImmune ? 'shadow-lg shadow-[var(--warning-glow)]/30 ring-2 ring-[var(--warning-glow)]' : '';
  const headerClasses = `bg-gradient-to-r ${isOpponent ? 'from-[var(--opponent-glow)]/25' : 'from-transparent'} to-transparent border-b border-l border-white/5`;
  
  const turnBasedClasses = !isCurrentPlayer && gameState.phase !== GamePhase.GAME_OVER ? 'opacity-70 brightness-75' : 'opacity-100 brightness-100';

  useEffect(() => {
    if (prevScore.current !== score) {
        setIsFlashing(true);
        const timer = setTimeout(() => setIsFlashing(false), 500); // Animation duration
        prevScore.current = score;
        return () => clearTimeout(timer);
    }
  }, [score]);

  const turnIndicator = isCurrentPlayer ? (
    <div className="w-3 h-3 rounded-full animate-[pulse-bright_1.5s_infinite_ease-in-out]" style={{ backgroundColor: glowColor, boxShadow: `0 0 8px ${glowColor}`}}></div>
  ) : (
    <div className="w-3 h-3 bg-slate-700 rounded-full border border-slate-600"></div>
  );

  const Hand = (
    <CardRow
      title="Hand"
      cards={player.hand}
      location="hand"
      onCardClick={onCardClick}
      gameState={gameState}
      isOpponent={isOpponent}
      player={player}
      className="w-full max-w-lg"
    />
  );

  const BoardRows = (
    <div className="flex flex-row gap-4 flex-grow">
      <CardRow
        title="Score Row"
        cards={player.scoreRow}
        location="scoreRow"
        onCardClick={onCardClick}
        gameState={gameState}
        isOpponent={isOpponent}
        player={player}
        className="flex-1"
      />
      <CardRow
        title="Royalty Row"
        cards={player.royaltyRow}
        location="royaltyRow"
        onCardClick={onCardClick}
        gameState={gameState}
        isOpponent={isOpponent}
        player={player}
        className="flex-1"
      />
    </div>
  );

  return (
    <div
      className={`glassmorphic p-4 rounded-xl border-2 ${areaClasses} ${immunityClasses} w-full transition-all duration-500 ${turnBasedClasses}`}
      style={{ '--shadow-color': glowColor } as React.CSSProperties}
    >
      <div className={`flex justify-between items-center p-2 rounded-t-lg mb-4 ${headerClasses}`}>
        <div className="flex items-center gap-3">
          {turnIndicator}
          <h2 className="text-2xl font-bold">{player.name}</h2>
        </div>
        <div className={`text-3xl font-mono bg-black/50 px-4 py-1 rounded-md border border-[var(--neutral-glow)]/20 ${isFlashing ? 'animate-score-flash' : ''}`}>
          Score: {score}
        </div>
      </div>
      <div className="flex flex-row gap-4 items-start">
        {isOpponent ? (
          <>
            {BoardRows}
            {Hand}
          </>
        ) : (
          <>
            {Hand}
            {BoardRows}
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerArea;