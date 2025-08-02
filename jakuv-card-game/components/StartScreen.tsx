
import React from 'react';
import { CosmoTechSigil } from './icons';

interface StartScreenProps {
  onStartNewGame: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartNewGame }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-[var(--text-primary)]">
      <div className="text-center p-8 rounded-2xl glassmorphic max-w-2xl animate-fade-in">
        <div className="flex items-center justify-center gap-6 mb-4 animate-[float_4s_ease-in-out_infinite]">
            <CosmoTechSigil className="w-20 h-20 text-[var(--opponent-glow)]" style={{ filter: 'drop-shadow(0 0 8px var(--opponent-glow))' }} />
            <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-400 tracking-wider" style={{ textShadow: "0 0 25px var(--text-light)"}}>Jakuv</h1>
            <CosmoTechSigil className="w-20 h-20 text-[var(--player-glow)]" style={{ filter: 'drop-shadow(0 0 8px var(--player-glow))' }} />
        </div>
        <p className="text-xl text-[var(--text-dark)] mb-12">A strategic 1v1 card game of points and power.</p>
        <button
          onClick={onStartNewGame}
          className="bg-gradient-to-r from-[var(--player-glow)] to-[var(--opponent-glow)] text-black font-bold py-4 px-10 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl shadow-[var(--player-glow)]/30 hover:shadow-[var(--opponent-glow)]/50 text-2xl relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
          <span className="relative">Initiate Game Sequence</span>
        </button>
      </div>
    </div>
  );
};

export default StartScreen;