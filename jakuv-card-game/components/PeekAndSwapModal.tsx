


import React from 'react';
import { Card } from '../types';
import CardComponent from './Card';

interface PeekAndSwapModalProps {
  card: Card;
  onDecision: (swap: boolean) => void;
}

const PeekAndSwapModal: React.FC<PeekAndSwapModalProps> = ({ card, onDecision }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glassmorphic p-8 rounded-lg text-center shadow-xl border-2 border-[var(--player-glow)]/50">
        <h2 className="text-2xl font-bold mb-4 text-[var(--player-glow)]" style={{textShadow: `0 0 6px var(--player-glow)`}}>You peek at this card:</h2>
        <div className="flex justify-center my-6">
          <CardComponent card={{ ...card, isFaceUp: true }} />
        </div>
        <p className="text-lg mb-6 text-[var(--text-secondary)]">Do you want to swap it with a card from your hand?</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onDecision(true)}
            className="bg-gradient-to-br from-[var(--player-glow)]/80 to-[var(--accent-lavender)]/70 hover:from-[var(--player-glow)]/100 hover:to-[var(--accent-lavender)]/90 focus:ring-[var(--player-glow)] text-black font-bold py-2 px-6 rounded-md transition-colors shadow-lg"
          >
            Swap
          </button>
          <button
            onClick={() => onDecision(false)}
            className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-[var(--neutral-glow)]/30 focus:ring-[var(--neutral-glow)] text-white font-bold py-2 px-6 rounded-md transition-colors shadow-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeekAndSwapModal;