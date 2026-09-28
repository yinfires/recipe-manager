import { useState } from 'react';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  className?: string;
  value?: string;
}

export function SearchInput({ placeholder, onSearch, className, value }: SearchInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const currentValue = value ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (value === undefined) setInternalValue(newValue);
    onSearch(newValue);
  };

  return (
    <input
      type="text"
      className={`search-input ${className || ''}`}
      placeholder={placeholder || '🔍 搜索...'}
      value={currentValue}
      onChange={handleChange}
    />
  );
}
