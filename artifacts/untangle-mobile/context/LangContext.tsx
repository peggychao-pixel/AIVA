import React, { createContext, useContext, useState } from "react";
import type { UiLang } from "@/constants/product";

interface LangContextType {
  lang: UiLang;
  setLang: (l: UiLang) => void;
}

const LangContext = createContext<LangContextType>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<UiLang>("en");
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
