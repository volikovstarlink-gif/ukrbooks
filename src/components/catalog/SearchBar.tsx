'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Keep local state in sync when parent resets the value externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => onChange(localValue), 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  return (
    <div className="search-bar">
      <Search size={18} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
      <input
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder={placeholder}
      />
      {localValue && (
        <button
          onClick={() => { setLocalValue(''); onChange(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
