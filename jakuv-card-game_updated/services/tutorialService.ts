
import React from 'react';
import { GameState, Suit, TutorialStep, TutorialState, GamePhase, CardColor, ActionState, Card, GameAction, CardChoiceType } from '../types';
import { createInitialGameState, moveCard, findCard, calculatePlayerScore } from './gameLogic';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';

const CHAPTERS: TutorialStep[][] = [
    // Chapter 1: Welcome to Jakuv
    [
        {
            prompt: React.createElement(React.Fragment, null,
                React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Welcome to Jakuv!"),
                React.createElement('p', { className: "text-lg" }, "This tutorial will guide you through the core concepts of the game. Let's start with the most important rule: how to win.")
            ),
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "The goal is to get your score to EXACTLY 21 points. Not more, not less.",
            highlights: ['#player-score', '#opponent-score'],
            allowedActions: [{ type: 'next' }],
            setup: (draft) => {
                const player = draft.players[0];
                player.scoreRow = [
                    { id: 'tut-k', rank: 'K', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true },
                    { id: 'tut-k2', rank: 'K', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true },
                    { id: 'tut-7', rank: '7', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true },
                ]; // 7 + 7 + 7 = 21
            },
        },
        {
            prompt: React.createElement(React.Fragment, null,
                React.createElement('p', null, 'If your score goes ABOVE 21 at the start of your turn, you are "Overcharged" and must discard cards from your rows until your score is 21 or less. '),
                React.createElement('p', { className: "mt-2 font-bold" }, "Avoid going over 21!")
            ),
            allowedActions: [{ type: 'next' }],
             setup: (draft) => {
                const player = draft.players[0];
                player.scoreRow = [
                    { id: 'tut-k', rank: 'K', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true },
                    { id: 'tut-k2', rank: 'K', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true },
                    { id: 'tut-8', rank: '8', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true },
                ]; // 7 + 7 + 8 = 22
            },
        },
        {
            prompt: "Now let's look at the board. This is your Hand. These cards are private to you.",
            highlights: ['#player-hand-grid'],
            allowedActions: [{ type: 'next' }],
            setup: (draft) => {
                draft.players[0].scoreRow = [];
                 draft.players[0].hand = [
                    { id: 'tut-4h', rank: '4', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true },
                    { id: 'tut-5d', rank: '5', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true },
                    { id: 'tut-7s', rank: '7', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true },
                ];
            }
        },
        {
            prompt: "This is your Score Row. Cards played here add to your score but are vulnerable to being attacked by the opponent.",
            highlights: ['#player-score-row'],
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "This is your Royalty Row. Only Jacks, Queens, and Kings can be played here. They add to your score and provide powerful protections.",
            highlights: ['#player-royalty-row'],
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "In the left panel are the shared resources: the Deck to draw from, the Discard Pile, and the special Swap Bar.",
            highlights: ['#left-sidebar #deck-nexus', '#left-sidebar #discard-nexus', '#left-sidebar #swap-nexus'],
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: React.createElement(React.Fragment, null,
                React.createElement('p', null, "Let's practice. Your goal is to play cards from your hand to your Score Row."),
                React.createElement('p', { className: "mt-2 font-bold" }, "Click the 4 of Hearts in your hand.")
            ),
            allowedActions: [{ type: 'cardClick', value: 'tut-4h' }],
            setup: (draft) => {
                draft.selectedCardId = null;
                draft.actionState = ActionState.IDLE;
            }
        },
        {
            prompt: React.createElement(React.Fragment, null,
                React.createElement('p', null, "Great! Now that the 4 is selected, the Action Panel shows your options."),
                React.createElement('p', { className: "mt-2 font-bold" }, 'Click "Play to Score".')
            ),
            highlights: ['#action-btn-playScore', "#player-hand-grid [data-card-id='tut-4h']"],
            allowedActions: [{ type: 'actionButton', value: 'playScore' }],
        },
        {
            prompt: "Excellent. Your score is now 4. Let's continue. Play the 5 of Diamonds.",
            allowedActions: [{ type: 'cardClick', value: 'tut-5d' }],
        },
        {
            prompt: "Now play it to the Score Row.",
            highlights: ['#action-btn-playScore', "#player-hand-grid [data-card-id='tut-5d']"],
            allowedActions: [{ type: 'actionButton', value: 'playScore' }],
        },
        {
            prompt: "Your score is 9. One more! Play the 7 of Spades.",
            allowedActions: [{ type: 'cardClick', value: 'tut-7s' }],
        },
        {
            prompt: "Finish by playing it to the Score Row.",
            highlights: ['#action-btn-playScore', "#player-hand-grid [data-card-id='tut-7s']"],
            allowedActions: [{ type: 'actionButton', value: 'playScore' }],
        },
        {
            prompt: React.createElement(React.Fragment, null,
                React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 1 Complete!"),
                React.createElement('p', { className: "text-lg" }, "You've learned the basics of scoring and playing cards. Click Next to return to the main menu.")
            ),
            allowedActions: [{ type: 'next' }],
            isFinal: true,
        },
    ],
    // Chapter 2: Your Turn
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 2: Your Turn"), React.createElement('p', { className: "text-lg" }, "Let's learn about the structure of a turn and the main actions you can take.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].hand = [];
                draft.players[0].scoreRow = [];
                draft.players[0].royaltyRow = [];
                draft.players[1].hand = [];
                draft.players[1].scoreRow = [];
                draft.players[1].royaltyRow = [];
            }
        },
        {
            prompt: "After maintenance, you perform one main action per turn. Your options are shown in the Action Panel.",
            highlights: ['#right-sidebar'],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].scoreRow = [];
            },
        },
        {
            prompt: "The simplest action is to Draw a Card. This usually ends your turn. Click 'Draw Card' to continue.",
            highlights: ['#action-btn-draw'],
            allowedActions: [{ type: 'draw' }],
            setup: draft => {
                draft.deck = [{ id: 'tut-draw-1', rank: '8', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: false }];
                draft.players[0].hand = [];
            }
        },
        {
            prompt: "You drew a card. Be careful, you can only have 10 cards in your hand. If you have more at the end of your turn, you must discard down to 10.",
            highlights: ['#player-hand-grid'],
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('p', null, "Now for an aggressive move: Scuttling. This lets you destroy an opponent's Score Row card using a card from your hand."), React.createElement('p', { className: "mt-2 font-bold" }, "To Scuttle, your card's value must be equal to or higher than the target's.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-7s', rank: '7', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[1].scoreRow = [{ id: 'tut-opp-5d', rank: '5', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }];
            }
        },
        {
            prompt: "Let's try it. Select your 7 of Spades to begin.",
            highlights: ["#player-hand-grid [data-card-id='tut-7s']"],
            allowedActions: [{ type: 'cardClick', value: 'tut-7s' }]
        },
        {
            prompt: "Now click the 'Scuttle' button in the Action Panel.",
            highlights: ['#action-btn-scuttle'],
            allowedActions: [{ type: 'actionButton', value: 'scuttle' }]
        },
        {
            prompt: "Finally, click the opponent's 5 of Diamonds to destroy it.",
            highlights: ["#opponent-score-row [data-card-id='tut-opp-5d']"],
            allowedActions: [{ type: 'cardClick', value: 'tut-opp-5d' }]
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 2 Complete!"), React.createElement('p', { className: "text-lg" }, "You've destroyed the opponent's card and now understand turn actions. The next chapter will cover the powerful Royals.")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
    // Chapter 3: The Royals
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 3: The Royals"), React.createElement('p', { className: "text-lg" }, "Jacks, Queens, and Kings have unique powers. They are usually played into the Royalty Row.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                // Clear board for new chapter
                draft.players.forEach(p => {
                    p.hand = [];
                    p.scoreRow = [];
                    p.royaltyRow = [];
                });
                draft.discardPile = [];
                draft.actionState = ActionState.IDLE;
                draft.selectedCardId = null;
            }
        },
        {
            prompt: "The King is a powerful counter. If an opponent plays a Royal, your King can stop them. For now, let's see how it removes a Queen already on the board. The opponent has a Queen.",
            highlights: ['#opponent-royalty-row'],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-ks', rank: 'K', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[1].royaltyRow = [{ id: 'tut-qh', rank: 'Q', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }];
            }
        },
        {
            prompt: "Select your King of Spades.",
            highlights: ["#player-hand-grid [data-card-id='tut-ks']"],
            allowedActions: [{ type: 'cardClick', value: 'tut-ks' }]
        },
        {
            prompt: "Now, play it to your Royalty Row to assert your dominance.",
            highlights: ['#action-btn-playRoyalty'],
            allowedActions: [{ type: 'actionButton', value: 'playRoyalty' }]
        },
        {
            prompt: "Excellent! Your King removed the opponent's Queen. A King on the board is a strong defense against other Royals.",
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "Next, the Queen. She protects your entire Score Row from being scuttled. First, play your Queen to the Royalty Row.",
            highlights: ['#action-btn-playRoyalty'],
            allowedActions: [{ type: 'actionButton', value: 'playRoyalty' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-qs', rank: 'Q', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[0].scoreRow = [{ id: 'tut-7h', rank: '7', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }];
                draft.players[0].royaltyRow = [];
                draft.selectedCardId = 'tut-qs'; // Pre-select the card for the player
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "Your Score Row is now protected by the Queen's aura. The AI will try to Scuttle your 7, but it will fail.",
            highlights: ['#player-score-row', "#player-royalty-row [data-card-id='tut-qs']"],
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "Now for the versatile Jack. It can be played for its effect: stealing a card from the opponent's Score Row. The opponent has a 9 you can steal.",
            highlights: ["#opponent-score-row [data-card-id='tut-opp-9c']"],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-jd', rank: 'J', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }];
                draft.players[0].scoreRow = [];
                draft.players[0].royaltyRow = [];
                draft.players[1].scoreRow = [{ id: 'tut-opp-9c', rank: '9', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true }];
            }
        },
        {
            prompt: "Select your Jack of Diamonds.",
            highlights: ["#player-hand-grid [data-card-id='tut-jd']"],
            allowedActions: [{ type: 'cardClick', value: 'tut-jd' }]
        },
        {
            prompt: "Instead of playing for points, click 'Play for Effect'.",
            highlights: ['#action-btn-playForEffect'],
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }]
        },
        {
            prompt: "Now, click the opponent's 9 of Clubs to steal it.",
            highlights: ["#opponent-score-row [data-card-id='tut-opp-9c']"],
            allowedActions: [{ type: 'cardClick', value: 'tut-opp-9c' }]
        },
        {
            prompt: "You've stolen the card! Now choose where to place it. Let's put it in the Score Row.",
            highlights: ['#action-btn-placeScore'],
            allowedActions: [{ type: 'actionButton', value: 'placeEffectScore' }],
        },
        {
            prompt: "Finally, the Royal Marriage. If you have a King and Queen of the same color, you can play them together for 9 points. Select your King of Hearts.",
            allowedActions: [{ type: 'cardClick', value: 'tut-kh' }],
            setup: draft => {
                draft.players[0].hand = [
                    { id: 'tut-kh', rank: 'K', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true },
                    { id: 'tut-qh', rank: 'Q', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }
                ];
                draft.players[0].scoreRow = [];
                draft.actionState = ActionState.IDLE;
                draft.effectContext = null;
                draft.selectedCardId = null;
            }
        },
        {
            prompt: "The 'Royal Marriage' button is now active. Click it to play both cards to your Royalty Row.",
            highlights: ['#action-btn-royalMarriage'],
            allowedActions: [{ type: 'actionButton', value: 'royalMarriage' }]
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 3 Complete!"), React.createElement('p', { className: "text-lg" }, "You now know the powers of the Royals. Use them to control the board and defend your score!")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
    // Chapter 4: Base Effects Arsenal
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 4: Base Effects"), React.createElement('p', { className: "text-lg" }, "Cards 2-7 have powerful effects when you choose 'Play for Effect'.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players.forEach(p => { p.hand = []; p.scoreRow = []; p.royaltyRow = []; });
                draft.discardPile = [];
            }
        },
        {
            prompt: "Let's start with the 7. It lets you draw two cards from the deck and choose one to play immediately. First, play your 7 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-7d', rank: '7', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }];
                draft.deck = [
                    { id: 'tut-deck-10c', rank: '10', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: false },
                    { id: 'tut-deck-8h', rank: '8', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: false },
                ];
                draft.selectedCardId = 'tut-7d';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "Choose the 10 of Clubs to play to your Score Row.",
            allowedActions: [{ type: 'cardChoice', value: 'tut-deck-10c' }],
        },
        {
            prompt: "The 6 lets you draw 3 cards, keep two, and return one to the deck. Play the 6 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-6s', rank: '6', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.deck = [
                    { id: 'tut-deck-jc', rank: 'J', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: false },
                    { id: 'tut-deck-3h', rank: '3', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: false },
                    { id: 'tut-deck-4d', rank: '4', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: false },
                ];
                draft.selectedCardId = 'tut-6s';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "You want to keep the high-value cards. Choose the 3 of Hearts to return to the deck.",
            allowedActions: [{ type: 'cardChoice', value: 'tut-deck-3h' }],
        },
        {
            prompt: "The 5 automatically plays to your score row, then lets you take a card from your discard pile. Play the 5 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-5c', rank: '5', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true }];
                draft.discardPile = [{ id: 'tut-disc-kh', rank: 'K', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }];
                draft.selectedCardId = 'tut-5c';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "The 5 is now in your Score Row. Choose the King from the discard pile to add to your hand.",
            allowedActions: [{ type: 'cardChoice', value: 'tut-disc-kh' }],
        },
        {
            prompt: "The 4 forces an opponent to discard up to two cards from one of their rows. Play your 4 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-4h', rank: '4', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }];
                draft.players[1].scoreRow = [
                     { id: 'tut-opp-8c', rank: '8', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true },
                     { id: 'tut-opp-9d', rank: '9', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }
                ];
                draft.selectedCardId = 'tut-4h';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "First, target the opponent's Score Row by clicking any card in it.",
            allowedActions: [{ type: 'cardClick', value: ['tut-opp-8c', 'tut-opp-9d'] }],
            highlights: ['#opponent-score-row']
        },
        {
            prompt: "The 3 lets you choose to either view and steal a card from the opponent's hand, or force them to discard one. Play the 3 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
             setup: draft => {
                draft.players[0].hand = [{ id: 'tut-3s', rank: '3', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[1].hand = [{ id: 'tut-opp-hand-qc', rank: 'Q', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: false }];
                draft.selectedCardId = 'tut-3s';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "Let's steal their card. Choose the 'View & Steal' option.",
            allowedActions: [{ type: 'optionChoice', value: 'steal' }],
        },
        {
            prompt: "Take their Queen of Clubs.",
            allowedActions: [{ type: 'cardChoice', value: 'tut-opp-hand-qc' }],
        },
        {
            prompt: "Finally, the 2 can mimic the effect of any other base effect card (3-7). Play the 2 for its effect.",
            allowedActions: [{ type: 'actionButton', value: 'playForEffect' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-2c', rank: '2', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true }];
                draft.selectedCardId = 'tut-2c';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "Let's use it as a 7 for a Lucky Draw. Choose '7: Lucky Draw'.",
            allowedActions: [{ type: 'optionChoice', value: '7' }],
            setup: draft => {
                draft.deck = [
                    { id: 'tut-deck-9s', rank: '9', suit: Suit.Spades, color: CardColor.Black, isFaceUp: false },
                    { id: 'tut-deck-ac', rank: 'A', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: false },
                ];
            }
        },
        {
            prompt: "Take the Ace.",
            allowedActions: [{ type: 'cardChoice', value: 'tut-deck-ac' }],
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 4 Complete!"), React.createElement('p', { className: "text-lg" }, "You now master the base card effects. Use them to disrupt your opponent and build your own path to victory!")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
    // Chapter 5: Advanced Tactics
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 5: Advanced Tactics"), React.createElement('p', { className: "text-lg" }, "Let's explore advanced Scuttles, Protections, and the Counter system.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players.forEach(p => { p.hand = []; p.scoreRow = []; p.royaltyRow = []; });
                draft.discardPile = [];
                draft.actionState = ActionState.IDLE;
            }
        },
        {
            prompt: "A Jack can Scuttle any card, regardless of value. Use your Jack to destroy the opponent's powerful 10.",
            allowedActions: [{ type: 'cardClick', value: 'tut-opp-10c' }],
            highlights: ['#action-btn-scuttle', "#player-hand-grid [data-card-id='tut-js']", "#opponent-score-row [data-card-id='tut-opp-10c']"],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-js', rank: 'J', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[1].scoreRow = [{ id: 'tut-opp-10c', rank: '10', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true }];
                draft.selectedCardId = 'tut-js';
                draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
            },
        },
        {
            prompt: "The 10 card can Scuttle ANY card, even those protected by a Queen or an 8's shield. The opponent has a Queen protecting their Score Row.",
            highlights: ["#opponent-royalty-row"],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-10d', rank: '10', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }];
                draft.players[1].royaltyRow = [{ id: 'tut-opp-qs', rank: 'Q', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.players[1].scoreRow = [{ id: 'tut-opp-8h', rank: '8', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true }];
            }
        },
        {
            prompt: "Use your 10 to Scuttle their 8, bypassing the Queen's protection.",
            allowedActions: [{ type: 'cardClick', value: 'tut-opp-8h' }],
            highlights: ['#action-btn-scuttle', "#player-hand-grid [data-card-id='tut-10d']", "#opponent-score-row [data-card-id='tut-opp-8h']"],
            setup: draft => {
                draft.selectedCardId = 'tut-10d';
                draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
            },
        },
        {
            prompt: "Some cards have inherent protection. An 8 comes with a one-time shield against being Scuttled or affected by card effects.",
            highlights: ["#player-score-row [data-card-id='tut-p-8c']"],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].scoreRow = [{ id: 'tut-p-8c', rank: '8', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true, oneTimeProtection: true }];
            }
        },
        {
            prompt: "Aces are immune to being Scuttled (except by a 10) and cannot be targeted by effects like the Jack's steal. They are very safe cards.",
            highlights: ["#player-score-row [data-card-id='tut-p-as']"],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].scoreRow = [{ id: 'tut-p-as', rank: 'A', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true, aceValue: 1 }];
            }
        },
        {
            prompt: "Now for the most important system: Counters. When you play an action, the opponent may have a chance to counter it. Let's see this in action. Play your Queen to the Royalty Row.",
            allowedActions: [{ type: 'actionButton', value: 'playRoyalty' }],
            highlights: ["#player-hand-grid [data-card-id='tut-p-qs']", '#action-btn-playRoyalty'],
            setup: draft => {
                draft.players[0].hand = [
                    { id: 'tut-p-qs', rank: 'Q', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true },
                    { id: 'tut-p-as', rank: 'A', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true, aceValue: 1 }
                ];
                draft.players[0].scoreRow = [];
                draft.players[0].royaltyRow = [];
                draft.selectedCardId = 'tut-p-qs';
                draft.actionState = ActionState.CARD_SELECTED;
            }
        },
        {
            prompt: "The AI is countering your Queen with a King! But you can counter their counter with an Ace. An Ace counters any base effect or Royal counter.",
            allowedActions: [{ type: 'playCounter', value: 'tut-p-as' }],
            highlights: ["#player-hand-grid [data-card-id='tut-p-as']"],
        },
        {
            prompt: "Success! Actions resolve in reverse. Your Ace countered the AI's King, so your Queen play was successful. All counter cards go to the discard pile.",
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 5 Complete!"), React.createElement('p', { className: "text-lg" }, "You now understand the deepest systems in Jakuv. You are ready to play!")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
    // Chapter 6: The Swap Bar
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 6: The Swap Bar"), React.createElement('p', { className: "text-lg" }, "The Swap Bar is a powerful way to get the cards you need. You can use it once per turn.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players.forEach(p => { p.hand = []; p.scoreRow = []; p.royaltyRow = []; });
                draft.discardPile = [];
                draft.actionState = ActionState.IDLE;
                draft.swapUsedThisTurn = false;
            }
        },
        {
            prompt: "If a card is face-up, you can take it directly into your hand. This action ends your turn. Click the face-up 10 of Clubs to take it.",
            allowedActions: [{ type: 'cardClick', value: 'tut-swap-10c' }],
            highlights: ['#left-sidebar #swap-nexus', "#left-sidebar #swap-nexus [data-card-id='tut-swap-10c']"],
            setup: draft => {
                draft.swapBar = [
                    { id: 'tut-swap-facedown1', rank: 'J', suit: Suit.Spades, color: CardColor.Black, isFaceUp: false },
                    { id: 'tut-swap-10c', rank: '10', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true },
                    { id: 'tut-swap-facedown2', rank: 'A', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: false },
                ];
                draft.swapUsedThisTurn = false;
            }
        },
        {
            prompt: "You can also swap a card from your hand with a face-down 'surprise' card. You won't know what you're getting! First, select a card from your hand you want to trade away. Click the 2 of Spades.",
            allowedActions: [{ type: 'cardClick', value: 'tut-hand-2s' }],
            highlights: ['#player-hand-grid', "#player-hand-grid [data-card-id='tut-hand-2s']"],
            setup: draft => {
                draft.players[0].hand = [{ id: 'tut-hand-2s', rank: '2', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
                draft.swapBar = [
                    { id: 'tut-swap-facedown-q', rank: 'Q', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: false },
                    { id: 'tut-swap-10c-prev', rank: '10', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true },
                    { id: 'tut-swap-facedown2', rank: 'A', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: false },
                ];
                draft.swapUsedThisTurn = false;
            }
        },
        {
            prompt: "Now that your 2 is selected, a new option is available. Click 'Surprise Swap' in the Action Panel.",
            allowedActions: [{ type: 'actionButton', value: 'surpriseSwap' }],
            highlights: ['#action-btn-surpriseSwap'],
        },
        {
            prompt: "The face-down cards in the Swap Bar are now highlighted. Choose one to swap with your 2.",
            allowedActions: [{ type: 'cardClick', value: 'tut-swap-facedown-q' }],
            highlights: ['#left-sidebar #swap-nexus', "#left-sidebar #swap-nexus [data-card-id='tut-swap-facedown-q']"],
        },
        {
            prompt: "Surprise! You swapped your 2 for a Queen. A great trade! This also ends your turn.",
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: "Finally, let's talk about the very first turn of the game. To balance the first-player advantage, your options are limited.",
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.phase = GamePhase.PLAYER1_START;
            }
        },
        {
            prompt: "As the starting player, you can only draw a card or interact with the Swap Bar. Any of these actions will immediately end your turn. You cannot play cards to your rows on this turn.",
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 6 Complete!"), React.createElement('p', { className: "text-lg" }, "You now know all the core mechanics of Jakuv. You are ready for a real match!")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
    // Chapter 7: Paths to Victory
    [
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Chapter 7: Paths to Victory"), React.createElement('p', { className: "text-lg" }, "Time to put it all together. Let's learn how to manage your score and win the game.")),
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players.forEach(p => { p.hand = []; p.scoreRow = []; p.royaltyRow = []; });
                draft.discardPile = []; draft.actionState = ActionState.IDLE;
            }
        },
        {
            prompt: "Your score is 14. You have a 7 in your hand. Playing it to your Score Row will make your score exactly 21, winning you the game.",
            highlights: ["#player-hand-grid [data-card-id='tut-7s']", '#player-score'],
            allowedActions: [{ type: 'next' }],
            setup: draft => {
                draft.players[0].scoreRow = [
                    { id: 'tut-k-score', rank: 'K', suit: Suit.Hearts, color: CardColor.Red, isFaceUp: true},
                    { id: 'tut-7-score', rank: '7', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true},
                ]; // Score: 14
                draft.players[0].hand = [{ id: 'tut-7s', rank: '7', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
            }
        },
        {
            prompt: "Select the 7 of Spades.",
            allowedActions: [{ type: 'cardClick', value: 'tut-7s' }],
        },
        {
            prompt: "Now click 'Play to Score' to achieve victory!",
            allowedActions: [{ type: 'actionButton', value: 'playScore' }],
            highlights: ['#action-btn-playScore'],
        },
        {
            prompt: "Sometimes, the direct path is blocked. The opponent has a Queen protecting their score row, so you cannot Scuttle their card.",
            allowedActions: [{ type: 'next' }],
            highlights: ['#opponent-royalty-row'],
            setup: draft => {
                 draft.players[0].scoreRow = [];
                 draft.players[0].hand = [{ id: 'tut-10d', rank: '10', suit: Suit.Diamonds, color: CardColor.Red, isFaceUp: true }];
                 draft.players[1].scoreRow = [{ id: 'tut-opp-target', rank: 'A', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true, aceValue: 5 }];
                 draft.players[1].royaltyRow = [{ id: 'tut-opp-queen', rank: 'Q', suit: Suit.Spades, color: CardColor.Black, isFaceUp: true }];
            }
        },
        {
            prompt: "However, a 10 can Scuttle through any protection. Use your 10 to destroy their Ace.",
            allowedActions: [{ type: 'cardClick', value: 'tut-opp-target' }],
            highlights: ['#action-btn-scuttle', "#player-hand-grid [data-card-id='tut-10d']", "#opponent-score-row [data-card-id='tut-opp-target']"],
            setup: draft => {
                draft.selectedCardId = 'tut-10d';
                draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
            }
        },
        {
            prompt: "You've removed their biggest threat. Now you can focus on building your own score. This is called 'board control'.",
            allowedActions: [{ type: 'next' }],
        },
        {
            prompt: React.createElement(React.Fragment, null, React.createElement('h2', { className: "text-3xl font-bold mb-4 text-[var(--accent-lavender)]" }, "Tutorial Complete!"), React.createElement('p', { className: "text-lg" }, "You are now a true Jakuv player. Go forth and conquer the campaign!")),
            allowedActions: [{ type: 'next' }],
            isFinal: true
        }
    ],
];

export const createTutorialGameState = (chapterIndex: number): GameState => {
    const baseState = createInitialGameState();
    const chapter = CHAPTERS[chapterIndex];
    if (!chapter) {
        console.error(`Tutorial chapter ${chapterIndex} not found.`);
        return baseState; // Return a default state
    }

    const tutorialState: TutorialState = {
        chapter: chapterIndex,
        step: 0,
        steps: chapter,
    };

    const firstStep = chapter[0];

    const finalState = produce(baseState, draft => {
        draft.phase = GamePhase.TUTORIAL;
        draft.tutorial = tutorialState;
        if (firstStep.setup) {
            firstStep.setup(draft);
        }
        if (draft.players[0].hand.length === 0) { // Ensure player has some cards if not specified
             draft.players[0].hand.push({ id: 'tut-placeholder', rank: 'A', suit: Suit.Clubs, color: CardColor.Black, isFaceUp: true, aceValue: 1 });
        }
    });

    return finalState;
};

// This function safely advances the tutorial step and applies the game logic for that step.
export const advanceTutorialStep = (draft: GameState, action: { type: string, value?: any }) => {
    if (!draft.tutorial) return;

    const currentStepIndex = draft.tutorial.step;
    const currentStep = draft.tutorial.steps[currentStepIndex];
    const player = draft.players[0];
    const opponent = draft.players[1];

    // --- Simulate Game Logic based on action ---
    switch (action.type) {
        case 'cardClick':
            const targetId = Array.isArray(action.value) ? action.value[0] : action.value;
            // Handle taking a face-up card from the swap bar
            const swapCardResultTake = findCard(draft.swapBar, targetId);
            if (swapCardResultTake && swapCardResultTake.card.isFaceUp) {
                moveCard(draft.swapBar, player.hand, targetId);
                draft.swapUsedThisTurn = true;
                break;
            }

            if (draft.actionState === ActionState.AWAITING_SCUTTLE_TARGET) {
                // Simulating the scuttle action
                const attackerResult = findCard(player.hand, draft.selectedCardId!);
                if (attackerResult) {
                    moveCard(player.hand, draft.discardPile, attackerResult.card.id);
                    moveCard(opponent.scoreRow, draft.discardPile, targetId);
                }
            } else if(draft.actionState === ActionState.AWAITING_JACK_TARGET) {
                const stolenCardResult = findCard(opponent.scoreRow, targetId);
                if (stolenCardResult) {
                    draft.effectContext = { type: 'JACK_STEAL', stolenCard: {...stolenCardResult.card}};
                    moveCard(opponent.scoreRow, [], targetId);
                    draft.actionState = ActionState.AWAITING_JACK_PLACEMENT;
                }
            } else if (draft.actionState === ActionState.AWAITING_SOFT_RESET_TARGET_ROW) {
                draft.actionState = ActionState.AWAITING_SOFT_RESET_DISCARD_CHOICE;
                draft.effectContext = { type: 'SOFT_RESET', targetPlayerId: opponent.id, targetRow: 'scoreRow', discardedCards: []};
            } else if (action.type === 'cardClick' && draft.actionState === ActionState.AWAITING_SURPRISE_SWAP_TARGET && draft.selectedCardId) {
                const handCardResult = findCard(player.hand, draft.selectedCardId);
                const swapCardResult = findCard(draft.swapBar, targetId);
                if(handCardResult && swapCardResult) {
                    draft.swapBar[swapCardResult.cardIndex] = handCardResult.card;
                    player.hand[handCardResult.cardIndex] = swapCardResult.card;
                    draft.swapUsedThisTurn = true;
                }
            }
             else {
                draft.selectedCardId = targetId;
                draft.actionState = ActionState.CARD_SELECTED;
            }
            break;
        case 'actionButton':
            const cardId = draft.selectedCardId!;
            const cardResult = findCard(player.hand, cardId);
            if (!cardResult) break;
            const card = cardResult.card;

            if (action.value === 'playScore') {
                moveCard(player.hand, player.scoreRow, cardId);
            } else if (action.value === 'playRoyalty') {
                 if (card.rank === 'K') { // Tutorial king removing queen
                    const queenResult = findCard(opponent.royaltyRow, c => c.rank === 'Q');
                    if(queenResult) moveCard(opponent.royaltyRow, draft.discardPile, queenResult.card.id);
                }
                moveCard(player.hand, player.royaltyRow, cardId);
            } else if (action.value === 'scuttle') {
                draft.actionState = ActionState.AWAITING_SCUTTLE_TARGET;
            } else if (action.value === 'surpriseSwap') {
                draft.actionState = ActionState.AWAITING_SURPRISE_SWAP_TARGET;
            } else if (action.value === 'playForEffect') {
                moveCard(player.hand, draft.discardPile, cardId);
                // Simulate effect state changes
                if (card.rank === '7') draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
                if (card.rank === '6') draft.actionState = ActionState.AWAITING_FARMER_CHOICE;
                if (card.rank === '5') {
                    // 5 is special, it plays itself then lets you take from discard
                    moveCard(draft.discardPile, player.scoreRow, cardId);
                    draft.actionState = ActionState.AWAITING_RUMMAGER_CHOICE;
                }
                if (card.rank === '4') draft.actionState = ActionState.AWAITING_SOFT_RESET_TARGET_ROW;
                if (card.rank === '3') draft.actionState = ActionState.AWAITING_INTERROGATOR_CHOICE;
                if (card.rank === '2') draft.actionState = ActionState.AWAITING_MIMIC_CHOICE;
                if (card.rank === 'J') draft.actionState = ActionState.AWAITING_JACK_TARGET;
            } else if (action.value === 'royalMarriage') {
                const partnerRank = card.rank === 'K' ? 'Q' : 'K';
                const partnerResult = findCard(player.hand, c => c.rank === partnerRank && c.color === card.color);
                if (cardResult && partnerResult) {
                    moveCard(player.hand, player.royaltyRow, cardResult.card.id);
                    moveCard(player.hand, player.royaltyRow, partnerResult.card.id);
                }
            } else if (action.value === 'placeEffectScore' && draft.effectContext?.type === 'JACK_STEAL') {
                player.scoreRow.push(draft.effectContext.stolenCard);
                draft.effectContext = null;
            }
            draft.selectedCardId = null;
            break;
        case 'draw':
            const drawnCard = draft.deck.pop();
            if (drawnCard) player.hand.push(drawnCard);
            break;
        case 'cardChoice':
            const context = draft.cardChoiceContext;
            const choiceResult = findCard(draft.cardChoices, action.value);
            if(choiceResult) {
                const chosenCard = choiceResult.card;
                if (context?.type === 'LUCKY_DRAW') {
                    moveCard(draft.cardChoices, player.scoreRow, chosenCard.id);
                    draft.cardChoices.forEach(c => moveCard(draft.cardChoices, draft.discardPile, c.id));
                }
                if (context?.type === 'FARMER') {
                    moveCard(draft.cardChoices, draft.deck, chosenCard.id);
                    draft.cardChoices.forEach(c => moveCard(draft.cardChoices, player.hand, c.id));
                }
                if (context?.type === 'RUMMAGER') {
                    moveCard(draft.discardPile, player.hand, chosenCard.id);
                }
                 if (context?.type === 'INTERROGATOR_STEAL') {
                    moveCard(opponent.hand, player.hand, chosenCard.id);
                }
            }
            draft.cardChoices = [];
            draft.cardChoiceContext = null;
            break;
        case 'optionChoice':
             if (draft.actionState === ActionState.AWAITING_INTERROGATOR_CHOICE) {
                if (action.value === 'steal') draft.actionState = ActionState.AWAITING_INTERROGATOR_STEAL_CHOICE;
            } else if (draft.actionState === ActionState.AWAITING_MIMIC_CHOICE) {
                if (action.value === '7') draft.actionState = ActionState.AWAITING_LUCKY_DRAW_CHOICE;
            }
            break;
        case 'playCounter':
            const counterCardResult = findCard(player.hand, action.value);
            if (counterCardResult) {
                draft.counterStack.push(counterCardResult.card);
                moveCard(player.hand, draft.discardPile, counterCardResult.card.id); // Goes to discard after
            }
            // Simulate AI passing back to resolve the action successfully
            draft.phase = GamePhase.TUTORIAL; 
            const queenResult = findCard(player.hand, c => c.rank === 'Q');
            if(queenResult) moveCard(player.hand, player.royaltyRow, queenResult.card.id);
            break;
    }

    if (currentStepIndex < draft.tutorial.steps.length - 1) {
        draft.tutorial.step++;
        const nextStep = draft.tutorial.steps[draft.tutorial.step];
        if (nextStep.setup) {
            nextStep.setup(draft);
        }
        // After every step, reset state unless the next step needs it
        const keepState = ['cardClick', 'actionButton', 'cardChoice', 'optionChoice', 'playCounter'].includes(nextStep.allowedActions[0]?.type);
        if(!keepState) {
            draft.actionState = ActionState.IDLE;
            draft.selectedCardId = null;
        }
    }
};
