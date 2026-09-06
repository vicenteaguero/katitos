/**
 * A very small PDF writer - enough to print an album, and nothing more.
 *
 * Why not a library: every album photo is ALREADY a JPEG, and PDF's
 * `/DCTDecode` filter takes JPEG bytes verbatim. So the downloaded file is
 * spliced straight into the document - no decode, no canvas, no re-encode, no
 * memory spike on a phone, and the printed picture is bit-for-bit the original.
 * A general-purpose library would pull ~120 KB into the bundle to do worse.
 *
 * The trade: this writer only knows what the album needs - JPEG images,
 * filled rectangles, and a transform per object. Text is drawn as an image by
 * the caller (see `export-album.ts`), because the fonts a bare PDF gives you
 * cannot spell anything in Russian.
 */

interface PdfObject {
  /** Raw body: dictionary, stream header and all. */
  head: string;
  /** Optional binary payload for a stream object. */
  data?: Uint8Array;
}

const enc = new TextEncoder();

export class PdfDoc {
  private objects: PdfObject[] = [];
  private pages: number[] = [];
  private readonly w: number;
  private readonly h: number;

  constructor(width: number, height: number) {
    this.w = width;
    this.h = height;
  }

  /** Reserve an object number (1-based, as PDF counts them). */
  private add(head: string, data?: Uint8Array): number {
    this.objects.push({ head, data });
    return this.objects.length;
  }

  /**
   * Register a JPEG. `SMask`-less and un-decoded: the bytes go in as they are.
   */
  addJpeg(
    bytes: Uint8Array,
    width: number,
    height: number,
    components = 3
  ): number {
    // A JPEG is not always three channels: a black-and-white photo has one,
    // and declaring it RGB renders it as coloured noise.
    const space =
      components === 1
        ? '/DeviceGray'
        : components === 4
          ? '/DeviceCMYK'
          : '/DeviceRGB';
    return this.add(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace ${space} /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${bytes.length} >>`,
      bytes
    );
  }

  /** Add one page whose content stream is `ops`, using the given images. */
  addPage(ops: string, images: { name: string; ref: number }[]): void {
    const body = enc.encode(ops);
    const content = this.add(`<< /Length ${body.length} >>`, body);
    const xobjects = images.map((i) => `/${i.name} ${i.ref} 0 R`).join(' ');
    const page = this.add(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${this.w} ${this.h}] ` +
        `/Resources << /XObject << ${xobjects} >> >> /Contents ${content} 0 R >>`
    );
    this.pages.push(page);
  }

  /** Serialize the whole document to bytes. */
  buildBytes(): Uint8Array {
    const pagesRef = this.objects.length + 1;
    const kids = this.pages.map((p) => `${p} 0 R`).join(' ');
    // Pages and Catalog come last so they can name every page written so far.
    this.add(`<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`);
    const catalog = this.add(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let at = 0;
    const push = (part: Uint8Array | string) => {
      const bytes = typeof part === 'string' ? enc.encode(part) : part;
      chunks.push(bytes);
      at += bytes.length;
    };

    // The second line must be a comment of RAW bytes above 127 - it is how a
    // PDF tells every tool downstream "this file is binary, do not line-ending
    // convert it". Written as bytes, not through `TextEncoder`: encoding the
    // string '\xE2\xE3\xCF\xD3' as UTF-8 turns four characters into eight
    // bytes, which is not the marker at all.
    push('%PDF-1.4\n');
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    this.objects.forEach((obj, i) => {
      offsets[i] = at;
      // Every page needs its parent, which only exists once the tree is built.
      const head = obj.head.replace('/Parent 0 0 R', `/Parent ${pagesRef} 0 R`);
      push(`${i + 1} 0 obj\n${head}\n`);
      if (obj.data) {
        push('stream\n');
        push(obj.data);
        push('\nendstream\n');
      }
      push('endobj\n');
    });

    const xref = at;
    push(`xref\n0 ${this.objects.length + 1}\n`);
    push('0000000000 65535 f \n');
    for (const off of offsets) {
      push(`${String(off).padStart(10, '0')} 00000 n \n`);
    }
    push(
      `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalog} 0 R >>\n` +
        `startxref\n${xref}\n%%EOF\n`
    );

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let cursor = 0;
    for (const chunk of chunks) {
      out.set(chunk, cursor);
      cursor += chunk.length;
    }
    return out;
  }

  /** The same document, as a file. */
  build(): Blob {
    return new Blob([this.buildBytes() as BlobPart], {
      type: 'application/pdf',
    });
  }
}

/** PDF numbers: fixed precision, and never `1e-7` - which no reader accepts. */
export function num(n: number): string {
  return (Math.abs(n) < 1e-6 ? 0 : n).toFixed(4);
}

/** Draw an image through a transform matrix. */
export function drawImage(
  name: string,
  m: readonly [number, number, number, number, number, number]
): string {
  return `q ${m.map(num).join(' ')} cm /${name} Do Q\n`;
}

/**
 * Draw an image showing only part of itself, clipped to its frame.
 *
 * `clip` puts the frame's unit square on the page; inside that space the frame
 * IS the unit square, so `img` is a plain scale-and-shift with no matrix to
 * invert and no rotated offsets to get subtly wrong.
 */
export function drawImageClipped(
  name: string,
  clip: readonly [number, number, number, number, number, number],
  img: readonly [number, number, number, number, number, number]
): string {
  return (
    `q ${clip.map(num).join(' ')} cm 0 0 1 1 re W n ` +
    `${img.map(num).join(' ')} cm /${name} Do Q\n`
  );
}

/** A filled rectangle, for the white of a polaroid plate. */
export function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  m?: readonly [number, number, number, number, number, number]
): string {
  const paint =
    `${rgb.map(num).join(' ')} rg ` +
    `${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`;
  return m ? `q ${m.map(num).join(' ')} cm ${paint} Q\n` : `q ${paint} Q\n`;
}

/** The size of a JPEG, read from its own header - no decoding needed. */
export function readJpegSize(
  bytes: Uint8Array
): { width: number; height: number; components: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    // 0xFF is legal padding before a marker, and these carry no length field.
    // Treating either as a segment header walked the reader into the middle of
    // the image and it gave up - and a photo it can't measure is a photo the
    // export silently drops.
    if (
      marker === 0xff ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd9)
    ) {
      i += marker === 0xff ? 1 : 2;
      continue;
    }
    // SOF0..SOF15, minus the four that aren't frame headers.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: (bytes[i + 5] << 8) | bytes[i + 6],
        width: (bytes[i + 7] << 8) | bytes[i + 8],
        components: bytes[i + 9] || 3,
      };
    }
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}
