import React from 'react';

interface OptionChoiceModalProps {
  prompt: string;
  options: { label: string; value: string }[];
  onSelectOption: (value: string) => void;
}

const OptionChoiceModal: React.FC<OptionChoiceModalProps> = ({ prompt, options, onSelectOption }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glassmorphic p-8 rounded-lg text-center shadow-xl border-2 border-[var(--accent-lavender)]/50 max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-[var(--accent-lavender)]" style={{textShadow: `0 0 6px var(--accent-lavender)`}}>{prompt}</h2>
        <div className="flex flex-col justify-center gap-4 mt-6">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => onSelectOption(option.value)}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold py-3 px-6 rounded-md transition-colors shadow-md text-lg hover:border-[var(--neutral-glow)]"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OptionChoiceModal;