/** Encode a canvas as PNG bytes (same quality as toDataURL('image/png'), without base64). */
export function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Failed to encode PNG'));
          return;
        }
        blob
          .arrayBuffer()
          .then(buffer => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      'image/png',
    );
  });
}

export function yieldToUi(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/** Run async work over items with a fixed concurrency limit. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
      await yieldToUi();
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
