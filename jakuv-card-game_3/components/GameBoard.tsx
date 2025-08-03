




import React from 'react';
import { GameState, Player, Card, ActionState, GamePhase, Rank, GameSettings } from '../types';
import { Character } from '../data/characters';
import GameLog from './GameLog';
import CardChoiceModal from './CardChoiceModal';
import OptionChoiceModal from './OptionChoiceModal';
import TutorialGuide from './TutorialGuide';
import ActionPanel from './ActionPanel';
import Scoreboard from './Scoreboard';
import BoardRowsDisplay from './BoardRowsDisplay';
import CentralNexus from './CentralNexus';
import AIThinkingIndicator from './AIThinkingIndicator';

interface GameBoardProps {
  gameState: GameState;
  player: Player | undefined;
  opponent: Player | undefined;
  playerScore: number;
  opponentScore: number;
  onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
  onCardHover: (card: Card | null) => void;
  onCardChoice: (cardId: string) => void;
  onOptionChoice: (value: string) => void;
  onDrawCard: () => void;
  onAction: (action: 'playScore' | 'playRoyalty' | 'scuttle' | 'playForEffect' | 'royalMarriage' | 'surpriseSwap' | 'placeEffectScore' | 'placeEffectRoyalty') => void;
  onPass: () => void;
  onPlayCounter: (cardId: string) => void;
  onConfirmDiscard: () => void;
  onConfirmSoftResetDiscard: (cardIds: string[]) => void;
  onStartNewGame: () => void;
  onStartTutorial: (chapterIndex: number) => void;
  onStartCampaign: () => void;
  onToggleLogVisibility: (logId: string) => void;
  onResetGame: () => void;
  onMainMenu: () => void;
  onTutorialNext: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenAchievements: () => void;
  settings: GameSettings;
  isModalOpen: boolean;
  activeRule: { rank: Rank; rule: React.ReactNode } | null;
  activeCharacter: Character | null;
  activeDialogue: string | null;
}


const GameBoard: React.FC<GameBoardProps> = (props) => {
  const { 
      gameState, player, opponent, playerScore, opponentScore, settings,
      onCardClick, onCardHover, onCardChoice, onOptionChoice, onDrawCard, onAction,
      onPass, onPlayCounter, onConfirmDiscard, onConfirmSoftResetDiscard, onStartNewGame, onStartTutorial, onStartCampaign,
      onToggleLogVisibility, onResetGame, onMainMenu, onTutorialNext,
      onOpenSettings, onOpenProfile, onOpenAchievements, isModalOpen,
      activeRule, activeCharacter, activeDialogue
  } = props;
  

  if (!player || !opponent) {
    return <div className="flex items-center justify-center min-h-screen">Initializing Board...</div>;
  }
  
  const isHumanTurn = gameState.players[gameState.currentPlayerIndex].id === player.id && !player.isAI;
  
  return (
    <main className="h-screen max-h-screen p-4 flex flex-row gap-4 overflow-hidden">
        {/* Left Sidebar */}
        <Scoreboard 
            player={player}
            opponent={opponent}
            playerScore={playerScore}
            opponentScore={opponentScore}
            gameState={gameState}
            onCardClick={onCardClick}
            onCardHover={onCardHover}
            activeCharacter={activeCharacter}
            activeDialogue={activeDialogue}
        />

        {/* Central Game Area */}
        <div className="flex-grow flex flex-col justify-center gap-4 min-w-0 relative">
            <h1 className="text-center font-bold text-5xl tracking-[0.2em] text-[var(--text-secondary)] opacity-40 uppercase -mb-2">Jakuv</h1>
            <BoardRowsDisplay
                player={opponent}
                isCurrentPlayer={!isHumanTurn}
                isOpponent={true}
                onCardClick={onCardClick}
                onCardHover={onCardHover}
                gameState={gameState}
            />

            <CentralNexus 
              gameState={gameState}
              player={player}
              onCardClick={onCardClick}
              onCardHover={onCardHover}
              onDrawCard={onDrawCard}
              isModalOpen={isModalOpen}
            />

            <BoardRowsDisplay
                player={player}
                isCurrentPlayer={isHumanTurn}
                isOpponent={false}
                onCardClick={onCardClick}
                onCardHover={onCardHover}
                gameState={gameState}
            />

            {gameState.phase === GamePhase.AI_THINKING && !gameState.actionContext && (
                <AIThinkingIndicator character={activeCharacter} playerName={opponent.name} />
            )}
        </div>

      {/* Right Sidebar */}
      <div id="right-sidebar" className="flex flex-col gap-4 w-[448px] flex-shrink-0 h-full">
        <ActionPanel 
            gameState={gameState}
            player={player}
            playerScore={playerScore}
            onAction={onAction}
            onDrawCard={onDrawCard}
            onPass={onPass}
            onConfirmDiscard={onConfirmDiscard}
            onConfirmSoftResetDiscard={onConfirmSoftResetDiscard}
            activeRule={activeRule}
            onCardHover={onCardHover}
            settings={settings}
        />
        <GameLog 
          messages={gameState.log} 
          onToggleVisibility={onToggleLogVisibility} 
          onResetGame={onResetGame} 
          onMainMenu={onMainMenu}
          playerNames={[player.name, opponent.name]}
          onOpenSettings={onOpenSettings}
          onOpenProfile={onOpenProfile}
          onOpenAchievements={onOpenAchievements}
        />
      </div>


      {/* Modals & Overlays */}
      {isHumanTurn && gameState.cardChoices.length > 0 && gameState.cardChoiceContext && (
        <CardChoiceModal
            cards={gameState.cardChoices}
            prompt={"Make a choice"}
            onSelectCard={onCardChoice}
        />
      )}
      
      {isHumanTurn && gameState.optionChoices.length > 0 && (
          <OptionChoiceModal 
            prompt={"Choose an option"}
            options={gameState.optionChoices}
            onSelectOption={onOptionChoice}
          />
      )}

      {gameState.phase === GamePhase.TUTORIAL && gameState.tutorial && (
          <TutorialGuide tutorialState={gameState.tutorial} onNext={onTutorialNext} />
      )}

    </main>
  );
};

export default GameBoard;