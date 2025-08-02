
import React from 'react';

export const Spade: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M256 512c14.2 0 27.3-7.5 34.5-19.8l216-368c6.3-10.7 7.6-23.5 3.5-35.5s-12.3-21.8-24-25.4L256 0 26.1 63.3c-11.7 3.6-20 13.4-24 25.4s-2.8 24.8 3.5 35.5l216 368C228.7 504.5 241.8 512 256 512zM288 320h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32z"/>
  </svg>
);

export const Club: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M384 144c-30.9 0-56 25.1-56 56s25.1 56 56 56c23.7 0 44-14.9 51.9-35.4C448.2 212.8 448 200.7 440.9 192C448.3 182.9 448 168 438.3 160c-13.3-11.2-32.4-16-54.3-16zM242.1 254.6c-11.8-35.3-43-62.6-82.1-62.6c-48.5 0-88 39.5-88 88s39.5 88 88 88c39.1 0 70.3-27.3 82.1-62.6c11.8 35.3 43 62.6 82.1 62.6c48.5 0 88-39.5 88-88s-39.5-88-88-88c-39.1 0-70.3 27.3-82.1 62.6zM160 328c-30.9 0-56-25.1-56-56s25.1-56 56-56c23.7 0 44 14.9 51.9 35.4c12.3-7.8 27-12.1 42.1-12.1v-71.1c-43.2-11.3-82.4-36.8-109-72.2C40.6 84.6 0 165.6 0 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-90.4-40.6-171.4-105.7-217.9c-26.6 35.4-65.8 60.9-109 72.2V256c15.1 0 29.8 4.3 42.1 12.1C316 233 336.3 224 352 224c30.9 0 56 25.1 56 56s-25.1 56-56 56h-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h16c48.5 0 88-39.5 88-88s-39.5-88-88-88c-35.3 0-65.8 20.9-80 50.4V144c43.2 11.3 82.4 36.8 109 72.2c65.1 46.5 105.7 127.5 105.7 217.9c0 141.4-114.6 256-256 256S0 397.4 0 256C0 165.6 40.6 84.6 105.7 38.1C132.2 2.7 171.4-8.8 208 6.4V112c-15.1 0-29.8 4.3-42.1 12.1C164 157.1 143.7 160 128 160c-30.9 0-56-25.1-56-56s25.1-56 56-56h16c8.8 0 16-7.2 16-16V0C144.9 0 128.9.7 113.1 2.9 48.9 10.2 0 63.3 0 128c0 48.5 39.5 88 88 88c35.3 0 65.8-20.9 80-50.4V256H160c-8.8 0-16-7.2-16-16V208c0-8.8 7.2-16 16-16s16 7.2 16 16v32h8c8.8 0 16-7.2 16-16V128h-8c-8.8 0-16-7.2-16-16s7.2-16 16-16h8c8.8 0 16 7.2 16 16v96c0 26.5-21.5 48-48 48z"/>
  </svg>
);

export const Heart: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
  </svg>
);

export const Diamond: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 12L12 22L22 12L12 2Z" />
  </svg>
);

export const HexShield: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
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
