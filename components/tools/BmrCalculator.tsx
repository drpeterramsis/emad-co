
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { InputGroup } from '../calculations/InputComponents';

const BmrCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);

  const calculateBMR = () => {
    if (!age || !height || !weight) return null;

    let harris = 0;
    let mifflin = 0;

    if (gender === 'male') {
      harris = 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age);
      mifflin = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      harris = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
      mifflin = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    return { harris, mifflin };
  };

  const results = calculateBMR();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-heading)] mb-2">{t.tools.bmr.title}</h1>
        <p className="text-gray-600">{t.tools.bmr.desc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="card bg-white shadow-lg">
          <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <span>🔢</span> Inputs
          </h3>
          
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.kcal.gender}</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    <button 
                    onClick={() => setGender('male')}
                    className={`flex-1 py-2 transition ${gender === 'male' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-50 text-gray-600'}`}
                    >
                    {t.kcal.male}
                    </button>
                    <button 
                    onClick={() => setGender('female')}
                    className={`flex-1 py-2 transition ${gender === 'female' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-50 text-gray-600'}`}
                    >
                    {t.kcal.female}
                    </button>
                </div>
            </div>

            <InputGroup label={t.kcal.age} value={age} onChange={setAge} />
            <InputGroup label={t.kcal.height} value={height} onChange={setHeight} />
            <InputGroup label={t.kcal.currentWeight} value={weight} onChange={setWeight} />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
           {results ? (
               <>
                <div className="card bg-[var(--color-bg-soft)] border-green-200">
                    <h3 className="font-bold text-lg mb-4 text-[var(--color-primary-dark)] flex items-center gap-2">
                        <span>🔥</span> Results (BMR)
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-green-100">
                            <div>
                                <span className="block font-semibold text-gray-700">Mifflin-St Jeor</span>
                                <span className="text-xs text-gray-500">Recommended (Modern)</span>
                            </div>
                            <span className="text-xl font-bold text-[var(--color-primary)]">{results.mifflin.toFixed(0)} <span className="text-xs text-gray-400">kcal</span></span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg border border-dashed border-gray-300">
                            <div>
                                <span className="block font-semibold text-gray-600">Harris-Benedict</span>
                                <span className="text-xs text-gray-400">Traditional</span>
                            </div>
                            <span className="text-xl font-bold text-gray-600">{results.harris.toFixed(0)} <span className="text-xs text-gray-400">kcal</span></span>
                        </div>
                    </div>
                </div>

                <div className="card bg-white">
                    <h3 className="font-bold text-sm mb-3 text-gray-500 uppercase">Total Energy Expenditure (TEE)</h3>
                    <div className="space-y-2 text-sm">
                        {[
                            { label: t.kcal.activityLevels.sedentary, factor: 1.2 },
                            { label: t.kcal.activityLevels.mild, factor: 1.375 },
                            { label: t.kcal.activityLevels.moderate, factor: 1.55 },
                            { label: t.kcal.activityLevels.heavy, factor: 1.725 },
                            { label: t.kcal.activityLevels.veryActive, factor: 1.9 },
                        ].map((level) => (
                            <div key={level.factor} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                                <span className="text-gray-600">{level.label}</span>
                                <span className="font-mono font-medium text-[var(--color-primary-dark)]">
                                    {(results.mifflin * level.factor).toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
               </>
           ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-8">
                   <span className="text-4xl mb-2">⌨️</span>
                   <p>Enter your details to calculate BMR</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default BmrCalculator;
