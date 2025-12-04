import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { InputGroup, SelectGroup } from '../InputComponents';

interface WeightInfoProps {
  currentWeight: number;
  setCurrentWeight: (v: number) => void;
  selectedWeight: number;
  setSelectedWeight: (v: number) => void;
  usualWeight: number;
  setUsualWeight: (v: number) => void;
  changeDuration: number;
  setChangeDuration: (v: number) => void;
  ascites: number;
  setAscites: (v: number) => void;
  edema: number;
  setEdema: (v: number) => void;
  amputationPercent?: number;
  setAmputationPercent?: (v: number) => void;
  bodyFatPercent?: number | '';
  setBodyFatPercent?: (v: number | '') => void;
}

const WeightInfoCard: React.FC<WeightInfoProps> = ({
  currentWeight, setCurrentWeight, selectedWeight, setSelectedWeight,
  usualWeight, setUsualWeight, changeDuration, setChangeDuration,
  ascites, setAscites, edema, setEdema,
  amputationPercent, setAmputationPercent,
  bodyFatPercent, setBodyFatPercent
}) => {
  const { t } = useLanguage();
  const [showSpecialCondition, setShowSpecialCondition] = useState(false);
  
  // Local state for amputations
  const [ampSelection, setAmpSelection] = useState<Record<string, number>>({
      hand: 0,
      forearm: 0,
      arm: 0,
      foot: 0,
      lowerLeg: 0,
      leg: 0
  });

  // Recalculate percent when selection changes
  useEffect(() => {
      if (setAmputationPercent) {
          let total = 0;
          total += ampSelection.hand * 0.7;
          total += ampSelection.forearm * 2.3; // Forearm + Hand approx
          total += ampSelection.arm * 5.0;
          
          total += ampSelection.foot * 1.5;
          total += ampSelection.lowerLeg * 5.9; // Lower Leg + Foot approx
          total += ampSelection.leg * 16.0;
          
          setAmputationPercent(Number(total.toFixed(2)));
      }
  }, [ampSelection]);

  const updateAmp = (key: string, val: number) => {
      setAmpSelection(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="card bg-white">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <span className="text-2xl">⚖️</span>
        <h2 className="text-xl font-bold text-[var(--color-heading)]">{t.kcal.weightInfo}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InputGroup label={t.kcal.currentWeight} value={currentWeight} onChange={setCurrentWeight} error={currentWeight === 0} />
        <InputGroup label={t.kcal.selectedWeight} value={selectedWeight} onChange={setSelectedWeight} error={selectedWeight === 0} />
      </div>

      {/* Special Conditions Toggle */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button 
          onClick={() => setShowSpecialCondition(!showSpecialCondition)}
          className="flex items-center justify-between w-full p-3 rounded-lg bg-[var(--color-bg-soft)] hover:bg-green-100 transition text-[var(--color-heading)]"
        >
          <span className="font-semibold flex items-center gap-2">
             🩺 {t.kcal.specialConditions}
          </span>
          <span className="text-sm text-[var(--color-primary)]">
             {showSpecialCondition ? t.kcal.hideConditions : t.kcal.showConditions}
          </span>
        </button>

        {showSpecialCondition && (
           <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
              <InputGroup label={t.kcal.usualWeight} value={usualWeight} onChange={setUsualWeight} />
              
              {/* Body Fat Input */}
              {setBodyFatPercent && (
                  <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                          {t.kcal.bodyFatManual}
                      </label>
                      <input
                          type="number"
                          value={bodyFatPercent || ''}
                          onChange={(e) => setBodyFatPercent(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="%"
                          dir="ltr"
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                      />
                  </div>
              )}

              <SelectGroup 
                label={t.kcal.duration}
                value={changeDuration}
                onChange={setChangeDuration}
                options={[
                  { value: 0, label: '-' },
                  { value: 2, label: '1 Week' },
                  { value: 5, label: '1 Month' },
                  { value: 7.5, label: '3 Months' },
                  { value: 10, label: '6 Months' },
                  { value: 20, label: '1 Year' },
                ]}
              />
              
              <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
                  <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
                      Mendenhall's Figure (Fluid Correction)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <SelectGroup 
                        label={t.kcal.ascites}
                        value={ascites}
                        onChange={setAscites}
                        options={[
                          { value: 0, label: 'None' },
                          { value: 2.2, label: 'Minimal (2.2kg)' },
                          { value: 6, label: 'Moderate (6kg)' },
                          { value: 14, label: 'Severe (14kg)' },
                        ]}
                      />
                      <SelectGroup 
                        label={t.kcal.edema}
                        value={edema}
                        onChange={setEdema}
                        options={[
                          { value: 0, label: 'None' },
                          { value: 1, label: 'Minimal (1kg)' },
                          { value: 5, label: 'Moderate (5kg)' },
                          { value: 10, label: 'Severe (10kg)' },
                        ]}
                      />
                  </div>
              </div>

              {setAmputationPercent && (
                  <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
                      <div className="flex justify-between items-center mb-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              {t.kcal.amputations}
                          </p>
                          <span className="text-xs font-mono bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">
                              Total: {amputationPercent?.toFixed(1)}%
                          </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          {/* Hands */}
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.hand}</label>
                              <select value={ampSelection.hand} onChange={(e) => updateAmp('hand', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.forearm}</label>
                              <select value={ampSelection.forearm} onChange={(e) => updateAmp('forearm', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.arm}</label>
                              <select value={ampSelection.arm} onChange={(e) => updateAmp('arm', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                          
                          {/* Legs */}
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.foot}</label>
                              <select value={ampSelection.foot} onChange={(e) => updateAmp('foot', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.lowerLeg}</label>
                              <select value={ampSelection.lowerLeg} onChange={(e) => updateAmp('lowerLeg', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                              <label className="block text-gray-600 mb-1 font-bold">{t.kcal.ampItems.leg}</label>
                              <select value={ampSelection.leg} onChange={(e) => updateAmp('leg', Number(e.target.value))} className="w-full p-1 border rounded">
                                  <option value={0}>0</option>
                                  <option value={1}>1</option>
                                  <option value={2}>2</option>
                              </select>
                          </div>
                      </div>
                  </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};

export default WeightInfoCard;