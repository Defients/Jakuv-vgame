import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { PlayCardIcon, ScuttleIcon, DrawCardIcon, EffectIcon, SwapIcon, SystemIcon, WinnerTrophyIcon, InfoIcon, CounterIcon, WarningIcon, LockIcon, UnlockIcon, SettingsIcon, UserIcon, RestartIcon, HomeIcon } from './icons';

interface GameLogProps {
  messages: LogEntry[];
  onToggleVisibility: (logId: string) => void;
  onResetGame: () => void;
  onMainMenu: () => void;
  playerNames: string[];
}

const ICONS: Record<string, React.ReactNode> = {
  play: <PlayCardIcon className="w-4 h-4" />,
  scuttle: <ScuttleIcon className="w-4 h-4" />,
  draw: <DrawCardIcon className="w-4 h-4" />,
  effect: <EffectIcon className="w-4 h-4" />,
  swap: <SwapIcon className="w-4 h-4" />,
  system: <SystemIcon className="w-4 h-4" />,
  win: <WinnerTrophyIcon className="w-4 h-4" />,
  info: <InfoIcon className="w-4 h-4" />,
  counter: <CounterIcon className="w-4 h-4" />,
  warning: <WarningIcon className="w-4 h-4" />,
};

const MicroMenuButton: React.FC<{ children: React.ReactNode; title: string; onClick?: () => void }> = ({ children, title, onClick }) => (
    <button onClick={onClick} title={title} className="p-2 rounded-md transition-colors bg-slate-800/60 hover:bg-slate-700/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-slate-700 hover:border-[var(--neutral-glow)]">
        {children}
    </button>
);

const GameLog: React.FC<GameLogProps> = ({ messages, onToggleVisibility, onResetGame, onMainMenu, playerNames }) => {
  const [isScrollLocked, setIsScrollLocked] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScrollLocked && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [messages, isScrollLocked]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      const isAtTop = scrollTop < 5;
      if (!isAtTop && isScrollLocked) {
        setIsScrollLocked(false);
      } else if (isAtTop && !isScrollLocked) {
        setIsScrollLocked(true);
      }
    }
  };

  const getMessageStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'player':
        return 'text-[var(--player-glow)]';
      case 'ai':
        return 'text-[var(--opponent-glow)]';
      case 'ai-reasoning':
        return 'text-[var(--text-dark)] italic';
      case 'error':
        return 'text-[var(--accent-red)]';
      case 'system':
      default:
        return 'text-[var(--text-light)]';
    }
  };
  
  const parseMessage = (msg: LogEntry) => {
    if(msg.type !== 'player' && msg.type !== 'ai') {
        return msg.message;
    }
    
    for (const name of playerNames) {
        if (msg.message.startsWith(name)) {
            const actionText = msg.message.substring(name.length);
            return (
                <>
                    <span className="font-bold">{name}</span>
                    <span>{actionText}</span>
                </>
            );
        }
    }
    return msg.message;
  }


  return (
    <div className="glassmorphic p-4 rounded-xl flex flex-col min-h-0 h-[45%] flex-shrink-0 bg-[rgba(16,8,40,0.65)]">
       <div className="flex justify-between items-center flex-shrink-0 border-b-2 border-[var(--neutral-glow)]/20 pb-2 mb-4">
        <h3 className="text-xl font-bold text-[var(--text-light)]">Game Log</h3>
        <button 
          onClick={() => setIsScrollLocked(!isScrollLocked)}
          title={isScrollLocked ? "Auto-scroll to top is enabled" : "Auto-scroll is disabled. Click to re-enable."}
          className={`p-1.5 rounded-md transition-all duration-200 ${isScrollLocked ? 'bg-[var(--player-glow)]/80 text-black shadow-md shadow-[var(--player-glow)]/30' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
        >
          {isScrollLocked ? <LockIcon className="w-5 h-5" /> : <UnlockIcon className="w-5 h-5" />}
        </button>
      </div>
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {messages.map((msg) => {
          if (msg.type === 'ai-reasoning' && !msg.isRevealed) {
            return (
                <div
                    key={msg.id}
                    className="flex items-start gap-2 text-sm text-slate-500 italic cursor-pointer hover:text-slate-400 py-1"
                    onClick={() => onToggleVisibility(msg.id)}
                >
                    <span className="flex-shrink-0 pt-0.5">
                        <InfoIcon className="w-4 h-4" />
                    </span>
                    <span>[AI Reasoning - Click to reveal]</span>
                </div>
            );
          }
          return (
            <div key={msg.id} className={`flex items-start gap-2 text-sm ${getMessageStyle(msg.type)} py-1`}>
              <span className="flex-shrink-0 pt-0.5" title={msg.icon}>{msg.icon && ICONS[msg.icon]}</span>
              <span className="leading-relaxed">{parseMessage(msg)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 -mx-4 -mb-4 p-3 border-t-2 border-[var(--neutral-glow)]/20 bg-black/30 rounded-b-xl flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
              <MicroMenuButton title="Restart Game" onClick={onResetGame}><RestartIcon className="w-5 h-5" /></MicroMenuButton>
              <MicroMenuButton title="Main Menu" onClick={onMainMenu}><HomeIcon className="w-5 h-5" /></MicroMenuButton>
              <MicroMenuButton title="Settings"><SettingsIcon className="w-5 h-5" /></MicroMenuButton>
              <MicroMenuButton title="Profile"><UserIcon className="w-5 h-5" /></MicroMenuButton>
          </div>
      </div>
    </div>
  );
};

export default GameLog;
