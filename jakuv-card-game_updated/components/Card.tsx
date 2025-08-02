
import React from 'react';
import { Card, CardColor, Suit, Rank } from '../types';
import { HexShield } from './icons';

interface CardProps {
  card: Card | null;
  onClick?: (event: React.MouseEvent) => void;
  onHover?: (card: Card | null) => void;
  isSelected?: boolean;
  isTargetable?: boolean;
  isProtected?: boolean;
  className?: string;
  size?: 'normal' | 'small';
}

const SUIT_IMAGE_URLS: Record<Suit, string> = {
  [Suit.Clubs]: 'https://astrilator.com/xtra/a1club.png',
  [Suit.Diamonds]: 'https://astrilator.com/xtra/a1diamond.png',
  [Suit.Hearts]: 'https://astrilator.com/xtra/a1heart.png',
  [Suit.Spades]: 'https://astrilator.com/xtra/a1spade.png',
};

// Short-form descriptions for card faces
const CARD_DESCRIPTIONS: Record<Rank, React.ReactNode> = {
    'A': <>Cycle 1→3→5 pts.<br/>Immune to effects.</>,
    '2': '🎭 Mimic a 3-7 effect.',
    '3': '🕵️ Steal or force discard from hand.',
    '4': '💥 Opponent discards 2 from a row.',
    '5': '♻️ Play here, take 1 from discard.',
    '6': '🧑‍🌾 Draw 3, keep 2.',
    '7': '🎲 Draw 2, play 1.',
    '8': 'Starts with a 1-time 🛡️.',
    '9': '🚫 Counter a Scuttle from hand.',
    '10': '💣 Scuttles any card.',
    'J': <>🥷 Steal from score.<br/>Scuttles any card.</>,
    'Q': <>🛡️ Protects score row.<br/>Royal Marriage.</>,
    'K': <>⚔️ Kills opponent's Q.<br/>Counters Royals.</>,
    '?': '', // No description for the question mark card
};

export const ADVANCED_CARD_RULES: Record<Rank, React.ReactNode> = {
    'A': "Immunity: Cannot be targeted by Scuttles (except by a 10) or effects (e.g., Jack's steal, Soft Reset). Maintenance Phase: Its point value cycles 1 → 3 → 5 → 1 at the start of its controller's turn. Counter: From hand, an Ace can counter any card used to counter your action (Denial of Denial).",
    '2': "Mimic (Effect): Play to discard pile to choose and use the effect of any base card (ranks 3 through 7). The chosen effect resolves as if you had played that card.",
    '3': "Interrogator (Effect): Play to discard pile to choose one: 1) View opponent's hand and steal one card. 2) Opponent discards one random card from their hand.",
    '4': "Soft Reset (Effect): Play to discard pile. Target a single row (Score or Royalty) controlled by an opponent. Your opponent must choose and discard up to two cards from that row.",
    '5': "Rummager (Effect): This card is played directly to your Score Row. Then, choose any one card from the discard pile and add it to your hand. You cannot take the Rummager (5) you just played.",
    '6': "Farmer (Effect): Play to discard pile. Draw the top 3 cards from the deck. Add two of them to your hand and place the third back on top of the deck.",
    '7': "Lucky Draw (Effect): Play to discard pile. Draw the top 2 cards from the deck. Choose one to play immediately to your Score Row. The other card is sent to the discard pile.",
    '8': "Shielded: When played, this card has a one-time protection shield. This shield protects it from a single Scuttle attempt or a targeted effect. After being targeted once, the shield is removed. The shield does not stop board-wide effects.",
    '9': "Counter-Scuttle: From hand, a 9 can be played to counter an opponent's Scuttle action, discarding both the 9 and the opponent's attacking card. It cannot counter effects.",
    '10': "Demolition: Can Scuttle any card, regardless of value or protections (including Aces, shielded 8s, and cards protected by a Queen). The ultimate removal tool.",
    'J': "Jack of All Trades: In Royalty Row, worth 5 points. In Score Row, worth 4 points. Scuttle: Can scuttle any card, regardless of value (but is stopped by protections). Effect: Play to discard pile to steal any card from an opponent's Score Row and place it in either of your rows (Royalty if applicable).",
    'Q': "Queen's Edict: While in your Royalty Row, protects all cards in your Score Row from being targeted by Scuttles or opponent's card effects (like Jack's steal). This protection does not stop a 10. Royal Marriage: If played with a King of the same color from your hand, both are played to Royalty Row for a total of 9 points.",
    'K': "King's Decree: Can Scuttle any Queen on the board. From hand, can counter an opponent's Royal play (J, Q, K). Royal Marriage: If played with a Queen of the same color from your hand, both are played to Royalty Row for a total of 9 points. Cannot be played to Score Row.",
    '?': "This card represents an unknown card, usually in the AI's hand. It has no rules.",
};

const SuitIcon: React.FC<{ suit: Suit, color: CardColor, className: string }> = ({ suit, color, className }) => {
    const glowColor = color === CardColor.Red ? 'rgba(255, 85, 85, 0.7)' : 'rgba(188, 168, 224, 0.6)';
    const glowStyle: React.CSSProperties = {
        filter: `drop-shadow(0 0 3px ${glowColor})`
    };

    return (
        <img
            src={SUIT_IMAGE_URLS[suit]}
            alt={`${suit} suit`}
            className={className}
            style={glowStyle}
            onDragStart={(e) => e.preventDefault()}
        />
    );
};

const CardComponent: React.FC<CardProps> = ({ card, onClick, onHover, isSelected, isTargetable, isProtected, className = '', size = 'normal' }) => {
  const isSmall = size === 'small';

  if (!card) {
    // Placeholder for empty slots
    return <div className={`aspect-[2.5/3.5] ${isSmall ? 'w-full' : 'w-28'} rounded-lg border border-dashed border-[var(--neutral-glow)]/30 bg-black/20 ${className}`}></div>;
  }

  const { rank, suit, color, isFaceUp, oneTimeProtection } = card;
  const isDiamond = suit === Suit.Diamonds;
  const textColor = color === CardColor.Red ? 'text-[var(--accent-red)]' : 'text-[var(--text-light)]';

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };
  
  const handleMouseEnter = () => {
      onHover?.(card);
  }
  
  const handleMouseLeave = () => {
      onHover?.(null);
  }

  if (!isFaceUp) {
    return (
      <div
        data-card-id={card.id}
        onClick={onClick ? handleCardClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative aspect-[2.5/3.5] ${isSmall ? 'w-full' : 'w-28'} bg-[var(--bg-indigo)] rounded-lg shadow-md transition-transform duration-300 overflow-hidden ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent-cyan)]/30' : ''} ${isTargetable ? 'ring-2 ring-[var(--accent-cyan)] animate-pulse' : ''} ${className}`}>
        <img
          src="https://astrilator.com/xtra/jakuv_back-small.png"
          alt="Card Back"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const selectionClasses = isSelected ? 'ring-4 ring-[var(--warning-glow)] scale-110 shadow-xl shadow-[var(--warning-glow)]/40 z-10' : 'ring-2 ring-transparent';
  const targetableClasses = isTargetable ? 'ring-4 ring-[var(--player-glow)] animate-[pulse-bright_2s_infinite]' : '';
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-[var(--player-glow)]/20' : '';

  if (isSmall) {
      // Redesigned small card for 3x3 grid with description
      const smallRankSize = 'text-xl';
      const smallRankPos = 'top-0.5 left-1.5';
      const smallSuitSize = isDiamond ? 'w-4 h-4' : 'w-3.5 h-3.5';
      const smallSuitPos = 'top-1.5 right-1.5';
      const descriptionPos = 'absolute inset-x-1 top-8 bottom-1 flex items-center justify-center';
      const smallShieldSize = 'w-4 h-4';
      const smallShieldPos = 'bottom-0.5 right-0.5';

      return (
         <div
            data-card-id={card.id}
            onClick={handleCardClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative aspect-[2.5/3.5] w-full bg-gradient-to-br from-[var(--bg-indigo)] to-[var(--bg-void)] border border-[var(--neutral-glow)]/40 rounded-lg shadow-md transition-all duration-200 ${selectionClasses} ${targetableClasses} ${clickableClasses} ${className}`}
          >
            <p className={`absolute font-bold ${textColor} ${smallRankSize} ${smallRankPos}`}>{rank}</p>
            <SuitIcon suit={suit} color={color} className={`absolute ${smallSuitSize} ${smallSuitPos}`} />
             <div className={descriptionPos}>
              <p className={`text-center font-sans text-[var(--text-secondary)] px-1 text-[9px] leading-tight`} style={{ textShadow: '0 1px 2px #010108' }}>
                  {CARD_DESCRIPTIONS[rank]}
              </p>
            </div>
            {(isProtected || oneTimeProtection) && <HexShield className={`absolute text-[var(--player-glow)] opacity-90 ${smallShieldSize} ${smallShieldPos}`} style={{ filter: `drop-shadow(0 0 2px var(--player-glow))`}} />}
         </div>
      );
  }

  // Normal card design
  const rankSize = 'text-3xl';
  const rankPos = 'top-1 left-2';
  const suitSize = isDiamond ? 'w-6 h-6' : 'w-[1.6rem] h-[1.6rem]';
  const suitPos = 'top-2 right-2';
  const shieldSize = 'w-6 h-6';
  const shieldPos = 'bottom-1 right-1';

  return (
    <div
      data-card-id={card.id}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative aspect-[2.5/3.5] w-28 bg-gradient-to-br from-[var(--bg-indigo)] to-[var(--bg-void)] border border-[var(--neutral-glow)]/40 rounded-lg shadow-lg transition-all duration-200 ${selectionClasses} ${targetableClasses} ${clickableClasses} ${className}`}
    >
      <p className={`absolute font-bold ${textColor} ${rankSize} ${rankPos}`}>{rank}</p>
      
      <SuitIcon suit={suit} color={color} className={`absolute ${suitSize} ${suitPos}`} />

      <div className={`absolute flex items-center justify-center inset-x-1 top-12 bottom-8`}>
          <p className={`text-center font-sans text-[var(--text-secondary)] px-1 text-[10px] leading-tight`} style={{ textShadow: '0 1px 2px #010108' }}>
              {CARD_DESCRIPTIONS[rank]}
          </p>
      </div>
      
      {(isProtected || oneTimeProtection) && <HexShield className={`absolute text-[var(--player-glow)] opacity-90 ${shieldSize} ${shieldPos}`} style={{ filter: `drop-shadow(0 0 4px var(--player-glow))`}} />}
    </div>
  );
};

export default CardComponent;