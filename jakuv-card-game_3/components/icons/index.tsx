import React from 'react';

export const HexShield: React.FC<{ className?: string; style?: React.CSSProperties, title?: string }> = ({ className, style, title }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    {title && <title>{title}</title>}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

export const Shield = HexShield;

export const GlowingOrb: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="aiGlow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.2" />
        <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.2" />
        <circle cx="50" cy="50" r="20" fill="currentColor" filter="url(#aiGlow)" />
    </svg>
);

export const CosmoTechSigil: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="32" cy="32" r="28" />
    <path d="M4,32 a28,28 0 0,1 56,0" strokeWidth="0.5" opacity="0.5"/>
    <path d="M32,4 a28,28 0 0,1 0,56" strokeWidth="0.5" opacity="0.5"/>
    <path d="M32 12 V 52 M12 32 H 52" strokeWidth="1" opacity="0.7"/>
    <path d="M19.4 19.4 L 44.6 44.6 M19.4 44.6 L 44.6 19.4" strokeWidth="1" opacity="0.7"/>
    <circle cx="32" cy="32" r="10" strokeWidth="2" />
    <circle cx="32" cy="32" r="4" fill="currentColor"/>
  </svg>
);

// --- Game Log Icons ---
const Icon: React.FC<{ children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">{children}</svg>
);

export const PlayCardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></Icon>
);
export const ScuttleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4-4L16.5 3.5z"></path><path d="m15 5 4 4"></path><path d="M9 12a7 7 0 0 1 7-7h1"></path></Icon>
);
export const DrawCardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></Icon>
);
export const EffectIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></Icon>
);
export const SwapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="15" y1="4" x2="3" y2="16"></line></Icon>
);
export const SystemIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></Icon>
);
export const WinnerTrophyIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
  <Icon className={className} style={style}><path d="M12 2L9 5h6L12 2z"></path><path d="M12 22V12"></path><path d="M18.36 9.64a9 9 0 1 1-12.72 0"></path><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path></Icon>
);
export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></Icon>
);
export const CounterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="11 14 15 10 11 6"></polyline></Icon>
);
export const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></Icon>
);

export const PassIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
      <polygon points="5 4 15 12 5 20 5 4"></polygon>
      <line x1="19" y1="5" x2="19" y2="19"></line>
    </Icon>
);

export const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </Icon>
);

export const UnlockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 5-5h2"></path>
  </Icon>
);

// --- Micro Menu Icons ---
export const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></Icon>
);
export const UserIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
    <Icon className={className} style={style}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></Icon>
);
export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></Icon>
);
export const RestartIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></Icon>
);
export const TrophyIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
    <Icon className={className} style={style}>
        <path d="M12.22 19.88l-2.02.83-2.02-.83a2.5 2.5 0 0 1-1.18-3.03l.3-1.01h6.8l.3 1.01a2.5 2.5 0 0 1-1.18 3.03z"></path>
        <path d="M14 15h-4a2 2 0 0 0-2 2v2.34a2.5 2.5 0 0 1 1.18 3.03l2.02.83 2.02-.83a2.5 2.5 0 0 1 1.18-3.03V17a2 2 0 0 0-2-2z"></path>
        <path d="M10.68 15H5.5a2 2 0 0 1-1.79-1.11l-1-3a2 2 0 0 1 .18-2.22l2.39-2.39a2 2 0 0 1 2.82 0l2.39 2.39a2 2 0 0 1 .18 2.22l-1 3A2 2 0 0 1 7.5 15"></path>
        <path d="M13.32 15H18.5a2 2 0 0 0 1.79-1.11l1-3a2 2 0 0 0-.18-2.22l-2.39-2.39a2 2 0 0 0-2.82 0l-2.39 2.39a2 2 0 0 0-.18 2.22l1 3A2 2 0 0 0 16.5 15"></path>
    </Icon>
);
export const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
    </Icon>
);

export const LightbulbIcon: React.FC<{ className?: string }> = ({ className }) => (
    <Icon className={className}>
      <path d="M9 18h6v-2.3c0-2.28 1.49-4.26 3.5-5.12C19.46 10.12 20 9.17 20 8a6 6 0 0 0-12 0c0 1.17.54 2.12 1.5 2.58C11.51 11.44 13 13.42 13 15.7V18z"></path>
      <line x1="9" y1="22" x2="15" y2="22"></line>
      <line x1="12" y1="8" x2="12" y2="4"></line>
    </Icon>
);
