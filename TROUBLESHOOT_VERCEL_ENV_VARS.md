# Troubleshooting: Environment Variables Not Working in Vercel

If you've added environment variables in Vercel but they're still showing as missing, follow these steps:

## Step 1: Verify Variables Are Actually Set

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Make sure you see all 6 variables listed:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DB_SSL`

## Step 2: Check Environment Scope

**CRITICAL**: Make sure variables are set for the correct environment:

1. For each variable, check the **"Environment"** column
2. It should show: **Production**, **Preview**, and/or **Development**
3. If you're testing on production, make sure **Production** is checked
4. If variables are only set for Development, they won't work in Production

**To fix:**
- Click on each variable
- Make sure **Production** is selected (and Preview/Development if needed)
- Click **"Save"**

## Step 3: Check for Typos

Common mistakes:
- ❌ `db_host` (lowercase) → Should be `DB_HOST` (uppercase)
- ❌ `DBHOST` (no underscore) → Should be `DB_HOST`
- ❌ `DB_HOST ` (trailing space) → Should be `DB_HOST` (no spaces)
- ❌ `DB_HOST=` (with equals sign) → Just use `DB_HOST` as the key

## Step 4: Redeploy After Adding Variables

**IMPORTANT**: Environment variables are only loaded when the app is deployed.

1. Go to **Deployments** tab
2. Click the **three dots (⋯)** on your latest deployment
3. Click **"Redeploy"**
4. **Wait for deployment to complete** (this is crucial!)

## Step 5: Test Using Diagnostic Endpoint

After redeploying, visit:
```
https://your-app.vercel.app/api/test-db-connection
```

This will show you:
- Which variables are actually being read
- What values are set (passwords hidden)
- Vercel environment information

## Step 6: Check Vercel Function Logs

1. Go to **Deployments** → Latest Deployment → **Functions** tab
2. Look for logs starting with `[MySQL] Environment check:`
3. This shows exactly what environment variables are being read

## Common Issues

### Issue 1: Variables Set for Wrong Environment
**Symptom**: Variables show in Vercel but app says they're missing

**Solution**: 
- Edit each variable
- Make sure **Production** environment is selected
- Redeploy

### Issue 2: Variables Added But Not Redeployed
**Symptom**: Variables are in Vercel settings but not working

**Solution**: 
- Go to Deployments → Redeploy
- Wait for deployment to finish
- Test again

### Issue 3: Variable Names Have Typos
**Symptom**: Some variables work but others don't

**Solution**: 
- Double-check variable names are exactly: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`
- Case-sensitive! Must be uppercase

### Issue 4: Values Have Extra Spaces
**Symptom**: Connection fails even though variables are set

**Solution**: 
- Edit each variable
- Remove any spaces before/after the value
- Don't add quotes around values

## Step 7: Verify Using Vercel CLI (Optional)

If you have Vercel CLI installed:

```bash
vercel env ls
```

This shows all environment variables for your project.

## Quick Fix Checklist

- [ ] All 6 variables are in Vercel Settings → Environment Variables
- [ ] Each variable has **Production** environment selected
- [ ] Variable names are exactly: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` (uppercase, with underscores)
- [ ] No typos in variable names
- [ ] No spaces in variable names or values
- [ ] Redeployed after adding/updating variables
- [ ] Tested using `/api/test-db-connection` endpoint
- [ ] Checked Vercel function logs for `[MySQL] Environment check:`

## Still Not Working?

1. **Delete and re-add variables**:
   - Delete all DB_* variables
   - Add them again one by one
   - Make sure Production is selected
   - Redeploy

2. **Check Vercel logs**:
   - Look for `[MySQL] Environment check:` in function logs
   - This shows exactly what's being read

3. **Contact Vercel support**:
   - If variables are set correctly but still not working
   - Include the output from `/api/test-db-connection`

