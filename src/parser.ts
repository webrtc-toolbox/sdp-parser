import { CR, CRLF, LF, NUL, RECORD_TYPE, SP } from "./constants";
import {
  isAlpha,
  isBase64Char,
  isByteString,
  isDigit,
  isFixedLenTimeUnit,
  isHexDig,
  isICEChar,
  isNonWSChar,
  isPosDigit,
  isTLSIdChar,
  isTokenChar,
  isVChar,
} from "./utils";
import {
  Attribute,
  Bandwidth,
  Connection,
  Key,
  Media,
  MediaDescription,
  Origin,
  Record,
  Repeat,
  SessionDescription,
  TimeField,
} from "./session-types";
import {
  ACKFeedback,
  Candidate,
  Direction,
  Extmap,
  Fmtp,
  MediaAttributes,
  MSID,
  MsidSemantic,
  NACKFeedback,
  OtherFeedback,
  RemoteCandidates,
  RID,
  RIDBppParam,
  RIDBrParam,
  RIDDependParam,
  RIDFpsParam,
  RIDFsParam,
  RIDHeightParam,
  RIDOtherParam,
  RIDPpsParam,
  RIDWidthParam,
  RTCP,
  RTCPFeedback,
  RTPMap,
  SessionAttributes,
  SSRC,
  TRRINTFeedback,
} from "./attribute-types";

class ParsingBase {
  protected consumeText(str: string, cur: number): number {
    let peek = cur;

    while (peek < str.length) {
      const char = str[peek];
      if (char !== NUL && char !== CR && char !== LF) {
        peek += 1;
        continue;
      } else {
        break;
      }
    }

    if (peek - cur === 0) {
      throw new Error(`Invalid text, at ${str}`);
    }

    return peek;
  }

  protected consumeUnicastAddress(
    str: string,
    cur: number,
    type?: string
  ): number {
    //todo better address lexing
    return this.consumeTill(str, cur, SP);
    // switch (type) {
    //   case "IP4":
    //   case "ip4":
    //     return this.consumeIP4Address(str, cur);
    //   case "IP6":
    //   case "ip6":
    //     return this.consumeIP6Address(str, cur);
    //   default: {
    //     try {
    //       return this.consumeFQDN(str, cur);
    //     } catch (e) {
    //       try {
    //         return this.consumeExtnAddr(str, cur);
    //       } catch (e) {
    //         throw new Error("Invalid unicast address");
    //       }
    //     }
    //   }
    // }
  }

  protected consumeOneOrMore(
    str: string,
    cur: number,
    predict: (char: string) => boolean
  ): number {
    let peek = cur;

    while (true) {
      if (predict(str[peek])) {
        peek++;
      } else {
        break;
      }
    }

    if (peek - cur === 0) {
      throw new Error(`Invalid rule at ${cur}.`);
    }

    return peek;
  }

  protected consumeSpace(str: string, cur: number): number {
    if (str[cur] === SP) {
      return cur + 1;
    } else {
      throw new Error(`Invalid space at ${cur}.`);
    }
  }

  protected consumeIP4Address(str: string, cur: number): number {
    let peek = cur;
    for (let i = 0; i < 4; i++) {
      peek = this.consumeDecimalUChar(str, peek);

      if (i !== 3) {
        if (str[peek] === ".") {
          peek++;
        } else {
          throw new Error("Invalid IP4 address.");
        }
      }
    }

    return peek;
  }

  protected consumeDecimalUChar(str: string, cur: number): number {
    let peek = cur;
    for (let i = 0; i < 3; i++, peek++) {
      if (!isDigit(str[peek])) {
        break;
      }
    }

    if (peek - cur === 0) {
      throw new Error("Invalid decimal uchar.");
    }

    const integer = parseInt(str.slice(cur, peek));

    if (integer >= 0 && integer <= 255) {
      return peek;
    } else {
      throw new Error("Invalid decimal uchar");
    }
  }

  protected consumeIP6Address(str: string, cur: number): number {
    let peek = this.consumeHexpart(str, cur);
    if (str[peek] === ":") {
      peek += 1;
      peek = this.consumeIP4Address(str, peek);
      return peek;
    } else {
      return peek;
    }
  }

  protected consumeHexpart(str: string, cur: number): number {
    let peek = cur;

    //"::" [ hexseq ]
    if (str[peek] === ":" && str[peek + 1] === ":") {
      peek += 2;
      try {
        peek = this.consumeHexseq(str, peek);
      } catch (e) {}

      return peek;
    }

    peek = this.consumeHexseq(str, peek);

    //hexseq "::" [ hexseq ]
    if (str[peek] === ":" && str[peek + 1] === ":") {
      peek += 2;

      try {
        peek = this.consumeHexseq(str, peek);
      } catch (e) {}

      return peek;
    }

    //hexseq
    else {
      return peek;
    }
  }

  protected consumeHexseq(str: string, cur: number): number {
    let peek = cur;
    while (true) {
      peek = this.consumeHex4(str, peek);

      if (str[peek] === ":" && str[peek + 1] !== ":") {
        peek += 1;
      } else {
        break;
      }
    }

    return peek;
  }

  protected consumeHex4(str: string, cur: number): number {
    let i = 0;

    for (; i < 4; i++) {
      if (!isHexDig(str[cur + i])) {
        if (i === 0) {
          throw new Error("Invalid hex 4");
        }
        break;
      }
    }

    return cur + i;
  }

  protected consumeFQDN(str: string, cur: number): number {
    let peek = cur;

    while (true) {
      if (
        isDigit(str[peek]) ||
        isAlpha(str[peek]) ||
        str[peek] === "-" ||
        str[peek] === "."
      ) {
        peek += 1;
        continue;
      } else {
        break;
      }
    }

    if (peek - cur < 4) {
      throw new Error("Invalid FQDN");
    }

    return peek;
  }

  protected consumeExtnAddr(str: string, cur: number): number {
    return this.consumeOneOrMore(str, cur, isNonWSChar);
  }

  protected consumeMulticastAddress(
    str: string,
    cur: number,
    type: string
  ): number {
    switch (type) {
      case "IP4":
      case "ip4":
        return this.consumeIP4MulticastAddress(str, cur);
      case "IP6":
      case "ip6":
        return this.consumeIP6MulticastAddress(str, cur);
      default: {
        try {
          cur = this.consumeFQDN(str, cur);
          return cur;
        } catch (e) {
          cur = this.consumeExtnAddr(str, cur);
          return cur;
        }
      }
    }
  }

  protected consumeIP6MulticastAddress(str: string, cur: number): number {
    const peek = this.consumeHexpart(str, cur);

    if (str[peek] === "/") {
      return this.consumeInteger(str, peek + 1);
    } else {
      return peek;
    }
  }

  protected consumeIP4MulticastAddress(str: string, cur: number): number {
    let peek = cur + 3;

    const pre = str.slice(cur, peek);
    const pre_number = parseInt(pre);
    if (pre_number < 224 || pre_number > 239) {
      throw new Error(
        "Invalid IP4 multicast address, IPv4 multicast addresses may be in the range 224.0.0.0 to 239.255.255.255."
      );
    }

    for (let i = 0; i < 3; i++) {
      if (str[peek] !== ".") {
        throw new Error("Invalid IP4 multicast address.");
      } else {
        peek += 1;
      }

      peek = this.consumeDecimalUChar(str, peek);
    }

    if (str[peek] === "/") {
      peek += 1;
    }

    peek = this.consumeTTL(str, peek);

    if (str[peek] === "/") {
      peek = this.consumeInteger(str, peek);
    }

    return peek;
  }

  protected consumeInteger(str: string, peek: number): number {
    if (!isPosDigit(str[peek])) {
      throw new Error("Invalid integer.");
    } else {
      peek += 1;
    }

    while (true) {
      if (isDigit(str[peek])) {
        peek += 1;
      } else {
        break;
      }
    }

    return peek;
  }

  protected consumeTTL(str: string, peek: number): number {
    // single 0
    if (str[peek] === "0") {
      return peek + 1;
    }

    if (!isPosDigit(str[peek])) {
      throw new Error("Invalid TTL.");
    } else {
      peek += 1;
    }

    for (let i = 0; i < 2; i++) {
      if (isDigit(str[peek])) {
        peek += 1;
        continue;
      } else {
        break;
      }
    }

    return peek;
  }

  protected consumeToken(str: string, cur: number): number {
    return this.consumeOneOrMore(str, cur, isTokenChar);
  }

  protected consumeTime(recordValue: string, cur: number) {
    let peek = cur;

    if (recordValue[peek] === "0") {
      return peek + 1;
    }

    if (isPosDigit(recordValue[peek])) {
      peek += 1;
    }

    while (true) {
      if (isDigit(recordValue[peek])) {
        peek++;
      } else {
        break;
      }
    }

    if (peek - cur < 10) {
      throw new Error("Invalid time");
    }

    return peek;
  }

  protected consumeAddress(value: string, cur: number): number {
    //todo better address lexer
    return this.consumeTill(value, cur, SP);
    // const addressConsumer = [
    //   this.consumeIP4Address,
    //   this.consumeIP4MulticastAddress,
    //   this.consumeIP6Address,
    //   this.consumeIP6MulticastAddress,
    //   this.consumeFQDN,
    //   this.consumeExtnAddr,
    // ];
    //
    // let result: number | undefined;
    //
    // let i = 0;
    // while (i < addressConsumer.length) {
    //   try {
    //     result = addressConsumer[i].call(this, value, cur);
    //     break;
    //   } catch (e) {
    //     i++;
    //   }
    // }
    //
    // if (result === undefined) {
    //   throw new Error("Invalid ICE address");
    // }
    //
    // return result;
  }

  protected consumeTypedTime(recordValue: string, cur: number): number {
    let peek = cur;
    peek = this.consumeOneOrMore(recordValue, peek, isDigit);

    if (isFixedLenTimeUnit(recordValue[peek])) {
      return peek + 1;
    } else {
      return peek;
    }
  }

  protected consumeRepeatInterval(recordValue: string, cur: number) {
    if (!isPosDigit(recordValue[cur])) {
      throw new Error("Invalid repeat interval");
    }
    cur += 1;

    while (true) {
      if (!isDigit(recordValue[cur])) {
        break;
      }
      cur += 1;
    }

    if (isFixedLenTimeUnit(recordValue[cur])) {
      cur += 1;
    }

    return cur;
  }

  protected consumePort(value: string, cur: number): number {
    return this.consumeOneOrMore(value, cur, isDigit);
  }

  protected consume(value: string, cur: number, predicate: string): number {
    for (let i = 0; i < predicate.length; i++) {
      if (cur + i >= value.length) {
        throw new Error("consume exceeding value length");
      }

      if (value[cur + i] !== predicate[i]) {
        throw new Error(`consume ${predicate} failed at ${i}`);
      }
    }

    return cur + predicate.length;
  }

  protected consumeTill(
    value: string,
    cur: number,
    till: ((char: string) => boolean) | string | undefined
  ): number {
    let peek = cur;
    while (peek < value.length) {
      if (typeof till === "string" && value[peek] === till) {
        break;
      } else if (typeof till === "function" && till(value[peek])) {
        break;
      }

      peek++;
    }

    return peek;
  }
}

/**
 * @public
 * */
export class Parser extends ParsingBase {
  private records: Record[] = [];
  private currentLine = 0;

  public constructor() {
    super();
  }

  public parse(sdp: string): SessionDescription {
    const EOL = this.probeEOL(sdp);
    this.records = sdp
      .split(EOL)
      .filter((line) => !!line.trim())
      .map(this.parseLine);
    this.currentLine = 0;

    const version = this.parseVersion();
    const origin = this.parseOrigin();
    const sessionName = this.parseSessionName();
    const information = this.parseInformation();
    const uri = this.parseUri();
    const emails = this.parseEmail();
    const phones = this.parsePhone();
    const connection = this.parseConnection();
    const bandwidths = this.parseBandWidth();
    const timeFields = this.parseTimeFields();
    const key = this.parseKey();
    const attributes = this.parseSessionAttribute();
    const mediaDescriptions = this.parseMediaDescription();

    if (this.currentLine !== this.records.length) {
      throw new Error("parsing failed, non exhaustive sdp lines.");
    }

    return {
      version,
      origin,
      sessionName,
      information,
      uri,
      emails,
      phones,
      connection,
      bandwidths,
      timeFields,
      key,
      attributes,
      mediaDescriptions,
    };
  }

  public getRecords(): Record[] {
    return this.records;
  }

  private getCurrentRecord(): Record {
    const record = this.records[this.currentLine];

    if (!record) {
      throw new Error("Record doesn't exit.");
    }

    return record;
  }

  private probeEOL(sdp: string): string {
    for (let i = 0; i < sdp.length; i++) {
      if (sdp[i] === LF) {
        if (sdp[i - 1] === CR) {
          return CRLF;
        } else {
          return LF;
        }
      }
    }

    throw new Error("Invalid newline character.");
  }

  private parseLine(line: string, index: number): Record {
    if (line.length < 2) {
      throw new Error(
        `Invalid sdp line, sdp line should be of form <type>=<value>, at line ${
          index + 1
        }.`
      );
    }
    const type = line[0] as RECORD_TYPE;

    if (line[1] !== "=") {
      throw new Error(
        `Invalid sdp line, <type> should be a single character followed by an "=" sign, at line ${
          index + 1
        } `
      );
    }

    const value = line.slice(2);

    return { type, value, line: index, cur: 0 };
  }

  private parseSessionAttribute(): SessionAttributes {
    const attributeParser = new SessionAttributeParser();

    while (this.currentLine < this.records.length) {
      const record = this.getCurrentRecord();

      if (record.type !== RECORD_TYPE.ATTRIBUTE) {
        break;
      }

      const attField = this.extractOneOrMore(
        record,
        (char) => isTokenChar(char) && char !== ":"
      );
      const attribute: Attribute = { attField, _cur: 0, line: record.line };

      record.attribute = attribute;

      if (record.value[record.cur] === ":") {
        record.cur += 1;
        attribute.attValue = this.extractOneOrMore(record, isByteString);
      }

      attributeParser.parse(attribute);
      this.currentLine++;
    }

    return attributeParser.digest();
  }

  private parseMediaAttributes(media: Media): MediaAttributes {
    const attributeParser = new MediaAttributeParser(media);

    while (this.currentLine < this.records.length) {
      const record = this.getCurrentRecord();

      if (record.type !== RECORD_TYPE.ATTRIBUTE) {
        break;
      }

      const attField = this.extractOneOrMore(
        record,
        (char) => isTokenChar(char) && char !== ":"
      );
      const attribute: Attribute = { attField, _cur: 0, line: record.line };

      record.attribute = attribute;

      if (record.value[record.cur] === ":") {
        record.cur += 1;
        attribute.attValue = this.extractOneOrMore(record, isByteString);
      }

      attributeParser.parse(attribute);
      this.currentLine++;
    }

    return attributeParser.digest();
  }

  private parseKey(): Key | undefined {
    const record = this.getCurrentRecord();
    if (record.type !== RECORD_TYPE.KEY) {
      return;
    }

    if (
      record.value === "prompt" ||
      record.value === "clear:" ||
      record.value === "base64:" ||
      record.value === "uri:"
    ) {
      return record.value;
    }

    this.currentLine++;

    throw new Error("Invalid key.");
  }

  private parseZone() {
    const record = this.getCurrentRecord();
    if (record.type === RECORD_TYPE.ZONE_ADJUSTMENTS) {
      const adjustments = [];

      while (true) {
        try {
          const time = this.extract(record, this.consumeTime);
          this.consumeSpaceForRecord(record);

          let back = false;
          if (record.value[record.cur] === "-") {
            back = true;
            record.cur += 1;
          }

          const typedTime = this.extract(record, this.consumeTypedTime);

          adjustments.push({ time, typedTime, back });
        } catch (e) {
          break;
        }
      }

      if (adjustments.length === 0) {
        throw new Error("Invalid zone adjustments");
      }

      this.currentLine++;

      return adjustments;
    }

    return [];
  }

  private parseRepeat(): Repeat[] {
    const repeats = [];

    while (true) {
      const record = this.getCurrentRecord();
      if (record.type === RECORD_TYPE.REPEAT) {
        const repeatInterval = this.extract(record, this.consumeRepeatInterval);
        const typedTimes = this.parseTypedTime(record);

        repeats.push({ repeatInterval, typedTimes });
        this.currentLine++;
      } else {
        break;
      }
    }

    return repeats;
  }

  private parseTypedTime(record: Record) {
    const typedTimes = [];

    while (true) {
      try {
        this.consumeSpaceForRecord(record);
        typedTimes.push(this.extract(record, this.consumeTypedTime));
      } catch (e) {
        break;
      }
    }

    if (typedTimes.length === 0) {
      throw new Error("Invalid typed time.");
    }

    return typedTimes;
  }

  private parseTime() {
    const record = this.getCurrentRecord();
    const startTime = this.extract(record, this.consumeTime);
    this.consumeSpaceForRecord(record);
    const stopTime = this.extract(record, this.consumeTime);

    this.currentLine++;

    return { startTime, stopTime };
  }

  private parseBandWidth(): Bandwidth[] {
    const bandwidths = [];

    while (this.currentLine < this.records.length) {
      const record = this.getCurrentRecord();

      if (record.type === RECORD_TYPE.BANDWIDTH) {
        const bwtype = this.extractOneOrMore(record, isTokenChar);

        if (record.value[record.cur] !== ":") {
          throw new Error("Invalid bandwidth field.");
        } else {
          record.cur++;
        }

        const bandwidth = this.extractOneOrMore(record, isDigit);

        bandwidths.push({ bwtype, bandwidth });

        this.currentLine++;
      } else {
        break;
      }
    }

    return bandwidths;
  }

  private parseVersion(): string {
    const record = this.getCurrentRecord();

    if (record.type !== RECORD_TYPE.VERSION) {
      throw new Error(
        `first sdp record must be version, at line ${record.line}`
      );
    }

    const version = record.value.slice(
      0,
      this.consumeOneOrMore(record.value, 0, isDigit)
    );

    if (version.length !== record.value.length) {
      throw new Error(`invalid proto version, "v=${record.value}"`);
    }

    this.currentLine++;

    return version;
  }

  private parseOrigin(): Origin {
    const record = this.getCurrentRecord();

    if (record.type !== RECORD_TYPE.ORIGIN) {
      throw new Error("second line of sdp must be origin");
    }

    const username = this.extractOneOrMore(record, isNonWSChar);
    this.consumeSpaceForRecord(record);
    const sessId = this.extractOneOrMore(record, isDigit);
    this.consumeSpaceForRecord(record);
    const sessVersion = this.extractOneOrMore(record, isDigit);
    this.consumeSpaceForRecord(record);
    const nettype = this.extractOneOrMore(record, isTokenChar);
    this.consumeSpaceForRecord(record);
    const addrtype = this.extractOneOrMore(record, isTokenChar);
    this.consumeSpaceForRecord(record);
    const unicastAddress = this.extract(record, this.consumeUnicastAddress);

    this.currentLine++;

    return {
      username,
      sessId,
      sessVersion,
      nettype,
      addrtype,
      unicastAddress,
    };
  }

  private parseSessionName(): string | undefined {
    const record = this.getCurrentRecord();

    if (record.type === RECORD_TYPE.SESSION_NAME) {
      const sessionName = this.extract(record, this.consumeText);
      this.currentLine++;
      return sessionName;
    }
  }

  private parseInformation(): string | undefined {
    const record = this.getCurrentRecord();

    if (record.type !== RECORD_TYPE.INFORMATION) {
      return;
    }

    const information = this.extract(record, this.consumeText);

    this.currentLine++;

    return information;
  }

  private parseUri() {
    //TODO pending parsing URI
    const record = this.getCurrentRecord();

    if (record.type === RECORD_TYPE.URI) {
      this.currentLine++;
      return record.value;
    }
  }

  private parseEmail() {
    //todo parsing email
    const emails = [];

    while (true) {
      const record = this.getCurrentRecord();
      if (record.type === RECORD_TYPE.EMAIL) {
        emails.push(record.value);
        this.currentLine++;
      } else {
        break;
      }
    }
    return emails;
  }

  private parsePhone() {
    //todo parsing phone
    const phones = [];

    while (true) {
      const record = this.getCurrentRecord();
      if (record.type === RECORD_TYPE.PHONE) {
        phones.push(record.value);
        this.currentLine++;
      } else {
        break;
      }
    }

    return phones;
  }

  private parseConnection(): Connection | undefined {
    const record = this.getCurrentRecord();

    if (record.type === RECORD_TYPE.CONNECTION) {
      const nettype = this.extractOneOrMore(record, isTokenChar);
      this.consumeSpaceForRecord(record);
      const addrtype = this.extractOneOrMore(record, isTokenChar);
      this.consumeSpaceForRecord(record);
      const address = this.extract(record, this.consumeAddress);

      this.currentLine++;

      return { nettype, addrtype, address };
    }
  }

  private parseMedia(): Media {
    const record = this.getCurrentRecord();

    const mediaType = this.extract(record, this.consumeToken);

    this.consumeSpaceForRecord(record);

    let port = this.extract(record, this.consumePort);
    if (record.value[record.cur] === "/") {
      record.cur += 1;
      port += this.extract(record, this.consumeInteger);
    }

    this.consumeSpaceForRecord(record);

    const protos: any[] = [];
    protos.push(this.extract(record, this.consumeToken));

    while (true) {
      if (record.value[record.cur] === "/") {
        record.cur += 1;
        protos.push(this.extract(record, this.consumeToken));
      } else {
        break;
      }
    }

    if (protos.length === 0) {
      throw new Error("Invalid proto");
    }

    const fmts = this.parseFmt(record);

    this.currentLine++;

    return { mediaType, port, protos, fmts };
  }

  private parseTimeFields(): TimeField[] {
    const timeFields = [];

    while (true) {
      const record = this.getCurrentRecord();

      if (record.type === RECORD_TYPE.TIME) {
        const time = this.parseTime();
        const repeats = this.parseRepeat();
        const zones = this.parseZone();
        timeFields.push({ time, repeats, zones });
      } else {
        break;
      }
    }

    return timeFields;
  }

  private parseMediaDescription(): MediaDescription[] {
    const mediaDescriptions = [];

    while (this.currentLine < this.records.length) {
      const record = this.getCurrentRecord();

      if (record.type === RECORD_TYPE.MEDIA) {
        const media = this.parseMedia();
        const information = this.parseInformation();
        const connections = this.parseConnections();
        const bandwidths = this.parseBandWidth();
        const key = this.parseKey();
        const attributes = this.parseMediaAttributes(media);
        // const attributeMap = this.parseAttributeMap(attributes);

        const mediaDescription: MediaDescription = {
          media,
          information,
          connections,
          bandwidths,
          key,
          attributes,
          // attributeMap,
        };

        record.parsed = media;

        mediaDescriptions.push(mediaDescription);
      } else {
        break;
      }
    }

    return mediaDescriptions;

    // Object.values(this.mediaExtMap).forEach((extension) => {
    //   let ext = extension.digest();
    //
    //   if (ext) {
    //     Object.assign(result.exts, ext);
    //   }
    //
    //   extension.reset();
    // });
    //
    // return [result, i];
  }

  private parseConnections(): Connection[] {
    const connections = [];
    while (this.currentLine < this.records.length) {
      const record = this.getCurrentRecord();
      if (record.type !== RECORD_TYPE.CONNECTION) {
        break;
      }
      connections.push(this.parseConnection()!);
    }

    return connections;
  }

  private parseFmt(record: Record) {
    const fmts = [];

    while (true) {
      try {
        this.consumeSpaceForRecord(record);
        fmts.push(this.extract(record, this.consumeToken));
      } catch (e) {
        break;
      }
    }

    if (fmts.length === 0) {
      throw new Error("Invalid fmts");
    }

    return fmts;
  }

  private extract(
    record: Record,
    consume: (str: string, cur: number, ...rest: any) => number,
    ...rest: any
  ): string {
    const peek = consume.call(this, record.value, record.cur, ...rest);
    const result = record.value.slice(record.cur, peek);
    record.cur = peek;

    return result;
  }

  private extractOneOrMore(record: Record, predict: (char: string) => boolean) {
    const peek = this.consumeOneOrMore(record.value, record.cur, predict);
    const result = record.value.slice(record.cur, peek);
    record.cur = peek;

    return result;
  }

  private consumeSpaceForRecord(record: Record): void {
    if (record.value[record.cur] === SP) {
      record.cur += 1;
    } else {
      throw new Error(`Invalid space at ${record.cur}.`);
    }
  }
}

abstract class AttributeParser extends ParsingBase {
  protected abstract attributes: SessionAttributes | MediaAttributes;
  protected digested = false;

  abstract digest(): SessionAttributes | MediaAttributes;

  protected extractOneOrMore(
    attribute: Attribute,
    predict: (char: string) => boolean,
    range?: [number | undefined, number | undefined]
  ) {
    const peek = this.consumeOneOrMore(
      attribute.attValue!,
      attribute._cur,
      predict
    );

    const result = attribute.attValue!.slice(attribute._cur, peek);

    const [min, max] = range || [];
    if (typeof min === "number" && result.length < min) {
      throw new Error(
        `error in length, should be more or equal than ${min} characters.`
      );
    }

    if (typeof max === "number" && result.length > max) {
      throw new Error(
        `error in length, should be less or equal than ${max} characters.`
      );
    }

    attribute._cur = peek;

    return result;
  }

  protected consumeAttributeSpace(attribute: Attribute) {
    if (attribute.attValue![attribute._cur] === SP) {
      attribute._cur += 1;
    } else {
      throw new Error(`Invalid space at ${attribute._cur}.`);
    }
  }

  protected extract(
    attribute: Attribute,
    consume: (value: string, cur: number, ...rest: any) => number,
    ...rest: any
  ) {
    if (!attribute.attValue) {
      throw new Error("Nothing to extract from attValue.");
    }

    const peek = consume.call(
      this,
      attribute.attValue,
      attribute._cur,
      ...rest
    );
    const result = attribute.attValue.slice(attribute._cur, peek);
    attribute._cur = peek;
    return result;
  }

  protected atEnd(attribute: Attribute): boolean {
    if (!attribute.attValue) {
      throw new Error();
    }

    return attribute._cur >= attribute.attValue.length;
  }

  protected peekChar(attribute: Attribute): string {
    if (!attribute.attValue) {
      throw new Error();
    }

    return attribute.attValue[attribute._cur];
  }

  protected peek(attribute: Attribute, value: string): boolean {
    if (!attribute.attValue) {
      throw new Error();
    }

    for (let i = 0; i < value.length; i++) {
      if (value[i] !== attribute.attValue[attribute._cur + i]) {
        return false;
      }
    }

    return true;
  }

  protected parseIceUfrag(attribute: Attribute): void {
    if (this.attributes.iceUfrag) {
      throw new Error(
        "Invalid ice-ufrag, should be only a single line if 'a=ice-ufrag'"
      );
    }

    this.attributes.iceUfrag = this.extractOneOrMore(
      attribute,
      isICEChar,
      [4, 256]
    );
  }

  protected parseIcePwd(attribute: Attribute): void {
    if (this.attributes.icePwd) {
      throw new Error(
        "Invalid ice-pwd, should be only a single line if 'a=ice-pwd'"
      );
    }

    this.attributes.icePwd = this.extractOneOrMore(
      attribute,
      isICEChar,
      [22, 256]
    );
  }

  protected parseIceOptions(attribute: Attribute): void {
    if (this.attributes.iceOptions) {
      throw new Error(
        "Invalid ice-options, should be only one 'ice-options' line"
      );
    }

    const options = [];
    while (!this.atEnd(attribute)) {
      options.push(this.extractOneOrMore(attribute, isICEChar));
      try {
        this.consumeAttributeSpace(attribute);
      } catch (e) {
        if (this.atEnd(attribute)) {
          break;
        } else {
          throw e;
        }
      }
    }

    this.attributes.iceOptions = options;
  }

  protected parseFingerprint(attribute: Attribute): void {
    const hashFunction = this.extract(attribute, this.consumeToken);
    this.consumeAttributeSpace(attribute);
    // TODO: cheated
    const fingerprint = this.extract(attribute, this.consumeTill);

    this.attributes.fingerprints.push({ hashFunction, fingerprint });
  }

  protected parseExtmap(attribute: Attribute): void {
    const mapEntry = this.extractOneOrMore(attribute, isDigit);
    let direction;

    if (this.peekChar(attribute) === "/") {
      this.extract(attribute, this.consume, "/");
      direction = this.extract(attribute, this.consumeToken);
    }

    this.consumeAttributeSpace(attribute);

    const extensionName = this.extract(attribute, this.consumeTill, SP);

    const map: Extmap = {
      // mapEntry,
      entry: parseInt(mapEntry, 10),
      ...(direction && { direction }),
      extensionName,
    };

    if (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      map.extensionAttributes = this.extract(attribute, this.consumeTill);
    }

    attribute.parsed = map;

    this.attributes.extmaps.push(map);
  }

  protected parseSetup(attribute: Attribute): void {
    if (this.attributes.setup) {
      throw new Error("must only be one single 'a=setup' line.");
    }

    const role = this.extract(attribute, this.consumeTill);
    if (
      role !== "active" &&
      role !== "passive" &&
      role !== "actpass" &&
      role !== "holdconn"
    ) {
      throw new Error(
        "role must be one of 'active', 'passive', 'actpass', 'holdconn'."
      );
    }

    this.attributes.setup = role;
  }
}

class SessionAttributeParser extends AttributeParser {
  attributes: SessionAttributes = {
    unrecognized: [],
    groups: [],
    extmaps: [],
    fingerprints: [],
    identities: [],
  };

  public parse(attribute: Attribute): void {
    if (this.digested) {
      throw new Error("already digested");
    }

    try {
      switch (attribute.attField) {
        case "group":
          this.parseGroup(attribute);
          break;
        case "ice-lite":
          this.parseIceLite();
          break;
        case "ice-ufrag":
          this.parseIceUfrag(attribute);
          break;
        case "ice-pwd":
          this.parseIcePwd(attribute);
          break;
        case "ice-options":
          this.parseIceOptions(attribute);
          break;
        case "fingerprint":
          this.parseFingerprint(attribute);
          break;
        case "setup":
          this.parseSetup(attribute);
          break;
        case "tls-id":
          this.parseTlsId(attribute);
          break;
        case "identity":
          this.parseIdentity(attribute);
          break;
        case "extmap":
          this.parseExtmap(attribute);
          break;
        case "msid-semantic":
          this.parseMsidSemantic(attribute);
          break;
        default:
          attribute.ignored = true;
          this.attributes.unrecognized.push(attribute);
      }
    } catch (e) {
      const errorMsg = `parsing session attribute ${
        attribute.attField
      } error, "a=${attribute.attField}:${attribute.attValue}"; ${
        e instanceof Error && e.message
      }; at line:${attribute.line}, col:${attribute._cur} `;

      throw new Error(errorMsg);

      // console.error(

      // );
      // throw e;
    }

    if (!attribute.ignored && attribute.attValue && !this.atEnd(attribute)) {
      throw new Error("attribute parsing error");
    }
  }

  public digest(): SessionAttributes {
    this.digested = true;
    return this.attributes;
  }

  private parseGroup(attribute: Attribute): void {
    const semantic = this.extract(attribute, this.consumeToken);

    const identificationTag = [];
    while (!this.atEnd(attribute) && this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      identificationTag.push(this.extract(attribute, this.consumeToken));
    }

    this.attributes.groups.push({ semantic, identificationTag });
  }

  private parseIceLite(): void {
    if (this.attributes.iceLite) {
      throw new Error(
        "Invalid ice-lite, should be only a single line of 'a=ice-lite'"
      );
    }
    this.attributes.iceLite = true;
  }

  private parseTlsId(attribute: Attribute): void {
    if (this.attributes.tlsId) {
      throw new Error("must be only one tld-id line");
    }

    this.attributes.tlsId = this.extractOneOrMore(attribute, isTLSIdChar);
  }

  private parseIdentity(attribute: Attribute): void {
    const assertionValue = this.extractOneOrMore(attribute, isBase64Char);

    const extensions = [];
    while (!this.atEnd(attribute) && this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      const name = this.extract(attribute, this.consumeToken);
      this.extract(attribute, this.consume, "=");
      const value = this.extractOneOrMore(
        attribute,
        (char: string) => char !== SP && isByteString(char)
      );
      extensions.push({ name, value });
    }

    this.attributes.identities.push({ assertionValue, extensions });
  }

  private parseMsidSemantic(attribute: Attribute) {
    //handle Chrome msid-semantic erroneous syntax
    if (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
    }

    const semantic = this.extract(attribute, this.consumeToken);
    const msidSemantic: MsidSemantic = { semantic, identifierList: [] };

    while (true) {
      try {
        this.consumeAttributeSpace(attribute);
      } catch (e) {
        break;
      }

      if (this.peekChar(attribute) === "*") {
        this.extract(attribute, this.consume, "*");
        msidSemantic.applyForAll = true;
        break;
      } else {
        const identifier = this.extract(attribute, this.consumeTill, SP);
        msidSemantic.identifierList.push(identifier);
      }
    }

    this.attributes.msidSemantic = msidSemantic;
  }
}

class MediaAttributeParser extends AttributeParser {
  attributes: MediaAttributes;

  constructor(media: Media) {
    super();

    if (
      media.protos.indexOf("RTP") !== -1 ||
      media.protos.indexOf("rtp") !== -1
    ) {
      this.attributes = {
        unrecognized: [],
        candidates: [],
        extmaps: [],
        fingerprints: [],
        imageattr: [],
        msids: [],
        remoteCandidatesList: [],
        rids: [],
        ssrcs: [],
        ssrcGroups: [],
        rtcpFeedbackWildcards: [],
        payloads: [],
      };
    } else {
      this.attributes = {
        unrecognized: [],
        candidates: [],
        extmaps: [],
        fingerprints: [],
        imageattr: [],
        msids: [],
        remoteCandidatesList: [],
        rids: [],
        ssrcs: [],
        ssrcGroups: [],
        rtcpFeedbackWildcards: [],
        payloads: [],
      };
    }
  }

  public parse(attribute: Attribute): void {
    if (this.digested) {
      throw new Error("already digested");
    }

    try {
      switch (attribute.attField) {
        case "extmap":
          this.parseExtmap(attribute);
          break;
        case "setup":
          this.parseSetup(attribute);
          break;
        case "ice-ufrag":
          this.parseIceUfrag(attribute);
          break;
        case "ice-pwd":
          this.parseIcePwd(attribute);
          break;
        case "ice-options":
          this.parseIceOptions(attribute);
          break;
        case "candidate":
          this.parseCandidate(attribute);
          break;
        case "remote-candidate":
          this.parseRemoteCandidate(attribute);
          break;
        case "end-of-candidates":
          this.parseEndOfCandidates();
          break;
        case "fingerprint":
          this.parseFingerprint(attribute);
          break;
        case "rtpmap":
          this.parseRtpmap(attribute);
          break;
        case "ptime":
          this.parsePtime(attribute);
          break;
        case "maxptime":
          this.parseMaxPtime(attribute);
          break;
        case "sendrecv":
        case "recvonly":
        case "sendonly":
        case "inactive":
          this.parseDirection(attribute);
          break;
        case "ssrc":
          this.parseSSRC(attribute);
          break;
        // case "ssrc-group":
        //   this.parseSSRCGroup(attribute, attributeMap);
        //   break;
        case "fmtp":
          this.parseFmtp(attribute);
          break;
        case "rtcp-fb":
          this.parseRtcpFb(attribute);
          break;
        case "rtcp-mux":
          this.parseRTCPMux();
          break;
        case "rtcp-mux-only":
          this.parseRTCPMuxOnly();
          break;
        case "rtcp-rsize":
          this.parseRTCPRsize();
          break;
        case "rtcp":
          this.parseRTCP(attribute);
          break;
        case "mid":
          this.parseMid(attribute);
          break;
        case "msid":
          this.parseMsid(attribute);
          break;
        case "imageattr":
          this.parseImageAttr(attribute);
          break;
        case "rid":
          this.parseRid(attribute);
          break;
        case "simulcast":
          this.parseSimulcast(attribute);
          break;
        case "sctp-port":
          this.parseSctpPort(attribute);
          break;
        case "max-message-size":
          this.parseMaxMessageSize(attribute);
          break;
        case "ssrc-group":
          this.parseSSRCGroup(attribute);
          break;
        default:
          attribute.ignored = true;
          this.attributes.unrecognized.push(attribute);
      }
    } catch (e) {
      console.error(
        `parsing media attribute ${attribute.attField} error, "a=${
          attribute.attField
        }:${attribute.attValue}", at line ${attribute.line + 1}`
      );
      throw e;
    }

    if (!attribute.ignored && attribute.attValue && !this.atEnd(attribute)) {
      throw new Error("attribute parsing error");
    }
  }

  private parseCandidate(attribute: Attribute): void {
    const foundation = this.extractOneOrMore(attribute, isICEChar, [1, 32]);

    this.consumeAttributeSpace(attribute);

    const componentId = this.extractOneOrMore(attribute, isDigit, [1, 5]);

    this.consumeAttributeSpace(attribute);

    const transport = this.extract(attribute, this.consumeToken);

    this.consumeAttributeSpace(attribute);

    const priority = this.extractOneOrMore(attribute, isDigit, [1, 10]);

    this.consumeAttributeSpace(attribute);

    const connectionAddress = this.extract(attribute, this.consumeAddress);

    this.consumeAttributeSpace(attribute);

    const port = this.extract(attribute, this.consumePort);

    this.consumeAttributeSpace(attribute);

    this.extract(attribute, this.consume, "typ");

    this.consumeAttributeSpace(attribute);

    const type = this.extract(attribute, this.consumeToken);

    const candidate: Candidate = {
      foundation,
      componentId,
      transport,
      priority,
      connectionAddress,
      port,
      type,
      extension: {},
    };

    if (this.peek(attribute, " raddr")) {
      this.extract(attribute, this.consume, " raddr");
      this.consumeAttributeSpace(attribute);
      candidate.relAddr = this.extract(attribute, this.consumeAddress);
    }

    if (this.peek(attribute, " rport")) {
      this.extract(attribute, this.consume, " rport");
      this.consumeAttributeSpace(attribute);
      candidate.relPort = this.extract(attribute, this.consumePort);
    }

    while (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      const extensionAttName = this.extract(attribute, this.consumeToken);
      this.consumeAttributeSpace(attribute);
      candidate.extension[extensionAttName] = this.extractOneOrMore(
        attribute,
        isVChar
      );
    }

    this.attributes.candidates.push(candidate);
  }

  private parseRemoteCandidate(attribute: Attribute) {
    const remoteCandidates: RemoteCandidates = [];

    while (true) {
      const componentId = this.extractOneOrMore(attribute, isDigit, [1, 5]);
      this.consumeAttributeSpace(attribute);
      const connectionAddress = this.extract(attribute, this.consumeAddress);
      this.consumeAttributeSpace(attribute);
      const port = this.extract(attribute, this.consumePort);

      remoteCandidates.push({
        componentId,
        connectionAddress,
        port,
      });

      try {
        this.consumeAttributeSpace(attribute);
      } catch (e) {
        break;
      }
    }

    this.attributes.remoteCandidatesList.push(remoteCandidates);
  }

  private parseEndOfCandidates() {
    if (this.attributes.endOfCandidates) {
      throw new Error("must be only one line of end-of-candidates");
    }

    this.attributes.endOfCandidates = true;
  }

  private parseRtpmap(attribute: Attribute): void {
    const payloadType = this.extract(attribute, this.consumeToken);
    this.consumeAttributeSpace(attribute);
    const encodingName = this.extract(attribute, this.consumeTill, "/");
    this.extract(attribute, this.consume, "/");
    const clockRate = this.extractOneOrMore(attribute, isDigit);

    const rtpMap: RTPMap = { encodingName, clockRate };

    if (!this.atEnd(attribute) && this.peekChar(attribute) === "/") {
      this.extract(attribute, this.consume, "/");
      rtpMap.encodingParameters = parseInt(
        this.extract(attribute, this.consumeTill),
        10
      );
    }

    attribute.parsed = rtpMap;

    const payload = this.attributes.payloads.find(
      (payload) => payload.payloadType === parseInt(payloadType, 10)
    );
    if (payload) {
      payload.rtpMap = rtpMap;
    } else {
      const payload = {
        payloadType: parseInt(payloadType, 10),
        rtpMap,
        rtcpFeedbacks: [],
      };

      this.attributes.payloads.push(payload);
    }
  }

  private parsePtime(attribute: Attribute) {
    if (this.attributes.ptime) {
      throw new Error("must be only one line of ptime");
    }

    this.attributes.ptime = this.extract(attribute, this.consumeTill);
  }

  private parseMaxPtime(attribute: Attribute) {
    if (this.attributes.maxPtime) {
      throw new Error("must be only one line of ptime");
    }

    this.attributes.maxPtime = this.extract(attribute, this.consumeTill);
  }

  private parseDirection(attribute: Attribute) {
    if (this.attributes.direction) {
      throw new Error("must be only one line of direction info");
    }

    this.attributes.direction = attribute.attField as Direction;
  }

  private parseSSRC(attribute: Attribute) {
    const ssrcId = this.extractOneOrMore(attribute, isDigit);

    this.consumeAttributeSpace(attribute);

    const attributeName = this.extract(attribute, this.consumeTill, ":");
    let attributeValue: string | undefined = undefined;

    if (this.peekChar(attribute) === ":") {
      this.extract(attribute, this.consume, ":");
      attributeValue = this.extract(attribute, this.consumeTill);
    }

    let ssrc = this.attributes.ssrcs.find(
      (ssrc) => ssrc.ssrcId === parseInt(ssrcId, 10)
    );

    if (ssrc) {
      ssrc.attributes[attributeName] = attributeValue;

      attribute.parsed = ssrc;
    } else {
      ssrc = {
        ssrcId: parseInt(ssrcId, 10),
        attributes: { [attributeName]: attributeValue },
      };

      this.attributes.ssrcs.push(ssrc);

      attribute.parsed = ssrc;
    }
  }

  private parseFmtp(attribute: Attribute) {
    const format = this.extract(attribute, this.consumeTill, SP);
    this.consumeAttributeSpace(attribute);
    const parametersString = this.extract(attribute, this.consumeTill);

    const parameters: Fmtp["parameters"] = {};

    const keyValues = parametersString.split(";");
    keyValues.forEach((keyValue) => {
      // eslint-disable-next-line
      let [key, value] = keyValue.split("=");
      key = key.trim();
      const trueValue = typeof value === "string" ? value.trim() : null;

      if (typeof key === "string" && key.length > 0) {
        parameters[key] = trueValue;
      }
    });

    attribute.parsed = { parameters };

    const payload = this.attributes.payloads.find(
      (payload) => payload.payloadType === parseInt(format, 10)
    );

    if (payload) {
      payload.fmtp = { parameters };
    } else {
      this.attributes.payloads.push({
        payloadType: parseInt(format, 10),
        rtcpFeedbacks: [],
        fmtp: { parameters },
      });
    }
  }

  private parseFmtParameters(attribute: Attribute): any {
    const parameters: { [key: string]: string } = {};
    const key = this.extract(attribute, this.consumeTill, "=");
    attribute._cur++; // skip "="
    const value = this.extract(attribute, this.consumeTill, ";");
    parameters[key] = value;

    while (attribute.attValue![attribute._cur] === ";") {
      const key = this.extract(attribute, this.consumeTill, "=");
      attribute._cur++; // skip "="
      const value = this.extract(attribute, this.consumeTill, ";");
      parameters[key] = value;
    }

    return parameters;
  }

  private parseRtcpFb(attribute: Attribute) {
    let payloadType = "";

    if (this.peekChar(attribute) === "*") {
      payloadType = this.extract(attribute, this.consume, "*");
    } else {
      payloadType = this.extract(attribute, this.consumeTill, SP);
    }

    this.consumeAttributeSpace(attribute);

    const feedbackType = this.extract(attribute, this.consumeTill, SP);
    let rtcpFeedback: RTCPFeedback;

    switch (feedbackType) {
      case "trr-int": {
        const interval = this.extract(attribute, this.consumeTill);
        const feedback: TRRINTFeedback = { type: feedbackType, interval };
        // this.attributes.rtcpFeedbacks.push({ payloadType, feedback });
        rtcpFeedback = feedback;
        break;
      }
      case "ack":
      case "nack":
      default:
        {
          const feedback: ACKFeedback | NACKFeedback | OtherFeedback = {
            type: feedbackType,
          };

          if (this.peekChar(attribute) === SP) {
            this.consumeAttributeSpace(attribute);
            feedback.parameter = this.extract(attribute, this.consumeToken);

            if (this.peekChar(attribute) === SP) {
              feedback.additional = this.extract(attribute, this.consumeTill);
            }
          }
          rtcpFeedback = feedback;
        }
        break;
    }

    attribute.parsed = rtcpFeedback;

    if (payloadType === "*") {
      this.attributes.rtcpFeedbackWildcards.push(rtcpFeedback);
    } else {
      const payload = this.attributes.payloads.find(
        (payload) => payload.payloadType === parseInt(payloadType, 10)
      );

      if (payload) {
        payload.rtcpFeedbacks.push(rtcpFeedback);
      } else {
        this.attributes.payloads.push({
          payloadType: parseInt(payloadType, 10),
          rtcpFeedbacks: [rtcpFeedback],
        });
      }
    }
  }

  private parseRTCPMux() {
    if (this.attributes.rtcpMux) {
      throw new Error("must be single line of rtcp-mux");
    }

    this.attributes.rtcpMux = true;
  }

  private parseRTCPMuxOnly() {
    if (this.attributes.rtcpMuxOnly) {
      throw new Error("must be single line of rtcp-only");
    }

    this.attributes.rtcpMuxOnly = true;
  }

  private parseRTCPRsize() {
    if (this.attributes.rtcpRsize) {
      throw new Error("must be single line of rtcp-rsize");
    }

    this.attributes.rtcpRsize = true;
  }

  private parseRTCP(attribute: Attribute) {
    if (this.attributes.rtcp) {
      throw new Error("must be single line of rtcp");
    }

    const port = this.extract(attribute, this.consumePort);

    const rtcp: RTCP = { port };

    if (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      rtcp.netType = this.extractOneOrMore(attribute, isTokenChar);
      this.consumeAttributeSpace(attribute);
      rtcp.addressType = this.extractOneOrMore(attribute, isTokenChar);
      this.consumeAttributeSpace(attribute);
      rtcp.address = this.extract(attribute, this.consumeAddress);
    }

    this.attributes.rtcp = rtcp;
  }

  private parseMsid(attribute: Attribute) {
    const id = this.extractOneOrMore(attribute, isTokenChar, [1, 64]);
    const msid: MSID = { id };

    if (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);
      msid.appdata = this.extractOneOrMore(attribute, isTokenChar, [1, 64]);
    }

    this.attributes.msids.push(msid);
  }

  private parseImageAttr(attribute: Attribute) {
    //TODO pending parsing image attribute... 'cause it's stupid complex
    this.attributes.imageattr.push(attribute.attValue!);
  }

  private parseRid(attribute: Attribute) {
    const id = this.extractOneOrMore(
      attribute,
      (char: string) =>
        isAlpha(char) || isDigit(char) || char === "_" || char === "-"
    );

    this.consumeAttributeSpace(attribute);

    const direction = this.extract(
      attribute,
      this.consumeToken
    ) as RID["direction"];

    const rid: RID = { id, direction, params: [] };

    if (this.peekChar(attribute) === SP) {
      this.consumeAttributeSpace(attribute);

      //rid-pt-params-list
      if (this.peek(attribute, "pt=")) {
        this.extract(attribute, this.consume, "pt=");
        const payloads = [];
        while (true) {
          const fmt = this.extract(attribute, this.consumeToken);
          payloads.push(fmt);
          try {
            this.extract(attribute, this.consume, ",");
          } catch (e) {
            break;
          }
        }

        rid.payloads = payloads;

        if (this.peekChar(attribute) === SP) {
          this.extract(attribute, this.consume, SP);
        }
      }

      while (true) {
        const type = this.extract(attribute, this.consumeToken);

        switch (type) {
          case "depend": {
            const val = this.extract(attribute, this.consume, "=");
            const rids = val.split(",");
            const param: RIDDependParam = { type, rids };
            rid.params.push(param);
            break;
          }
          case "max-width":
          case "height-width":
          case "max-fps":
          case "max-fs":
          case "max-br":
          case "max-pps":
          case "max-bpp":
          default: {
            const param:
              | RIDWidthParam
              | RIDHeightParam
              | RIDFpsParam
              | RIDFsParam
              | RIDBrParam
              | RIDPpsParam
              | RIDBppParam
              | RIDOtherParam = { type };

            if (this.peekChar(attribute) === "=") {
              this.extract(attribute, this.consume, "=");
              param.val = this.extract(attribute, this.consumeTill, ";");
            }
            rid.params.push(param);
          }
        }

        try {
          this.extract(attribute, this.consume, ";");
        } catch (e) {
          break;
        }
      }
    }

    this.attributes.rids.push(rid);
  }

  private parseSimulcast(attribute: Attribute) {
    //todo pending parsing simulcast
    if (this.attributes.simulcast) {
      throw new Error("must be single line of simulcast");
    }

    this.attributes.simulcast = attribute.attValue;
    this.extract(attribute, this.consumeTill);
  }

  private parseSctpPort(attribute: Attribute) {
    this.attributes.sctpPort = this.extractOneOrMore(
      attribute,
      isDigit,
      [1, 5]
    );
  }

  private parseMaxMessageSize(attribute: Attribute) {
    this.attributes.maxMessageSize = this.extractOneOrMore(attribute, isDigit, [
      1,
      undefined,
    ]);
  }

  public digest(): MediaAttributes {
    this.digested = true;
    return this.attributes;
  }

  private parseMid(attribute: Attribute) {
    this.attributes.mid = this.extract(attribute, this.consumeToken);
  }

  private parseSSRCGroup(attribute: Attribute) {
    const semantic = this.extract(attribute, this.consumeToken);
    const ssrcIds = [];

    while (true) {
      try {
        this.consumeAttributeSpace(attribute);
        const ssrcId = this.extract(attribute, this.consumeInteger);
        ssrcIds.push(parseInt(ssrcId, 10));
      } catch (e) {
        break;
      }
    }

    const group = { semantic, ssrcIds };

    attribute.parsed = group;

    this.attributes.ssrcGroups.push(group);
  }
}
