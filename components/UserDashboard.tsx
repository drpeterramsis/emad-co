
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { SavedMeal, Client } from '../types';
import Loading from './Loading';
import ToolsGrid from './ToolsGrid';

interface UserDashboardProps {
  onNavigateTool: (toolId: string, loadId?: string, action?: 'load' | 'new') => void;
  setBmiOpen: (v: boolean) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigateTool, setBmiOpen }) => {
  const { session, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [plans, setPlans] = useState<SavedMeal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState(false);
  
  // Collapse state for sections (Default to collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
      clients: true,
      plans: true,
      meals: true
  });

  const isDoctor = profile?.role === 'doctor';

  useEffect(() => {
    fetchData();
  }, [session, isDoctor]);

  const fetchData = async () => {
    if (!session?.user.id) return;
    setLoading(true);
    
    // 1. Fetch Meals and Plans (Common for all users)
    try {
      const { data: mealsData } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('tool_type', 'meal-creator')
        .order('created_at', { ascending: false });

      const { data: plansData } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('tool_type', 'meal-planner')
        .order('created_at', { ascending: false });

      if (mealsData) setMeals(mealsData);
      if (plansData) setPlans(plansData);
    } catch (error) {
      console.error('Error loading meals/plans:', error);
    }

    // 2. Fetch Clients (Doctor Only)
    if (isDoctor) {
        try {
            const { data: clientsData, error } = await supabase
            .from('clients')
            .select('*')
            .eq('doctor_id', session.user.id)
            .order('visit_date', { ascending: false });
            
            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist')) {
                    console.warn("Clients table missing in DB");
                    setClientsError(true);
                } else {
                    console.error("Error loading clients:", error);
                }
            } else if (clientsData) {
                setClients(clientsData);
                setClientsError(false);
            }
        } catch (err) {
            console.warn("Exception loading clients (likely table missing):", err);
            setClientsError(true);
        }
    }

    setLoading(false);
  };

  const deleteItem = async (id: string, type: 'meal' | 'plan') => {
    if (!window.confirm(t.common.delete + "?")) return;
    try {
      const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', session?.user.id);
      if (error) throw error;
      
      if (type === 'meal') {
        setMeals(prev => prev.filter(m => m.id !== id));
      } else {
        setPlans(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const toggleSection = (section: string) => {
      setCollapsedSections(prev => ({
          ...prev,
          [section]: !prev[section]
      }));
  };

  if (loading) return <Loading />;

  const roleLabel = profile?.role === 'doctor' ? t.auth.doctor : t.auth.patient;
  
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in pb-24">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] rounded-2xl p-8 text-white shadow-xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-2">
                    {roleLabel}
                </div>
                <h1 className="text-sm md:text-base font-medium mb-0 opacity-90">
                    {lang === 'en' ? 'Welcome back,' : 'مرحباً بعودتك،'}
                </h1>
                <h2 className="text-2xl md:text-4xl font-bold mb-2 text-white">
                    {profile?.full_name}
                </h2>
                <p className="text-white/80 text-sm">{session?.user.email}</p>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => document.getElementById('dashboard-tools')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-white text-[var(--color-primary-dark)] px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-100 transition transform hover:-translate-y-1"
                >
                    {t.common.explore}
                </button>
            </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isDoctor ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8`}>
        
        {/* 1. Assigned Clients Section (Doctor Only) */}
        {isDoctor && (
             <div className="card bg-white shadow-lg flex flex-col border-t-4 border-green-500 overflow-hidden h-fit">
                <div 
                    className="flex justify-between items-center p-6 bg-white cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleSection('clients')}
                >
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span>👥</span> {t.clients.title}
                        </h2>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                            {clientsError ? '-' : clients.length}
                        </span>
                    </div>
                    <span className="text-gray-400 transform transition-transform duration-300" style={{ transform: collapsedSections.clients ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                        ▼
                    </span>
                </div>

                {!collapsedSections.clients && (
                    <div className="p-6 pt-0 animate-fade-in border-t border-gray-100">
                        <div className="flex justify-end gap-2 mb-4 pt-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigateTool('client-manager', undefined, 'new'); }}
                                className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition font-bold shadow-sm text-xs"
                            >
                                + New Client
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigateTool('client-manager'); }}
                                className="bg-green-50 text-green-600 px-3 py-1.5 rounded hover:bg-green-100 transition font-bold shadow-sm text-xs"
                            >
                                Open Tool
                            </button>
                        </div>

                        <div className="space-y-3">
                            {clientsError ? (
                                <div className="text-center py-4 text-red-400 bg-red-50 rounded-lg border border-dashed border-red-200 text-sm p-4">
                                    <p className="font-bold">Table 'clients' not found.</p>
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    {t.clients.noClients}
                                </div>
                            ) : (
                                <>
                                    {clients.slice(0, 3).map(client => (
                                        <div key={client.id} className="p-3 border border-gray-100 rounded-xl hover:border-green-200 hover:shadow-sm transition group bg-white">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm group-hover:text-green-600 transition">{client.full_name}</h3>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <span>📍</span> {client.clinic}
                                                        <span className="mx-1">•</span>
                                                        <span>{formatDate(client.visit_date)}</span>
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => onNavigateTool('client-manager', client.id)}
                                                    className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100 transition"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {clients.length > 3 && (
                                        <button 
                                            onClick={() => onNavigateTool('client-manager')}
                                            className="w-full py-2 text-center text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition font-medium"
                                        >
                                            See All ({clients.length})...
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* 2. Saved Plans Section */}
        <div className="card bg-white shadow-lg flex flex-col border-t-4 border-purple-500 overflow-hidden h-fit">
             <div 
                className="flex justify-between items-center p-6 bg-white cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleSection('plans')}
             >
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span>📅</span> {t.tools.mealPlanner.title}
                    </h2>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                        {plans.length}
                    </span>
                </div>
                <span className="text-gray-400 transform transition-transform duration-300" style={{ transform: collapsedSections.plans ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    ▼
                </span>
            </div>

            {!collapsedSections.plans && (
                <div className="p-6 pt-0 animate-fade-in border-t border-gray-100">
                    <div className="flex justify-end gap-2 mb-4 pt-4">
                        <button 
                            onClick={() => onNavigateTool('meal-planner', undefined, 'new')}
                            className="bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 transition font-bold shadow-sm text-xs"
                        >
                            + New Plan
                        </button>
                        <button 
                            onClick={() => onNavigateTool('meal-planner')}
                            className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded hover:bg-purple-100 transition font-bold shadow-sm text-xs"
                        >
                            Open Tool
                        </button>
                    </div>

                    <div className="space-y-3">
                        {plans.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                No saved plans yet.
                            </div>
                        ) : (
                            <>
                                {plans.slice(0, 3).map(plan => (
                                    <div key={plan.id} className="p-3 border border-gray-100 rounded-xl hover:border-purple-200 hover:shadow-sm transition group bg-white">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm group-hover:text-purple-600 transition">{plan.name}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <span>🕒</span> {formatDate(plan.created_at)}
                                                    {plan.data?.targetKcal > 0 && (
                                                        <>
                                                            <span className="mx-1">•</span>
                                                            <span className="text-green-600 font-medium">{plan.data.targetKcal} kcal</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onNavigateTool('meal-planner', plan.id)}
                                                    className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded hover:bg-purple-100 transition"
                                                >
                                                    Open
                                                </button>
                                                <button 
                                                    onClick={() => deleteItem(plan.id, 'plan')}
                                                    className="px-2 py-1 bg-red-50 text-red-500 text-xs font-medium rounded hover:bg-red-100 transition"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {plans.length > 3 && (
                                    <button 
                                        onClick={() => onNavigateTool('meal-planner', undefined, 'load')}
                                        className="w-full py-2 text-center text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition font-medium"
                                    >
                                        See All ({plans.length})...
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        {/* 3. Saved Meals Section */}
        <div className="card bg-white shadow-lg flex flex-col border-t-4 border-blue-500 overflow-hidden h-fit">
            <div 
                className="flex justify-between items-center p-6 bg-white cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleSection('meals')}
            >
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <span>🥗</span> {t.tools.mealCreator.title}
                    </h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                        {meals.length}
                    </span>
                </div>
                <span className="text-gray-400 transform transition-transform duration-300" style={{ transform: collapsedSections.meals ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                    ▼
                </span>
            </div>
            
            {!collapsedSections.meals && (
                <div className="p-6 pt-0 animate-fade-in border-t border-gray-100">
                    <div className="flex justify-end gap-2 mb-4 pt-4">
                        <button 
                            onClick={() => onNavigateTool('meal-creator', undefined, 'new')}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition font-bold shadow-sm text-xs"
                        >
                            + New Meal
                        </button>
                        <button 
                            onClick={() => onNavigateTool('meal-creator')}
                            className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 transition font-bold shadow-sm text-xs"
                        >
                            Open Tool
                        </button>
                    </div>

                    <div className="space-y-3">
                        {meals.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                No saved meals yet.
                            </div>
                        ) : (
                            <>
                                {meals.slice(0, 3).map(meal => (
                                    <div key={meal.id} className="p-3 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition group bg-white">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition">{meal.name}</h3>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <span>🕒</span> {formatDate(meal.created_at)}
                                                    <span className="mx-1">•</span>
                                                    <span>{meal.data?.addedFoods?.length || 0} items</span>
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onNavigateTool('meal-creator', meal.id)}
                                                    className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition"
                                                >
                                                    Open
                                                </button>
                                                <button 
                                                    onClick={() => deleteItem(meal.id, 'meal')}
                                                    className="px-2 py-1 bg-red-50 text-red-500 text-xs font-medium rounded hover:bg-red-100 transition"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {meals.length > 3 && (
                                    <button 
                                        onClick={() => onNavigateTool('meal-creator', undefined, 'load')}
                                        className="w-full py-2 text-center text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition font-medium"
                                    >
                                        See All ({meals.length})...
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>

      </div>
      
      {/* Tools Section (Sectors) */}
      <div id="dashboard-tools" className="mt-12 border-t border-gray-200 pt-10">
        <h2 className="text-2xl font-bold text-[var(--color-heading)] mb-8 flex items-center gap-2">
           <span>🚀</span> Professional Tools Suite
        </h2>
        <ToolsGrid 
            onToolClick={(toolId) => onNavigateTool(toolId)} 
            setBmiOpen={setBmiOpen} 
            isAuthenticated={true} 
        />
      </div>
    </div>
  );
};

export default UserDashboard;
