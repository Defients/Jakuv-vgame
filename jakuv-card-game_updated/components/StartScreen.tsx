

import React from 'react';
import { CosmoTechSigil } from './icons';

interface StartScreenProps {
  onStartNewGame: () => void;
  onStartTutorial: (chapterIndex: number) => void;
  onStartCampaign: () => void;
}

const tutorialChapters = [
    "Chapter 1: Welcome to Jakuv",
    "Chapter 2: Your Turn & Basic Actions",
    "Chapter 3: The Royals",
    "Chapter 4: Base Effects Arsenal",
    "Chapter 5: Advanced Tactics",
    "Chapter 6: The Swap Bar",
    "Chapter 7: Paths to Victory",
];


const StartScreen: React.FC<StartScreenProps> = ({ onStartNewGame, onStartTutorial, onStartCampaign }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-[var(--text-primary)]">
      <div className="text-center p-8 rounded-2xl glassmorphic max-w-3xl animate-fade-in">
        <div className="flex items-center justify-center gap-6 mb-4 animate-[float_4s_ease-in-out_infinite]">
            <CosmoTechSigil className="w-20 h-20 text-[var(--opponent-glow)]" style={{ filter: 'drop-shadow(0 0 8px var(--opponent-glow))' }} />
            <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-400 tracking-wider" style={{ textShadow: "0 0 25px var(--text-light)"}}>Jakuv</h1>
            <CosmoTechSigil className="w-20 h-20 text-[var(--player-glow)]" style={{ filter: 'drop-shadow(0 0 8px var(--player-glow))' }} />
        </div>
        <p className="text-xl text-[var(--text-dark)] mb-8">A strategic 1v1 card game of points and power.</p>
        
        <div className="flex flex-col items-center gap-4 mb-8">
            <button
                onClick={onStartNewGame}
                className="w-full max-w-xs mx-auto bg-gradient-to-r from-[var(--player-glow)] to-[var(--accent-lavender)] text-black font-bold py-4 px-10 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl shadow-[var(--player-glow)]/30 hover:shadow-[var(--accent-lavender)]/50 text-2xl relative overflow-hidden group"
                >
                <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
                <span className="relative">Play Game</span>
            </button>
            <button
                onClick={onStartCampaign}
                className="w-full max-w-xs mx-auto bg-gradient-to-r from-[var(--opponent-glow)] to-[var(--accent-red)] text-white font-bold py-3 px-10 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl shadow-[var(--opponent-glow)]/30 hover:shadow-[var(--accent-red)]/50 text-xl relative overflow-hidden group"
                >
                <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
                <span className="relative">Mission Campaign</span>
            </button>
        </div>


        <div className="border-t border-[var(--neutral-glow)]/20 pt-6">
            <h2 className="text-2xl font-semibold text-[var(--neutral-glow)] mb-4">Tutorial Chapters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {tutorialChapters.map((title, index) => (
                 <button
                    key={index}
                    onClick={() => onStartTutorial(index)}
                    className="bg-slate-800/70 border border-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-slate-700/90 hover:border-[var(--opponent-glow)] shadow-md hover:shadow-[var(--opponent-glow)]/20 text-lg"
                    >
                    {title}
                </button>
               ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default StartScreen;