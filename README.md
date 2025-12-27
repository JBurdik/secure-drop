# SecureDrop - Private File Sharing

A simple, private file sharing application built with React, Convex, and TailwindCSS.

## Features

- **File Upload & Sharing** - Drag & drop file upload with unique share links
- **Auto-Expiring Links** - Configurable expiration (1h, 24h, 48h, 7 days)
- **Password Protection** - Optional password protection for files
- **Upload Requests** - Create links for others to upload files to you
- **QR Code Sharing** - Generate QR codes for easy mobile access
- **File Preview** - In-browser preview for images, videos, audio, and PDFs
- **Real-time Updates** - Live updates powered by Convex

## Tech Stack

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Convex (database, file storage, real-time)
- **Auth:** Convex Auth (email/password)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will prompt you to create a Convex project and set up your `.env.local` file.

### 3. Start the development server

```bash
npm run dev
```

### 4. Open your browser

Navigate to `http://localhost:5173`

## Self-Hosting

For self-hosted Convex deployment:

1. Deploy Convex via Docker Compose
2. Set `CONVEX_CLOUD_ORIGIN` to your backend URL
3. Set `CONVEX_SITE_ORIGIN` to your backend URL + `/http`
4. Update `.env.local` with your self-hosted Convex URL

## Project Structure

```
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── auth.ts           # Authentication setup
│   ├── files.ts          # File upload/download functions
│   ├── uploadRequests.ts # Upload request functions
│   ├── cleanup.ts        # Cleanup expired files
│   └── crons.ts          # Scheduled cleanup jobs
├── src/
│   ├── components/       # React components
│   │   ├── DropZone.tsx
│   │   ├── FileCard.tsx
│   │   ├── UploadRequestForm.tsx
│   │   └── AuthForm.tsx
│   ├── pages/            # Page components
│   │   ├── FilePage.tsx
│   │   ├── RequestPage.tsx
│   │   └── Dashboard.tsx
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
└── ...
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with upload dropzone |
| `/f/:shareId` | File download/preview page |
| `/r/:requestId` | Upload request page |
| `/dashboard` | User's files & upload requests |
