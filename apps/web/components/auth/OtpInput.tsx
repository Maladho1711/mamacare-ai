'use client';

import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  /** Pré-remplir l'OTP (utile en mode test pour faciliter la validation) */
  initialValue?: string;
}

export default function OtpInput({ length = 6, onComplete, disabled = false, initialValue }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(() => {
    if (initialValue && initialValue.length === length) return initialValue.split('');
    return Array(length).fill('');
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-submit en mode test
  useEffect(() => {
    if (initialValue && initialValue.length === length && /^\d+$/.test(initialValue)) {
      onComplete(initialValue);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  }, [length]);

  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    const code = newValues.join('');
    if (code.length === length && newValues.every(v => v !== '')) {
      onComplete(code);
    }
  }, [values, length, focusInput, onComplete]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (values[index] === '' && index > 0) {
        focusInput(index - 1);
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
      } else {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
    }
  }, [values, focusInput]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);
    focusInput(Math.min(pasted.length, length - 1));

    if (pasted.length === length) {
      onComplete(pasted);
    }
  }, [values, length, focusInput, onComplete]);

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-colors
            focus:outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${value ? 'border-[#E91E8C] bg-pink-50' : 'border-gray-200 bg-white'}`}
          aria-label={`Chiffre ${index + 1}`}
        />
      ))}
    </div>
  );
}
