import React, { useState } from 'react';
import { MapPin, Shield } from 'lucide-react';

interface AuthorityLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  fallbackText?: string;
}

export const AuthorityLogo: React.FC<AuthorityLogoProps> = ({
  className = '',
  imgClassName = '',
  size = 'md',
}) => {
  const [imgSrc, setImgSrc] = useState<string>('/logo.png');
  const [hasError, setHasError] = useState<boolean>(false);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-14 h-14 sm:w-16 sm:h-16',
    xl: 'w-20 h-20 sm:w-24 sm:h-24',
    full: 'w-full h-auto',
  };

  const imgSize = sizeClasses[size] || sizeClasses.md;

  const handleImgError = () => {
    if (imgSrc === '/logo.png') {
      setImgSrc('/logo.svg');
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${imgSize} ${className}`}>
        <svg viewBox="0 0 512 512" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="bgGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C1917" />
              <stop offset="50%" stopColor="#292524" />
              <stop offset="100%" stopColor="#0C0A09" />
            </linearGradient>
            <linearGradient id="goldGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="30%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#AA771C" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
            <linearGradient id="amberGradFull" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="shieldGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#44403C" />
              <stop offset="100%" stopColor="#1C1917" />
            </linearGradient>
          </defs>
          <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#bgGradFull)" stroke="url(#goldGradFull)" strokeWidth="12" />
          <rect x="36" y="36" width="440" height="440" rx="76" fill="none" stroke="url(#goldGradFull)" strokeWidth="2" strokeOpacity="0.4" strokeDasharray="8 6" />
          <path d="M 256 96 C 330 96, 380 116, 380 116 C 380 260, 320 370, 256 416 C 192 370, 132 260, 132 116 C 132 116, 182 96, 256 96 Z" fill="url(#shieldGradFull)" stroke="url(#goldGradFull)" strokeWidth="8" />
          <g transform="translate(0, -10)">
            <path d="M 256 160 C 218 160, 188 190, 188 228 C 188 280, 256 340, 256 340 C 256 340, 324 280, 324 228 C 324 190, 294 160, 256 160 Z" fill="url(#amberGradFull)" stroke="url(#goldGradFull)" strokeWidth="6" />
            <circle cx="256" cy="224" r="28" fill="#1C1917" stroke="url(#goldGradFull)" strokeWidth="4" />
            <path d="M 246 224 L 253 231 L 268 216" fill="none" stroke="#FEF08A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <polygon points="216,368 221,378 232,379 224,387 226,398 216,392 206,398 208,387 200,379 211,378" fill="url(#goldGradFull)" />
          <polygon points="256,380 261,390 272,391 264,399 266,410 256,404 246,410 248,399 240,391 251,390" fill="url(#goldGradFull)" />
          <polygon points="296,368 301,378 312,379 304,387 306,398 296,392 286,398 288,387 280,379 291,378" fill="url(#goldGradFull)" />
          <text x="256" y="448" fontFamily="sans-serif" fontSize="22" fontWeight="900" letterSpacing="2" fill="url(#goldGradFull)" textAnchor="middle">
            SAA TIME & ATTENDANCE
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={imgSrc}
        alt="SAA Time and Attendance Logo"
        onError={handleImgError}
        className={`object-contain transition-transform duration-200 ${imgSize} ${imgClassName}`}
      />
    </div>
  );
};

