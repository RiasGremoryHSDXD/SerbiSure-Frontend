const fs = require('fs');
const path = require('path');

function writeIfChanged(file, content) {
  if (fs.readFileSync(file, 'utf8') !== content) fs.writeFileSync(file, content, 'utf8');
}

function patchMediaPipe(projectRoot = path.join(__dirname, '..')) {
  const packageRoot = path.join(projectRoot, 'node_modules', 'react-native-mediapipe');
  const { version } = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (version !== '0.6.0') {
    throw new Error('MediaPipe native compatibility patch requires 0.6.0; found ' + version + '. Review the native adapter before upgrading.');
  }
  const javaRoot = path.join(packageRoot, 'android', 'src', 'main', 'java', 'com', 'reactnativemediapipe');
  const convertHelpers = path.join(javaRoot, 'shared', 'ConvertHelpers.kt');
  // 270 and -90 describe the same rotation; keep the normalized value.
  writeIfChanged(convertHelpers, fs.readFileSync(convertHelpers, 'utf8')
    .replace('Orientation.LANDSCAPE_RIGHT -> -90', 'Orientation.LANDSCAPE_RIGHT -> 270'));

  // Persist the working APK's Bitmap input path across installs and local builds.
  const plugin = path.join(javaRoot, 'facelandmarkdetection', 'FaceLandmarkDetectionFrameProcessorPlugin.kt');
  writeIfChanged(plugin, fs.readFileSync(path.join(__dirname, 'native', 'FaceLandmarkDetectionFrameProcessorPlugin.kt'), 'utf8'));

  const helper = path.join(javaRoot, 'facelandmarkdetection', 'FaceLandmarkDetectorHelper.kt');
  // The current challenge uses landmarks, not transformation matrices. Restore
  // the baseline's output options instead of calculating an unused extra output.
  writeIfChanged(helper, fs.readFileSync(helper, 'utf8')
    .replace(/\r?\n[ \t]*\.setOutputFacialTransformationMatrixes\(true\)/g, ''));

  // Preserve the existing iOS behavior; this compatibility fix targets Android.
  const swiftHelper = path.join(packageRoot, 'ios', 'facelandmarkdetection', 'FaceLandmarkDetectorHelper.swift');
  if (fs.existsSync(swiftHelper)) {
    const content = fs.readFileSync(swiftHelper, 'utf8');
    if (!content.includes('outputFacialTransformationMatrixes')) {
      writeIfChanged(swiftHelper, content.replace(
        'faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate',
        'faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate\n    faceLandmarkerOptions.outputFacialTransformationMatrixes = true',
      ));
    }
  }
  console.log('MediaPipe Android compatibility applied: RGB Bitmap input, landmark-based liveness.');
}

if (require.main === module) patchMediaPipe();
module.exports = { patchMediaPipe };

