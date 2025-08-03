
import React from 'react';
import { PlayerStats } from '../types';
import { UserIcon } from './icons';

interface ProfileModalProps {
  stats: PlayerStats;
  onClose: () => void;
  onResetStats: () => void;
}

const StatItem: React.FC<{ label: string, value: string | number, colorClass?: string }> = ({ label, value, colorClass = 'text-[var(--text-primary)]'}) => (
    <div className="flex justify-between items-baseline bg-black/20 p-3 rounded-lg">
        <span className="font-semibold text-lg text-[var(--text-secondary)]">{label}</span>
        <span className={`font-bold text-2xl ${colorClass}`} style={{textShadow: '0 0 5px currentColor'}}>{value}</span>
    </div>
);

const ProfileModal: React.FC<ProfileModalProps> = ({ stats, onClose, onResetStats }) => {
    const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) + '%' : 'N/A';
    
    const handleResetClick = () => {
        if (window.confirm('Are you sure you want to reset all your stats and achievements? This action cannot be undone.')) {
            onResetStats();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-60 animate-fade-in">
            <div className="glassmorphic p-8 rounded-2xl shadow-2xl border-2 border-[var(--neutral-glow)] w-full max-w-md mx-4 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col items-center mb-6">
                    <UserIcon className="w-16 h-16 text-[var(--accent-cyan)] mb-2" style={{filter: 'drop-shadow(0 0 8px var(--accent-cyan))'}} />
                    <h2 className="text-3xl font-bold text-center text-[var(--accent-cyan)]">
                        Player Profile
                    </h2>
                </div>

                <div className="space-y-4">
                    <StatItem label="Games Played" value={stats.gamesPlayed} />
                    <StatItem label="Games Won" value={stats.gamesWon} colorClass="text-[var(--player-glow)]" />
                    <StatItem label="Games Lost" value={stats.gamesLost} colorClass="text-[var(--opponent-glow)]" />
                    <StatItem label="Win Rate" value={winRate} colorClass="text-[var(--warning-glow)]" />
                </div>
                
                <button
                  onClick={handleResetClick}
                  className="w-full mt-8 bg-red-800/80 hover:bg-red-700/80 border border-red-700/80 text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md text-lg hover:border-[var(--accent-red)]"
                >
                  Reset All Progress
                </button>
            </div>
        </div>
    );
};

export default ProfileModal;