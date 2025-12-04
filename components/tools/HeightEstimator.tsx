


import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface HeightEstimatorProps {
    onApplyHeight?: (height: number) => void;
    onApplyWeight?: (weight: number) => void;
    initialData?: {
        gender: 'male' | 'female';
        age: number;
    };
    onClose?: () => void;
}

const HeightEstimator: React.FC<HeightEstimatorProps> = ({ onApplyHeight, onApplyWeight, initialData, onClose }) => {
    const { t } = useLanguage();
    const [tab, setTab] = useState<'ulna' | 'knee' | 'weight'>('ulna');
    
    // Global Inputs
    const [gender, setGender] = useState<'male' | 'female'>(initialData?.gender || 'male');
    const [age, setAge] = useState<number>(initialData?.age || 30);
    
    // Height Inputs
    const [ulnaLength, setUlnaLength] = useState<number | ''>('');
    const [kneeHeight, setKneeHeight] = useState<number | ''>('');
    
    // Weight Inputs (Chumlea)
    const [mac, setMac] = useState<number | ''>(''); // Mid Arm Circumference
    const [calf, setCalf] = useState<number | ''>(''); // Calf Circumference
    const [subscapular, setSubscapular] = useState<number | ''>(''); // Skinfold
    const [suprailiac, setSuprailiac] = useState<number | ''>(''); // Skinfold

    // Results
    const [estimatedHeight, setEstimatedHeight] = useState<number | null>(null);
    const [estimatedWeight, setEstimatedWeight] = useState<number | null>(null);
    const [formulaUsed, setFormulaUsed] = useState<string>('');

    useEffect(() => {
        setEstimatedHeight(null);
        setEstimatedWeight(null);
        setFormulaUsed('');
    }, [tab, gender, age, ulnaLength, kneeHeight, mac, calf, subscapular, suprailiac]);

    const calculate = () => {
        // --- HEIGHT CALCULATION ---
        if (tab === 'ulna' && ulnaLength) {
            const u = Number(ulnaLength);
            let h = 0;
            if (age < 65) {
                if (gender === 'male') {
                    // Approx linear regression from BAPEN
                    h = (0.0354 * u) + 0.81;
                } else {
                    h = (0.0326 * u) + 0.80;
                }
            } else {
                if (gender === 'male') {
                    h = (0.0338 * u) + 0.79;
                } else {
                    h = (0.0353 * u) + 0.71;
                }
            }
            // Convert meters to cm
            setEstimatedHeight(Number((h * 100).toFixed(1)));
            setFormulaUsed(t.tools.heightEstimator.desc + ' (BAPEN/MUST Approx)');
        } 
        else if (tab === 'knee' && kneeHeight) {
            const k = Number(kneeHeight);
            let h = 0;
            // Chumlea et al (Knee Height)
            if (gender === 'male') {
                h = 64.19 - (0.04 * age) + (2.02 * k);
            } else {
                h = 84.88 - (0.24 * age) + (1.83 * k);
            }
            setEstimatedHeight(Number(h.toFixed(1)));
            setFormulaUsed('Chumlea et al. (Knee Height)');
        }
        
        // --- WEIGHT CALCULATION (Chumlea) ---
        else if (tab === 'weight' && mac && calf && subscapular && suprailiac) {
            const m = Number(mac);
            const c = Number(calf);
            const ss = Number(subscapular);
            const si = Number(suprailiac);
            let w = 0;

            if (gender === 'male') {
                // Chumlea Equation for Men
                // Weight = (1.10 x MAC) + (0.31 x Calf) + (0.64 x Subscapular) + (0.946 x Suprailiac) - 18.2
                w = (1.10 * m) + (0.31 * c) + (0.64 * ss) + (0.946 * si) - 18.2;
            } else {
                // Chumlea Equation for Women
                // Weight = (0.87 x MAC) + (0.98 x Calf) + (0.40 x Subscapular) + (0.45 x Suprailiac) - 6.4
                w = (0.87 * m) + (0.98 * c) + (0.40 * ss) + (0.45 * si) - 6.4;
            }
            setEstimatedWeight(Number(w.toFixed(1)));
            setFormulaUsed('Chumlea et al. (Anthropometric Weight)');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.heightEst.title}</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
                <button 
                    onClick={() => setTab('ulna')}
                    className={`flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-bold transition whitespace-nowrap ${tab === 'ulna' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                >
                    {t.heightEst.ulna}
                </button>
                <button 
                    onClick={() => setTab('knee')}
                    className={`flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-bold transition whitespace-nowrap ${tab === 'knee' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                >
                    {t.heightEst.knee}
                </button>
                <button 
                    onClick={() => setTab('weight')}
                    className={`flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-bold transition whitespace-nowrap ${tab === 'weight' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
                >
                    {t.heightEst.weight}
                </button>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.kcal.gender}</label>
                        <select 
                            value={gender} 
                            onChange={(e) => setGender(e.target.value as any)}
                            className="w-full p-2 border rounded-lg bg-gray-50"
                        >
                            <option value="male">{t.kcal.male}</option>
                            <option value="female">{t.kcal.female}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{t.kcal.age}</label>
                        <input 
                            type="number" 
                            value={age} 
                            onChange={(e) => setAge(Number(e.target.value))}
                            className="w-full p-2 border rounded-lg"
                        />
                    </div>
                </div>

                {/* Dynamic Inputs based on Tab */}
                {tab === 'ulna' && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t.heightEst.ulnaLength}
                        </label>
                        <input 
                            type="number" 
                            value={ulnaLength}
                            onChange={(e) => setUlnaLength(Number(e.target.value))}
                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:border-blue-500 outline-none text-lg font-mono"
                            placeholder="cm"
                        />
                    </div>
                )}

                {tab === 'knee' && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t.heightEst.kneeHeight}
                        </label>
                        <input 
                            type="number" 
                            value={kneeHeight}
                            onChange={(e) => setKneeHeight(Number(e.target.value))}
                            className="w-full p-3 border-2 border-blue-100 rounded-lg focus:border-blue-500 outline-none text-lg font-mono"
                            placeholder="cm"
                        />
                    </div>
                )}

                {tab === 'weight' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t.heightEst.mac}</label>
                            <input 
                                type="number" value={mac} onChange={(e) => setMac(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500" placeholder="cm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t.heightEst.cc}</label>
                            <input 
                                type="number" value={calf} onChange={(e) => setCalf(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500" placeholder="cm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t.heightEst.ssf}</label>
                            <input 
                                type="number" value={subscapular} onChange={(e) => setSubscapular(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500" placeholder="mm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t.heightEst.sisf}</label>
                            <input 
                                type="number" value={suprailiac} onChange={(e) => setSuprailiac(Number(e.target.value))}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500" placeholder="mm"
                            />
                        </div>
                    </div>
                )}

                <button 
                    onClick={calculate}
                    disabled={!age || 
                        (tab === 'ulna' && !ulnaLength) || 
                        (tab === 'knee' && !kneeHeight) || 
                        (tab === 'weight' && (!mac || !calf || !subscapular || !suprailiac))
                    }
                    className={`w-full py-3 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${tab === 'weight' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {t.common.calculate}
                </button>

                {/* Results Display */}
                {tab !== 'weight' && estimatedHeight && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200 text-center animate-fade-in">
                        <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">{t.heightEst.estimatedHeight}</span>
                        <div className="text-3xl font-extrabold text-blue-800 my-2">
                            {estimatedHeight} <span className="text-lg font-medium text-blue-600">cm</span>
                        </div>
                        <div className="text-xs text-blue-400">{formulaUsed}</div>
                        
                        {onApplyHeight && (
                            <button 
                                onClick={() => onApplyHeight(estimatedHeight)}
                                className="mt-4 w-full py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition font-bold shadow-sm"
                            >
                                {t.common.apply}
                            </button>
                        )}
                    </div>
                )}

                {tab === 'weight' && estimatedWeight && (
                    <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200 text-center animate-fade-in">
                        <span className="text-xs text-green-600 font-bold uppercase tracking-wider">{t.heightEst.estimatedWeight}</span>
                        <div className="text-3xl font-extrabold text-green-800 my-2">
                            {estimatedWeight} <span className="text-lg font-medium text-green-600">kg</span>
                        </div>
                        <div className="text-xs text-green-400">{formulaUsed}</div>
                        
                        {onApplyWeight && (
                            <button 
                                onClick={() => onApplyWeight(estimatedWeight)}
                                className="mt-4 w-full py-2 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition font-bold shadow-sm"
                            >
                                {t.common.apply}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeightEstimator;