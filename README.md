# Barcode Scanner Website

A mobile-friendly barcode scanner website that uses the device camera and outputs decoded text.

## Features

- Live scanning using mobile camera
- Prefers rear camera when available
- Supports multiple barcode formats through ZXing
- Decoded text output panel
- Copy-to-clipboard button
- Graceful status/error handling

## Run

Use any local static server. Example with Python:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` on your phone browser (same network) or desktop.

## Important

Camera access only works on:

- `https://` origins, or
- `http://localhost`
