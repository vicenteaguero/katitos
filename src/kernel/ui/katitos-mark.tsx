import { cn } from '../lib/cn';

/**
 * The Katitos brand mark - a cat head with negative-space heart eyes.
 *
 * Single source of truth: identical geometry to the app icon / favicon
 * (`design/logo/katitos-logo.svg`, vector-traced from the brand render).
 * The head is Marble Snow; the heart eyes are true cut-outs, so whatever
 * sits behind the mark shows through them - exactly like the icon tile.
 *
 * `fill` takes any paint, including a `url(#…)` reference to a gradient
 * defined elsewhere in the document - which is how it comes out gilt, stamped
 * on the back board of an album.
 *
 * Lives in the kernel rather than in the app shell because features use it
 * too, and a feature reaching up into `app/` is exactly what the boundary
 * lint forbids.
 */
export function KatitosMark({
  size = 40,
  className,
  fill = '#FFFAFA',
}: {
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      role="img"
      aria-label="Katitos"
      className={cn('block', className)}
    >
      <g transform="translate(0.5,31)">
        <g transform="translate(0,1024) scale(0.1,-0.1)" fill={fill}>
          <path d="M3114 7595 c-30 -46 -102 -296 -120 -416 -20 -139 -15 -362 12 -521 18 -107 18 -107 -27 -165 -415 -533 -541 -1252 -338 -1932 154 -517 475 -876 971 -1089 254 -108 597 -186 993 -224 185 -17 861 -18 1045 0 182 17 477 67 615 103 806 209 1249 672 1396 1460 30 158 33 192 33 369 1 208 -10 315 -51 500 -64 290 -191 563 -370 797 -55 73 -55 73 -33 205 43 259 23 518 -60 770 -53 165 -58 171 -124 163 -278 -35 -635 -183 -889 -367 -69 -49 -69 -49 -235 -9 -370 89 -715 114 -1132 80 -168 -13 -317 -38 -506 -84 -147 -36 -147 -36 -203 4 -260 188 -631 342 -904 376 -52 7 -56 6 -73 -20z m559 -1955 c71 -11 170 -60 220 -108 21 -21 56 -63 77 -96 38 -58 38 -58 59 -19 34 67 114 147 183 181 168 85 356 56 484 -75 98 -100 140 -216 132 -365 -4 -72 -10 -97 -41 -163 -49 -101 -106 -166 -306 -344 -91 -81 -236 -216 -321 -299 l-155 -151 -135 133 c-74 72 -198 187 -275 255 -345 306 -401 384 -412 577 -10 171 60 322 190 408 101 67 184 85 300 66z m2238 0 c116 -22 219 -94 290 -202 37 -58 37 -58 53 -33 9 13 16 29 16 34 0 5 24 36 54 69 210 226 558 169 694 -115 36 -77 37 -80 37 -198 0 -120 0 -120 -42 -207 -48 -99 -116 -173 -378 -408 -82 -74 -206 -190 -275 -257 l-125 -122 -160 157 c-88 86 -231 220 -319 297 -169 149 -252 239 -290 313 -96 190 -66 409 76 555 100 101 231 143 369 117z" />
        </g>
      </g>
    </svg>
  );
}
