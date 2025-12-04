
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DietaryAssessmentData } from '../../types';

interface DietaryAssessmentProps {
  initialData?: DietaryAssessmentData;
  onSave: (data: DietaryAssessmentData) => Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

const ROW_KEYS = [
  'breakfast', 
  'snack1', 
  'lunch', 
  'snack2', 
  'dinner', 
  'snack3', 
  'water', 
  'sports'
];

export const DietaryAssessment: React.FC<DietaryAssessmentProps> = ({ initialData, onSave, onClose, isSaving }) => {
  const { t, isRTL } = useLanguage();
  const [daysCount, setDaysCount] = useState<number>(1);
  const [dates, setDates] = useState<string[]>([]);
  const [gridData, setGridData] = useState<DietaryAssessmentData['recall']>({});

  // Initialize
  useEffect(() => {
    if (initialData) {
      setDaysCount(initialData.days || 1);
      setDates(initialData.dates || []);
      setGridData(initialData.recall || {});
    } else {
      // Default: 1 day, today's date
      setDaysCount(1);
      setDates([new Date().toISOString().split('T')[0]]);
      setGridData({});
    }
  }, [initialData]);

  // Adjust dates array when days count changes
  useEffect(() => {
    const newDates = [...dates];
    if (newDates.length < daysCount) {
      for (let i = newDates.length; i < daysCount; i++) {
        newDates.push('');
      }
    } else if (newDates.length > daysCount) {
      newDates.splice(daysCount);
    }
    setDates(newDates);
  }, [daysCount]);

  const handleGridChange = (rowKey: string, dayIndex: number, value: string) => {
    setGridData(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [`day${dayIndex + 1}`]: value
      }
    }));
  };

  const handleDateChange = (index: number, val: string) => {
    const newDates = [...dates];
    newDates[index] = val;
    setDates(newDates);
  };

  const handleSaveClick = async () => {
    const data: DietaryAssessmentData = {
      days: daysCount,
      dates: dates,
      recall: gridData
    };
    await onSave(data);
  };

  const getRowLabel = (key: string) => {
    switch (key) {
      case 'breakfast': return t.dietary.meals.breakfast;
      case 'snack1': return t.dietary.meals.snack;
      case 'lunch': return t.dietary.meals.lunch;
      case 'snack2': return t.dietary.meals.snack;
      case 'dinner': return t.dietary.meals.dinner;
      case 'snack3': return t.dietary.meals.snack;
      case 'water': return t.dietary.meals.water;
      case 'sports': return t.dietary.meals.sports;
      default: return key;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-full animate-fade-in overflow-hidden">
      
      {/* Header */}
      <div className="p-6 bg-yellow-50 border-b border-yellow-200 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-yellow-800 flex items-center gap-2">
            <span>📅</span> {t.dietary.title}
          </h2>
          <p className="text-yellow-700 text-sm opacity-80">24hr - 7 Days Recall</p>
        </div>
        <button onClick={onClose} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm">
            {t.common.back}
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
        <label className="font-bold text-gray-700 text-sm">{t.dietary.days}:</label>
        <select 
          value={daysCount}
          onChange={(e) => setDaysCount(Number(e.target.value))}
          className="p-2 border rounded-lg bg-gray-50 font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
        >
          {[1,2,3,4,5,6,7].map(d => (
            <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      {/* Grid Container - Scrollable */}
      <div className="flex-grow flex flex-col overflow-hidden p-4 bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-grow overflow-auto">
            <table className="w-full border-collapse">
            <thead>
                <tr>
                <th className="p-3 bg-yellow-100 text-yellow-900 border border-yellow-200 sticky left-0 top-0 z-50 w-48 text-left min-w-[150px] shadow-sm">
                    Meal / Day
                </th>
                {Array.from({ length: daysCount }).map((_, i) => (
                    <th key={i} className="p-2 bg-yellow-50 border border-yellow-200 min-w-[200px] sticky top-0 z-40 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-yellow-800 font-bold">Day {i + 1}</span>
                        <input 
                        type="date" 
                        value={dates[i] || ''} 
                        onChange={(e) => handleDateChange(i, e.target.value)}
                        className="text-xs p-1 border rounded text-center bg-white/50 focus:bg-white"
                        />
                    </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody>
                {ROW_KEYS.map((rowKey) => (
                <tr key={rowKey}>
                    <td className="p-3 bg-gray-50 font-bold text-gray-700 border border-gray-200 sticky left-0 z-30 shadow-sm">
                    {getRowLabel(rowKey)}
                    </td>
                    {Array.from({ length: daysCount }).map((_, i) => (
                    <td key={i} className="p-0 border border-gray-200">
                        <textarea
                        className="w-full h-full min-h-[80px] p-2 resize-none focus:bg-yellow-50 outline-none text-sm block border-0 bg-transparent"
                        placeholder="..."
                        value={gridData[rowKey]?.[`day${i+1}`] || ''}
                        onChange={(e) => handleGridChange(rowKey, i, e.target.value)}
                        dir="auto"
                        />
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
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
          className="px-8 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? 'Saving...' : t.common.save}
        </button>
      </div>

    </div>
  );
};
