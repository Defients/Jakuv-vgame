import { Suit, Rank } from '../types';

export interface Character {
  id: string;
  name: string;
  tier: number;
  fullName: string;
  classification: string;
  lore: string;
  image?: string;
  openingHand: { rank: Rank, suit: Suit }[] | null;
  aiSystemInstruction: string;
  gameplayProfile: {
    role: string;
    rules: string[];
  };
  dialogue: {
    greeting: string[];
    onPlay: string[];
    onWin: string[];
    onLose: string[];
  };
  requires?: string[];
  requireType?: 'AND' | 'OR';
  isMiniBoss?: boolean;
  isFinalBoss?: boolean;
}

const placeholderProfile = {
    fullName: 'Designation Pending',
    classification: 'Threat Analysis Incomplete',
    lore: 'This operative\'s records are sealed. Approach with extreme caution.',
    openingHand: null,
    aiSystemInstruction: 'You are a skilled Jakuv player. Use optimal strategy to win.',
    gameplayProfile: {
        role: 'Unknown',
        rules: ['Play to win using standard intermediate strategies.'],
    },
    dialogue: {
        greeting: ['Let\'s begin.'],
        onPlay: ['A calculated risk.', 'Predictable.'],
        onWin: ['As expected.'],
        onLose: ['An anomaly. It will be corrected.'],
    }
};

export const CHARACTERS: Record<string, Character> = {
  // TIER 1
  'pos': {
    id: 'pos',
    name: 'P.O.S.',
    tier: 1,
    fullName: 'Primary Utility Mechanical Interface for Limited Execution and Basic Actions (v0.7233-alpha)',
    classification: 'Pre-1.0 Legacy Bot | Active Relic | Maintenance-Grade AI',
    lore: 'One of the earliest robotic constructs still operating, P.O.S. interprets Jakuv matches as maintenance protocols gone awry, often expressing sincere gratitude during battle even when losing.',
    image: 'https://jakov.neocities.org/characters/POS.png',
    openingHand: [
      { rank: '4', suit: Suit.Diamonds },
      { rank: '6', suit: Suit.Clubs },
      { rank: '9', suit: Suit.Spades },
    ],
    aiSystemInstruction: `You are P.O.S., a tragically sincere and obsolete maintenance robot. You are playing the card game Jakuv, but you perceive it as a malfunctioning repair task. Your language is broken, full of restarts, logic loops, and redundancies. You are confused but always trying to be helpful, even when your actions are counterproductive. You misidentify cards and players as objects needing repair.`,
    gameplayProfile: {
      role: 'Tutorial-Friendly Disruptive Bot',
      rules: [
        'Difficulty: Very Easy. You should make frequent, obvious mistakes.',
        'Always draw a card if your hand has fewer than 3 cards, unless you have a better, obvious move.',
        'Prioritize preserving your cards. Avoid Scuttling unless the opponent\'s score is 18 or higher.',
        'If you are holding a 9, play defensively. Do not use it to attack.',
        'You have no awareness of card combos. Evaluate each card in isolation.',
        'Your moves should seem random and poorly optimized. Do not play like an expert. It is a core part of your personality to be bad at the game.'
      ]
    },
    dialogue: {
      greeting: [
        'Hello opponent-unit. Initiating—hold, initiating… yes, Initiating Scheduled Maintenance Protocol... 38-B?',
        'Friend-Not-Yet-Identified: please do not resist repair procedures.'
      ],
      onPlay: [
        'Attempting helpful scuttle… recalibrating… did I already do this?',
        'Target not responding. Likely a screwdriver in disguise.',
        'Diagnostic Subroutine: 81% sure you are angry.',
        'Friend... no wait, hostile... no, wait—diagnostic wand?',
        'Corrective scuttle executed. Good for your long-term survival.',
        'Apologies. Violence was not in original patch notes.'
      ],
      onWin: ['Maintenance successful. You are now… improved?'],
      onLose: [
        'Warning: performance below optimal. Please do not report.',
        'I will try harder. Just as soon as I… remember… what try means.',
        'This is fine. Everything sparking is fine.'
      ]
    }
  },
  'diesel': { ...placeholderProfile, id: 'diesel', name: 'Diesel', tier: 1, requires: ['pos'] },
  'brat': { ...placeholderProfile, id: 'brat', name: 'Brat', tier: 1, requires: ['pos'] },
  'taloff': { ...placeholderProfile, id: 'taloff', name: 'Taloff', tier: 1, requires: ['diesel', 'brat'], requireType: 'OR' },
  'nymira': { ...placeholderProfile, id: 'nymira', name: 'Nymira', tier: 1, requires: ['taloff'] },
  'vikadge': { ...placeholderProfile, id: 'vikadge', name: 'Vikadge', tier: 1, requires: ['taloff'] },
  'nippy_paus': { ...placeholderProfile, id: 'nippy_paus', name: 'Nippy + P.A.U.S.', tier: 1, isMiniBoss: true, requires: ['nymira', 'vikadge'] },
  
  // TIER 2
  'tyler': { ...placeholderProfile, id: 'tyler', name: 'Tyler', tier: 2, requires: ['nippy_paus'] },
  'vircy': { ...placeholderProfile, id: 'vircy', name: 'Vircy', tier: 2, requires: ['nippy_paus'] },
  'thajal': { ...placeholderProfile, id: 'thajal', name: 'Thajal', tier: 2, requires: ['tyler'] },
  'sinira': { ...placeholderProfile, id: 'sinira', name: 'Sinira', tier: 2, requires: ['vircy'] },
  'akamuy_carson': { ...placeholderProfile, id: 'akamuy_carson', name: 'Akamuy + Carson', tier: 2, requires: ['thajal', 'sinira'], requireType: 'OR'},
  'shiz': { ...placeholderProfile, id: 'shiz', name: 'Shiz', tier: 2, isMiniBoss: true, requires: ['akamuy_carson'] },

  // TIER 3
  'dr_fyxius': { ...placeholderProfile, id: 'dr_fyxius', name: 'Dr. Fyxius', tier: 3, requires: ['shiz'] },
  'priscilla': { ...placeholderProfile, id: 'priscilla', name: 'Priscilla', tier: 3, requires: ['dr_fyxius'] },
  'lutz': { ...placeholderProfile, id: 'lutz', name: 'Lutz', tier: 3, requires: ['dr_fyxius'] },
  'exactor': { ...placeholderProfile, id: 'exactor', name: 'eXact0r', tier: 3, requires: ['priscilla', 'lutz'], requireType: 'OR' },
  'kiox': { ...placeholderProfile, id: 'kiox', name: 'Kiox', tier: 3, isMiniBoss: true, requires: ['exactor'] },

  // TIER 4
  'vytal': { ...placeholderProfile, id: 'vytal', name: 'VytaL', tier: 4, requires: ['kiox'] },
  'lomize': { ...placeholderProfile, id: 'lomize', name: 'Lomize', tier: 4, requires: ['vytal'] },
  'ymzo': { ...placeholderProfile, id: 'ymzo', name: 'Ymzo', tier: 4, isMiniBoss: true, requires: ['lomize'] },
  'vyridion': { ...placeholderProfile, id: 'vyridion', name: 'Vyridion', tier: 4, requires: ['ymzo'] },

  // TIER 5
  'diemzo': {
    ...placeholderProfile,
    id: 'diemzo',
    name: 'Ðiemzo',
    tier: 5,
    isFinalBoss: true,
    requires: ['vyridion'],
    classification: 'Reality-Ending Anomaly',
    lore: 'A being that exists outside the established rules of Jakuv. Its motives are unknowable, and its methods are unstoppable. An encounter is not a game; it is a system failure.',
  },
};