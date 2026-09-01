import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQRImport from "jsqr";
import { renderTicketQrCodePng } from "./render-ticket-qrcode.js";

// jsqr's CJS build and its .d.ts disagree on the default-export shape under
// NodeNext resolution; the runtime value is the callable function either way.
const jsQR = jsQRImport as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

function decode(png: Buffer): string | undefined {
  const image = PNG.sync.read(png);
  const result = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
  return result?.data;
}

describe("renderTicketQrCodePng", () => {
  it("produces a QR image that decodes back to exactly the given code", async () => {
    const code = "abc123XYZ_-9";
    const png = await renderTicketQrCodePng(code);
    expect(decode(png)).toBe(code);
  });

  it("produces distinct images for distinct codes", async () => {
    const a = await renderTicketQrCodePng("ticket-code-a");
    const b = await renderTicketQrCodePng("ticket-code-b");
    expect(a.equals(b)).toBe(false);
    expect(decode(a)).toBe("ticket-code-a");
    expect(decode(b)).toBe("ticket-code-b");
  });
});
