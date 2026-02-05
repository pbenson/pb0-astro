class Location {
  x: number
  y: number
  faceUp: boolean

  constructor(x: number, y: number, faceUp: boolean) {
    this.x = x
    this.y = y
    this.faceUp = faceUp
  }
}

class CardOrdinal {
  num: number
  constructor(num: number) {
    this.num = num
  }

  number(): number {
    return this.num
  }

  cardName(): string | number {
    return "subclass this"
  }

  drawOrdinal(p5: any, suit: Suit, cardWidth: number, cardHeight: number) {
    // draw numbers in upper left and lower right, with a smaller symbol
    const drawNumber = (p5, cardWidth, cardHeight) => {
      const textX = -cardWidth * 0.44
      const textY = -cardHeight * 0.34

      const txtSize = cardHeight * 0.12
      p5.push()
      p5.fill(255, 0, 0)
      p5.textSize(txtSize)
      p5.push()
      p5.translate(textX, textY)
      let txtWidth = p5.textWidth(String(this.cardName()))
      if (this.cardName() == '10') {
        p5.scale(0.5, 1)
        txtWidth *= 0.5
      }
      p5.text(this.cardName(), 0, 0)
      p5.pop()
      p5.translate(textX + txtWidth / 2, textY + txtSize * 0.5)
      p5.scale(0.5, 0.5)
      suit.drawSymbol(p5, 0, 0, cardWidth, cardHeight, true)
      p5.pop()
    }
    p5.push()
    p5.translate(cardWidth / 2, cardHeight / 2)
    drawNumber(p5, cardWidth, cardHeight)
    p5.rotate(Math.PI)
    drawNumber(p5, cardWidth, cardHeight)
    p5.pop()
  }
}

class CardNumber extends CardOrdinal {
  name: string | number
  locations: Location[]
  constructor(num: string | number, locations: Location[]) {
    super(num == 'A' ? 1 : Number(num))
    this.name = num
    this.locations = locations
  }

  cardName(): string | number {
    return this.name
  }

  drawOrdinal(p5:any, suit: Suit, cardWidth: number, cardHeight: number) {
    // draw the symbols for the count
    for (let location of this.locations) {
      suit.drawSymbol(p5, location.x * cardWidth, location.y * cardHeight, cardWidth, cardHeight, location.faceUp)
    }

    super.drawOrdinal(p5, suit, cardWidth, cardHeight)
  }
}

class CardFace extends CardOrdinal {
  letter: string
  constructor(num: number, letter: string) {
    super(num)
    this.letter = letter
  }

  cardName() {
    return this.letter
  }

  drawOrdinal(p5: any, suit: Suit, cardWidth: number, cardHeight: number) {
    // draw big letter in middle of card
    suit.setColor(p5)
    const txtSize = cardHeight * 0.5
    p5.textSize(txtSize)
    const txtWidth = p5.textWidth(this.letter)
    p5.text(this.letter, (cardWidth - txtWidth) * 0.5, (cardHeight + txtSize * 0.83) * 0.5)

    super.drawOrdinal(p5, suit, cardWidth, cardHeight)
  }
}

const cardOrdinals = [new CardNumber('A', [new Location(0.5, 0.5, false)]),
new CardNumber(2, [new Location(0.5, 0.184, false), new Location(0.5, 1 - 0.184, true)]),
new CardNumber(3, [
  new Location(0.5, 0.184, false),
  new Location(0.5, 0.5, false),
  new Location(0.5, 1 - 0.184, true)]),
new CardNumber(4, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.3, 0.816, true),
  new Location(0.7, 0.816, true)]),
new CardNumber(5, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.5, 0.5, false),
  new Location(0.3, 0.816, true),
  new Location(0.7, 0.816, true)
]),
new CardNumber(6, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.3, 0.5, false),
  new Location(0.7, 0.5, false),
  new Location(0.3, 1 - 0.184, true),
  new Location(0.7, 1 - 0.184, true)
]),
new CardNumber(7, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.5, 0.341, false),
  new Location(0.3, 0.5, false),
  new Location(0.7, 0.5, false),
  new Location(0.3, 1 - 0.184, true),
  new Location(0.7, 1 - 0.184, true)
]),
new CardNumber(8, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.5, 0.341, false),
  new Location(0.3, 0.5, false),
  new Location(0.7, 0.5, false),
  new Location(0.5, 0.659, true),
  new Location(0.3, 1 - 0.184, true),
  new Location(0.7, 1 - 0.184, true)
]),
new CardNumber(9, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.3, 0.395, false),
  new Location(0.7, 0.395, false),
  new Location(0.5, 0.5, false),
  new Location(0.3, 1 - 0.395, true),
  new Location(0.7, 1 - 0.395, true),
  new Location(0.3, 1 - 0.184, true),
  new Location(0.7, 1 - 0.184, true)
]),
new CardNumber(10, [
  new Location(0.3, 0.184, false),
  new Location(0.7, 0.184, false),
  new Location(0.5, 0.29, false),
  new Location(0.3, 0.395, false),
  new Location(0.7, 0.395, false),
  new Location(0.3, 1 - 0.395, true),
  new Location(0.7, 1 - 0.395, true),
  new Location(0.5, 1 - 0.29, true),
  new Location(0.3, 1 - 0.184, true),
  new Location(0.7, 1 - 0.184, true)
]),
new CardFace(11, 'J'),
new CardFace(12, 'Q'),
new CardFace(13, 'K')
]

class Suit {
  symbolRenderer: any
  r: number
  g: number
  b: number
  constructor(symbolRenderer: any,
    r: number,
    g: number,
    b: number) {
    this.symbolRenderer = symbolRenderer
    this.r = r
    this.g = g
    this.b = b
  }

  drawSymbol(p5: any, x: number, y: number, cardWidth: number, cardHeight: number, faceUp: boolean) {
    p5.push()
    p5.noStroke()
    this.setColor(p5)
    // p5.translate(x, y)
    if (faceUp) {
      p5.translate(x, y)
      p5.rotate(Math.PI)
      p5.translate(-x, -y)
    }
    this.symbolRenderer(p5, x, y, cardWidth, cardHeight)
    p5.pop()
  }

  setColor(p5) {
    p5.fill(this.r, this.g, this.b)
  }
}

export const suits = {
  "hearts": new Suit(
    (p5, x, y, cardWidth, cardHeight) => {
      p5.fill(255, 0, 0)
      p5.push()
      p5.translate(x, y)
      p5.scale(0.7, 1)
      cardHeight
      const r = cardWidth * 0.075,
        s = r * 2,
        dx = Math.sqrt(2) * r,
        c = dx / 2
      p5.ellipse(c, -c, s, s)
      p5.ellipse(-c, -c, s, s)
      p5.beginShape()
      p5.vertex(0, dx)
      p5.vertex(dx, 0)
      p5.vertex(0, -dx)
      p5.vertex(-dx, 0)
      p5.endShape()
      p5.pop()
    },
    255,
    0,
    0
  ), "diamonds": new Suit(
    (p5, x, y, cardWidth, cardHeight) => {
      p5.push()
      p5.translate(x, y)
      const dx = cardWidth * 0.075,
        dy = cardHeight * 0.075
      p5.beginShape()
      p5.vertex(0, dy)
      p5.vertex(dx, 0)
      p5.vertex(0, -dy)
      p5.vertex(-dx, 0)
      p5.endShape()
      p5.pop()
    },
    255,
    0,
    0
  )
}

export class PlayingCard {
  p5: any
  suit: Suit
  cardOrdinal: CardNumber | CardFace
  faceUp: boolean
  flipFramesLeft: number
  constructor(p5: any, suitName: string, num: number, isFaceUp: boolean) {
    this.p5 = p5
    this.suit = suits[suitName]
    this.cardOrdinal = cardOrdinals[num - 1]
    // this.cardOrdinal = cardOrdinals[6]
    this.faceUp = isFaceUp === undefined ? true : isFaceUp
    this.flipFramesLeft = 0
  }

  number(): number {
    return this.cardOrdinal.number()
  }

  numberFlipFrames() {
    return 16
  }

  showFaceUp(isFaceUp: boolean) {
    this.faceUp = isFaceUp
    this.flipFramesLeft = this.numberFlipFrames()
  }

  flip() {
    this.showFaceUp(!this.faceUp)
  }

  isFaceUp() {
    return this.faceUp
  }

  isFlipping() {
    return this.flipFramesLeft >= 0
  }

  cardHeight(cardWidth: number) {
    return (cardWidth * 3.5) / 2.25
  }

  drawFlipAnimation(x: number, y: number, cardWidth: number) {
    if (!this.isFlipping()) return
    const elapsedFrames = this.numberFlipFrames() - this.flipFramesLeft
    const halfOfFrames = this.numberFlipFrames() / 2
    const stillShowingUnflippedSide = elapsedFrames < halfOfFrames
    const xScalar = Math.abs(2 * (this.flipFramesLeft - halfOfFrames) / this.numberFlipFrames())
    const p5 = this.p5

    p5.push()
    p5.scale(xScalar, 1)
    // faceUp indicates the side we are flipping to...and for the first
    // have of flip, we have the opposite sid
    const showFront = (stillShowingUnflippedSide && !this.faceUp)
      || (!stillShowingUnflippedSide && this.faceUp)

    showFront ? this.drawFaceUp(x, y, cardWidth, false)
      : this.drawFaceDown(x, y, cardWidth, false)
    p5.pop()
    this.flipFramesLeft--
  }

  draw(x: number, y: number, cardWidth: number, highlight: boolean) {
    this.p5.push()
    if (this.isFlipping()) this.drawFlipAnimation(x, y, cardWidth)
    else this.faceUp ? this.drawFaceUp(x, y, cardWidth, highlight)
      : this.drawFaceDown(x, y, cardWidth, highlight)
    this.p5.pop()
  }

  cornerRadius(cardWidth: number) {
    return cardWidth * 0.05;
  }

  drawFaceUp(x: number, y: number, cardWidth: number, highlight: boolean) {
    this.p5.fill(255)
    const cardHeight = this.cardHeight(cardWidth)
    this.p5.translate(x - cardWidth * 0.5, y - cardHeight * 0.5)
    // draw outline
    this.p5.stroke(127)
    this.p5.strokeWeight(1)
    this.drawFrame(cardWidth, highlight)
    this.p5.noStroke()
    // draw symbols

    this.cardOrdinal.drawOrdinal(this.p5, this.suit, cardWidth, cardHeight)
  }

  drawFaceDown(x: number, y: number, cardWidth: number, highlight: boolean) {
    const cardHeight = this.cardHeight(cardWidth)
    this.p5.translate(x - cardWidth * 0.5, y - cardHeight * 0.5)
    // this.p5.fill(0)
    // draw design
    this.p5.stroke(0, 0, 127)
    const numRows = 18
    const numColumns = 12
    const xDiameter = cardWidth / numColumns
    const yDiameter = cardHeight / numRows
    for (let row = 1; row < numRows; ++row) {
      const y = (cardHeight - yDiameter * numRows) * 0.5 + yDiameter * row
      for (let col = 1; col < numColumns; ++col) {
        const x = (cardWidth - xDiameter * numColumns) * 0.5 + xDiameter * col
        this.p5.ellipse(x, y, xDiameter, yDiameter)
      }
    }
    this.p5.noFill()
    this.drawFrame(cardWidth, highlight)
  }

  drawFrame(cardWidth: number, highlight: boolean) {
    const p5 = this.p5
    highlight = highlight || false
    if (highlight) {
      p5.push()
      p5.strokeWeight(cardWidth * 0.1);
    }
    p5.rect(0, 0, cardWidth, this.cardHeight(cardWidth), this.cornerRadius(cardWidth))
    if (highlight) {
      p5.pop();
    }
  }
}
