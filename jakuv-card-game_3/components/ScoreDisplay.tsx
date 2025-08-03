import React from 'react';
import { WINNING_SCORE } from '../constants';

interface ScoreDisplayProps {
  score: number;
  isOpponent: boolean;
  scoreId: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, isOpponent, scoreId }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, WINNING_SCORE) / WINNING_SCORE;
  const offset = circumference * (1 - progress);

  let scoreColorClass = 'text-[var(--accent-cyan)]';
  let ringColorClass = 'stroke-[var(--accent-cyan)]';
  let animationClass = '';
  let glowFilterId = isOpponent ? 'opponentScoreGlow' : 'playerScoreGlow';
  let glowColor = isOpponent ? 'var(--opponent-glow)' : 'var(--player-glow)';

  if (score > WINNING_SCORE) {
    scoreColorClass = 'text-[var(--accent-red)]';
    ringColorClass = 'stroke-[var(--accent-red)]';
    animationClass = 'animate-red-strobe';
    glowColor = 'var(--accent-red)';
  } else if (score === WINNING_SCORE) {
    scoreColorClass = 'text-yellow-300';
    ringColorClass = 'stroke-yellow-300';
    animationClass = 'animate-gold-pulse';
    glowColor = '#fde047'; // Corresponds to Tailwind's yellow-300
  } else if (score >= 16) {
    scoreColorClass = 'text-[var(--accent-warning)]';
    ringColorClass = 'stroke-[var(--accent-warning)]';
    glowColor = 'var(--accent-warning)';
  }

  const scoreFlashKey = `${scoreId}-${score}`;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      {score > WINNING_SCORE && (
        <div 
          className="absolute -top-2 z-20 bg-[var(--accent-red)] text-white text-xs font-bold uppercase px-3 py-1 rounded-full shadow-lg"
          style={{
            animation: 'overcharged-badge-pulse 1s infinite ease-in-out',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            boxShadow: '0 0 10px var(--accent-red)'
          }}
        >
          Overcharged!
        </div>
      )}
      <svg className="absolute w-full h-full" viewBox="0 0 120 120">
        <defs>
          <filter id={glowFilterId}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background Circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(156, 136, 255, 0.15)"
          strokeWidth="10"
        />
        {/* Progress Ring */}
        <circle
          className={`transition-all duration-500 ${ringColorClass}`}
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ filter: `url(#${glowFilterId})` }}
        />
      </svg>
      <span
        id={scoreId}
        key={scoreFlashKey}
        className={`text-7xl font-mono font-bold z-10 animate-score-flash ${scoreColorClass} ${animationClass}`}
        style={{ textShadow: `0 0 15px ${glowColor}, 0 0 5px ${glowColor}` }}
      >
        {score}
      </span>
    </div>
  );
};

export default ScoreDisplay;