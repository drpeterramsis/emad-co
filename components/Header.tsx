
import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  onNavigateHome?: () => void;
  onNavigateTools?: () => void;
  onNavigateProfile?: () => void;
  onLoginClick?: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateHome, onNavigateTools, onNavigateProfile, onLoginClick, onMenuClick }) => {
  const { t, lang, toggleLanguage } = useLanguage();
  const { session, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLLIElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
      setShowUserMenu(false);
      signOut();
  };

  return (
    <header className="bg-[var(--color-primary)] text-white shadow-md sticky top-0 z-50 no-print">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu */}
          <button 
            onClick={onMenuClick}
            className="p-1 hover:bg-white/10 rounded-lg transition focus:outline-none"
            aria-label="Open Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
            <h1 className="text-2xl font-bold tracking-wide flex items-center">
              Diet<span className="text-[var(--color-primary-light)]">Nova</span>
              <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
                v2.0.125
              </span>
            </h1>
          </div>
        </div>

        <nav>
          <ul className="flex items-center space-x-4 rtl:space-x-reverse text-lg">
             <li>
                  <button 
                    onClick={onNavigateHome}
                    className="hover:text-[var(--color-primary-light)] transition hidden md:block"
                  >
                    {t.header.home}
                  </button>
                </li>
                <li className="hidden md:block">
                  <button 
                    onClick={onNavigateTools}
                    className="hover:text-[var(--color-primary-light)] transition"
                  >
                    {t.header.tools}
                  </button>
                </li>
            <li>
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition text-sm font-medium"
              >
                <span>{lang === 'en' ? '🇺🇸' : '🇪🇬'}</span>
                <span>{lang === 'en' ? 'AR' : 'EN'}</span>
              </button>
            </li>
            {session ? (
                <li className="relative" ref={menuRef}>
                   <button 
                     onClick={() => setShowUserMenu(!showUserMenu)}
                     className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                   >
                     <span>👤</span>
                     <span className="hidden md:inline max-w-[100px] truncate">
                       {profile?.full_name || session.user.email?.split('@')[0]}
                     </span>
                     <span className="text-xs opacity-75">▼</span>
                   </button>

                   {/* User Dropdown Menu */}
                   {showUserMenu && (
                     <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-1 text-gray-800 animate-fade-in border border-gray-100 z-50 ltr:right-0 rtl:left-0 rtl:right-auto">
                        <div className="px-4 py-3 border-b border-gray-100">
                           <p className="text-sm font-bold text-gray-900 truncate">{profile?.full_name}</p>
                           <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                           <div className="mt-1 text-xs inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-full capitalize">
                              {profile?.role === 'doctor' ? t.auth.doctor : t.auth.patient}
                           </div>
                        </div>
                        <button 
                           onClick={() => { 
                               if(onNavigateProfile) onNavigateProfile(); 
                               setShowUserMenu(false); 
                           }}
                           className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition"
                        >
                           <span>📄</span> View Profile
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button 
                           onClick={handleLogout}
                           className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                        >
                           <span>🚪</span> {t.common.logout}
                        </button>
                     </div>
                   )}
                </li>
            ) : (
                <li>
                   <button 
                    onClick={onLoginClick}
                    className="bg-white text-[var(--color-primary)] hover:bg-gray-100 px-4 py-1 rounded-lg transition text-sm font-bold shadow-sm"
                   >
                     {t.header.login}
                   </button>
                </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;