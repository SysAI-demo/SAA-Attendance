import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'compact' | 'icon' | 'login';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'pill', className = '' }) => {
  const { language, setLanguage, toggleLanguage, isRTL } = useLanguage();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === 'en' ? 'التحويل إلى العربية' : 'Switch to English'}
        className={`p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 border border-stone-200/80 shadow-2xs ${className}`}
      >
        <Globe className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-bold uppercase">{language === 'en' ? 'AR' : 'EN'}</span>
      </button>
    );
  }

  if (variant === 'login') {
    return (
      <div className={`flex items-center bg-stone-100/90 p-1 rounded-2xl border border-stone-200/80 shadow-inner ${className}`}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            language === 'en'
              ? 'bg-white text-emerald-700 shadow-xs border border-stone-200/60'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>English</span>
          {language === 'en' && <Check className="w-3 h-3 text-emerald-600" />}
        </button>
        <button
          type="button"
          onClick={() => setLanguage('ar')}
          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            language === 'ar'
              ? 'bg-white text-emerald-700 shadow-xs border border-stone-200/60'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>العربية</span>
          {language === 'ar' && <Check className="w-3 h-3 text-emerald-600" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center bg-stone-100/90 p-0.5 rounded-xl border border-stone-200 shadow-2xs ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-stone-600 hover:text-stone-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          language === 'ar'
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-stone-600 hover:text-stone-900'
        }`}
      >
        العربية
      </button>
    </div>
  );
};
