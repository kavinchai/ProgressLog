# Releasing the iOS app

The iOS app is the React frontend packaged with Capacitor. Each build carries
its own copy of the frontend, so frontend changes only reach phones through a
new build. Backend changes on Railway reach every installed copy immediately,
so keep the API backward-compatible: add fields, don't rename or remove them.

## 1. Bump the version

Open `frontend/ios/App/App.xcodeproj` in Xcode › **App** target › **General**:

- **Build** (`CURRENT_PROJECT_VERSION`): +1 for every upload, whatever the version.
- **Version** (`MARKETING_VERSION`): raise it once the previous version is
  released on the App Store (1.0 → 1.0.1 for fixes, 1.1 for features). Extra
  builds of a version that isn't released yet keep the same version.

Commit the change.

## 2. Build the web app into the iOS project

```bash
cd frontend
npm run build:ios
```

This builds against the production API and copies the result into
`frontend/ios/App/App/public`. Never archive straight after a local test
build pointed at `localhost`: always run this first.

## 3. Archive and upload

**In Xcode** (the usual way):

1. `npm run open:ios`
2. Pick **Any iOS Device (arm64)** as the run destination.
3. **Product › Archive**. The Organizer window opens when it finishes.
4. **Distribute App › App Store Connect › Upload**, then follow the prompts.
   Keep automatic signing.

**From the terminal** (what Claude runs):

```bash
cd frontend/ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/ProgressLog.xcarchive \
  -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath /tmp/ProgressLog.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath /tmp/export \
  -allowProvisioningUpdates
```

`ExportOptions.plist` needs `method` = `app-store-connect`,
`destination` = `upload`, `teamID` = `REQA8TD6QY` and
`signingStyle` = `automatic`.

If macOS asks for keychain access to the signing key, click **Always Allow**.

## 4. TestFlight

The build appears in App Store Connect › **TestFlight** after 10–30 minutes of
processing. Apple emails you when it's ready.

1. Answer the encryption question: **None of the algorithms mentioned above**
   (the app only uses Apple's built-in HTTPS).
2. Add yourself under **Internal Testing** (first time only).
3. Install it with the TestFlight app on your iPhone.

TestFlight builds never affect a version that's waiting for review.

## 5. Submit an update to the App Store

1. App Store Connect › **Distribution** › **+** next to iOS App, and enter the
   new version (for example 1.0.1).
2. Fill in **What's New in This Version**.
3. Under **Build**, pick the new build.
4. **Add for Review** › **Submit for Review**.

To swap the build of a version that's already waiting for review, cancel the
submission on the version page first. Resubmitting puts you back in the queue.
