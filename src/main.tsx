import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import SpacePage from "./pages/SpacePage";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./lib/theme";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
console.log("Convex URL:", convexUrl);
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/s/:spaceId" element={<SpacePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </BrowserRouter>
      </ConvexProvider>
    </ThemeProvider>
  </StrictMode>,
);
