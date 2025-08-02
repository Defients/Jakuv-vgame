

import React from 'react';
import { Card } from '../types';
import CardComponent from './Card';

interface CardChoiceModalProps {
  cards: Card[];
  prompt: string;
  onSelectCard: (cardId: string) => void;
}

const CardChoiceModal: React.FC<CardChoiceModalProps> = ({ cards, prompt, onSelectCard }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-60 animate-fade-in">
      <div className="glassmorphic p-8 rounded-lg text-center shadow-xl border-2 border-[var(--accent-lavender)]/50">
        <h2 className="text-2xl font-bold mb-4 text-[var(--accent-lavender)]" style={{textShadow: `0 0 6px var(--accent-lavender)`}}>{prompt}</h2>
        <div className="flex justify-center gap-4 mt-6">
          {cards.map(card => (
            <CardComponent
              key={card.id}
              card={{ ...card, isFaceUp: true }}
              onClick={() => onSelectCard(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardChoiceModal;