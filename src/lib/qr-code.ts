/**
 * ISO/IEC 18004 Standard Compliant QR Code Generator
 * Generates official high-contrast QR Codes readable by all iOS and Android smartphone cameras.
 */
import QRCode from "qrcode";

export async function generateQrDataUrl(text: string, size = 260): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#09090b",
      light: "#ffffff",
    },
  });
}

export async function generateQrSvg(text: string, size = 260): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#09090b",
      light: "#ffffff",
    },
  });
}
