# AI-Tinerary MVP — Setup & Deployment Guide

**Status:** Ready to Deploy  
**Date:** 2026-09-25  
**You:** Cris Gilden

---

## Part 1: Local Testing (Your Mac)

### **Step 1: Create Database**

Open Terminal and paste:

```bash
createdb ai_tinerary
```

Then load the schema:

```bash
psql -U postgres -d ai_tinerary -f ~/Downloads/ai-tinerary-mvp/backend/schema.sql
```

Should see: `CREATE TABLE` messages (good sign ✅)

---

### **Step 2: Backend Setup**

```bash
cd ~/Downloads/ai-tinerary-mvp/backend
npm install
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Find this line:
```
CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE
```

Replace with your actual API key from claude.ai/account

Save: `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 3: Start Backend**

```bash
npm start
```

Should show:

```
╔════════════════════════════════════════════════════════════╗
║       AI-Tinerary MVP Backend                             ║
║       Port: 3000                                           ║
║       Status: Running                                      ║
╚════════════════════════════════════════════════════════════╝
```

**Leave this running.**

---

### **Step 4: Frontend Setup (New Terminal Window)**

```bash
cd ~/Downloads/ai-tinerary-mvp/frontend
npm install
cp .env.example .env
npm start
```

Should open: `http://localhost:3000`

---

### **Step 5: Test It**

1. Fill in trip details (e.g., "Paris Weekend", "Paris, France")
2. Add dates (Oct 1 - Oct 8)
3. Name your group (e.g., "Smith Family")
4. Add travelers (yourself + partner)
5. Fill intake form (budget, pace, interests, etc.)
6. Click "Generate Itinerary"
7. Wait 30 seconds for Claude to generate
8. See your itinerary! ✅

---

## Part 2: Deploy to Vercel (Production)

Vercel hosts **both backend and frontend** in one place. Super simple.

### **Step 1: Prepare Code for Vercel**

Create a `vercel.json` file in your project root:

```bash
cd ~/Downloads/ai-tinerary-mvp
nano vercel.json
```

Paste:

```json
{
  "buildCommand": "npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend",
  "outputDirectory": "frontend/build",
  "env": {
    "REACT_APP_API_URL": "@react_app_api_url",
    "DATABASE_URL": "@database_url",
    "CLAUDE_API_KEY": "@claude_api_key",
    "NODE_ENV": "production"
  }
}
```

Save: `Ctrl+X`, `Y`, `Enter`

---

### **Step 2: Sign Up for Vercel**

1. Go to: **vercel.com**
2. Click **"Sign Up"** (use GitHub account)
3. Authorize Vercel

---

### **Step 3: Create Project on Vercel**

1. Click **"Add New"** → **"Project"**
2. Click **"Import Git Repository"**
3. Paste your GitHub repo URL (if you're using GitHub)
4. **Or** click **"Deploy with CLI"** if not using GitHub

---

### **Step 4: Set Environment Variables**

On Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://user:password@your-db-host:5432/ai_tinerary` |
| `CLAUDE_API_KEY` | Your API key from claude.ai/account |
| `REACT_APP_API_URL` | Your Vercel backend URL (auto-assigned) |

---

### **Step 5: Deploy**

```bash
npm install -g vercel
cd ~/Downloads/ai-tinerary-mvp
vercel
```

Follow the prompts. When done, you'll get a URL like:

```
https://ai-tinerary.vercel.app
```

**Your site is live!** ✅

---

### **Step 6: Database Setup (One-time)**

Your Vercel app needs a PostgreSQL database. Options:

**Option A: Railway (Recommended, $5-20/mo)**
1. Go to: **railway.app**
2. Sign up
3. Create new project
4. Add PostgreSQL
5. Copy connection string
6. Paste into Vercel's `DATABASE_URL` env var

**Option B: AWS RDS**
1. Create PostgreSQL instance on AWS
2. Copy connection string
3. Paste into Vercel

**Option C: Local for MVP**
- Keep your Mac's PostgreSQL
- Vercel will connect to it
- (Not recommended for production, fine for beta)

---

## How the MVP Works

**Flow:**

```
User fills intake form (frontend)
        ↓
Form sends data to backend (Express)
        ↓
Backend stores in PostgreSQL
        ↓
Backend calls Claude API with intake data
        ↓
Claude returns itinerary (JSON)
        ↓
Frontend displays itinerary
        ↓
Done! ✅
```

**No complex voting, no multi-unit logic, no splits.** Just one group, one intake, one itinerary.

---

## File Structure

```
ai-tinerary-mvp/
├── backend/
│   ├── schema.sql          # Database setup
│   ├── server.js           # Express server
│   ├── package.json        # Dependencies
│   └── .env.example        # Config template
│
├── frontend/
│   ├── App.jsx             # React app (all-in-one)
│   ├── App.css             # Styling
│   ├── index.js            # Entry point
│   ├── package.json        # Dependencies
│   └── .env.example        # Config template
│
└── vercel.json             # Deployment config
```

---

## Troubleshooting

### Backend won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Frontend can't connect to backend

1. Make sure backend is running (`npm start` in backend folder)
2. Check `.env` has correct `REACT_APP_API_URL`
3. Restart frontend: `npm start`

### Claude API errors

1. Verify API key in `.env`
2. Check your Claude account has credits
3. Restart backend

### Database connection failed

```bash
# Check PostgreSQL is running
psql -U postgres

# If psql command not found:
/Library/PostgreSQL/15/bin/psql -U postgres
```

---

## Next Steps After MVP

Once beta testing is done:

1. **Add multi-traveler intake** (different questions per person)
2. **Add group voting** (majority rules, dissent notes)
3. **Add passcodes** (shareable, read-only links)
4. **Add review collection** (end-of-trip feedback)
5. **Add traveler profiles** (reusable across trips)

Each takes ~2-3 days to add.

---

## Questions?

**Backend issue?** Check backend console output  
**Frontend issue?** Check browser console (F12)  
**Claude error?** Check API key in .env  
**Database error?** Verify PostgreSQL is running  

---

**Ready to test locally?** Start with **Step 1: Create Database** above.

Good luck! 🚀
