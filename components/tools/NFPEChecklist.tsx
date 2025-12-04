import React, { useState, useEffect, useMemo } from 'react';
import { nfpeData, NFPESystem, NFPEItem } from '../../data/nfpeData';
import { useLanguage } from '../../contexts/LanguageContext';
import { Client } from '../../types';
import { supabase } from '../../lib/supabase';

interface NFPEChecklistProps {
  client?: Client;
  onBack?: () => void;
}

const NFPEChecklist: React.FC<NFPEChecklistProps> = ({ client, onBack }) => {
  const { t, isRTL } = useLanguage();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'assessment' | 'summary'>('assessment');
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing state if available
  useEffect(() => {
    if (client && client.nfpe_data && client.nfpe_data.selectedItems) {
        setSelectedItems(new Set(client.nfpe_data.selectedItems));
    }
  }, [client]);

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const generateReportText = () => {
    let report = `[NFPE Assessment - ${new Date().toLocaleDateString('en-GB')}]\n`;
    let hasFindings = false;

    nfpeData.forEach(system => {
      const activeInSystem = system.items.filter(i => selectedItems.has(i.id));
      if (activeInSystem.length > 0) {
        hasFindings = true;
        report += `\n${system.icon} ${system.name} (${system.nameAr}):\n`;
        activeInSystem.forEach(item => {
          report += `• ${item.sign} / ${item.signAr}\n`;
          report += `  - Deficiency: ${item.deficiency} | ${item.deficiencyAr}\n`;
          report += `  - Suggestion: ${item.food} | ${item.foodAr}\n`;
        });
      }
    });

    if (!hasFindings) report += "\nNo significant physical findings recorded.";
    
    return report;
  };

  // Logic 1: Save State Only (Checklist State)
  const handleSaveState = async () => {
      if (!client) return;
      setIsSaving(true);
      setSaveStatus('');
      
      try {
          // This requires the 'nfpe_data' column in Supabase 'clients' table.
          const { error } = await supabase
            .from('clients')
            .update({ 
                nfpe_data: { 
                    selectedItems: Array.from(selectedItems),
                    updatedAt: new Date().toISOString()
                } 
            })
            .eq('id', client.id);

          if (error) {
              if (error.message && error.message.includes("column \"nfpe_data\" of relation \"clients\" does not exist")) {
                  throw new Error("Missing DB Column. Please check settings.");
              }
              throw error;
          }
          setSaveStatus('Checklist Saved Successfully!');
          setTimeout(() => setSaveStatus(''), 2000);
      } catch (err: any) {
          console.error("Save State Error:", err);
          setSaveStatus('Error: ' + (err.message || 'Check database schema'));
      } finally {
          setIsSaving(false);
      }
  };

  // Logic 2: Save to Notes (Legacy / Printable)
  const handleSaveToNotes = async () => {
    if (!client) return;
    setIsSaving(true);
    setSaveStatus('');

    const newNotes = generateReportText();
    const updatedNotes = client.notes 
      ? `${client.notes}\n\n${newNotes}` 
      : newNotes;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ notes: updatedNotes })
        .eq('id', client.id);

      if (error) throw error;
      setSaveStatus('Report appended to Notes!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('Error saving: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(generateReportText());
      setSaveStatus('Copied to clipboard!');
      setTimeout(() => setSaveStatus(''), 2000);
  };

  // Filter systems and items based on search query
  const filteredSystems = useMemo(() => {
      if (!searchQuery) return nfpeData;
      const q = searchQuery.toLowerCase();
      
      return nfpeData.map(system => ({
          ...system,
          items: system.items.filter(item => 
              item.sign.toLowerCase().includes(q) || 
              item.signAr.includes(q) || 
              item.deficiency.toLowerCase().includes(q)
          )
      })).filter(system => system.items.length > 0);
  }, [searchQuery]);

  // Organize findings for the summary tab
  const activeFindingsBySystem = useMemo(() => {
      return nfpeData.map(system => ({
        ...system,
        items: system.items.filter(item => selectedItems.has(item.id))
      })).filter(sys => sys.items.length > 0);
  }, [selectedItems]);

  // Aggregated Summary Logic (Bilingual)
  const aggregatedSummary = useMemo(() => {
      const defs = new Set<string>();
      const defsAr = new Set<string>();
      const foods = new Set<string>();
      const foodsAr = new Set<string>();

      nfpeData.forEach(sys => {
          sys.items.forEach(item => {
              if (selectedItems.has(item.id)) {
                  // English Deficiencies
                  item.deficiency.split(/,|&|\//).forEach(d => {
                      const trimD = d.trim();
                      if (trimD && !trimD.toLowerCase().includes('deficiency')) defs.add(trimD);
                  });
                  // Arabic Deficiencies
                  item.deficiencyAr.split(/,|،|\//).forEach(d => {
                      const trimD = d.trim();
                      if (trimD) defsAr.add(trimD);
                  });
                  
                  // English Foods
                  item.food.split(/,|&|\//).forEach(f => {
                      foods.add(f.trim());
                  });
                  // Arabic Foods
                  item.foodAr.split(/,|،|\//).forEach(f => {
                      foodsAr.add(f.trim());
                  });
              }
          });
      });

      return {
          deficiencies: Array.from(defs).sort(),
          deficienciesAr: Array.from(defsAr).sort(),
          foods: Array.from(foods).sort(),
          foodsAr: Array.from(foodsAr).sort()
      };
  }, [selectedItems]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
               <button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm whitespace-nowrap">
                   <span>←</span> Back
               </button>
           )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-heading)]">NFPE Assessment</h1>
            <p className="text-sm text-gray-500">Nutrition Focused Physical Exam <span className="mx-1">|</span> الفحص البدني للتغذية</p>
            {client && <p className="text-sm mt-1 text-blue-600 font-bold">Client: {client.full_name}</p>}
          </div>
        </div>
        
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
             <button 
                onClick={() => setActiveTab('assessment')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'assessment' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 Checklist
             </button>
             <button 
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'summary' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 Report ({selectedItems.size})
             </button>
        </div>
      </div>

      {saveStatus && (
          <div className={`mb-6 p-3 rounded-lg text-center font-bold ${saveStatus.includes('Error') || saveStatus.includes('Missing') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {saveStatus}
          </div>
      )}

      {/* ASSESSMENT TAB */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="relative w-full md:w-96">
                    <input 
                        type="text" 
                        placeholder="Search signs, deficiencies..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 left-3`}>🔍</span>
                 </div>

                 {client && (
                    <button 
                        onClick={handleSaveState}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition disabled:opacity-50 text-sm flex items-center gap-2 no-print"
                    >
                        💾 Save Checklist State
                    </button>
                 )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredSystems.map((system: NFPESystem) => {
                const activeCount = system.items.filter(i => selectedItems.has(i.id)).length;
                
                return (
                    <div key={system.id} className={`card bg-white transition-all duration-300 ${activeCount > 0 ? 'ring-2 ring-[var(--color-primary)] shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
                            <span className="text-2xl">{system.icon}</span>
                            <div className="flex-grow">
                                <h3 className="font-bold text-gray-800">{system.name}</h3>
                                <p className="text-xs text-gray-500 font-arabic">{system.nameAr}</p>
                            </div>
                            {activeCount > 0 && (
                                <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            {system.items.map((item: NFPEItem) => {
                                const isSelected = selectedItems.has(item.id);
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        className={`p-2 rounded-lg cursor-pointer border transition-all ${
                                            isSelected 
                                            ? 'bg-red-50 border-red-200' 
                                            : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`w-5 h-5 mt-1 rounded border flex flex-shrink-0 items-center justify-center ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}>
                                                {isSelected && <span className="text-white text-xs">✓</span>}
                                            </div>
                                            <div className="flex-grow">
                                                <div className={`text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}`}>
                                                    {item.sign}
                                                </div>
                                                <div className={`text-xs font-arabic ${isSelected ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {item.signAr}
                                                </div>
                                                {isSelected && (
                                                    <div className="mt-1 text-[10px] text-red-500 font-medium">
                                                        Deficiency: {item.deficiency}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
                })}
                {filteredSystems.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        No signs found matching "{searchQuery}"
                    </div>
                )}
            </div>
        </div>
      )}

      {/* SUMMARY TAB */}
      {activeTab === 'summary' && (
          <div className="animate-fade-in space-y-8">
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                   <div>
                       <h2 className="text-xl font-bold text-purple-900">Assessment Report</h2>
                       <p className="text-sm text-purple-700">Review findings and aggregated recommendations.</p>
                   </div>
                   <div className="flex gap-2">
                        {client ? (
                            <>
                            <button 
                                onClick={handleSaveToNotes}
                                disabled={isSaving}
                                className="bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 px-4 py-2 rounded-lg font-bold shadow-sm transition disabled:opacity-50 text-sm"
                            >
                                📝 Append to Notes
                            </button>
                            <button 
                                onClick={handleSaveState}
                                disabled={isSaving}
                                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-2 rounded-lg font-bold shadow-md transition disabled:opacity-50 text-sm"
                            >
                                {isSaving ? 'Saving...' : '💾 Save Checklist Only'}
                            </button>
                            </>
                        ) : (
                            <button 
                                onClick={handleCopy}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-bold shadow-md transition"
                            >
                                📋 Copy Text
                            </button>
                        )}
                   </div>
              </div>

              {/* Detailed Findings */}
              {activeFindingsBySystem.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                      <div className="text-4xl mb-3">🩺</div>
                      <p className="font-medium">No physical signs selected.</p>
                      <p className="text-sm">Go to the "Checklist" tab to record your findings.</p>
                  </div>
              ) : (
                  <div className="space-y-6">
                      {activeFindingsBySystem.map(sys => (
                          <div key={sys.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden break-inside-avoid">
                              <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
                                  <span className="text-2xl">{sys.icon}</span>
                                  <div>
                                      <h3 className="font-bold text-gray-800">{sys.name}</h3>
                                      <p className="text-xs text-gray-500 font-arabic">{sys.nameAr}</p>
                                  </div>
                              </div>
                              <div className="divide-y divide-gray-100">
                                  {sys.items.map(item => (
                                      <div key={item.id} className="p-4 hover:bg-gray-50 transition">
                                          <div className="flex flex-col md:flex-row gap-6">
                                              
                                              {/* 1. Symptom */}
                                              <div className="md:w-1/3 space-y-3">
                                                  <div>
                                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Symptom / العلامة</span>
                                                      <div className="font-bold text-gray-800 text-lg leading-tight">{item.sign}</div>
                                                      <div className="text-gray-600 font-arabic text-sm">{item.signAr}</div>
                                                  </div>
                                              </div>

                                              {/* 2. Deficiency Info */}
                                              <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                                   <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">Nutrients / Deficiency</span>
                                                   <div className="font-bold text-red-700 text-lg">{item.deficiency}</div>
                                                   <div className="text-red-600 font-arabic text-sm">{item.deficiencyAr}</div>
                                              </div>

                                              {/* 3. Nutrition Advice */}
                                              <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                                                   <span className="text-xs font-bold text-green-600 uppercase tracking-wider block mb-1">Suggested Nutrition</span>
                                                   <div className="font-medium text-gray-800">{item.food}</div>
                                                   <div className="text-sm text-gray-600 font-arabic mt-1">{item.foodAr}</div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* Aggregated Summary Section */}
              {activeFindingsBySystem.length > 0 && (
                  <div className="mt-8 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl shadow-lg p-8 break-inside-avoid">
                      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-600 pb-4">
                          <span>📊</span> Total Assessment Summary
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          {/* Deficiencies */}
                          <div>
                              <h3 className="font-bold text-red-300 uppercase tracking-wider text-sm mb-4">
                                  Potential Deficiencies Suspected
                              </h3>
                              <div className="flex flex-wrap gap-2 mb-4">
                                  {aggregatedSummary.deficiencies.map((def, idx) => (
                                      <span key={idx} className="bg-red-900/40 border border-red-700/50 text-red-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                                          {def}
                                      </span>
                                  ))}
                              </div>
                              <div className="flex flex-wrap gap-2 rtl" dir="rtl">
                                  {aggregatedSummary.deficienciesAr.map((def, idx) => (
                                      <span key={idx} className="bg-red-900/40 border border-red-700/50 text-red-100 px-3 py-1.5 rounded-lg text-sm font-medium font-arabic">
                                          {def}
                                      </span>
                                  ))}
                              </div>
                          </div>

                          {/* Food Recommendations */}
                          <div>
                              <h3 className="font-bold text-green-300 uppercase tracking-wider text-sm mb-4">
                                  Aggregate Nutrition Recommendations
                              </h3>
                              <div className="mb-4">
                                <h4 className="text-xs text-gray-400 mb-2">English</h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300">
                                    {aggregatedSummary.foods.map((food, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            {food}
                                        </li>
                                    ))}
                                </ul>
                              </div>
                              
                              <div dir="rtl">
                                <h4 className="text-xs text-gray-400 mb-2 font-arabic">عربي</h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300 font-arabic">
                                    {aggregatedSummary.foodsAr.map((food, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full ml-2"></span>
                                            {food}
                                        </li>
                                    ))}
                                </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

    </div>
  );
};

export default NFPEChecklist;