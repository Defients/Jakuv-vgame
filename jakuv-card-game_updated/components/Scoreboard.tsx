import React, { useState, useEffect } from 'react';
import { Player, Card, GameState, ActionState } from '../types';
import { Character } from '../data/characters';
import CardComponent from './Card';
import ScoreDisplay from './ScoreDisplay';

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
    const { actionState, selectedCardId, turn } = gameState;
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
                        const spread = totalCards > 1 ? Math.min(28, 90 / totalCards) : 0;
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
                                    className={`!w-16 transition-all duration-200 ${cardIsRevealed ? 'group-hover:z-20 group-hover:scale-110 group-hover:-translate-y-2' : ''}`}
                                    onHover={onCardHover}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const containerClasses = `${isEndTurnDiscard ? 'ring-2 ring-[var(--warning-glow)] rounded-lg' : ''} ${isPlayerTurn ? 'is-active-hand' : ''}`;

    // Fanned layout for the human player's hand
    return (
        <div className="w-full flex-grow flex flex-col justify-end">
            <h4 className="font-bold text-sm mb-1 text-[var(--text-dark)] uppercase tracking-wider text-center">Your Hand ({player.hand.length})</h4>
            <div id={handPanelId} className={`relative flex justify-center items-end min-h-[220px] transition-all duration-300 ${containerClasses}`}>
                {player.hand.map((card, index) => {
                    const totalCards = player.hand.length;
                    const cardRenderWidth = 112; // w-28
                    const handMaxWidth = 380; // Max width of the hand area in pixels
                    
                    let overlap = 45;
                    if (totalCards > 1) {
                       const totalCardWidth = totalCards * cardRenderWidth;
                       if(totalCardWidth > handMaxWidth) {
                           overlap = (totalCardWidth - handMaxWidth) / (totalCards - 1);
                       } else {
                           overlap = -((handMaxWidth - totalCardWidth) / (totalCards - 1));
                       }
                       overlap = Math.max(-15, Math.min(95, overlap));
                    }

                    const step = cardRenderWidth - overlap;
                    const totalFanWidth = (totalCards - 1) * step;
                    
                    const xPos = (index * step) - (totalFanWidth / 2);
                    const yPosArc = Math.sin((index / (totalCards - 1)) * Math.PI) * -40;
                    const rotation = (index - (totalCards - 1) / 2) * (totalCards > 1 ? 8 : 0);

                    return (
                        <div
                            key={card.id}
                            className="card-wrapper"
                            style={{
                                transform: `translateX(${xPos}px) translateY(${yPosArc}px) rotate(${rotation}deg)`,
                                zIndex: index,
                             }}
                        >
                            <CardComponent
                                card={{...card, isFaceUp: true}}
                                onClick={() => onCardClick(card, player, 'hand')}
                                onHover={onCardHover}
                                isSelected={selectedCardId === card.id}
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
        <div id="left-sidebar" className="glassmorphic p-4 rounded-xl flex flex-col w-96 justify-around flex-shrink-0 h-full">
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