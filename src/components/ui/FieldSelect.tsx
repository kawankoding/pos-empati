import {
  type ChangeEvent,
  type ReactNode,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Search } from "lucide-react";

type OptionItem = {
  value: string;
  label: string;
};

type FieldSelectProps = {
  label: string;
  value?: string | number | readonly string[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Enable search input inside the dropdown */
  searchable?: boolean;
  /** Placeholder shown in the search input */
  searchPlaceholder?: string;
  /** Placeholder shown when nothing is selected */
  placeholder?: string;
  /** Which direction the dropdown opens. Default: "bottom" */
  dropdownDirection?: "bottom" | "top";
};

/**
 * A labelled select dropdown that matches the POS design system.
 * Supports optional search filtering when `searchable` is set.
 */
export default function FieldSelect({
  label,
  value,
  onChange,
  children,
  disabled,
  className = "",
  searchable = false,
  searchPlaceholder = "Cari...",
  placeholder = "Pilih...",
  dropdownDirection = "bottom",
}: FieldSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hiddenSelectRef = useRef<HTMLSelectElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  // Extract options from the native DOM <select> — always accurate
  const extractOptions = (): OptionItem[] => {
    if (!hiddenSelectRef.current) return [];
    return Array.from(hiddenSelectRef.current.options).map((opt) => ({
      value: opt.value,
      label: opt.textContent ?? opt.value,
    }));
  };

  const [options, setOptions] = useState<OptionItem[]>([]);

  // Populate options after the hidden select has rendered its children
  useEffect(() => {
    setOptions(extractOptions());
  }, [children]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === String(value)),
    [options, value],
  );

  // Filtered options when searching
  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable && searchInputRef.current) {
      // Small delay so the DOM is ready
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open, searchable]);

  // Reset active index when filtered options change
  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredOptions]);

  const selectOption = (opt: OptionItem) => {
    if (onChange && hiddenSelectRef.current) {
      hiddenSelectRef.current.value = opt.value;
      const syntheticEvent = {
        target: hiddenSelectRef.current,
        currentTarget: hiddenSelectRef.current,
      } as ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          selectOption(filteredOptions[activeIndex]);
        }
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div className="space-y-2" ref={containerRef} onKeyDown={handleKeyDown}>
      <label className="label-sm">{label}</label>

      {/* Native select — renders children into DOM so we can read options */}
      <select
        ref={hiddenSelectRef}
        value={value}
        onChange={() => {}}
        className="sr-only"
        aria-hidden
      >
        {children}
      </select>

      {/* Trigger + dropdown wrapper */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen((prev) => {
                if (!prev) {
                  setSearch("");
                }
                return !prev;
              });
            }
          }}
          className={`input-base relative flex items-center pr-10! text-left ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${className}`}
        >
          <span className={selectedOption ? "text-slate-800" : "text-slate-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && !disabled && (
          <ul
            ref={listRef}
            role="listbox"
            className={`absolute right-0 left-0 z-50 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg ${
              dropdownDirection === "top" ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {/* Search input */}
            {searchable && (
              <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-slate-200 py-1.5 pr-3 pl-8 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === String(value);
                const isActive = idx === activeIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                      isActive || isSelected
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
