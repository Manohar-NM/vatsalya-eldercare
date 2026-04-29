# Frontend Deployment

Use this checklist when deploying the React/Vite frontend to Vercel or another static frontend host.

## Project Settings

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

## Required Environment Variables

- `VITE_API_URL`: deployed backend API URL, for example `https://your-backend.onrender.com/api`
- `VITE_SOCKET_URL`: deployed backend Socket.IO URL, for example `https://your-backend.onrender.com`

## Post Deploy Checks

- Register a caregiver account
- Add a parent and copy the unique code
- Login to `/parent` using the parent code
- Test SOS, voice message, reminders, medicine order, appointment, and activity flows
