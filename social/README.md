# Focus Trail portrait post kit

Two **1080 × 1350 PNGs** with matching typography and colors, ready to upload in this order:

1. [Cover](01-focus-trail-cover.png): the dimensional keyboard identity and product purpose.
2. [Product evidence](02-focus-trail-evidence.png): a styled preview of the recorded Step 08 failure, explicitly labeled as a controlled demo.

[Download both images, caption and alt text](focus-trail-instagram.zip) · [Suggested caption](caption.txt) · [Image descriptions](alt-text.txt) · [Pixel sizes and source hashes](export-manifest.json)

The artwork uses the actual interface's key illustration and report preview. These are static portrait images. The product image is a styled preview, and the full report remains available in `evidence/demo/lost-return.html`. The pilot is a candidate for maintainer feedback; these images do not claim customer adoption or an independent installation.

## Regenerate

Use Node 24 and the project's pinned dependencies and full Chromium. Start `npm run demo`, then run this in a second terminal:

```sh
node scripts/export-social.mjs
```

The script checks the recorded failure, renders both images, verifies their PNG dimensions and writes `export-manifest.json`. It does not post to any account. Preview either composition at `http://127.0.0.1:49371/social.html?slide=cover` or `?slide=product` in a 1080 × 1350 viewport.
