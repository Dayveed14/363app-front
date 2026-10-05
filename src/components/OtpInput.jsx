import { useRef } from "react";

export default function OtpInput({ length = 6, value, onChange }) {
  const inputsRef = useRef([]);

  function handleChange(i, raw) {
    if (!/^\d?$/.test(raw)) return;
    const next = [...value];
    next[i] = raw;
    onChange(next);
    if (raw && i < length - 1) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  return (
    <div className="otp-inputs">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
