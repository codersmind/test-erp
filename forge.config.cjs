const { VitePlugin } = require('@electron-forge/plugin-vite')

module.exports = {
  packagerConfig: {
    executableName: 'bookstore-erp',
    // App icon configuration
    // Place your icon files in assets/icons/ directory:
    // - icon.ico (Windows - 256x256 recommended, can contain multiple sizes)
    // - icon.icns (macOS - 512x512 recommended)
    // - icon.png (Linux - 512x512 recommended)
    icon: './assets/icons/icon', // Path without extension, Electron will auto-detect .ico, .icns, .png
    // Ensure electron-updater and its dependencies are included and unpacked from ASAR
    asar: {
      unpack: '*.{node,dll}',
      unpackDir: 'node_modules/electron-updater',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'bookstore_erp',
        // Icon for Windows installer
        setupIcon: './assets/icons/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        // Icon for Debian/Ubuntu packages
        options: {
          icon: './assets/icons/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        // Icon for RPM packages (Fedora, CentOS, etc.)
        options: {
          icon: './assets/icons/icon.png',
        },
      },
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'electron/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'electron/preload.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
  publishers: [
    { 
      name: '@electron-forge/publisher-github', 
      config: { 
        repository: {
          owner: 'YOUR_USERNAME',
          name: 'YOUR_REPO'
        },
        // Optional: Set to 'draft' to create draft releases
        draft: false,
        // Optional: GitHub token (can also use GITHUB_TOKEN env variable)
        // token: process.env.GITHUB_TOKEN
      }
    },
  ],
}

