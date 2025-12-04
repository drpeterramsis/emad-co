






import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import SideMenu from "./components/SideMenu"; // Import SideMenu
import ToolCard from "./components/ToolCard";
import BmiModal from "./components/BmiModal";
import KcalCalculator from "./components/calculations/KcalCalculator";
import MealCreator from "./components/tools/MealCreator";
import FoodExchange from "./components/tools/FoodExchange";
import { MealPlanner } from "./components/tools/MealPlanner";
import ClientManager from "./components/tools/ClientManager";
import BmrCalculator from "./components/tools/BmrCalculator";
import NFPEChecklist from "./components/tools/NFPEChecklist";
import Encyclopedia from "./components/tools/Encyclopedia";
import HeightEstimator from "./components/tools/HeightEstimator";
import LabReference from "./components/tools/LabReference";
import STRONGKids from "./components/tools/STRONGKids"; // Import STRONGKids
import Profile from "./components/Profile";
import UserDashboard from "./components/UserDashboard";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Login from "./components/Login";
import Loading from "./components/Loading";
import ToolsGrid from "./components/ToolsGrid";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Session } from "@supabase/supabase-js";
import { KcalInitialData } from "./components/calculations/hooks/useKcalCalculations";
import { Client, ClientVisit } from "./types";

const Dashboard = ({ 
  setBmiOpen, 
  onToolClick,
  session
}: { 
  setBmiOpen: (v: boolean) => void, 
  onToolClick: (toolId: string) => void,
  session: Session | null
}) => {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  
  return (
    <>
      {/* Hero Section */}
      <section className="relative text-center py-20 md:py-24 overflow-hidden bg-gradient-to-b from-[var(--color-bg-soft)] to-white">
        <div className="relative z-10 container mx-auto px-4 animate-fade-in">
          {session && (
              <div className="mb-4 inline-block px-4 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                {profile?.role === 'doctor' ? `👨‍⚕️ ${t.auth.doctor}` : `👤 ${t.auth.patient}`} : {profile?.full_name}
              </div>
          )}
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--color-heading)] mb-6 leading-tight">
            {t.home.welcome}
          </h2>
          <p className="text-lg md:text-xl text-[var(--color-text-light)] mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>
      </section>

      {/* Professional Sector Grid - 4 Columns */}
      <section id="sectors" className="container mx-auto px-4 -mt-16 relative z-20 mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Sector 1: Clinical Workspace */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border-t-4 border-green-600 hover:transform hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl bg-green-50 p-2 rounded-lg">🩺</span>
                      <h3 className="text-lg font-bold text-gray-800">Clinical Suite</h3>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 min-h-[32px]">Patient management, risk screening, and physical assessment.</p>
                  <div className="space-y-1.5">
                      <button onClick={() => onToolClick('client-manager')} className="w-full text-left px-3 py-2 rounded hover:bg-green-50 text-green-700 font-bold text-xs flex items-center justify-between">
                          <span>Patient Manager</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('strong-kids')} className="w-full text-left px-3 py-2 rounded hover:bg-green-50 text-green-700 font-bold text-xs flex items-center justify-between">
                          <span>STRONGkids Tool</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('nfpe')} className="w-full text-left px-3 py-2 rounded hover:bg-green-50 text-green-700 font-bold text-xs flex items-center justify-between">
                          <span>NFPE Assessment</span> <span>→</span>
                      </button>
                  </div>
              </div>

              {/* Sector 2: Body & Energy */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border-t-4 border-blue-600 hover:transform hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl bg-blue-50 p-2 rounded-lg">⚡</span>
                      <h3 className="text-lg font-bold text-gray-800">Body & Energy</h3>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 min-h-[32px]">Calculators for calories, BMR, BMI, and anthropometry.</p>
                  <div className="space-y-1.5">
                      <button onClick={() => onToolClick('kcal')} className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-between">
                          <span>Kcal Calculator</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('bmr')} className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-between">
                          <span>BMR Calculator</span> <span>→</span>
                      </button>
                      <button onClick={() => setBmiOpen(true)} className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-between">
                          <span>BMI Calculator</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('height-estimator')} className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-between">
                          <span>Height Estimator</span> <span>→</span>
                      </button>
                  </div>
              </div>

              {/* Sector 3: Diet & Planning */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border-t-4 border-orange-500 hover:transform hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl bg-orange-50 p-2 rounded-lg">🥗</span>
                      <h3 className="text-lg font-bold text-gray-800">Diet Planning</h3>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 min-h-[32px]">Create meals, plan diets, and check food exchanges.</p>
                  <div className="space-y-1.5">
                      <button onClick={() => onToolClick('meal-planner')} className="w-full text-left px-3 py-2 rounded hover:bg-orange-50 text-orange-700 font-bold text-xs flex items-center justify-between">
                          <span>Meal Planner</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('meal-creator')} className="w-full text-left px-3 py-2 rounded hover:bg-orange-50 text-orange-700 font-bold text-xs flex items-center justify-between">
                          <span>Meal Creator</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('exchange-pro')} className="w-full text-left px-3 py-2 rounded hover:bg-orange-50 text-orange-700 font-bold text-xs flex items-center justify-between">
                          <span>Food Exchanges</span> <span>→</span>
                      </button>
                  </div>
              </div>

              {/* Sector 4: Knowledge Base */}
              <div className="bg-white rounded-2xl shadow-xl p-5 border-t-4 border-purple-600 hover:transform hover:-translate-y-1 transition duration-300">
                  <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl bg-purple-50 p-2 rounded-lg">📚</span>
                      <h3 className="text-lg font-bold text-gray-800">Knowledge Hub</h3>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 min-h-[32px]">Reference data for labs, drugs, vitamins, and minerals.</p>
                  <div className="space-y-1.5">
                      <button onClick={() => onToolClick('encyclopedia')} className="w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-between">
                          <span>Encyclopedia (Vits/Drugs)</span> <span>→</span>
                      </button>
                      <button onClick={() => onToolClick('lab-reference')} className="w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-purple-700 font-bold text-xs flex items-center justify-between">
                          <span>Lab Reference</span> <span>→</span>
                      </button>
                  </div>
              </div>

          </div>
      </section>

      {/* Tools Section (Hidden ID for scrolling logic) */}
      <div id="tools"></div>
    </>
  );
};

const AppContent = () => {
  const [bmiOpen, setBmiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // State for Side Menu
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [previousTool, setPreviousTool] = useState<string | null>(null);
  const [plannedKcal, setPlannedKcal] = useState<number>(0);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  
  const [autoOpenLoad, setAutoOpenLoad] = useState(false);
  const [autoOpenNew, setAutoOpenNew] = useState(false);

  const [toolData, setToolData] = useState<any>(null);
  const [currentVisit, setCurrentVisit] = useState<{client: Client, visit: ClientVisit} | null>(null);
  const [currentClientForNFPE, setCurrentClientForNFPE] = useState<Client | undefined>(undefined);
  
  const { t, isRTL } = useLanguage();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (activeTool) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTool]);

  useEffect(() => {
    if (session) {
        setShowLogin(false);
    }
  }, [session]);

  if (loading) {
    return <Loading fullScreen text="Initializing Diet-Nova..." />;
  }

  const handleNavHome = () => {
    setActiveTool(null);
    setPreviousTool(null);
    setSelectedLoadId(null);
    setToolData(null);
    setCurrentVisit(null);
    setCurrentClientForNFPE(undefined);
    setAutoOpenLoad(false);
    setAutoOpenNew(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavTools = () => {
    if (activeTool) {
      handleNavHome();
    }
    setTimeout(() => {
      document.getElementById('sectors')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleNavProfile = () => {
      setActiveTool('profile');
  };

  const handleToolClick = (toolId: string, loadId?: string, action?: 'load' | 'new') => {
      if (toolId === 'home') {
          handleNavHome();
          return;
      }
      if (toolId === 'profile') {
          handleNavProfile();
          return;
      }
      
      if (toolId === 'meal-creator' && !session) {
          setShowLogin(true);
          return;
      }
      if (toolId === 'client-manager') {
        if (!session) {
            setShowLogin(true);
            return;
        }
        if (profile?.role !== 'doctor') {
            alert("Access Restricted: This tool is for nutritionists only.");
            return;
        }
      }
      if (loadId) {
          setSelectedLoadId(loadId);
      } else {
          setSelectedLoadId(null);
      }
      
      setAutoOpenLoad(action === 'load');
      setAutoOpenNew(action === 'new');

      setToolData(null); 
      setCurrentVisit(null); 
      setCurrentClientForNFPE(undefined); 
      setActiveTool(toolId);
  };

  const handlePlanMeals = (kcal: number) => {
    setPlannedKcal(kcal);
    setPreviousTool(activeTool);
    setActiveTool('meal-planner');
  };

  const handleAnalyzeClient = (client: Client, visit: ClientVisit) => {
      const initData: KcalInitialData = {
          gender: client.gender,
          age: client.age,
          dob: client.dob,
          weight: visit.weight || client.weight,
          height: visit.height || client.height
      };
      setToolData(initData);
      setCurrentVisit({ client, visit });
      setActiveTool('kcal');
  };

  const handlePlanMealsForClient = (client: Client, visit: ClientVisit) => {
      setCurrentVisit({ client, visit });
      setActiveTool('meal-planner');
  };

  const handleRunNFPEForClient = (client: Client) => {
      setCurrentClientForNFPE(client);
      setActiveTool('nfpe');
  };

  const handleBackToCalculator = () => {
    if (previousTool) {
      setActiveTool(previousTool);
      setPreviousTool(null);
    }
  };

  const handleBackToClientProfile = () => {
     if (currentVisit) {
         setActiveTool('client-manager');
         setSelectedLoadId(currentVisit.client.id); 
         setCurrentVisit(null); 
     }
  };

  const handleBackFromNFPE = () => {
      if (currentClientForNFPE) {
          setActiveTool('client-manager');
          setSelectedLoadId(currentClientForNFPE.id);
          setCurrentClientForNFPE(undefined);
      } else {
          handleNavHome();
      }
  };

  const showKcal = activeTool === 'kcal';
  const showPlanner = activeTool === 'meal-planner';
  const isComplexFlow = showKcal || showPlanner;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--color-bg)]">
      <Header 
        onNavigateHome={handleNavHome} 
        onNavigateTools={handleNavTools}
        onNavigateProfile={handleNavProfile}
        onLoginClick={() => setShowLogin(true)}
        onMenuClick={() => setMenuOpen(true)}
      />

      <SideMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        onNavigate={handleToolClick} 
        onLoginClick={() => setShowLogin(true)}
      />

      <main className="flex-grow">
        {activeTool ? (
          <div className="container mx-auto px-4 py-8 pb-24 animate-fade-in">
            <div className="flex items-center justify-between mb-6 no-print">
                <button 
                  onClick={handleNavHome}
                  className="flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium transition group"
                >
                  <span className={`text-xl transform transition-transform ${isRTL ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`}>
                    ←
                  </span>
                  {t.common.backHome}
                </button>
                
                {currentVisit && isComplexFlow && (
                    <div className="flex items-center gap-3">
                         <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-xs font-bold shadow-sm hidden sm:flex items-center gap-2">
                             <span>👥 Client Mode: {currentVisit.client.full_name}</span>
                         </div>
                         <button 
                             onClick={handleBackToClientProfile}
                             className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
                         >
                             <span>👤</span> Back to Profile
                         </button>
                    </div>
                )}
            </div>
            
            {isComplexFlow && (
              <>
                <div className={showKcal ? 'block' : 'hidden'}>
                  <KcalCalculator 
                    onPlanMeals={handlePlanMeals} 
                    initialData={toolData} 
                    activeVisit={currentVisit} 
                  />
                </div>
                <div className={showPlanner ? 'block' : 'hidden'}>
                  <MealPlanner 
                    initialTargetKcal={plannedKcal} 
                    onBack={previousTool === 'kcal' ? handleBackToCalculator : undefined}
                    initialLoadId={activeTool === 'meal-planner' ? selectedLoadId : null}
                    autoOpenLoad={autoOpenLoad}
                    autoOpenNew={autoOpenNew}
                    activeVisit={currentVisit} 
                  />
                </div>
              </>
            )}

            {activeTool === 'meal-creator' && (
                <MealCreator 
                    initialLoadId={selectedLoadId} 
                    autoOpenLoad={autoOpenLoad}
                    autoOpenNew={autoOpenNew}
                />
            )}
            {activeTool === 'exchange-simple' && <FoodExchange mode="simple" />}
            {activeTool === 'exchange-pro' && <FoodExchange mode="pro" />}
            {activeTool === 'client-manager' && (
                <ClientManager 
                    initialClientId={selectedLoadId} 
                    onAnalyzeInKcal={handleAnalyzeClient}
                    onPlanMeals={handlePlanMealsForClient}
                    onRunNFPE={handleRunNFPEForClient}
                    autoOpenNew={autoOpenNew}
                />
            )}
            {activeTool === 'bmr' && <BmrCalculator />}
            {activeTool === 'profile' && <Profile />}
            {activeTool === 'nfpe' && (
                <NFPEChecklist 
                    client={currentClientForNFPE} 
                    onBack={currentClientForNFPE ? handleBackFromNFPE : undefined} 
                />
            )}
            {activeTool === 'strong-kids' && (
                <STRONGKids onClose={handleNavHome} />
            )}
            {activeTool === 'encyclopedia' && <Encyclopedia />}
            {activeTool === 'lab-reference' && <LabReference />}
            {activeTool === 'height-estimator' && (
                <HeightEstimator 
                    onClose={handleNavHome} 
                />
            )}

          </div>
        ) : (
           session ? (
             <UserDashboard onNavigateTool={handleToolClick} setBmiOpen={setBmiOpen} />
           ) : (
             <Dashboard setBmiOpen={setBmiOpen} onToolClick={handleToolClick} session={session} />
           )
        )}
      </main>

      <div className="no-print">
        <ScrollToTopButton />
      </div>

      {/* Hidden button for SideMenu to trigger BMI */}
      <button id="bmi-btn" className="hidden" onClick={() => setBmiOpen(true)}></button>

      <BmiModal open={bmiOpen} onClose={() => setBmiOpen(false)} />
      
      {showLogin && (
        <Login onClose={() => setShowLogin(false)} />
      )}
      
      <Footer />
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
