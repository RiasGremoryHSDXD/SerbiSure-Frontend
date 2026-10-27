const fs = require('fs');
const path = require('path');

// 1. Patch ConvertHelpers.kt
const convertHelpersPath = path.join(__dirname, '..', 'node_modules', 'react-native-mediapipe', 'android', 'src', 'main', 'java', 'com', 'reactnativemediapipe', 'shared', 'ConvertHelpers.kt');
if (fs.existsSync(convertHelpersPath)) {
  let content = fs.readFileSync(convertHelpersPath, 'utf8');
  if (content.includes('Orientation.LANDSCAPE_RIGHT -> -90')) {
    content = content.replace('Orientation.LANDSCAPE_RIGHT -> -90', 'Orientation.LANDSCAPE_RIGHT -> 270');
    fs.writeFileSync(convertHelpersPath, content, 'utf8');
    console.log('Patched ConvertHelpers.kt (-90 -> 270)');
  }
}

// 2. Patch FaceLandmarkDetectionFrameProcessorPlugin.kt
const pluginPath = path.join(__dirname, '..', 'node_modules', 'react-native-mediapipe', 'android', 'src', 'main', 'java', 'com', 'reactnativemediapipe', 'facelandmarkdetection', 'FaceLandmarkDetectionFrameProcessorPlugin.kt');
if (fs.existsSync(pluginPath)) {
  const replacement = `package com.reactnativemediapipe.facelandmarkdetection

import android.util.Log
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin

class FaceLandmarkDetectionFrameProcessorPlugin() : FrameProcessorPlugin() {

  companion object {
    private const val TAG = "FaceLandmarkDetectionFrameProcessorPlugin"
  }

  override fun callback(frame: Frame, params: MutableMap<String, Any>?): Any? {
    val detectorHandle = (params?.get("detectorHandle") as? Double) ?: return false
    val detector = FaceLandmarkDetectorMap.detectorMap[detectorHandle.toInt()] ?: return false

    try {
      val image = frame.image ?: return false
      val mpImage = MediaImageBuilder(image).build()
      detector.detectLiveStream(mpImage, frame.orientation)
      return true
    } catch (e: Throwable) {
      Log.e(TAG, "FaceLandmarkDetection frame processing failed: \${e.message}", e)
      return false
    }
  }
}
`;
  fs.writeFileSync(pluginPath, replacement, 'utf8');
  console.log('Patched FaceLandmarkDetectionFrameProcessorPlugin.kt (using MediaImageBuilder)');
}

// 3. Patch FaceLandmarkDetectorHelper.kt to enable outputFacialTransformationMatrixes
const helperPath = path.join(__dirname, '..', 'node_modules', 'react-native-mediapipe', 'android', 'src', 'main', 'java', 'com', 'reactnativemediapipe', 'facelandmarkdetection', 'FaceLandmarkDetectorHelper.kt');
if (fs.existsSync(helperPath)) {
  let content = fs.readFileSync(helperPath, 'utf8');
  if (content.includes('.setOutputFaceBlendshapes(true)') && !content.includes('.setOutputFacialTransformationMatrixes(true)')) {
    content = content.replace(
      '.setOutputFaceBlendshapes(true)',
      '.setOutputFaceBlendshapes(true)\n          .setOutputFacialTransformationMatrixes(true)'
    );
    fs.writeFileSync(helperPath, content, 'utf8');
    console.log('Patched FaceLandmarkDetectorHelper.kt (setOutputFacialTransformationMatrixes = true)');
  }
}

// 4. Patch FaceLandmarkDetectorHelper.swift to enable outputFacialTransformationMatrixes
const swiftHelperPath = path.join(__dirname, '..', 'node_modules', 'react-native-mediapipe', 'ios', 'facelandmarkdetection', 'FaceLandmarkDetectorHelper.swift');
if (fs.existsSync(swiftHelperPath)) {
  let content = fs.readFileSync(swiftHelperPath, 'utf8');
  if (content.includes('faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate') && !content.includes('outputFacialTransformationMatrixes')) {
    content = content.replace(
      'faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate',
      'faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate\n    faceLandmarkerOptions.outputFacialTransformationMatrixes = true'
    );
    fs.writeFileSync(swiftHelperPath, content, 'utf8');
    console.log('Patched FaceLandmarkDetectorHelper.swift (outputFacialTransformationMatrixes = true)');
  }
}

