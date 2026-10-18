#!/usr/bin/env bash
# Converts photos to WebP, max 1600px wide, aiming for under 200 KB each.
# Usage: scripts/compress-images.sh path/to/originals/*.jpg
# Output goes to images/. Needs `cwebp` (brew install webp / apt install webp).
set -euo pipefail
out="$(dirname "$0")/../images"
for f in "$@"; do
  name="$(basename "${f%.*}").webp"
  cwebp -quiet -q 78 -resize 1600 0 -metadata none "$f" -o "$out/$name"
  size=$(wc -c < "$out/$name")
  echo "$name  $((size / 1024)) KB"
  if [ "$size" -gt 204800 ]; then
    cwebp -quiet -q 65 -resize 1400 0 -metadata none "$f" -o "$out/$name"
    echo "  re-compressed: $(( $(wc -c < "$out/$name") / 1024 )) KB"
  fi
done
