
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    isAction?: boolean; // For special actions like "+ Create New"
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    className?: string;
    required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder, disabled, icon, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Find label for display
    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 z-10 pointer-events-none">{icon}</div>}
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-10 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl text-sm font-medium transition-all cursor-pointer flex items-center shadow-sm ${disabled ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-slate-800' : 'hover:border-blue-400 hover:shadow-md focus:ring-2 focus:ring-blue-500'}`}
            >
                <span className={`truncate ${!selectedOption ? 'text-slate-400 dark:text-gray-500' : 'text-slate-900 dark:text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder || 'Выберите...'}
                </span>
                <ChevronDown size={16} className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`px-4 py-3 text-sm cursor-pointer transition-colors border-b border-gray-50 dark:border-slate-700 last:border-none flex items-center justify-between ${
                                opt.isAction 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 sticky bottom-0 border-t border-blue-100 dark:border-blue-800' 
                                    : 'text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                            } ${value === opt.value && !opt.isAction ? 'bg-blue-50 dark:bg-slate-700 font-semibold' : ''}`}
                        >
                            {opt.label}
                            {value === opt.value && !opt.isAction && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                        </div>
                    ))}
                    {options.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Нет данных</div>
                    )}
                </div>
            )}
        </div>
    );
};
