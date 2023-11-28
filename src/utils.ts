export function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

export function isVChar(char: string): boolean {
  return char >= "\u0021" && char <= "\u007E";
}

export function isNonWSChar(char: string): boolean {
  return isVChar(char) || (char >= "\u0080" && char <= "\u00FF");
}

export function isTokenChar(char: string): boolean {
  return (
    char === "\u0021" ||
    (char >= "\u0023" && char <= "\u0027") ||
    (char >= "\u002A" && char <= "\u002B") ||
    (char >= "\u002D" && char <= "\u002E") ||
    (char >= "\u0030" && char <= "\u0039") ||
    (char >= "\u0041" && char <= "\u005A") ||
    (char >= "\u005E" && char <= "\u007E")
  );
}

export function isPosDigit(char: string): boolean {
  return char >= "\u0031" && char <= "\u0039";
}

export function isHexDig(char: string): boolean {
  return (
    (char >= "0" && char <= "9") ||
    (char >= "a" && char <= "f") ||
    (char >= "A" && char <= "F")
  );
}

export function isAlpha(char: string): boolean {
  return (
    (char >= "\u0041" && char <= "\u005A") ||
    (char >= "\u0061" && char <= "\u007A")
  );
}

export function isFixedLenTimeUnit(char: string): boolean {
  return (
    char === "\u0064" ||
    char === "\u0068" ||
    char === "\u006D" ||
    char === "\u0073"
  );
}

export function isByteString(char: string): boolean {
  return (
    (char > "\u0001" && char < "\u0009") ||
    (char > "\u000B" && char < "\u000C") ||
    (char > "\u000E" && char < "\u00FF")
  );
}

export function isICEChar(char: string): boolean {
  return isAlpha(char) || isDigit(char) || char === "+" || char === "/";
}

export function isTLSIdChar(char: string): boolean {
  return (
    isDigit(char) ||
    isAlpha(char) ||
    char === "+" ||
    char === "/" ||
    char === "-" ||
    char === "_"
  );
}

export function isBase64Char(char: string): boolean {
  return isAlpha(char) || isDigit(char) || char === "+" || char === "/";
}
