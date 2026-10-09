# Start your backend project

This is the updated version of Project_new.zip. Use this whole folder; no need to copy individual code files into the old project.

## First launch on Windows

1. Extract the ZIP. Open the folder containing package.json and open a terminal there.
2. Check `node --version`. This backend needs Node.js 24 or newer.
3. Run `npm.cmd install` once. The ZIP excludes node_modules to keep it small.
4. Copy `.env.example` to `.env` in the same folder:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

5. Paste each credential after its matching name and save. Do not paste curl commands. Google Play uses `SCRAPPA_GOOGLE_PLAY_API_KEY`, falling back to `SCRAPPA_API_KEY`. The three X endpoints use `SCRAPPA_X_PROFILE_API_KEY`, `SCRAPPA_X_USER_SEARCH_API_KEY`, and `SCRAPPA_X_POST_SEARCH_API_KEY`. Other recognized names are `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `TAVILY_API_KEY`.
6. Run `npm.cmd run dev`. This starts both frontend and backend.
7. Wait for the frontend address and open http://127.0.0.1:5173. Keep the terminal running. First launch can take a little while.

The backend uses port 3001. Stop older project terminals using ports 5173 or 3001 before starting. Ctrl+C stops the project. Restart after editing .env.

## First demonstration

1. In Brand Registry, add official brand details: name, industry, website, social handles, and official app names. Registry information is supplied by you, not independently verified.
2. Wait until the top bar says **Saved to database**.
3. In Quick Analyze, use **Check a Google Play app**. Select the brand and enter a package ID or Google Play app details URL.
4. Click **Check and save**. Each submission can consume Scrappa credits.
5. Open the saved investigation to see evidence, comparisons, and missing information. Use existing controls to create a case.
6. Refresh or restart: your workspace remains in the database.

## Test the other integrations

1. Open **Quick Analyze → Live social and web lookup** to run X profile/search, Facebook profile, YouTube, or Tavily lookups.
2. After a successful lookup, click **Explain evidence with Gemini** to generate a cautious review explanation.

Social/web lookup results and Gemini explanations are saved in API activity. They do not automatically become dashboard threats or receive a brand-specific fraud verdict. Google Play checks separately compare the submitted app with the selected brand registry.

## Moving from your previous version

Stop the old project with Ctrl+C. Extract this archive to a new folder. Copy your private `.env` file and entire `data` folder from the old project into the new folder containing `package.json`. Keep the old folder as a backup. Run `npm.cmd install` and then `npm.cmd run dev` in the new folder. Do not run both versions at once. Compare credential names with `.env.example`; keep actual keys only in `.env`.

If Facebook has its own Scrappa key, use `SCRAPPA_FACEBOOK_PROFILE_API_KEY`. If not, the backend falls back to `SCRAPPA_API_KEY`.

Prepared sample assessments remain below the live form. Lumora Pay and Kestrel Air are fictional. Do not present prepared records as actual discoveries. Comparing an unrelated real app against a fictional brand is not a valid demonstration of impersonation.

## Included

- SQLite persistence for brands, findings, cases, settings and notes.
- Separate scan history with timestamps and failures, plus snapshots of successful findings.
- Google Play retrieval through Scrappa: https://scrappa.co/docs/google-play-api/google_play_details.
- Rule-based title, publisher, website and wording comparisons with evidence and missing-data notices.
- Repeated checks update an existing finding rather than creating duplicates.
- Revision conflict detection to prevent stale browser windows silently overwriting changes.

## Still to be added

- Apple App Store and additional social platforms.
- Scheduled checks and automatic discovery of new accounts or apps.
- Screenshot analysis, icon comparison, malware analysis and bulk import.
- Authentication, multi-user authorization and production hosting configuration.

This is a local, single-user hackathon backend, bound to your own computer. The frontend production build does not deploy the separate backend or database. X and Facebook data is retrieved through the third-party Scrappa service; YouTube and Gemini use their official APIs; web search uses Tavily.

## Private files

- `.env`: your key. Do not upload, commit, or share it. Never use a VITE_ prefix for secrets.
- `data/brandshield.sqlite`: created automatically at startup. Keep this file to retain your work.
- To back up, stop the project and copy the entire data folder somewhere safe. Do not share it publicly.
- The initial database contains the supplied project's sample records. Old browser localStorage edits are not automatically imported.

## Troubleshooting

- Backend unavailable: start with `npm.cmd run dev`, not the frontend-only command.
- Missing or rejected key: check .env and restart. Do not send the key in chat.
- Quota or rate limit: check your Scrappa dashboard or wait. This project never purchases credits or upgrades plans automatically.
- Missing title or changed response format: no finding is created. Share a response example with secrets removed so we can adjust the mapping.
- Changes not saved: keep the page open and click Retry save. If another window changed the workspace, copy unsaved notes before reloading.
- Port in use: stop the older terminal using Ctrl+C.

## Verification

- `npm.cmd run test:backend`: backend tests with simulated provider responses; no API credits used.
- `npx.cmd tsc --noEmit`: frontend type checks.
- `npm.cmd run build`: frontend production build.

A successful live request still needs a working credential. Configured means a credential is present, not that the provider has accepted it. Use API Diagnostics to verify each provider separately.
