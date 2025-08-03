

import React, { useState, useEffect } from 'react';
import { CosmoTechSigil, SettingsIcon } from './icons';

interface StartScreenProps {
  onStartNewGame: () => void;
  onStartTutorial: (chapterIndex: number) => void;
  onStartCampaign: () => void;
  onOpenSettings: () => void;
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


const StartScreen: React.FC<StartScreenProps> = ({ onStartNewGame, onStartTutorial, onStartCampaign, onOpenSettings }) => {
  const [isTutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="start-screen-container animate-fade-in">
        <div className="absolute top-6 right-6 z-10">
             <button
                onClick={onOpenSettings}
                className="p-3 rounded-full transition-colors bg-slate-800/60 hover:bg-slate-700/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-slate-700 hover:border-[var(--neutral-glow)] start-screen-button"
                style={{'--shadow-color': 'var(--neutral-glow)'} as React.CSSProperties}
                title="Settings"
            >
                <SettingsIcon className="w-6 h-6"/>
            </button>
        </div>

      <div className="w-full max-w-xl">
        <div className="start-screen-title-group flex items-center justify-center gap-6 mb-4 cursor-pointer">
            <CosmoTechSigil className="w-20 h-20 text-[var(--opponent-glow)] start-screen-sigil" style={{ '--shadow-color': 'var(--opponent-glow)' } as React.CSSProperties} />
            <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-400 tracking-wider start-screen-title">
                Jakuv
            </h1>
            <CosmoTechSigil className="w-20 h-20 text-[var(--player-glow)] start-screen-sigil" style={{ '--shadow-color': 'var(--player-glow)' } as React.CSSProperties} />
        </div>
        <p className="text-xl text-[var(--text-dark)] mb-10">A strategic 1v1 card game of points and power.</p>
        
        <div className="flex flex-col items-center gap-4">
             <button
                onClick={onStartNewGame}
                className="w-full max-w-sm mx-auto bg-gradient-to-r from-[var(--player-glow)] to-[var(--accent-lavender)] text-black font-bold py-4 px-10 rounded-lg transform shadow-lg text-2xl relative overflow-hidden group start-screen-button animate-button-reveal"
                style={{'--shadow-color': 'var(--player-glow)', animationDelay: '0.1s'} as React.CSSProperties}
                >
                <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
                <span className="relative z-10">Play Game</span>
            </button>
            <button
                onClick={onStartCampaign}
                className="w-full max-w-sm mx-auto bg-gradient-to-r from-[var(--opponent-glow)] to-[var(--accent-red)] text-white font-bold py-3 px-10 rounded-lg transform shadow-lg text-xl relative overflow-hidden group start-screen-button animate-button-reveal"
                style={{'--shadow-color': 'var(--opponent-glow)', animationDelay: '0.2s'} as React.CSSProperties}
                >
                <span className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent transition-transform duration-500 ease-in-out transform -translate-x-full group-hover:translate-x-0"></span>
                <span className="relative z-10">Mission Campaign</span>
            </button>
             <button
                onClick={() => setTutorialOpen(!isTutorialOpen)}
                className="w-full max-w-sm mx-auto bg-slate-800/70 border border-slate-700 text-white font-semibold py-3 px-10 rounded-lg transform shadow-md text-xl start-screen-button animate-button-reveal"
                 style={{'--shadow-color': 'var(--neutral-glow)', animationDelay: '0.3s'} as React.CSSProperties}
            >
                Tutorial {isTutorialOpen ? '▲' : '▼'}
            </button>

            <div className={`tutorial-submenu ${isTutorialOpen ? 'open' : ''} w-full max-w-sm mx-auto mt-2`}>
                <div className="bg-black/20 p-2 rounded-lg border border-[var(--neutral-glow)]/20">
                     <div className="grid grid-cols-1 gap-2">
                       {tutorialChapters.map((title, index) => (
                         <button
                            key={index}
                            onClick={() => onStartTutorial(index)}
                            className="bg-slate-800/70 border border-transparent text-white font-medium py-2 px-4 rounded-md transition-all duration-300 hover:bg-slate-700/90 hover:border-[var(--opponent-glow)] text-base"
                            >
                            {title}
                        </button>
                       ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
