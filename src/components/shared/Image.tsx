import { inDarkMode, setColorModeFromReact } from "../ts/darkMode"

interface ImageProps {
  src: string
  darkSrc?: string
  alt: string
  width: string | number
}

export default function Image(props: ImageProps) {
  let { src, width } = props
  setColorModeFromReact()
  if (inDarkMode() && props.darkSrc) {
    src = props.darkSrc
  }
  // see https://stackoverflow.com/questions/4476526/do-i-use-img-object-or-embed-for-svg-files
  return (
    <div style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }}>
      <img
        src={src}
        alt={props.alt}
        width={width} />
    </div>
  )
}