import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export default function Button({ label, onClick, variant = "primary" }: Readonly<ButtonProps>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        cursor: "pointer",
        borderRadius: "4px",
        border: "1px solid currentColor",
        background: variant === "primary" ? "var(--ink, #333)" : "transparent",
        color: variant === "primary" ? "var(--paper, #fff)" : "var(--ink, #333)",
      }}
    >
      {label}
    </button>
  );
}
