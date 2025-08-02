
import React, { useState, useLayoutEffect } from 'react';
import { TutorialState } from '../types';

interface TutorialGuideProps {
  tutorialState: TutorialState;
  onNext: () => void;
}

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TutorialGuide: React.FC<TutorialGuideProps> = ({ tutorialState, onNext }) => {
  const [highlights, setHighlights] = useState<HighlightBox[]>([]);
  const [clipPath, setClipPath] = useState('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  const currentStep = tutorialState.steps[tutorialState.step];

  useLayoutEffect(() => {
    const calculateHighlights = () => {
      const newHighlights: HighlightBox[] = [];
      if (currentStep.highlights && currentStep.highlights.length > 0) {
        currentStep.highlights.forEach(selector => {
          const element = document.querySelector(selector);
          if (element) {
            const rect = element.getBoundingClientRect();
            newHighlights.push({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            });
          }
        });
      }
      setHighlights(newHighlights);

      if (newHighlights.length > 0) {
        const pathParts = newHighlights.map(box => {
          const padding = 12; // Increased padding for a softer look
          const top = box.top - padding;
          const left = box.left - padding;
          const width = box.width + (padding * 2);
          const height = box.height + (padding * 2);
          return `${left}px ${top}px, ${left + width}px ${top}px, ${left + width}px ${top + height}px, ${left}px ${top + height}px, ${left}px ${top}px`;
        });
        
        const fullScreenPath = '0% 0%, 100% 0%, 100% 100%, 0% 100%';
        setClipPath(`polygon(evenodd, ${fullScreenPath}, ${pathParts.join(', ')})`);
      } else {
        // When no highlights, the clip-path covers nothing, making the backdrop fully visible.
        // To hide it, we create a path that results in no visible area.
        setClipPath('polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)');
      }
    };

    // Use a small timeout to ensure the DOM has settled before calculating positions
    const timeoutId = setTimeout(calculateHighlights, 50);
    window.addEventListener('resize', calculateHighlights);
    const observer = new MutationObserver(calculateHighlights);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', calculateHighlights);
        observer.disconnect();
    }
  }, [currentStep.highlights]);

  const showNextButton = currentStep.allowedActions.some(a => a.type === 'next');

  return (
    <>
      {/* Backdrop with clip-path to create "cutouts" for highlights */}
      <div 
        className="fixed inset-0 bg-black/70 z-40 pointer-events-none transition-all duration-500"
        style={{ clipPath: clipPath }}
      ></div>

      {/* Highlight Borders are separate to appear on top of the un-clipped areas */}
      {highlights.map((box, index) => (
        <div
          key={index}
          className="fixed border-2 border-[var(--warning-glow)] rounded-xl pointer-events-none transition-all duration-300 animate-[glow-pulse_2s_infinite]"
          style={{
            top: box.top - 12,
            left: box.left - 12,
            width: box.width + 24,
            height: box.height + 24,
            zIndex: 45, // Above backdrop but below prompt
            '--shadow-color': 'var(--warning-glow)',
          } as React.CSSProperties}
        ></div>
      ))}
      
      {/* Prompt Box */}
      <div className="fixed bottom-1/4 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50 flex justify-center pointer-events-auto">
         <div className="glassmorphic p-8 rounded-2xl text-center shadow-2xl border-2 border-[var(--accent-lavender)] w-full mx-4">
            <div className="text-xl text-[var(--text-light)]">
                 {currentStep.prompt}
            </div>
            {showNextButton && (
                <button
                    onClick={onNext}
                    className="mt-6 font-bold py-3 px-8 rounded-md transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl shadow-[var(--accent-magenta)]/40 text-xl bg-gradient-to-br from-[var(--accent-magenta)] to-[var(--accent-red)] hover:brightness-110 focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-indigo)] focus:ring-[var(--warning-glow)] text-white"
                >
                    Next &rarr;
                </button>
            )}
         </div>
      </div>
    </>
  );
};

export default TutorialGuide;
