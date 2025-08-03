import React from 'react';
import { Player } from '../types';
import { WinnerTrophyIcon } from './icons';

interface WinnerModalProps {
  winner: Player;
  winReason: string;
  onResetGame: () => void;
  onAnalyzeGame: () => void;
  canAnalyze: boolean;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ winner, winReason, onResetGame, onAnalyzeGame, canAnalyze }) => {
  const winnerColor = winner.isAI ? 'var(--opponent-glow)' : 'var(--player-glow)';
  const winnerName = winner.name.length > 25 ? `${winner.name.substring(0, 22)}...` : winner.name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-60 animate-fade-in">
      <div className="glassmorphic p-8 md:p-12 rounded-2xl text-center shadow-2xl border-2 w-full max-w-2xl mx-4" style={{ borderColor: winnerColor, boxShadow: `0 0 30px -5px ${winnerColor}`}}>
        
        <WinnerTrophyIcon className="w-24 h-24 mx-auto mb-4" style={{ color: winnerColor, filter: `drop-shadow(0 0 10px ${winnerColor})`}} />

        <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-400 tracking-wider" style={{ textShadow: `0 0 15px ${winnerColor}`}}>
          VICTORY
        </h1>
        <p className="text-2xl mt-2 mb-4 font-semibold" style={{ color: winnerColor }}>
          {winnerName} is the winner!
        </p>

        <p className="text-lg text-[var(--text-secondary)] mb-8">
          {winReason}
        </p>
        
        <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
            <button
              onClick={onResetGame}
              className="w-full text-black font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl text-xl relative overflow-hidden group"
              style={{ 
                background: `linear-gradient(to right, ${winnerColor}, var(--accent-lavender))`,
                boxShadow: `0 8px 25px -5px ${winnerColor}80`
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
              <span className="relative">Play Again</span>
            </button>
            <button
                onClick={onAnalyzeGame}
                disabled={!canAnalyze}
                className="w-full bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600 hover:border-[var(--neutral-glow)] text-white font-bold py-2 px-6 rounded-lg transition-all text-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700/80"
                title={!canAnalyze ? "Analysis is not available for this game mode." : "Get an AI-powered analysis of the game."}
            >
                Analyze Game
            </button>
        </div>

      </div>
    </div>
  );
};

export default WinnerModal;