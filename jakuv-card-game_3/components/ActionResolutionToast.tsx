
import React, { useEffect, useState } from 'react';
import { WinnerTrophyIcon, EffectIcon } from './icons';

interface ActionResolutionToastProps {
  resolution: { text: string; success: boolean } | null;
}

const ActionResolutionToast: React.FC<ActionResolutionToastProps> = ({ resolution }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (resolution) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 1300); // Must be shorter than the reset timer in App.tsx
            return () => clearTimeout(timer);
        }
    }, [resolution]);

    if (!resolution) return null;

    const { text, success } = resolution;
    const color = success ? 'var(--player-glow)' : 'var(--opponent-glow)';
    const Icon = success ? WinnerTrophyIcon : EffectIcon;

    return (
        <div 
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 pointer-events-none ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
            <div 
                className="glassmorphic py-4 px-8 rounded-xl flex items-center gap-4 border-2"
                style={{
                    borderColor: color,
                    boxShadow: `0 0 20px ${color}`
                }}
            >
                <Icon className="w-10 h-10" style={{ color }} />
                <span className="text-3xl font-bold text-white tracking-wider" style={{ textShadow: `0 0 8px ${color}` }}>
                    {text}
                </span>
            </div>
        </div>
    );
};

export default ActionResolutionToast;
