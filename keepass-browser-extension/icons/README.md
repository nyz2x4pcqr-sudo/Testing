# Extension Icons

This directory contains the icon assets for the KeePass Browser Extension.

## Files

- **icon.svg** - Source SVG file (128x128)
- **generate-icons.sh** - Script to generate PNG files from SVG

## Generating PNG Icons

The extension requires PNG icons in multiple sizes (16x16, 32x32, 48x48, 128x128).

### Using the Generation Script

```bash
cd icons/
./generate-icons.sh
```

This script will generate all required PNG sizes from the SVG source.

### Requirements

You need one of the following tools installed:
- **ImageMagick**: `sudo apt-get install imagemagick` (Linux)
- **Inkscape**: `sudo apt-get install inkscape` (Linux)

### Manual Generation

If you prefer to generate icons manually:

**Using ImageMagick:**
```bash
convert -background none -density 384 -resize 16x16 icon.svg icon16.png
convert -background none -density 384 -resize 32x32 icon.svg icon32.png
convert -background none -density 384 -resize 48x48 icon.svg icon48.png
convert -background none -density 384 -resize 128x128 icon.svg icon128.png
```

**Using Inkscape:**
```bash
inkscape -w 16 -h 16 icon.svg -o icon16.png
inkscape -w 32 -h 32 icon.svg -o icon32.png
inkscape -w 48 -h 48 icon.svg -o icon48.png
inkscape -w 128 -h 128 icon.svg -o icon128.png
```

## Icon Design

The icon features:
- Green circular background (#4CAF50)
- White padlock symbol
- Clean, modern design
- Good visibility at all sizes

Feel free to customize the SVG and regenerate the PNG files.
