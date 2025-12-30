
export function splitIntoChunks(text: string, chunkSize = 800, overlap = 120): string[] {
  const tokens = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += Math.max(1, chunkSize - overlap)) {
    chunks.push(tokens.slice(i, i + chunkSize).join(' '));
  }
  return chunks;
}
