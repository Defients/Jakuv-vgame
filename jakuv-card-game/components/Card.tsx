

import React from 'react';
import { Card, CardColor } from '../types';
import { Spade, Club, Heart, Diamond, HexShield, CosmoTechSigil } from './icons';

interface CardProps {
  card: Card | null;
  onClick?: (card: Card) => void;
  isSelected?: boolean;
  isTargetable?: boolean;
  isProtected?: boolean;
  className?: string;
}

const SuitIcon: React.FC<{ suit: string, className: string }> = ({ suit, className }) => {
    switch (suit) {
        case '♠': return <Spade className={className} />;
        case '♣': return <Club className={className} />;
        case '♥': return <Heart className={className} />;
        case '♦': return <Diamond className={className} />;
        default: return null;
    }
};

const CardComponent: React.FC<CardProps> = ({ card, onClick, isSelected, isTargetable, isProtected, className = '' }) => {
  if (!card) {
    // Placeholder for empty slots
    return <div className={`aspect-[2.5/3.5] w-28 rounded-lg border border-dashed border-[var(--neutral-glow)]/30 bg-black/20 ${className}`}></div>;
  }

  const { rank, suit, color, isFaceUp, oneTimeProtection } = card;

  const handleCardClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  if (!isFaceUp) {
    return (
      <div 
        onClick={onClick ? handleCardClick : undefined}
        className={`relative aspect-[2.5/3.5] w-28 bg-gradient-to-br from-[var(--bg-indigo)] to-[var(--bg-void)] border border-[var(--neutral-glow)]/30 rounded-lg flex items-center justify-center shadow-md transition-transform duration-300 ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/30' : ''} ${isTargetable ? 'ring-2 ring-[var(--accent-cyan)] animate-pulse' : ''} ${className}`}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center">
            <CosmoTechSigil className="w-16 h-16 text-[var(--accent-cyan)]/70"/>
        </div>
         <div className="absolute inset-0 rounded-lg" style={{ background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%2300f2ff' fill-opacity='0.08' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.99-7.5L26 15v18.5l-13 7.5L0 33.5V15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
      </div>
    );
  }

  const textColor = color === CardColor.Red ? 'text-[var(--accent-red)]' : 'text-[var(--text-light)]';
  const selectionClasses = isSelected ? 'ring-4 ring-[var(--warning-glow)] scale-110 shadow-xl shadow-[var(--warning-glow)]/40 z-10' : 'ring-2 ring-transparent';
  const targetableClasses = isTargetable ? 'ring-4 ring-[var(--player-glow)] animate-[pulse-bright_2s_infinite]' : '';
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-[var(--player-glow)]/20' : '';

  return (
    <div
      onClick={handleCardClick}
      className={`relative aspect-[2.5/3.5] w-28 bg-gradient-to-br from-[var(--bg-indigo)] to-[var(--bg-void)] border border-[var(--neutral-glow)]/40 rounded-lg p-2 flex flex-col justify-between shadow-lg transition-all duration-200 ${selectionClasses} ${targetableClasses} ${clickableClasses} ${className}`}
    >
      {(isProtected || oneTimeProtection) && <HexShield className="absolute top-1 right-1 w-6 h-6 text-[var(--player-glow)] opacity-90" style={{ filter: `drop-shadow(0 0 4px var(--player-glow))`}} />}
      <div className="flex flex-col items-start">
        <p className={`text-3xl font-bold ${textColor}`}>{rank}</p>
        <SuitIcon suit={suit} className={`w-6 h-6 ${textColor}`} />
      </div>
      <div className="flex justify-end">
        <SuitIcon suit={suit} className={`w-10 h-10 ${textColor}`} />
      </div>
    </div>
  );
};

export default CardComponent;