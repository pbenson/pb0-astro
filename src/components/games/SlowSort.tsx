import React, { useEffect, useRef, useState } from "react";
import { bgColor, strokeColor } from "../../utils/darkMode"
import Button from "../shared/Button"
import Input from "../shared/Input"
import { PlayingCard } from "../../utils/playingCard"

const cardWidth = 72,
  cardHeight = cardWidth / 0.72,
  elementSeparation = cardWidth + 8,
  framesPerMove = 30

class SortableElement {
  position: number
  boardP5: any
  board: Board
  label: number
  movingTo: number | undefined
  sentHome: boolean
  constructor(label: number, position: number, board: Board) {
    this.boardP5 = board.p5
    this.label = label
    this.position = position
    this.board = board
    this.sentHome = false
  }

  copy() {
    return new SortableElement(this.label, this.position, this.board)
  }

  startMoveTo(newPosition: number) {
    this.movingTo = newPosition
  }

  goHome() {
    this.movingTo = this.label
    this.sentHome = true
  }

  finishMove() {
    if (this.movingTo == null) return
    this.position = this.movingTo
    this.movingTo = undefined
    this.sentHome = false
  }

  xForPos(pos: number) {
    return pos * elementSeparation - 0.3 * elementSeparation
  }

  x() {
    const lastX = this.xForPos(this.position)
    if (this.movingTo == null) {
      return lastX
    }
    return (
      lastX +
      (this.xForPos(this.movingTo) - lastX) * (this.board.motionFrameCount / framesPerMove)
    )
  }

  y() {
    const baseLine = cardWidth * 2.5
    if (this.sentHome) {
      const fracComplete = this.board.motionFrameCount / framesPerMove
      const moveDelta = Math.abs(this.position - this.label)
      const powerToBoostHeight = 2
      const maxHeightMultipler = Math.pow(0.5, powerToBoostHeight)
      return (
        baseLine -
        (((maxHeightMultipler - Math.pow(Math.abs(fracComplete - 0.5), powerToBoostHeight)) *
          cardWidth) /
          maxHeightMultipler) *
        1.5
      )
    }
    return baseLine
  }

  containsMousePointer() {
    const p5 = this.boardP5
    const maxDisplacement = cardWidth / 2
    return (
      Math.abs(this.x() - p5.mouseX) < maxDisplacement &&
      Math.abs(this.y() - p5.mouseY) < maxDisplacement
    )
  }

  isHome() {
    return this.position == this.label
  }

  drawElement() {
    const selectedCardOrdinal = this.label
    const p5 = this.boardP5
    const card = new PlayingCard(p5, 'hearts', selectedCardOrdinal, true)
    p5.push()
    p5.textFont('Card Characters')
    card.draw(this.x(), this.y(), 75, true)
    p5.pop()
  }
}

class Board {
  p5: any
  elementInMotion: SortableElement | undefined
  elements: SortableElement[] = []
  motionFrameCount = 0
  initialPositions: SortableElement[] = []
  moveCount = 0

  constructor(p5: any, configuration: string) {
    this.p5 = p5
    this.applyConfiguration(configuration)
  }

  isValidConfiguration(configuration: string): boolean {
    if (configuration == null) {
      return false
    }
    const cardNumbers = configuration.trim().split(/\D+/).filter(Boolean)
    const sortedCards = [...cardNumbers]
    sortedCards.sort()
    for (let i = 0; i < sortedCards.length; ++i) {
      if (sortedCards[i] != (i + 1).toString()) {
        return false
      }
    }
    return true
  }

  applyConfiguration(configuration: string): boolean {
    if (!this.isValidConfiguration(configuration)) {
      return false
    }
    const cardNumbers = configuration.trim().split(/\D+/).filter(Boolean)
    this.elements = []
    for (let i = 0; i < cardNumbers.length; ++i) {
      this.elements.push(new SortableElement(parseInt(cardNumbers[i]), i + 1, this))
    }
    this.saveInitialPositions()
    this.moveCount = 0
    return true
  }

  numberOfCards() {
    return this.elements.length
  }

  drawBoard() {
    for (let i = 0; i < this.numberOfCards(); i++) {
      const element = this.elements[i]
      if (element != this.elementInMotion) element.drawElement()
    }
    if (this.elementInMotion) this.elementInMotion.drawElement()
    this.motionFrameCount++
    if (this.motionFrameCount >= framesPerMove) {
      this.elementInMotion = undefined
      this.motionFrameCount = 0
      for (let i = 0; i < this.numberOfCards(); i++) {
        this.elements[i].finishMove()
      }
    }

    this.p5.fill(strokeColor())
    const fontSize = 18
    this.p5.textSize(fontSize)
    const movesText = '' + this.moveCount + ' move' + (this.moveCount == 1 ? '' : 's')
    this.p5.text(movesText, fontSize, fontSize * 2)
  }

  handleCardClicked() {
    if (this.elementInMotion != null) {
      return
    }
    for (let i = 0; i < this.numberOfCards(); ++i) {
      const element = this.elements[i]
      if (element.containsMousePointer() && element.position != element.label) {
        this.elementInMotion = element
        element.goHome()
        this.motionFrameCount = 0
        break
      }
    }
    if (this.elementInMotion == null) return
    for (let i = 0; i < this.numberOfCards(); ++i) {
      const element = this.elements[i]
      if (element != this.elementInMotion) {
        if (this.elementInMotion.position > this.elementInMotion.label) {
          if (
            element.position >= this.elementInMotion.label &&
            element.position < this.elementInMotion.position
          )
            element.startMoveTo(element.position + 1)
        } else {
          if (
            element.position >= this.elementInMotion.position &&
            element.position <= this.elementInMotion.label
          )
            element.startMoveTo(element.position - 1)
        }
      }
    }
    ++this.moveCount
  }

  inMotion() {
    return this.elementInMotion != null
  }

  reset() {
    this.elements = [...this.initialPositions]
    this.saveInitialPositions()
    this.resetMoveCount()
  }

  resetMoveCount() {
    this.moveCount = 0
  }

  saveInitialPositions() {
    this.initialPositions = []
    for (let i = 0; i < this.numberOfCards(); ++i) {
      this.initialPositions.push(this.elements[i].copy())
    }
  }
}

interface SlowSortProps {
  numCards: number
  initialConfiguration: string
  showConfiguration: boolean
}

export default function SlowSort(props: SlowSortProps) {
  const [resetCounter, setResetCounter] = useState(0)
  const [cardOrdering, setCardOrdering] = useState(props.initialConfiguration)
  const { showConfiguration } = props
  const sketchRef = useRef(null);
  let oldResetCounter = 0
  let previousCardOrdering = ''

  useEffect(() => {
    let myp5: any = null;
    import('p5').then(p5 => {
      const s = (p5: any) => {
        let board = new Board(p5, cardOrdering)

        p5.setup = () => {
          const cnv = p5.createCanvas(680, 250)
          cnv.mouseReleased(() => board.handleCardClicked())
        }

        p5.draw = () => {
          p5.background(bgColor())
          if (resetCounter != oldResetCounter) {
            oldResetCounter = resetCounter
            board.reset()
          }
          if (cardOrdering != previousCardOrdering) {
            previousCardOrdering = cardOrdering
            if (board.applyConfiguration(cardOrdering)) {
              board.resetMoveCount()
            }
          }
          board.drawBoard()
        }
      }
      myp5 = new p5.default(s, sketchRef.current);
    });
    return () => {
      if (myp5) myp5.remove();
    };
  }, [resetCounter, cardOrdering]);

  return (
    <div>
      <div ref={sketchRef} />
      <br />
      {showConfiguration && cardOrdering != null &&
        <Input
          label="initial configuration"
          id="initial-configuration"
          value={cardOrdering}
          onChange={(e) => setCardOrdering(e.target.value)}
        />
      }
      <br />
      <div className="center">
        <Button
          label="Reset"
          onClick={() => setResetCounter(resetCounter + 1)}
          variant="primary"
        />
      </div>
    </div>
  )
}
