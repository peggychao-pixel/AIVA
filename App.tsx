import React from "react";
import { SafeAreaView, ActivityIndicator, View, Text, StyleSheet, Linking } from "react-native";
import { WebView } from "react-native-webview";

const APP_URL = "https://你的正式網站網址";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: APP_URL }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading Untangle...</Text>
          </View>
        )}
        renderError={(errorName) => (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Couldn’t open Untangle</Text>
            <Text style={styles.errorText}>{String(errorName)}</Text>
            <Text style={styles.errorLink} onPress={() => Linking.openURL(APP_URL)}>
              Open in browser
            </Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F3EF" },
  webview: { flex: 1, backgroundColor: "#F5F3EF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F5F3EF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6F7F79",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#2F2A27",
  },
  errorText: {
    fontSize: 14,
    color: "#7B726B",
    textAlign: "center",
    marginBottom: 16,
  },
  errorLink: {
    fontSize: 16,
    color: "#6F9B8F",
    textDecorationLine: "underline",
  },
});
