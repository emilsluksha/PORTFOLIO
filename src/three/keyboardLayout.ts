export interface KeyCapDef {
  /** Center X in keyboard-local coordinates (centered at 0) */
  x: number
  /** Center Z in keyboard-local coordinates (negative = top row, positive = bottom row) */
  z: number
  /** Key width */
  w: number
  /** Key depth */
  d: number
  /** Primary legend */
  label: string
  /** Optional secondary shift legend */
  sub?: string
  /** Text alignment hint */
  align?: 'center' | 'left' | 'right'
  /** Circular Touch ID / Power sensor key */
  isPower?: boolean
  /** Half-height key (function row or arrows) */
  isHalf?: boolean
}

export interface KeyboardGeometryData {
  keys: KeyCapDef[]
  totalWidth: number
  totalDepth: number
}

const KEY_UNIT = 0.158
const KEY_GAP = 0.017

interface RowSpec {
  label: string
  sub?: string
  u: number
  align?: 'center' | 'left' | 'right'
  isPower?: boolean
  arrowSplit?: { top: string; bottom: string }
}

const KEY_ROWS: { heightU: number; items: RowSpec[] }[] = [
  // Function row (14.5 units wide)
  {
    heightU: 0.62,
    items: [
      { label: 'esc', u: 1.48, align: 'left' },
      { label: 'F1', u: 0.99 },
      { label: 'F2', u: 0.99 },
      { label: 'F3', u: 0.99 },
      { label: 'F4', u: 0.99 },
      { label: 'F5', u: 0.99 },
      { label: 'F6', u: 0.99 },
      { label: 'F7', u: 0.99 },
      { label: 'F8', u: 0.99 },
      { label: 'F9', u: 0.99 },
      { label: 'F10', u: 0.99 },
      { label: 'F11', u: 0.99 },
      { label: 'F12', u: 0.99 },
      { label: '', u: 1.14, isPower: true },
    ],
  },
  // Number row
  {
    heightU: 0.96,
    items: [
      { label: '`', sub: '~', u: 1 },
      { label: '1', sub: '!', u: 1 },
      { label: '2', sub: '@', u: 1 },
      { label: '3', sub: '#', u: 1 },
      { label: '4', sub: '$', u: 1 },
      { label: '5', sub: '%', u: 1 },
      { label: '6', sub: '^', u: 1 },
      { label: '7', sub: '&', u: 1 },
      { label: '8', sub: '*', u: 1 },
      { label: '9', sub: '(', u: 1 },
      { label: '0', sub: ')', u: 1 },
      { label: '-', sub: '_', u: 1 },
      { label: '=', sub: '+', u: 1 },
      { label: 'delete', u: 1.5, align: 'right' },
    ],
  },
  // QWERTY row
  {
    heightU: 0.96,
    items: [
      { label: 'tab', u: 1.5, align: 'left' },
      { label: 'Q', u: 1 },
      { label: 'W', u: 1 },
      { label: 'E', u: 1 },
      { label: 'R', u: 1 },
      { label: 'T', u: 1 },
      { label: 'Y', u: 1 },
      { label: 'U', u: 1 },
      { label: 'I', u: 1 },
      { label: 'O', u: 1 },
      { label: 'P', u: 1 },
      { label: '[', sub: '{', u: 1 },
      { label: ']', sub: '}', u: 1 },
      { label: '\\', sub: '|', u: 1 },
    ],
  },
  // ASDF row
  {
    heightU: 0.96,
    items: [
      { label: 'caps', u: 1.76, align: 'left' },
      { label: 'A', u: 1 },
      { label: 'S', u: 1 },
      { label: 'D', u: 1 },
      { label: 'F', u: 1 },
      { label: 'G', u: 1 },
      { label: 'H', u: 1 },
      { label: 'J', u: 1 },
      { label: 'K', u: 1 },
      { label: 'L', u: 1 },
      { label: ';', sub: ':', u: 1 },
      { label: "'", sub: '"', u: 1 },
      { label: 'return', u: 1.74, align: 'right' },
    ],
  },
  // ZXCV row
  {
    heightU: 0.96,
    items: [
      { label: 'shift', u: 2.25, align: 'left' },
      { label: 'Z', u: 1 },
      { label: 'X', u: 1 },
      { label: 'C', u: 1 },
      { label: 'V', u: 1 },
      { label: 'B', u: 1 },
      { label: 'N', u: 1 },
      { label: 'M', u: 1 },
      { label: ',', sub: '<', u: 1 },
      { label: '.', sub: '>', u: 1 },
      { label: '/', sub: '?', u: 1 },
      { label: 'shift', u: 2.25, align: 'right' },
    ],
  },
  // Bottom modifier + spacebar + inverted-T arrow cluster
  {
    heightU: 1.0,
    items: [
      { label: 'fn', u: 1.0, align: 'left' },
      { label: 'ctrl', u: 1.0 },
      { label: 'opt', u: 1.0 },
      { label: 'cmd', u: 1.25 },
      { label: '', u: 5.0 },
      { label: 'cmd', u: 1.25 },
      { label: 'opt', u: 1.0 },
      { label: '◄', u: 1.0 },
      { label: '', u: 1.0, arrowSplit: { top: '▲', bottom: '▼' } },
      { label: '►', u: 1.0 },
    ],
  },
]

let cachedKeyboard: KeyboardGeometryData | null = null

export function getKeyboardLayout(): KeyboardGeometryData {
  if (cachedKeyboard) return cachedKeyboard

  const rowUnits = 14.5
  const totalWidth = rowUnits * KEY_UNIT
  const rowHeights = KEY_ROWS.map((r) => r.heightU * KEY_UNIT)
  const totalDepth =
    rowHeights.reduce((acc, h) => acc + h, 0) + (KEY_ROWS.length - 1) * (KEY_GAP * 0.65)

  const keys: KeyCapDef[] = []
  let cursorZ = -totalDepth / 2

  for (let rIdx = 0; rIdx < KEY_ROWS.length; rIdx++) {
    const row = KEY_ROWS[rIdx]
    const rowH = rowHeights[rIdx]
    const rowSumU = row.items.reduce((acc, item) => acc + item.u, 0)
    const scaleX = totalWidth / (rowSumU * KEY_UNIT)

    let cursorX = -totalWidth / 2
    const zCenter = cursorZ + rowH / 2

    for (const item of row.items) {
      const slotW = item.u * KEY_UNIT * scaleX
      const keyW = slotW - KEY_GAP
      const keyD = rowH - KEY_GAP * 0.88
      const xCenter = cursorX + slotW / 2

      if (item.arrowSplit) {
        const halfD = (keyD - KEY_GAP * 0.55) / 2
        keys.push({
          x: xCenter,
          z: zCenter - halfD / 2 - KEY_GAP * 0.275,
          w: keyW,
          d: halfD,
          label: item.arrowSplit.top,
          isHalf: true,
        })
        keys.push({
          x: xCenter,
          z: zCenter + halfD / 2 + KEY_GAP * 0.275,
          w: keyW,
          d: halfD,
          label: item.arrowSplit.bottom,
          isHalf: true,
        })
      } else if (item.label === '◄' || item.label === '►') {
        // Inverted-T lower-half left/right arrows
        const halfD = (keyD - KEY_GAP * 0.55) / 2
        keys.push({
          x: xCenter,
          z: zCenter + halfD / 2 + KEY_GAP * 0.275,
          w: keyW,
          d: halfD,
          label: item.label,
          isHalf: true,
        })
      } else {
        keys.push({
          x: xCenter,
          z: zCenter,
          w: keyW,
          d: keyD,
          label: item.label,
          sub: item.sub,
          align: item.align,
          isPower: item.isPower,
          isHalf: row.heightU < 0.8,
        })
      }

      cursorX += slotW
    }

    cursorZ += rowH + KEY_GAP * 0.65
  }

  cachedKeyboard = { keys, totalWidth, totalDepth }
  return cachedKeyboard
}
