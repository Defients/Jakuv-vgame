
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Player, Card, ActionState, GamePhase } from '../types';
import CardComponent from './Card';
import { PlayCardIcon, ScuttleIcon, EffectIcon, WinnerTrophyIcon, Shield, DrawCardIcon } from './icons';

const ICONS: Record<string, React.ReactNode> = {
  PLAY_CARD: <PlayCardIcon className="w-5 h-5" />,
  SCUTTLE: <ScuttleIcon className="w-5 h-5" />,
  ROYAL_PLAY: <WinnerTrophyIcon className="w-5 h-5" />,
  BASE_EFFECT: <EffectIcon className="w-5 h-5" />,
  ROYAL_MARRIAGE: <Shield className="w-5 h-5" />,
  COUNTER: <EffectIcon className="w-5 h-5" />,
  RUMMAGER_EFFECT: <EffectIcon className="w-5 h-5" />,
  SECOND_QUEEN_EDICT: <EffectIcon className="w-5 h-5" />,
};

// Local Component for Turn/Phase Indicator
const TurnPhaseIndicator: React.FC<{ gameState: GameState }> = ({ gameState }) => {
    const { players, currentPlayerIndex, phase, actionContext } = gameState;
    const currentPlayer = players[currentPlayerIndex];

    const getPhaseText = () => {
        if (actionContext) return "Counter Phase";
        switch (phase) {
            case GamePhase.PLAYER_TURN: return "Main Phase";
            case GamePhase.AI_THINKING: return "Main Phase";
            case GamePhase.PLAYER1_START: return "Opening Turn";
            case GamePhase.GAME_OVER: return "Game Over";
            default: return "Main Phase";
        }
    };

    const turnText = `${currentPlayer.name}'s Turn`;
    const phaseText = getPhaseText();
    const glowColor = currentPlayer.isAI ? 'var(--opponent-glow)' : 'var(--player-glow)';
    
    return (
        <div 
            className="w-full max-w-sm glassmorphic p-3 rounded-lg text-center border-2 animate-fade-in"
            style={{ borderColor: glowColor, boxShadow: `0 0 12px -2px ${glowColor}` }}
        >
            <h3 className="text-lg font-bold uppercase tracking-widest" style={{ color: glowColor }}>
                {turnText}
            </h3>
            <div className="h-px w-2/3 bg-current opacity-50 my-1 mx-auto" style={{ backgroundColor: glowColor }}/>
            <p className="text-md text-[var(--text-light)] font-semibold">
                {phaseText}
            </p>
        </div>
    );
};

const DrawPile: React.FC<{ count: number, onDraw: () => void, canDraw: boolean }> = ({ count, onDraw, canDraw }) => {
    return (
        <div className="pile-container group" onClick={canDraw ? onDraw : undefined} title={canDraw ? "Draw a card" : "Cannot draw now"}>
             <div className="pile-stack-item shadow-lg transform -translate-x-1.5 -translate-y-1.5 group-hover:-translate-x-2 group-hover:-translate-y-2"></div>
             <div className="pile-stack-item shadow-lg transform -translate-x-1 -translate-y-1 group-hover:-translate-x-1.5 group-hover:-translate-y-1.5"></div>
             <div className="pile-stack-item shadow-lg transform -translate-x-0.5 -translate-y-0.5 group-hover:-translate-x-1 group-hover:-translate-y-1"></div>
             <div className={`pile-stack-item overflow-hidden bg-gradient-to-br from-[#1d113f] to-[#100828] border-2 ${canDraw ? 'border-[var(--neutral-glow)]/40 group-hover:border-[var(--player-glow)]' : 'border-[var(--neutral-glow)]/20'}`}>
                <img src="https://astrilator.com/xtra/jakuv_back-small.png" className="w-full h-full object-cover opacity-80" alt="Card Back"/>
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center">
                    <DrawCardIcon className="w-8 h-8 text-[var(--text-secondary)] mb-1" />
                    <p className="text-xl font-bold uppercase tracking-wider text-[var(--text-light)]">Deck</p>
                    <p className="text-4xl font-mono text-[var(--player-glow)]" style={{textShadow: `0 0 5px var(--player-glow)`}}>{count}</p>
                </div>
            </div>
        </div>
    );
};

const DiscardPile: React.FC<{ cards: Card[], onHover: (card: Card | null) => void }> = ({ cards, onHover }) => {
    const topThree = cards.slice(-3);
    const [lastAnimatedCardId, setLastAnimatedCardId] = useState('');
    const prevCardsRef = useRef<Card[]>([]);

    useEffect(() => {
        if (cards.length > prevCardsRef.current.length) {
            const lastCard = cards[cards.length - 1];
            if (lastCard) {
                setLastAnimatedCardId(lastCard.id);
            }
        }
        prevCardsRef.current = cards;
    }, [cards]);
    
    return (
        <div className="pile-container">
             <div className="absolute inset-0 flex items-center justify-center">
                {topThree.length > 0 ? (
                    topThree.map((card, index) => {
                        const isTop = index === topThree.length - 1;
                        const isJustAdded = isTop && card.id === lastAnimatedCardId;
                        const rotation = (index - (topThree.length -1)) * 5 + 2;
                        return (
                            <div key={card.id} className={`absolute transition-transform duration-200 ${isJustAdded ? 'animate-toss-in' : ''}`} style={{ transform: `rotate(${rotation}deg) translateY(-${(topThree.length - 1 - index) * 4}px)`, zIndex: 10 + index }}>
                                <CardComponent
                                    card={{...card, isFaceUp: true}}
                                    size={isTop ? 'normal' : 'small'}
                                    className={!isTop ? '!w-24 opacity-70' : ''}
                                    onHover={isTop ? onHover : undefined}
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-dark)] empty-discard-pile">
                        <ScuttleIcon className="w-10 h-10" />
                        <p className="mt-2 font-bold text-lg">DISCARD</p>
                    </div>
                )}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded-md text-sm font-semibold text-[var(--text-secondary)]">
                Count: {cards.length}
            </div>
        </div>
    );
};


interface CentralNexusProps {
    gameState: GameState;
    player: Player;
    onCardClick: (card: Card, owner: Player, location: 'hand' | 'scoreRow' | 'royaltyRow' | 'swapBar') => void;
    onCardHover: (card: Card | null) => void;
    onDrawCard: () => void;
    isModalOpen: boolean;
}

const CentralNexus: React.FC<CentralNexusProps> = ({ gameState, player, onCardClick, onCardHover, onDrawCard, isModalOpen }) => {
    const { players, currentPlayerIndex, deck, swapBar, discardPile, swapUsedThisTurn, selectedCardId, actionState, actionContext, phase, turn } = gameState;
    const isPlayerTurn = players[currentPlayerIndex].id === player.id;
    const isSurpriseSwapTargeting = !!selectedCardId && actionState === ActionState.AWAITING_SURPRISE_SWAP_TARGET;

    const canDraw = isPlayerTurn && !swapUsedThisTurn && (phase === GamePhase.PLAYER_TURN || phase === GamePhase.PLAYER1_START) && ![ActionState.AWAITING_SCUTTLE_TARGET, ActionState.AWAITING_SURPRISE_SWAP_TARGET, ActionState.AWAITING_JACK_PLACEMENT].includes(actionState);
    
    const showTurnIndicator = !isModalOpen && phase !== GamePhase.START_SCREEN && phase !== GamePhase.CAMPAIGN_SELECTION && phase !== GamePhase.TUTORIAL;

    return (
        <div className="w-full flex flex-col justify-center items-center gap-4">
            {showTurnIndicator && <TurnPhaseIndicator gameState={gameState} />}

            <div className="w-full flex flex-row items-center justify-around gap-6 p-2">
                <DrawPile count={deck.length} onDraw={onDrawCard} canDraw={canDraw} />

                <div className="flex flex-col items-center gap-2">
                    <h4 className="font-bold text-sm text-[var(--text-dark)] uppercase tracking-wider">Swap Bar</h4>
                    <div id="swap-nexus" className="flex justify-around items-center gap-3 p-1 rounded-lg relative">
                        {swapBar.map((card, index) => {
                            const isClickableFaceUp = card && card.isFaceUp && isPlayerTurn && !swapUsedThisTurn;
                            const isClickableFaceDown = card && !card.isFaceUp && isPlayerTurn && !swapUsedThisTurn && isSurpriseSwapTargeting;

                            return (
                                <div key={card?.id || `swap-${index}`}>
                                <CardComponent
                                        card={card}
                                        size="normal"
                                        onClick={card && (isClickableFaceUp || isClickableFaceDown) ? () => onCardClick(card, player, 'swapBar') : undefined}
                                        onHover={onCardHover}
                                        isTargetable={isClickableFaceDown}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <DiscardPile cards={discardPile} onHover={onCardHover} />
            </div>
        </div>
    );
};

export default CentralNexus;
