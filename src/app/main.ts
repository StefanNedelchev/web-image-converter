import { QUALITY_MIMES, supports } from './constants';
import { clamp, escapeHtml } from './utils';
import { makeCanvas, decodeImage, detectExportFormats } from './canvas';
import { convertImage } from './conversion';
import { createItemRow } from './ui';
import type { ConversionOptions, Item } from './types';
import { Workbox } from 'workbox-window';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const getEl = <T extends HTMLElement>(sel: string): T => {
  const element = document.querySelector<T>(sel);
  if (!element) {
    throw new Error(`Missing element: ${sel}`);
  }
  return element;
};

// DOM element references
const fileInput = getEl<HTMLInputElement>('#fileInput');
const formatSel = getEl<HTMLSelectElement>('#formatSel');
const qualityInp = getEl<HTMLInputElement>('#quality');
const qualityVal = getEl<HTMLDivElement>('#qualityVal');
const sizeModeNoneRadio = getEl<HTMLInputElement>('#sizeModeNone');
const sizeModePixelsRadio = getEl<HTMLInputElement>('#sizeModePixels');
const sizeModeScaleRadio = getEl<HTMLInputElement>('#sizeModeScale');
const outWInp = getEl<HTMLInputElement>('#outW');
const outHInp = getEl<HTMLInputElement>('#outH');
const scalePctInp = getEl<HTMLInputElement>('#scalePct');
const lockAspectInp = getEl<HTMLInputElement>('#lockAspect');
const fitSel = getEl<HTMLSelectElement>('#fit');
const bgInp = getEl<HTMLInputElement>('#bg');
const smoothingInp = getEl<HTMLInputElement>('#smoothing');
const smoothingQualitySel = getEl<HTMLSelectElement>('#smoothingQuality');
const bmpResizeQualitySel = getEl<HTMLSelectElement>('#bmpResizeQuality');

const convertAllBtn = getEl<HTMLButtonElement>('#convertAll');
const clearBtn = getEl<HTMLButtonElement>('#clear');

const listTbody = getEl<HTMLTableSectionElement>('#list');
const fileCount = getEl<HTMLSpanElement>('#fileCount');
const capsLine = getEl<HTMLDivElement>('#caps');
const prog = getEl<HTMLProgressElement>('#prog');
const statusEl = getEl<HTMLDivElement>('#status');

const items = new Map<string, Item>();

let aspectRatio: number | null = null;

/**
 * Read current option values from form controls
 */
function readOptions(): ConversionOptions {
  const type = formatSel.value;
  const quality = clamp(Number(qualityInp.value), 0, 1);

  // Width/height behavior:
  // - both provided: use exact box (contain/cover/stretch can matter)
  // - only width: compute height preserving aspect
  // - only height: compute width preserving aspect
  const sizeMode = sizeModeNoneRadio.checked
    ? 'none'
    : sizeModePixelsRadio.checked
      ? 'pixels'
      : 'scale';
  const width
    = sizeMode === 'pixels' && outWInp.value
      ? Math.max(1, Math.floor(Number(outWInp.value)))
      : 0;
  const height
    = sizeMode === 'pixels' && outHInp.value
      ? Math.max(1, Math.floor(Number(outHInp.value)))
      : 0;
  const scalePercent
    = sizeMode === 'scale' && scalePctInp.value
      ? clamp(Number(scalePctInp.value), 1, 1000)
      : 100;

  return {
    type,
    quality,
    sizeMode,
    w: width,
    h: height,
    scalePct: scalePercent,
    fit: fitSel.value as ConversionOptions['fit'],
    bg: (bgInp.value || '#ffffff').trim(),
    smoothing: smoothingInp.checked,
    smoothingQuality: smoothingQualitySel.value as ConversionOptions['smoothingQuality'],
    bmpResizeQuality: bmpResizeQualitySel.value as ConversionOptions['bmpResizeQuality'],
  };
}

/**
 * Update button enabled/disabled state based on items
 */
function setButtonsEnabled(): void {
  const has = items.size > 0;
  convertAllBtn.disabled = !has;
  clearBtn.disabled = !has;
}

/**
 * Render the file list table and update UI state
 */
function render(): void {
  // Update file count badge
  if (items.size) {
    fileCount.textContent = `${items.size} selected`;
    fileCount.classList.remove('d-none');
  } else {
    fileCount.textContent = '';
    fileCount.classList.add('d-none');
  }
  setButtonsEnabled();

  // Render table rows
  listTbody.innerHTML = '';
  for (const item of items.values()) {
    listTbody.appendChild(createItemRow(item, convertOne, removeItem));
  }
}

/**
 * Convert a single image item
 * @param id - Item ID to convert
 */
async function convertOne(id: string, optionsOverride?: ConversionOptions): Promise<void> {
  const item = items.get(id);
  if (!item || item.status === 'converting') {
    return;
  }

  item.status = 'converting';
  item.error = undefined;
  render();

  const options = optionsOverride ?? readOptions();
  await convertImage(item, options);
  render();
}

/**
 * Remove an item from the list
 * @param id - Item ID to remove
 */
function removeItem(id: string): void {
  const item = items.get(id);
  if (!item) {
    return;
  }

  if (item.previewUrl) {
    URL.revokeObjectURL(item.previewUrl);
  }
  items.delete(id);
  render();
}

/**
 * Convert all items with controlled concurrency
 */
async function convertAll(): Promise<void> {
  const list = [...items.values()];
  if (!list.length) {
    return;
  }

  prog.value = 0;
  statusEl.textContent = `Converting ${list.length} file(s)...`;

  // Small concurrency limit keeps UI responsive for big batches.
  const concurrency = clamp(
    (navigator.hardwareConcurrency || 4) - 1,
    1,
    6,
  );
  const options = readOptions();
  let index = 0;
  let done = 0;

  const runners = Array.from(
    {
      length: concurrency,
    },
    async () => {
      while (index < list.length) {
        const item = list[index];
        index += 1;
        if (!item) {
          return;
        }
        await convertOne(item.id, options);
        done++;
        prog.value = done / list.length;
        statusEl.textContent = `Converted ${done}/${list.length}`;
      }
    },
  );

  await Promise.all(runners);
  statusEl.textContent = `Done. Converted ${done}/${list.length}.`;
}

/**
 * Synchronize size input field states based on size mode selection
 */
function syncSizeInputs(): void {
  const isScale = sizeModeScaleRadio.checked;
  const isPixels = sizeModePixelsRadio.checked;

  outWInp.disabled = !isPixels;
  outHInp.disabled = !isPixels;
  scalePctInp.disabled = !isScale;
  lockAspectInp.disabled = !isPixels;
}

/**
 * Update aspect ratio from current width/height values
 */
function updateAspectRatio(): void {
  const width = Number(outWInp.value);
  const height = Number(outHInp.value);
  if (width > 0 && height > 0) {
    aspectRatio = width / height;
  }
}

/**
 * Calculate height from width based on locked aspect ratio
 */
function syncHeightFromWidth(): void {
  if (!lockAspectInp.checked || !aspectRatio || sizeModeScaleRadio.checked) {
    return;
  }
  const width = Number(outWInp.value);
  if (width > 0) {
    outHInp.value = Math.round(width / aspectRatio).toString();
  }
}

/**
 * Calculate width from height based on locked aspect ratio
 */
function syncWidthFromHeight(): void {
  if (!lockAspectInp.checked || !aspectRatio || sizeModeScaleRadio.checked) {
    return;
  }
  const height = Number(outHInp.value);
  if (height > 0) {
    outWInp.value = Math.round(height * aspectRatio).toString();
  }
}

/**
 * Handle file input change event
 * @param - Image file to add
 */
function addFile(file: File): void {
  const id = globalThis.crypto.randomUUID();
  const item: Item = {
    id,
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    previewUrl: URL.createObjectURL(file),
    status: 'ready',
  };
  items.set(id, item);

  // Populate dimensions asynchronously
  decodeImage(file)
    .then((decoded) => {
      item.width = decoded.width;
      item.height = decoded.height;
      if (decoded.kind === 'bitmap') decoded.bmp.close();

      // Set initial aspect ratio from first image if not already set
      if (aspectRatio === null && decoded.width > 0 && decoded.height > 0) {
        aspectRatio = decoded.width / decoded.height;
        // Update width/height inputs if empty
        if (!outWInp.value && !outHInp.value && sizeModePixelsRadio.checked) {
          outWInp.value = decoded.width.toString();
          outHInp.value = decoded.height.toString();
        }
      }

      render();
    })
    .catch(() => {
      /* ignore decode errors for dimension extraction */
    });
}

/**
 * Initialize the application: detect formats and configure UI
 */
async function init(): Promise<void> {
  const supported = await detectExportFormats();

  // Populate format selector with supported MIME types
  formatSel.innerHTML = supported
    .map(
      (mime) =>
        `<option value="${escapeHtml(mime)}">${escapeHtml(mime)}</option>`,
    )
    .join('');

  // Set default format (prefer modern formats)
  const preferredFormats = [
    'image/avif',
    'image/webp',
    'image/png',
    'image/jpeg',
  ];
  const defaultFormat
    = preferredFormats.find((m) => supported.includes(m)) ?? supported[0];

  if (defaultFormat) {
    formatSel.value = defaultFormat;
    qualityInp.disabled = !QUALITY_MIMES.has(defaultFormat);
    bgInp.disabled = defaultFormat !== 'image/jpeg';
  }

  // Check for smoothing quality support
  const testCanvas = makeCanvas(1, 1);
  const ctx = testCanvas.getContext('2d');
  const smoothingQualitySupported = !!(ctx && 'imageSmoothingQuality' in ctx);
  smoothingQualitySel.disabled = !smoothingQualitySupported;
  if (!smoothingQualitySupported) {
    smoothingQualitySel.value = 'high';
  }

  // Check for bitmap resize support
  bmpResizeQualitySel.disabled = !supports.createImageBitmap;
  if (!supports.createImageBitmap) {
    bmpResizeQualitySel.value = 'off';
  }

  syncSizeInputs();

  // Display capabilities
  const mimeList = supported.length
    ? supported
        .map((mimeType) => `<code>${escapeHtml(mimeType)}</code>`)
        .join(', ')
    : 'none';
  const decoder = supports.createImageBitmap
    ? 'createImageBitmap'
    : 'HTMLImageElement';
  const encoder = supports.offscreenCanvas
    ? 'OffscreenCanvas'
    : 'HTMLCanvasElement';

  capsLine.innerHTML = `
    <strong>Export supported:</strong> ${mimeList}.
    <span class="text-secondary"><small>Decode: ${escapeHtml(decoder)}  -  Encode: ${escapeHtml(encoder)}</small></span>
  `;
}

// ----- Event listeners -----
qualityInp.addEventListener('input', () => {
  qualityVal.textContent = Number(qualityInp.value).toFixed(2);
});

formatSel.addEventListener('change', () => {
  const enabled = QUALITY_MIMES.has(formatSel.value);
  qualityInp.disabled = !enabled;
  qualityVal.style.opacity = enabled ? '1' : '0.6';

  // Enable background color only for JPEG
  const isJpeg = formatSel.value === 'image/jpeg';
  bgInp.disabled = !isJpeg;
});

sizeModeNoneRadio.addEventListener('change', syncSizeInputs);
sizeModePixelsRadio.addEventListener('change', syncSizeInputs);
sizeModeScaleRadio.addEventListener('change', syncSizeInputs);

outWInp.addEventListener('input', () => {
  syncHeightFromWidth();
});

outHInp.addEventListener('input', () => {
  syncWidthFromHeight();
});

lockAspectInp.addEventListener('change', () => {
  if (lockAspectInp.checked) {
    // Update aspect ratio when locking, only if both values are present
    updateAspectRatio();
  }
});

// Update aspect ratio when user finishes editing (blur event)
outWInp.addEventListener('blur', () => {
  if (!lockAspectInp.checked) {
    updateAspectRatio();
  }
});

outHInp.addEventListener('blur', () => {
  if (!lockAspectInp.checked) {
    updateAspectRatio();
  }
});

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files ?? []).filter((f) =>
    f.type.startsWith('image/'),
  );
  files.forEach(addFile);
  fileInput.value = '';
  render();
});

convertAllBtn.addEventListener('click', () => void convertAll());

clearBtn.addEventListener('click', () => {
  for (const item of items.values()) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
  items.clear();
  prog.value = 0;
  statusEl.textContent = '';
  render();
});

/**
 * Handle input files via the File Handling API
 */
function handleInputFiles(): void {
  interface LaunchQueueFile { getFile: () => Promise<File> }
  interface LaunchQueueParams { files: LaunchQueueFile[] }
  interface LaunchQueue { setConsumer: (consumer: (params: LaunchQueueParams) => void) => void }

  const launchQueue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  if (!launchQueue) {
    return;
  }

  launchQueue.setConsumer((launchParams) => {
    if (!launchParams.files.length) {
      return;
    }

    launchParams.files.forEach((fileHandle) => {
      void fileHandle.getFile().then((file) => {
        if (file.type.startsWith('image/')) {
          addFile(file);
        }
      });
    });
  });
}

// Initialize application
init()
  .then(() => { handleInputFiles() })
  .catch((error: unknown) => {
    capsLine.textContent = `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`;
  });

render();

// Register service worker
if ('serviceWorker' in navigator) {
  const wb = new Workbox('/service-worker.js');

  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      console.log('Service worker updated, please reload.');
    } else {
      console.log('Service worker installed for the first time.');
    }
  });

  wb.register()
    .catch((error: unknown) => {
      console.error('Service worker registration failed:', error);
    });
}
