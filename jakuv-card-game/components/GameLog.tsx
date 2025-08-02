



import React from 'react';
import { LogEntry } from '../types';

interface GameLogProps {
  messages: LogEntry[];
  onToggleVisibility: (logId: string) => void;
}

const GameLog: React.FC<GameLogProps> = ({ messages, onToggleVisibility }) => {

  const getMessageStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'player':
        return 'text-[var(--player-glow)]';
      case 'ai':
        return 'text-[var(--opponent-glow)]';
      case 'ai-reasoning':
        return 'text-[var(--text-dark)] italic';
      case 'error':
        return 'text-[var(--warning-glow)]';
      case 'system':
      default:
        return 'text-[var(--text-light)]';
    }
  };


  return (
    <div className="glassmorphic p-4 rounded-xl flex-grow flex flex-col">
      <h3 className="text-xl font-bold mb-4 text-[var(--text-light)] flex-shrink-0 border-b-2 border-[var(--neutral-glow)]/20 pb-2">Game Log</h3>
      <div className="flex-grow overflow-y-auto space-y-2 pr-2">
        {messages.map((msg) => {
          if (msg.type === 'ai-reasoning' && !msg.isRevealed) {
            return (
              <p
                key={msg.id}
                className="text-sm text-slate-500 italic cursor-pointer hover:text-slate-400"
                onClick={() => onToggleVisibility(msg.id)}
              >
                [AI Reasoning - Click to reveal]
              </p>
            );
          }
          return (
            <p key={msg.id} className={`text-sm ${getMessageStyle(msg.type)}`}>
              {msg.message}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default GameLog;