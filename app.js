const readerElementId = "reader";
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

let scanner = null;

let scanning = false;
let lastText = "";

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function setOutput(text) {
  lastText = text;
  resultEl.textContent = text;
  copyBtn.disabled = !text;
}

function setButtons(active) {
  startBtn.disabled = active;
  stopBtn.disabled = !active;
}

function getScannerConfig() {
  return {
    fps: 12,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const size = Math.floor(minEdge * 0.75);
      return { width: size, height: Math.floor(size * 0.55) };
    },
    aspectRatio: 1.3333,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE,
    ],
  };
}

function onDecodeSuccess(decodedText, decodedResult) {
  if (!decodedText || decodedText === lastText) {
    return;
  }

  setOutput(decodedText);
  const formatName = decodedResult?.result?.format?.formatName;
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
    await navigator.clipboard.writeText(lastText);
    setStatus("Output copied to clipboard.", "success");
  } catch {
    setStatus(
      "Could not copy output. Clipboard may be blocked in this browser.",
      "error",
    );
  }
}

startBtn.addEventListener("click", startScanner);
stopBtn.addEventListener("click", () => {
  void stopScanner();
});
copyBtn.addEventListener("click", copyOutput);

window.addEventListener("beforeunload", () => {
  void stopScanner();
});
