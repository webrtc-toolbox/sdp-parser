import { MediaAttributes, SessionAttributes } from "./attribute-types";
import { RECORD_TYPE } from "./constants";

/**
 * @public
 * */
export interface SessionDescription {
  version: string;
  origin: Origin;
  sessionName?: string;
  information?: string;
  uri?: string;
  emails: string[];
  phones: string[];
  connection?: Connection;
  bandwidths: Bandwidth[];
  timeFields: TimeField[];
  key?: Key;
  attributes: SessionAttributes;
  mediaDescriptions: MediaDescription[];
}

export interface Origin {
  username: string;
  sessId: string;
  sessVersion: string;
  nettype: string;
  addrtype: string;
  unicastAddress: string;
}

export interface Repeat {
  repeatInterval: string;
  typedTimes: string[];
}

export interface TimeField {
  time: { startTime: string; stopTime: string };
  repeats: Repeat[];
  zoneAdjustments?: { time: string; typedTime: string; back: boolean }[];
}

export interface Media {
  mediaType: string;
  port: string;
  protos: string[];
  fmts: string[];
}

export interface Connection {
  nettype: string;
  addrtype: string;
  address: string;
}

export interface Bandwidth {
  bwtype: string;
  bandwidth: string;
}

export type Key = "prompt" | "clear:" | "base64:" | "uri:";

export interface Attribute {
  ignored?: boolean;
  attField: string;
  attValue?: string;
  _cur: number;
  parsed?: any;
  line: number;
}

export interface MediaDescription {
  media: Media;
  information?: string;
  connections: Connection[];
  bandwidths: Bandwidth[];
  key?: Key;
  attributes: MediaAttributes;
}

/**
 * @public
 * */
export interface Record {
  type: RECORD_TYPE;
  value: string;
  cur: number;
  line: number;
  attribute?: Attribute;
  // parsed?: ParsedType<this['type']>;
  parsed?: any;
}

// type ParsedType<T> =
//   T extends RECORD_TYPE.MEDIA ? MediaDescription :
//   T extends RECORD_TYPE.EMAIL ? string :
//   T extends RECORD_TYPE.PHONE ? string :
//   T extends RECORD_TYPE.ATTRIBUTE ? Attribute :
//   never;

// interface ParsedType {
//   [RECORD_TYPE.MEDIA]: MediaDescription,
//   [RECORD_TYPE.BANDWIDTH]: string
// }
