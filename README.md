# sdp-parser

sdp-parser is a SDP(Session Description Protocol) parsing/printing library written in TypeScript.

## reference RFCs/protocols

sdp-parser was developed implementing part of these RFCs/protocols:

- RFC 4566 - SDP: Session Description Protocol
- JavaScript Session Establishment Protocol

## Installation

```sh
npm install @webrtc-toolbox/sdp-parser

// or if using yarn
yarn add @webrtc-toolbox/sdp-parser
```

## Building

```sh
yarn build
```

should yield `dist` dictory, within which are:

- minified JavaScript file `index.js`,
- source-map file `index.js.map`
- and TypeScript type definations `sdp-parser.d.ts`.

## Usage
### parsing

```javascript
import { parse } from "@webrtc-toolbox/sdp-parser";

const sessionDescription = parse(sdp);
```

### printing

```javascript
import { print } from "@webrtc-toolbox/sdp-parser";

const sdp = print(sessionDescription);
```

### munging

```javascript
import { parse, print } from "@webrtc-toolbox/sdp-parser";

const sessionDescription = parse(sdp);

sessionDescription.mediaDescription[0].attributes.ssrcs.push({
  ssrcId: "1024",
  attributeName: "label",
  attributeValue: "oTwikEfJsdv0",
});

const mungedSdp = print(sessionDescription);
```

## roadmap

- [ ] Better error report while parsing
- [ ] Performance improvements
