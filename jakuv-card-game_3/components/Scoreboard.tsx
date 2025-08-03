
import React, { useState, useEffect } from 'react';
import { Player, Card, GameState, ActionState } from '../types';
import { Character } from '../data/characters';
import CardComponent from './Card';
import ScoreDisplay from './ScoreDisplay';
import { CosmoTechSigil } from './icons';

const DialogueBubble: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        setIsTyping(true);
        setDisplayedText('');
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => text.substring(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
                setIsTyping(false);
            }
        }, 40);

        return () => clearInterval(typingInterval);
    }, [text]);

    return (
        <div className="dialogue-bubble animate-fade-in">
            <span>{displayedText}</span>
            {isTyping && <span className="dialogue-bubble-cursor">_</span>}
        </div>
    );
};


interface PlayerInfoPanelProps {
    player: Player;
    score: number;
    isOpponent: boolean;
    isCurrent: boolean;
    activeCharacter: Character | null;
}

const PlayerInfoPanel: React.FC<PlayerInfoPanelProps> = ({ player, score, isOpponent, isCurrent, activeCharacter }) => {
    const glowColor = isOpponent ? 'var(--opponent-glow)' : 'var(--player-glow)';
    const name = player.name.length > 20 ? `${player.name.substring(0, 18)}...` : player.name;
    const details = activeCharacter && isOpponent ? activeCharacter.gameplayProfile.role || 'Strategic Player' : 'Strategic Player';
    const playerImage = isOpponent ? (activeCharacter ? activeCharacter.image : `https://i.pravatar.cc/150?u=${player.id}`) : 'https://jakov.neocities.org/characters/player-avatar.png';
    const scoreId = isOpponent ? 'opponent-score' : 'player-score';

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <ScoreDisplay score={score} isOpponent={isOpponent} scoreId={scoreId} />
            </div>
            <div className="flex items-center gap-3 text-center -mt-2">
                <img 
                    src={playerImage || 'https://i.pravatar.cc/150?u=default'}
                    alt={player.name}
                    className={`w-10 h-10 rounded-full object-cover border-2 transition-all duration-300 ${isCurrent ? 'border-[var(--warning-glow)]' : `border-[${glowColor}]/50`}`}
                    style={{ boxShadow: isCurrent ? `0 0 10px var(--warning-glow)` : `0 0 8px ${glowColor}50` }}
                />
                <div>
                    <h3 className="text-lg font-bold" style={{ color: glowColor }}>{name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] italic">{details}</p>
                </div>
            </div>
        </div>
    );
};

interface HandPanelProps {
    player: Player;
    isOpponent: boolean;
    onCardClick: (card: Card, owner: Player, location: 'hand') => void;
    onCardHover: (card: Card | null) => void;
    gameState: GameState;
    isPlayerTurn?: boolean;
}

const HandPanel: React.FC<HandPanelProps> = ({ player, isOpponent, onCardClick, onCardHover, gameState, isPlayerTurn }) => {
    const { actionState, selectedCardId, selectedCardIds, turn } = gameState;
    const isEndTurnDiscard = !isOpponent && actionState === ActionState.AWAITING_END_TURN_DISCARD;
    const shouldRevealHand = isOpponent && player.handRevealedUntilTurn >= turn && turn > 0;
    const handPanelId = isOpponent ? 'opponent-hand-grid' : 'player-hand-grid';

    if (isOpponent) {
        return (
            <div className="w-full">
                <h4 className="font-bold text-sm mb-1 text-[var(--text-dark)] uppercase tracking-wider text-center">Hand ({player.hand.length})</h4>
                <div id={handPanelId} className="relative flex justify-center items-end h-[110px] my-2">
                    {player.hand.map((card, index) => {
                        const totalCards = player.hand.length;
                        const cardIsRevealed = shouldRevealHand && card.isFaceUp;
                        const spread = totalCards > 1 ? Math.min(32, 120 / totalCards) : 0;
                        const rotation = (index - (totalCards - 1) / 2) * 8;
                        const translateX = (index - (totalCards - 1) / 2) * spread;
                        const translateY = Math.abs(index - (totalCards - 1) / 2) * 4;

                        return (
                            <div
                                key={card.id}
                                className={`absolute transition-transform duration-300 ${cardIsRevealed ? 'group' : ''}`}
                                style={{
                                    transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg)`,
                                    zIndex: index,
                                }}
                            >
                                <CardComponent
                                    card={{...card, isFaceUp: shouldRevealHand }}
                                    size="small"
                                    className={`!w-20 transition-all duration-200 ${cardIsRevealed ? 'group-hover:z-20 group-hover:scale-110 group-hover:-translate-y-2' : ''}`}
                                    onHover={onCardHover}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const containerClasses = `${isEndTurnDiscard ? 'ring-2 ring-[var(--accent-red)] rounded-lg p-2 animate-pulse' : ''} ${isPlayerTurn ? 'is-active-hand' : ''}`;
    
    // Two-row fanned layout for the human player's hand
    return (
        <div className="w-full flex-grow flex flex-col justify-end">
            <h4 className="font-bold text-sm mb-1 text-[var(--text-dark)] uppercase tracking-wider text-center">Your Hand ({player.hand.length})</h4>
            <div id={handPanelId} className={`relative flex justify-center items-end min-h-[220px] transition-all duration-300 ${containerClasses}`}>
                {player.hand.map((card, index) => {
                    const isSecondRow = index >= 5;
                    const cardsInRow = isSecondRow ? player.hand.length - 5 : Math.min(player.hand.length, 5);
                    const indexInRow = isSecondRow ? index - 5 : index;

                    if (cardsInRow === 0) return null;

                    const step = 45; 
                    const totalFanWidth = (cardsInRow - 1) * step;
                    
                    const xPos = (indexInRow * step) - (totalFanWidth / 2);
                    const yPosArc = Math.sin((cardsInRow > 1 ? indexInRow / (cardsInRow - 1) : 0.5) * Math.PI) * -15;
                    const rotation = (indexInRow - (cardsInRow - 1) / 2) * (cardsInRow > 1 ? 6 : 0);

                    const yOffset = isSecondRow ? -80 : 0;

                    return (
                        <div
                            key={card.id}
                            className="card-wrapper"
                            style={{
                                transform: `translateX(${xPos}px) translateY(${yPosArc + yOffset}px) rotate(${rotation}deg) scale(0.95)`,
                                zIndex: index,
                             }}
                        >
                            <CardComponent
                                card={{...card, isFaceUp: true}}
                                onClick={() => onCardClick(card, player, 'hand')}
                                onHover={onCardHover}
                                isSelected={!isEndTurnDiscard && selectedCardId === card.id}
                                isDiscardSelection={isEndTurnDiscard && selectedCardIds.includes(card.id)}
                                isTargetable={isEndTurnDiscard}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface ScoreboardProps {
    player: Player;
    opponent: Player;
    playerScore: number;
    opponentScore: number;
    gameState: GameState;
    onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
    onCardHover: (card: Card | null) => void;
    activeCharacter: Character | null;
    activeDialogue: string | null;
}

const Scoreboard: React.FC<ScoreboardProps> = (props) => {
    const { player, opponent, playerScore, opponentScore, gameState, onCardClick, onCardHover, activeCharacter, activeDialogue } = props;
    const isPlayerTurn = gameState.players[gameState.currentPlayerIndex].id === player.id;

    return (
        <div id="left-sidebar" className="glassmorphic p-4 rounded-xl flex flex-col w-96 justify-between flex-shrink-0 h-full">
            <div id="opponent-info-panel" className="relative flex flex-col items-center gap-4">
                <PlayerInfoPanel
                    player={opponent}
                    score={opponentScore}
                    isOpponent={true}
                    isCurrent={!isPlayerTurn}
                    activeCharacter={activeCharacter}
                />
                <HandPanel
                    player={opponent}
                    isOpponent={true}
                    onCardClick={() => {}} // Opponent hand not clickable
                    onCardHover={onCardHover}
                    gameState={gameState}
                />
                {activeDialogue && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm z-20">
                    <DialogueBubble text={activeDialogue} />
                  </div>
                )}
            </div>
            
            <div className="w-full flex items-center justify-center my-2 flex-shrink-0">
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-[var(--neutral-glow)] to-transparent opacity-50" />
                <CosmoTechSigil className="w-6 h-6 text-[var(--neutral-glow)] opacity-50 mx-4 flex-shrink-0" />
                <div className="flex-grow h-px bg-gradient-to-l from-transparent via-[var(--neutral-glow)] to-transparent opacity-50" />
            </div>

            <div id="player-info-panel" className="flex flex-col items-center gap-4">
                 <PlayerInfoPanel
                    player={player}
                    score={playerScore}
                    isOpponent={false}
                    isCurrent={isPlayerTurn}
                    activeCharacter={null}
                />
                <HandPanel
                    player={player}
                    isOpponent={false}
                    onCardClick={(card, owner) => onCardClick(card, owner, 'hand')}
                    onCardHover={onCardHover}
                    gameState={gameState}
                    isPlayerTurn={isPlayerTurn}
                />
            </div>
        </div>
    );
};

export default Scoreboard;
