const videoElement = document.getElementById("preview");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

const scannerHints = new Map();
scannerHints.set(ZXing.DecodeHintType.TRY_HARDER, true);

const scannerOptions = {
  delayBetweenScanAttempts: 150,
  delayBetweenScanSuccess: 300,
  tryPlayVideoTimeout: 10000,
};

const codeReader = new ZXing.BrowserMultiFormatReader(
  scannerHints,
  scannerOptions,
);

let scanning = false;
let controls = null;
let lastText = "";

async function listVideoInputDevices() {
  if (typeof ZXing?.BrowserCodeReader?.listVideoInputDevices === "function") {
    return ZXing.BrowserCodeReader.listVideoInputDevices();
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new Error("Device enumeration is not supported in this browser.");
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

function buildVideoConstraints(deviceId) {
  const baseVideoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: { ideal: "environment" },
  };

  if (deviceId) {
    return {
      video: {
        ...baseVideoConstraints,
        deviceId: { exact: deviceId },
      },
    };
  }

  return {
    video: baseVideoConstraints,
  };
}

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

async function startScanner() {
  if (scanning) {
    return;
  }

  if (!window.isSecureContext) {
    setStatus("Camera access requires HTTPS or localhost.", "error");
    return;
  }

  try {
    setStatus("Requesting camera access...");

    const devices = await listVideoInputDevices().catch(() => []);
    const preferredDevice = devices.find((d) =>
      /back|rear|environment/i.test(d.label),
    )?.deviceId;
    const constraints = buildVideoConstraints(preferredDevice);

    scanning = true;
    setButtons(true);
    setStatus(
      preferredDevice
        ? "Rear camera active. Point at a barcode."
        : "Camera active. Point at a barcode.",
    );

    controls = await codeReader.decodeFromConstraints(
      constraints,
      videoElement,
      (result, error) => {
        if (result) {
          const text = result.getText();
          if (text && text !== lastText) {
            setOutput(text);
            setStatus(`Decoded (${result.getBarcodeFormat()})`, "success");
          }
        }

        if (error && !(error instanceof ZXing.NotFoundException)) {
          setStatus(
            `Scanner error: ${error.message || "Unknown error"}`,
            "error",
          );
        }
      },
    );
  } catch (error) {
    scanning = false;
    controls = null;
    setButtons(false);

    if (error && /permission|denied/i.test(error.message || "")) {
      setStatus(
        "Camera permission denied. Please allow camera access and try again.",
        "error",
      );
      return;
    }

    setStatus(
      `Failed to start scanner: ${error.message || "Unknown error"}`,
      "error",
    );
  }
}

function stopScanner() {
  if (!scanning) {
    return;
  }

  scanning = false;
  controls?.stop();
  controls = null;
  codeReader.reset();
  setButtons(false);
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
stopBtn.addEventListener("click", stopScanner);
copyBtn.addEventListener("click", copyOutput);

window.addEventListener("beforeunload", stopScanner);
