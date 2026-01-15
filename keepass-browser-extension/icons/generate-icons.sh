#!/bin/bash
# Generate PNG icons from SVG source
# Requires: ImageMagick or Inkscape

# Check for tools
if command -v convert &> /dev/null; then
    # Using ImageMagick
    echo "Generating icons with ImageMagick..."
    convert -background none -density 384 -resize 16x16 icon.svg icon16.png
    convert -background none -density 384 -resize 32x32 icon.svg icon32.png
    convert -background none -density 384 -resize 48x48 icon.svg icon48.png
    convert -background none -density 384 -resize 128x128 icon.svg icon128.png
    echo "Icons generated successfully!"
elif command -v inkscape &> /dev/null; then
    # Using Inkscape
    echo "Generating icons with Inkscape..."
    inkscape -w 16 -h 16 icon.svg -o icon16.png
    inkscape -w 32 -h 32 icon.svg -o icon32.png
    inkscape -w 48 -h 48 icon.svg -o icon48.png
    inkscape -w 128 -h 128 icon.svg -o icon128.png
    echo "Icons generated successfully!"
else
    echo "Error: Neither ImageMagick (convert) nor Inkscape found."
    echo "Please install one of them:"
    echo "  - ImageMagick: sudo apt-get install imagemagick"
    echo "  - Inkscape: sudo apt-get install inkscape"
    exit 1
fi
