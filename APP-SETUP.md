# Kinora apps: Windows (.exe) and Android (.apk)

Everything here builds on GitHub's free servers, so you do not need Android Studio, Visual Studio or any
coding tools. You only need a free GitHub account.

## Build both apps (about 15 minutes, one time)
1. Go to github.com -> New repository. Name it `kinora`, set it to Private, click Create.
2. Unzip `kinora-app.zip` on your computer.
3. On the new repository page click "uploading an existing file". Open the unzipped folder, select ALL its
   contents (including the `.github` folder) and drag them into the page. Click "Commit changes".
   If the `.github` folder does not upload, click "Add file" -> "Create new file", type
   `.github/workflows/build-windows.yml`, paste the file's contents, commit; repeat for `build-android.yml`.
4. Click the "Actions" tab. If asked, click "I understand my workflows, go ahead and enable them".
5. Click "Build Windows app (EXE)" -> "Run workflow". Do the same for "Build Android app (APK)".
6. Wait until each shows a green tick (Windows about 5 minutes, Android about 10).
7. Open the finished run -> scroll to "Artifacts" -> download:
   - `Kinora-Windows`: contains `Kinora-Setup-1.0.0.exe` (installer) and `Kinora-Portable-1.0.0.exe` (no install).
   - `Kinora-Android-APK`: contains `app-debug.apk`.

If a build shows a red cross, open it, copy the red error text and send it to me.

## Install
- Windows: run the installer (or the portable file). Windows SmartScreen may say "unknown publisher" because the app
  is not paid-signed: click "More info" -> "Run anyway".
- Android: copy `app-debug.apk` to the phone, open it, and allow "Install unknown apps" for your file manager or browser.

## Even easier: install the website as an app (no build)
After you put the `www` folder on a host such as Vercel (drag the folder onto vercel.com/new):
- Android (Chrome): menu -> "Install app" or "Add to Home screen".
- Windows (Edge or Chrome): address bar install icon -> Install.

## What is different in the apps
- Windows: has a streaming server built in (like Stremio's). It plays http links, links that need special headers, and
  converts formats browsers cannot play (HEVC, DTS, AC3) automatically. Nothing to set up. It needs a PC that can run
  ffmpeg; heavy conversions use CPU.
- Android: uses the phone's own video decoder (most phones play HEVC) and makes network requests natively, so more
  sources and plain http links work. For files the phone cannot play, add your own playback server in Settings.
- Sign-in: email and password work in both apps. "Continue with Google" is hidden inside the apps because Google blocks
  sign-in from embedded windows. Use the website once for Google, or just use email.
- Accounts, sync, settings and everything else are the same as the website.

## Updating later
Replace `www/index.html` in the repository with the newest version and commit. The workflows rebuild both apps.
