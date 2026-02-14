export default class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(p5: any) {
    const d = 2;
    p5.fill(255, 0, 0);
    p5.ellipse(this.x, this.y, d, d);
  }
}
