import { Attribute } from "./session-types";

export interface Group {
  semantic: string;
  identificationTag: string[];
}

export interface FingerPrint {
  hashFunction: string;
  fingerprint: string;
}

export type Setup = "active" | "passive" | "actpass" | "holdconn";

export interface Identity {
  assertionValue: string;
  extensions: { name: string; value?: string }[];
}

export interface Extmap {
  entry: number;
  extensionName: string;
  direction?: string;
  extensionAttributes?: string;
}

export interface Candidate {
  foundation: string;
  componentId: string;
  transport: string;
  priority: string;
  connectionAddress: string;
  port: string;
  type: string;
  relAddr?: string;
  relPort?: string;
  extension: { [key: string]: string };
}

interface RemoteCandidate {
  componentId: string;
  connectionAddress: string;
  port: string;
}

export type RemoteCandidates = RemoteCandidate[];

export interface RTPMap {
  // payloadType: string;
  encodingName: string;
  clockRate: string;
  encodingParameters?: number;
}

export interface Fmtp {
  // format: string;
  parameters: Record<string, string | null>;
}

export type Direction = "sendrecv" | "sendonly" | "recvonly" | "inactive";

export interface SSRC {
  ssrcId: number;
  attributes: Record<string, string | undefined>;
}

export interface SSRCGroup {
  semantic: string;
  ssrcIds: number[];
}

// export interface RTCPFeedback {
//   // payloadType: string;
//   feedback: FeedBack;
// }

export type RTCPFeedback =
  | ACKFeedback
  | NACKFeedback
  | TRRINTFeedback
  | OtherFeedback;

export interface ACKFeedback {
  type: "ack";
  parameter?: "rpsi" | "app" | string;
  additional?: string;
}

export interface NACKFeedback {
  type: "nack";
  parameter?: "pli" | "sli" | "rpsi" | "app" | string;
  additional?: string;
}

export interface TRRINTFeedback {
  type: "trr-int";
  interval: string;
}

export interface OtherFeedback {
  type: string;
  parameter?: "app" | string;
  additional?: string;
}

export interface RTCP {
  port: string;
  netType?: string;
  addressType?: string;
  address?: string;
}

export interface MSID {
  id: string;
  appdata?: string;
}

export type RIDParam =
  | RIDWidthParam
  | RIDHeightParam
  | RIDFpsParam
  | RIDFsParam
  | RIDBrParam
  | RIDPpsParam
  | RIDBppParam
  | RIDDependParam
  | RIDOtherParam;

export interface RIDWidthParam {
  type: "max-width";
  val?: string;
}

export interface RIDHeightParam {
  type: "height-width";
  val?: string;
}

export interface RIDFpsParam {
  type: "max-fps";
  val?: string;
}

export interface RIDFsParam {
  type: "max-fs";
  val?: string;
}

export interface RIDBrParam {
  type: "max-br";
  val?: string;
}

export interface RIDPpsParam {
  type: "max-pps";
  val?: string;
}

export interface RIDBppParam {
  type: "max-bpp";
  val?: string;
}

export interface RIDDependParam {
  type: "depend";
  rids: string[];
}

export interface RIDOtherParam {
  type: string;
  val?: string;
}

export interface RID {
  id: string;
  direction: "send" | "recv";
  payloads?: string[];
  params: RIDParam[];
}

export interface MsidSemantic {
  semantic: string;
  applyForAll?: boolean;
  identifierList: string[];
}

export type ExtmapEntry = Record<string, Extmap>;

export interface PayloadAttribute {
  rtpMap?: RTPMap;
  fmtp?: Fmtp;
  rtcpFeedbacks: RTCPFeedback[];
  payloadType: number;
}

export type PayloadMap = Record<string, PayloadAttribute>;

export interface SessionAttributes {
  groups: Group[];
  iceLite?: boolean;
  iceUfrag?: string;
  icePwd?: string;
  iceOptions?: string[];
  fingerprints: FingerPrint[];
  setup?: Setup;
  tlsId?: string;
  identities: Identity[];
  extmaps: Extmap[];
  unrecognized: Attribute[];
  msidSemantic?: MsidSemantic;
}

export interface MediaAttributes {
  mid?: string;
  iceUfrag?: string;
  icePwd?: string;
  iceOptions?: string[];
  candidates: Candidate[];
  remoteCandidatesList: RemoteCandidates[];
  endOfCandidates?: boolean;
  fingerprints: FingerPrint[];
  // rtpMaps: RTPMap[];
  // fmtp: Fmtp[];
  ptime?: string;
  maxPtime?: string;
  direction?: Direction;
  ssrcs: SSRC[];
  extmaps: Extmap[];
  // rtcpFeedbacks: RTCPFeedback[];
  rtcpMux?: boolean;
  rtcpMuxOnly?: boolean;
  rtcpRsize?: boolean;
  rtcp?: RTCP;
  msids: MSID[];
  imageattr: string[];
  rids: RID[];
  simulcast?: string;
  sctpPort?: string; //todo must provide of proto is sctp
  maxMessageSize?: string;
  unrecognized: Attribute[];
  setup?: Setup;
  payloads: PayloadAttribute[];
  rtcpFeedbackWildcards: RTCPFeedback[];
  ssrcGroups: SSRCGroup[];
}
