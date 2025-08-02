
import React from 'react';
import { GameState, Player, Card, ActionState, GamePhase } from '../types';
import PlayerArea from './PlayerArea';
import ActionPanel from './ActionPanel';
import GameLog from './GameLog';
import CardComponent from './Card';
import CardChoiceModal from './CardChoiceModal';
import OptionChoiceModal from './OptionChoiceModal';
import PeekAndSwapModal from './PeekAndSwapModal';
import StartScreen from './StartScreen';

interface GameBoardProps {
  gameState: GameState;
  player: Player | undefined;
  opponent: Player | undefined;
  playerScore: number;
  opponentScore: number;
  onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
  onCardChoice: (cardId: string) => void;
  onOptionChoice: (value: string) => void;
  onDrawCard: () => void;
  onAction: (action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'placeEffectScore' | 'placeEffectRoyalty' | 'confirmDiscard' | 'royalMarriage' | 'restart') => void;
  onPass: () => void;
  onPlayCounter: (cardId: string) => void;
  onPeekDecision: (swap: boolean) => void;
  onStartNewGame: () => void;
  onToggleLogVisibility: (logId: string) => void;
  onResetGame: () => void;
}

const CentralNexus: React.FC<Pick<GameBoardProps, 'gameState' | 'onCardClick' | 'player'>> = ({ gameState, onCardClick, player }) => {
  const { phase, actionContext, counterStack, players, turn, currentPlayerIndex, deck, swapBar, discardPile, swapUsedThisTurn } = gameState;
  const isPlayerTurn = player ? players[currentPlayerIndex].id === player.id : false;
  const activePlayer = players[currentPlayerIndex];

  const ActionStackDisplay = () => {
    if (phase !== GamePhase.COUNTER || !actionContext) {
        return (
            <div className="action-stack flex items-center justify-center">
                <p className="text-lg text-[var(--text-dark)] italic">Clear</p>
            </div>
        )
    }

    const actionPlayer = players.find(p => p.id === actionContext.playerId);
    if (!actionPlayer) return null;

    let initialCards: Card[] = [];
    if(actionContext.payload.cardId) {
        const card = actionPlayer.hand.find(c => c.id === actionContext.payload.cardId);
        if(card) initialCards.push(card);
    } else if (actionContext.payload.attackerCardId) {
        const card = actionPlayer.hand.find(c => c.id === actionContext.payload.attackerCardId);
        if(card) initialCards.push(card);
    } else if (actionContext.payload.kingId) {
         const king = actionPlayer.hand.find(c => c.id === actionContext.payload.kingId);
         const queen = actionPlayer.hand.find(c => c.id === actionContext.payload.queenId);
         if(king) initialCards.push(king);
         if(queen) initialCards.push(queen);
    }

    const allStackCards = [...initialCards, ...counterStack];

    return (
      <div className="action-stack">
        <h3 className="font-bold text-center text-[var(--opponent-glow)] uppercase tracking-wider text-sm mb-2">Action Stack</h3>
        <div className="flex gap-2 justify-center items-center h-full">
            {allStackCards.length > 0 ? (
                allStackCards.map(card => (
                    <CardComponent
                        key={card.id}
                        card={{...card, isFaceUp: true}}
                        className="action-stack-card"
                    />
                ))
            ) : <p className="text-sm text-[var(--text-dark)] italic">Awaiting counter...</p> }
        </div>
      </div>
    );
  };
  
  const activePlayerColor = activePlayer.isAI ? 'var(--opponent-glow)' : 'var(--player-glow)';

  return (
      <div className="glassmorphic central-nexus flex flex-col justify-between flex-shrink-0">
        <div className="text-center font-bold uppercase tracking-wider text-lg mb-2">
            <span className="text-[var(--text-dark)]">Turn {Math.ceil(turn/2)} | </span>
            <span style={{ color: activePlayerColor, textShadow: `0 0 5px ${activePlayerColor}`}}>
                {activePlayer.name}'s Turn
            </span>
        </div>
        
        <ActionStackDisplay />

        <div className="flex justify-around items-end gap-8">
            <div className="text-center">
                <h3 className="font-bold text-[var(--text-dark)] uppercase tracking-wider text-sm mb-2 pb-1 border-b-2 border-[var(--neutral-glow)]/20">Deck</h3>
                <CardComponent card={deck.length > 0 ? deck[deck.length - 1] : null} />
                <p className="text-sm mt-1 text-[var(--text-dark)]">{deck.length} left</p>
            </div>
             <div className="text-center">
                <h3 className="font-bold text-[var(--text-dark)] uppercase tracking-wider text-sm mb-2 pb-1 border-b-2 border-[var(--neutral-glow)]/20">Swap Bar</h3>
                <div className="flex gap-3 min-h-[160px] items-center p-2 rounded-lg bg-black/20">
                    {swapBar.map((card, index) => (
                        <CardComponent 
                            key={card?.id || `swap-${index}`} 
                            card={card} 
                            onClick={card && player && isPlayerTurn && !swapUsedThisTurn ? () => onCardClick(card, player, 'swapBar') : undefined}
                            isTargetable={card ? !card.isFaceUp && player && isPlayerTurn && !swapUsedThisTurn && gameState.actionState === ActionState.IDLE : false}
                        />
                    ))}
                </div>
                 <p className="text-sm mt-1 text-[var(--text-dark)]">&nbsp;</p>
            </div>
            <div className="text-center">
                <h3 className="font-bold text-[var(--text-dark)] uppercase tracking-wider text-sm mb-2 pb-1 border-b-2 border-[var(--neutral-glow)]/20">Discard</h3>
                <CardComponent card={discardPile.length > 0 ? { ...discardPile[discardPile.length - 1], isFaceUp: true } : null} />
                <p className="text-sm mt-1 text-[var(--text-dark)]">{discardPile.length} cards</p>
            </div>
        </div>
      </div>
  )
}


const GameBoard: React.FC<GameBoardProps> = (props) => {
  const { 
      gameState, player, opponent, playerScore, opponentScore, 
      onCardClick, onCardChoice, onOptionChoice, onDrawCard, onAction,
      onPass, onPlayCounter, onPeekDecision, onStartNewGame,
      onToggleLogVisibility, onResetGame
  } = props;
  
  if (gameState.phase === GamePhase.START_SCREEN) {
    return <StartScreen onStartNewGame={onStartNewGame} />;
  }

  // Should not happen if not in start screen, but a good guard
  if (!player || !opponent) {
    return <div className="flex items-center justify-center min-h-screen">Initializing Board...</div>;
  }
  
  const isPlayerTurn = gameState.players[gameState.currentPlayerIndex].id === player.id;
  const isHumanTurn = isPlayerTurn && !player.isAI;
  
  return (
    <main className="h-screen max-h-screen p-4 flex flex-row gap-4 overflow-hidden">
      <div className="flex-grow flex flex-col gap-4 justify-between">
        <PlayerArea
          player={opponent}
          score={opponentScore}
          isCurrentPlayer={!isPlayerTurn && gameState.phase !== 'COUNTER'}
          isOpponent={true}
          onCardClick={onCardClick}
          gameState={gameState}
        />
        
        <CentralNexus gameState={gameState} player={player} onCardClick={onCardClick} />

        <PlayerArea
          player={player}
          score={playerScore}
          isCurrentPlayer={isPlayerTurn || gameState.phase === 'COUNTER'}
          isOpponent={false}
          onCardClick={onCardClick}
          gameState={gameState}
        />
      </div>

      <div className="w-96 flex-shrink-0 flex flex-col gap-4">
        <ActionPanel 
            gameState={gameState}
            onDrawCard={onDrawCard}
            onAction={onAction}
            isPlayerTurn={isPlayerTurn}
            onPass={onPass}
            onPlayCounter={onPlayCounter}
            onResetGame={onResetGame}
        />
        <GameLog messages={gameState.log} onToggleVisibility={onToggleLogVisibility} />
      </div>

      {isHumanTurn && gameState.cardChoices.length > 0 && gameState.cardChoiceContext && (
        <CardChoiceModal
            cards={gameState.cardChoices}
            prompt={
                gameState.cardChoiceContext.type === 'NINE_SCUTTLE_PEEK' ? "Nine's Effect: Choose which card to place on top of the deck (you will draw this card)."
                : gameState.cardChoiceContext.type === 'LUCKY_DRAW' ? "Lucky Draw: Choose a card to play to your Score Row. The other goes to your hand."
                : gameState.cardChoiceContext.type === 'FARMER' ? "The Farmer: Choose one card to place back on top of the deck."
                : gameState.cardChoiceContext.type === 'RUMMAGER' ? "Rummager: Choose a card to take from the discard pile."
                : gameState.cardChoiceContext.type === 'INTERROGATOR_STEAL' ? "Interrogator: Choose one card to steal."
                : "Make a choice."
            }
            onSelectCard={onCardChoice}
        />
      )}
      
      {isHumanTurn && gameState.optionChoices.length > 0 && (
          <OptionChoiceModal 
            prompt={
                gameState.actionState === ActionState.AWAITING_INTERROGATOR_CHOICE ? "Interrogator: Choose an effect to resolve."
                : gameState.actionState === ActionState.AWAITING_MIMIC_CHOICE ? "Mimic: Choose a Base Effect to copy."
                : gameState.actionState === ActionState.AWAITING_SOFT_RESET_DRAW_CHOICE ? "Soft Reset: Choose a source to draw from."
                : "Choose an option."
            }
            options={gameState.optionChoices}
            onSelectOption={onOptionChoice}
          />
      )}

      {isHumanTurn && gameState.actionState === ActionState.AWAITING_SWAP_PEEK_CONFIRMATION && gameState.selectedSwapCardId && (
        <PeekAndSwapModal 
            card={gameState.swapBar.find(c => c?.id === gameState.selectedSwapCardId)!}
            onDecision={onPeekDecision}
        />
      )}

    </main>
  );
};

export default GameBoard;