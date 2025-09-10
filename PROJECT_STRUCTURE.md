# Project ATLAS - Structure Overview

## 🚀 Project Description
Project ATLAS (Advanced Text & Analytics System) is a modern web application for intelligent document processing, OCR extraction, and data analytics.

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
```
src/
├── components/
│   ├── ui/                    # Shadcn/ui components
│   ├── Dashboard/             # Dashboard components
│   ├── Analytics/             # Analytics visualization components  
│   ├── FileUpload/            # File upload & management
│   ├── Visualization/         # D3.js charts & graphs
│   └── ProjectStructure.tsx   # Project documentation component
├── services/
│   ├── api.ts                 # API service layer (Axios)
│   └── ocr.ts                 # OCR processing utilities
├── types/
│   └── atlas.ts               # TypeScript interfaces
├── utils/
│   └── dataProcessing.ts      # Data transformation utilities
├── pages/
│   ├── Index.tsx              # Landing/dashboard page
│   └── NotFound.tsx           # 404 error page
├── hooks/
│   ├── use-mobile.tsx         # Mobile detection hook
│   └── use-toast.ts           # Toast notification hook
├── assets/
│   └── atlas-hero.jpg         # Generated hero image
├── lib/
│   └── utils.ts               # Utility functions
├── App.tsx                    # Main app component
├── main.tsx                   # App entry point
└── index.css                  # Design system & styles
```

### Backend (Supabase Services)
```
Supabase Integration:
├── Authentication             # User auth & session management
├── Database (PostgreSQL)      # Document metadata & analysis results  
├── Storage                    # File storage for documents & images
├── Edge Functions             # Serverless functions for:
│   ├── PDF Processing         # PDF text extraction
│   ├── OCR Processing         # Image text recognition
│   ├── Data Analysis          # ML/AI analytics
│   └── File Validation        # File type & size validation
└── Real-time Subscriptions    # Live updates for processing status
```

## 📦 Dependencies Installed

### Core Framework
- **React 18** - Modern React with hooks
- **TypeScript** - Type safety & better DX
- **Vite** - Fast build tool & dev server

### UI & Styling  
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - High-quality component library
- **Lucide React** - Beautiful icon set

### Data & Visualization
- **D3.js** - Data visualization library
- **Axios** - HTTP client for API calls
- **TanStack Query** - Data fetching & caching

### Backend Integration
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - File storage
  - Authentication
  - Edge functions
  - Real-time subscriptions

## 🎨 Design System

### Color Palette
- **Primary**: Purple gradient (`hsl(265, 85%, 58%)`)
- **Accent**: Cyan (`hsl(180, 100%, 50%)`) 
- **Success**: Green (`hsl(142, 76%, 36%)`)
- **Warning**: Orange (`hsl(38, 92%, 50%)`)
- **Info**: Blue (`hsl(221, 83%, 53%)`)

### Key Features
- Dark theme by default with light theme support
- Glassmorphism effects with backdrop blur
- Gradient text effects for headings
- Smooth animations and transitions
- Responsive design for all devices

## 🔧 Implementation Notes

### Platform Constraints
- **No Python/Flask**: Use Supabase Edge Functions instead
- **No direct file system access**: Use Supabase Storage
- **OCR Processing**: Integrate external OCR APIs via Edge Functions

### Recommended Next Steps
1. **Set up Supabase project** and configure environment
2. **Implement file upload** with Supabase Storage
3. **Create Edge Functions** for PDF/OCR processing  
4. **Build dashboard components** with real-time data
5. **Add D3.js visualizations** for analytics display
6. **Implement user authentication** with Supabase Auth

### File Processing Flow
1. User uploads document → Supabase Storage
2. Edge Function validates file → Updates database status
3. OCR Edge Function processes text → Stores results  
4. Analytics Edge Function analyzes content → Generates insights
5. Frontend receives real-time updates → Updates UI

## 🚀 Getting Started

```bash
# Install dependencies (already done)
npm install

# Start development server  
npm run dev

# Build for production
npm run build
```

## 📝 API Endpoints (Planned)

```typescript
// Document Management
POST /api/documents/upload        // Upload new document
GET  /api/documents              // List all documents  
POST /api/documents/:id/process  // Start processing

// OCR & Processing
POST /api/ocr/:documentId        // Perform OCR extraction
GET  /api/ocr/:documentId        // Get OCR results

// Analytics  
POST /api/analytics/:documentId  // Run analysis
GET  /api/analytics/:documentId  // Get analysis results

// Dashboard
GET  /api/dashboard              // Dashboard summary data
```

This structure provides a solid foundation for building the ATLAS document processing system within the Lovable platform constraints.