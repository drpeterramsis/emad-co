import React from 'react';

interface InputGroupProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  error?: boolean;
  type?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
      {label}
    </label>
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      dir="ltr"
      className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 transition-shadow ${
        error 
          ? 'border-red-300 focus:ring-red-200 bg-red-50' 
          : 'border-gray-200 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]'
      }`}
    />
  </div>
);

interface SelectGroupProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  options: { value: number; label: string }[];
}

export const SelectGroup: React.FC<SelectGroupProps> = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 rtl:left-0 ltr:right-0 flex items-center px-2 text-gray-500">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);
