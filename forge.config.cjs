const { VitePlugin } = require('@electron-forge/plugin-vite')
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    appBundleId: 'com.ponytory.erp', 
    asar: true,
    executableName: 'ponytory-erp',
    // App icon configuration
    // Place your icon files in assets/icons/ directory:
    // - icon.ico (Windows - 256x256 recommended, can contain multiple sizes)
    // - icon.icns (macOS - 512x512 recommended)
    // - icon.png (Linux - 512x512 recommended)
    icon: './assets/icons/icon', // Path without extension, Electron will auto-detect .ico, .icns, .png
    // Ensure electron-updater and its dependencies are included and unpacked from ASAR
    // asar: {
    //   unpack: '*.{node,dll}',
    //   unpackDir: 'node_modules/electron-updater',
    // },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // iconUrl: 'assets/icon.ico', // Windows installer icon
        iconUrl: 'https://raw.githubusercontent.com/codersmind/murf-desktop-app/refs/heads/main/icon.ico', // Windows installer icon
        setupIcon: './assets/icons/icon.ico', // Windows installer icon
        // certificateFile: process.env.CSC_LINK, // Path to .p12/.pfx
        // certificatePassword: process.env.CSC_KEY_PASSWORD, // Password
        name: 'ponytory-erp',
        loadingGif: './assets/icons/loading.gif',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
      config: {
        icon: './assets/icons/icon.icns', // macOS app icon
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        icon: './assets/icons/icon.png', // Linux app icon
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        icon: './assets/icons/icon.png', // Linux app icon for RPM
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
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
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

