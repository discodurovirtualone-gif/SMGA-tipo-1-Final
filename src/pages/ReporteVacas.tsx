import { useState, useMemo } from "react";
import FormLayout from "@/components/FormLayout";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
import { useGanaderia, calcWood } from "@/context/GanaderiaContext";
import { useAjustes, SemaforoUmbrales } from "@/context/AjustesContext";
import PdfReportButton from "@/components/PdfReportButton";

const DIAS = [30, 120, 210, 270];
const POTENCIALES = [2000, 3000, 4000, 5000, 6000, 7000];
const MAX_ROWS = 20;

const calcKg = (lc305: number, pct: number) => lc305 > 0 && pct > 0 ? lc305 * (pct / 100) : 0;

// ── Semáforo helpers ──────────────────────────────────────────────────────────
type ColorSemaforo = "green" | "yellow" | "red" | "gray";

/** Indicator where LOWER is better (IIP, IPC, S/C) */
const colorLower = (val: number, verdeMax: number, amarilloMax: number): ColorSemaforo => {
  if (val <= 0) return "gray";
  if (val < verdeMax) return "green";
  if (val <= amarilloMax) return "yellow";
  return "red";
};

/** Indicator where HIGHER is better (% vs potencial) */
const colorHigher = (val: number, verdeMin: number, amarilloMin: number): ColorSemaforo => {
  if (val <= 0) return "gray";
  if (val > verdeMin) return "green";
  if (val >= amarilloMin) return "yellow";
  return "red";
};

/** Indicator where LOWER count is better (mastitis, renguera) */
const colorCount = (val: number, verdeMax: number, amarilloMax: number): ColorSemaforo => {
  if (val < 0) return "gray";
  if (val <= verdeMax) return "green";
  if (val <= amarilloMax) return "yellow";
  return "red";
};

const worstColor = (...colors: ColorSemaforo[]): ColorSemaforo => {
  if (colors.includes("red")) return "red";
  if (colors.includes("yellow")) return "yellow";
  if (colors.includes("green")) return "green";
  return "gray";
};

const BG: Record<ColorSemaforo, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-gray-300",
};

const LABEL: Record<ColorSemaforo, string> = {
  green: "Bueno",
  yellow: "Regular",
  red: "Crítico",
  gray: "Sin datos",
};

const Circle = ({ color, title }: { color: ColorSemaforo; title: string }) => (
  <span
    title={`${title}: ${LABEL[color]}`}
    className={`inline-block w-4 h-4 rounded-full ${BG[color]} shrink-0`}
    aria-label={`${title}: ${LABEL[color]}`}
  />
);

const SemaforoCircles = ({
  repro, prod, otros,
}: { repro: ColorSemaforo; prod: ColorSemaforo; otros: ColorSemaforo }) => (
  <div className="flex gap-1.5 items-center" title={`Repro: ${LABEL[repro]} | Prod: ${LABEL[prod]} | Otros: ${LABEL[otros]}`}>
    <Circle color={repro} title="Reproductivo" />
    <Circle color={prod} title="Productivo" />
    <Circle color={otros} title="Otros/Salud" />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ReporteVacas = () => {
  const { registrosBasicos, registrosProductivos, registrosReproductivos, registrosOtros, factores } = useGanaderia();
  const { ajustes } = useAjustes();
  const u = ajustes.semaforoUmbrales;
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});

  const toggleSort = (section: string, key: string) => {
    setSortStates((prev) => {
      const cur = prev[section];
      if (cur?.key === key) return { ...prev, [section]: { key, asc: !cur.asc } };
      return { ...prev, [section]: { key, asc: false } };
    });
  };

  const computeWood305 = (prod: typeof registrosProductivos[0]) => {
    const reales = [
      parseFloat(prod.reg_1_dia30) || 0, parseFloat(prod.reg_2_dia120) || 0,
      parseFloat(prod.reg_3_dia210) || 0, parseFloat(prod.reg_4_dia270) || 0,
    ];
    if (!reales.some((v) => v > 0)) return 0;
    const pots = DIAS.map((dia, i) => {
      let closest = POTENCIALES[0]; let minD = Math.abs(calcWood(POTENCIALES[0], dia) - reales[i]);
      for (const p of POTENCIALES) { const d = Math.abs(calcWood(p, dia) - reales[i]); if (d < minD) { minD = d; closest = p; } }
      return closest;
    });
    return pots.reduce((s, v) => s + v, 0) / pots.length;
  };

  const vacaData = useMemo(() => {
    return registrosBasicos.map((vaca) => {
      const prod = registrosProductivos.find(p => p.id_vaca === vaca.id_vaca);
      const repro = registrosReproductivos.find((r) => r.id_vaca === vaca.id_vaca);
      const outro = registrosOtros.find((o) => o.id_vaca === vaca.id_vaca);

      // Productivo
      let lc305 = prod?.lc305_wood ? parseFloat(prod.lc305_wood) || 0 : 0;
      if (!lc305 && prod) lc305 = computeWood305(prod);
      const potencial = parseFloat(vaca.potencial_vaca) || 0;
      const prodPct = potencial > 0 && lc305 > 0 ? (lc305 / potencial) * 100 : 0;

      const edad = parseInt(vaca.edad) || 0;
      const lactancia = parseInt(vaca.lactancia) || 0;
      const factor = factores.find((f) => f.raza === (vaca.raza || "Otras") && f.edad === edad && f.lactancia === lactancia);
      const prodCorregida = lc305 > 0 ? lc305 * (factor?.factor ?? 1) : 0;

      const pctGrasa = prod ? parseFloat(prod.porcentaje_grasa) || 0 : 0;
      const pctProt = prod ? parseFloat(prod.porcentaje_proteina) || 0 : 0;
      const kgGrasa = calcKg(lc305, pctGrasa);
      const kgProt = calcKg(lc305, pctProt);
      const kgSolidos = kgGrasa + kgProt;

      // Reproductivos
      const iip = repro ? parseFloat(repro.iip) || 0 : 0;
      const ipc = repro ? parseFloat(repro.ipc) || 0 : 0;
      const servConc = repro ? parseFloat(repro.serv_conc) || 0 : 0;
      let ips = 0;
      if (repro?.parto && repro?.servicio1) {
        const fp = new Date(repro.parto); const fs = new Date(repro.servicio1);
        if (!isNaN(fp.getTime()) && !isNaN(fs.getTime()))
          ips = Math.round(Math.abs(fs.getTime() - fp.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Otros/Salud
      const mastitis = outro ? parseInt(outro.mastitis) || 0 : -1;
      const renguera = outro ? parseInt(outro.renguera) || 0 : -1;

      // Semáforo colors
      const cIIP = colorLower(iip, u.iip_verde_max, u.iip_amarillo_max);
      const cIPC = colorLower(ipc, u.ipc_verde_max, u.ipc_amarillo_max);
      const cSC = colorLower(servConc, u.sc_verde_max, u.sc_amarillo_max);
      const cProd = colorHigher(prodPct, u.prod_verde_min, u.prod_amarillo_min);
      const cMast = mastitis >= 0 ? colorCount(mastitis, u.mastitis_verde_max, u.mastitis_amarillo_max) : "gray";
      const cReng = renguera >= 0 ? colorCount(renguera, u.renguera_verde_max, u.renguera_amarillo_max) : "gray";

      const semaforoRepro: ColorSemaforo = worstColor(cIIP, cIPC, cSC);
      const semaforoProd: ColorSemaforo = cProd;
      const semaforoOtros: ColorSemaforo = worstColor(cMast, cReng);

      return {
        id_vaca: vaca.id_vaca,
        lc305, prodCorregida, prodPct, potencial,
        kgGrasa, kgProt, kgSolidos,
        l1: prod?.lact1 || "", l2: prod?.lact2 || "", l3: prod?.lact3 || "",
        l4: prod?.lact4 || "", l5: prod?.lact5 || "",
        iip, ipc, servConc, ips,
        mastitis, renguera,
        semaforoRepro, semaforoProd, semaforoOtros,
      };
    });
  }, [registrosBasicos, registrosProductivos, registrosReproductivos, registrosOtros, factores, u]);

  const sortAndSlice = (data: typeof vacaData, section: string, defaultKey: string) => {
    const s = sortStates[section] || { key: defaultKey, asc: false };
    const sorted = [...data].sort((a, b) => {
      const va = (a as any)[s.key] ?? 0;
      const vb = (b as any)[s.key] ?? 0;
      const numA = typeof va === "string" ? parseFloat(va) || 0 : va;
      const numB = typeof vb === "string" ? parseFloat(vb) || 0 : vb;
      return s.asc ? numA - numB : numB - numA;
    });
    return sorted.slice(0, MAX_ROWS);
  };

  const SortBtn = ({ section, field, label }: { section: string; field: string; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(section, field)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3 shrink-0" /></span>
    </TableHead>
  );

  const LeyendaCirculos = () => (
    <div className="flex gap-4 flex-wrap text-xs text-muted-foreground items-center">
      <span className="font-medium text-foreground">Semáforo:</span>
      {(["green", "yellow", "red", "gray"] as ColorSemaforo[]).map(c => (
        <span key={c} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${BG[c]} inline-block`} />
          {LABEL[c]}
        </span>
      ))}
      <span className="text-[10px] border-l pl-3">● Repro ● Prod ● Salud</span>
    </div>
  );

  // ── 6 required report sections ────────────────────────────────────────────
  const sections = [
    {
      id: "leche",
      title: "1. Reporte Vacas Leche (Wood305)",
      defaultSort: "prodCorregida",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "LC305 (lt)", field: "lc305", fmt: (v: any) => v > 0 ? Number(v).toFixed(0) : "—" },
        { label: "Prod. Corr.", field: "prodCorregida", fmt: (v: any) => v > 0 ? Number(v).toFixed(0) : "—" },
        { label: "% vs Pot.", field: "prodPct", fmt: (v: any) => v > 0 ? `${Number(v).toFixed(1)}%` : "—" },
      ],
    },
    {
      id: "ips",
      title: "2. Reporte IPS (Parto–Servicio)",
      defaultSort: "ips",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "IPS (días)", field: "ips", fmt: (v: any) => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "ipc",
      title: "3. Reporte IPC",
      defaultSort: "ipc",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "IPC (días)", field: "ipc", fmt: (v: any) => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "servconc",
      title: "4. Reporte Servicio/Concepción",
      defaultSort: "servConc",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "Serv/Conc", field: "servConc", fmt: (v: any) => v > 0 ? Number(v).toFixed(2) : "—" },
      ],
    },
    {
      id: "iip",
      title: "5. Reporte IIP",
      defaultSort: "iip",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "IIP (días)", field: "iip", fmt: (v: any) => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "solidos",
      title: "6. Producción de Sólidos",
      defaultSort: "kgSolidos",
      cols: [
        { label: "Id Vaca", field: "id_vaca", fmt: (v: any) => String(v || "—") },
        { label: "Kg Grasa", field: "kgGrasa", fmt: (v: any) => v > 0 ? Number(v).toFixed(1) : "—" },
        { label: "Kg Prot", field: "kgProt", fmt: (v: any) => v > 0 ? Number(v).toFixed(1) : "—" },
        { label: "Kg Sólidos", field: "kgSolidos", fmt: (v: any) => v > 0 ? Number(v).toFixed(1) : "—" },
      ],
    },
  ];

  return (
    <FormLayout title="Reporte Vacas">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <LeyendaCirculos />
        <PdfReportButton
          title="Reporte Vacas"
          headers={["Id Vaca", "Kg Grasa", "Kg Prot", "Kg Sólidos", "LC305", "Prod. Corr.", "L1", "L2", "L3", "L4", "L5", "IIP", "IPC", "S/C"]}
          rows={vacaData.map(v => [v.id_vaca, v.kgGrasa.toFixed(1), v.kgProt.toFixed(1), v.kgSolidos.toFixed(1), v.lc305.toFixed(0), v.prodCorregida.toFixed(0), v.l1||"—", v.l2||"—", v.l3||"—", v.l4||"—", v.l5||"—", v.iip || "—", v.ipc || "—", v.servConc || "—"])}
        />
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
          const rows = sortAndSlice(vacaData, section.id, section.defaultSort);
          const hasData = rows.some(r => {
            const key = section.defaultSort;
            const val = (r as any)[key];
            return typeof val === "number" ? val > 0 : !!val;
          });

          return (
            <Card key={section.id} className="border-2 border-primary/20">
              <CardHeader className="bg-accent/50 pb-2">
                <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Máximo {MAX_ROWS} vacas — ordenar con ↑↓ — Círculos: 🔵 Repro · 🟢 Prod · 🟣 Salud
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10">
                      <TableHead className="w-24">Semáforo</TableHead>
                      {section.cols.map((col) => (
                        <SortBtn key={col.field} section={section.id} field={col.field} label={col.label} />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!hasData ? (
                      <TableRow>
                        <TableCell colSpan={section.cols.length + 1} className="text-center text-muted-foreground py-6 text-sm">
                          Sin datos
                        </TableCell>
                      </TableRow>
                    ) : rows.map((row) => (
                      <TableRow key={row.id_vaca} data-testid={`row-vaca-${row.id_vaca}-${section.id}`}>
                        <TableCell>
                          <SemaforoCircles
                            repro={row.semaforoRepro}
                            prod={row.semaforoProd}
                            otros={row.semaforoOtros}
                          />
                        </TableCell>
                        {section.cols.map((col) => {
                          const val = (row as any)[col.field];
                          return (
                            <TableCell key={col.field} className={col.field === section.defaultSort ? "font-bold" : ""}>
                              {col.fmt(val)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </FormLayout>
  );
};

export default ReporteVacas;
