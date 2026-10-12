/**
 * Minimale Browser-Attrappe für Tests in Node: Canvas für die gemalten Texturen.
 * three.js lädt dabei nichts hoch – es geht nur um die Logik.
 */
const g = globalThis as unknown as Record<string, unknown>;
if (!g.document) {
  const canvas = () => ({
    width: 16, height: 16,
    getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => undefined,
      getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      drawImage: () => undefined
    })
  });
  g.document = { createElement: () => canvas() };
}
