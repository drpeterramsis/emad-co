
import React from 'react';
import ToolCard from './ToolCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface ToolsGridProps {
  onToolClick: (toolId: string) => void;
  setBmiOpen: (v: boolean) => void;
  isAuthenticated: boolean;
}

const ToolsGrid: React.FC<ToolsGridProps> = ({ onToolClick, setBmiOpen, isAuthenticated }) => {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const isDoctor = profile?.role === 'doctor';

  const renderSector = (title: string, colorClass: string, children: React.ReactNode) => (
      <div className="mb-10">
          <div className={`flex items-center gap-3 mb-4 pb-2 border-b ${colorClass.replace('bg-', 'border-').replace('100', '200')}`}>
              <h3 className={`text-lg font-bold uppercase tracking-wider ${colorClass.replace('bg-', 'text-').replace('100', '800')}`}>{title}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {children}
          </div>
      </div>
  );

  return (
    <div>
        {/* Sector 1: Clinical Workspace (Green) */}
        {renderSector("Clinical Workspace", "bg-green-100", (
            <>
                {isDoctor && (
                    <ToolCard
                        title={t.tools.clients.title}
                        desc={t.tools.clients.desc}
                        onClick={() => onToolClick('client-manager')}
                        icon={<span className="text-2xl">👥</span>}
                        locked={!isAuthenticated}
                    />
                )}
                <ToolCard
                    title={t.tools.nfpe.title}
                    desc={t.tools.nfpe.desc}
                    onClick={() => onToolClick('nfpe')}
                    icon={<span className="text-2xl">🩺</span>}
                />
                <ToolCard
                    title={t.tools.strongKids.title}
                    desc={t.tools.strongKids.desc}
                    onClick={() => onToolClick('strong-kids')}
                    icon={<span className="text-2xl">👶</span>}
                />
            </>
        ))}

        {/* Sector 2: Body & Energy (Blue) */}
        {renderSector("Body & Energy", "bg-blue-100", (
            <>
                <ToolCard
                    title={t.tools.kcal.title}
                    desc={t.tools.kcal.desc}
                    onClick={() => onToolClick('kcal')}
                    icon={<span className="text-2xl">🔥</span>}
                />
                <ToolCard
                    title={t.tools.bmr.title}
                    desc={t.tools.bmr.desc}
                    onClick={() => onToolClick('bmr')}
                    icon={<span className="text-2xl">⚡</span>}
                />
                <ToolCard
                    title={t.tools.bmi.title}
                    desc={t.tools.bmi.desc}
                    onClick={() => setBmiOpen(true)}
                    icon={<span className="text-2xl font-bold">BMI</span>}
                />
                <ToolCard
                    title={t.tools.heightEstimator.title}
                    desc={t.tools.heightEstimator.desc}
                    onClick={() => onToolClick('height-estimator')}
                    icon={<span className="text-2xl">📏</span>}
                />
            </>
        ))}

        {/* Sector 3: Diet Planning (Orange) */}
        {renderSector("Diet Planning", "bg-orange-100", (
            <>
                <ToolCard
                    title={t.tools.mealPlanner.title}
                    desc={t.tools.mealPlanner.desc}
                    onClick={() => onToolClick('meal-planner')}
                    icon={<span className="text-2xl">📅</span>}
                />
                <ToolCard
                    title={t.tools.mealCreator.title}
                    desc={t.tools.mealCreator.desc}
                    onClick={() => onToolClick('meal-creator')}
                    icon={<span className="text-2xl">🥗</span>}
                    locked={!isAuthenticated}
                />
                <ToolCard
                    title={t.tools.exchangePro.title}
                    desc={t.tools.exchangePro.desc}
                    onClick={() => onToolClick('exchange-pro')}
                    icon={<span className="text-2xl">📊</span>}
                />
                <ToolCard
                    title={t.tools.exchangeSimple.title}
                    desc={t.tools.exchangeSimple.desc}
                    onClick={() => onToolClick('exchange-simple')}
                    icon={<span className="text-2xl">📋</span>}
                />
            </>
        ))}

        {/* Sector 4: Knowledge Hub (Purple) */}
        {renderSector("Knowledge Hub", "bg-purple-100", (
            <>
                <ToolCard
                    title={t.tools.encyclopedia.title}
                    desc={t.tools.encyclopedia.desc}
                    onClick={() => onToolClick('encyclopedia')}
                    icon={<span className="text-2xl">📚</span>}
                />
                <ToolCard
                    title={t.tools.labs.title}
                    desc={t.tools.labs.desc}
                    onClick={() => onToolClick('lab-reference')}
                    icon={<span className="text-2xl">🧬</span>}
                />
            </>
        ))}
    </div>
  );
};

export default ToolsGrid;
