# 🖼️ Image Converter

A modern, client-side image converter built with vanilla TypeScript and modern browser APIs. Convert, resize, and optimize images entirely in your browser—no server uploads required.

## ✨ Features

- **🔄 Format Conversion** - Convert between PNG, JPEG, WebP, and AVIF formats (based on browser support)
- **📐 Smart Resizing** - Resize by pixels or percentage with aspect ratio lock
- **🎨 Quality Control** - Adjustable quality settings for lossy formats
- **🖌️ JPEG Background** - Custom background color for JPEG conversions
- **⚙️ Advanced Options** - Image smoothing, smoothing quality, and bitmap resize options
- **📦 Batch Processing** - Convert multiple images at once with controlled concurrency
- **💾 No Server Required** - All processing happens locally in your browser
- **🚀 Modern APIs** - Uses createImageBitmap, OffscreenCanvas, crypto.randomUUID, and other modern web APIs
- **📱 Responsive UI** - Clean Bootstrap 5 interface that works on all screen sizes

## 🛠️ Technologies

- **TypeScript (ES2022+)** - Modern TypeScript with ES modules
- **Bootstrap 5** - Responsive UI framework
- **Canvas API** - Image processing and rendering
- **Modern Browser APIs** - createImageBitmap, OffscreenCanvas, File API, Blob API
- **ESLint** - Code quality and consistency
- **Vite** - Local dev server
- **esbuild** - Production build bundler

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Edge, Firefox, Safari)
- Node.js (optional, for development)

### Installation

1. Clone the repository:
2. Install dependencies (optional, for linting or dev server):
   ```bash
   npm install
   ```

### Usage

Start the dev server:
```bash
npm run dev
```

Then navigate to the URL shown in the terminal (usually `http://localhost:5173`).

Build for production:
```bash
npm run build
```

If you prefer a simple static server, serve the `dist` folder after building:
```bash
npx serve dist
# or
npx http-server dist
# or
python -m http.server --directory dist 8000
```

## 📖 How to Use

1. **Select Images** - Click "Select images" and choose one or more image files
2. **Configure Options** - Set your desired output format, quality, and dimensions
3. **Convert** - Click "Convert all" or convert individual images
4. **Download** - Download your converted images

### Sizing Options

- **Pixel Sizing** - Specify exact width and height in pixels with optional aspect ratio lock
- **Scale Sizing** - Resize by percentage (e.g., 50% = half size, 200% = double size)

### Fit Modes

- **Keep** - Maintain original size if dimensions not specified
- **Contain** - Fit image within specified dimensions (letterbox)
- **Cover** - Fill dimensions and crop if needed
- **Stretch** - Stretch to fill dimensions exactly

## 🗂️ Project Structure

```
├── coverage/              # Vitest coverage output (generated)
├── src/
│   ├── index.html         # Main HTML file
│   ├── manifest.webmanifest # PWA manifest
│   ├── service-worker.ts  # Workbox-powered service worker
│   ├── assets/
│   │   ├── icons/         # App icons (PWA + favicon)
│   │   └── screenshots/   # PWA screenshots
│   └── app/
│       ├── main.ts        # Application entry point
│       ├── constants.ts   # Application constants
│       ├── utils.ts       # Utility functions
│       ├── canvas.ts      # Canvas and image operations
│       ├── conversion.ts  # Image conversion logic
│       ├── ui.ts          # UI and DOM manipulation
│       ├── types.ts       # TypeScript type definitions
│       └── *.test.ts      # Vitest unit tests
├── scripts/
│   └── build.mjs          # esbuild production build script
├── dist/                  # Production build output
├── package.json           # Project metadata and scripts
├── package-lock.json      # Dependency lockfile
├── eslint.config.mjs      # ESLint configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest configuration
├── AGENTS.md              # Project instructions
└── README.md              # Project overview
```

## 💻 Development

### Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

### Browser Compatibility

This application requires a modern browser with support for:
- ES2022+ JavaScript features
- ES Modules
- crypto.randomUUID
- createImageBitmap API (recommended) or HTMLImageElement fallback
- Canvas API with toBlob or OffscreenCanvas.convertToBlob
- File API and Blob API

**Recommended browsers:**
- Chrome/Edge 92+
- Firefox 95+
- Safari 15.4+

## 🏗️ Architecture

The application follows a modular ES module architecture:

- **constants.ts** - MIME type definitions and feature detection
- **utils.ts** - Pure utility functions (formatting, escaping, filenames, downloads)
- **canvas.ts** - Canvas creation, image decoding, format detection
- **conversion.ts** - Core image conversion logic
- **ui.ts** - Table row generation and DOM manipulation
- **main.ts** - Event handlers, state management, initialization, and service worker registration
- **service-worker.ts** - Workbox precaching and runtime caching strategies

Development runs via Vite, while production uses esbuild and Workbox to bundle assets and inject the precache manifest.

## 📄 License

ISC

## 👤 Author

Stefan Nedelchev

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 🌟 Acknowledgments

- Built with modern web standards
- No external image processing libraries required
- Inspired by the need for privacy-focused, offline-capable tools
