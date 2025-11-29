# Document Redaction Tool

A Next.js web application that automatically detects and redacts sensitive personal information from uploaded documents.

## Features

- Upload images (PNG, JPG, JPEG) and PDF files
- Automatic detection of:
  - Aadhaar numbers
  - PAN numbers
  - Phone numbers
  - Addresses
- Permanent redaction of sensitive information
- Preview redacted documents before download
- Client-side processing for privacy

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **OCR**: Tesseract.js
- **PDF Processing**: pdf-lib, pdfjs-dist
- **File Upload**: react-dropzone
- **Testing**: Vitest, fast-check (property-based testing)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             # Core services (OCR, detection, redaction)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── tests/           # Unit and property-based tests
```

## License

MIT
