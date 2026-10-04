import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Diagnose from "@/pages/Diagnose";
import KnowledgeBase from "@/pages/KnowledgeBase";
import Dashboard from "@/pages/Dashboard";
import HistoryPage from "@/pages/HistoryPage";
import About from "@/pages/About";
import { seedDemoHistoryIfEmpty } from "@/services/storage";

export type Route = "landing" | "diagnose" | "knowledge" | "dashboard" | "history" | "about";

const ROUTES: Route[] = ["landing", "diagnose", "knowledge", "dashboard", "history", "about"];
const ALIASES: Record<string, Route> = { "": "landing", home: "landing", diagnose: "diagnose", knowledge: "knowledge", kb: "knowledge", dashboard: "dashboard", history: "history", about: "about", "how-it-works": "about" };

function routeFromHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ALIASES[hash] ?? "landing";
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());

  const navigate = useCallback((r: Route) => {
    window.location.hash = r === "landing" ? "/" : `/${r}`;
  }, []);

  useEffect(() => {
    seedDemoHistoryIfEmpty();
    const onHash = () => {
      const r = routeFromHash();
      if (ROUTES.includes(r)) setRoute(r);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="mesh-bg min-h-screen">
      <div className="grid-lines pointer-events-none fixed inset-0 z-0" />
      <Navbar route={route} navigate={navigate} />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-28 sm:px-6">
        <AnimatePresence mode="wait">
          {route === "landing" && <Landing key="landing" navigate={navigate} />}
          {route === "diagnose" && <Diagnose key="diagnose" navigate={navigate} />}
          {route === "knowledge" && <KnowledgeBase key="knowledge" />}
          {route === "dashboard" && <Dashboard key="dashboard" navigate={navigate} />}
          {route === "history" && <HistoryPage key="history" navigate={navigate} />}
          {route === "about" && <About key="about" navigate={navigate} />}
        </AnimatePresence>
      </main>
      <footer className="relative z-10 border-t border-white/6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-center sm:flex-row sm:text-left">
          <p className="display text-sm font-semibold text-mist-300">
            MediLogic <span className="text-pulse-400">X</span>
            <span className="mono ml-3 text-[10px] font-normal uppercase tracking-[0.2em] text-mist-500">Discover · Verify · Explain</span>
          </p>
          <p className="mono text-[10px] uppercase tracking-wider text-mist-600">
            Educational rule-based expert system — not a medical device
          </p>
        </div>
      </footer>
    </div>
  );
}
