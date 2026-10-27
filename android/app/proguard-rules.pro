# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native & Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }

# VisionCamera & Worklets & Frame Processor Plugins
-keep class com.mrousavy.camera.** { *; }
-keep class com.mrousavy.camera.frameprocessors.** { *; }
-keep class * extends com.mrousavy.camera.frameprocessors.FrameProcessorPlugin { *; }
-keep class com.worklets.** { *; }

# MediaPipe & TensorFlow Lite & React Native Bridge
-keep class com.google.mediapipe.** { *; }
-keep class org.tensorflow.lite.** { *; }
-keep class com.reactnativemediapipe.** { *; }
-keepclassmembers class com.reactnativemediapipe.** { *; }
-dontwarn com.reactnativemediapipe.**

# Skia
-keep class com.shopify.reactnative.skia.** { *; }

# Suppress compile-time / annotation processor warnings in R8
-dontwarn com.google.mediapipe.proto.CalculatorProfileProto$CalculatorProfile
-dontwarn com.google.mediapipe.proto.GraphTemplateProto$CalculatorGraphTemplate
-dontwarn javax.lang.model.**
-dontwarn autovalue.shaded.**
-dontwarn com.google.auto.value.**
