import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RegistroReproductivo {
  id_vaca: string;
  ejercicio: string;
  parto: string;
  raza: string;
  servicio1: string;
  servicio2: string;
  servicio3: string;
  concepcion1: string;
  toroUsado: string;
  aborto1: string;
  aborto2: string;
  parto1: string;
  iip: string;
  ipc: string;
  serv_conc: string;
}

export interface RegistroOtro {
  id_vaca: string;
  ejercicio: string;
  renguera: string;
  mastitis: string;
  facParto: string;
  longevidad: string;
  fortalezaPatas: string;
}

export interface RegistroBasico {
  ejercicio: string;
  id_vaca: string;
  partos: string;
  fecha_nacimiento: string;
  raza: string;
  lactancia: string;
  edad: string;
  potencial_vaca: string;
}

export interface ControlPunto {
  dia: number;
  produccion: number;
}

export interface RegistroProductivo {
  ejercicio: string;
  id_vaca: string;
  reg_1_dia30: string;
  reg_2_dia120: string;
  reg_3_dia210: string;
  reg_4_dia270: string;
  lc305_wood: string;
  porcentaje_grasa: string;
  porcentaje_proteina: string;
  lact1: string;
  lact2: string;
  lact3: string;
  lact4: string;
  lact5: string;
  controles_adicionales?: string;
}

export interface Toro {
  id_toro: string;
  nombre: string;
  dep_leche: number;
  dep_grasa: number;
  dep_prot: number;
  dep_tph: number;
  indice_inia: number;
  indice_rovere: number;
  caracteristicas: string;
  precio_dosis: number;
}

export interface FactorCorreccion {
  raza: string;
  nivel_produccion: string;
  edad: number;
  lactancia: number;
  factor: number;
}

export const defaultFactores: FactorCorreccion[] = [
  { raza: "Holstein", nivel_produccion: "Alto", edad: 2, lactancia: 1, factor: 1.222 },
  { raza: "Holstein", nivel_produccion: "Alto", edad: 3, lactancia: 1, factor: 1.187 },
  { raza: "Holstein", nivel_produccion: "Alto", edad: 3, lactancia: 2, factor: 1.056 },
  { raza: "Holstein", nivel_produccion: "Alto", edad: 4, lactancia: 1, factor: 1.127 },
  { raza: "Holstein", nivel_produccion: "Alto", edad: 4, lactancia: 2, factor: 1.021 },
  { raza: "Holstein", nivel_produccion: "Alto", edad: 4, lactancia: 3, factor: 1.000 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 2, lactancia: 1, factor: 1.208 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 3, lactancia: 1, factor: 1.148 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 3, lactancia: 2, factor: 1.061 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 4, lactancia: 1, factor: 1.146 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 4, lactancia: 2, factor: 1.027 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 4, lactancia: 3, factor: 1.000 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 5, lactancia: 3, factor: 0.993 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 5, lactancia: 4, factor: 0.982 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 5, lactancia: 5, factor: 0.987 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 6, lactancia: 3, factor: 0.972 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 6, lactancia: 4, factor: 0.970 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 6, lactancia: 5, factor: 0.986 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 7, lactancia: 4, factor: 0.982 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 7, lactancia: 5, factor: 0.984 },
  { raza: "Jersey", nivel_produccion: "Alto", edad: 8, lactancia: 5, factor: 1.008 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 2, lactancia: 1, factor: 1.208 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 3, lactancia: 1, factor: 1.159 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 3, lactancia: 2, factor: 1.060 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 4, lactancia: 1, factor: 1.116 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 4, lactancia: 2, factor: 1.029 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 4, lactancia: 3, factor: 1.000 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 5, lactancia: 2, factor: 1.002 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 5, lactancia: 3, factor: 0.985 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 5, lactancia: 4, factor: 0.984 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 6, lactancia: 3, factor: 0.986 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 6, lactancia: 4, factor: 0.980 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 6, lactancia: 5, factor: 0.982 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 7, lactancia: 4, factor: 0.988 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 7, lactancia: 5, factor: 0.988 },
  { raza: "Jersey", nivel_produccion: "Medio", edad: 8, lactancia: 5, factor: 1.014 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 2, lactancia: 1, factor: 1.182 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 3, lactancia: 1, factor: 1.167 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 3, lactancia: 2, factor: 1.058 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 4, lactancia: 1, factor: 1.111 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 4, lactancia: 2, factor: 1.026 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 4, lactancia: 3, factor: 1.000 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 5, lactancia: 2, factor: 1.030 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 5, lactancia: 3, factor: 0.980 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 5, lactancia: 4, factor: 0.998 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 6, lactancia: 3, factor: 1.031 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 6, lactancia: 4, factor: 0.998 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 6, lactancia: 5, factor: 0.981 },
  { raza: "Jersey", nivel_produccion: "Bajo", edad: 7, lactancia: 5, factor: 0.981 },
];

export const calcWood = (potencial_vaca: number, dia: number): number => {
  return (potencial_vaca * 0.00318) * Math.pow(dia, 0.1027) * Math.exp(-0.003 * dia);
};

export const calcEdadAnios = (fechaNac: string): number => {
  if (!fechaNac) return 0;
  const birth = new Date(fechaNac);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  const diffYears = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.floor(diffYears));
};

export const calcEdadMeses = calcEdadAnios;

const toNum = (v: string): number | null => {
  if (!v || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};
const toInt = (v: string): number | null => {
  if (!v || v === "") return null;
  const n = parseInt(v);
  return isNaN(n) ? null : n;
};
const toDateOrNull = (v: string): string | null => (!v || v === "") ? null : v;

export const basicoToDb = (r: RegistroBasico) => ({
  ejercicio: r.ejercicio, id_vaca: r.id_vaca, partos: r.partos,
  fecha_nacimiento: toDateOrNull(r.fecha_nacimiento), raza: r.raza,
  lactancia: toInt(r.lactancia) ?? 1, edad: toInt(r.edad), potencial_vaca: r.potencial_vaca,
});

export const productivoToDb = (r: RegistroProductivo) => ({
  ejercicio: r.ejercicio, id_vaca: r.id_vaca,
  reg_1_dia30: toNum(r.reg_1_dia30), reg_2_dia120: toNum(r.reg_2_dia120),
  reg_3_dia210: toNum(r.reg_3_dia210), reg_4_dia270: toNum(r.reg_4_dia270),
  lc305_wood: toNum(r.lc305_wood), porcentaje_grasa: toNum(r.porcentaje_grasa),
  porcentaje_proteina: toNum(r.porcentaje_proteina),
  lact1: toNum(r.lact1), lact2: toNum(r.lact2), lact3: toNum(r.lact3),
  lact4: toNum(r.lact4), lact5: toNum(r.lact5),
  controles_adicionales: r.controles_adicionales ?? null,
});

export const reproductivoToDb = (r: RegistroReproductivo) => ({
  id_vaca: r.id_vaca, ejercicio: r.ejercicio,
  parto: toDateOrNull(r.parto), raza: r.raza,
  servicio1: toDateOrNull(r.servicio1), servicio2: toDateOrNull(r.servicio2),
  servicio3: toDateOrNull(r.servicio3), concepcion1: toDateOrNull(r.concepcion1),
  toro_usado: r.toroUsado || null,
  aborto1: toDateOrNull(r.aborto1), aborto2: toDateOrNull(r.aborto2),
  parto1: toDateOrNull(r.parto1),
  iip: toNum(r.iip), ipc: toNum(r.ipc), serv_conc: toNum(r.serv_conc),
});

export const otroToDb = (r: RegistroOtro) => ({
  id_vaca: r.id_vaca, ejercicio: r.ejercicio,
  renguera: toInt(r.renguera), mastitis: toInt(r.mastitis),
  fac_parto: toInt(r.facParto), longevidad: toInt(r.longevidad),
  fortaleza_patas: toInt(r.fortalezaPatas),
});

interface GanaderiaContextType {
  registrosBasicos: RegistroBasico[];
  setRegistrosBasicos: React.Dispatch<React.SetStateAction<RegistroBasico[]>>;
  registrosProductivos: RegistroProductivo[];
  setRegistrosProductivos: React.Dispatch<React.SetStateAction<RegistroProductivo[]>>;
  factores: FactorCorreccion[];
  setFactores: React.Dispatch<React.SetStateAction<FactorCorreccion[]>>;
  registrosReproductivos: RegistroReproductivo[];
  setRegistrosReproductivos: React.Dispatch<React.SetStateAction<RegistroReproductivo[]>>;
  registrosOtros: RegistroOtro[];
  setRegistrosOtros: React.Dispatch<React.SetStateAction<RegistroOtro[]>>;
  toros: Toro[];
  setToros: React.Dispatch<React.SetStateAction<Toro[]>>;
  deleteRegistro: (table: string, id_vaca: string, ejercicio: string) => Promise<void>;
  loading: boolean;
}

const GanaderiaContext = createContext<GanaderiaContextType | undefined>(undefined);

const str = (v: any): string => (v == null ? "" : String(v));

export const GanaderiaProvider = ({ children }: { children: ReactNode }) => {
  const [registrosBasicos, setRegistrosBasicos] = useState<RegistroBasico[]>([]);
  const [registrosProductivos, setRegistrosProductivos] = useState<RegistroProductivo[]>([]);
  const [factores, setFactores] = useState<FactorCorreccion[]>(defaultFactores);
  const [registrosReproductivos, setRegistrosReproductivos] = useState<RegistroReproductivo[]>([]);
  const [registrosOtros, setRegistrosOtros] = useState<RegistroOtro[]>([]);
  const [toros, setToros] = useState<Toro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          { data: basicos, error: e1 },
          { data: productivos, error: e2 },
          { data: reproductivos, error: e3 },
          { data: otros, error: e4 },
          { data: torosData, error: e5 },
        ] = await Promise.all([
          supabase.from('registros_basicos').select('*'),
          supabase.from('registros_productivos').select('*'),
          supabase.from('registros_reproductivos').select('*'),
          supabase.from('registros_otros').select('*'),
          supabase.from('toros').select('*'),
        ]);
        if (e1) console.error('Error cargando basicos:', e1.message);
        if (e2) console.error('Error cargando productivos:', e2.message);
        if (e3) console.error('Error cargando reproductivos:', e3.message);
        if (e4) console.error('Error cargando otros:', e4.message);
        if (e5) console.error('Error cargando toros:', e5.message);

        if (basicos?.length) {
          setRegistrosBasicos(basicos.map((r: any) => ({
            ejercicio: str(r.ejercicio), id_vaca: str(r.id_vaca), partos: str(r.partos),
            fecha_nacimiento: str(r.fecha_nacimiento), raza: str(r.raza),
            lactancia: str(r.lactancia), edad: str(r.edad), potencial_vaca: str(r.potencial_vaca),
          })));
        }
        if (productivos?.length) {
          setRegistrosProductivos(productivos.map((r: any) => ({
            ejercicio: str(r.ejercicio), id_vaca: str(r.id_vaca),
            reg_1_dia30: str(r.reg_1_dia30), reg_2_dia120: str(r.reg_2_dia120),
            reg_3_dia210: str(r.reg_3_dia210), reg_4_dia270: str(r.reg_4_dia270),
            lc305_wood: str(r.lc305_wood), porcentaje_grasa: str(r.porcentaje_grasa),
            porcentaje_proteina: str(r.porcentaje_proteina),
            lact1: str(r.lact1), lact2: str(r.lact2), lact3: str(r.lact3),
            lact4: str(r.lact4), lact5: str(r.lact5),
            controles_adicionales: r.controles_adicionales ?? undefined,
          })));
        }
        if (reproductivos?.length) {
          setRegistrosReproductivos(reproductivos.map((r: any) => ({
            id_vaca: str(r.id_vaca), ejercicio: str(r.ejercicio), parto: str(r.parto),
            raza: str(r.raza), servicio1: str(r.servicio1), servicio2: str(r.servicio2),
            servicio3: str(r.servicio3), concepcion1: str(r.concepcion1),
            toroUsado: str(r.toro_usado), aborto1: str(r.aborto1), aborto2: str(r.aborto2),
            parto1: str(r.parto1), iip: str(r.iip), ipc: str(r.ipc), serv_conc: str(r.serv_conc),
          })));
        }
        if (otros?.length) {
          setRegistrosOtros(otros.map((r: any) => ({
            id_vaca: str(r.id_vaca), ejercicio: str(r.ejercicio),
            renguera: str(r.renguera), mastitis: str(r.mastitis),
            facParto: str(r.fac_parto), longevidad: str(r.longevidad),
            fortalezaPatas: str(r.fortaleza_patas),
          })));
        }
        if (torosData?.length) {
          setToros(torosData.map((r: any) => ({
            id_toro: r.id_toro || '', nombre: r.nombre || '',
            dep_leche: parseFloat(r.dep_leche) || 0, dep_grasa: parseFloat(r.dep_grasa) || 0,
            dep_prot: parseFloat(r.dep_prot) || 0, dep_tph: parseFloat(r.dep_tph) || 0,
            indice_inia: parseFloat(r.indice_inia) || 0, indice_rovere: parseFloat(r.indice_rovere) || 0,
            caracteristicas: r.caracteristicas || '',
            precio_dosis: parseFloat(r.precio_dosis) || 0,
          })));
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const deleteRegistro = async (table: string, id_vaca: string, ejercicio: string) => {
    await supabase.from(table as any).delete().eq('id_vaca', id_vaca).eq('ejercicio', ejercicio);
    switch (table) {
      case 'registros_basicos':
        setRegistrosBasicos(prev => prev.filter(r => !(r.id_vaca === id_vaca && r.ejercicio === ejercicio)));
        break;
      case 'registros_productivos':
        setRegistrosProductivos(prev => prev.filter(r => !(r.id_vaca === id_vaca && r.ejercicio === ejercicio)));
        break;
      case 'registros_reproductivos':
        setRegistrosReproductivos(prev => prev.filter(r => !(r.id_vaca === id_vaca && r.ejercicio === ejercicio)));
        break;
      case 'registros_otros':
        setRegistrosOtros(prev => prev.filter(r => !(r.id_vaca === id_vaca && r.ejercicio === ejercicio)));
        break;
    }
  };

  return (
    <GanaderiaContext.Provider value={{
      registrosBasicos, setRegistrosBasicos,
      registrosProductivos, setRegistrosProductivos,
      factores, setFactores,
      registrosReproductivos, setRegistrosReproductivos,
      registrosOtros, setRegistrosOtros,
      toros, setToros,
      deleteRegistro, loading,
    }}>
      {children}
    </GanaderiaContext.Provider>
  );
};

export const useGanaderia = () => {
  const ctx = useContext(GanaderiaContext);
  if (!ctx) throw new Error("useGanaderia must be used within GanaderiaProvider");
  return ctx;
};
