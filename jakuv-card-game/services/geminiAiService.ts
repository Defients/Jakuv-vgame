import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Player, Card, AIAction, Rank } from '../types';
import { getCardValue, calculatePlayerScore } from './gameLogic';
import { WINNING_SCORE } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const serializeCard = (c: Card | null) => c ? `${c.rank}${c.suit}` : 'Empty';

const serializePlayerState = (player: Player) => ({
    score: calculatePlayerScore(player),
    hand: player.hand.map(serializeCard),
    scoreRow: player.scoreRow.map(serializeCard),
    royaltyRow: player.royaltyRow.map(serializeCard),
    isImmune: player.isImmune,
});

const getValidMoves = (gameState: GameState): AIAction[] => {
    const validMoves: AIAction[] = [];
    const aiPlayer = gameState.players[gameState.currentPlayerIndex];
    const humanPlayer = gameState.players[gameState.currentPlayerIndex === 0 ? 1 : 0];

    // Play Card
    aiPlayer.hand.forEach(card => {
        if (card.rank !== 'K') validMoves.push({ type: 'PLAY_CARD', cardId: card.id, row: 'scoreRow' });
        if (['J', 'Q', 'K'].includes(card.rank)) validMoves.push({ type: 'PLAY_CARD', cardId: card.id, row: 'royaltyRow' });
    });

    // Scuttle
    const isProtectedByQueen = humanPlayer.royaltyRow.some(c => c.rank === 'Q');
    if (humanPlayer.scoreRow.length > 0 && !humanPlayer.isImmune) {
        humanPlayer.scoreRow.forEach(target => {
            aiPlayer.hand.forEach(attacker => {
                const attackerIsRoyal = ['J', 'Q', 'K'].includes(attacker.rank);
                const canAttack = attackerIsRoyal || (getCardValue(attacker, 'scoreRow') >= getCardValue(target, 'scoreRow'));
                const targetIsImmune = target.rank === 'A' || target.oneTimeProtection;
                const canBypass = attacker.rank === '10';
                if(canAttack && (!targetIsImmune || canBypass) && (!isProtectedByQueen || canBypass)) {
                    validMoves.push({ type: 'SCUTTLE', attackerCardId: attacker.id, targetCardId: target.id });
                }
            });
        });
    }

    // Play for Effect
    aiPlayer.hand.forEach(card => {
         if (['J', '7', '6', '4', '3', '2'].includes(card.rank)) {
            validMoves.push({ type: 'PLAY_FOR_EFFECT', cardId: card.id });
         }
    });

    // Royal Marriage
    const kingsInHand = aiPlayer.hand.filter(c => c.rank === 'K');
    for (const king of kingsInHand) {
        const partnerQueen = aiPlayer.hand.find(c => c.rank === 'Q' && c.color === king.color);
        if (partnerQueen) validMoves.push({ type: 'ROYAL_MARRIAGE', cardId: king.id });
    }
    
    // Draw
    validMoves.push({ type: 'DRAW' });

    return validMoves;
};


const actionSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning: { type: Type.STRING, description: 'A short explanation of why this move was chosen.' },
        action: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: ['PLAY_CARD', 'SCUTTLE', 'PLAY_FOR_EFFECT', 'ROYAL_MARRIAGE', 'DRAW'] },
                cardId: { type: Type.STRING, description: "The ID of the card being played from hand." },
                row: { type: Type.STRING, enum: ['scoreRow', 'royaltyRow'], description: "The row to play the card to." },
                attackerCardId: { type: Type.STRING, description: "The ID of the card used to scuttle." },
                targetCardId: { type: Type.STRING, description: "The ID of the card being scuttled." }
            },
            required: ['type']
        }
    },
    required: ['reasoning', 'action']
};

export const getAiTurn = async (gameState: GameState): Promise<{action: AIAction, reasoning: string} | null> => {
    const validMoves = getValidMoves(gameState);
    if (validMoves.length === 0) return { action: {type: 'DRAW'}, reasoning: 'No other valid moves available.'};

    const aiPlayer = gameState.players.find(p => p.isAI)!;
    const humanPlayer = gameState.players.find(p => !p.isAI)!;

    const serializedState = {
        objective: `Get a total score of exactly ${WINNING_SCORE}.`,
        myState: serializePlayerState(aiPlayer),
        opponentState: serializePlayerState(humanPlayer),
        swapBar: gameState.swapBar.map(c => c ? (c.isFaceUp ? serializeCard(c) : 'Face-Down') : 'Empty'),
        discardPileTop: gameState.discardPile.length > 0 ? serializeCard(gameState.discardPile[gameState.discardPile.length - 1]) : 'Empty',
        scuttleRule: "Royalty (J, Q, K) can scuttle ANY value card. Other cards must be of equal or higher value. The 10 can bypass all protections.",
        validMoves,
    };

    const prompt = `
        You are playing a card game called Jakuv. You are an intermediate-level AI player.
        Given the current game state and a list of valid moves, choose the best strategic move.
        Explain your reasoning briefly. Your choice must be one of the provided valid moves.

        Current Game State:
        ${JSON.stringify(serializedState, null, 2)}

        Choose one of the valid moves. Your response must be in JSON format matching the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: actionSchema
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result;

    } catch (e) {
        console.error("Error calling Gemini API for turn:", e);
        // Fallback to simple logic if API fails
        return { action: validMoves[validMoves.length - 1], reasoning: "AI fallback: performing last valid move (draw)." };
    }
}

const counterSchema = {
    type: Type.OBJECT,
    properties: {
        reasoning: { type: Type.STRING, description: 'A short explanation of why this counter decision was chosen.' },
        decision: { type: Type.STRING, enum: ['pass', 'counter'] },
        cardId: { type: Type.STRING, description: 'The ID of the card to use for the counter. Required if decision is "counter".'}
    },
    required: ['reasoning', 'decision']
};

export const getAiCounterDecision = async (gameState: GameState, validCounterCards: Card[]): Promise<{decision: 'pass' | 'counter', cardId: string | null, reasoning: string}> => {
     const actionToCounter = gameState.actionContext!;
     const aiPlayer = gameState.players.find(p => p.isAI)!;
     const humanPlayer = gameState.players.find(p => !p.isAI)!;
     
     if (validCounterCards.length === 0) {
        return { decision: 'pass', cardId: null, reasoning: "AI has no valid cards to counter with."};
    }

     const serializedState = {
        myState: serializePlayerState(aiPlayer),
        opponentState: serializePlayerState(humanPlayer),
     };

     const prompt = `
        You are playing a card game called Jakuv.
        Your opponent is trying to perform an action: '${actionToCounter.counterVerb}'.
        Action details: ${JSON.stringify(actionToCounter.payload)}
        You have these cards in your hand that can counter it: ${validCounterCards.map(c => `(ID: ${c.id}, Rank: ${c.rank})`).join(', ')}.
        Decide if it's strategically worth using one of these cards to counter, or if you should pass.

        Current Game State:
        ${JSON.stringify(serializedState, null, 2)}

        Your response must be in JSON format matching the provided schema. If you decide to counter, you MUST specify which cardId to use.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: counterSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
         console.error("Error calling Gemini API for counter:", e);
         // Fallback to simple logic: always counter if possible
         return { decision: 'counter', cardId: validCounterCards[0].id, reasoning: "AI fallback: countering because a valid card is available." };
    }
}