# Backend Deployment

Use this checklist when deploying the Express backend to Render or a similar Node hosting provider.

## Runtime

- Root directory: project root
- Build command: `npm install`
- Start command: `npm start`

## Required Environment Variables

- `MONGO_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Production JWT signing secret (MUST be cryptographically strong, minimum 32 characters)
- `FRONTEND_URL`: Deployed frontend URL, for example `https://your-app.vercel.app`
- `NODE_ENV`: Set to `production`

### Configuring `JWT_SECRET` in Production

To generate a secure 64-character hexadecimal key, run locally:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### If using Render:
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select your Vatsalya Web Service.
3. In the left navigation menu, click **Environment**.
4. Click **Add Environment Variable**:
   - **Key**: `JWT_SECRET`
   - **Value**: `<paste-generated-32+-character-string>`
5. Click **Save Changes**. Render will automatically trigger a new deployment.

#### If using Vercel (for Backend Functions):
1. Open the [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your Vatsalya project -> **Settings** -> **Environment Variables**.
3. Add a new variable:
   - **Key**: `JWT_SECRET`
   - **Value**: `<paste-generated-32+-character-string>`
   - **Environments**: Select **Production** (and Preview if needed).
4. Save and redeploy from the Deployments tab.

## Post Deploy Checks

- Open the backend URL and confirm it returns `Vatsalya Backend Running`
- Confirm `/api/users/register` works from the deployed frontend
- Confirm Socket.IO events work for SOS, medicine orders, reminders, and voice messages
