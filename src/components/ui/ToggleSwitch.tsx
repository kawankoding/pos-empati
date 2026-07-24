type ToggleSwitchProps = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * A toggle switch that matches the POS design system.
 */
export default function ToggleSwitch({
  id,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex h-6 w-12 cursor-pointer items-center rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      } ${checked ? "bg-emerald-600" : "bg-slate-300"}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </label>
  );
}
