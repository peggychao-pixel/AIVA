import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

type EBState = { error: Error | null };

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Untangle] App crashed:", error.message, info.componentStack);
  }
  render() {
    const { error } = this.state;
    if (error) {
      const cfg = {
        href: window.location.href,
        pathname: window.location.pathname,
        BASE_URL: import.meta.env.BASE_URL,
        MODE: import.meta.env.MODE,
        ua: navigator.userAgent.slice(0, 80),
      };
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "monospace",
            maxWidth: 800,
            margin: "0 auto",
            color: "#1a1a1a",
            background: "#fff7f7",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ color: "#c00", fontSize: 20, marginTop: 0 }}>
            ⚠ App Failed to Load
          </h1>
          <p>
            <strong>Error:</strong> {error.message}
          </p>
          <pre
            style={{
              background: "#fee",
              padding: 12,
              overflow: "auto",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              border: "1px solid #fcc",
            }}
          >
            {error.stack}
          </pre>
          <hr />
          <h2 style={{ fontSize: 16 }}>Runtime Config</h2>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 13,
            }}
          >
            <tbody>
              {Object.entries(cfg).map(([k, v]) => (
                <tr key={k}>
                  <td
                    style={{
                      padding: "4px 8px",
                      border: "1px solid #ddd",
                      fontWeight: "bold",
                      background: "#f9f9f9",
                    }}
                  >
                    {k}
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
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
