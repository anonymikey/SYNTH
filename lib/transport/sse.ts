export async function* readSseEvents<T>(response: Response): AsyncIterable<T> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        yield JSON.parse(dataLine.slice(5).trim()) as T;
      }

      if (done) break;
    }

    const finalDataLine = buffer.split("\n").find((line) => line.startsWith("data:"));
    if (finalDataLine) yield JSON.parse(finalDataLine.slice(5).trim()) as T;
  } finally {
    reader.releaseLock();
  }
}
