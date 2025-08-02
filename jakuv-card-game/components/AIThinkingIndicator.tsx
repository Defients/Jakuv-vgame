import React from 'react';
import { GlowingOrb } from './icons';

const AIThinkingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <GlowingOrb className="w-16 h-16 text-[var(--opponent-glow)] animate-pulse" />
      <p className="text-lg italic text-[var(--text-dark)]">AI is thinking...</p>
    </div>
  );
};

export default AIThinkingIndicator;