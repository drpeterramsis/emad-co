
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { KcalResults } from '../hooks/useKcalCalculations';

interface ResultsSummaryProps {
  results: KcalResults;
  onPlanMeals?: (kcal: number) => void;
  reqKcal?: number | '';
  setReqKcal?: (val: number | '') => void;
}

const ResultsSummaryCard: React.FC<ResultsSummaryProps> = ({ results: r, onPlanMeals, reqKcal, setReqKcal }) => {
  const { t } = useLanguage();

  return (
    <div className="card shadow-lg overflow-hidden border-0 ring-1 ring-black/5 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              📊 {t.kcal.summary}
          </h2>
          <div className="text-right">
              <div className="text-[10px] uppercase opacity-60 font-bold tracking-wider">{t.kcal.dryWeight}</div>
              <div className="font-mono font-bold text-xl leading-none text-green-400">{r.dryWeight} <span className="text-sm opacity-70">kg</span></div>
          </div>
      </div>
      
      <div className="p-5 space-y-5">
          {/* Status Indicators Grid */}
          <div className="grid grid-cols-2 gap-4">
              {/* BMI (Dry) */}
              <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col justify-center min-h-[100px]">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">BMI (Dry)</div>
                  <div className={`text-3xl font-extrabold ${r.bmiColor ? r.bmiColor.replace('text-', 'text-') : 'text-white'}`}>{r.bmi}</div>
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-2 self-center bg-white/20 text-white">
                      {r.bmiRef || '-'}
                  </div>
              </div>

              {/* Weight Loss */}
              <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col justify-center min-h-[100px]">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">{t.kcal.weightLoss}</div>
                  <div className={`text-3xl font-extrabold ${r.weightLossColor ? r.weightLossColor.replace('text-', 'text-') : 'text-white'}`}>{r.weightLoss}%</div>
                  {r.weightLossRef ? (
                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-2 self-center bg-white/20 text-white">
                          {r.weightLossRef}
                      </div>
                  ) : <div className="mt-2 text-[10px] text-gray-500">-</div>}
              </div>
          </div>

          {/* Action Area */}
          {onPlanMeals && setReqKcal !== undefined && (
            <div className="pt-4 border-t border-gray-700/50 animate-fade-in">
               <div className="mb-4">
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">{t.kcal.kcalRequired}</label>
                   <input 
                     type="number" 
                     className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-2xl text-center text-white transition shadow-inner placeholder-gray-600"
                     placeholder="Enter Target Kcal"
                     value={reqKcal}
                     onChange={(e) => setReqKcal(Number(e.target.value))}
                     dir="ltr"
                   />
               </div>
               <button 
                 onClick={() => reqKcal && onPlanMeals(Number(reqKcal))}
                 disabled={!reqKcal}
                 className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3.5 rounded-xl transition font-bold shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98]"
               >
                 <span>📅</span> {t.kcal.planMeals}
               </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default ResultsSummaryCard;
