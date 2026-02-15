import { useState, useEffect } from "react"
import { inDarkMode, onDarkModeChange } from "../../utils/darkMode"

interface ImageProps {
  src: string
  darkSrc?: string
  alt: string
  width?: string | number
  height?: string | number
}

export default function Image(props: ImageProps) {
  const [isDark, setIsDark] = useState(inDarkMode())

  useEffect(() => {
    setIsDark(inDarkMode())
    return onDarkModeChange(setIsDark)
  }, [])

  const src = isDark && props.darkSrc ? props.darkSrc : props.src

  return (
    <div style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }}>
      <img
        src={src}
        alt={props.alt}
        width={props.width}
        height={props.height} />
    </div>
  )
}
