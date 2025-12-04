
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { KcalResults } from '../hooks/useKcalCalculations';

interface WeightAnalysisProps {
  results: KcalResults;
}

const WeightAnalysisCard: React.FC<WeightAnalysisProps> = ({ results: r }) => {
  const { t } = useLanguage();

  return (
    <div className="card bg-white shadow-md border border-blue-100 overflow-hidden">
      <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
          <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
              {t.kcal.weightAnalysis}
          </h2>
          {/* Protocol Badge */}
          {r.protocol && (
             <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${r.protocol.isHighObesity ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                 {r.protocol.isHighObesity ? 'Adjusted Wt' : 'Ideal Wt'}
             </span>
          )}
      </div>

      <div className="p-4 space-y-4">
          {/* Weight Comparison Grid (New) */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-center border-r border-gray-200 pr-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Dry (Actual)</div>
                  <div className="font-mono font-bold text-lg text-gray-800">{r.dryWeight} kg</div>
                  <div className={`text-xs font-bold ${r.bmiColor}`}>{r.bmi} BMI</div>
              </div>
              <div className="text-center pl-2">
                  <div className="text-[10px] font-bold text-blue-400 uppercase">Selected</div>
                  <div className="font-mono font-bold text-lg text-blue-800">{r.bmiSel !== '0.0' ? 'Using Sel.' : '-'}</div>
                  <div className={`text-xs font-bold ${r.bmiSelColor}`}>{r.bmiSel} BMI</div>
              </div>
          </div>

          {/* Elderly Note */}
          {r.elderlyInfo && (
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r text-xs text-yellow-800">
                  <strong className="block mb-1">👴 Elderly Patient Note:</strong>
                  {r.elderlyInfo.note}
              </div>
          )}

          {/* Body Composition Indicators (InBody / Estimates) */}
          {r.bodyComposition && (
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1">
                          💪 Body Comp ({r.bodyComposition.bodyFatSource})
                      </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      <div className="bg-white p-2 rounded shadow-sm">
                          <div className="text-[10px] text-gray-500 uppercase">{t.kcal.bodyFat}</div>
                          <div className="font-bold text-blue-700">{r.bodyComposition.bodyFatPercent}%</div>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm">
                          <div className="text-[10px] text-gray-500 uppercase">{t.kcal.fatMass}</div>
                          <div className="font-bold text-gray-700">{r.bodyComposition.fatMass} <span className="text-xs font-normal">kg</span></div>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm">
                          <div className="text-[10px] text-gray-500 uppercase">{t.kcal.leanBodyMass}</div>
                          <div className="font-bold text-gray-700">{r.bodyComposition.leanBodyMass} <span className="text-xs font-normal">kg</span></div>
                      </div>
                  </div>
                  
                  {r.bodyComposition.targetWeight && (
                      <div className="mt-2 pt-2 border-t border-blue-200 text-center">
                          <div className="text-[10px] text-blue-600 font-bold uppercase mb-1">{t.kcal.targetWeightBF}</div>
                          <div className="text-lg font-mono font-bold text-blue-800">
                              {r.bodyComposition.targetWeight} <span className="text-xs">kg</span>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* Protocol Recommendation Box */}
          {r.protocol && (
              <div>
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-center">
                      <div className="text-xs font-bold text-green-700 uppercase">✅ Recommendation</div>
                      <div className="font-mono text-xl font-extrabold text-green-800">
                          {r.protocol.recommendedWeight.toFixed(1)} <span className="text-sm">kg</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white border border-gray-200 rounded">
                          <div className="text-gray-500 font-bold">IBW (Simple)</div>
                          <div className="font-mono text-gray-800 font-bold">{r.IBW} kg</div>
                      </div>
                      <div className="p-2 bg-white border border-gray-200 rounded">
                          <div className="text-gray-500 font-bold">IBW (Hamwi)</div>
                          <div className="font-mono text-gray-800 font-bold">{r.IBW_2} kg</div>
                      </div>
                      <div className="p-2 bg-white border border-gray-200 rounded">
                          <div className="text-gray-500 font-bold">Adj. BW</div>
                          <div className="font-mono text-gray-800 font-bold">{r.ABW_2} kg</div>
                      </div>
                      {r.adjustedWeightAmputation ? (
                          <div className="p-2 bg-red-50 border border-red-200 rounded">
                              <div className="text-red-500 font-bold">Amp. Adj.</div>
                              <div className="font-mono text-red-800 font-bold">{r.adjustedWeightAmputation} kg</div>
                          </div>
                      ) : (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                              <div className="text-gray-400 font-bold">Threshold</div>
                              <div className="font-mono text-gray-500">{r.protocol.threshold.toFixed(1)} kg</div>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default WeightAnalysisCard;
