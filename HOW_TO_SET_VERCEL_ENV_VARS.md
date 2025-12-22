# How to Set Environment Variables in Vercel

## Quick Steps to Fix "Missing required database environment variables"

### Step 1: Go to Vercel Dashboard
1. Open your browser and go to: **https://vercel.com/dashboard**
2. Log in to your Vercel account

### Step 2: Select Your Project
1. Find and click on your project: **bonus-repair-desk** (or whatever you named it)

### Step 3: Open Settings
1. Click on the **"Settings"** tab at the top of the page
2. In the left sidebar, click on **"Environment Variables"**

### Step 4: Add Each Environment Variable
Click **"Add New"** and add each variable one by one:

#### Variable 1: DB_HOST
- **Key**: `DB_HOST`
- **Value**: Your Aiven database host (e.g., `your-db-12345.aivencloud.com`)
- **Environment**: Select **Production**, **Preview**, and **Development** (or at least **Production**)
- Click **"Save"**

#### Variable 2: DB_PORT
- **Key**: `DB_PORT`
- **Value**: Your Aiven database port (usually a 5-digit number like `12345`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 3: DB_USER
- **Key**: `DB_USER`
- **Value**: Your Aiven database username (usually `avnadmin`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 4: DB_PASSWORD
- **Key**: `DB_PASSWORD`
- **Value**: Your Aiven database password (copy from Aiven dashboard)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 5: DB_NAME
- **Key**: `DB_NAME`
- **Value**: Your database name (usually `admin_panel_db` or `defaultdb`)
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

#### Variable 6: DB_SSL
- **Key**: `DB_SSL`
- **Value**: `true`
- **Environment**: Select **Production**, **Preview**, and **Development**
- Click **"Save"**

### Step 5: Get Your Database Credentials from Aiven

If you don't know your database credentials:

1. Go to **https://console.aiven.io/** and log in
2. Click on your **MySQL service**
3. Go to the **"Overview"** tab
4. Look for **"Connection information"** or **"Service URI"**
5. You'll see:
   - **Host**: Something like `your-db-12345.aivencloud.com`
   - **Port**: A 5-digit number
   - **Database name**: Usually `defaultdb` or your custom name
   - **User**: Usually `avnadmin`
   - **Password**: Click "Show" to reveal it

### Step 6: Redeploy Your Application

**IMPORTANT**: After adding environment variables, you MUST redeploy:

1. Go back to your Vercel project dashboard
2. Click on the **"Deployments"** tab
3. Find your latest deployment
4. Click the **three dots (⋯)** next to it
5. Click **"Redeploy"**
6. Wait for the deployment to complete

### Step 7: Verify It Works

1. After redeployment, try registering a user again
2. Or visit: `https://your-app.vercel.app/api/test-db-connection`
3. You should see: `"success": true` and connection details

## Visual Guide (Text-Based)

```
Vercel Dashboard
  └── Your Project (bonus-repair-desk)
      └── Settings (top tab)
          └── Environment Variables (left sidebar)
              └── Add New (button)
                  └── Add each variable:
                      1. DB_HOST = your-host.aivencloud.com
                      2. DB_PORT = 12345
                      3. DB_USER = avnadmin
                      4. DB_PASSWORD = your-password
                      5. DB_NAME = admin_panel_db
                      6. DB_SSL = true
              └── After adding all, go to Deployments → Redeploy
```

## Common Mistakes to Avoid

❌ **Don't** add quotes around values (e.g., `"admin_panel_db"` → should be `admin_panel_db`)
❌ **Don't** add spaces before or after values
❌ **Don't** forget to select the environment (Production/Preview/Development)
❌ **Don't** forget to redeploy after adding variables
❌ **Don't** use `localhost` for DB_HOST (use your Aiven host)

## Still Not Working?

1. **Double-check** all 6 variables are added
2. **Verify** values match your Aiven dashboard exactly
3. **Make sure** you redeployed after adding variables
4. **Check** Vercel logs for detailed error messages
5. **Test** using `/api/test-db-connection` endpoint

## Quick Copy-Paste Checklist

After setting variables, verify you have:
- [ ] DB_HOST = (your Aiven host)
- [ ] DB_PORT = (your Aiven port)
- [ ] DB_USER = (your Aiven username)
- [ ] DB_PASSWORD = (your Aiven password)
- [ ] DB_NAME = (your database name)
- [ ] DB_SSL = true
- [ ] All variables set for Production environment
- [ ] Redeployed after adding variables

