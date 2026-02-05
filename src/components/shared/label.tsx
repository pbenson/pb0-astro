interface LabelProps {
  readonly label?: string | number;
}

export default function Label(props: LabelProps) {
  return (
    <span className="text--semibold">{props.label}&nbsp;</span>
  );
}