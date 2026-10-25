import { createHash } from "node:crypto";
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { AVATAR_MAX_BASE64_LENGTH, AVATAR_MAX_BYTES, AVATAR_MAX_SIDE } from "../domain/avatar-values.js";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// Accept only simple text metadata. Other ancillary chunks can carry color,
// orientation or aspect-ratio semantics, or need their own complex parser.
// Text is validated as bytes and discarded, never logged or retained.
function isTextMetadata(type: string, data: Buffer): boolean {
  if (type !== "tEXt") return false;
  const separator = data.indexOf(0);
  if (separator < 1 || separator > 79 || data.indexOf(0, separator + 1) !== -1) return false;
  const keyword = data.subarray(0, separator);
  return keyword[0] !== 32 && keyword.at(-1) !== 32 && !keyword.includes(Buffer.from("  ")) &&
    keyword.every(byte => byte >= 32 && byte <= 126 || byte >= 161);
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length); out.write(type, 4, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, out.length - 4)), out.length - 4);
  return out;
}

/** Bounded PNG container/scanline validation, not a general image decoder.
 * Re-encode the validated filtered RGB/RGBA samples into one IDAT. Preserving
 * their filter bytes preserves pixels without a second pixel-transform parser. */
export function canonicalAvatarPng(value: string): { readonly pngBase64: string; readonly sourceSha256: string } | undefined {
  try {
    if (!value || value.length > AVATAR_MAX_BASE64_LENGTH || value.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return undefined;
    const source = Buffer.from(value, "base64");
    if (source.length > AVATAR_MAX_BYTES || source.toString("base64") !== value ||
        source.length < 57 || !source.subarray(0, 8).equals(signature)) return undefined;
    let offset = 8, header: Buffer | undefined, rawLength = 0, rowLength = 0;
    let dataStarted = false, dataEnded = false, ended = false;
    const compressedParts: Buffer[] = [];
    // The input cap bounds every chunk and at most floor((128 KiB - 8)/12)
    // iterations, including zero-length ancillary/IDAT chunks.
    while (offset < source.length) {
      if (source.length - offset < 12) return undefined;
      const length = source.readUInt32BE(offset), end = offset + 12 + length;
      if (end > source.length) return undefined;
      const type = source.toString("ascii", offset + 4, offset + 8);
      const typeBytes = source.subarray(offset + 4, offset + 8);
      if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type) || typeBytes.some(byte => byte > 127) ||
          crc32(source.subarray(offset + 4, end - 4)) !== source.readUInt32BE(end - 4)) return undefined;
      const data = source.subarray(offset + 8, end - 4);
      if (header === undefined) {
        if (type !== "IHDR" || length !== 13) return undefined;
        const width = data.readUInt32BE(0), height = data.readUInt32BE(4), color = data[9];
        if (width < 1 || width > AVATAR_MAX_SIDE || height !== width || data[8] !== 8 ||
            (color !== 2 && color !== 6) || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) return undefined;
        header = data;
        rowLength = width * (color === 2 ? 3 : 4) + 1;
        rawLength = height * rowLength;
      } else if (type === "IDAT") {
        if (dataEnded) return undefined;
        dataStarted = true; compressedParts.push(data);
      } else if (type === "IEND") {
        if (!dataStarted || length !== 0 || end !== source.length) return undefined;
        ended = true;
      } else {
        if (!isTextMetadata(type, data)) return undefined;
        if (dataStarted) dataEnded = true;
      }
      offset = end;
    }
    if (!header || !ended) return undefined;
    const compressed = Buffer.concat(compressedParts);
    if (compressed.length === 0) return undefined;
    const decoded = inflateSync(compressed, { maxOutputLength: rawLength, info: true }) as unknown as
      { buffer: Buffer; engine: { bytesWritten: number } };
    if (decoded.buffer.length !== rawLength || decoded.engine.bytesWritten !== compressed.length) return undefined;
    for (let at = 0; at < rawLength; at += rowLength) if (decoded.buffer[at]! > 4) return undefined;
    const canonical = Buffer.concat([signature, chunk("IHDR", header),
      chunk("IDAT", deflateSync(decoded.buffer, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
    if (canonical.length > AVATAR_MAX_BYTES) return undefined;
    return { pngBase64: canonical.toString("base64"), sourceSha256: createHash("sha256").update(source).digest("hex") };
  } catch { return undefined; }
}
