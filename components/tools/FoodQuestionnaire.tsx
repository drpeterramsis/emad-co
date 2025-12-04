
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { FoodQuestionnaireData } from '../../types';

interface FoodQuestionnaireProps {
  initialData?: FoodQuestionnaireData;
  onSave: (data: FoodQuestionnaireData) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

const ITEMS_KEYS = [
    'home', 'withOthers', 'out', 'sweets', 'sugar', 'sweetener', 'teaCoffee',
    'redMeat', 'eggs', 'fish', 'dairy', 'cheese', 'legumes', 
    'leafyVeg', 'coloredVeg', 'starchyVeg', 'starch', 
    'fruits', 'nuts', 'water'
];

const FREQUENCY_KEYS = ['daily', 'weekly3_4', 'weekly1_2', 'monthly1_2', 'monthlyLess'];

export const FoodQuestionnaire: React.FC<FoodQuestionnaireProps> = ({ initialData, onSave, onClose, isSaving }) => {
  const { t, isRTL } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      if (initialData.answers) setAnswers(initialData.answers);
      if (initialData.notes) setNotes(initialData.notes);
    }
  }, [initialData]);

  const handleSelect = (itemKey: string, freqKey: string) => {
      setAnswers(prev => ({
          ...prev,
          [itemKey]: freqKey
      }));
  };

  const handleNoteChange = (itemKey: string, value: string) => {
      setNotes(prev => ({
          ...prev,
          [itemKey]: value
      }));
  };

  const handleSaveClick = async () => {
      const data: FoodQuestionnaireData = {
          answers,
          notes,
          updatedAt: new Date().toISOString()
      };
      await onSave(data);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-full animate-fade-in overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-green-50 border-b border-green-200 flex justify-between items-center flex-shrink-0">
            <div>
                <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                    <span>🥗</span> {t.foodFreq.title}
                </h2>
                <p className="text-green-700 text-sm opacity-80">Food Frequency Questionnaire</p>
            </div>
            <button onClick={onClose} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm">
                {t.common.back}
            </button>
        </div>

        {/* Content Container - Fixed Height with Scroll */}
        <div className="flex-grow flex flex-col overflow-hidden p-4 md:p-8 bg-gray-50">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-grow flex flex-col overflow-hidden">
                <div className="overflow-auto flex-grow">
                    <table className="w-full border-collapse">
                        <thead className="bg-green-600 text-white text-sm">
                            <tr>
                                <th className="p-3 text-right w-1/4 min-w-[200px] border-r border-green-500 sticky left-0 top-0 z-40 bg-green-600 shadow-md">
                                    {t.mealCreator.foodName}
                                </th>
                                {FREQUENCY_KEYS.map(fk => (
                                    <th key={fk} className="p-3 text-center min-w-[80px] border-r border-green-500 last:border-0 font-medium sticky top-0 z-30 bg-green-600 shadow-sm">
                                        {t.foodFreq[fk as keyof typeof t.foodFreq]}
                                    </th>
                                ))}
                                <th className="p-3 text-center min-w-[150px] border-r border-green-500 last:border-0 font-medium sticky top-0 z-30 bg-green-600 shadow-sm">
                                    {isRTL ? 'ملاحظات' : 'Notes'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {ITEMS_KEYS.map((itemKey) => (
                                <tr key={itemKey} className="hover:bg-green-50 transition-colors">
                                    <td className="p-3 font-bold text-gray-700 bg-gray-50 border-r border-gray-200 sticky left-0 z-20 shadow-sm">
                                        {t.foodFreq.items[itemKey as keyof typeof t.foodFreq.items]}
                                    </td>
                                    {FREQUENCY_KEYS.map(fk => {
                                        const isSelected = answers[itemKey] === fk;
                                        return (
                                            <td 
                                                key={fk} 
                                                className={`p-2 text-center cursor-pointer border-r border-gray-100 last:border-0 transition-all ${isSelected ? 'bg-green-100' : ''}`}
                                                onClick={() => handleSelect(itemKey, fk)}
                                            >
                                                <div className={`w-5 h-5 mx-auto rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                                                    {isSelected && <span className="text-white text-xs">✓</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 border-l border-green-100">
                                        <input
                                            type="text"
                                            className="w-full p-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white placeholder-gray-300"
                                            placeholder={isRTL ? '...' : '...'}
                                            value={notes[itemKey] || ''}
                                            onChange={(e) => handleNoteChange(itemKey, e.target.value)}
                                            dir="auto"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition"
            >
                {t.common.cancel}
            </button>
            <button 
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-8 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
                {isSaving ? 'Saving...' : t.common.save}
            </button>
        </div>
    </div>
  );
};
