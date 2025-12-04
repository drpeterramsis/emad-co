
import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { KcalResults } from '../hooks/useKcalCalculations';

interface MethodsCardProps {
  results: KcalResults;
  deficit: number;
  setDeficit: (v: number) => void;
}

const MethodsCard: React.FC<MethodsCardProps> = ({ results, deficit, setDeficit }) => {
  const { t } = useLanguage();
  const [activeMethod, setActiveMethod] = useState<'method1' | 'method2' | 'method3' | 'method4' | 'method5' | 'method6' | 'none'>('method3');

  const r = results;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
         {['method1', 'method2', 'method3', 'method4', 'method5', 'method6'].map((m, idx) => (
           <button
            key={m}
            onClick={() => setActiveMethod(m as any)}
            className={`px-3 py-2 rounded-lg border transition-all text-center shadow-sm text-xs font-bold ${
              activeMethod === m 
              ? 'border-[var(--color-primary)] bg-[var(--color-bg-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' 
              : 'border-gray-200 text-gray-600 hover:border-[var(--color-primary)] hover:shadow-md'
            }`}
           >
             M{idx + 1}
           </button>
         ))}
      </div>

      {/* Render Active Method */}
      {activeMethod !== 'none' && (
        <div className="bg-white rounded-xl overflow-hidden animate-fade-in">
          
          {/* METHOD 1 */}
          {activeMethod === 'method1' && r.m1 && (
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-bold text-gray-500 text-xs uppercase mb-2">Dry Weight</h4>
                    <div className="text-xl font-bold text-gray-800">{r.m1.resultDry.toFixed(0)} kcal</div>
                    <div className="text-xs text-gray-400 mt-1">Factor: {r.m1.factor} (Based on BMI {r.m1.bmiValue.toFixed(1)})</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-bold text-blue-500 text-xs uppercase mb-2">Selected Weight</h4>
                    <div className="text-xl font-bold text-blue-800">{r.m1.resultSel.toFixed(0)} kcal</div>
                    <div className="text-xs text-blue-400 mt-1">Factor applied to Selected Weight</div>
                </div>
            </div>
          )}

          {/* METHOD 2 */}
           {activeMethod === 'method2' && r.m2 && (
            <table className="w-full text-sm">
              <caption className="text-left font-bold text-gray-700 mb-2 text-xs">Method 2: Weight * Factor</caption>
              <thead>
                <tr className="text-left border-b border-green-200 text-xs text-gray-500">
                  <th className="pb-2 px-2">Weight</th>
                  <th className="pb-2 px-2">25 Kcal</th>
                  <th className="pb-2 px-2">30 Kcal</th>
                  <th className="pb-2 px-2">35 Kcal</th>
                  <th className="pb-2 px-2">40 Kcal</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[var(--color-primary-dark)]">
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-2 font-sans font-bold text-gray-600">Dry (Actual)</td>
                  {r.m2.actual.map((v: number, i: number) => <td key={i} className="px-2">{v.toFixed(0)}</td>)}
                </tr>
                <tr className="bg-blue-50/50">
                  <td className="py-2 px-2 font-sans font-bold text-blue-700">Selected</td>
                  {r.m2.selected.map((v: number, i: number) => <td key={i} className="px-2 text-blue-700">{v.toFixed(0)}</td>)}
                </tr>
              </tbody>
            </table>
          )}

          {/* METHOD 3 */}
           {activeMethod === 'method3' && r.m3 && (
             <div className="space-y-4">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold text-gray-700 text-sm">M3: Equations (Mifflin/Harris)</h3>
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{t.kcal.deficit}</span>
                    <input 
                        type="number" 
                        value={deficit} 
                        onChange={(e) => setDeficit(Number(e.target.value))}
                        className="w-16 p-1 rounded border text-center text-xs"
                        dir="ltr"
                    />
                 </div>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left border-collapse">
                     <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase font-bold">
                       <tr>
                         <th className="p-2 border-r w-1/4">Equation</th>
                         <th className="p-2 text-center border-r bg-gray-100/50">Dry TEE</th>
                         <th className="p-2 text-center border-r bg-blue-50/50 text-blue-700">Sel TEE</th>
                         <th className="p-2 text-center bg-green-50 text-green-700">Net (Sel - Def)</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 font-mono text-xs">
                       {/* Mifflin */}
                       <tr className="hover:bg-gray-50">
                          <td className="p-2 border-r font-sans font-bold text-gray-700">
                              Mifflin <span className="text-[9px] bg-green-100 text-green-800 px-1 rounded ml-1">Rec</span>
                          </td>
                          <td className="p-2 text-center border-r">{r.m3.mifflin.tee[0].toFixed(0)}</td>
                          <td className="p-2 text-center border-r bg-blue-50/30 text-blue-700 font-bold">{r.m3.mifflin.tee[1].toFixed(0)}</td>
                          <td className="p-2 text-center bg-green-50/30 text-green-700 font-bold">{(r.m3.mifflin.tee[1] - deficit).toFixed(0)}</td>
                       </tr>
                       
                       {/* Harris */}
                       <tr className="hover:bg-gray-50">
                          <td className="p-2 border-r font-sans">Harris</td>
                          <td className="p-2 text-center border-r">{r.m3.harris.tee[0].toFixed(0)}</td>
                          <td className="p-2 text-center border-r bg-blue-50/30 text-blue-700">{r.m3.harris.tee[1].toFixed(0)}</td>
                          <td className="p-2 text-center bg-green-50/30 text-green-700">{(r.m3.harris.tee[1] - deficit).toFixed(0)}</td>
                       </tr>

                       {/* WHO */}
                       {r.m3.who && (
                           <tr className="hover:bg-gray-50">
                              <td className="p-2 border-r font-sans">WHO/FAO</td>
                              <td className="p-2 text-center border-r">{r.m3.who.tee.toFixed(0)}</td>
                              <td className="p-2 text-center border-r bg-gray-50 text-gray-400">-</td>
                              <td className="p-2 text-center bg-green-50/30 text-green-700">{(r.m3.who.tee - deficit).toFixed(0)}</td>
                           </tr>
                       )}

                       {/* Katch (InBody) */}
                       {r.m3.katch && (
                           <tr className="hover:bg-purple-50 bg-purple-50/20">
                              <td className="p-2 border-r font-sans text-purple-700 font-bold">Katch (LBM)</td>
                              <td className="p-2 text-center border-r font-bold">{r.m3.katch.tee.toFixed(0)}</td>
                              <td className="p-2 text-center border-r text-gray-400">-</td>
                              <td className="p-2 text-center bg-green-50/30 text-green-700 font-bold">{(r.m3.katch.tee - deficit).toFixed(0)}</td>
                           </tr>
                       )}
                     </tbody>
                   </table>
               </div>
               <div className="text-[10px] text-gray-500 italic mt-2">
                   * TEE includes Activity Factor & 10% TEF. Column 'Net' uses Selected Weight TEE minus Deficit.
               </div>
             </div>
          )}

          {/* METHOD 4 */}
          {activeMethod === 'method4' && r.m4 && (
              <div>
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">M4: Ratio Equation ({r.m4.status})</h3>
                  <table className="w-full text-sm bg-white border-t border-gray-100">
                      <thead>
                          <tr className="bg-gray-50 text-xs text-gray-600">
                              <th className="p-2 text-left">Activity</th>
                              <th className="p-2 text-right">Factor</th>
                              <th className="p-2 text-right">Dry TEE</th>
                              <th className="p-2 text-right text-blue-700">Sel TEE</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr className="border-b border-gray-100">
                              <td className="p-2 font-medium">Sedentary</td>
                              <td className="p-2 text-right text-gray-500 font-mono">{r.m4.status === 'Overweight' ? '22.5' : r.m4.status === 'Underweight' ? '35' : '30'}</td>
                              <td className="p-2 text-right font-mono">{r.m4.dry.sedentary.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold font-mono text-blue-700">{r.m4.sel.sedentary.toFixed(0)}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                              <td className="p-2 font-medium">Moderate</td>
                              <td className="p-2 text-right text-gray-500 font-mono">{r.m4.status === 'Overweight' ? '30' : r.m4.status === 'Underweight' ? '40' : '35'}</td>
                              <td className="p-2 text-right font-mono">{r.m4.dry.moderate.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold font-mono text-blue-700">{r.m4.sel.moderate.toFixed(0)}</td>
                          </tr>
                          <tr>
                              <td className="p-2 font-medium">Heavy</td>
                              <td className="p-2 text-right text-gray-500 font-mono">{r.m4.status === 'Overweight' ? '35' : r.m4.status === 'Underweight' ? '47.5' : '40'}</td>
                              <td className="p-2 text-right font-mono">{r.m4.dry.heavy.toFixed(0)}</td>
                              <td className="p-2 text-right font-bold font-mono text-blue-700">{r.m4.sel.heavy.toFixed(0)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          )}

          {/* METHOD 5 */}
          {activeMethod === 'method5' && r.m5 && (
              <div>
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">M5: Estimated Minimum Requirements</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="text-sm text-gray-600">Category Applied</span>
                          <span className="text-sm font-bold text-gray-800">{r.m5.category}</span>
                      </div>
                      {r.m5.notes.length > 0 && (
                          <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-100">
                              {r.m5.notes.map((n, i) => <div key={i}>{n}</div>)}
                          </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="bg-gray-50 p-2 rounded border text-center">
                              <div className="text-xs text-gray-500 uppercase font-bold">Dry Weight</div>
                              <div className="text-lg font-mono font-bold text-gray-700">{r.m5.resultDry.toFixed(0)}</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded border border-blue-100 text-center">
                              <div className="text-xs text-blue-500 uppercase font-bold">Selected Weight</div>
                              <div className="text-lg font-mono font-bold text-blue-700">{r.m5.resultSel.toFixed(0)}</div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* METHOD 6 (EER) */}
          {activeMethod === 'method6' && r.m6 && (
              <div className="p-2 animate-fade-in">
                  <h3 className="font-bold text-purple-800 mb-2 text-sm">M6: EER & Protein (IOM/DRI)</h3>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center shadow-sm">
                      <div className="text-xs text-purple-600 font-bold uppercase mb-1">{r.m6.label}</div>
                      <div className="text-3xl font-extrabold text-purple-900 mb-2">
                          {r.m6.result.toFixed(0)} <span className="text-sm font-medium">kcal</span>
                      </div>
                      {r.m6.proteinRef && (
                          <div className="mt-2 mb-2 bg-white/50 p-2 rounded inline-block">
                              <span className="text-xs font-bold text-gray-500 uppercase mr-2">Protein:</span>
                              <span className="text-lg font-bold text-blue-700">{r.m6.proteinRef}</span>
                          </div>
                      )}
                      {r.m6.note && (
                          <div className="text-xs bg-white text-purple-700 px-3 py-1 rounded-full border border-purple-200 inline-block font-medium mt-2">
                              {r.m6.note}
                          </div>
                      )}
                      <div className="mt-3 text-[10px] text-gray-500 italic">
                          Based on Dietary Reference Intake (IOM 2002) for Energy & Protein.
                      </div>
                  </div>
              </div>
          )}

        </div>
      )}
    </div>
  );
};

export default MethodsCard;
