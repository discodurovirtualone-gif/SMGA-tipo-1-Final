import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGanaderia, RegistroBasico, RegistroProductivo, RegistroReproductivo, RegistroOtro,
  basicoToDb, productivoToDb, reproductivoToDb, otroToDb, calcEdadAnios, ejercicioToFechaRef,
} from "@/context/GanaderiaContext";

const BASICOS_COLS = ["ejercicio", "id_vaca", "partos", "fecha_nacimiento", "raza", "lactancia", "edad", "potencial_vaca"];
const PRODUCTIVOS_COLS = ["ejercicio", "id_vaca", "reg_1_dia30", "reg_2_dia120", "reg_3_dia210", "reg_4_dia270", "porcentaje_grasa", "porcentaje_proteina", "lc305_wood", "lact1", "lact2", "lact3", "lact4", "lact5"];
const REPRODUCTIVOS_COLS = ["ejercicio", "id_vaca", "parto", "raza", "servicio1", "servicio2", "servicio3", "concepcion1", "toroUsado", "aborto1", "aborto2", "parto1"];
const OTROS_COLS = ["ejercicio", "id_vaca", "renguera", "mastitis", "facParto", "longevidad", "fortalezaPatas"];

const COL_ALIASES: Record<string, string[]> = {
  facparto: ["facilidadalparto", "facilidadparto", "facparto", "fac_parto"],
  fortalezapatas: ["fortalezadepatas", "fortalezapatas", "fortaleza_patas", "fortpatas"],
};

const ALL_SECTIONS = [
  { name: "Básicos",       cols: BASICOS_COLS,       table: "registros_basicos" },
  { name: "Productivos",   cols: PRODUCTIVOS_COLS,   table: "registros_productivos" },
  { name: "Reproductivos", cols: REPRODUCTIVOS_COLS, table: "registros_reproductivos" },
  { name: "Otros",         cols: OTROS_COLS,         table: "registros_otros" },
];

const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

const excelDateToString = (v: any): string => {
  if (!v) return "";
  if (typeof v === "number" && v > 10000 && v < 100000) {
    const date = new Date((v - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && /\d/.test(s) && s.length >= 8)
    return parsed.toISOString().split("T")[0];
  return "";
};

const DATE_COLS = new Set([
  "fecha_nacimiento", "parto", "parto1", "servicio1", "servicio2", "servicio3",
  "concepcion1", "aborto1", "aborto2",
]);

const matchSection = (headers: string[]) => {
  const normalized = headers.map(normalize);
  for (const section of ALL_SECTIONS) {
    const required = section.cols.filter((c) => c !== "ejercicio" && c !== "id_vaca");
    const matchCount = required.filter((c) => normalized.includes(normalize(c))).length;
    if (matchCount >= required.length * 0.6) return section;
  }
  return null;
};

interface PendingSection {
  sec: typeof ALL_SECTIONS[0];
  rows: Record<string, string>[];
  sinEjercicio: number;
}

interface Props {
  ejercicioActivo?: string;
}

const BulkUpload = ({ ejercicioActivo }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState<PendingSection[] | null>(null);
  const { setRegistrosBasicos, setRegistrosProductivos, setRegistrosReproductivos, setRegistrosOtros } = useGanaderia();

  const parseSections = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sections: PendingSection[] = [];
        const parseErrors: string[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
          if (json.length === 0) continue;

          const headers = Object.keys(json[0]);
          let section = matchSection(headers);
          if (!section) {
            const sn = normalize(sheetName);
            const found = ALL_SECTIONS.find((s) => sn.includes(normalize(s.name)));
            if (!found) { parseErrors.push(`Hoja "${sheetName}": columnas no reconocidas`); continue; }
            section = found;
          }

          const sec = section!;
          const rows = json.map((row) => {
            const mapped: Record<string, string> = {};
            for (const col of sec.cols) {
              const normCol = normalize(col);
              const aliases = COL_ALIASES[normCol] || [];
              const allNorms = [normCol, ...aliases];
              const key = Object.keys(row).find((k) => allNorms.includes(normalize(k)));
              let val = key ? row[key] : "";
              if (DATE_COLS.has(col)) val = excelDateToString(val);
              else val = String(val);
              mapped[col] = val;
            }
            return mapped;
          }).filter((r) => r.id_vaca);

          if (rows.length === 0) { parseErrors.push(`Hoja "${sheetName}": sin filas válidas`); continue; }

          const sinEjercicio = rows.filter((r) => !r.ejercicio || r.ejercicio.trim() === "").length;
          sections.push({ sec, rows, sinEjercicio });
        }

        if (parseErrors.length > 0) parseErrors.forEach((e) => toast.warning(e));

        if (sections.length === 0) {
          setStatus({ type: "error", message: "No se encontraron datos válidos en el archivo" });
          toast.error("No se encontraron datos válidos");
          return;
        }

        const totalSinEjercicio = sections.reduce((s, p) => s + p.sinEjercicio, 0);

        if (totalSinEjercicio > 0 && !ejercicioActivo) {
          setStatus({
            type: "error",
            message: `⚠️ ${totalSinEjercicio} fila(s) no tienen ejercicio en el archivo. Seleccioná el ejercicio activo antes de cargar.`,
          });
          return;
        }

        if (totalSinEjercicio > 0 && ejercicioActivo) {
          setPending(sections);
          setStatus(null);
          return;
        }

        insertSections(sections);
      } catch {
        setStatus({ type: "error", message: "Error al leer el archivo" });
        toast.error("Error al procesar el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const insertSections = async (sections: PendingSection[]) => {
    const body: {
      basicos: ReturnType<typeof basicoToDb>[];
      productivos: ReturnType<typeof productivoToDb>[];
      reproductivos: ReturnType<typeof reproductivoToDb>[];
      otros: ReturnType<typeof otroToDb>[];
    } = { basicos: [], productivos: [], reproductivos: [], otros: [] };

    const appRowsBySection: {
      basicos: RegistroBasico[];
      productivos: RegistroProductivo[];
      reproductivos: RegistroReproductivo[];
      otros: RegistroOtro[];
    } = { basicos: [], productivos: [], reproductivos: [], otros: [] };

    const loaded: string[] = [];
    let totalRows = 0;

    for (const { sec, rows } of sections) {
      const filledRows = rows.map((r) => ({
        ...r,
        ejercicio: r.ejercicio && r.ejercicio.trim() !== "" ? r.ejercicio : (ejercicioActivo ?? ""),
      }));

      if (sec.name === "Básicos") {
        const appRows: RegistroBasico[] = filledRows.map(r => ({
          ...r,
          edad: r.fecha_nacimiento ? String(Math.max(0, calcEdadAnios(r.fecha_nacimiento, ejercicioToFechaRef(r.ejercicio || ejercicioActivo || "")))) : r.edad || "",
        } as RegistroBasico));
        appRowsBySection.basicos.push(...appRows);
        body.basicos.push(...appRows.map(basicoToDb));
      } else if (sec.name === "Productivos") {
        const appRows: RegistroProductivo[] = filledRows.map(r => ({
          ...r, lc305_wood: r.lc305_wood || "",
          lact1: r.lact1||"", lact2: r.lact2||"", lact3: r.lact3||"", lact4: r.lact4||"", lact5: r.lact5||"",
        } as RegistroProductivo));
        appRowsBySection.productivos.push(...appRows);
        body.productivos.push(...appRows.map(productivoToDb));
      } else if (sec.name === "Reproductivos") {
        const appRows: RegistroReproductivo[] = filledRows.map(r => {
          const parto = r.parto || "", parto1 = r.parto1 || "", concepcion1 = r.concepcion1 || "";
          const s1 = r.servicio1||"", s2 = r.servicio2||"", s3 = r.servicio3||"";
          let iip = "", ipc = "";
          if (parto && parto1) {
            const diff = Math.abs(new Date(parto1).getTime() - new Date(parto).getTime()) / 86400000;
            if (diff > 0) iip = Math.round(diff).toString();
          }
          if (parto && concepcion1) {
            const diff = (new Date(concepcion1).getTime() - new Date(parto).getTime()) / 86400000;
            if (diff > 0) ipc = Math.round(diff).toString();
          }
          const serv_conc = [s1, s2, s3].filter(Boolean).length || "";
          return { ...r, iip, ipc, serv_conc: String(serv_conc), toroUsado: r.toroUsado || "" } as RegistroReproductivo;
        });
        appRowsBySection.reproductivos.push(...appRows);
        body.reproductivos.push(...appRows.map(reproductivoToDb));
      } else if (sec.name === "Otros") {
        const appRows = filledRows as unknown as RegistroOtro[];
        appRowsBySection.otros.push(...appRows);
        body.otros.push(...appRows.map(otroToDb));
      }

      totalRows += filledRows.length;
      loaded.push(`${sec.name}: ${filledRows.length}`);
    }

    if (totalRows === 0) {
      setStatus({ type: "error", message: "No se encontraron datos válidos en el archivo" });
      setPending(null);
      return;
    }

    try {
      const resp = await fetch('/api/bulk_insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ error: resp.statusText }));
        setStatus({ type: "error", message: `❌ Error al guardar: ${e.error}` });
        toast.error(`Error al guardar: ${e.error}`);
        setPending(null);
        return;
      }
    } catch (err: any) {
      setStatus({ type: "error", message: `❌ Error al guardar: ${err.message}` });
      toast.error(`Error al guardar: ${err.message}`);
      setPending(null);
      return;
    }

    if (appRowsBySection.basicos.length) setRegistrosBasicos(prev => [...prev, ...appRowsBySection.basicos]);
    if (appRowsBySection.productivos.length) setRegistrosProductivos(prev => [...prev, ...appRowsBySection.productivos]);
    if (appRowsBySection.reproductivos.length) setRegistrosReproductivos(prev => [...prev, ...appRowsBySection.reproductivos]);
    if (appRowsBySection.otros.length) setRegistrosOtros(prev => [...prev, ...appRowsBySection.otros]);

    setStatus({ type: "success", message: `✅ ${totalRows} registros cargados (${loaded.join(", ")})` });
    toast.success(`${totalRows} registros importados y guardados`);
    setPending(null);
  };

  const totalSinEjercicio = pending?.reduce((s, p) => s + p.sinEjercicio, 0) ?? 0;
  const totalFilas = pending?.reduce((s, p) => s + p.rows.length, 0) ?? 0;

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-card p-4 w-full">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm font-semibold text-card-foreground">Carga masiva de datos</p>
          <p className="text-xs text-muted-foreground">
            Suba un archivo Excel o CSV — se guarda en la base de datos
            {ejercicioActivo && (
              <span className="ml-1 font-medium text-primary">· Ejercicio activo: {ejercicioActivo}</span>
            )}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) parseSections(f); e.target.value = ""; }}
        />
        {!pending && (
          <Button size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Subir Excel/CSV
          </Button>
        )}
      </div>

      {pending && (
        <div className="mt-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">
                {totalSinEjercicio} de {totalFilas} fila(s) no tienen ejercicio especificado en el archivo.
              </p>
              <p className="mt-0.5">
                Se les asignará automáticamente el ejercicio activo:{" "}
                <span className="font-bold">{ejercicioActivo}</span>
              </p>
              <p className="text-xs mt-1 text-amber-700 dark:text-amber-400">
                Las filas que ya traen ejercicio en el archivo conservarán su valor original.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-100"
              onClick={() => { setPending(null); setStatus(null); }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => insertSections(pending)}
            >
              Confirmar e importar
            </Button>
          </div>
        </div>
      )}

      {status && (
        <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg p-2 ${status.type === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {status.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span className="whitespace-pre-line">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
