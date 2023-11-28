import {
  Attribute,
  Bandwidth,
  Connection,
  Media,
  MediaDescription,
  Origin,
  SessionDescription,
  TimeField,
} from "./session-types";
import { CRLF, SP } from "./constants";
import {
  Candidate,
  Direction,
  Extmap,
  FingerPrint,
  Fmtp,
  Group,
  Identity,
  MediaAttributes,
  MSID,
  MsidSemantic,
  RemoteCandidates,
  RID,
  RIDDependParam,
  RIDParam,
  RTCP,
  RTCPFeedback,
  RTPMap,
  SessionAttributes,
  Setup,
  SSRC,
  TRRINTFeedback,
} from "./attribute-types";

/**
 * @public
 * */
export class Printer {
  private eol: string = CRLF;

  public print(sessionDescription: SessionDescription, EOL?: string): string {
    let sdp = "";
    if (EOL) {
      this.eol = EOL;
    }

    sdp += this.printVersion(sessionDescription.version);
    sdp += this.printOrigin(sessionDescription.origin);
    sdp += this.printSessionName(sessionDescription.sessionName);
    sdp += this.printInformation(sessionDescription.information);
    sdp += this.printUri(sessionDescription.uri);
    sdp += this.printEmail(sessionDescription.emails);
    sdp += this.printPhone(sessionDescription.phones);
    sdp += this.printConnection(sessionDescription.connection);
    sdp += this.printBandwidth(sessionDescription.bandwidths);
    sdp += this.printTimeFields(sessionDescription.timeFields);
    sdp += this.printKey(sessionDescription.key);
    sdp += this.printSessionAttributes(sessionDescription.attributes);
    sdp += this.printMediaDescription(sessionDescription.mediaDescriptions);

    return sdp;
  }

  private printVersion(version: string) {
    return `v=${version}${this.eol}`;
  }

  private printOrigin(origin: Origin) {
    return `o=${origin.username} ${origin.sessId} ${origin.sessVersion} ${origin.nettype} ${origin.addrtype} ${origin.unicastAddress}${this.eol}`;
  }

  private printSessionName(sessionName?: string) {
    return sessionName ? `s=${sessionName}${this.eol}` : "";
  }

  private printInformation(information?: string) {
    return information ? `i=${information}${this.eol}` : "";
  }

  private printUri(uri?: string) {
    return uri ? `u=${uri}${this.eol}` : "";
  }

  private printEmail(emails: string[]) {
    let result = "";
    for (const email of emails) {
      result += `e=${email}${this.eol}`;
    }
    return result;
  }

  private printPhone(phones: string[]) {
    let result = "";
    for (const phone of phones) {
      result += `e=${phone}${this.eol}`;
    }
    return result;
  }

  private printConnection(connection?: Connection) {
    return connection
      ? `c=${connection.nettype} ${connection.addrtype} ${connection.address}${this.eol}`
      : "";
  }

  private printBandwidth(bandwidths: Bandwidth[]) {
    let result = "";
    for (const bandwidth of bandwidths) {
      result += `b=${bandwidth.bwtype}:${bandwidth.bandwidth}${this.eol}`;
    }
    return result;
  }

  private printTimeFields(timeFields: TimeField[]) {
    let result = "";
    for (const timeField of timeFields) {
      result += `t=${timeField.time.startTime} ${timeField.time.startTime}${this.eol}`;

      for (const repeatField of timeField.repeats) {
        result += `r=${
          repeatField.repeatInterval
        } ${repeatField.typedTimes.join(" ")}${this.eol}`;
      }

      if (timeField.zoneAdjustments) {
        result += `z=`;
        result += `z=${timeField.zoneAdjustments
          .map(
            (zone) => `${zone.time} ${zone.back ? "-" : ""} ${zone.typedTime}`
          )
          .join(" ")}${this.eol}`;

        result += this.eol;
      }
    }
    return result;
  }

  private printKey(key?: string) {
    return key ? `k=${key}${this.eol}` : "";
  }

  private printAttributes(attributes: Attribute[]) {
    let result = "";
    for (const attribute of attributes) {
      result += `a=${attribute.attField}${
        attribute.attValue ? `:${attribute.attValue}` : ""
      }${this.eol}`;
    }
    return result;
  }

  private printMediaDescription(mediaDescriptions: MediaDescription[]) {
    let result = "";
    for (const mediaDescription of mediaDescriptions) {
      result += this.printMedia(mediaDescription.media);
      result += this.printInformation(mediaDescription.information);
      result += this.printConnections(mediaDescription.connections);
      result += this.printBandwidth(mediaDescription.bandwidths);
      result += this.printKey(mediaDescription.key);
      result += this.printMediaAttributes(mediaDescription);
    }
    return result;
  }

  private printConnections(connections: Connection[]) {
    let result = "";
    for (const connection of connections) {
      result += this.printConnection(connection);
    }
    return result;
  }

  private printMedia(media: Media) {
    return `m=${media.mediaType} ${media.port} ${media.protos.join(
      "/"
    )} ${media.fmts.join(" ")}${this.eol}`;
  }

  private printSessionAttributes(attributes: SessionAttributes) {
    const sessionAttributePrinter = new SessionAttributePrinter(this.eol);
    return sessionAttributePrinter.print(attributes);
  }

  private printMediaAttributes(mediaDescription: MediaDescription) {
    const mediaAttributePrinter = new MediaAttributePrinter(this.eol);
    return mediaAttributePrinter.print(mediaDescription);
  }
}

class AttributePrinter {
  protected eol: string;

  constructor(eol: string) {
    this.eol = eol;
  }

  protected printIceUfrag(iceUfrag: string | undefined) {
    if (typeof iceUfrag === "undefined") {
      return "";
    } else {
      return `a=ice-ufrag:${iceUfrag}${this.eol}`;
    }
  }

  protected printIcePwd(icePwd: string | undefined) {
    if (typeof icePwd === "undefined") {
      return "";
    } else {
      return `a=ice-pwd:${icePwd}${this.eol}`;
    }
  }

  protected printIceOptions(iceOptions: string[] | undefined) {
    if (typeof iceOptions === "undefined") {
      return "";
    }

    return `a=ice-options:${iceOptions.join(SP)}${this.eol}`;
  }

  protected printFingerprints(fingerprints: FingerPrint[]) {
    if (fingerprints.length > 0) {
      return (
        fingerprints
          .map(
            (fingerprint) =>
              `a=fingerprint:${fingerprint.hashFunction}${SP}${fingerprint.fingerprint}`
          )
          .join(this.eol) + this.eol
      );
    }
    return "";
  }

  protected printExtmap(extmaps: Extmap[]) {
    return extmaps
      .map((extmap) => {
        return `a=extmap:${extmap.entry}${
          extmap.direction ? `/${extmap.direction}` : ""
        }${SP}${extmap.extensionName}${
          extmap.extensionAttributes ? `${SP}${extmap.extensionAttributes}` : ""
        }${this.eol}`;
      })
      .join("");
  }

  protected printSetup(setup: Setup | undefined) {
    return typeof setup === "undefined" ? "" : `a=setup:${setup}${this.eol}`;
  }

  protected printUnrecognized(unrecognized: Attribute[]) {
    return unrecognized
      .map(
        (attribute) =>
          `a=${attribute.attField}${
            attribute.attValue ? `:${attribute.attValue}` : ""
          }${this.eol}`
      )
      .join("");
  }
}

class SessionAttributePrinter extends AttributePrinter {
  public print(attributes: SessionAttributes): string {
    let lines = "";
    lines += this.printGroups(attributes.groups);
    lines += this.printMsidSemantic(attributes.msidSemantic);
    lines += this.printIceLite(attributes.iceLite);
    lines += this.printIceUfrag(attributes.iceUfrag);
    lines += this.printIcePwd(attributes.icePwd);
    lines += this.printIceOptions(attributes.iceOptions);
    lines += this.printFingerprints(attributes.fingerprints);
    lines += this.printSetup(attributes.setup);
    lines += this.printTlsId(attributes.tlsId);
    lines += this.printIdentity(attributes.identities);
    lines += this.printExtmap(attributes.extmaps);
    lines += this.printUnrecognized(attributes.unrecognized);

    return lines;
  }

  private printGroups(groups: Group[]) {
    let result = "";

    if (groups.length > 0) {
      result += groups
        .map(
          (group) =>
            `a=group:${group.semantic}${group.identificationTag
              .map((item) => `${SP}${item}`)
              .join("")}${this.eol}`
        )
        .join("");
    }
    return result;
  }

  private printIceLite(iceLite: boolean | undefined) {
    if (typeof iceLite === "undefined") {
      return "";
    } else {
      return "a=ice-lite" + this.eol;
    }
  }

  private printTlsId(tlsId: string | undefined) {
    if (tlsId) {
      return `a=tls-id:${tlsId}${this.eol}`;
    }

    return "";
  }

  private printIdentity(identities: Identity[]) {
    if (identities.length === 0) {
      return "";
    }

    return (
      identities
        .map((identity) => {
          return `a=identity:${
            identity.assertionValue
          }${identity.extensions.map(
            (extension) =>
              `${SP}${extension.name}${
                extension.value ? `=${extension.value}` : ""
              }`
          )}`;
        })
        .join(this.eol) + this.eol
    );
  }

  private printMsidSemantic(msidSemantic: MsidSemantic | undefined) {
    if (!msidSemantic) {
      return "";
    }

    let result = `a=msid-semantic:${msidSemantic.semantic}`;
    if (msidSemantic.applyForAll) {
      result += `${SP}*`;
    } else if (msidSemantic.identifierList.length > 0) {
      result += msidSemantic.identifierList.map(
        (identifier) => `${SP}${identifier}`
      );
    }

    return result + this.eol;
  }
}

class MediaAttributePrinter extends AttributePrinter {
  public print(mediaDescription: MediaDescription): string {
    const attributes = mediaDescription.attributes;
    let lines = "";

    lines += this.printRTCP(attributes.rtcp);
    lines += this.printIceUfrag(attributes.iceUfrag);
    lines += this.printIcePwd(attributes.icePwd);
    lines += this.printIceOptions(attributes.iceOptions);
    lines += this.printCandidates(attributes.candidates);
    lines += this.printRemoteCandidatesList(attributes.remoteCandidatesList);
    lines += this.printEndOfCandidates(attributes.endOfCandidates);
    lines += this.printFingerprints(attributes.fingerprints);
    lines += this.printSetup(attributes.setup);
    lines += this.printMid(attributes.mid);
    lines += this.printExtmap(attributes.extmaps);
    // if (
    //   mediaDescription.media.protos.indexOf("RTP") !== -1 ||
    //   mediaDescription.media.protos.indexOf("rtp") !== -1
    // ) {
    lines += this.printRTPRelated(attributes);
    // }

    lines += this.printPtime(attributes.ptime);
    lines += this.printMaxPtime(attributes.maxPtime);
    lines += this.printDirection(attributes.direction);
    lines += this.printSSRCGroups(attributes.ssrcGroups);
    lines += this.printSSRC(attributes.ssrcs);
    lines += this.printRTCPMux(attributes.rtcpMux);
    lines += this.printRTCPMuxOnly(attributes.rtcpMuxOnly);
    lines += this.printRTCPRsize(attributes.rtcpRsize);
    lines += this.printMSId(attributes.msids);
    lines += this.printImageattr(attributes.imageattr);
    lines += this.printRid(attributes.rids);
    lines += this.printSimulcast(attributes.simulcast);
    lines += this.printSCTPPort(attributes.sctpPort);
    lines += this.printMaxMessageSize(attributes.maxMessageSize);
    lines += this.printUnrecognized(attributes.unrecognized);

    return lines;
  }

  private printCandidates(candidates: Candidate[]) {
    return candidates
      .map(
        (candidate) =>
          `a=candidate:${candidate.foundation}${SP}${
            candidate.componentId
          }${SP}${candidate.transport}${SP}${candidate.priority}${SP}${
            candidate.connectionAddress
          }${SP}${candidate.port}${SP}typ${SP}${candidate.type}${
            candidate.relAddr ? `${SP}raddr${SP}${candidate.relAddr}` : ""
          }${
            candidate.relPort ? `${SP}rport${SP}${candidate.relPort}` : ""
          }${Object.keys(candidate.extension)
            .map((key) => `${SP}${key}${SP}${candidate.extension[key]}`)
            .join("")}${this.eol}`
      )
      .join("");
  }

  private printRemoteCandidatesList(remoteCandidatesList: RemoteCandidates[]) {
    return remoteCandidatesList
      .map(
        (remoteCandidates) =>
          `a=remote-candidates:${remoteCandidates.join(SP)}${this.eol}`
      )
      .join("");
  }

  private printEndOfCandidates(endOfCandidates: boolean | undefined) {
    if (typeof endOfCandidates === "undefined") {
      return "";
    }

    return "a=end-of-candidates" + this.eol;
  }

  private printRTPRelated(attributes: MediaAttributes) {
    if (!attributes.payloads) {
      return "";
    }
    const payloads = attributes.payloads;

    let lines = "";

    lines += attributes.rtcpFeedbackWildcards
      .map((feedback) => this.printRTCPFeedback("*", feedback))
      .join("");

    for (const payload of payloads) {
      lines += this.printRtpMap(payload.payloadType, payload.rtpMap);
      lines += this.printFmtp(payload.payloadType, payload.fmtp);
      lines += payload.rtcpFeedbacks
        .map((feedback) =>
          this.printRTCPFeedback(payload.payloadType, feedback)
        )
        .join("");
    }
    // for (const payloadType of Object.keys(payloads)) {
    //   lines += this.printRtpMap(payloadType, payloads[payloadType].rtpMap);
    //   lines += this.printFmtp(payloadType, payloads[payloadType].fmtp);
    //   lines += payloads[payloadType].rtcpFeedbacks
    //     .map((feedback) => this.printRTCPFeedback(payloadType, feedback))
    //     .join("");
    // }

    return lines;
  }

  private printFmtp(payloadType: number, fmtp?: Fmtp) {
    if (!fmtp) {
      return "";
    }

    const keys = Object.keys(fmtp.parameters);

    if (keys.length === 1 && fmtp.parameters[keys[0]] === null) {
      //not xxx=yyy;aaa=bbb format
      return `a=fmtp:${payloadType}${SP}${keys[0]}${this.eol}`;
    }

    return `a=fmtp:${payloadType}${SP}${Object.keys(fmtp.parameters)
      .map((key) => `${key}=${fmtp.parameters[key]}`)
      .join(";")}${this.eol}`;
  }

  private printRtpMap(payloadType: number, rtpMap?: RTPMap): string {
    if (!rtpMap) {
      return "";
    }

    return `a=rtpmap:${payloadType}${SP}${rtpMap.encodingName}/${
      rtpMap.clockRate
    }${rtpMap.encodingParameters ? `/${rtpMap.encodingParameters}` : ""}${
      this.eol
    }`;
  }

  private printRTCPFeedback(
    payloadType: number | "*",
    rtcpFeedback: RTCPFeedback
  ) {
    let result = `a=rtcp-fb:${payloadType}${SP}`;

    let feedback = rtcpFeedback;
    switch (feedback.type) {
      case "trr-int":
        result += `ttr-int${SP}${(feedback as TRRINTFeedback).interval}`;
        break;
      case "ack":
      case "nack":
      default:
        feedback = feedback as Exclude<RTCPFeedback, TRRINTFeedback>;
        result += `${feedback.type}`;

        if (feedback.parameter) {
          result += `${SP}${feedback.parameter}`;

          if (feedback.additional) {
            result += `${SP}${feedback.additional}`;
          }
        }
        break;
    }

    return result + this.eol;
  }

  private printPtime(ptime: string | undefined) {
    return typeof ptime === "undefined" ? "" : `a=ptime:${ptime}${this.eol}`;
  }

  private printMaxPtime(maxPtime: string | undefined) {
    return typeof maxPtime === "undefined"
      ? ""
      : `a=maxptime:${maxPtime}${this.eol}`;
  }

  private printDirection(direction: Direction | undefined) {
    return typeof direction === "undefined" ? "" : `a=${direction}${this.eol}`;
  }

  private printSSRC(ssrcs: SSRC[]) {
    return ssrcs
      .map((ssrc) =>
        Object.keys(ssrc.attributes)
          .map(
            (attributeName) =>
              `a=ssrc:${ssrc.ssrcId.toString(10)}${SP}${attributeName}${
                ssrc.attributes[attributeName]
                  ? `:${ssrc.attributes[attributeName]}`
                  : ""
              }${this.eol}`
          )
          .join("")
      )
      .join("");
  }

  private printRTCPMux(rtcpMux: boolean | undefined) {
    return typeof rtcpMux === "undefined" ? "" : `a=rtcp-mux${this.eol}`;
  }

  private printRTCPMuxOnly(rtcpMuxOnly: boolean | undefined) {
    return typeof rtcpMuxOnly === "undefined"
      ? ""
      : `a=rtcp-mux-only${this.eol}`;
  }

  private printRTCPRsize(rtcpRsize: boolean | undefined) {
    return typeof rtcpRsize === "undefined" ? "" : `a=rtcp-rsize${this.eol}`;
  }

  private printRTCP(rtcp: RTCP | undefined) {
    if (typeof rtcp === "undefined") {
      return "";
    }

    let result = `a=rtcp:${rtcp.port}`;

    if (rtcp.netType) {
      result += `${SP}${rtcp.netType}`;
    }

    if (rtcp.addressType) {
      result += `${SP}${rtcp.addressType}`;
    }

    if (rtcp.address) {
      result += `${SP}${rtcp.address}`;
    }

    return result + this.eol;
  }

  private printMSId(msids: MSID[]) {
    return msids
      .map(
        (msid) =>
          `a=msid:${msid.id}${msid.appdata ? `${SP}${msid.appdata}` : ""}${
            this.eol
          }`
      )
      .join("");
  }

  private printImageattr(imageattr: string[]) {
    return imageattr.map((attr) => `a=imageattr:${attr}${this.eol}`).join("");
  }

  private printRid(rids: RID[]) {
    return rids
      .map((rid) => {
        let result = `a=rid:${rid.id}${SP}${rid.direction}`;

        if (rid.payloads) {
          result += `${SP}pt=${rid.payloads.join(",")}`;
        }

        if (rid.params.length > 0) {
          result += `${SP}${rid.params
            .map((param) => {
              if (param.type === "depend") {
                return `depend=${(param as RIDDependParam).rids.join(",")}`;
              } else {
                return `${param.type}=${
                  (param as Exclude<RIDParam, RIDDependParam>).val
                }`;
              }
            })
            .join(";")}`;
        }

        return result + this.eol;
      })
      .join("");
  }

  private printSimulcast(simulcast: string | undefined) {
    return typeof simulcast === "undefined"
      ? ""
      : `a=simulcast:${simulcast}${this.eol}`;
  }

  private printSCTPPort(sctpPort: string | undefined) {
    return typeof sctpPort === "undefined"
      ? ""
      : `a=sctp-port:${sctpPort}${this.eol}`;
  }

  private printMaxMessageSize(maxMessageSize: string | undefined) {
    return typeof maxMessageSize === "undefined"
      ? ""
      : `a=max-message-size:${maxMessageSize}${this.eol}`;
  }

  private printMid(mid: string | undefined) {
    return typeof mid === "undefined" ? "" : `a=mid:${mid}${this.eol}`;
  }

  private printSSRCGroups(
    ssrcGroups: { semantic: string; ssrcIds: number[] }[]
  ) {
    return ssrcGroups
      .map(
        (ssrcGroup) =>
          `a=ssrc-group:${ssrcGroup.semantic}${ssrcGroup.ssrcIds
            .map((id) => `${SP}${id.toString(10)}`)
            .join("")}${this.eol}`
      )
      .join("");
  }
}
