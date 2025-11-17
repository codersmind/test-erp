# Windows Installer Configuration Notes

## Icon Configuration ✅

The icon is now properly configured in `forge.config.cjs`:
- **setupIcon**: Points to `./assets/icons/icon.ico`
- This icon will be used for:
  - The installer executable
  - The uninstaller
  - Control Panel display
  - Taskbar icon

**Important**: Make sure `icon.ico` exists in `assets/icons/` directory and contains multiple sizes (16x16, 32x32, 48x48, 256x256) for best results.

## Uninstall Confirmation

Windows Control Panel should show a confirmation dialog by default when clicking "Uninstall". However, if it's not showing, it might be due to:

1. **Windows UAC Settings**: If User Account Control is disabled or set to "Never notify", confirmations may be skipped
2. **Windows Settings**: Some Windows configurations skip uninstall confirmations
3. **Admin Privileges**: If running as administrator, Windows might skip the confirmation

### How to Test/Verify:

1. After installing your app, go to Windows Control Panel → Programs and Features
2. Find "PonyTory ERP" in the list
3. Click "Uninstall" - Windows should show a confirmation dialog
4. If no confirmation appears, check Windows UAC settings

### Note:

Squirrel.Windows uses Windows' standard uninstaller, which should show confirmations by default. The confirmation dialog is controlled by Windows, not by the Electron app itself.

## After Making Changes:

1. Rebuild the app: `npm run build`
2. Recreate the installer: `npm run electron:make`
3. Test the installer on a clean system to verify:
   - Icon appears correctly in Control Panel
   - Uninstall shows confirmation (if Windows settings allow)

## Troubleshooting Icon Issues:

If the icon still shows as Electron logo:
1. Ensure `icon.ico` file exists and is valid
2. Verify the icon file contains multiple sizes (use a tool like IcoFX)
3. Rebuild and recreate the installer
4. Clear Windows icon cache: `ie4uinit.exe -show` (run in Command Prompt as admin)

