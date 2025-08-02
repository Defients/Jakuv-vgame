import React from 'react';
import { Player, Card, GameState, GamePhase } from '../types';
import CardRow from './CardRow';
import { WinnerTrophyIcon, ScuttleIcon } from './icons';

interface BoardRowsDisplayProps {
  player: Player;
  isCurrentPlayer: boolean;
  isOpponent: boolean;
  onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
  onCardHover: (card: Card | null) => void;
  gameState: GameState;
}

const BoardRowsDisplay: React.FC<BoardRowsDisplayProps> = ({ player, isCurrentPlayer, isOpponent, onCardClick, onCardHover, gameState }) => {
  const turnBasedClasses = !isCurrentPlayer && gameState.phase !== GamePhase.GAME_OVER && gameState.phase !== GamePhase.TUTORIAL ? 'opacity-70 brightness-75' : 'opacity-100 brightness-100';

  const royaltyRow = (
    <CardRow
        id={isOpponent ? 'opponent-royalty-row' : 'player-royalty-row'}
        title="Royalty Row"
        cards={player.royaltyRow}
        location="royaltyRow"
        onCardClick={onCardClick}
        onCardHover={onCardHover}
        gameState={gameState}
        player={player}
        icon={<WinnerTrophyIcon className="w-4 h-4 text-[var(--neutral-glow)]" />}
    />
  );
  const scoreRow = (
    <CardRow
        id={isOpponent ? 'opponent-score-row' : 'player-score-row'}
        title="Score Row"
        cards={player.scoreRow}
        location="scoreRow"
        onCardClick={onCardClick}
        onCardHover={onCardHover}
        gameState={gameState}
        player={player}
        icon={<ScuttleIcon className="w-4 h-4 text-[var(--neutral-glow)]" />}
    />
  );

  return (
    <div className={`p-4 w-full transition-all duration-500 relative flex flex-row gap-4 justify-center items-start ${turnBasedClasses} min-h-0`}>
      {royaltyRow}
      {scoreRow}
    </div>
  );
};

export default BoardRowsDisplay;