export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 80
export const GRID_MARGIN = 12

export function getColWidth(containerWidth) {
  return (containerWidth - GRID_MARGIN * (GRID_COLS + 1)) / GRID_COLS
}

export function isCellOccupied(col, row, layout) {
  return layout.some(w =>
    col >= w.x && col < w.x + w.w &&
    row >= w.y && row < w.y + w.h
  )
}
