export function isHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

export function isDataUrl(src: string): boolean {
  return src.startsWith('data:');
}

export async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Ensures image src is safe for canvas export (data URL when possible). */
export async function ensureDataUrl(src: string): Promise<string> {
  if (!src || isDataUrl(src) || src.startsWith('blob:')) {
    return src;
  }
  if (isHttpUrl(src)) {
    const dataUrl = await fetchAsDataUrl(src);
    if (dataUrl) return dataUrl;
  }
  return src;
}
