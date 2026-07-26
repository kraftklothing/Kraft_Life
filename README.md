# Kraft Life

Extremely simple one-page daily task app. Lists everything you want to complete today.

**This app is separate from Kraft Klothing.** It runs on port **5180** so it does not override the dress app.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5180](http://localhost:5180) **on the same machine** that is running the server.

> Cloud Agent note: `localhost` on your phone/PC will not reach the agent VM. Use the public preview link from the agent chat, or take remote desktop control of the agent and open the app there.

## Features

- Add tasks with required repetition + category (works on PC and phone)
- Repetition: Daily, Weekly, Monthly, Yearly, Custom, Does not repeat
- Default categories: General, Personal, Work — plus custom add/delete
- Top right `$X` increases by 1 each completion
- Top left completed / remaining; tap to toggle percent complete
- Swipe left/right to change days
- Drag the blue 3-bar handle to reorder
- Task badges for repetition + category
- Bottom-right profile → settings / my account

Data syncs to the cloud with a **private PIN** (no account). The same PIN on phone and PC loads the same tasks.

## Cloud PIN setup (one-time on Vercel)

Before cloud save works in production, connect Redis storage:

1. Open [kraft-life on Vercel](https://vercel.com/kraftklothings-projects/kraft-life) → **Storage** (or **Integrations**) → add **Upstash for Redis**
2. Create a database and **Connect to Project** → select **kraft-life**
3. **Redeploy** the latest production deployment (Deployments → ⋯ → Redeploy)

Then visit **https://kraft-life.vercel.app**, create your 4–6 digit PIN once, and use that same PIN on every device.

- **Remember on this device** keeps you signed in on that phone/PC
- **Settings → Lock Kraft Life** requires the PIN again (useful on shared devices)

Local-only fallback: if Redis is not set up yet, the app still works with browser storage on that device.

## Vercel (permanent link)

This repo is connected to the [kraft-life](https://vercel.com/kraftklothings-projects/kraft-life) project on Vercel. Every push to `master` triggers a production deploy.

**Production URL:** https://kraft-life.vercel.app (or the domain shown under Vercel → Domains)

### Connect Cursor to Vercel

1. In Cursor, open **Settings → MCP** (or use the one-click install from [Vercel MCP docs](https://vercel.com/docs/mcp/vercel-mcp)).
2. Confirm `.cursor/mcp.json` includes the Vercel server (already in this repo).
3. Click **Needs login** next to the Vercel MCP server and sign in with your Vercel account.
4. For **Cloud Agents**, also add Vercel under **Cursor Dashboard → Integrations & MCP** so agents can check deploys and logs.

After merging to `master`, Vercel rebuilds automatically — no manual deploy step needed.
