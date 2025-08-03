import React from 'react';
import { GameAnalysis } from '../types';
import { InfoIcon, KeyIcon, LightbulbIcon, CosmoTechSigil } from './icons';

interface AnalysisModalProps {
    analysisState: {
        analysis: GameAnalysis | null;
        isLoading: boolean;
        error: string | null;
    };
    onClose: () => void;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex flex-col items-center justify-center gap-6">
        <CosmoTechSigil className="w-24 h-24 text-[var(--neutral-glow)] animate-spin" style={{ animationDuration: '5s' }} />
        <p className="text-2xl font-semibold text-[var(--text-light)] animate-pulse">Analyzing Game...</p>
    </div>
);

const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
    <div className="text-center">
        <h3 className="text-2xl font-bold text-[var(--accent-red)] mb-4">Analysis Failed</h3>
        <p className="text-[var(--text-secondary)]">Could not retrieve game analysis. Please try again later.</p>
        <p className="text-xs text-slate-500 mt-4">{error}</p>
    </div>
);

const AnalysisSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-black/20 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
            {icon}
            <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="pl-9 text-[var(--text-secondary)] space-y-2">
            {children}
        </div>
    </div>
);


const AnalysisModal: React.FC<AnalysisModalProps> = ({ analysisState, onClose }) => {
    const { analysis, isLoading, error } = analysisState;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-70 animate-fade-in">
            <div className="glassmorphic p-8 rounded-2xl shadow-2xl border-2 border-[var(--neutral-glow)] w-full max-w-2xl h-[90vh] mx-4 relative flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors z-10">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <div className="flex-grow flex flex-col items-center justify-center min-h-0">
                    {isLoading && <LoadingIndicator />}
                    {error && <ErrorDisplay error={error} />}
                    {analysis && (
                        <div className="w-full h-full flex flex-col">
                            <div className="text-center mb-6 flex-shrink-0">
                                <h2 className="text-4xl font-bold text-[var(--accent-lavender)]" style={{ textShadow: '0 0 8px var(--accent-lavender)' }}>
                                    Game Analysis
                                </h2>
                                <p className="text-xl text-[var(--text-primary)] font-semibold mt-1">
                                    "{analysis.title}"
                                </p>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 -mr-4 space-y-5">
                                <AnalysisSection icon={<InfoIcon className="w-6 h-6 text-[var(--accent-cyan)]" />} title="Game Summary">
                                    <p>{analysis.summary}</p>
                                </AnalysisSection>

                                <AnalysisSection icon={<KeyIcon className="w-6 h-6 text-[var(--accent-gold)]" />} title="Key Moments">
                                    {analysis.keyMoments.map((moment, index) => (
                                        <div key={index}>
                                            <p className="font-bold text-[var(--text-light)]">Turn {moment.turn}:</p>
                                            <p>{moment.description}</p>
                                        </div>
                                    ))}
                                </AnalysisSection>

                                <AnalysisSection icon={<LightbulbIcon className="w-6 h-6 text-[var(--accent-warning)]" />} title="Tips for Improvement">
                                    <ul className="list-disc list-inside space-y-1">
                                        {analysis.tips.map((tip, index) => (
                                            <li key={index}>{tip}</li>
                                        ))}
                                    </ul>
                                </AnalysisSection>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisModal;
