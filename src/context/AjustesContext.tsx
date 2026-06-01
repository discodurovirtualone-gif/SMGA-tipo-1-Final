import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useGanaderia, defaultFactores, FactorCorreccion } from "./GanaderiaContext";

export type MetodoWood305 = "actual" | "interpolacion";

export interface AjustesState {
  heredabilidad: string;
  repetibilidad: string;
  rangoPotenciales: number[];
  factores: FactorCorreccion[];
  metodoWood305: MetodoWood305;
}

interface AjustesContextType {
  ajustes: AjustesState;
  setHeredabilidad: (v: string) => void;
  setRepetibilidad: (v: string) => void;
  setRangoPotenciales: (v: number[]) => void;
  setMetodoWood305: (v: MetodoWood305) => void;
  potencialesAuto: number[];
}

const AjustesContext = createContext<AjustesContextType | undefined>(undefined);

export const AjustesProvider = ({ children }: { children: ReactNode }) => {
  const { registrosBasicos, factores } = useGanaderia();
  const [heredabilidad, setHeredabilidad] = useState("0.25");
  const [repetibilidad, setRepetibilidad] = useState("0.5");
  const [rangoPotencialesOverride, setRangoPotenciales] = useState<number[]>([]);
  const [metodoWood305, setMetodoWood305] = useState<MetodoWood305>("actual");

  // Auto-generate potentials range based on average potencial_vaca
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
  };

  return (
    <AjustesContext.Provider value={{
      ajustes,
      setHeredabilidad,
      setRepetibilidad,
      setRangoPotenciales,
      setMetodoWood305,
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
