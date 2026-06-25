# FunSpot Quest 🎮📖📝

A kids' education website (games, stories, worksheets, and coin rewards) with
a real backend — accounts, saved progress, and an admin panel — built so a
complete beginner can run it on their own computer.

## What's inside

```
FunSpot Quest/
├── package.json        ← project info & dependencies
├── .env                 ← server settings (port, secret key)
├── backend/
│   ├── server.js        ← the web server (Express)
│   ├── db.js             ← the "database" (a JSON file, auto-created)
│   ├── auth.js           ← login/signup security helpers
│   └── data/              ← db.json lives here once the server runs
└── frontend/
    ├── index.html        ← the kids' website
    └── admin.html        ← the admin panel
```

## How to run it (step by step)

You only need **Node.js** installed. If you don't have it yet, download it
from [nodejs.org](https://nodejs.org) (the "LTS" version) and install it like
any other program.

1. **Open a terminal.**
   - Mac: open the "Terminal" app.
   - Windows: open "Command Prompt" or "PowerShell".
2. **Move into the project folder.** If you placed it on your Desktop:
   ```
   cd Desktop/FunSpot Quest
   ```
3. **Install the dependencies** (only needed once, or after you delete the
   `node_modules` folder):
   ```
   npm install
   ```
   This downloads a handful of small packages. It's normal for it to take
   10–30 seconds.
4. **Start the server:**
   ```
   npm start
   ```
   You'll see a message confirming it's running.
5. **Open the website.** In your browser, go to:
   ```
   http://localhost:4000
   ```
6. **Open the admin panel.** In your browser, go to:
   ```
   http://localhost:4000/admin
   ```
   Log in with:
   - Email: `admin@funspotquest.com`
   - Password: `admin123`

   ⚠️ **Change this password** (or at least keep it secret) before letting
   anyone else use this site, especially if you ever put it on the internet.

To stop the server, go back to the terminal and press `Ctrl + C`.

## Where the data is stored

Everything — user accounts, coins, progress, stories, games, worksheets — is
stored in one file: `backend/data/db.json`. It's created automatically the
first time you run `npm start`. There's no separate database program to
install.

- **Want a totally fresh start?** Just delete `backend/data/db.json` and
  restart the server — it will recreate the original sample content (12
  stories, 8 games, 8 worksheets, and the admin account).
- **Want to back up your data?** Just copy that one file somewhere safe.

## What's real vs. what's a placeholder

Everything described below is fully working with real data saved to disk:
- Sign up / log in (passwords are securely hashed, not stored in plain text)
- Earning coins for playing games, reading stories, and downloading
  worksheets
- Saved progress per user
- The full admin panel: managing stories/games/worksheets, viewing real user
  counts, suspending/deleting users, setting which story is "today's story"

Two things are intentionally **not** hooked up to a real outside service,
since that requires you to sign up for paid third-party accounts:
- **Payments** — the "Subscribe" button records which plan someone picked,
  but there's no real credit card processing (e.g. Stripe) wired in yet.
- **Forgot password emails** — clicking "forgot password" is acknowledged,
  but no real email gets sent (that requires an email-sending service like
  SendGrid).

The admin panel's "Revenue" chart and a few "Recent Activity" entries on the
dashboard are still decorative sample numbers for the same reason — there's
no real payment data yet to chart.

## Common hiccups

- **"Port 4000 already in use"** — something else is already running on that
  port. Either stop that program, or open `.env` and change `PORT=4000` to
  a different number like `PORT=4001`.
- **Nothing happens when you visit localhost:4000** — make sure the terminal
  window is still open and showing the "server is running" message. If you
  closed that terminal, the server stopped too.
