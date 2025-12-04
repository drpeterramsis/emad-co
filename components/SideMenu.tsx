
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (toolId: string) => void;
  onLoginClick: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onNavigate, onLoginClick }) => {
  const { t, isRTL } = useLanguage();
  const { session, profile, signOut } = useAuth();

  const isDoctor = profile?.role === 'doctor';

  const handleNav = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-full w-80 bg-white shadow-2xl z-[100] transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-[var(--color-heading)]">
              Diet<span className="text-[var(--color-primary)]">Nova</span>
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* User Info */}
          {session ? (
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <div className="font-bold text-gray-800">{profile?.full_name}</div>
              <div className="text-xs text-gray-500">{session.user.email}</div>
              <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full capitalize">
                {profile?.role === 'doctor' ? t.auth.doctor : t.auth.patient}
              </span>
            </div>
          ) : (
            <button 
              onClick={() => { onLoginClick(); onClose(); }}
              className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold shadow-md mb-6 hover:bg-[var(--color-primary-hover)] transition"
            >
              {t.header.login}
            </button>
          )}

          {/* Navigation Links */}
          <nav className="flex-grow space-y-1">
            <button onClick={() => handleNav('home')} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-medium">
              <span>🏠</span> {t.header.home}
            </button>
            
            {session && (
                <button onClick={() => handleNav('profile')} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 flex items-center gap-3 text-gray-700 font-medium">
                <span>👤</span> Profile Settings
                </button>
            )}

            {/* 1. Clinical Workspace */}
            <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Clinical Workspace</p>
                {isDoctor && (
                    <button onClick={() => handleNav('client-manager')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 flex items-center gap-3 text-gray-600 text-sm">
                    <span>👥</span> {t.tools.clients.title}
                    </button>
                )}
                <button onClick={() => handleNav('nfpe')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>🩺</span> {t.tools.nfpe.title}
                </button>
                <button onClick={() => handleNav('strong-kids')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>👶</span> {t.tools.strongKids.title}
                </button>
            </div>

            {/* 2. Body & Energy */}
            <div className="pt-2 pb-2 border-t border-gray-50">
                <p className="px-4 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 mt-2">Body & Energy</p>
                <button onClick={() => handleNav('kcal')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>🔥</span> {t.tools.kcal.title}
                </button>
                <button onClick={() => handleNav('bmr')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>⚡</span> {t.tools.bmr.title}
                </button>
                <button onClick={() => { onClose(); const btn = document.getElementById('bmi-btn'); if(btn) btn.click(); }} className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>⚖️</span> {t.tools.bmi.title}
                </button>
                <button onClick={() => handleNav('height-estimator')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>📏</span> {t.tools.heightEstimator.title}
                </button>
            </div>

            {/* 3. Diet Planning */}
            <div className="pt-2 pb-2 border-t border-gray-50">
                <p className="px-4 text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 mt-2">Diet Planning</p>
                <button onClick={() => handleNav('meal-planner')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>📅</span> {t.tools.mealPlanner.title}
                </button>
                <button onClick={() => handleNav('meal-creator')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>🥗</span> {t.tools.mealCreator.title}
                </button>
                <button onClick={() => handleNav('exchange-pro')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-orange-50 hover:text-orange-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>📋</span> {t.tools.exchangePro.title}
                </button>
            </div>

            {/* 4. Knowledge Base */}
            <div className="pt-2 pb-2 border-t border-gray-50">
                <p className="px-4 text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 mt-2">Knowledge Base</p>
                <button onClick={() => handleNav('encyclopedia')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>📚</span> {t.tools.encyclopedia.title}
                </button>
                <button onClick={() => handleNav('lab-reference')} className="w-full text-left px-4 py-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 flex items-center gap-3 text-gray-600 text-sm">
                <span>🧬</span> {t.tools.labs.title}
                </button>
            </div>
          </nav>

          {/* Footer Actions */}
          {session && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <button 
                onClick={() => { signOut(); onClose(); }}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-3 font-medium"
              >
                <span>🚪</span> {t.common.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SideMenu;
