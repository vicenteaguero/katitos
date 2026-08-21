import { describe, expect, it } from 'vitest';
import {
  PdfDoc,
  drawImage,
  drawImageClipped,
  fillRect,
  num,
  readJpegSize,
} from './pdf-writer';

/** A 1×1 JPEG, so the tests exercise real bytes rather than a stand-in. */
const TINY_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00,
  0x07, 0x00, 0x0b, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  0xff, 0xd9,
]);

const text = (doc: PdfDoc) =>
  new TextDecoder('latin1').decode(doc.buildBytes());

describe('readJpegSize', () => {
  it('reads the size out of the JPEG header without decoding it', () => {
    expect(readJpegSize(TINY_JPEG)).toMatchObject({ width: 11, height: 7 });
  });

  it('says so when the bytes are not a JPEG at all', () => {
    expect(readJpegSize(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('does not run off the end of a truncated file', () => {
    expect(readJpegSize(TINY_JPEG.slice(0, 6))).toBeNull();
  });

  it('steps over the padding a real encoder leaves between segments', () => {
    // 0xFF is legal fill before a marker. Reading it as a segment header
    // walked into the image data and gave up — and a photo whose size can't
    // be read is a photo the export silently leaves out of the album.
    const padded = Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xff,
      0xff,
      ...TINY_JPEG.slice(2),
    ]);
    expect(readJpegSize(padded)).toMatchObject({ width: 11, height: 7 });
  });

  it('reports how many channels the photo has', () => {
    // Three for colour; one for a black-and-white photo, which must NOT be
    // declared RGB or it prints as noise.
    expect(readJpegSize(TINY_JPEG)?.components).toBe(3);
    const grey = Uint8Array.from(TINY_JPEG);
    grey[grey.indexOf(0xc0) + 8] = 1; // components byte of the SOF0 segment
    expect(readJpegSize(grey)?.components).toBe(1);
  });

  it('declares the right colour space for a grey photo', () => {
    const doc = new PdfDoc(594, 792);
    doc.addJpeg(TINY_JPEG, 11, 7, 1);
    doc.addPage('', []);
    expect(text(doc)).toContain('/ColorSpace /DeviceGray');
  });
});

describe('num', () => {
  it('never emits scientific notation — no PDF reader accepts it', () => {
    expect(num(0.000000012)).toBe('0.0000');
    expect(num(1234.56789)).toBe('1234.5679');
  });
});

describe('content stream operators', () => {
  it('wraps a draw in its own graphics state', () => {
    const op = drawImage('Im0', [100, 0, 0, 50, 10, 20]);
    expect(op.startsWith('q ')).toBe(true);
    expect(op.trim().endsWith('Q')).toBe(true);
    expect(op).toContain('/Im0 Do');
  });

  it('paints a rectangle in the colour it was given', () => {
    expect(fillRect(0, 0, 1, 1, [1, 0, 0.5])).toContain(
      '1.0000 0.0000 0.5000 rg'
    );
  });
});

describe('PdfDoc', () => {
  it('writes a file a reader would accept', async () => {
    const doc = new PdfDoc(594, 792);
    const ref = doc.addJpeg(TINY_JPEG, 11, 7);
    doc.addPage(drawImage('Im0', [100, 0, 0, 100, 10, 10]), [
      { name: 'Im0', ref },
    ]);
    const out = text(doc);

    expect(out.startsWith('%PDF-1.4')).toBe(true);
    expect(out).toContain('/Type /Catalog');
    expect(out).toContain('/Type /Pages');
    expect(out).toContain('/MediaBox [0 0 594 792]');
    expect(out).toContain('/Filter /DCTDecode');
    expect(out.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('marks itself binary with RAW high bytes, not UTF-8 versions of them', () => {
    const doc = new PdfDoc(594, 792);
    doc.addPage('', []);
    const bytes = doc.buildBytes();
    // The comment on line two is how a PDF tells every tool downstream not to
    // treat it as text. Building it from a JS string through TextEncoder turns
    // those four characters into eight UTF-8 bytes, which is not the marker.
    const start = bytes.indexOf(0x25, 9);
    expect([...bytes.slice(start, start + 5)]).toEqual([
      0x25, 0xe2, 0xe3, 0xcf, 0xd3,
    ]);
  });

  it('keeps the xref honest when a stream contains newlines and "endobj"', async () => {
    // A real JPEG's compressed bytes can contain anything, including the very
    // keywords the file format uses as terminators.
    const nasty = Uint8Array.from([
      ...TINY_JPEG.slice(0, 20),
      ...new TextEncoder().encode('\nendstream\nendobj\n'),
      0x0a,
      0xff,
      0xd9,
    ]);
    const doc = new PdfDoc(594, 792);
    const ref = doc.addJpeg(nasty, 11, 7);
    doc.addPage(drawImage('Im0', [1, 0, 0, 1, 0, 0]), [{ name: 'Im0', ref }]);

    const out = text(doc);
    const rows = out
      .slice(out.indexOf('xref'))
      .split('\n')
      .filter((l) => / 00000 n $/.test(l));
    // Without this the forEach below passes vacuously if the regex ever stops
    // matching — a test that checks nothing looks exactly like one that passes.
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, i) => {
      const offset = Number(row.slice(0, 10));
      expect(out.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true);
    });
    // …and the declared length still matches the real byte count.
    expect(out).toContain(`/Length ${nasty.length}`);
  });

  it('gives every page a real parent, not the placeholder', async () => {
    const doc = new PdfDoc(594, 792);
    doc.addPage('', []);
    const out = text(doc);
    expect(out).not.toContain('/Parent 0 0 R');
    expect(out).toMatch(/\/Parent [1-9]\d* 0 R/);
  });

  it('counts its pages', async () => {
    const doc = new PdfDoc(594, 792);
    doc.addPage('', []);
    doc.addPage('', []);
    doc.addPage('', []);
    expect(text(doc)).toContain('/Count 3');
  });

  it('puts the JPEG bytes in untouched — that is the whole point', async () => {
    const doc = new PdfDoc(594, 792);
    const ref = doc.addJpeg(TINY_JPEG, 11, 7);
    doc.addPage('', [{ name: 'Im0', ref }]);
    const bytes = doc.buildBytes();
    // Find the original JPEG signature inside the file we produced.
    let found = false;
    for (let i = 0; i < bytes.length - TINY_JPEG.length; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
        found = TINY_JPEG.every((b, k) => bytes[i + k] === b);
        if (found) break;
      }
    }
    expect(found).toBe(true);
  });

  it('offsets in the xref table point at the objects they claim to', async () => {
    const doc = new PdfDoc(594, 792);
    doc.addJpeg(TINY_JPEG, 11, 7);
    doc.addPage('', []);
    const out = text(doc);

    const xrefAt = Number(
      out
        .slice(out.lastIndexOf('startxref') + 9)
        .trim()
        .split('\n')[0]
    );
    expect(out.slice(xrefAt, xrefAt + 4)).toBe('xref');

    const rows = out
      .slice(out.indexOf('xref'))
      .split('\n')
      .filter((l) => / 00000 n $/.test(l));
    // Without this the forEach below passes vacuously if the regex ever stops
    // matching — a test that checks nothing looks exactly like one that passes.
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, i) => {
      const offset = Number(row.slice(0, 10));
      expect(out.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true);
    });
  });
});

describe('drawImageClipped', () => {
  it('clips to the frame and then places the image inside it', () => {
    const out = drawImageClipped(
      'Im1',
      [10, 0, 0, 20, 5, 6],
      [2, 0, 0, 2, -0.5, -0.25]
    );
    // The frame's unit square, made into a clip, and only then the image.
    expect(out).toContain('0 0 1 1 re W n');
    expect(out.indexOf('re W n')).toBeLessThan(out.indexOf('/Im1 Do'));
    expect(out.startsWith('q ')).toBe(true);
    expect(out.trim().endsWith('Q')).toBe(true);
  });

  it('shows the whole picture when nothing is cropped', () => {
    const out = drawImageClipped(
      'Im2',
      [10, 0, 0, 20, 0, 0],
      [1, 0, 0, 1, 0, 0]
    );
    expect(out).toContain(
      '1.0000 0.0000 0.0000 1.0000 0.0000 0.0000 cm /Im2 Do'
    );
  });
});
