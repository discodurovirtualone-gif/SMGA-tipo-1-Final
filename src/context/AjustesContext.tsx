import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useGanaderia, defaultFactores, FactorCorreccion } from "./GanaderiaContext";

export type MetodoWood305 = "simplificado" | "actual" | "interpolacion";

export interface SemaforoUmbrales {
  iip_verde_max: number;
  iip_amarillo_max: number;
  ipc_verde_max: number;
  ipc_amarillo_max: number;
  sc_verde_max: number;
  sc_amarillo_max: number;
  prod_verde_min: number;
  prod_amarillo_min: number;
  mastitis_verde_max: number;
  mastitis_amarillo_max: number;
  renguera_verde_max: number;
  renguera_amarillo_max: number;
}

export const defaultSemaforoUmbrales: SemaforoUmbrales = {
  iip_verde_max: 380,
  iip_amarillo_max: 420,
  ipc_verde_max: 110,
  ipc_amarillo_max: 140,
  sc_verde_max: 1.8,
  sc_amarillo_max: 2.5,
  prod_verde_min: 85,
  prod_amarillo_min: 70,
  mastitis_verde_max: 0,
  mastitis_amarillo_max: 2,
  renguera_verde_max: 0,
  renguera_amarillo_max: 1,
};

export interface AjustesState {
  heredabilidad: string;
  repetibilidad: string;
  rangoPotenciales: number[];
  factores: FactorCorreccion[];
  metodoWood305: MetodoWood305;
  semaforoUmbrales: SemaforoUmbrales;
}

interface AjustesContextType {
  ajustes: AjustesState;
  setHeredabilidad: (v: string) => void;
  setRepetibilidad: (v: string) => void;
  setRangoPotenciales: (v: number[]) => void;
  setMetodoWood305: (v: MetodoWood305) => void;
  setSemaforoUmbrales: (v: SemaforoUmbrales) => void;
  potencialesAuto: number[];
}

const STORAGE_KEY = "smga_semaforo_umbrales";

const loadUmbrales = (): SemaforoUmbrales => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSemaforoUmbrales, ...JSON.parse(raw) };
  } catch {}
  return defaultSemaforoUmbrales;
};

const AjustesContext = createContext<AjustesContextType | undefined>(undefined);

export const AjustesProvider = ({ children }: { children: ReactNode }) => {
  const { registrosBasicos, factores } = useGanaderia();
  const [heredabilidad, setHeredabilidad] = useState("0.25");
  const [repetibilidad, setRepetibilidad] = useState("0.5");
  const [rangoPotencialesOverride, setRangoPotenciales] = useState<number[]>([]);
  const [metodoWood305, setMetodoWood305] = useState<MetodoWood305>("actual");
  const [semaforoUmbrales, setSemaforoUmbralesState] = useState<SemaforoUmbrales>(loadUmbrales);

  const setSemaforoUmbrales = (v: SemaforoUmbrales) => {
    setSemaforoUmbralesState(v);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
  };

  const potencialesAuto = useMemo(() => {
    const pots = registrosBasicos
      .map(r => parseFloat(r.potencial_vaca))
      .filter(v => !isNaN(v) && v > 0);
    if (pots.length === 0) return [2000, 3000, 4000, 5000, 6000, 7000];
    const avg = pots.reduce((s, v) => s + v, 0) / pots.length;
    const center = Math.round(avg / 1000) * 1000;
    return [center - 2000, center - 1000, center, center + 1000, center + 2000];
  }, [registrosBasicos]);

  const rangoPotenciales = rangoPotencialesOverride.length > 0 ? rangoPotencialesOverride : potencialesAuto;

  const ajustes: AjustesState = {
    heredabilidad,
    repetibilidad,
    rangoPotenciales,
    factores,
    metodoWood305,
    semaforoUmbrales,
  };

  return (
    <AjustesContext.Provider value={{
      ajustes,
      setHeredabilidad,
      setRepetibilidad,
      setRangoPotenciales,
      setMetodoWood305,
      setSemaforoUmbrales,
      potencialesAuto,
    }}>
      {children}
    </AjustesContext.Provider>
  );
};

export const useAjustes = () => {
  const ctx = useContext(AjustesContext);
  if (!ctx) throw new Error("useAjustes must be used within AjustesProvider");
  return ctx;
};
