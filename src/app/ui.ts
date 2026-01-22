import { escapeHtml, formatBytes, downloadBlob } from './utils';
import type { Item } from './types';

/**
 * Create name cell with thumbnail and filename
 * @param item - The item
 * @returns Table cell
 */
function createNameCell(item: Item): HTMLTableCellElement {
  const td = document.createElement('td');

  // Escape user-controlled filename
  const safeName = escapeHtml(item.name);
  const safePreviewUrl = item.previewUrl ? escapeHtml(item.previewUrl) : '';
  const thumbnailHtml = item.previewUrl
    ? `<img class="thumb-img img-thumbnail" src="${safePreviewUrl}" alt="${safeName}" loading="lazy">`
    : '';

  td.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      ${thumbnailHtml}
      <span class="overflow-x-hidden" style="text-overflow:ellipsis">${safeName}</span>
    </div>
  `;

  return td;
}

/**
 * Create input info cell
 * @param item - The item
 * @returns Table cell
 */
function createInputCell(item: Item): HTMLTableCellElement {
  const td = document.createElement('td');
  const dimensions = item.width && item.height ? `${item.width}x${item.height}` : '...';
  const safeDimensions = escapeHtml(dimensions);
  const safeSize = escapeHtml(formatBytes(item.size));
  const safeStatus = escapeHtml(item.status);
  // Escape user-controlled error message
  const errorMessage = item.error ? ` (${escapeHtml(item.error)})` : '';

  td.innerHTML = `
    <div><code>${escapeHtml(item.type || 'image/*')}</code></div>
    <div class="text-secondary"><small>${safeDimensions} - ${safeSize}</small></div>
    <div class="text-secondary"><small>status: ${safeStatus}${errorMessage}</small></div>
  `;

  return td;
}

/**
 * Create output info cell
 * @param item - The item
 * @returns Table cell
 */
function createOutputCell(item: Item): HTMLTableCellElement {
  const td = document.createElement('td');

  if (item.output) {
    const dimensions = item.output.width && item.output.height
      ? `${item.output.width}x${item.output.height}`
      : '...';
    const safeDimensions = escapeHtml(dimensions);
    const safeSize = escapeHtml(formatBytes(item.output.size));
    // Escape user-controlled output filename
    td.innerHTML = `
      <div><code>${escapeHtml(item.output.type)}</code></div>
      <div class="text-secondary"><small>${safeDimensions} - ${safeSize}</small></div>
      <div class="text-secondary"><small>${escapeHtml(item.output.name)}</small></div>
    `;
  } else {
    td.innerHTML = '<span class="text-muted">-</span>';
  }

  return td;
}

/**
 * Create actions cell with buttons
 * @param item - The item
 * @param onConvert - Convert callback
 * @param onRemove - Remove callback
 * @returns Table cell
 */
function createActionsCell(
  item: Item,
  onConvert: (id: string) => void | Promise<void>,
  onRemove: (id: string) => void,
): HTMLTableCellElement {
  const td = document.createElement('td');

  const wrapper = document.createElement('div');
  wrapper.className = 'd-flex flex-wrap gap-2';

  const btnConvert = document.createElement('button');
  btnConvert.type = 'button';
  btnConvert.innerHTML = '🔄 <span class="d-none d-xl-inline">Convert</span>';
  btnConvert.className = 'btn btn-sm btn-outline-primary';
  btnConvert.disabled = item.status === 'converting';
  btnConvert.onclick = () => onConvert(item.id);

  const btnDl = document.createElement('button');
  btnDl.type = 'button';
  btnDl.innerHTML = '⬇️ <span class="d-none d-xl-inline">Download</span>';
  btnDl.className = 'btn btn-sm btn-outline-success';
  btnDl.disabled = !item.output;
  btnDl.onclick = () => {
    if (item.output) {
      downloadBlob(item.output.blob, item.output.name);
    }
  };

  const btnRm = document.createElement('button');
  btnRm.type = 'button';
  btnRm.innerHTML = '🗑️ <span class="d-none d-xl-inline">Remove</span>';
  btnRm.className = 'btn btn-sm btn-outline-danger';
  btnRm.disabled = item.status === 'converting';
  btnRm.onclick = () => { onRemove(item.id) };

  wrapper.append(btnConvert, btnDl, btnRm);
  td.appendChild(wrapper);
  return td;
}

/**
 * Create a table row for an item
 * @param item - The item to create a row for
 * @param onConvert - Convert callback
 * @param onRemove - Remove callback
 * @returns Table row element
 */
export function createItemRow(
  item: Item,
  onConvert: (id: string) => void | Promise<void>,
  onRemove: (id: string) => void,
): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.append(
    createNameCell(item),
    createInputCell(item),
    createOutputCell(item),
    createActionsCell(item, onConvert, onRemove),
  );
  return tr;
}
