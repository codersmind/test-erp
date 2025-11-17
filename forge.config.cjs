const { VitePlugin } = require('@electron-forge/plugin-vite')

module.exports = {
  packagerConfig: {
    executableName: 'bookstore-erp',
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
      config: {name: 'bookstore_erp'},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
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

