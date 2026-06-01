import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import FormLayout from "@/components/FormLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2, TrendingUp, TrendingDown, Minus, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useGanaderia } from "@/context/GanaderiaContext";
import PdfReportButton from "@/components/PdfReportButton";

const LS_KEY = "smga_promedios_nacionales";

type PromedioNacional = {
  variable: string;
  tipo: "primipara" | "multipara" | "todas";
  valor: number;
  descripcion?: string;
};

type VarDef = {
  key: string;
  label: string;
  unit?: string;
  decimals: number;
  categoria: string;
  fuente: "basicos" | "productivos" | "reproductivos" | "otros";
  campo: string;
  higherIsBetter?: boolean; // true = mayor es mejor, false = menor es mejor, undefined = neutral
};

const VARIABLES: VarDef[] = [
  // Básicos
  { key: "potencial",  label: "Potencial Vaca",         unit: "lt",    decimals: 0, categoria: "Básico",       fuente: "basicos",       campo: "potencial_vaca",     higherIsBetter: true },
  // Productivos
  { key: "lc305",      label: "Producción LC305",        unit: "kg",    decimals: 0, categoria: "Productivo",   fuente: "productivos",   campo: "lc305_wood",         higherIsBetter: true },
  { key: "grasa",      label: "Porcentaje de Grasa",     unit: "%",     decimals: 2, categoria: "Productivo",   fuente: "productivos",   campo: "porcentaje_grasa",   higherIsBetter: true },
  { key: "proteina",   label: "Porcentaje de Proteína",  unit: "%",     decimals: 2, categoria: "Productivo",   fuente: "productivos",   campo: "porcentaje_proteina",higherIsBetter: true },
  { key: "lact1",      label: "Lactancia 1 Corregida",   unit: "lt",    decimals: 0, categoria: "Productivo",   fuente: "productivos",   campo: "lact1",              higherIsBetter: true },
  { key: "lact2",      label: "Lactancia 2 Corregida",   unit: "lt",    decimals: 0, categoria: "Productivo",   fuente: "productivos",   campo: "lact2",              higherIsBetter: true },
  { key: "lact3",      label: "Lactancia 3 Corregida",   unit: "lt",    decimals: 0, categoria: "Productivo",   fuente: "productivos",   campo: "lact3",              higherIsBetter: true },
  // Reproductivos
  { key: "iip",        label: "IIP — Intervalo Interparto",          unit: "días",  decimals: 0, categoria: "Reproductivo", fuente: "reproductivos", campo: "iip",                higherIsBetter: false },
  { key: "ipc",        label: "IPC — Intervalo Parto-Concepción",    unit: "días",  decimals: 0, categoria: "Reproductivo", fuente: "reproductivos", campo: "ipc",                higherIsBetter: false },
  { key: "sc",         label: "S/C — Servicios por Concepción",      unit: "",      decimals: 2, categoria: "Reproductivo", fuente: "reproductivos", campo: "serv_conc",          higherIsBetter: false },
  // Salud y condición
  { key: "renguera",   label: "Renguera",                unit: "pt",    decimals: 1, categoria: "Salud",        fuente: "otros",         campo: "renguera",           higherIsBetter: false },
  { key: "mastitis",   label: "Mastitis",                unit: "pt",    decimals: 1, categoria: "Salud",        fuente: "otros",         campo: "mastitis",           higherIsBetter: false },
  { key: "fac_parto",  label: "Facilidad al Parto",      unit: "pt",    decimals: 1, categoria: "Salud",        fuente: "otros",         campo: "facParto",           higherIsBetter: false },
  { key: "longevidad", label: "Longevidad",               unit: "pt",    decimals: 1, categoria: "Salud",        fuente: "otros",         campo: "longevidad",         higherIsBetter: true },
  { key: "fort_patas", label: "Fortaleza de Patas",       unit: "pt",    decimals: 1, categoria: "Salud",        fuente: "otros",         campo: "fortalezaPatas",     higherIsBetter: true },
];

const CATEGORIAS = ["Básico", "Productivo", "Reproductivo", "Salud"];
const CAT_COLOR: Record<string, string> = {
  "Básico":        "bg-amber-50 border-amber-200 text-amber-800",
  "Productivo":    "bg-green-50 border-green-200 text-green-800",
  "Reproductivo":  "bg-blue-50 border-blue-200 text-blue-800",
  "Salud":         "bg-purple-50 border-purple-200 text-purple-800",
};
const CAT_BADGE: Record<string, string> = {
  "Básico":        "bg-amber-100 text-amber-800 border-amber-300",
  "Productivo":    "bg-green-100 text-green-800 border-green-300",
  "Reproductivo":  "bg-blue-100 text-blue-800 border-blue-300",
  "Salud":         "bg-purple-100 text-purple-800 border-purple-300",
};

const avg = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

const fmt = (v: number | null, decimals: number, unit?: string) => {
  if (v === null) return "—";
  return `${v.toFixed(decimals)}${unit ? " " + unit : ""}`;
};

const Trend = ({ sysVal, natVal, higherIsBetter }: { sysVal: number | null; natVal: number | null; higherIsBetter?: boolean }) => {
  if (sysVal === null || natVal === null || higherIsBetter === undefined) return null;
  const diff = sysVal - natVal;
  const pct = natVal !== 0 ? Math.abs(diff / natVal) * 100 : 0;
  if (Math.abs(diff) < 0.001) return <Minus className="h-4 w-4 text-gray-400 inline ml-1" />;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  return good
    ? <TrendingUp className="h-4 w-4 text-green-600 inline ml-1" title={`+${pct.toFixed(1)}% vs nacional`} />
    : <TrendingDown className="h-4 w-4 text-red-500 inline ml-1" title={`${pct.toFixed(1)}% vs nacional`} />;
};

const loadPromedios = (): PromedioNacional[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
};
const savePromedios = (data: PromedioNacional[]) => localStorage.setItem(LS_KEY, JSON.stringify(data));

const ComparacionNacional = () => {
  const { registrosBasicos, registrosProductivos, registrosReproductivos, registrosOtros } = useGanaderia();
  const [promedios, setPromedios] = useState<PromedioNacional[]>(loadPromedios);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { savePromedios(promedios); }, [promedios]);

  // Clasificar vacas en primíparas (lactancia=1) y multíparas (lactancia>1)
  const primiIds = new Set(registrosBasicos.filter(v => parseInt(v.lactancia) === 1).map(v => v.id_vaca));
  const multiIds  = new Set(registrosBasicos.filter(v => parseInt(v.lactancia) > 1).map(v => v.id_vaca));

  const getValsForVar = (varDef: VarDef, ids: Set<string>): number[] => {
    const parse = (s: string | undefined) => { const n = parseFloat(s || ""); return isNaN(n) || n <= 0 ? null : n; };
    if (varDef.fuente === "basicos") {
      return registrosBasicos.filter(r => ids.has(r.id_vaca)).map(r => parse((r as any)[varDef.campo])).filter((v): v is number => v !== null);
    }
    if (varDef.fuente === "productivos") {
      return registrosProductivos.filter(r => ids.has(r.id_vaca)).map(r => parse((r as any)[varDef.campo])).filter((v): v is number => v !== null);
    }
    if (varDef.fuente === "reproductivos") {
      return registrosReproductivos.filter(r => ids.has(r.id_vaca)).map(r => parse((r as any)[varDef.campo])).filter((v): v is number => v !== null);
    }
    if (varDef.fuente === "otros") {
      return registrosOtros.filter(r => ids.has(r.id_vaca)).map(r => parse((r as any)[varDef.campo])).filter((v): v is number => v !== null);
    }
    return [];
  };

  const getNacional = (key: string, tipo: "primipara" | "multipara" | "todas"): number | null => {
    const match = promedios.find(p => p.variable === key && (p.tipo === tipo || p.tipo === "todas"));
    return match ? match.valor : null;
  };

  const processUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
        if (!json.length) { setUploadStatus({ type: "error", msg: "El archivo está vacío" }); return; }

        const normalize = (s: any) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
        const parsed: PromedioNacional[] = [];
        let errors = 0;
        for (const row of json) {
          const varKey = normalize(row.variable || row.Variable || row.VARIABLE || "");
          const tipo = normalize(row.tipo || row.Tipo || row.TIPO || "todas");
          const valor = parseFloat(String(row.valor || row.Valor || row.VALOR || ""));
          const desc = String(row.descripcion || row.Descripcion || "");
          const tipoValid = ["primipara", "multipara", "todas"].includes(tipo) ? tipo as "primipara" | "multipara" | "todas" : "todas";
          if (!varKey || isNaN(valor)) { errors++; continue; }
          parsed.push({ variable: varKey, tipo: tipoValid, valor, descripcion: desc || undefined });
        }
        if (parsed.length === 0) { setUploadStatus({ type: "error", msg: "No se encontraron filas válidas. Columnas requeridas: variable, tipo, valor" }); return; }
        setPromedios(parsed);
        setUploadStatus({ type: "success", msg: `✅ ${parsed.length} promedios cargados${errors > 0 ? `, ${errors} filas ignoradas` : ""}` });
        toast.success(`${parsed.length} promedios nacionales actualizados`);
      } catch {
        setUploadStatus({ type: "error", msg: "Error al leer el archivo" });
        toast.error("Error al procesar el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearPromedios = () => {
    setPromedios([]);
    setUploadStatus(null);
    toast.success("Promedios nacionales eliminados");
  };

  // Calcular totales para el PDF
  const pdfRows = VARIABLES.map(v => {
    const priVals = getValsForVar(v, primiIds);
    const mulVals = getValsForVar(v, multiIds);
    const priAvg = avg(priVals);
    const mulAvg = avg(mulVals);
    const natPri = getNacional(v.key, "primipara");
    const natMul = getNacional(v.key, "multipara");
    return [
      `${v.categoria} — ${v.label}`,
      priAvg !== null ? `${priAvg.toFixed(v.decimals)} (n=${priVals.length})` : "—",
      mulAvg !== null ? `${mulAvg.toFixed(v.decimals)} (n=${mulVals.length})` : "—",
      natPri !== null ? natPri.toFixed(v.decimals) : "—",
      natMul !== null ? natMul.toFixed(v.decimals) : "—",
    ];
  });

  return (
    <FormLayout
      title="Comparación con Promedios Nacionales"
      helpText="Compare los promedios de su rodeo (vacas primíparas y multíparas) con los valores de referencia nacionales para cada variable."
    >
      {/* CARGA DE PROMEDIOS NACIONALES */}
      <Card className="mb-6 border-2 border-dashed border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Cargar Promedios Nacionales de Referencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Suba un archivo Excel o CSV con las columnas: <code className="bg-muted px-1 rounded">variable</code> · <code className="bg-muted px-1 rounded">tipo</code> · <code className="bg-muted px-1 rounded">valor</code>
          </p>
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <p className="font-semibold text-muted-foreground mb-1">Claves de variable disponibles:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {VARIABLES.map(v => (
                <span key={v.key} className="font-mono text-xs bg-background rounded px-1.5 py-0.5 border">{v.key}</span>
              ))}
            </div>
            <p className="text-muted-foreground mt-2">Valores de <strong>tipo</strong>: <code>primipara</code> · <code>multipara</code> · <code>todas</code></p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processUpload(f); e.target.value = ""; }}
            />
            <Button onClick={() => fileRef.current?.click()} className="gap-2" data-testid="button-upload-nacionales">
              <Upload className="h-4 w-4" /> Subir promedios
            </Button>
            {promedios.length > 0 && (
              <Button variant="outline" className="gap-2 text-destructive border-destructive/40" onClick={clearPromedios} data-testid="button-clear-nacionales">
                <Trash2 className="h-4 w-4" /> Borrar ({promedios.length} valores)
              </Button>
            )}
          </div>

          {uploadStatus && (
            <div className={`flex items-start gap-2 text-xs rounded-lg p-2 ${uploadStatus.type === "success" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{uploadStatus.msg}</span>
            </div>
          )}

          {promedios.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Sin promedios cargados. Las columnas de referencia nacional aparecerán vacías hasta que suba el archivo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* LEYENDA */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4 text-green-600" /> Por encima del promedio nacional</span>
        <span className="flex items-center gap-1"><TrendingDown className="h-4 w-4 text-red-500" /> Por debajo del promedio nacional</span>
        <span className="flex items-center gap-1"><Minus className="h-4 w-4 text-gray-400" /> Sin diferencia significativa</span>
        <div className="ml-auto">
          <PdfReportButton
            title="Comparación con Promedios Nacionales"
            headers={["Variable", "Primíparas Sistema", "Multíparas Sistema", "Ref. Nacional Primíparas", "Ref. Nacional Multíparas"]}
            rows={pdfRows}
          />
        </div>
      </div>

      {/* TABLA POR CATEGORÍA */}
      {CATEGORIAS.map(cat => {
        const vars = VARIABLES.filter(v => v.categoria === cat);
        return (
          <div key={cat} className="mb-6">
            <div className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border ${CAT_COLOR[cat]}`}>
              <Badge variant="outline" className={`text-xs font-semibold ${CAT_BADGE[cat]}`}>{cat}</Badge>
              <span className="text-sm font-semibold">Variables {cat === "Básico" ? "Básicas" : cat === "Productivo" ? "Productivas" : cat === "Reproductivo" ? "Reproductivas" : "de Salud"}</span>
            </div>

            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-48">Variable</TableHead>
                    <TableHead className="text-center bg-green-50/50">
                      <div className="font-semibold text-green-800">Primíparas</div>
                      <div className="text-xs font-normal text-green-700">Lactancia = 1</div>
                      <div className="text-xs font-normal text-muted-foreground">n = {[...primiIds].length}</div>
                    </TableHead>
                    <TableHead className="text-center bg-blue-50/50">
                      <div className="font-semibold text-blue-800">Multíparas</div>
                      <div className="text-xs font-normal text-blue-700">Lactancia &gt; 1</div>
                      <div className="text-xs font-normal text-muted-foreground">n = {[...multiIds].length}</div>
                    </TableHead>
                    <TableHead className="text-center bg-amber-50/50">
                      <div className="font-semibold text-amber-800">Ref. Nacional</div>
                      <div className="text-xs font-normal text-amber-700">Primíparas</div>
                    </TableHead>
                    <TableHead className="text-center bg-amber-50/50">
                      <div className="font-semibold text-amber-800">Ref. Nacional</div>
                      <div className="text-xs font-normal text-amber-700">Multíparas</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vars.map(v => {
                    const priVals = getValsForVar(v, primiIds);
                    const mulVals = getValsForVar(v, multiIds);
                    const priAvg  = avg(priVals);
                    const mulAvg  = avg(mulVals);
                    const natPri  = getNacional(v.key, "primipara");
                    const natMul  = getNacional(v.key, "multipara");

                    return (
                      <TableRow key={v.key} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="font-medium text-sm">{v.label}</div>
                          {v.unit && <div className="text-xs text-muted-foreground">{v.unit}</div>}
                        </TableCell>

                        {/* Sistema — Primíparas */}
                        <TableCell className="text-center">
                          {priAvg !== null ? (
                            <div>
                              <span className="font-bold text-green-800">{priAvg.toFixed(v.decimals)}</span>
                              {v.unit && <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>}
                              <Trend sysVal={priAvg} natVal={natPri} higherIsBetter={v.higherIsBetter} />
                              <div className="text-xs text-muted-foreground">n = {priVals.length}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Sistema — Multíparas */}
                        <TableCell className="text-center">
                          {mulAvg !== null ? (
                            <div>
                              <span className="font-bold text-blue-800">{mulAvg.toFixed(v.decimals)}</span>
                              {v.unit && <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>}
                              <Trend sysVal={mulAvg} natVal={natMul} higherIsBetter={v.higherIsBetter} />
                              <div className="text-xs text-muted-foreground">n = {mulVals.length}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Nacional — Primíparas */}
                        <TableCell className="text-center">
                          {natPri !== null ? (
                            <div>
                              <span className="font-semibold text-amber-800">{natPri.toFixed(v.decimals)}</span>
                              {v.unit && <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">sin dato</span>
                          )}
                        </TableCell>

                        {/* Nacional — Multíparas */}
                        <TableCell className="text-center">
                          {natMul !== null ? (
                            <div>
                              <span className="font-semibold text-amber-800">{natMul.toFixed(v.decimals)}</span>
                              {v.unit && <span className="text-xs text-muted-foreground ml-1">{v.unit}</span>}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">sin dato</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      {registrosBasicos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium mb-2">No hay animales registrados</p>
          <p className="text-sm">Ingrese animales en <a href="/basicos" className="underline font-medium">Datos de Animales</a> para ver los promedios del sistema.</p>
        </div>
      )}
    </FormLayout>
  );
};

export default ComparacionNacional;
