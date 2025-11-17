# App Icons

Place your custom icon files in this directory:

## Required Icon Files

### Windows (.ico)
- **File:** `icon.ico`
- **Size:** 256x256 pixels (recommended)
- **Format:** ICO file containing multiple sizes (16x16, 32x32, 48x48, 256x256)
- **Tools to create:** 
  - Online: https://convertio.co/png-ico/ or https://www.icoconverter.com/
  - Windows: Use IcoFX or GIMP with ICO plugin
  - From PNG: Use ImageMagick: `magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico`

### macOS (.icns)
- **File:** `icon.icns`
- **Size:** 512x512 pixels (recommended)
- **Format:** ICNS file containing multiple sizes
- **Tools to create:**
  - macOS: Use `iconutil` command: `iconutil -c icns icon.iconset`
  - Online: https://cloudconvert.com/png-to-icns
  - From PNG: Use Image2icon app (macOS App Store)

### Linux (.png)
- **File:** `icon.png`
- **Size:** 512x512 pixels (recommended)
- **Format:** PNG with transparency support
- **Tools:** Any image editor (GIMP, Photoshop, etc.)

## Quick Setup

1. Create your icon image (512x512 PNG recommended)
2. Convert to required formats:
   - **Windows:** Convert PNG to ICO (use online tools or ImageMagick)
   - **macOS:** Convert PNG to ICNS (use iconutil on macOS or online tools)
   - **Linux:** Use the PNG directly
3. Place all three files in this directory:
   - `icon.ico`
   - `icon.icns`
   - `icon.png`

## Notes

- The icon will be used for:
  - The application executable
  - The installer
  - Taskbar/dock icons
  - Window title bar (on some platforms)
- Make sure your icon has a transparent background for best results
- Test the icon at different sizes to ensure it looks good when scaled

