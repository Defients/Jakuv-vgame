
import React from 'react';
import { Achievement } from '../types';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { TrophyIcon } from './icons';

interface AchievementsModalProps {
  unlockedAchievementIds: string[];
  onClose: () => void;
}

const TIER_CONFIG: Record<Achievement['tier'], { name: string; color: string; }> = {
  bronze: { name: 'Bronze', color: '#A97142' },
  silver: { name: 'Silver', color: '#A8A8A8' },
  gold: { name: 'Gold', color: 'var(--accent-gold)' },
  platinum: { name: 'Platinum', color: 'var(--accent-cyan)' },
};

const AchievementItem: React.FC<{ achievement: Achievement; isUnlocked: boolean }> = ({ achievement, isUnlocked }) => {
  const tierColor = TIER_CONFIG[achievement.tier].color;
  const showSecret = achievement.isSecret && !isUnlocked;

  return (
    <div
      className={`flex items-start gap-4 p-3 rounded-lg transition-all duration-300 ${
        isUnlocked ? 'bg-black/30' : 'bg-black/20 opacity-60'
      }`}
    >
      <TrophyIcon
        className="w-12 h-12 flex-shrink-0 mt-1"
        style={{ color: isUnlocked ? tierColor : '#6b7280', filter: isUnlocked ? `drop-shadow(0 0 5px ${tierColor})` : 'none' }}
      />
      <div className="flex-grow">
        <h4 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
          {showSecret ? '???' : achievement.name}
        </h4>
        <p className="text-sm text-slate-400">
          {showSecret ? achievement.description : achievement.description}
        </p>
      </div>
    </div>
  );
};

const AchievementsModal: React.FC<AchievementsModalProps> = ({ unlockedAchievementIds, onClose }) => {
  const unlockedCount = unlockedAchievementIds.length;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  
  const achievementsByTier = ALL_ACHIEVEMENTS.reduce((acc, ach) => {
    if (!acc[ach.tier]) {
      acc[ach.tier] = [];
    }
    acc[ach.tier].push(ach);
    return acc;
  }, {} as Record<Achievement['tier'], Achievement[]>);

  const tierOrder: Achievement['tier'][] = ['gold', 'silver', 'bronze'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-60 animate-fade-in">
      <div className="glassmorphic p-8 rounded-2xl shadow-2xl border-2 border-[var(--neutral-glow)] w-full max-w-2xl h-[90vh] mx-4 relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors z-10">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-4 flex-shrink-0">
          <h2 className="text-4xl font-bold text-center text-[var(--accent-gold)]" style={{ textShadow: `0 0 8px var(--accent-gold)` }}>
            Achievements
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mt-1">
            {unlockedCount} / {totalCount} Unlocked
          </p>
          <div className="w-full bg-black/30 rounded-full h-2.5 mt-3">
            <div
              className="bg-[var(--accent-gold)] h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 -mr-4 mt-4">
            {tierOrder.map(tier => (
                <div key={tier} className="mb-6">
                    <h3 className="text-2xl font-semibold mb-3" style={{color: TIER_CONFIG[tier].color}}>
                        {TIER_CONFIG[tier].name} Tier
                    </h3>
                    <div className="space-y-3">
                        {achievementsByTier[tier]?.map(ach => (
                            <AchievementItem key={ach.id} achievement={ach} isUnlocked={unlockedAchievementIds.includes(ach.id)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default AchievementsModal;
