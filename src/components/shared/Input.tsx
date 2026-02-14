import React from "react";

interface InputProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}

export default function Input({
  label,
  id,
  value,
  onChange,
  style = { width: "200px", marginLeft: "10px" },
}: Readonly<InputProps>) {
  return (
    <label>
      <strong>{label}</strong>
      <input id={id} style={style} value={value} onChange={onChange} />
    </label>
  );
}
