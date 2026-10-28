// App.js — updated with adblocker injected
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { ADBLOCKER_SCRIPT, BLOCKED_HOSTS } from "./adblock.js";

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        source={{ uri: "https://cinejoy.pk" }}
        style={{ flex: 1 }}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        mixedContentMode="always"
        onShouldStartLoadWithRequest={(req) => {
          // block navigation to ad domains at the native level
          try {
            const host = new URL(req.url).hostname.replace(/^www\./, "");
            const blocked = BLOCKED_HOSTS.some(
              b => host === b || host.endsWith("." + b)
            );
            if (blocked) {
              console.log("[native block]", req.url);
              return false; // kills the request before it even fires
            }
          } catch {}
          return true;
        }}
        injectedJavaScriptBeforeContentLoaded={ADBLOCKER_SCRIPT}
        onShouldStartLoadWithRequest={(req) => {
          try {
            const host = new URL(req.url).hostname.replace(/^www\./, "");
            return !BLOCKED_HOSTS.some(b => host === b || host.endsWith("." + b));
          } catch { return true; }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});