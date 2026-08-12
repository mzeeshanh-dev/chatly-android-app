# React Native standard ProGuard rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.shopify.reactnative.flash_list.** { *; }
-keep class com.horcrux.svg.** { *; }

# react-native-screens / react-native-safe-area-context — every screen goes
# through these (React Navigation's native-stack + SafeAreaProvider render on
# the very first frame). Neither library ships its own consumer ProGuard
# rules, so without an explicit keep here R8 renames these classes in release
# builds and JNI's FindClass lookup fails immediately on launch — this was
# causing "Chatly keeps stopping" right after opening the app.
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# Other native-module libraries with no consumer ProGuard rules of their own.
-keep class com.BV.LinearGradient.** { *; }
-keep class com.airbnb.android.react.lottie.** { *; }
-keep class com.reactnativekeyboardcontroller.** { *; }
-keep class com.imagepicker.** { *; }
-keep class org.asyncstorage.** { *; }

# Generic safety net: any class with a JNI-bound native method, or annotated
# @DoNotStrip, must keep both its name and its members intact — obfuscation
# (not just removal) breaks JNI's by-name class/method lookup at runtime.
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }

# Firebase & Google Play Services ProGuard rules
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Notifee / Android Notifications
-keep class io.invertase.notifee.** { *; }
-keep class io.invertase.firebase.** { *; }

# Ignore benign warnings for unsupported libraries or compile-only dependencies
-dontwarn com.facebook.react.**
-dontwarn com.google.firebase.**
-dontwarn javax.annotation.**
-dontwarn org.slf4j.**
