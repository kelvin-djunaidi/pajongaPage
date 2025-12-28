"use client";

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, changeLanguage } = useLanguage();
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'id', name: 'Indonesia', flag: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/ID.svg' },
    { code: 'en', name: 'English', flag: 'https://purecatamphetamine.github.io/country-flag-icons/3x2/GB.svg' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-[4svh] cursor-pointer bg-[#DBE8F5] text-black px-[2svw] py-[1svh] rounded-lg font-semibold border border-black hover:bg-[#B8D4E8] transition-colors flex items-center justify-center"
      >
        <img 
          src={currentLang?.flag} 
          alt={currentLang?.name}
          className="w-[6svw] h-auto"
        />
        <span className="text-[2.5svw] ml-[1svw]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[80px]">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full px-[2svw] py-[1svh] hover:bg-gray-100 transition-colors flex items-center justify-center ${
                currentLanguage === language.code ? 'bg-blue-50' : ''
              }`}
            >
              <img 
                src={language.flag} 
                alt={language.name}
                className="w-[5svw] h-auto"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
