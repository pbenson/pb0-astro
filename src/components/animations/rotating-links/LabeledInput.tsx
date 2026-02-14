import React from "react";

interface LabeledInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}

export default function LabeledInput({
  label,
  id,
  value,
  onChange,
  style = { width: "100px", marginLeft: "10px", marginRight: "10px" },
}: Readonly<LabeledInputProps>) {
  return (
    <label>
      {label}
      <input id={id} style={style} value={value} onChange={onChange} />
    </label>
  );
}
