export interface EmbeddingPort {
  embed(input: string, signal?: AbortSignal): Promise<number[]>;
  search(vector: number[], limit?: number): Promise<string[]>;
}
