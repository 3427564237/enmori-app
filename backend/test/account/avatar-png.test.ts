import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import { canonicalAvatarPng } from "../../src/account/infrastructure/avatar-png.js";
import { AVATAR_MAX_BYTES } from "../../src/account/domain/avatar-values.js";
import { png, pngChunk, pngSignature, chunks } from "./avatar-fixtures.js";

const canonical = (bytes: Buffer) => canonicalAvatarPng(bytes.toString("base64"));
test("RGB/RGBA pixels and all five filters survive bounded re-encoding; source metadata is stripped", () => {
  for (const color of [2, 6]) {
    const width = 5, row = width * (color === 2 ? 3 : 4) + 1;
    const raw = Buffer.alloc(width * row, 31);
    for (let n = 0; n < width; n++) raw[n * row] = n;
    const source = png({ color, width, raw, split: true,
      before: [pngChunk("tEXt", Buffer.from("Comment\0PRIVATE_SYNTHETIC_METADATA"))] });
    const result = canonical(source); assert.ok(result);
    const output = Buffer.from(result.pngBase64, "base64"), parsed = chunks(output);
    assert.deepEqual(parsed.map(part => part.type), ["IHDR", "IDAT", "IEND"]);
    assert.deepEqual(inflateSync(parsed[1]!.data), raw);
    assert.equal(result.sourceSha256, createHash("sha256").update(source).digest("hex"));
    assert.notEqual(result.sourceSha256, createHash("sha256").update(output).digest("hex"));
    assert.equal(output.includes(Buffer.from("PRIVATE_SYNTHETIC_METADATA")), false);
    assert.equal(canonical(output)?.pngBase64, result.pngBase64);
  }
  assert.ok(canonical(png({ width: 1 })));
  assert.ok(canonical(png({ width: 256 })));
});

test("strict canonical base64 and the decoded byte cap reject oversized or ambiguous representations", () => {
  const value = png().toString("base64");
  for (const bad of ["", " " + value, value + "\n", value + "=", value.slice(0, -1), "data:image/png;base64," + value,
    "____", "AB==", Buffer.alloc(AVATAR_MAX_BYTES + 1).toString("base64")]) assert.equal(canonicalAvatarPng(bad), undefined);
  const over = png({ before: [pngChunk("tEXt", Buffer.alloc(AVATAR_MAX_BYTES))] });
  assert.equal(canonical(over), undefined);
});

test("only the approved square dimensions, bit depth, colors and methods are accepted", () => {
  for (const options of [{ width: 0 }, { width: 257 }, { width: 2, height: 1 }, { depth: 16 },
    { color: 0 }, { color: 3 }, { color: 4 }, { compression: 1 }, { filterMethod: 1 }, { interlace: 1 }]) {
    assert.equal(canonical(png(options)), undefined, JSON.stringify(options));
  }
});

test("checksums, required chunk order, chunk lengths and exact IEND termination are enforced", () => {
  const good = png(), parsed = chunks(good), header = pngChunk("IHDR", parsed[0]!.data), idat = pngChunk("IDAT", parsed[1]!.data);
  const pack = (...parts: Buffer[]) => Buffer.concat([pngSignature, ...parts]);
  const corrupt = Buffer.from(good); corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1;
  const huge = Buffer.from(good); huge.writeUInt32BE(0xffff_ffff, 8);
  const invalidType = png({ before: [pngChunk("texT")] });
  for (const bad of [corrupt, huge, invalidType, Buffer.from("not a PNG"), good.subarray(0, -1), good.subarray(0, -12),
    Buffer.concat([good, Buffer.from([0])]), Buffer.concat([good, pngChunk("IEND")]), pack(idat, header, pngChunk("IEND")),
    pack(header, header, idat, pngChunk("IEND")), pack(header, pngChunk("IEND")),
    pack(header, idat, pngChunk("IEND", Buffer.from([0]))),
    pack(header, pngChunk("IDAT", parsed[1]!.data.subarray(0, 2)), pngChunk("tEXt", Buffer.from("a\0b")),
      pngChunk("IDAT", parsed[1]!.data.subarray(2)), pngChunk("IEND"))]) assert.equal(canonical(bad), undefined);
});

test("palette, transparency, animation, unknown critical and unsupported color metadata cannot be silently stripped", () => {
  for (const type of ["PLTE", "tRNS", "acTL", "fcTL", "fdAT", "ABCD", "gAMA", "sRGB", "iCCP", "sBIT", "cHRM", "eXIf", "pHYs"]) {
    assert.equal(canonical(png({ before: [pngChunk(type, Buffer.alloc(8))] })), undefined, type);
  }
  for (const invalid of ["missing separator", "\0empty keyword", " spaced \0text", "a  b\0text", "a\0text\0tail", "a".repeat(80) + "\0text"]) {
    assert.equal(canonical(png({ before: [pngChunk("tEXt", Buffer.from(invalid))] })), undefined);
  }
});

test("decompression size, every filter byte, complete zlib consumption and checksum are bounded", () => {
  const validRaw = Buffer.alloc(18), validCompressed = deflateSync(validRaw);
  const badFilter = Buffer.from(validRaw); badFilter[9] = 5;
  const damagedStream = Buffer.from(validCompressed); damagedStream[damagedStream.length - 1] = damagedStream[damagedStream.length - 1]! ^ 1;
  for (const options of [{ raw: Buffer.alloc(17) }, { raw: Buffer.alloc(19) }, { raw: Buffer.alloc(1024 * 1024) },
    { raw: badFilter }, { compressed: Buffer.alloc(0) }, { compressed: Buffer.from("invalid zlib") },
    { compressed: damagedStream }, { compressed: validCompressed.subarray(0, -1) },
    { compressed: Buffer.concat([validCompressed, Buffer.from([0])]) },
    { compressed: Buffer.concat([validCompressed, validCompressed]) }]) assert.equal(canonical(png(options)), undefined);
});
