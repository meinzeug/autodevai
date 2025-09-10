# Icons Directory

This directory should contain the following icon files for the Tauri application:

- `32x32.png` - 32x32 pixel PNG icon
- `128x128.png` - 128x128 pixel PNG icon  
- `128x128@2x.png` - 256x256 pixel PNG icon for retina displays
- `icon.icns` - macOS ICNS icon file
- `icon.ico` - Windows ICO icon file
- `icon.png` - Generic PNG icon for system tray

For development, you can create simple placeholder icons or use the default Tauri icons.

To generate icons from a source image, you can use:
```bash
npx @tauri-apps/cli icon path/to/source-icon.png
```

This will automatically generate all required icon formats.