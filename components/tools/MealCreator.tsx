import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { mealCreatorDatabase, FoodItem } from "../../data/mealCreatorData";
import { MacroDonut } from "../Visuals";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { SavedMeal } from "../../types";

interface MealCreatorProps {
    initialLoadId?: string | null;
    autoOpenLoad?: boolean;
    autoOpenNew?: boolean;
}

const MealCreator: React.FC<MealCreatorProps> = ({ initialLoadId, autoOpenLoad, autoOpenNew }) => {
  const { t, isRTL } = useLanguage();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFoods, setAddedFoods] = useState<FoodItem[]>([]);

  // Save/Load State
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string>(''); // Track name to detect changes
  const [savedPlans, setSavedPlans] = useState<SavedMeal[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [loadSearchQuery, setLoadSearchQuery] = useState('');

  // Search Logic
  const filteredFoods = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return mealCreatorDatabase.filter(
      (food) => food.name.toLowerCase().includes(q) || food.group.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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

  // Handle Auto Open Load/New
  useEffect(() => {
      if (autoOpenLoad && session) {
          fetchPlans();
          setShowLoadModal(true);
      }
      if (autoOpenNew) {
          resetCreator();
      }
  }, [autoOpenLoad, autoOpenNew, session]);

  const addFood = (food: FoodItem) => {
    // Ensure deep copy of added item
    setAddedFoods([...addedFoods, { ...food, serves: 1 }]);
    setSearchQuery("");
  };

  const removeFood = (index: number) => {
    const newFoods = [...addedFoods];
    newFoods.splice(index, 1);
    setAddedFoods(newFoods);
  };

  const updateServes = (index: number, val: number) => {
    const newFoods = [...addedFoods];
    // Deep copy the specific item to ensure React state change detection and safe mutation
    newFoods[index] = { ...newFoods[index], serves: val };
    setAddedFoods(newFoods);
  };

  const resetCreator = () => {
    setAddedFoods([]);
    setSearchQuery("");
    setPlanName("");
    setLoadedPlanId(null);
    setLastSavedName("");
  };

  // Calculations
  const summary = useMemo(() => {
    let totalServes = 0, totalCHO = 0, totalProtein = 0, totalFat = 0, totalFiber = 0, totalKcal = 0;
    const groupSummary: Record<string, any> = {};

    addedFoods.forEach(food => {
      const s = food.serves;
      totalServes += s;
      totalCHO += food.cho * s;
      totalProtein += food.protein * s;
      totalFat += food.fat * s;
      totalFiber += food.fiber * s;
      totalKcal += food.kcal * s;

      if (!groupSummary[food.group]) {
        groupSummary[food.group] = { serves: 0, cho: 0, protein: 0, fat: 0, fiber: 0, kcal: 0 };
      }
      groupSummary[food.group].serves += s;
      groupSummary[food.group].cho += food.cho * s;
      groupSummary[food.group].protein += food.protein * s;
      groupSummary[food.group].fat += food.fat * s;
      groupSummary[food.group].fiber += food.fiber * s;
      groupSummary[food.group].kcal += food.kcal * s;
    });

    return { totalServes, totalCHO, totalProtein, totalFat, totalFiber, totalKcal, groupSummary };
  }, [addedFoods]);

  const percentages = useMemo(() => {
     const k = summary.totalKcal || 1;
     return {
         cho: ((summary.totalCHO * 4) / k * 100).toFixed(1),
         pro: ((summary.totalProtein * 4) / k * 100).toFixed(1),
         fat: ((summary.totalFat * 9) / k * 100).toFixed(1),
         fib: ((summary.totalFiber * 2) / k * 100).toFixed(1),
     }
  }, [summary]);

  // --- Database Operations ---
  const fetchPlans = async () => {
    if (!session) return;
    setIsLoadingPlans(true);
    setLoadSearchQuery(''); // Reset search on open
    try {
        const { data, error } = await supabase
          .from('saved_meals')
          .select('*')
          .eq('tool_type', 'meal-creator')
          .eq('user_id', session.user.id) // Strict user filtering
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
        alert("Please enter a meal name.");
        return;
    }
    if (!session) return;
    
    const planData = { addedFoods };
    const timestamp = new Date().toISOString();

    const isUpdate = loadedPlanId && (planName === lastSavedName);

    try {
        let data;
        
        if (isUpdate) {
            // Explicit UPDATE
            // We only update mutable fields (name, data)
            const updatePayload = {
                name: planName,
                data: planData,
            };

            const response = await supabase
                .from('saved_meals')
                .update(updatePayload)
                .eq('id', loadedPlanId)
                .eq('user_id', session.user.id) // Strict check for security
                .select();
                
            if (response.error) throw response.error;
            if (!response.data || response.data.length === 0) {
               throw new Error("Update failed: Meal not found or permission denied (RLS).");
            }
            data = response.data[0];
        } else {
            // Explicit INSERT
            const insertPayload = {
                user_id: session.user.id,
                name: planName,
                tool_type: 'meal-creator',
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
                setStatusMsg("Meal Updated Successfully!");
            } else {
                setStatusMsg("Meal Saved as New Entry!");
            }
        }
        
        fetchPlans(); 
        setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
        console.error('Error saving plan:', err);
        setStatusMsg("Failed to save: " + err.message);
    }
  };

  const loadPlan = (plan: SavedMeal) => {
    if (!plan.data || !plan.data.addedFoods) return;
    setAddedFoods([...plan.data.addedFoods]);
    setPlanName(plan.name);
    setLoadedPlanId(plan.id); 
    setLastSavedName(plan.name); 
    setShowLoadModal(false);
    setStatusMsg(t.common.loadSuccess);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const deletePlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this meal?")) return;
    try {
        const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', session?.user.id);
        if (error) throw error;
        setSavedPlans(prev => prev.filter(p => p.id !== id));
        if (loadedPlanId === id) {
            setLoadedPlanId(null);
            setLastSavedName("");
            setPlanName('');
        }
    } catch (err) {
        console.error("Error deleting:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
      
      {/* Header & Controls */}
      <div className="text-center space-y-4 relative bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-[var(--color-heading)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)]">
            {t.tools.mealCreator.title}
            </h1>

            {session && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <input 
                            type="text"
                            placeholder="Enter Meal Name..."
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            className="w-full md:w-64 px-4 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        />
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✎</span>
                    </div>

                    <button 
                        onClick={savePlan}
                        className="bg-blue-500 hover:bg-blue-600 text-white w-10 h-10 rounded-full shadow-md flex items-center justify-center transition flex-shrink-0"
                        title={t.common.save}
                    >
                        💾
                    </button>
                    <button 
                        onClick={() => {
                            fetchPlans();
                            setShowLoadModal(true);
                        }}
                        className="bg-purple-500 hover:bg-purple-600 text-white w-10 h-10 rounded-full shadow-md flex items-center justify-center transition flex-shrink-0"
                        title={t.common.load}
                    >
                        📂
                    </button>
                    <button onClick={resetCreator} className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-2 border border-red-200 rounded-full hover:bg-red-50 transition whitespace-nowrap">
                        {t.mealCreator.resetCreator}
                    </button>
                </div>
            )}
        </div>
        
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            className="w-full px-6 py-3 rounded-full border-2 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none shadow-sm text-lg"
            placeholder={t.mealCreator.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          {searchQuery && filteredFoods.length > 0 && (
            <ul className="absolute w-full bg-white mt-2 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 border border-gray-100 text-right">
              {filteredFoods.map((food, idx) => (
                <li 
                  key={idx} 
                  onClick={() => addFood(food)}
                  className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="font-medium text-[var(--color-text)]">{food.name.replace(/\(.*?\)/g, '')}</div>
                  <div className="text-xs text-[var(--color-text-light)] flex justify-between">
                     <span>{food.group}</span>
                     <span className="text-red-500">{food.name.match(/\(.*?\)/g)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {statusMsg && <div className="text-sm text-green-600 bg-green-50 inline-block px-4 py-1 rounded-full">{statusMsg}</div>}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Added Foods Table */}
        <div className="lg:col-span-2 card bg-white shadow-lg overflow-hidden">
           <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-lg text-[var(--color-heading)]">Meal Items</h3>
              <button onClick={() => setAddedFoods([])} className="text-red-500 text-sm hover:underline">{t.mealCreator.clear}</button>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-[var(--color-bg-soft)] text-[var(--color-heading)]">
                 <tr>
                   <th className="p-3 text-right w-1/2">{t.mealCreator.foodName}</th>
                   <th className="p-3 text-center">{t.mealCreator.serves}</th>
                   <th className="p-3 text-center">{t.mealCreator.kcal}</th>
                   <th className="p-3"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {addedFoods.map((food, idx) => (
                   <tr key={idx} className="hover:bg-gray-50">
                     <td className="p-3 text-right text-sm">
                       <div className="font-medium">{food.name.replace(/\(.*?\)/g, '')}</div>
                       <div className="text-xs text-gray-500">{food.group} <span className="text-red-400">{food.name.match(/\(.*?\)/g)}</span></div>
                     </td>
                     <td className="p-3 text-center">
                       <input 
                         type="number" 
                         min="0.25" 
                         step="0.25"
                         value={food.serves}
                         onChange={(e) => updateServes(idx, Number(e.target.value))}
                         className="w-16 text-center border rounded p-1 focus:ring-1 focus:ring-[var(--color-primary)]"
                       />
                     </td>
                     <td className="p-3 text-center font-mono text-blue-600">
                       {(food.kcal * food.serves).toFixed(0)}
                     </td>
                     <td className="p-3 text-center">
                       <button onClick={() => removeFood(idx)} className="text-red-400 hover:text-red-600 text-xl">×</button>
                     </td>
                   </tr>
                 ))}
                 {addedFoods.length === 0 && (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                       No food items added yet. Search above to add.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Total Summary Card */}
          <div className="card bg-gradient-to-b from-white to-green-50 border-green-100 shadow-lg">
            <h3 className="font-bold text-center text-[var(--color-primary-dark)] mb-2">
              {t.mealCreator.mealSummary}
            </h3>

            {/* Macro Chart */}
            {summary.totalKcal > 0 ? (
              <MacroDonut 
                cho={summary.totalCHO} 
                pro={summary.totalProtein} 
                fat={summary.totalFat} 
                totalKcal={summary.totalKcal} 
              />
            ) : (
               <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Add food to see breakdown</div>
            )}
            
            <div className="space-y-3 text-sm px-2 pb-2">
               <div className="flex justify-between p-2 bg-yellow-50 rounded border border-yellow-100">
                  <span>{t.mealCreator.total} (Serves)</span>
                  <span className="font-bold">{summary.totalServes.toFixed(2)}</span>
               </div>
               
               <div className="grid grid-cols-3 gap-2 text-center">
                 <div className="p-2 bg-blue-50 rounded">
                   <div className="text-xs text-gray-500">CHO</div>
                   <div className="font-bold text-blue-700">{summary.totalCHO.toFixed(1)}g</div>
                   <div className="text-[10px] text-blue-400">{percentages.cho}%</div>
                 </div>
                 <div className="p-2 bg-red-50 rounded">
                   <div className="text-xs text-gray-500">Prot</div>
                   <div className="font-bold text-red-700">{summary.totalProtein.toFixed(1)}g</div>
                   <div className="text-[10px] text-red-400">{percentages.pro}%</div>
                 </div>
                 <div className="p-2 bg-yellow-50 rounded">
                   <div className="text-xs text-gray-500">Fat</div>
                   <div className="font-bold text-yellow-700">{summary.totalFat.toFixed(1)}g</div>
                   <div className="text-[10px] text-yellow-400">{percentages.fat}%</div>
                 </div>
               </div>
               
               <div className="flex justify-between items-center p-2 bg-green-100 rounded text-green-800">
                   <span className="text-xs">Fiber</span>
                   <span className="font-bold">{summary.totalFiber.toFixed(1)}g</span>
               </div>
            </div>
          </div>

          {/* Group Summary */}
          {Object.keys(summary.groupSummary).length > 0 && (
            <div className="card bg-white shadow">
              <h4 className="font-bold text-sm text-gray-600 mb-2">Group Breakdown</h4>
              <div className="space-y-1 text-xs max-h-60 overflow-y-auto pr-1">
                {Object.entries(summary.groupSummary).map(([group, val]: [string, any]) => (
                  <div key={group} className="flex justify-between items-center p-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                    <span className="font-medium text-gray-700">{group}</span>
                    <div className="text-right">
                        <span className="font-mono text-[var(--color-primary)] font-bold block">{val.kcal.toFixed(0)} kcal</span>
                        <span className="text-[10px] text-gray-500 block">{val.serves.toFixed(2)} Serves</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
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
                        <div className="text-center py-10 text-gray-400">No saved meals found.</div>
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

export default MealCreator;