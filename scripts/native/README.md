# Android face camera compatibility

`FaceLandmarkDetectionFrameProcessorPlugin.kt` adapts the Bitmap input path from
react-native-mediapipe 0.6.0, as found in the working SerbiSure 0.1.7 APK. Its
upstream license is in `LICENSE.react-native-mediapipe`.

The camera requests RGB pixels. The adapter copies those pixels to an owned
Bitmap, rotates it, and submits it with the baseline's detector orientation.
It also handles padded pixel rows and camera resolution changes. Keep that
orientation contract together with the rotation-aware JavaScript classifier;
changing only one side requires testing on an actual front camera.

`../patch-mediapipe.js` applies this file during postinstall and both local
Android build scripts. It leaves unchanged files untouched and rejects unknown
dependency versions. The Android helper does not request unused facial
transformation matrices. Normalized rotation 270 is equivalent to -90.

This is a native change: rebuild and install an APK. Clearing Metro's cache
alone cannot replace an installed native processor. Android runtime 1.0.1 in
both `app.json` and Android resources isolates it from older 1.0.0 OTA updates.
Future Android updates must target the new runtime. ARM splits, compressed
native libraries, and the uncompressed face model remain enabled.
