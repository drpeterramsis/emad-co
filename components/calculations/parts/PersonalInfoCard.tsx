
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { InputGroup, SelectGroup } from '../InputComponents';
import { PediatricAge, PregnancyState } from '../hooks/useKcalCalculations';

interface PersonalInfoProps {
  gender: 'male' | 'female';
  setGender: (v: 'male' | 'female') => void;
  
  age: number;
  setAge: (v: number) => void;
  ageMode?: 'manual' | 'auto';
  setAgeMode?: (v: 'manual' | 'auto') => void;
  dob?: string;
  setDob?: (v: string) => void;
  reportDate?: string;
  setReportDate?: (v: string) => void;
  pediatricAge?: PediatricAge | null;

  height: number;
  setHeight: (v: number) => void;
  waist: number;
  setWaist: (v: number) => void;
  hip?: number;
  setHip?: (v: number) => void;
  
  mac?: number;
  setMac?: (v: number) => void;
  tsf?: number;
  setTsf?: (v: number) => void;

  physicalActivity: number;
  setPhysicalActivity: (v: number) => void;
  
  pregnancyState?: PregnancyState;
  setPregnancyState?: (v: PregnancyState) => void;

  onOpenHeightEstimator?: () => void;
}

const PersonalInfoCard: React.FC<PersonalInfoProps> = ({
  gender, setGender, 
  age, setAge, ageMode, setAgeMode, dob, setDob, reportDate, setReportDate, pediatricAge,
  height, setHeight, waist, setWaist, hip, setHip, mac, setMac, tsf, setTsf,
  physicalActivity, setPhysicalActivity,
  pregnancyState, setPregnancyState,
  onOpenHeightEstimator
}) => {
  const { t } = useLanguage();

  return (
    <div className="card bg-white">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <span className="text-2xl">👤</span>
        <h2 className="text-xl font-bold text-[var(--color-heading)]">{t.kcal.personalInfo}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gender Toggle */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">{t.kcal.gender}</label>
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-primary)]/30">
            <button 
              onClick={() => setGender('male')}
              className={`flex-1 py-2 transition ${gender === 'male' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t.kcal.male}
            </button>
            <button 
              onClick={() => setGender('female')}
              className={`flex-1 py-2 transition ${gender === 'female' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t.kcal.female}
            </button>
          </div>
        </div>

        {/* Pregnancy/Lactation (Only for Female) */}
        {gender === 'female' && age > 10 && setPregnancyState && (
            <div className="col-span-2 bg-pink-50 p-3 rounded-lg border border-pink-100">
                <label className="block text-xs font-bold text-pink-700 uppercase mb-2">Pregnancy / Lactation</label>
                <select 
                    value={pregnancyState || 'none'} 
                    onChange={(e) => setPregnancyState(e.target.value as PregnancyState)}
                    className="w-full p-2 border border-pink-200 rounded text-sm focus:ring-pink-400 focus:border-pink-400"
                >
                    <option value="none">None</option>
                    <option value="preg_1">Pregnancy (1st Trimester)</option>
                    <option value="preg_2">Pregnancy (2nd Trimester)</option>
                    <option value="preg_3">Pregnancy (3rd Trimester)</option>
                    <option value="lact_0_6">Lactation (0-6 Months)</option>
                    <option value="lact_7_12">Lactation (7-12 Months)</option>
                </select>
            </div>
        )}

        {/* Age Section with Auto/Manual Toggle */}
        <div className="col-span-2 md:col-span-1">
            {setAgeMode && setDob && setReportDate ? (
               <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                   <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">{t.kcal.ageMode}</label>
                      <div className="flex bg-white rounded border border-gray-300 overflow-hidden text-xs">
                          <button 
                            onClick={() => setAgeMode('manual')}
                            className={`px-2 py-1 ${ageMode === 'manual' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                             {t.kcal.manual}
                          </button>
                          <button 
                            onClick={() => setAgeMode('auto')}
                            className={`px-2 py-1 ${ageMode === 'auto' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                             {t.kcal.auto}
                          </button>
                      </div>
                   </div>
                   
                   {ageMode === 'manual' ? (
                       <InputGroup label={t.kcal.age} value={age} onChange={setAge} error={age === 0} />
                   ) : (
                       <div className="space-y-2">
                           <div>
                               <label className="block text-xs text-gray-600 mb-1">{t.kcal.dob}</label>
                               <input 
                                 type="date" 
                                 className="w-full p-2 border rounded text-sm bg-white"
                                 value={dob || ''}
                                 onChange={(e) => setDob(e.target.value)}
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-600 mb-1">{t.kcal.reportDate}</label>
                               <input 
                                 type="date" 
                                 className="w-full p-2 border rounded text-sm bg-white"
                                 value={reportDate || ''}
                                 onChange={(e) => setReportDate(e.target.value)}
                               />
                           </div>
                           <div className="flex justify-between items-center pt-1">
                               <span className="text-sm font-medium text-gray-600">{t.kcal.calcAge}:</span>
                               <span className="text-lg font-bold text-[var(--color-primary)]">{age}</span>
                           </div>
                           {pediatricAge && (
                               <div className="text-xs text-gray-500 font-mono bg-white p-1 rounded border border-gray-100 text-center">
                                   {pediatricAge.years}Y {pediatricAge.months}M {pediatricAge.days}D
                               </div>
                           )}
                       </div>
                   )}

                   <div className={`mt-2 text-xs font-bold px-2 py-1 rounded text-center ${age < 20 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                       {age < 20 ? t.kcal.pediatricStatus : t.kcal.adultStatus}
                   </div>
               </div>
            ) : (
               /* Fallback if new props aren't passed yet */
               <InputGroup label={t.kcal.age} value={age} onChange={setAge} error={age === 0} />
            )}
        </div>

        <div className="col-span-2 md:col-span-1 space-y-5">
            <div className="relative">
                <InputGroup label={t.kcal.height} value={height} onChange={setHeight} error={height === 0} />
                {onOpenHeightEstimator && (
                    <button 
                        onClick={onOpenHeightEstimator}
                        className="absolute top-0 right-0 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                    >
                        Estimate Ht/Wt?
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <InputGroup label={t.kcal.waist} value={waist} onChange={setWaist} error={waist === 0} />
                {hip !== undefined && setHip && (
                    <InputGroup label={t.kcal.hip} value={hip} onChange={setHip} />
                )}
            </div>
            <p className="text-[10px] text-gray-400 -mt-2 italic leading-tight">
                ℹ️ Waist: Midpoint between iliac & rib. Hip: Widest part of buttocks.
            </p>
        </div>
        
        {/* Anthropometry Section */}
        {mac !== undefined && setMac && tsf !== undefined && setTsf && (
            <div className="col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-bold text-xs text-purple-700 uppercase mb-3 border-b border-purple-200 pb-1">
                    Anthropometry (Detailed)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                            {t.kcal.mac}
                        </label>
                        <input
                            type="number"
                            value={mac || ''}
                            onChange={(e) => setMac(Number(e.target.value))}
                            placeholder="cm"
                            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 border-gray-200 focus:ring-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                            {t.kcal.tsf}
                        </label>
                        <input
                            type="number"
                            value={tsf || ''}
                            onChange={(e) => setTsf(Number(e.target.value))}
                            placeholder="mm"
                            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 border-gray-200 focus:ring-purple-500"
                        />
                    </div>
                </div>
            </div>
        )}

        <div className="col-span-2">
            <SelectGroup 
            label={t.kcal.activity}
            value={physicalActivity}
            onChange={setPhysicalActivity}
            options={[
                { value: 0, label: t.kcal.selectActivity },
                { value: 1.2, label: t.kcal.activityLevels.sedentary },
                { value: 1.375, label: t.kcal.activityLevels.mild },
                { value: 1.55, label: t.kcal.activityLevels.moderate },
                { value: 1.725, label: t.kcal.activityLevels.heavy },
                { value: 1.9, label: t.kcal.activityLevels.veryActive },
            ]}
            />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoCard;
