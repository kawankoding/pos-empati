import type { InputHTMLAttributes } from "react";

type FieldInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

/**
 * A labelled text/number input that matches the POS design system.
 * Uses `.input-base` for consistent sizing and focus ring behaviour.
 */
export default function FieldInput({ label, className = "", ...inputProps }: FieldInputProps) {
  return (
    <div className="space-y-2">
      <label className="label-sm">{label}</label>
      <input className={`input-base ${className}`} {...inputProps} />
    </div>
  );
}
