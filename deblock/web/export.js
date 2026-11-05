// Visual exports stay entirely in this browser. The PDF embeds lossless pixels
// from the same canvas as the PNG, so it cannot substitute fonts or reflow text.
(function (root) {
  'use strict';

  async function imagePdf(rgb, width, height, pageWidth, pageHeight) {
    if (!(rgb instanceof Uint8Array) || rgb.length !== width * height * 3 ||
        !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        !Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) {
      throw new Error('Invalid image dimensions.');
    }
    const compressed = new Uint8Array(await new Response(
      new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))
    ).arrayBuffer());
    const encode = (text) => new TextEncoder().encode(text);
    const chunks = [], offsets = [0];
    let length = 0;
    function append(bytes) { chunks.push(bytes); length += bytes.length; }
    function object(number, header, stream) {
      offsets[number] = length;
      append(encode(`${number} 0 obj\n${header}`));
      if (stream) {
        append(encode(`\nstream\n`)); append(stream); append(encode('\nendstream'));
      }
      append(encode('\nendobj\n'));
    }
    append(encode('%PDF-1.4\n'));
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    const w = pageWidth.toFixed(3), h = pageHeight.toFixed(3);
    object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Image 4 0 R >> >> /Contents 5 0 R >>`);
    object(4, `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>`, compressed);
    const drawing = encode(`q\n${w} 0 0 ${h} 0 0 cm\n/Image Do\nQ`);
    object(5, `<< /Length ${drawing.length} >>`, drawing);
    const xref = length;
    append(encode('xref\n0 6\n0000000000 65535 f \n'));
    for (const offset of offsets.slice(1)) append(encode(`${String(offset).padStart(10, '0')} 00000 n \n`));
    append(encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    return new Blob(chunks, { type: 'application/pdf' });
  }

  async function capture(dialog) {
    await document.fonts.ready;
    if (dialog.querySelector('[data-art-error]')) throw new Error('The artwork is unavailable. It cannot be omitted from this export.');
    await Promise.all([...dialog.querySelectorAll('img')].map(async image => {
      try { await image.decode(); }
      catch { throw new Error('The image could not load. Try again before exporting.'); }
    }));
    if (!dialog.open) throw new Error('Open your finished document first.');
    const bounds = dialog.getBoundingClientRect();
    const css = getComputedStyle(dialog);
    const scrollbar = Math.max(0, dialog.offsetWidth - dialog.clientWidth -
      parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth));
    const height = dialog.scrollHeight + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth);
    const scale = Math.min(2, 16000 / Math.max(bounds.width, height), Math.sqrt(24000000 / (bounds.width * height)));
    if (scale < 1) throw new Error('This document is too long for a visual export. Copy your writing to keep the full text.');
    return root.html2canvas(dialog, {
      backgroundColor: css.backgroundColor,
      scale, logging: false, removeContainer: true,
      ignoreElements: (element) => element.matches('script, canvas, .image-field, main, footer, #info-dialog, .close, .end-actions, [data-html2canvas-ignore]'),
      onclone: (doc) => {
        const copy = doc.getElementById(dialog.id);
        Object.assign(copy.style, {
          position: 'absolute', display: 'block', top: '0', left: '0', margin: '0',
          width: `${bounds.width}px`, maxWidth: 'none', height: 'auto',
          maxHeight: 'none', overflow: 'visible', transform: 'none',
          paddingRight: `${parseFloat(css.paddingRight) + scrollbar}px`,
        });
        copy.scrollTop = 0;
      },
    });
  }

  async function createExport(format, dialog) {
    const canvas = await capture(dialog);
    if (format === 'png') {
      return new Promise((resolve, reject) => canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('The image could not be created.')), 'image/png'
      ));
    }
    if (format !== 'pdf') throw new Error('Unknown export format.');
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const rgb = new Uint8Array(canvas.width * canvas.height * 3);
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      rgb[pixel * 3] = rgba[pixel * 4];
      rgb[pixel * 3 + 1] = rgba[pixel * 4 + 1];
      rgb[pixel * 3 + 2] = rgba[pixel * 4 + 2];
    }
    const width = dialog.getBoundingClientRect().width;
    return imagePdf(rgb, canvas.width, canvas.height, width * .75, width * .75 * canvas.height / canvas.width);
  }

  async function artworkPng(dialog) {
    const image = dialog.querySelector('.document-art img');
    if (!image || dialog.querySelector('[data-art-error]')) throw new Error('Choose an image before saving to Gallery.');
    try { await image.decode(); }
    catch { throw new Error('The artwork could not load. Try again before saving.'); }
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    if (!canvas.width || !canvas.height || canvas.width * canvas.height > 24000000) throw new Error('This image cannot be saved at its original size.');
    canvas.getContext('2d').drawImage(image, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('The image could not be created.')), 'image/png'
    ));
  }

  root.DeblockExport = { capture, createExport, imagePdf, artworkPng };
  if (typeof module !== 'undefined') module.exports = { imagePdf };
  if (typeof document === 'undefined') return;

  let busy = false;
  for (const button of document.querySelectorAll('[data-export], [data-save-gallery]')) {
    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      button.closest('.save-menu')?.removeAttribute('open');
      const dialog = button.closest('dialog');
      const status = dialog.querySelector('[data-export-status]');
      status.textContent = '';
      const galleryOnly = button.hasAttribute('data-save-gallery');
      const format = galleryOnly ? 'gallery' : button.dataset.export;
      try {
        const entry = root.DeblockShelf?.snapshotFor(dialog);
        // Resolve the piece's attached artwork even if its writing prompt was hidden.
        if (entry) await root.DeblockArt?.renderSaved(dialog.querySelector('.document-art'), entry.artwork);
        if (galleryOnly) {
          const artwork = await artworkPng(dialog);
          await root.DeblockShelf.saveImage(artwork, entry);
          status.textContent = 'Saved to Gallery.';
          return;
        }
        const blob = await createExport(format, dialog);
        let galleryError = null;
        if (format === 'png' && root.DeblockShelf) {
          try { await root.DeblockShelf.saveImage(entry.artwork ? await artworkPng(dialog) : blob, entry); }
          catch (error) { galleryError = error; }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deblock-document.${format}`;
        link.click();
        if (galleryError) status.textContent = `PNG downloaded, but Gallery could not save it. ${galleryError.message || 'Try again.'}`;
        else if (format === 'png' && root.DeblockShelf) status.textContent = 'Saved to Gallery and downloaded.';
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (error) {
        status.textContent = `Couldn’t save ${format.toUpperCase()}. ${error.message}`;
      } finally { busy = false; }
    });
  }
})(typeof window === 'undefined' ? globalThis : window);
