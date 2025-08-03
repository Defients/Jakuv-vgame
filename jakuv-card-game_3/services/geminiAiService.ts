


import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Player, Card, AIAction, Rank, LogEntry, GameAnalysis } from '../types';
import { Character } from '../data/characters';
import { getCardValue, calculatePlayerScore, findCard, getValidMoves } from './gameLogic';
import { WINNING_SCORE } from "../constants";
import { CHARACTERS } from "../data/characters";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const serializeCard = (c: Card | null) => c ? `${c.rank}${c.suit}` : 'Empty';

const serializePlayerState = (player: Player) => ({
    score: calculatePlayerScore(player),
    hand: player.hand.map(serializeCard),
    scoreRow: player.scoreRow.map(serializeCard),
    royaltyRow: player.royaltyRow.map(serializeCard),
    isImmune: player.isImmune,
});

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

const dialogueSchema = {
    type: Type.OBJECT,
    properties: {
        dialogue: { type: Type.STRING, description: 'A short, in-character line of dialogue based on the action.' },
    },
    required: ['dialogue']
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

    let systemInstruction = "You are an intermediate-level AI player for a card game called Jakuv. Choose the best strategic move from the valid moves provided, explaining your reasoning. Your goal is to win by reaching exactly 21 points.";
    let strategicRules = "";

    if (gameState.activeMissionId && CHARACTERS[gameState.activeMissionId]) {
        const character = CHARACTERS[gameState.activeMissionId];
        systemInstruction = character.aiSystemInstruction;
        strategicRules = `
You must adhere to these specific strategic rules for your character:
${character.gameplayProfile.rules.join("\n")}
`;
    }

    const prompt = `
        You are playing a card game called Jakuv.
        ${strategicRules}
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
                systemInstruction,
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

export const getAiDialogue = async (gameState: GameState, character: Character, choice: { action: AIAction, reasoning: string }): Promise<{dialogue: string} | null> => {
    if (!character || !choice) return null;

    const aiPlayer = gameState.players.find(p => p.isAI)!;
    const humanPlayer = gameState.players.find(p => !p.isAI)!;
    const { action, reasoning } = choice;

    let eventDescription = reasoning; // Start with the AI's own reasoning.

    switch(action.type) {
        case 'PLAY_CARD': {
            const card = findCard(aiPlayer.hand, action.cardId)?.card;
            eventDescription = `I decided to play my ${serializeCard(card)} to my ${action.row === 'scoreRow' ? 'Score Row' : 'Royalty Row'}. My reasoning was: "${reasoning}"`;
            break;
        }
        case 'SCUTTLE': {
            const attacker = findCard(aiPlayer.hand, action.attackerCardId)?.card;
            const target = findCard(humanPlayer.scoreRow, action.targetCardId)?.card;
            eventDescription = `I'm using my ${serializeCard(attacker)} to scuttle their ${serializeCard(target)}. My reasoning: "${reasoning}"`;
            break;
        }
        case 'PLAY_FOR_EFFECT': {
            const card = findCard(aiPlayer.hand, action.cardId)?.card;
            eventDescription = `I'm using the effect of my ${serializeCard(card)}. My reasoning: "${reasoning}"`;
            break;
        }
        case 'ROYAL_MARRIAGE': {
             const card = findCard(aiPlayer.hand, action.cardId)?.card;
             eventDescription = `I'm performing a Royal Marriage with my ${serializeCard(card)}. My reasoning: "${reasoning}"`;
             break;
        }
        case 'DRAW': {
            eventDescription = `I've decided to just draw a card. My reasoning: "${reasoning}"`;
            break;
        }
    }

    const prompt = `
        You are playing a card game as the character ${character.name}.
        Your personality is defined as: "${character.aiSystemInstruction}".

        Here is the current situation:
        - My Score: ${calculatePlayerScore(aiPlayer)}
        - Opponent's Score: ${calculatePlayerScore(humanPlayer)}
        - My Hand Size: ${aiPlayer.hand.length}
        - Opponent's Hand Size: ${humanPlayer.hand.length}

        This is the action I've decided to take and why:
        ${eventDescription}

        Based on this action and your personality, generate a single, short, in-character line of dialogue to say out loud. Keep it to 1-2 sentences.
        Your response must be in JSON format matching the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: dialogueSchema,
                // Make dialogue generation fast to not stall the game
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error(`Error calling Gemini API for dialogue for ${character.name}:`, e);
        return null;
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
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'A creative, punchy title for the game analysis, like "A Close Call" or "Domination".' },
        summary: { type: Type.STRING, description: 'A brief, 1-2 paragraph summary of the game\'s flow and outcome.' },
        keyMoments: {
            type: Type.ARRAY,
            description: 'An array of 1-2 key moments or turning points in the game.',
            items: {
                type: Type.OBJECT,
                properties: {
                    turn: { type: Type.NUMBER, description: 'The turn number on which the moment occurred.' },
                    description: { type: Type.STRING, description: 'A description of what happened during this key moment and why it was significant.' }
                },
                required: ['turn', 'description']
            }
        },
        tips: {
            type: Type.ARRAY,
            description: 'An array of 1-2 actionable tips for the human player (Player 1) to improve their strategy in future games.',
            items: { type: Type.STRING }
        }
    },
    required: ['title', 'summary', 'keyMoments', 'tips']
};

const serializeLog = (log: LogEntry[], player1Name: string, player2Name: string): string => {
    // Reverse log to get chronological order
    const chronologicalLog = [...log].reverse();
    let currentTurn = 0;
    
    return chronologicalLog.map(entry => {
        let turnStr = "";
        if (entry.message.startsWith('--- Turn')) {
            const turnMatch = entry.message.match(/Turn (\d+)/);
            if (turnMatch) {
                currentTurn = parseInt(turnMatch[1], 10);
            }
        }

        let message = entry.message;
        // Replace player names for clarity
        message = message.replace(player1Name, 'Player 1');
        message = message.replace(player2Name, 'The AI');

        const prefix = entry.type === 'ai-reasoning' ? `[AI REASONING on Turn ${currentTurn}]` : `[Turn ${currentTurn}]`;

        return `${prefix}: ${message}`;
    }).join('\n');
};

export const getGameAnalysis = async (log: LogEntry[], player1: Player, player2: Player): Promise<GameAnalysis | null> => {
    const serializedLog = serializeLog(log, player1.name, player2.name);
    
    const systemInstruction = "You are an expert coach for a strategic card game called Jakuv. Your task is to analyze a game log and provide insightful feedback to the human player (Player 1) to help them improve. Be encouraging but also direct with your advice.";

    const prompt = `
        Please analyze the following game log from a match of Jakuv between "Player 1" (the human) and "The AI".
        
        Game Log:
        ---
        ${serializedLog}
        ---

        Based on this log, provide a concise analysis. Identify the key turning points and offer specific, actionable advice for Player 1.
        Your response must be in JSON format and strictly adhere to the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: analysisSchema
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error calling Gemini API for game analysis:", e);
        return null;
    }
};