import { type ParsedMail } from "mailparser";

export type Nullable<T> = T | null | undefined;
export type DeepMutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends ReadonlyArray<infer U>
  ? DeepMutableArray<U>
  : T extends Array<infer U>
  ? DeepMutableArray<U>
  : T extends object
  ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
  : T;

export type DeepMutableArray<T> = Array<DeepMutable<T>>;

export type MutableParsedMail = DeepMutable<ParsedMail>;
