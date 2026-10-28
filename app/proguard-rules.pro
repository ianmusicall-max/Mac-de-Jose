# Models are only moved around in-process; keep names stable for Room/Parcel use.
-keep class com.macdejose.videovault.resolver.** { *; }
-keep class com.macdejose.videovault.data.db.** { *; }

# OkHttp ships optional platform hooks that are absent at runtime.
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# JS bridge used by the in-app browser sniffer.
-keepclassmembers class com.macdejose.videovault.ui.browser.SnifferBridge {
    public *;
}
