import React from 'react';
import { CHARACTERS, Character } from '../data/characters';
import { CosmoTechSigil } from './icons';

interface CampaignScreenProps {
  onStartMission: (missionId: string) => void;
  onBack: () => void;
  campaignProgress: string[];
}

const isCompleted = (id: string, progress: string[]) => progress.includes(id);

const isUnlocked = (character: Character, progress:string[]): boolean => {
    if (!character.requires || character.requires.length === 0) {
        return true; // Root nodes are always unlocked
    }

    if (character.requireType === 'OR') {
        // If any of the required missions are completed, it's unlocked
        return character.requires.some(reqId => progress.includes(reqId));
    }
    
    // Default (AND): all required missions must be completed
    return character.requires.every(reqId => progress.includes(reqId));
}

const CheckmarkIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const LockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);


const CharacterNode: React.FC<{ characterId: string, campaignProgress: string[], onSelect: (id: string) => void }> = ({ characterId, campaignProgress, onSelect }) => {
    const character = CHARACTERS[characterId];
    if (!character) return null;

    const completed = isCompleted(character.id, campaignProgress);
    const unlocked = isUnlocked(character, campaignProgress);

    const baseClasses = 'relative w-64 p-3 rounded-lg border-2 transition-all duration-300 flex flex-col justify-center items-center text-center';
    
    let stateClasses = 'border-[var(--neutral-glow)]/30 bg-black/30 text-slate-500 saturate-0';
    if (unlocked) {
        stateClasses = 'border-[var(--accent-cyan)] bg-indigo-950/50 text-white cursor-pointer hover:scale-105 hover:bg-indigo-950/80 hover:shadow-[0_0_15px_var(--accent-cyan)]';
    }
     if (completed) {
        stateClasses = 'border-[var(--warning-glow)] bg-amber-950/50 text-amber-300 cursor-default';
    }
    if(character.isMiniBoss) {
        stateClasses += unlocked && !completed ? ' border-[var(--accent-red)] hover:shadow-[0_0_15px_var(--accent-red)]' : '';
    }
     if(character.isFinalBoss) {
        stateClasses += unlocked && !completed ? ' border-[var(--accent-magenta)] animate-[glow-pulse_2s_infinite]' : '';
        stateClasses = stateClasses.replace('w-64', 'w-72'); // Make boss node bigger
    }


    return (
        <div onClick={() => unlocked && !completed && onSelect(character.id)} className={`${baseClasses} ${stateClasses}`} style={{'--shadow-color': 'var(--accent-magenta)'} as React.CSSProperties}>
             <div className="flex items-center justify-start w-full gap-4">
                {character.image && (
                    <img src={character.image} alt={character.name} className="w-16 h-16 flex-shrink-0 rounded-full object-cover border-2 border-current"/>
                )}
                <div className="flex-grow text-left">
                    <h4 className="font-bold text-lg">{character.name}</h4>
                    <p className="text-xs opacity-70">{character.classification.split('|')[0]}</p>
                </div>
            </div>
            {completed && <CheckmarkIcon className="absolute top-2 right-2 w-5 h-5 text-amber-400" />}
            {!unlocked && <LockIcon className="absolute top-2 right-2 w-5 h-5 text-slate-600" />}
            {character.isMiniBoss && <span className="absolute bottom-1 right-1 text-xs font-bold text-red-400">MINI-BOSS</span>}
        </div>
    );
};

const VerticalLine: React.FC<{height?: string}> = ({height = 'h-8'}) => <div className={`${height} w-px bg-[var(--neutral-glow)]/50 mx-auto`} />;

const Connector: React.FC<{ type: 'fork' | 'merge', width?: string }> = ({ type, width = 'w-64' }) => {
    const horizontalLine = <div className={`flex-grow h-px bg-[var(--neutral-glow)]/50 ${type === 'fork' ? 'mt-px' : 'mb-px'}`}></div>;
    return (
        <div className={`flex justify-between items-center ${width} mx-auto`}>
            {horizontalLine}
            <div className={`h-8 w-px bg-[var(--neutral-glow)]/50 ${type === 'fork' ? 'self-start' : 'self-end'}`}></div>
            {horizontalLine}
        </div>
    );
};

const TierDisplay: React.FC<{title: string, color: string, children: React.ReactNode}> = ({ title, color, children }) => (
    <div className="mb-8">
        <h2 className="text-3xl font-semibold mb-6" style={{ color, textShadow: `0 0 8px ${color}`}}>{title}</h2>
        <div className="flex flex-col items-center gap-2">
            {children}
        </div>
    </div>
);


const CampaignScreen: React.FC<CampaignScreenProps> = ({ onStartMission, onBack, campaignProgress }) => {
    const nodeProps = { campaignProgress, onSelect: onStartMission };
  
    return (
    <div className="flex flex-col items-center min-h-screen text-[var(--text-primary)] p-4">
        <div className="text-center p-8 rounded-2xl glassmorphic max-w-5xl w-full animate-fade-in relative">
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-100 to-slate-400 tracking-wider mb-2" style={{ textShadow: "0 0 25px var(--text-light)"}}>
                Mission Campaign
            </h1>
            <p className="text-lg text-[var(--text-dark)] mb-8">Face a series of unique opponents from the Astril Continuum Universe.</p>

            <button
                onClick={onBack}
                className="absolute top-8 left-8 bg-slate-800/70 border border-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-slate-700/90 hover:border-[var(--opponent-glow)] shadow-md hover:shadow-[var(--opponent-glow)]/20"
                >
                &larr; Back
            </button>

            <div className="border-t border-[var(--neutral-glow)]/20 pt-8 mt-8 overflow-y-auto max-h-[65vh] pr-4 custom-scrollbar">
                
                <TierDisplay title="Tier 1: Tutorial & Early Lore" color="var(--accent-cyan)">
                    <CharacterNode characterId="pos" {...nodeProps} />
                    <VerticalLine />
                    <Connector type="fork" />
                    <div className="flex justify-center gap-16"><CharacterNode characterId="diesel" {...nodeProps} /><CharacterNode characterId="brat" {...nodeProps} /></div>
                    <Connector type="merge" />
                    <CharacterNode characterId="taloff" {...nodeProps} />
                    <VerticalLine />
                    <Connector type="fork" />
                    <div className="flex justify-center gap-16"><CharacterNode characterId="nymira" {...nodeProps} /><CharacterNode characterId="vikadge" {...nodeProps} /></div>
                    <Connector type="merge" />
                    <CharacterNode characterId="nippy_paus" {...nodeProps} />
                </TierDisplay>
                
                <TierDisplay title="Tier 2: Split Paths & Philosophy Clash" color="var(--accent-lavender)">
                    <VerticalLine />
                    <div className="flex justify-center gap-16"><CharacterNode characterId="tyler" {...nodeProps} /><CharacterNode characterId="vircy" {...nodeProps} /></div>
                    <div className="flex justify-center gap-16 w-[450px]"><VerticalLine /><VerticalLine /></div>
                    <div className="flex justify-center gap-16"><CharacterNode characterId="thajal" {...nodeProps} /><CharacterNode characterId="sinira" {...nodeProps} /></div>
                    <Connector type="merge" />
                    <CharacterNode characterId="akamuy_carson" {...nodeProps} />
                    <VerticalLine />
                    <CharacterNode characterId="shiz" {...nodeProps} />
                </TierDisplay>

                <TierDisplay title="Tier 3: Dark Forces Gather" color="var(--warning-glow)">
                    <VerticalLine />
                    <CharacterNode characterId="dr_fyxius" {...nodeProps} />
                    <VerticalLine />
                    <Connector type="fork" />
                    <div className="flex justify-center gap-16"><CharacterNode characterId="priscilla" {...nodeProps} /><CharacterNode characterId="lutz" {...nodeProps} /></div>
                    <Connector type="merge" />
                    <CharacterNode characterId="exactor" {...nodeProps} />
                    <VerticalLine />
                    <CharacterNode characterId="kiox" {...nodeProps} />
                </TierDisplay>

                <TierDisplay title="Tier 4: Legacy Collides" color="var(--accent-red)">
                     <VerticalLine />
                     <CharacterNode characterId="vytal" {...nodeProps} />
                     <VerticalLine />
                     <CharacterNode characterId="lomize" {...nodeProps} />
                     <VerticalLine />
                     <CharacterNode characterId="ymzo" {...nodeProps} />
                     <VerticalLine />
                     <CharacterNode characterId="vyridion" {...nodeProps} />
                </TierDisplay>
                
                <TierDisplay title="Tier 5: Reality Breaks" color="var(--accent-magenta)">
                    <VerticalLine />
                    <CharacterNode characterId="diemzo" {...nodeProps} />
                </TierDisplay>
            </div>
        </div>

    </div>
  );
};

export default CampaignScreen;