import { useState } from 'react';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  className?: string;
}

export function SearchInput({ placeholder, onSearch, className }: SearchInputProps) {
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onSearch(newValue);
  };

  return (
    <input
      type="text"
      className={`search-input ${className || ''}`}
      placeholder={placeholder || '🔍 搜索...'}
      value={value}
      onChange={handleChange}
    />
  );
}
