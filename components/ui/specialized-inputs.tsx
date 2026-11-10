'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { parseINR } from '@/lib/money';
import { formatPhoneE164 } from '@/lib/utils';

// ---------------- Money Input ----------------
export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: bigint;
  onChange?: (paise: bigint) => void;
  error?: string;
}

export function MoneyInput({
  value = 0n,
  onChange,
  className,
  error,
  disabled,
  ...props
}: MoneyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(() =>
    value ? (Number(value) / 100).toFixed(2) : ''
  );

  React.useEffect(() => {
    setDisplayValue(value ? (Number(value) / 100).toFixed(2) : '');
  }, [value]);

  const handleBlur = () => {
    try {
      if (!displayValue.trim()) {
        onChange?.(0n);
        return;
      }
      const paise = parseINR(displayValue);
      onChange?.(paise);
      setDisplayValue((Number(paise) / 100).toFixed(2));
    } catch {
      // Revert on invalid
      setDisplayValue(value ? (Number(value) / 100).toFixed(2) : '');
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-[var(--muted-foreground)] font-medium">₹</span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="0.00"
          className={cn(
            'flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-2 text-sm text-right tabular-nums ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

// ---------------- Percent Input (Basis Points) ----------------
export interface PercentInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number; // basis points (e.g. 1800 = 18%)
  onChange?: (bps: number) => void;
  error?: string;
}

export function PercentInput({
  value = 0,
  onChange,
  className,
  error,
  disabled,
  ...props
}: PercentInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(() =>
    value ? (value / 100).toFixed(2).replace(/\.00$/, '') : ''
  );

  React.useEffect(() => {
    setDisplayValue(value ? (value / 100).toFixed(2).replace(/\.00$/, '') : '');
  }, [value]);

  const handleBlur = () => {
    const num = parseFloat(displayValue);
    if (isNaN(num) || num < 0) {
      onChange?.(0);
      setDisplayValue('');
    } else {
      const bps = Math.round(num * 100);
      onChange?.(bps);
      setDisplayValue((bps / 100).toString());
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="0"
          className={cn(
            'flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 py-2 text-sm text-right tabular-nums ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
            className
          )}
          {...props}
        />
        <span className="absolute right-3 text-[var(--muted-foreground)] font-medium">%</span>
      </div>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

// ---------------- Phone Input (Indian Mobile E.164) ----------------
export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (phone: string) => void;
  error?: string;
}

export function PhoneInput({
  value = '',
  onChange,
  className,
  error,
  disabled,
  ...props
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(value);

  React.useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleBlur = () => {
    try {
      if (!displayValue.trim()) {
        onChange?.('');
        return;
      }
      const formatted = formatPhoneE164(displayValue);
      onChange?.(formatted);
      setDisplayValue(formatted);
    } catch {
      // Keep what user typed so error can show
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-[var(--muted-foreground)] text-xs font-semibold">
          🇮🇳 +91
        </span>
        <input
          type="tel"
          value={displayValue.replace(/^\+91/, '')}
          onChange={(e) => {
            const raw = e.target.value;
            setDisplayValue(raw);
            onChange?.(raw ? `+91${raw.replace(/\D/g, '')}` : '');
          }}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="98400 12345"
          className={cn(
            'flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-16 pr-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

// ---------------- Date Picker ----------------
export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string; // YYYY-MM-DD
  onChange?: (date: string) => void;
  error?: string;
}

export function DatePicker({
  value = '',
  onChange,
  className,
  error,
  disabled,
  ...props
}: DatePickerProps) {
  return (
    <div className="w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          'flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
