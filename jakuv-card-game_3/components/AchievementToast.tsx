
import React, { useState, useEffect } from 'react';
import { Achievement } from '../types';
import { TrophyIcon } from './icons';

interface AchievementToastProps {
  achievement: Achievement | null;
  onDone: () => void;
}

const TIER_COLORS: Record<Achievement['tier'], { bg: string; text: string; shadow: string }> = {
  bronze: { bg: '#A97142', text: '#F0E8FF', shadow: 'rgba(169, 113, 66, 0.6)' },
  silver: { bg: '#A8A8A8', text: '#100828', shadow: 'rgba(168, 168, 168, 0.6)' },
  gold: { bg: '#FFD700', text: '#100828', shadow: 'rgba(255, 215, 0, 0.7)' },
  platinum: { bg: '#00f2ff', text: '#100828', shadow: 'rgba(0, 242, 255, 0.7)' },
};

const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDone }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDone, 500); // Wait for animation to finish before calling onDone
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onDone]);

  if (!achievement) {
    return null;
  }

  const tierColor = TIER_COLORS[achievement.tier];

  return (
    <div
      className={`fixed top-5 right-5 z-[100] transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className="glassmorphic flex items-center gap-4 p-4 rounded-xl border-2"
        style={{
          borderColor: tierColor.bg,
          boxShadow: `0 0 20px ${tierColor.shadow}`,
        }}
      >
        <TrophyIcon
          className="w-12 h-12 flex-shrink-0"
          style={{ color: tierColor.bg, filter: `drop-shadow(0 0 8px ${tierColor.shadow})` }}
        />
        <div className="text-left">
          <p className="font-bold text-xs uppercase" style={{ color: tierColor.bg }}>
            Achievement Unlocked
          </p>
          <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
        </div>
      </div>
    </div>
  );
};

export default AchievementToast;
