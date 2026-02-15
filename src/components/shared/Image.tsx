interface ImageProps {
  src: string
  darkSrc?: string
  alt: string
  width?: string | number
  height?: string | number
}

export default function Image(props: ImageProps) {
  const containerStyle = { display: 'block', marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }

  if (!props.darkSrc) {
    return (
      <div style={containerStyle}>
        <img
          src={props.src}
          alt={props.alt}
          width={props.width}
          height={props.height} />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        .dark-mode-img { display: none; }
        html.dark .dark-mode-img { display: inline; }
        html.dark .light-mode-img { display: none; }
      `}</style>
      <img
        className="light-mode-img"
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height} />
      <img
        className="dark-mode-img"
        src={props.darkSrc}
        alt={props.alt}
        width={props.width}
        height={props.height} />
    </div>
  )
}
