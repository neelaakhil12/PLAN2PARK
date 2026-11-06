# PlanToPark (Google Play Store) Master Keystore & Security Credentials

This document stores the official and approved keystore details, fingerprints, and Google Play credentials for **PlanToPark** (`com.plantopark.seeker`).

---

## 1. Android Upload Keystore (Used for building & signing `.aab` / `.apk`)

* **Keystore File Location:**
  - `mobile/plantopark-seeker.jks`
  - `keystore_backup/plantopark-seeker-upload-keystore.jks`
  - `@student15s-team__plantopark-seeker-keystore.bak.jks`
* **File SHA-256 Checksum:** `9FD7085CD860C988086A4A41F32F63AC45AF1F85EA4FBD581FD66D3ADA9AB88C`
* **Keystore Password (storepass):** `919b87ffcbc3866d9a4b11723f71de86`
* **Key Alias:** `1b1641400d40ad5253956f3c706bc201`
* **Key Password (keypass):** `b8858aff694a06daf191d178f3b735eb`
* **Certificate SHA-1 Fingerprint:** `A2:9A:49:6F:45:AC:6C:AB:03:B3:32:80:B1:A4:99:32:B0:40:55:E5`

---

## 2. Google Play App Signing (Google Cloud Managed)

* **Play Store Package:** `com.plantopark.seeker`
* **Play Developer Account ID:** `5215247941056806691`
* **Play App ID:** `4972377700823968863`
* **Google Play App Signing Key SHA-1:**
  `5D:97:D7:00:2F:47:CA:1A:E0:BB:00:F2:63:C4:D5:1B:75:93:44:5B`
* **Google Play App Signing Key SHA-256:**
  `85:41:BC:6E:6F:90:2D:55:F6:2D:1A:47:9B:87:59:FB:8A:09:62:CF:8B:D1:0F:BA:32:53:00:0B:AE:A9:07:CC`

---

## 3. Google OAuth & Cloud Credentials (OAuth 2.0 Clients)

* **Google Cloud Project:** `plan2park`
* **Web Client ID (Passed to GoogleSignin.configure):**
  `908977180-dkg2d8h9109b4tvsnaf51scbmi4l09or.apps.googleusercontent.com`
* **Android Client ID (Seeker Upload Key):**
  `908977180-sei0dnkqlig3ljr093imk5s0n3jalu0e.apps.googleusercontent.com`
* **Android Client ID (Play Store Distribution):**
  Uses SHA-1 `5D:97:D7:00:2F:47:CA:1A:E0:BB:00:F2:63:C4:D5:1B:75:93:44:5B`

---

## 4. EAS Build Configuration

In `mobile/eas.json`:
```json
"production": {
  "credentialsSource": "local",
  "android": {
    "buildType": "app-bundle"
  }
}
```

In `mobile/credentials.json`:
```json
{
  "android": {
    "keystore": {
      "keystorePath": "./plantopark-seeker.jks",
      "keystorePassword": "919b87ffcbc3866d9a4b11723f71de86",
      "keyAlias": "1b1641400d40ad5253956f3c706bc201",
      "keyPassword": "b8858aff694a06daf191d178f3b735eb"
    }
  }
}
```
*(Every production EAS build will automatically read and sign using this local keystore).*
