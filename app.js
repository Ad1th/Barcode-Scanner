const readerElementId = "reader";
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const code128ToggleBtn = document.getElementById("code128ToggleBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const resultDetailsEl = document.getElementById("resultDetails");

let scanner = null;

let scanning = false;
let lastText = "";
let lastPayload = "";
let code128OnlyMode = false;

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function setOutput(text, payload = null) {
  lastText = text;
  resultEl.textContent = text;
  lastPayload = payload ? JSON.stringify(payload, null, 2) : "";
  resultDetailsEl.textContent = lastPayload || "No scan metadata yet.";
  copyBtn.disabled = !text;
}

function setButtons(active) {
  startBtn.disabled = active;
  stopBtn.disabled = !active;
}

function toByteString(text) {
  if (!text) {
    return "";
  }

  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes)
    .map((value) => value.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

function toLocationArray(location) {
  if (!location) {
    return [];
  }

  const pointKeys = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
  return pointKeys
    .map((key) => location[key])
    .filter(
      (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y),
    )
    .map((point) => `${Math.round(point.x)}, ${Math.round(point.y)}`);
}

function buildScanPayload(decodedText, decodedResult) {
  const result = decodedResult?.result ?? decodedResult ?? {};
  const formatString =
    result?.format?.formatName ||
    decodedResult?.format?.formatName ||
    decodedResult?.formatName ||
    "UNKNOWN";

  const payload = {
    formatString,
    text: decodedText,
    bytes: toByteString(decodedText),
  };

  const location = toLocationArray(result.location);
  if (location.length) {
    payload.location = location;
  }

  if (Number.isFinite(result.confidence)) {
    payload.confidence = Math.round(result.confidence);
  }

  if (Number.isFinite(result.angle)) {
    payload.angle = result.angle;
  }

  if (Number.isFinite(result.moduleSize)) {
    payload.moduleSize = result.moduleSize;
  }

  return payload;
}

function getScannerConfig() {
  const formats = code128OnlyMode
    ? [Html5QrcodeSupportedFormats.CODE_128]
    : [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

  return {
    fps: 16,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const width = Math.floor(viewfinderWidth * 0.9);
      const height = Math.floor(viewfinderHeight * 0.34);
      return { width, height };
    },
    aspectRatio: 1.3333,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
    formatsToSupport: formats,
  };
}

function onDecodeSuccess(decodedText, decodedResult) {
  if (!decodedText || decodedText === lastText) {
    return;
  }

  const payload = buildScanPayload(decodedText, decodedResult);
  setOutput(decodedText, payload);
  const formatName = payload.formatString;
  setStatus(formatName ? `Decoded (${formatName})` : "Decoded", "success");
}

async function startScanner() {
  if (scanning) {
    return;
  }

  if (!window.isSecureContext) {
    setStatus("Camera access requires HTTPS or localhost.", "error");
    return;
  }

  if (typeof Html5Qrcode !== "function") {
    setStatus(
      "Scanner library failed to load. Refresh and try again.",
      "error",
    );
    return;
  }

  try {
    setStatus("Requesting camera access...");

    scanner = new Html5Qrcode(readerElementId, {
      verbose: false,
    });

    const cameraConfig = {
      facingMode: { exact: "environment" },
    };

    scanning = true;
    setButtons(true);
    setStatus("Rear camera active. Point at a barcode.");

    await scanner.start(
      cameraConfig,
      getScannerConfig(),
      onDecodeSuccess,
      () => {},
    );
  } catch (error) {
    try {
      // Fallback for devices that reject exact facingMode constraints.
      if (scanner) {
        await scanner.start(
          { facingMode: "environment" },
          getScannerConfig(),
          onDecodeSuccess,
          () => {},
        );
        scanning = true;
        setButtons(true);
        setStatus("Camera active. Point at a barcode.");
        return;
      }
    } catch (fallbackError) {
      error = fallbackError;
    }

    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // no-op
      }
      scanner.clear();
      scanner = null;
    }

    scanning = false;
    setButtons(false);

    if (/permission|denied|notallowed/i.test(error?.message || "")) {
      setStatus(
        "Camera permission denied. Please allow camera access and try again.",
        "error",
      );
      return;
    }

    setStatus(
      `Failed to start scanner: ${error?.message || "Unknown error"}`,
      "error",
    );
  }
}

async function stopScanner() {
  if (!scanning || !scanner) {
    return;
  }

  try {
    await scanner.stop();
    scanner.clear();
  } catch (error) {
    setStatus(
      `Failed to stop scanner: ${error?.message || "Unknown error"}`,
      "error",
    );
    return;
  } finally {
    scanner = null;
    scanning = false;
    setButtons(false);
  }

  setStatus("Scanner stopped.");
}

async function copyOutput() {
  if (!lastText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastPayload || lastText);
    setStatus(
      lastPayload
        ? "Decoded details copied to clipboard."
        : "Output copied to clipboard.",
      "success",
    );
  } catch {
    setStatus(
      "Could not copy output. Clipboard may be blocked in this browser.",
      "error",
    );
  }
}

function toggleCode128Mode() {
  code128OnlyMode = !code128OnlyMode;
  code128ToggleBtn.textContent = `CODE_128 Only: ${code128OnlyMode ? "ON" : "OFF"}`;
  code128ToggleBtn.classList.toggle("active", code128OnlyMode);
  setStatus(
    code128OnlyMode ? "CODE_128 mode enabled." : "All formats enabled.",
    code128OnlyMode ? "success" : "",
  );
}

startBtn.addEventListener("click", startScanner);
stopBtn.addEventListener("click", () => {
  void stopScanner();
});
copyBtn.addEventListener("click", copyOutput);
code128ToggleBtn.addEventListener("click", toggleCode128Mode);

window.addEventListener("beforeunload", () => {
  void stopScanner();
});
