import React, { useState, useEffect, useCallback } from 'react';
import { X, Delete, Calculator } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalculatorModal = ({ isOpen, onClose }: CalculatorModalProps) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleNumber = useCallback((num: string) => {
    setDisplay(prev => (prev === '0' || isNewNumber ? num : prev + num));
    setIsNewNumber(false);
  }, [isNewNumber]);

  const handleOperator = useCallback((op: string) => {
    setEquation(prev => {
        // If we just hit equal, start new equation with result
        if (prev.includes('=')) {
            return display + ' ' + op + ' ';
        }
        // If last char was operator, replace it
        if (isNewNumber && prev && !prev.includes('=')) {
             return prev.slice(0, -3) + ' ' + op + ' ';
        }
        return prev + display + ' ' + op + ' ';
    });
    setIsNewNumber(true);
  }, [display, isNewNumber]);

  const calculate = useCallback(() => {
    try {
      if (equation.includes('=')) return; // Already calculated

      let expr = equation + display;
      
      // Replace visual operators with JS operators if needed (x -> *)
      // We are using standard operators mostly, but let's be safe
      const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
      
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + safeExpr)();
      
      const formattedResult = String(Math.round(result * 100000) / 100000); // Round to avoid float errors
      setDisplay(formattedResult);
      setEquation(expr + ' =');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Error');
      setIsNewNumber(true);
    }
  }, [display, equation]);

  const clear = useCallback(() => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  }, []);

  const backspace = useCallback(() => {
    if (isNewNumber) return;
    setDisplay(prev => {
      if (prev.length === 1) return '0';
      return prev.slice(0, -1);
    });
  }, [isNewNumber]);

  const handleDecimal = useCallback(() => {
    if (isNewNumber) {
        setDisplay('0.');
        setIsNewNumber(false);
    } else if (!display.includes('.')) {
        setDisplay(prev => prev + '.');
    }
  }, [display, isNewNumber]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (/[0-9]/.test(key)) {
        e.preventDefault();
        handleNumber(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        handleOperator(key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
      } else if (key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (key === '.' || key === ',') {
        e.preventDefault();
        handleDecimal();
      } else if (key.toLowerCase() === 'c') {
        e.preventDefault();
        clear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNumber, handleOperator, calculate, backspace, handleDecimal, clear]);

  if (!isOpen) return null;

  const btnClass = "h-14 text-lg font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center shadow-sm select-none";
  const numBtnClass = `${btnClass} bg-white text-slate-800 hover:bg-slate-50 border border-slate-200`;
  const opBtnClass = `${btnClass} bg-slate-100 text-primary hover:bg-slate-200 border border-slate-200`;
  const actionBtnClass = `${btnClass} bg-primary text-white hover:bg-teal-700 shadow-md`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-50 p-5 rounded-2xl shadow-2xl w-full max-w-xs border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-slate-600 font-bold">
            <Calculator size={20} />
            <span>Calculator</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Display */}
        <div className="bg-white p-4 rounded-xl border border-slate-300 mb-4 text-right shadow-inner">
          <div className="text-xs text-slate-400 h-4 font-mono overflow-hidden whitespace-nowrap">{equation}</div>
          <div className="text-3xl font-bold text-slate-800 truncate font-mono tracking-tight">{display}</div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          <button onClick={clear} className={`${opBtnClass} text-red-500`}>C</button>
          <button onClick={() => handleOperator('/')} className={opBtnClass}>/</button>
          <button onClick={() => handleOperator('*')} className={opBtnClass}>×</button>
          <button onClick={backspace} className={opBtnClass}><Delete size={20}/></button>

          <button onClick={() => handleNumber('7')} className={numBtnClass}>7</button>
          <button onClick={() => handleNumber('8')} className={numBtnClass}>8</button>
          <button onClick={() => handleNumber('9')} className={numBtnClass}>9</button>
          <button onClick={() => handleOperator('-')} className={opBtnClass}>-</button>

          <button onClick={() => handleNumber('4')} className={numBtnClass}>4</button>
          <button onClick={() => handleNumber('5')} className={numBtnClass}>5</button>
          <button onClick={() => handleNumber('6')} className={numBtnClass}>6</button>
          <button onClick={() => handleOperator('+')} className={opBtnClass}>+</button>

          <div className="col-span-3 grid grid-cols-3 gap-3">
             <button onClick={() => handleNumber('1')} className={numBtnClass}>1</button>
             <button onClick={() => handleNumber('2')} className={numBtnClass}>2</button>
             <button onClick={() => handleNumber('3')} className={numBtnClass}>3</button>
             <button onClick={() => handleNumber('0')} className={`${numBtnClass} col-span-2`}>0</button>
             <button onClick={handleDecimal} className={numBtnClass}>.</button>
          </div>
          <button onClick={calculate} className={`${actionBtnClass} row-span-2 text-2xl`}>=</button>
        </div>
        
        <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-400">Keyboard shortcuts enabled</p>
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;