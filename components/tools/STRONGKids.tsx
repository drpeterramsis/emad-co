
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface STRONGKidsProps {
    onSave?: (resultText: string) => void;
    onClose?: () => void;
}

const STRONGKids: React.FC<STRONGKidsProps> = ({ onSave, onClose }) => {
    const { t } = useLanguage();
    const [scores, setScores] = useState({
        q1: 0, // Illness/Surgery (0 or 2)
        q2: 0, // Clinical Status (0 or 1)
        q3: 0, // Symptoms (0 or 1)
        q4: 0, // Weight Loss (0 or 1)
    });

    const [isPrintMode, setIsPrintMode] = useState(false);

    const diseases = [
        "Psychiatric eating disorder", "Burns", "Bronchopulmonary dysplasia (up to age 2)", 
        "Celiac disease (active)", "Cystic fibrosis", "Dysmaturity/prematurity (until corrected age 6 months)",
        "Cardiac disease, chronic", "Infectious disease", "Inflammatory bowel disease", "Cancer",
        "Liver disease, chronic", "Kidney disease, chronic", "Pancreatitis", "Short bowel syndrome",
        "Muscle disease", "Metabolic disease", "Trauma", "Mental handicap/retardation",
        "Expected major surgery", "Not specified (classified by doctor)"
    ];

    const totalScore = scores.q1 + scores.q2 + scores.q3 + scores.q4;

    const getRiskLevel = (score: number) => {
        if (score >= 4) return { level: 'High Risk', color: 'bg-red-100 text-red-800', intervention: 'Consult doctor/dietician. Full diagnosis. Individual advice. Check weight 2x/week.' };
        if (score >= 1) return { level: 'Medium Risk', color: 'bg-orange-100 text-orange-800', intervention: 'Consider intervention. Check weight 2x/week. Evaluate risk weekly.' };
        return { level: 'Low Risk', color: 'bg-green-100 text-green-800', intervention: 'No intervention necessary. Check weight regularly. Evaluate risk weekly.' };
    };

    const result = getRiskLevel(totalScore);

    const handlePrint = () => {
        window.print();
    };

    const handleSave = () => {
        if (onSave) {
            const date = new Date().toLocaleDateString('en-GB');
            const note = `[STRONGkids Assessment - ${date}]
- Underlying Illness Risk: ${scores.q1 > 0 ? 'Yes' : 'No'}
- Poor Clinical Status: ${scores.q2 > 0 ? 'Yes' : 'No'}
- Symptoms (Diarrhea/Vomit/Pain): ${scores.q3 > 0 ? 'Yes' : 'No'}
- Weight Loss/No Gain: ${scores.q4 > 0 ? 'Yes' : 'No'}
--------------------------------------
Total Score: ${totalScore} points
Risk Level: ${result.level}
Intervention: ${result.intervention}`;
            onSave(note);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-4xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6 no-print">
                <div>
                    <h2 className="text-2xl font-bold text-blue-900">STRONGkids Screening Tool</h2>
                    <p className="text-sm text-gray-500">Nutritional risk screening for children (1 month - 18 years)</p>
                </div>
                <div className="flex gap-2">
                    {onClose && (
                        <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
                            Close
                        </button>
                    )}
                    <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm">
                        Print Report
                    </button>
                    {onSave && (
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold">
                            Add to Notes
                        </button>
                    )}
                </div>
            </div>

            {/* Assessment Table */}
            <div className="border border-blue-200 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 text-blue-900 text-left">
                        <tr>
                            <th className="p-4 w-3/4">Screening Item</th>
                            <th className="p-4 text-center">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* Q1 */}
                        <tr className="hover:bg-blue-50/30">
                            <td className="p-4">
                                <p className="font-bold text-gray-800 mb-2">1. Is there an underlying illness with risk for malnutrition or expected major surgery?</p>
                                <div className="text-xs text-gray-500 grid grid-cols-2 md:grid-cols-3 gap-1 bg-gray-50 p-2 rounded">
                                    {diseases.map((d, i) => <span key={i}>• {d}</span>)}
                                </div>
                            </td>
                            <td className="p-4 text-center align-top">
                                <div className="flex flex-col gap-2 items-center">
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q1 === 2 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q1" className="hidden" checked={scores.q1 === 2} onChange={() => setScores({...scores, q1: 2})} />
                                        Yes (2)
                                    </label>
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q1 === 0 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q1" className="hidden" checked={scores.q1 === 0} onChange={() => setScores({...scores, q1: 0})} />
                                        No (0)
                                    </label>
                                </div>
                            </td>
                        </tr>

                        {/* Q2 */}
                        <tr className="hover:bg-blue-50/30">
                            <td className="p-4">
                                <p className="font-bold text-gray-800">2. Is the patient in a poor nutritional status judged by subjective clinical assessment?</p>
                                <p className="text-xs text-gray-500 mt-1">(loss of subcutaneous fat / loss of muscle mass / hollow face)</p>
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex flex-col gap-2 items-center">
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q2 === 1 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q2" className="hidden" checked={scores.q2 === 1} onChange={() => setScores({...scores, q2: 1})} />
                                        Yes (1)
                                    </label>
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q2 === 0 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q2" className="hidden" checked={scores.q2 === 0} onChange={() => setScores({...scores, q2: 0})} />
                                        No (0)
                                    </label>
                                </div>
                            </td>
                        </tr>

                        {/* Q3 */}
                        <tr className="hover:bg-blue-50/30">
                            <td className="p-4">
                                <p className="font-bold text-gray-800 mb-2">3. Is one of the following items present?</p>
                                <ul className="text-xs text-gray-600 list-disc list-inside ml-2">
                                    <li>Excessive diarrhea (≥5 per day) and/or vomiting (&gt;3 times/day) during last 1-3 days</li>
                                    <li>Reduced food intake during last 1-3 days</li>
                                    <li>Pre-existing nutritional intervention (e.g. ONS or tube feeding)</li>
                                    <li>Inability to consume adequate nutritional intake because of pain</li>
                                </ul>
                            </td>
                            <td className="p-4 text-center align-top">
                                <div className="flex flex-col gap-2 items-center">
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q3 === 1 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q3" className="hidden" checked={scores.q3 === 1} onChange={() => setScores({...scores, q3: 1})} />
                                        Yes (1)
                                    </label>
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q3 === 0 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q3" className="hidden" checked={scores.q3 === 0} onChange={() => setScores({...scores, q3: 0})} />
                                        No (0)
                                    </label>
                                </div>
                            </td>
                        </tr>

                        {/* Q4 */}
                        <tr className="hover:bg-blue-50/30">
                            <td className="p-4">
                                <p className="font-bold text-gray-800">4. Is there weight loss (all ages) and/or no increase in weight/height (infants &lt; 1yr) during the last few weeks/months?</p>
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex flex-col gap-2 items-center">
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q4 === 1 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q4" className="hidden" checked={scores.q4 === 1} onChange={() => setScores({...scores, q4: 1})} />
                                        Yes (1)
                                    </label>
                                    <label className={`cursor-pointer px-4 py-1 rounded border ${scores.q4 === 0 ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600'}`}>
                                        <input type="radio" name="q4" className="hidden" checked={scores.q4 === 0} onChange={() => setScores({...scores, q4: 0})} />
                                        No (0)
                                    </label>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Results Section */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="text-center md:text-left">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Score</span>
                        <div className="text-5xl font-extrabold text-blue-900">{totalScore}</div>
                        <span className="text-xs text-gray-400">/ 5 points</span>
                    </div>
                    
                    <div className={`flex-grow p-4 rounded-xl border-l-4 ${result.color.replace('bg-', 'border-').replace('text-', 'bg-white text-')}`}>
                        <h3 className={`text-xl font-bold mb-2 ${result.color.split(' ')[1]}`}>{result.level}</h3>
                        <p className="text-gray-700 font-medium">Intervention & Follow-up:</p>
                        <p className="text-sm text-gray-600 mt-1">{result.intervention}</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 text-[10px] text-gray-400 text-center">
                Reference: STRONGkids Nutritional Risk Screening Tool.
            </div>
        </div>
    );
};

export default STRONGKids;
