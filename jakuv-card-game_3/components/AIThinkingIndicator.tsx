import React from 'react';
import { Character } from '../data/characters';
import { CosmoTechSigil } from './icons';

interface AIThinkingIndicatorProps {
    character: Character | null;
    playerName: string;
}

const AIThinkingIndicator: React.FC<AIThinkingIndicatorProps> = ({ character, playerName }) => {
    const playerImage = character ? character.image : `https://i.pravatar.cc/150?u=${playerName}`;

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg animate-fade-in" style={{ '--shadow-color': 'var(--opponent-glow)' } as React.CSSProperties}>
                <div className="relative glassmorphic p-8 rounded-2xl flex flex-col items-center gap-6 border-2 border-[var(--opponent-glow)]/50 shadow-2xl shadow-[var(--opponent-glow)]/20">
                    {/* Decorative corners */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-[var(--opponent-glow)] rounded-tl-xl animate-[border-glow_2s_infinite_alternate]"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-[var(--opponent-glow)] rounded-tr-xl animate-[border-glow_2s_infinite_alternate]"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-[var(--opponent-glow)] rounded-bl-xl animate-[border-glow_2s_infinite_alternate]"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-[var(--opponent-glow)] rounded-br-xl animate-[border-glow_2s_infinite_alternate]"></div>

                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <CosmoTechSigil className="absolute w-full h-full text-[var(--opponent-glow)] opacity-10 animate-thinking-sigil-spin" style={{ animationDuration: '20s' }} />
                        <CosmoTechSigil className="absolute w-3/4 h-3/4 text-[var(--opponent-glow)] opacity-15 animate-thinking-sigil-spin" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />
                        
                        <img
                            src={playerImage || 'https://i.pravatar.cc/150?u=default'}
                            alt={playerName}
                            className="w-28 h-28 rounded-full object-cover border-4 border-[var(--opponent-glow)] animate-thinking-image-pulse"
                            style={{ boxShadow: `0 0 20px 0px var(--opponent-glow)`}}
                        />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white tracking-wider">
                            {character?.name || playerName}
                        </h2>
                        <p className="text-lg text-[var(--opponent-glow)] font-semibold mt-1 animate-thinking-text-pulse">
                            is thinking...
                        </p>
                    </div>
                    
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="scanline"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIThinkingIndicator;