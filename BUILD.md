# NexaCleaner Pro — How to Run

## ── Mac App ──────────────────────────────────────

### Step 1 — Install (one time only)
Open Terminal, cd into this folder, run:
```
npm install
```
Wait for it to finish (downloads Electron, ~600 MB).

### Step 2 — Run the app
```
npm run go
```
This builds the app and opens the NexaCleaner window.
From now on you can just use `npm run go` every time.

### Step 3 — Build a .dmg installer (optional)
```
npm run dist:mac
```
Output: `release/NexaCleaner Pro-1.0.0.dmg`
Double-click to install like any Mac app.

---

## ── iPhone App ───────────────────────────────────

### Step 1 — Install Xcode from the Mac App Store

### Step 2 — Run these once
```
npm install
sudo gem install cocoapods
npx cap add ios
npm run ios:sync
cd ios/App && pod install && cd ../..
```

### Step 3 — Open in Xcode and run on your iPhone
```
npm run ios:open
```
Then press the ▶ Play button in Xcode with your iPhone connected.

---

## ── Open in any Browser ──────────────────────────

```
npm install
npm run dev
```
Then open http://localhost:5173 in any browser.
Works on Mac, Windows, Linux, Android, iPhone browser.

---

## What gets scanned on your real Mac
- Xcode Derived Data
- App Store Cache
- Safari Cache
- All App Caches
- Zoom Cache
- Mail Temp Files
- Trash
- System & User Logs
- Crash Reports
- Homebrew Cache
- System Temp Files
