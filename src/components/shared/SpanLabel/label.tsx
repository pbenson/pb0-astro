interface SpanLabelProps {
  label?: string | number;
}

export default function SpanLabel(props: SpanLabelProps) {
  return (
    <span>{props.label}</span>
  );
}