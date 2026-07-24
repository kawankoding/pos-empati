import { useCallback, useEffect, useRef, useState } from "react";
import { formatNumber } from "@lib/currency";

type FieldCurrencyProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Pure helpers – no side effects                                    */
/* ------------------------------------------------------------------ */

/** "1.500.000" from a raw number */
function toDisplay(n: number): string {
  if (n <= 0) return "";
  return formatNumber(n);
}

/** Strip all non-digit characters → number */
function fromDisplay(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Given a formatted digit-string and a desired *digit* position,
 * return the character index that the cursor should land on.
 */
function cursorForDigit(formatted: string, targetDigit: number): number {
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      if (seen === targetDigit) return i;
      seen++;
    }
  }
  return formatted.length;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * A labelled Rupiah input that auto-formats as the user types.
 *
 * - Accepts a raw `number` via `value` and fires `onChange(number)`.
 * - Displays the value as "1.500.000" with a fixed "Rp" prefix badge.
 * - Preserves cursor position across reformats.
 */
export default function FieldCurrency({
  label,
  value,
  onChange,
  placeholder = "0",
  className = "",
}: FieldCurrencyProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(() => toDisplay(value));

  // Keeps track of the last value we *emitted* so we can tell
  // apart internal edits from external prop updates.
  const emittedRef = useRef(value);

  /* ---- sync when the parent pushes a new value ---- */
  useEffect(() => {
    if (value !== emittedRef.current) {
      emittedRef.current = value;
      setDisplay(toDisplay(value));
    }
  }, [value]);

  /* ---- handle user typing ---- */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const cursorPos = input.selectionStart ?? 0;

      // How many digit-characters were before the cursor?
      const before = input.value.slice(0, cursorPos);
      const digitIndex = (before.match(/\d/g) ?? []).length;

      // Parse → format → emit
      const raw = fromDisplay(input.value);
      const formatted = toDisplay(raw);

      setDisplay(formatted);
      emittedRef.current = raw;
      onChange(raw);

      // Restore cursor after React commits the new display text
      const nextPos = cursorForDigit(formatted, digitIndex);
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(nextPos, nextPos);
      });
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <label className="label-sm">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-500 select-none">
          Rp
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          className={`input-base pr-4 pl-14 ${className}`}
        />
      </div>
    </div>
  );
}
