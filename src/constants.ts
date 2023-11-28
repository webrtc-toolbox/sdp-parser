export const CR = "\u000D";
export const LF = "\u000A";
export const NUL = `\u0000`;
export const CRLF = `${CR}${LF}`;
export const SP = "\u0020";

export enum RECORD_TYPE {
  VERSION = "v",
  ORIGIN = "o",
  SESSION_NAME = "s",
  INFORMATION = "i",
  URI = "u",
  EMAIL = "e",
  PHONE = "p",
  CONNECTION = "c",
  BANDWIDTH = "b",
  TIME = "t",
  REPEAT = "r",
  ZONE_ADJUSTMENTS = "z",
  KEY = "k",
  ATTRIBUTE = "a",
  MEDIA = "m",
}
