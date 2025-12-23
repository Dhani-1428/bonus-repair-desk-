# How to Check Which Database is Used in Vercel

## Method 1: Check Vercel Environment Variables (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Log in to your account

2. **Select Your Project**
   - Click on your project: **bonus-repair-desk** (or your project name)

3. **Go to Settings → Environment Variables**
   - Click on **"Settings"** tab at the top
   - Click on **"Environment Variables"** in the left sidebar

4. **Find DB_NAME**
   - Look for the variable named `DB_NAME`
   - The value shown is the database name your app is using
   - Common values: `admin_panel_db` or `defaultdb`

## Method 2: Use the Test Endpoint (Live Check)

1. **Visit the test endpoint on your live site:**
   ```
   https://your-app.vercel.app/api/test-db-connection
   ```
   (Replace `your-app.vercel.app` with your actual Vercel deployment URL)

2. **Check the response:**
   - Look for `"DB_NAME": "✓ Set (database_name)"` in the `environment` section
   - Look for `"current_db": "database_name"` in the `testQuery` section
   - This shows the actual database being used

## Method 3: Check Vercel Function Logs

1. **Go to Vercel Dashboard** → Your Project → **Deployments**
2. **Click on your latest deployment**
3. **Go to the "Functions" tab**
4. **Look for logs that show:**
   ```
   [MySQL] Connection config: { database: 'database_name' }
   ```

## What to Look For

- **If `DB_NAME` is set to `admin_panel_db`**: Your data is in the `admin_panel_db` database
- **If `DB_NAME` is set to `defaultdb`**: Your data is in the `defaultdb` database
- **If `DB_NAME` is missing**: The app defaults to `admin_panel_db`

## If You Need to Change the Database

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `DB_NAME` and click to edit it
3. Change the value to your desired database name (e.g., `defaultdb` or `admin_panel_db`)
4. **IMPORTANT**: Make sure to select **Production**, **Preview**, and **Development** environments
5. Click **"Save"**
6. **Redeploy**: Go to **Deployments** → Click **"Redeploy"** on your latest deployment

## Quick Check Command

If you have access to your Vercel CLI, you can also run:
```bash
vercel env ls
```

This will show all environment variables including `DB_NAME`.

