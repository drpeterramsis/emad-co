
import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[var(--color-primary-dark)] text-white py-1.5 z-40 no-print">
      <div className="text-center">
        <p className="text-[9px] tracking-wide px-4 opacity-90 leading-tight">
          © 2025 Diet-Nova | Dr. Peter Ramsis - v2.0.125
          <span className="mx-2 text-[var(--color-primary-light)] opacity-50">|</span>
          <span className="text-[9px] text-[var(--color-primary-light)] opacity-80 uppercase">
            {t.common.copyright} 
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;