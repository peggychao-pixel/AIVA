import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

type EBState = { error: Error | null; componentStack: string | null };

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, componentStack: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error, componentStack: null };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Untangle] App crashed:", error.message, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }
  render() {
    const { error, componentStack } = this.state;
    if (error) {
      const cfg = {
        href: window.location.href,
        pathname: window.location.pathname,
        BASE_URL: import.meta.env.BASE_URL,
        MODE: import.meta.env.MODE,
        ua: navigator.userAgent.slice(0, 120),
      };
      return (
        <div
          style={{
            padding: 16,
            fontFamily: "monospace",
            maxWidth: 800,
            margin: "0 auto",
            color: "#1a1a1a",
            background: "#fff7f7",
            minHeight: "100vh",
            fontSize: 13,
          }}
        >
          <h1 style={{ color: "#c00", fontSize: 18, marginTop: 0 }}>
            ⚠ App Crash
          </h1>

          <h2 style={{ fontSize: 14, color: "#c00", margin: "8px 0 4px" }}>Error Message</h2>
          <pre
            style={{
              background: "#fee",
              padding: 10,
              overflow: "auto",
              fontSize: 13,
              whiteSpace: "pre-wrap",
              border: "1px solid #fcc",
              margin: 0,
            }}
          >
            {error.message}
          </pre>

          {componentStack && (
            <>
              <h2 style={{ fontSize: 14, margin: "12px 0 4px" }}>Component Tree (where crash happened)</h2>
              <pre
                style={{
                  background: "#fffbe6",
                  padding: 10,
                  overflow: "auto",
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  border: "1px solid #ffe",
                  margin: 0,
                }}
              >
                {componentStack}
              </pre>
            </>
          )}

          <h2 style={{ fontSize: 14, margin: "12px 0 4px" }}>JS Stack</h2>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 10,
              overflow: "auto",
              fontSize: 10,
              whiteSpace: "pre-wrap",
              border: "1px solid #ddd",
              margin: 0,
            }}
          >
            {error.stack}
          </pre>

          <h2 style={{ fontSize: 14, margin: "12px 0 4px" }}>Runtime Config</h2>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 12,
            }}
          >
            <tbody>
              {Object.entries(cfg).map(([k, v]) => (
                <tr key={k}>
                  <td
                    style={{
                      padding: "3px 6px",
                      border: "1px solid #ddd",
                      fontWeight: "bold",
                      background: "#f9f9f9",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {k}
                  </td>
                  <td
                    style={{
                      padding: "3px 6px",
                      border: "1px solid #ddd",
                      wordBreak: "break-all",
                    }}
                  >
                    {String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

function AppWithMount({ onMount }: { onMount: () => void }) {
  React.useEffect(() => {
    onMount();
  }, [onMount]);
  return <App />;
}

console.log("[Untangle] main.tsx executing", {
  href: window.location.href,
  pathname: window.location.pathname,
  BASE_URL: import.meta.env.BASE_URL,
  MODE: import.meta.env.MODE,
});

function hideDebugBanner() {
  const el = document.getElementById("__untangle_debug__");
  if (el) el.remove();
  (window as any).__UNTANGLE_MOUNTED__ = true;
}

const root = document.getElementById("root")!;
createRoot(root).render(
  <RootErrorBoundary>
    <AppWithMount onMount={hideDebugBanner} />
  </RootErrorBoundary>,
);
