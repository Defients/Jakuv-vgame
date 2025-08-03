

import React from 'react';
import { GameSettings, GameTheme } from '../types';
import { HomeIcon } from './icons'; // Using HomeIcon as a close icon example

interface SettingsModalProps {
  settings: GameSettings;
  onClose: () => void;
  onSettingsChange: (newSettings: GameSettings) => void;
}

const THEMES: { id: GameTheme, name: string }[] = [
    { id: 'cosmotech', name: 'CosmoTech' },
    { id: 'crimson', name: 'Crimson Core' },
    { id: 'veridian', name: 'Veridian Matrix' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSettingsChange }) => {

  const handleAnimationSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, animationSpeed: e.target.value as GameSettings['animationSpeed'] });
  };

  const handleAIReasoningChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, alwaysShowAIReasoning: e.target.checked });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-60 animate-fade-in">
      <div className="glassmorphic p-8 rounded-2xl shadow-2xl border-2 border-[var(--neutral-glow)] w-full max-w-md mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <h2 className="text-3xl font-bold mb-6 text-center text-[var(--accent-lavender)]" style={{textShadow: `0 0 6px var(--accent-lavender)`}}>
          Game Settings
        </h2>

        <div className="space-y-6">
           {/* AI Provider Setting */}
          <div>
            <label className="block text-lg font-semibold text-[var(--text-primary)] mb-2">AI Provider</label>
            <div className="flex justify-between items-center gap-2 bg-black/30 p-2 rounded-lg">
              {(['gemini', 'local'] as const).map(provider => (
                <button
                  key={provider}
                  onClick={() => onSettingsChange({ ...settings, aiProvider: provider })}
                  className={`w-full py-2 rounded-md font-bold transition-all duration-200 text-sm ${settings.aiProvider === provider 
                    ? 'bg-[var(--player-glow)] text-black shadow-lg shadow-[var(--player-glow)]/40' 
                    : 'bg-slate-700/80 hover:bg-slate-600/80 text-white'}`}
                >
                  {provider === 'gemini' ? 'Gemini (Advanced)' : 'Local (Basic)'}
                </button>
              ))}
            </div>
             <p className="text-sm text-[var(--text-secondary)] mt-1">"Local" uses simple logic and does not require an internet connection or API calls.</p>
          </div>

          {/* Theme Setting */}
          <div>
            <label className="block text-lg font-semibold text-[var(--text-primary)] mb-2">Theme</label>
            <div className="flex justify-between items-center gap-2 bg-black/30 p-2 rounded-lg">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onSettingsChange({ ...settings, theme: theme.id })}
                  className={`w-full py-2 rounded-md font-bold transition-all duration-200 text-sm ${settings.theme === theme.id 
                    ? 'bg-[var(--player-glow)] text-black shadow-lg shadow-[var(--player-glow)]/40' 
                    : 'bg-slate-700/80 hover:bg-slate-600/80 text-white'}`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Animation Speed Setting */}
          <div>
            <label className="block text-lg font-semibold text-[var(--text-primary)] mb-2">Animation Speed</label>
            <div className="flex justify-between items-center gap-2 bg-black/30 p-2 rounded-lg">
              {(['normal', 'fast', 'instant'] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => onSettingsChange({ ...settings, animationSpeed: speed })}
                  className={`w-full py-2 rounded-md font-bold transition-all duration-200 ${settings.animationSpeed === speed 
                    ? 'bg-[var(--player-glow)] text-black shadow-lg shadow-[var(--player-glow)]/40' 
                    : 'bg-slate-700/80 hover:bg-slate-600/80 text-white'}`}
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Auto-Pass Timer Setting */}
          <div>
            <label className="block text-lg font-semibold text-[var(--text-primary)] mb-2">Auto-Pass Timer</label>
            <div className="flex justify-between items-center gap-2 bg-black/30 p-2 rounded-lg">
              {(['off', '2', '3', '5'] as const).map(delay => (
                <button
                  key={delay}
                  onClick={() => onSettingsChange({ ...settings, autoPassDelay: delay })}
                  className={`w-full py-2 rounded-md font-bold transition-all duration-200 text-sm ${settings.autoPassDelay === delay 
                    ? 'bg-[var(--player-glow)] text-black shadow-lg shadow-[var(--player-glow)]/40' 
                    : 'bg-slate-700/80 hover:bg-slate-600/80 text-white'}`}
                >
                  {delay === 'off' ? 'Off' : `${delay}s`}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Automatically pass your turn in the Counter phase if no action is taken.</p>
          </div>

          {/* AI Reasoning Setting */}
          <div>
            <label className="flex items-center justify-between text-lg font-semibold text-[var(--text-primary)] cursor-pointer">
              <span>Always Show AI Reasoning</span>
              <div className="relative">
                <input 
                  type="checkbox"
                  checked={settings.alwaysShowAIReasoning}
                  onChange={handleAIReasoningChange}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--player-glow)]"></div>
              </div>
            </label>
            <p className="text-sm text-[var(--text-secondary)] mt-1">If enabled, AI reasoning in the log will be visible by default.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;