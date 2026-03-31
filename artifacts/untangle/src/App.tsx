import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SessionFlow } from "./pages/SessionFlow";
import { History } from "./pages/History";
import { Moments } from "./pages/Moments";
import NotFound from "./pages/not-found";

// Use a reasonable staleTime to avoid over-fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={SessionFlow} />
      <Route path="/history" component={History} />
      <Route path="/moments" component={Moments} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base="">
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
