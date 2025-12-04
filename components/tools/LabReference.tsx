
import React, { useState, useMemo } from 'react';
import { labTestsEncyclopedia } from '../../data/labData';
import { useLanguage } from '../../contexts/LanguageContext';

const LabReference: React.FC = () => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(labTestsEncyclopedia.map(item => item.category));
        return ['All', ...Array.from(cats)];
    }, []);

    const filteredLabs = useMemo(() => {
        let data = labTestsEncyclopedia;
        
        if (selectedCategory !== 'All') {
            data = data.filter(item => item.category === selectedCategory);
        }

        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            data = data.filter(item => 
                item.test.toLowerCase().includes(q) || 
                item.increase?.toLowerCase().includes(q) ||
                item.decrease?.toLowerCase().includes(q)
            );
        }
        return data;
    }, [searchTerm, selectedCategory]);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6 pb-12">
            
            {/* Header */}
            <div className="text-center space-y-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-[var(--color-heading)] flex items-center justify-center gap-3">
                    <span>🧬</span> {t.tools.labs.title}
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto text-sm">
                    Comprehensive biochemical reference ranges, clinical significance, and causes for abnormalities.
                </p>
                
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-4">
                    <input 
                        type="text" 
                        placeholder="Search tests, causes..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-96 p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-2.5 border rounded-lg bg-gray-50 focus:bg-white"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4 border-b">Test Name</th>
                                <th className="p-4 border-b">Normal Range</th>
                                <th className="p-4 border-b text-red-600 bg-red-50">Causes of Increase ⬆️</th>
                                <th className="p-4 border-b text-blue-600 bg-blue-50">Causes of Decrease ⬇️</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLabs.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition">
                                    <td className="p-4 font-medium text-gray-800 bg-white border-r border-gray-50 sticky left-0">
                                        {item.test}
                                        <span className="block text-[10px] text-gray-400 font-normal mt-1">{item.category}</span>
                                    </td>
                                    <td className="p-4 font-mono text-gray-700 whitespace-nowrap bg-gray-50/30">
                                        {item.normal}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {item.increase || '-'}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {item.decrease || '-'}
                                    </td>
                                </tr>
                            ))}
                            {filteredLabs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        No lab tests found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 p-2 text-xs text-center text-gray-400 border-t border-gray-200">
                    Showing {filteredLabs.length} records
                </div>
            </div>
        </div>
    );
};

export default LabReference;
