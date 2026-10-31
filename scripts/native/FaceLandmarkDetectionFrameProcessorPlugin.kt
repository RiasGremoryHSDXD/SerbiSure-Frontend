package com.reactnativemediapipe.facelandmarkdetection

import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Log
import androidx.camera.core.ImageProxy
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.reactnativemediapipe.shared.orientationToDegrees

// Keep the RGB -> Bitmap -> rotated Bitmap input used by react-native-mediapipe
// 0.6.0 in the working 0.1.7 APK. The camera must continue requesting RGB frames.
class FaceLandmarkDetectionFrameProcessorPlugin : FrameProcessorPlugin() {
  private var bitmapBuffer: Bitmap? = null

  override fun callback(frame: Frame, params: MutableMap<String, Any>?): Any? {
    val detectorHandle = (params?.get("detectorHandle") as? Double) ?: return false
    val detector = FaceLandmarkDetectorMap.detectorMap[detectorHandle.toInt()] ?: return false

    return try {
      val bitmap = imageToBitmap(frame.imageProxy)
      val matrix = Matrix().apply {
        postRotate(orientationToDegrees(frame.orientation).toFloat())
      }
      val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      val mpImage = BitmapImageBuilder(rotated).build()
      // Preserve the baseline's bitmap rotation AND detector orientation contract.
      detector.detectLiveStream(mpImage, frame.orientation)
      true
    } catch (error: Exception) {
      Log.e("FaceLandmarkDetection", "RGB bitmap frame processing failed", error)
      false
    }
  }

  private fun imageToBitmap(image: ImageProxy): Bitmap {
    require(image.width > 0 && image.height > 0) { "Empty camera frame" }
    val plane = image.planes.firstOrNull() ?: error("Missing RGB camera pixels")
    val rowBytes = image.width * 4
    require(plane.pixelStride == 4 && plane.rowStride >= rowBytes) { "Expected RGBA camera pixels" }
    val pixels = plane.buffer.duplicate().apply { rewind() }
    require(pixels.remaining() >= (image.height - 1) * plane.rowStride + rowBytes) { "Incomplete RGB camera frame" }

    var bitmap = bitmapBuffer
    if (bitmap == null || bitmap.width != image.width || bitmap.height != image.height) {
      bitmap = Bitmap.createBitmap(image.width, image.height, Bitmap.Config.ARGB_8888)
      bitmapBuffer = bitmap
    }
    if (plane.rowStride == rowBytes) {
      bitmap.copyPixelsFromBuffer(pixels)
    } else {
      // Some camera drivers pad each row. Strip that padding before copying,
      // rather than shifting rows and feeding a distorted face to MediaPipe.
      val packed = java.nio.ByteBuffer.allocate(rowBytes * image.height)
      val row = ByteArray(rowBytes)
      for (y in 0 until image.height) {
        pixels.position(y * plane.rowStride)
        pixels.get(row)
        packed.put(row)
      }
      packed.rewind()
      bitmap.copyPixelsFromBuffer(packed)
    }
    return bitmap
  }
}
