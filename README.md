# SDP parser

SDP parsing/printing library, implemented based on the JavaScript Session Establishment Protocol(JSEP).

## parsing

```javascript
import { parse } from "sdp-parser";

const sessionDescription = parse(sdp);
```

## printing

```javascript
import { print } from "sdp-parser";

const sdp = print(sessionDescription);
```

## munging

```javascript
import { parse, print } from "sdp-parser";

const sessionDescription = parse(sdp);

sessionDescription
  .mediaDescription[0]
  .attributes
  .ssrcs.push({
    ssrcId: '1024',
    attributeName: 'label',
    attributeValue: 'oTwikEfJsdv0'
});

const mungedSdp = print(sessionDescription);

```
## roadmap
- [ ] Better error report while parsing
