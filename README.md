# Barcode Scanner Website

A mobile-friendly barcode scanner optimized for **CODE_128** detection using the device camera. Outputs decoded text with structured metadata.

## Features

- Live scanning using mobile camera with focus on CODE_128 barcodes
- Supports multiple formats: EAN-13, EAN-8, UPC-A, UPC-E, CODE_128, CODE_39, ITF, QR codes
- **Format lock button** to toggle CODE_128-only mode for improved reliability
- Rear camera preference with automatic fallback
- Structured decoded output including format, bytes, location, and confidence
- Copy-to-clipboard button for full decode metadata
- Graceful status/error handling
- Real-time metadata display (format, hex bytes, angle, module size)

## Getting Started

Use any local static server. Example with Python:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` on your phone browser (same network) or desktop.

### Usage

1. Tap **Start Scan** to activate the camera
2. Point at a barcode (CODE_128 recommended)
3. Hold steady inside the scan frame for 1–2 seconds
4. (Optional) Click **CODE_128 Only: OFF** to toggle format-lock mode for CODE_128-exclusive detection
5. Decoded text + metadata will appear in the result panel
6. Click **Copy Output** to copy the full JSON payload

## Supported Formats

| Format   | Status      |
| -------- | ----------- |
| CODE_128 | ✓ Optimized |
| EAN-13   | ✓ Supported |
| EAN-8    | ✓ Supported |
| UPC-A    | ✓ Supported |
| UPC-E    | ✓ Supported |
| CODE_39  | ✓ Supported |
| ITF      | ✓ Supported |
| QR Code  | ✓ Supported |

## Technology

- **Scanner Engine**: html5-qrcode
- **Camera API**: MediaDevices
- **Output Format**: JSON-structured metadata (text, hex bytes, format, location, confidence)

## Important

Camera access only works on:

- `https://` origins, or
- `http://localhost`
