"use client";

import { useMemo } from "react";

/**
 * Reusable phone-number input with a country-code prefix selector.
 *
 * - Default country: Tunisia (+216).
 * - Strips non-digits from user input (works for keyboard, paste, autofill).
 * - The `value` it exposes to the parent is the FULL international number
 *   (e.g. "+21650000001"). The visible text field only contains the local
 *   digits — the country prefix is rendered as a select pill on the left.
 * - Flag image served from flagcdn.com so Windows browsers without an emoji
 *   flag font still see actual flags.
 */

interface Country {
  code: string; // ISO 3166-1 alpha-2, lowercase for flagcdn
  dial: string;
  label: string;
  localMax: number;
}

// Sorted: Tunisia first, then frequent neighbours, then rest A→Z (English label).
// `localMax` is a soft cap on local digit length — overshoot is uncommon and
// the server normalises anyway via formatPhone().
const COUNTRIES: Country[] = [
  { code: "tn", dial: "+216", label: "Tunisia", localMax: 8 },
  { code: "fr", dial: "+33", label: "France", localMax: 9 },
  { code: "dz", dial: "+213", label: "Algeria", localMax: 9 },
  { code: "ma", dial: "+212", label: "Morocco", localMax: 9 },
  { code: "ly", dial: "+218", label: "Libya", localMax: 9 },
  { code: "eg", dial: "+20", label: "Egypt", localMax: 10 },
  { code: "ae", dial: "+971", label: "United Arab Emirates", localMax: 9 },
  { code: "sa", dial: "+966", label: "Saudi Arabia", localMax: 9 },
  { code: "qa", dial: "+974", label: "Qatar", localMax: 8 },
  { code: "kw", dial: "+965", label: "Kuwait", localMax: 8 },
  { code: "bh", dial: "+973", label: "Bahrain", localMax: 8 },
  { code: "om", dial: "+968", label: "Oman", localMax: 8 },
  { code: "jo", dial: "+962", label: "Jordan", localMax: 9 },
  { code: "lb", dial: "+961", label: "Lebanon", localMax: 8 },
  { code: "sy", dial: "+963", label: "Syria", localMax: 9 },
  { code: "iq", dial: "+964", label: "Iraq", localMax: 10 },
  { code: "ye", dial: "+967", label: "Yemen", localMax: 9 },
  { code: "ps", dial: "+970", label: "Palestine", localMax: 9 },
  { code: "il", dial: "+972", label: "Israel", localMax: 9 },
  { code: "tr", dial: "+90", label: "Türkiye", localMax: 10 },
  { code: "ir", dial: "+98", label: "Iran", localMax: 10 },
  // Europe — most common in Maghreb diaspora
  { code: "de", dial: "+49", label: "Germany", localMax: 11 },
  { code: "it", dial: "+39", label: "Italy", localMax: 10 },
  { code: "es", dial: "+34", label: "Spain", localMax: 9 },
  { code: "pt", dial: "+351", label: "Portugal", localMax: 9 },
  { code: "be", dial: "+32", label: "Belgium", localMax: 9 },
  { code: "nl", dial: "+31", label: "Netherlands", localMax: 9 },
  { code: "ch", dial: "+41", label: "Switzerland", localMax: 9 },
  { code: "at", dial: "+43", label: "Austria", localMax: 10 },
  { code: "lu", dial: "+352", label: "Luxembourg", localMax: 9 },
  { code: "gb", dial: "+44", label: "United Kingdom", localMax: 10 },
  { code: "ie", dial: "+353", label: "Ireland", localMax: 9 },
  { code: "se", dial: "+46", label: "Sweden", localMax: 9 },
  { code: "no", dial: "+47", label: "Norway", localMax: 8 },
  { code: "dk", dial: "+45", label: "Denmark", localMax: 8 },
  { code: "fi", dial: "+358", label: "Finland", localMax: 10 },
  { code: "is", dial: "+354", label: "Iceland", localMax: 7 },
  { code: "pl", dial: "+48", label: "Poland", localMax: 9 },
  { code: "cz", dial: "+420", label: "Czechia", localMax: 9 },
  { code: "sk", dial: "+421", label: "Slovakia", localMax: 9 },
  { code: "hu", dial: "+36", label: "Hungary", localMax: 9 },
  { code: "ro", dial: "+40", label: "Romania", localMax: 9 },
  { code: "bg", dial: "+359", label: "Bulgaria", localMax: 9 },
  { code: "gr", dial: "+30", label: "Greece", localMax: 10 },
  { code: "rs", dial: "+381", label: "Serbia", localMax: 9 },
  { code: "hr", dial: "+385", label: "Croatia", localMax: 9 },
  { code: "ua", dial: "+380", label: "Ukraine", localMax: 9 },
  { code: "ru", dial: "+7", label: "Russia", localMax: 10 },
  // Americas
  { code: "us", dial: "+1", label: "United States", localMax: 10 },
  { code: "ca", dial: "+1", label: "Canada", localMax: 10 },
  { code: "mx", dial: "+52", label: "Mexico", localMax: 10 },
  { code: "br", dial: "+55", label: "Brazil", localMax: 11 },
  { code: "ar", dial: "+54", label: "Argentina", localMax: 10 },
  { code: "cl", dial: "+56", label: "Chile", localMax: 9 },
  { code: "co", dial: "+57", label: "Colombia", localMax: 10 },
  { code: "pe", dial: "+51", label: "Peru", localMax: 9 },
  { code: "ve", dial: "+58", label: "Venezuela", localMax: 10 },
  // Africa
  { code: "sn", dial: "+221", label: "Senegal", localMax: 9 },
  { code: "ml", dial: "+223", label: "Mali", localMax: 8 },
  { code: "ne", dial: "+227", label: "Niger", localMax: 8 },
  { code: "td", dial: "+235", label: "Chad", localMax: 8 },
  { code: "bf", dial: "+226", label: "Burkina Faso", localMax: 8 },
  { code: "ci", dial: "+225", label: "Côte d'Ivoire", localMax: 10 },
  { code: "gh", dial: "+233", label: "Ghana", localMax: 9 },
  { code: "ng", dial: "+234", label: "Nigeria", localMax: 10 },
  { code: "cm", dial: "+237", label: "Cameroon", localMax: 9 },
  { code: "ga", dial: "+241", label: "Gabon", localMax: 8 },
  { code: "cd", dial: "+243", label: "DR Congo", localMax: 9 },
  { code: "ke", dial: "+254", label: "Kenya", localMax: 9 },
  { code: "et", dial: "+251", label: "Ethiopia", localMax: 9 },
  { code: "tz", dial: "+255", label: "Tanzania", localMax: 9 },
  { code: "ug", dial: "+256", label: "Uganda", localMax: 9 },
  { code: "rw", dial: "+250", label: "Rwanda", localMax: 9 },
  { code: "za", dial: "+27", label: "South Africa", localMax: 9 },
  { code: "mr", dial: "+222", label: "Mauritania", localMax: 8 },
  // Asia / Pacific
  { code: "cn", dial: "+86", label: "China", localMax: 11 },
  { code: "jp", dial: "+81", label: "Japan", localMax: 10 },
  { code: "kr", dial: "+82", label: "South Korea", localMax: 10 },
  { code: "in", dial: "+91", label: "India", localMax: 10 },
  { code: "pk", dial: "+92", label: "Pakistan", localMax: 10 },
  { code: "bd", dial: "+880", label: "Bangladesh", localMax: 10 },
  { code: "id", dial: "+62", label: "Indonesia", localMax: 11 },
  { code: "th", dial: "+66", label: "Thailand", localMax: 9 },
  { code: "vn", dial: "+84", label: "Vietnam", localMax: 10 },
  { code: "ph", dial: "+63", label: "Philippines", localMax: 10 },
  { code: "my", dial: "+60", label: "Malaysia", localMax: 10 },
  { code: "sg", dial: "+65", label: "Singapore", localMax: 8 },
  { code: "au", dial: "+61", label: "Australia", localMax: 9 },
  { code: "nz", dial: "+64", label: "New Zealand", localMax: 9 },
];

function flagUrl(code: string) {
  return `https://flagcdn.com/w20/${code}.png`;
}

function flagUrl2x(code: string) {
  return `https://flagcdn.com/w40/${code}.png`;
}

function findCountryFromValue(v: string): Country {
  if (!v) return COUNTRIES[0];
  const cleaned = v.replace(/\s+/g, "");
  // Longest dial prefix first to disambiguate (+1, +12...)
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dial)) return c;
  }
  return COUNTRIES[0];
}

function localFromValue(v: string, country: Country) {
  if (!v) return "";
  const cleaned = v.replace(/\s+/g, "");
  if (cleaned.startsWith(country.dial)) {
    return cleaned.slice(country.dial.length).replace(/\D/g, "");
  }
  return cleaned.replace(/\D/g, "");
}

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  autoComplete?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "50 000 000",
  required,
  disabled,
  name,
  id,
  autoComplete = "tel",
  className = "",
}: PhoneInputProps) {
  const country = useMemo(() => findCountryFromValue(value), [value]);
  const localDigits = useMemo(() => localFromValue(value, country), [value, country]);

  function handleLocalChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, country.localMax);
    onChange(digits ? `${country.dial}${digits}` : "");
  }

  function handleCountryChange(nextCode: string) {
    const next = COUNTRIES.find((c) => c.code === nextCode) ?? COUNTRIES[0];
    const digits = localDigits.slice(0, next.localMax);
    onChange(digits ? `${next.dial}${digits}` : "");
  }

  return (
    <div
      className={`flex items-stretch w-full rounded-xl overflow-hidden border ${className}`}
      style={{ background: "#fff", borderColor: "var(--line-cool)" }}
    >
      <label
        className="relative flex items-center gap-2 pl-3 pr-2 cursor-pointer select-none"
        style={{
          background: "var(--surface-2)",
          borderRight: "1px solid var(--line-cool)",
        }}
        title={`${country.label} (${country.dial})`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flagUrl(country.code)}
          srcSet={`${flagUrl(country.code)} 1x, ${flagUrl2x(country.code)} 2x`}
          alt={country.label}
          width={20}
          height={15}
          style={{
            width: 20,
            height: 15,
            borderRadius: 2,
            objectFit: "cover",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
        <span className="text-[13px] font-bold" style={{ color: "var(--ink-900)" }}>
          {country.dial}
        </span>
        <span aria-hidden className="text-[10px]" style={{ color: "var(--ink-500)" }}>
          ▾
        </span>
        <select
          value={country.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          aria-label="Indicatif pays"
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} ({c.dial})
            </option>
          ))}
        </select>
      </label>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={localDigits}
        onChange={(e) => handleLocalChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!/\D/.test(text)) return;
          e.preventDefault();
          const digits = text.replace(/\D/g, "");
          handleLocalChange(localDigits + digits);
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={country.localMax}
        className="flex-1 min-w-0 px-3 py-2.5 text-[14px] font-semibold outline-none bg-transparent"
        style={{ color: "var(--ink-900)" }}
      />
    </div>
  );
}
