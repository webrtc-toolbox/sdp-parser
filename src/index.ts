import { Parser } from "./parser";
import { Printer } from "./printer";
import { SessionDescription } from "./session-types";

/**
 * @public
 * */
export function parse(sdp: string): SessionDescription {
  return new Parser().parse(sdp);
}

/**
 * @public
 * */
export function print(sessionDesc: SessionDescription, EOL?: string): string {
  return new Printer().print(sessionDesc, EOL);
}

export { Parser, Printer };
export * from "./session-types";
export * from "./attribute-types";
