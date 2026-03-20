import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A time input that lets the user type digits directly (HH:MM).
 * Auto-inserts the colon after 2 digits. Max 4 digits (HHMM → HH:MM).
 */
export function TimeInput({ value, onChange, placeholder = '--:--', className, disabled }: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    
    if (raw.length === 0) {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Limit to 4 digits
    const digits = raw.slice(0, 4);
    
    let formatted: string;
    if (digits.length <= 2) {
      formatted = digits;
    } else {
      const hh = digits.slice(0, 2);
      const mm = digits.slice(2);
      formatted = `${hh}:${mm}`;
    }

    setDisplayValue(formatted);

    // Only emit valid HH:MM
    if (digits.length === 4) {
      const hours = parseInt(digits.slice(0, 2), 10);
      const minutes = parseInt(digits.slice(2), 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        onChange(formatted);
      }
    }
  };

  const handleBlur = () => {
    // On blur, try to normalize partial input
    const raw = displayValue.replace(/\D/g, '');
    if (raw.length === 0) {
      setDisplayValue('');
      onChange('');
      return;
    }
    if (raw.length <= 2) {
      const h = raw.padStart(2, '0');
      const hours = parseInt(h, 10);
      if (hours >= 0 && hours <= 23) {
        const formatted = `${h}:00`;
        setDisplayValue(formatted);
        onChange(formatted);
      } else {
        setDisplayValue(value || '');
      }
    } else if (raw.length === 3) {
      const h = raw.slice(0, 2);
      const m = raw.slice(2) + '0';
      const hours = parseInt(h, 10);
      const minutes = parseInt(m, 10);
      if (hours <= 23 && minutes <= 59) {
        const formatted = `${h}:${m}`;
        setDisplayValue(formatted);
        onChange(formatted);
      } else {
        setDisplayValue(value || '');
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={cn('w-[80px] text-center font-mono', className)}
      disabled={disabled}
      maxLength={5}
    />
  );
}
