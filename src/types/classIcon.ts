export type ClassKey =
  | "elf"
  | "royal"
  | "witch"
  | "dragon"
  | "nightmare"
  | "bishop"
  | "nemesis";

export type ClassIconSetting = {
  classKey: ClassKey;
  className: string;
  storagePath: string | null;
  publicUrl: string | null;
  updatedAt?: string;
};
