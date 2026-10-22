const palette = Object.entries({
  red: '#e6194b',
  orange: '#f58231',
  yellow: '#ffe119',
  lime: '#bfef45',
  green: '#3cb44b',
  teal: '#469990',
  cyan: '#42d4f4',
  blue: '#4363d8',
  purple: '#911eb4',
  magenta: '#f032e6',
  pink: '#fabed4',
  brown: '#9a6324',
})

function randomInt(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a
}

export function getColor() {
  const index = randomInt(0, palette.length - 1)
  const [entry] = palette.splice(index, 1)
  const [_, hex] = entry!
  const color = Bun.color(hex as Bun.ColorInput, 'ansi')

  return (text: string) => `${color}${text}\x1b[0m`
}
