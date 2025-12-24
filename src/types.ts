export type EntryMeta = {
  output: string;
  deps: Set<string>;
  hash: string;
  virtualId: string;
  styleId: string;
};
// Adjusting type for serialization (Set -> Array)
export type EntryMetaSerialized = Omit<EntryMeta, 'deps'> & { deps: string[] };

