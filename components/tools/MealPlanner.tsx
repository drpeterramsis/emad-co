
import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProgressBar, MacroDonut } from '../Visuals';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SavedMeal, Client, ClientVisit } from '../../types';

const GROUP_FACTORS: Record<string, { cho: number; pro: number; fat: number; kcal: number }> = {
  starch: { cho: 15, pro: 3, fat: 0, kcal: 80 },
  veg: { cho: 5, pro: 2, fat: 0, kcal: 25 },
  fruit: { cho: 15, pro: 0, fat: 0, kcal: 60 },
  meatLean: { cho: 0, pro: 7, fat: 3, kcal: 45 },
  meatMed: { cho: 0, pro: 7, fat: 5, kcal: 75 },
  meatHigh: { cho: 0, pro: 7, fat: 8, kcal: 100 },
  milkSkim: { cho: 15, pro: 8, fat: 3, kcal: 100 },
  milkLow: { cho: 15, pro: 8, fat: 5, kcal: 120 },
  milkWhole: { cho: 15, pro: 8, fat: 8, kcal: 160 },
  legumes: { cho: 15, pro: 7, fat: 0, kcal: 110 },
  fats: { cho: 0, pro: 0, fat: 5, kcal: 45 },
  sugar: { cho: 5, pro: 0, fat: 0, kcal: 20 },
};

const GROUPS = Object.keys(GROUP_FACTORS);
const MEALS = ['snack1', 'breakfast', 'snack2', 'lunch', 'snack3', 'dinner', 'snack4'];

// --- Extracted Component to prevent re-renders/focus loss ---
interface TargetKcalInputProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
}

const TargetKcalInput: React.FC<TargetKcalInputProps> = ({ value, onChange, label }) => (
    <div className="mb-6">
        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">{label}</label>
        <div className="relative">
            <input 
                type="number" 
                className="w-full p-2 border-2 border-[var(--color-primary)] rounded-lg text-center font-bold text-xl text-[var(--color-primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)] bg-white"
                placeholder="0"
                value={value || ''} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                dir="ltr"
            />
            <span className="absolute right-3 top-3 text-gray-400 text-xs font-medium">Kcal</span>
        </div>
    </div>
);

interface MealPlannerProps {
  initialTargetKcal?: number;
  onBack?: () => void;
  initialLoadId?: string | null;
  autoOpenLoad?: boolean;
  autoOpenNew?: boolean;
  activeVisit?: { client: Client, visit: ClientVisit } | null;
}

export const MealPlanner: React.FC<MealPlannerProps> = ({ initialTargetKcal, onBack, initialLoadId, autoOpenLoad, autoOpenNew, activeVisit }) => {
  const { t, isRTL } = useLanguage();
  const { session } = useAuth();
  const [viewMode, setViewMode] = useState<'calculator' | 'planner' | 'both'>('calculator');
  
  // --- Saving/Loading UI State ---
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string>('');
  const [savedPlans, setSavedPlans] = useState<SavedMeal[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [loadSearchQuery, setLoadSearchQuery] = useState('');

  // State for Calculator Input (Servings)
  const [servings, setServings] = useState<Record<string, number>>(
    GROUPS.reduce((acc, group) => ({ ...acc, [group]: 0 }), {})
  );

  // State for Targets
  const [targetKcal, setTargetKcal] = useState<number>(0);
  const [manualGm, setManualGm] = useState({ cho: 0, pro: 0, fat: 0 });
  const [manualPerc, setManualPerc] = useState({ cho: 0, pro: 0, fat: 0 });
  const [activeTargetTab, setActiveTargetTab] = useState<'none' | 'gm' | 'perc'>('none');

  // Initialize target if provided prop
  useEffect(() => {
    if (initialTargetKcal && initialTargetKcal > 0) {
      setTargetKcal(initialTargetKcal);
    }
  }, [initialTargetKcal]);

  // Filter Saved Plans Logic
  const filteredSavedPlans = useMemo(() => {
    if (!loadSearchQuery) return savedPlans;
    const q = loadSearchQuery.toLowerCase();
    return savedPlans.filter(plan => plan.name.toLowerCase().includes(q));
  }, [savedPlans, loadSearchQuery]);

  // Auto-load effect
  useEffect(() => {
      const autoLoad = async () => {
          if (initialLoadId && session) {
              try {
                  const { data, error } = await supabase
                    .from('saved_meals')
                    .select('*')
                    .eq('id', initialLoadId)
                    .eq('user_id', session.user.id)
                    .single();
                  
                  if (data && !error) {
                      loadPlan(data);
                  }
              } catch (err) {
                  console.error("Auto-load failed", err);
              }
          }
      };
      autoLoad();
  }, [initialLoadId, session]);

  // --- Hydrate from Visit Data (if activeVisit exists) ---
  useEffect(() => {
      if (activeVisit?.visit.meal_plan_data) {
          const data = activeVisit.visit.meal_plan_data;
          if (data.servings) setServings(data.servings);
          if (data.distribution) setDistribution(data.distribution);
          if (data.targetKcal) setTargetKcal(data.targetKcal);
          if (data.manualGm) setManualGm(data.manualGm);
          if (data.manualPerc) setManualPerc(data.manualPerc);
      }
  }, [activeVisit]);

  // Handle Auto Open
  useEffect(() => {
      if (autoOpenLoad && session) {
          fetchPlans();
          setShowLoadModal(true);
      }
      if (autoOpenNew) {
          resetAll();
      }
  }, [autoOpenLoad, autoOpenNew, session]);

  // State for Planner Distribution
  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>(
    GROUPS.reduce((acc, group) => ({
      ...acc,
      [group]: MEALS.reduce((mAcc, meal) => ({ ...mAcc, [meal]: 0 }), {})
    }), {})
  );

  // --- Calculations ---
  const calcTotals = useMemo(() => {
    let cho = 0, pro = 0, fat = 0, kcal = 0;
    GROUPS.forEach(g => {
      const s = servings[g] || 0;
      cho += s * GROUP_FACTORS[g].cho;
      pro += s * GROUP_FACTORS[g].pro;
      fat += s * GROUP_FACTORS[g].fat;
      kcal += s * GROUP_FACTORS[g].kcal;
    });
    return { cho, pro, fat, kcal };
  }, [servings]);

  const distTotals = useMemo(() => {
      let cho = 0, pro = 0, fat = 0, kcal = 0;
      GROUPS.forEach(g => {
          MEALS.forEach(m => {
              const s = distribution[g][m] || 0;
              cho += s * GROUP_FACTORS[g].cho;
              pro += s * GROUP_FACTORS[g].pro;
              fat += s * GROUP_FACTORS[g].fat;
              kcal += s * GROUP_FACTORS[g].kcal;
          });
      });
      return { cho, pro, fat, kcal };
  }, [distribution]);

  const rowRemains = useMemo(() => {
    const remains: Record<string, number> = {};
    GROUPS.forEach(g => {
        const totalDist = MEALS.reduce((acc, m) => acc + (distribution[g][m] || 0), 0);
        remains[g] = (servings[g] || 0) - totalDist;
    });
    return remains;
  }, [servings, distribution]);

  // --- Handlers ---
  const updateServing = (group: string, val: number) => {
    setServings(prev => ({ ...prev, [group]: val }));
  };

  const updateDistribution = (group: string, meal: string, val: number) => {
    setDistribution(prev => ({
      ...prev,
      [group]: { ...prev[group], [meal]: val }
    }));
  };

  const handlePrint = () => {
      window.print();
  };

  // --- Database Operations ---
  const fetchPlans = async () => {
      if (!session) return;
      setIsLoadingPlans(true);
      setLoadSearchQuery(''); // Reset search on open
      try {
          const { data, error } = await supabase
            .from('saved_meals')
            .select('*')
            .eq('tool_type', 'meal-planner')
            .eq('user_id', session.user.id) // Explicit user filtering
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (data) setSavedPlans(data);
      } catch (err) {
          console.error('Error fetching plans:', err);
          setStatusMsg("Error loading plans.");
      } finally {
          setIsLoadingPlans(false);
      }
  };

  const savePlan = async () => {
      if (!planName.trim()) {
          alert("Please enter a name for the meal plan.");
          return;
      }
      if (!session) return;
      
      const planData = {
          servings,
          distribution,
          targetKcal,
          manualGm,
          manualPerc
      };
      const timestamp = new Date().toISOString();

      // Logic: If loadedPlanId is present AND name is the same -> Update.
      // If name changes, create NEW (Save As).
      const isUpdate = loadedPlanId && (planName === lastSavedName);
      
      try {
          let data;
          if (isUpdate) {
             // Explicit UPDATE
             const updatePayload = {
                name: planName,
                data: planData,
             };

             const response = await supabase
                .from('saved_meals')
                .update(updatePayload)
                .eq('id', loadedPlanId)
                .eq('user_id', session.user.id)
                .select();

             if (response.error) throw response.error;
             
             // Verify update succeeded
             if (!response.data || response.data.length === 0) {
                throw new Error("Update failed: Plan not found or permission denied (RLS).");
             }
             data = response.data[0];
          } else {
             // Explicit INSERT
             const insertPayload = {
                user_id: session.user.id,
                name: planName,
                tool_type: 'meal-planner',
                data: planData,
                created_at: timestamp
             };

             const response = await supabase
                .from('saved_meals')
                .insert(insertPayload)
                .select()
                .single();
             
             if (response.error) throw response.error;
             data = response.data;
          }
              
          if (data) {
              setLoadedPlanId(data.id);
              setLastSavedName(data.name);
              if (isUpdate) {
                  setStatusMsg("Plan Updated Successfully!");
              } else {
                  setStatusMsg("Plan Saved as New Entry!");
              }
          }

          fetchPlans();
          setTimeout(() => setStatusMsg(''), 3000);
      } catch (err: any) {
          console.error('Error saving plan:', err);
          setStatusMsg("Failed to save: " + err.message);
      }
  };

  const handleSaveToVisit = async () => {
      if (!activeVisit) return;
      setStatusMsg('Saving to Client Visit...');

      const planData = {
          servings,
          distribution,
          targetKcal,
          manualGm,
          manualPerc
      };

      try {
          const { error } = await supabase
            .from('client_visits')
            .update({ meal_plan_data: planData })
            .eq('id', activeVisit.visit.id);

          if (error) throw error;
          setStatusMsg('Saved to Client Visit Record!');
          setTimeout(() => setStatusMsg(''), 3000);
      } catch (err: any) {
          console.error(err);
          setStatusMsg('Error Saving to Visit: ' + err.message);
      }
  };

  const loadPlan = (plan: SavedMeal) => {
      if (!plan.data) return;
      // Ensure we replace state completely
      setServings({ ...plan.data.servings } || {});
      setDistribution({ ...plan.data.distribution } || {});
      setTargetKcal(plan.data.targetKcal || 0);
      setManualGm(plan.data.manualGm || {cho:0, pro:0, fat:0});
      setManualPerc(plan.data.manualPerc || {cho:0, pro:0, fat:0});
      setPlanName(plan.name);
      setLoadedPlanId(plan.id);
      setLastSavedName(plan.name);
      
      setShowLoadModal(false);
      setStatusMsg(t.common.loadSuccess);
      setTimeout(() => setStatusMsg(''), 3000);
  };

  const deletePlan = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this plan?")) return;
      try {
          const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', session?.user.id);
          if (error) throw error;
          setSavedPlans(prev => prev.filter(p => p.id !== id));
          if (loadedPlanId === id) {
              setLoadedPlanId(null);
              setPlanName('');
              setLastSavedName('');
          }
      } catch (err) {
          console.error("Error deleting:", err);
      }
  };

  const resetAll = () => {
      setServings(GROUPS.reduce((acc, group) => ({ ...acc, [group]: 0 }), {}));
      setDistribution(GROUPS.reduce((acc, group) => ({
          ...acc,
          [group]: MEALS.reduce((mAcc, meal) => ({ ...mAcc, [meal]: 0 }), {})
      }), {}));
      setTargetKcal(0);
      setPlanName('');
      setLoadedPlanId(null);
      setLastSavedName('');
  };

  return (
    <div className="max-w-[1920px] mx-auto animate-fade-in">
      
      {/* Active Visit Toolbar */}
      {activeVisit && (
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm no-print">
              <div>
                  <h3 className="font-bold text-purple-800 text-lg">
                     Client: {activeVisit.client.full_name}
                  </h3>
                  <p className="text-sm text-purple-600 flex flex-wrap gap-3">
                     <span>Visit Date: {new Date(activeVisit.visit.visit_date).toLocaleDateString('en-GB')}</span>
                     <span>•</span>
                     <span>Clinic: {activeVisit.client.clinic || 'N/A'}</span>
                  </p>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSaveToVisit}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg shadow font-bold transition flex items-center gap-2"
                  >
                      <span>💾</span> Save to Visit
                  </button>
              </div>
          </div>
      )}

      {/* Top Control Bar (Static, Non-Floating) */}
      <div className="relative flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
           {onBack && (
               <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap">
                   <span>←</span> {t.common.backToCalculator}
               </button>
           )}
           <h1 className="text-2xl font-bold text-[var(--color-heading)] hidden xl:block whitespace-nowrap">{t.tools.mealPlanner.title}</h1>
           
           {/* Plan Name Input - Disable in Visit Mode if preferred, but keeping enabled allows template saving */}
           <div className="relative flex-grow md:flex-grow-0">
                <input 
                    type="text"
                    placeholder="Enter Plan Name..."
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-gray-800 font-medium"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✎</span>
           </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('calculator')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'calculator' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.mealPlannerTool.modeCalculator}
            </button>
            <button 
                onClick={() => setViewMode('planner')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'planner' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                {t.mealPlannerTool.modePlanner}
            </button>
        </div>

        <div className="flex gap-2 items-center">
            {session && (
                <>
                <button 
                    onClick={() => savePlan()}
                    className="bg-blue-500 hover:bg-blue-600 text-white w-10 h-10 rounded-lg transition flex items-center justify-center shadow-sm"
                    title={t.common.save + " (As Template)"}
                >
                    <span className="text-xl">💾</span>
                </button>
                <button 
                    onClick={() => {
                        fetchPlans();
                        setShowLoadModal(true);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 text-white w-10 h-10 rounded-lg transition flex items-center justify-center shadow-sm"
                    title={t.common.load + " (Template)"}
                >
                    <span className="text-xl">📂</span>
                </button>
                </>
            )}
             <button 
                onClick={handlePrint}
                className="bg-gray-700 hover:bg-gray-800 text-white w-10 h-10 rounded-lg transition flex items-center justify-center shadow-sm"
                title="Print Plan"
            >
                <span className="text-xl">🖨️</span>
            </button>
            <button 
                onClick={resetAll}
                className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
                {t.common.reset}
            </button>
        </div>
      </div>

      {statusMsg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center no-print">{statusMsg}</div>}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Content */}
        <div className={`transition-all duration-300 ${viewMode === 'calculator' ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'}`}>
            
            {/* CALCULATOR TABLE */}
            {viewMode === 'calculator' && (
                 <div className="card bg-white shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-primary)] text-white">
                                <tr>
                                    <th className="p-3 text-left w-1/4">{t.mealPlannerTool.foodGroup}</th>
                                    <th className="p-3 text-center w-24">{t.mealPlannerTool.serves}</th>
                                    <th className="p-3 text-center">{t.mealPlannerTool.cho}</th>
                                    <th className="p-3 text-center">{t.mealPlannerTool.pro}</th>
                                    <th className="p-3 text-center">{t.mealPlannerTool.fat}</th>
                                    <th className="p-3 text-center bg-[var(--color-primary-dark)]">{t.mealPlannerTool.kcal}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {GROUPS.map(group => {
                                    const s = servings[group] || 0;
                                    const f = GROUP_FACTORS[group];
                                    return (
                                        <tr key={group} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-700 flex items-center gap-2">
                                                {t.mealPlannerTool.groups[group as keyof typeof t.mealPlannerTool.groups]}
                                            </td>
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="number"
                                                    min="0" step="0.5"
                                                    className="w-20 p-1.5 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                                                    value={s || ''}
                                                    onChange={(e) => updateServing(group, parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="p-3 text-center text-gray-500">{(s * f.cho).toFixed(1)}</td>
                                            <td className="p-3 text-center text-gray-500">{(s * f.pro).toFixed(1)}</td>
                                            <td className="p-3 text-center text-gray-500">{(s * f.fat).toFixed(1)}</td>
                                            <td className="p-3 text-center font-mono font-bold text-[var(--color-primary)]">{(s * f.kcal).toFixed(0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                 </div>
            )}

            {/* PLANNER TABLE */}
            {viewMode === 'planner' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Planner Main Table */}
                    <div className="flex-grow card bg-white shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 text-left min-w-[120px]">{t.mealPlannerTool.foodGroup}</th>
                                        {MEALS.map(m => (
                                            <th key={m} className="p-2 text-center min-w-[60px]">
                                                {t.mealPlannerTool.meals[m as keyof typeof t.mealPlannerTool.meals]}
                                            </th>
                                        ))}
                                        <th className="p-2 text-center bg-gray-700 min-w-[60px]">{t.mealPlannerTool.meals.remain}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {GROUPS.map(group => {
                                        const rem = rowRemains[group];
                                        const isOver = rem < 0;
                                        const isComplete = rem === 0 && servings[group] > 0;

                                        return (
                                            <tr key={group} className="hover:bg-gray-50">
                                                <td className="p-2 font-medium text-gray-700 border-r border-gray-100 bg-gray-50 sticky left-0 z-10">
                                                    {t.mealPlannerTool.groups[group as keyof typeof t.mealPlannerTool.groups]}
                                                    <div className="text-[10px] text-gray-400 font-normal no-print">Total: {servings[group]}</div>
                                                </td>
                                                {MEALS.map(meal => (
                                                    <td key={meal} className="p-1 text-center border-r border-gray-100">
                                                        <input 
                                                            type="number"
                                                            className="w-full h-8 text-center bg-transparent focus:bg-blue-50 outline-none rounded hover:bg-gray-100 transition"
                                                            placeholder="-"
                                                            value={distribution[group][meal] || ''}
                                                            onChange={(e) => updateDistribution(group, meal, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                ))}
                                                <td className={`p-2 text-center font-bold border-l-2 ${isOver ? 'bg-red-50 text-red-600 border-red-200' : isComplete ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                    {rem.toFixed(1)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Planner Sidebar (Inside Grid for Planner Mode) */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-4 no-print">
                         <div className="card bg-white p-4 sticky top-24">
                            <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Planner Snapshot</h3>
                            <TargetKcalInput value={targetKcal} onChange={setTargetKcal} label={t.kcal.kcalRequired} />
                            
                            <div className="mb-6">
                                <MacroDonut 
                                    cho={distTotals.cho} 
                                    pro={distTotals.pro} 
                                    fat={distTotals.fat} 
                                    totalKcal={distTotals.kcal} 
                                />
                            </div>

                            <div className="space-y-3">
                                <ProgressBar current={distTotals.kcal} target={targetKcal} label="Calories" unit="kcal" />
                                <div className="grid grid-cols-3 gap-2 text-xs text-center mt-4">
                                    <div className="p-2 bg-blue-50 rounded">
                                        <div className="font-bold text-blue-700">{distTotals.cho.toFixed(0)}g</div>
                                        <div className="text-blue-400">CHO</div>
                                    </div>
                                    <div className="p-2 bg-red-50 rounded">
                                        <div className="font-bold text-red-700">{distTotals.pro.toFixed(0)}g</div>
                                        <div className="text-red-400">PRO</div>
                                    </div>
                                    <div className="p-2 bg-yellow-50 rounded">
                                        <div className="font-bold text-yellow-700">{distTotals.fat.toFixed(0)}g</div>
                                        <div className="text-yellow-400">FAT</div>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Sidebar (Calculator Mode Only) */}
        {viewMode === 'calculator' && (
            <div className="lg:col-span-4 xl:col-span-3 space-y-6 no-print">
                <div className="card bg-white shadow-xl sticky top-24 border-t-4 border-t-[var(--color-primary)]">
                    <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                            <span className="text-2xl">📊</span> Smart Summary
                        </h3>

                        {/* Target Input (Extracted) */}
                        <TargetKcalInput value={targetKcal} onChange={setTargetKcal} label={t.kcal.kcalRequired} />

                        {/* Visuals */}
                        <div className="mb-6">
                             <MacroDonut 
                                cho={calcTotals.cho} 
                                pro={calcTotals.pro} 
                                fat={calcTotals.fat} 
                                totalKcal={calcTotals.kcal} 
                             />
                        </div>

                        {/* Progress Bars */}
                        <div className="space-y-4 mb-6">
                            <ProgressBar 
                                current={calcTotals.kcal} 
                                target={targetKcal} 
                                label={t.mealPlannerTool.targetKcal} 
                                unit="kcal" 
                            />
                            {/* Macros Progress could go here if targets were broken down */}
                        </div>

                        {/* Detailed Grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="text-gray-500">Total CHO</div>
                            <div className="text-right font-bold text-blue-600">{calcTotals.cho.toFixed(1)}g</div>
                            <div className="text-gray-500">Total PRO</div>
                            <div className="text-right font-bold text-red-600">{calcTotals.pro.toFixed(1)}g</div>
                            <div className="text-gray-500">Total FAT</div>
                            <div className="text-right font-bold text-yellow-600">{calcTotals.fat.toFixed(1)}g</div>
                        </div>

                        {/* Manual Targets Toggle */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                             <div className="flex justify-center gap-2 mb-4">
                                 <button 
                                    onClick={() => setActiveTargetTab(activeTargetTab === 'gm' ? 'none' : 'gm')}
                                    className={`px-3 py-1 rounded text-xs font-bold ${activeTargetTab === 'gm' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                                 >
                                     Target (g)
                                 </button>
                                 <button 
                                    onClick={() => setActiveTargetTab(activeTargetTab === 'perc' ? 'none' : 'perc')}
                                    className={`px-3 py-1 rounded text-xs font-bold ${activeTargetTab === 'perc' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                                 >
                                     Target (%)
                                 </button>
                             </div>

                             {activeTargetTab === 'gm' && (
                                 <div className="space-y-2 animate-fade-in">
                                     <div className="flex justify-between items-center"><span className="text-xs">CHO (g)</span> <input type="number" className="w-16 p-1 border rounded text-center text-sm" value={manualGm.cho} onChange={e => setManualGm({...manualGm, cho: parseFloat(e.target.value)})} /></div>
                                     <div className="flex justify-between items-center"><span className="text-xs">PRO (g)</span> <input type="number" className="w-16 p-1 border rounded text-center text-sm" value={manualGm.pro} onChange={e => setManualGm({...manualGm, pro: parseFloat(e.target.value)})} /></div>
                                     <div className="flex justify-between items-center"><span className="text-xs">FAT (g)</span> <input type="number" className="w-16 p-1 border rounded text-center text-sm" value={manualGm.fat} onChange={e => setManualGm({...manualGm, fat: parseFloat(e.target.value)})} /></div>
                                     <div className="text-xs text-center text-gray-400 mt-1">Remain: {(manualGm.cho*4 + manualGm.pro*4 + manualGm.fat*9 - calcTotals.kcal).toFixed(0)} kcal</div>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

        {/* --- MODALS --- */}
      
      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm no-print">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{t.common.load}</h3>
                    <button onClick={() => setShowLoadModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder={t.common.search}
                        value={loadSearchQuery}
                        onChange={(e) => setLoadSearchQuery(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {isLoadingPlans ? (
                        <div className="text-center py-10 text-gray-400">Loading...</div>
                    ) : filteredSavedPlans.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">No saved plans found.</div>
                    ) : (
                        filteredSavedPlans.map(plan => (
                            <div key={plan.id} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-100 group">
                                <div>
                                    <div className="font-bold text-gray-800">{plan.name}</div>
                                    <div className="text-xs text-gray-500">{new Date(plan.created_at).toLocaleDateString('en-GB')}</div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => loadPlan(plan)} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Load</button>
                                    <button onClick={() => deletePlan(plan.id)} className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200">Del</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
