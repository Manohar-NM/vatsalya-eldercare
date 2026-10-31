# Backend Deployment

Use this checklist when deploying the Express backend to Render or a similar Node hosting provider.

## Runtime

- Root directory: project root
- Build command: `npm install`
- Start command: `npm start`

## Required Environment Variables

- `MONGO_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: production JWT signing secret
- `FRONTEND_URL`: deployed frontend URL, for example `https://your-app.vercel.app`

## Post Deploy Checks

- Open the backend URL and confirm it returns `Vatsalya Backend Running`
- Confirm `/api/users/register` works from the deployed frontend
- Confirm Socket.IO events work for SOS, medicine orders, reminders, and voice messages
