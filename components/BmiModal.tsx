
import React, { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { BmiGauge } from "./Visuals";

interface Props {
  open: boolean;
  onClose: () => void;
}

function BmiModal({ open, onClose }: Props) {
  const { t } = useLanguage();
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [category, setCategory] = useState<string>("");
  const [hint, setHint] = useState<string>("");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const calculateBMI = () => {
    if (!weight || !height) {
      setHint("Please enter both weight and height!");
      setBmi(null);
      setCategory("");
      return;
    }

    setHint("");
    const hMeters = Number(height) / 100;
    const bmiValue = Number((Number(weight) / (hMeters * hMeters)).toFixed(1));
    setBmi(bmiValue);

    if (bmiValue < 18.5) setCategory(t.kcal.status.underweight);
    else if (bmiValue < 25) setCategory(t.kcal.status.normal);
    else if (bmiValue < 30) setCategory(t.kcal.status.overweight);
    else setCategory(t.kcal.status.obese);
  };

  const resetAll = () => {
    setWeight("");
    setHeight("");
    setBmi(null);
    setCategory("");
    setHint("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") calculateBMI();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-heading)]">{t.tools.bmi.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.kcal.currentWeight}</label>
            <input
              type="number"
              placeholder="kg"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              onKeyDown={handleKeyDown}
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.kcal.height}</label>
            <input
              type="number"
              placeholder="cm"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              onKeyDown={handleKeyDown}
              dir="ltr"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
             <button
              onClick={calculateBMI}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white p-3 rounded-lg font-medium transition shadow-md"
            >
              {t.common.calculate}
            </button>
            <button
              onClick={resetAll}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition"
            >
              {t.common.reset}
            </button>
          </div>
        </div>

        {hint && (
          <p className="text-red-500 mt-4 text-center font-medium animate-pulse">{hint}</p>
        )}

        {bmi !== null && !hint && (
          <div className="mt-6 bg-[var(--color-bg-soft)] border border-[var(--color-border)] p-4 rounded-xl text-center">
            <BmiGauge value={bmi} />
            <p className="font-bold text-3xl text-[var(--color-heading)] mb-1 mt-2">{bmi}</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
               category === t.kcal.status.normal ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default BmiModal;
