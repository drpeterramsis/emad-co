import React, { useState, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { exchangeSimpleDatabase, exchangeProDatabase, ExchangeItem } from "../../data/exchangeData";

interface FoodExchangeProps {
  mode: 'simple' | 'pro';
}

const FoodExchange: React.FC<FoodExchangeProps> = ({ mode }) => {
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");

  const data = mode === 'simple' ? exchangeSimpleDatabase : exchangeProDatabase;
  const title = mode === 'simple' ? t.tools.exchangeSimple.title : t.tools.exchangePro.title;

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (item) => item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [searchQuery, data]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
       {/* Header */}
       <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-heading)] mb-4">{title}</h1>
        <input
            type="text"
            className="w-full max-w-lg px-6 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none shadow-sm text-lg"
            placeholder={t.mealCreator.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            dir={isRTL ? 'rtl' : 'ltr'}
        />
      </div>

      {/* Table Container */}
      <div className="card bg-white shadow-xl overflow-hidden border-0 ring-1 ring-gray-100">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-primary)] text-white sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-4 text-right w-1/3">{t.mealCreator.foodName}</th>
                <th className="p-4 text-center">{t.mealCreator.group}</th>
                {mode === 'pro' && <th className="p-4 text-center">{t.mealCreator.gm}</th>}
                <th className="p-4 text-center">{t.mealCreator.serves}</th>
                <th className="p-4 text-center">CHO</th>
                <th className="p-4 text-center">PRO</th>
                <th className="p-4 text-center">FAT</th>
                <th className="p-4 text-center">{t.mealCreator.kcal}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item, idx) => (
                <tr key={idx} className="hover:bg-green-50/50 transition-colors group">
                  <td className="p-3 text-right font-medium text-gray-800">
                    {item.name.replace(/\(.*?\)/g, '')}
                    <span className="text-red-500 text-xs block opacity-80">{item.name.match(/\(.*?\)/g)}</span>
                  </td>
                  <td className="p-3 text-center text-gray-500 group-hover:text-[var(--color-primary)]">{item.group}</td>
                  {mode === 'pro' && <td className="p-3 text-center font-mono text-gray-600">{item.serves > 5 ? item.serves : '-'}</td>}
                  <td className="p-3 text-center font-mono">{mode === 'pro' && item.serves > 5 ? '100g' : item.serves}</td>
                  <td className={`p-3 text-center font-mono ${item.cho === 0 ? 'text-gray-300' : 'text-blue-600'}`}>{item.cho}</td>
                  <td className={`p-3 text-center font-mono ${item.protein === 0 ? 'text-gray-300' : 'text-red-600'}`}>{item.protein}</td>
                  <td className={`p-3 text-center font-mono ${item.fat === 0 ? 'text-gray-300' : 'text-yellow-600'}`}>{item.fat}</td>
                  <td className={`p-3 text-center font-mono font-bold ${item.kcal === 0 ? 'text-gray-300' : 'text-[var(--color-primary-dark)]'}`}>{item.kcal.toFixed(0)}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                  <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">No items found.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 p-3 text-xs text-center text-gray-500 border-t border-gray-100">
            Showing {filteredData.length} items
        </div>
      </div>
    </div>
  );
};

export default FoodExchange;