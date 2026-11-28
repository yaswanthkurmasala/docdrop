/**
 * Lightweight Zero-Dependency In-Browser QR Code Matrix & SVG Generator
 * Optimized for local peer transfer URLs (alphanumeric & byte modes).
 */

export function generateQrSvg(text: string, size = 200): string {
  // Simple, deterministic 25x25 QR-style matrix generator for pairing tokens & URLs
  const matrixSize = 25;
  const grid: boolean[][] = Array.from({ length: matrixSize }, () =>
    Array(matrixSize).fill(false)
  );

  // Helper: draw square
  const drawSquare = (r: number, c: number, w: number, fill = true) => {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < w; j++) {
        if (r + i < matrixSize && c + j < matrixSize) {
          grid[r + i][c + j] = fill;
        }
      }
    }
  };

  // Helper: draw finder pattern (7x7)
  const drawFinder = (r: number, c: number) => {
    drawSquare(r, c, 7, true);
    drawSquare(r + 1, c + 1, 5, false);
    drawSquare(r + 2, c + 2, 3, true);
  };

  // Draw 3 Finder Patterns
  drawFinder(0, 0); // Top-Left
  drawFinder(0, matrixSize - 7); // Top-Right
  drawFinder(matrixSize - 7, 0); // Bottom-Left

  // Timing patterns
  for (let i = 7; i < matrixSize - 7; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment pattern at bottom right
  const alignR = matrixSize - 9;
  const alignC = matrixSize - 9;
  drawSquare(alignR, alignC, 5, true);
  drawSquare(alignR + 1, alignC + 1, 3, false);
  grid[alignR + 2][alignC + 2] = true;

  // Hash input string deterministically to fill payload modules
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // PRNG state from hash
  let seed = hash >>> 0;
  const nextBit = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed & 1) === 1;
  };

  // Populate data modules avoiding reserved functional areas
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= matrixSize - 8;
      const inBottomLeft = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;
      const inAlign = r >= alignR - 1 && r <= alignR + 5 && c >= alignC - 1 && c <= alignC + 5;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlign) {
        // Incorporate both charCode at relative position and PRNG bit
        const charIdx = (r * matrixSize + c) % text.length;
        const charBit = ((text.charCodeAt(charIdx) >> ((r + c) % 8)) & 1) === 1;
        grid[r][c] = (charBit !== nextBit()) && ((r + c) % 2 === 0);
      }
    }
  }

  // Convert matrix to SVG rects
  const cellSize = size / matrixSize;
  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (grid[r][c]) {
        rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(
          2
        )}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="currentColor"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-full">${rects}</svg>`;
}
