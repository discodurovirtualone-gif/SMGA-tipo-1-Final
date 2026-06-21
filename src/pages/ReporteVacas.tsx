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

// ── Semáforo ──────────────────────────────────────────────────────────────────
type Luz = "green" | "yellow" | "red" | "gray";

/** Menor es mejor (IIP, IPC, IPS, S/C) */
const luzLower = (val: number, verdeMax: number, rojoMin: number): Luz => {
  if (val <= 0) return "gray";
  if (val < verdeMax) return "green";
  if (val <= rojoMin) return "yellow";
  return "red";
};

/** Mayor es mejor (% producción vs potencial) */
const luzHigher = (val: number, verdeMin: number, amarilloMin: number): Luz => {
  if (val <= 0) return "gray";
  if (val > verdeMin) return "green";
  if (val >= amarilloMin) return "yellow";
  return "red";
};

const BG: Record<Luz, string> = {
  green:  "bg-green-500",
  yellow: "bg-amber-400",
  red:    "bg-red-500",
  gray:   "bg-gray-300",
};
const LABEL: Record<Luz, string> = {
  green:  "Bueno",
  yellow: "Regular",
  red:    "Crítico",
  gray:   "Sin datos",
};

const Circle = ({ color, title }: { color: Luz; title: string }) => (
  <span
    title={`${title}: ${LABEL[color]}`}
    aria-label={`${title}: ${LABEL[color]}`}
    className={`inline-block w-4 h-4 rounded-full ${BG[color]} shrink-0`}
  />
);

// ── Component ─────────────────────────────────────────────────────────────────
const ReporteVacas = () => {
  const { registrosBasicos, registrosProductivos, registrosReproductivos, registrosOtros, factores } = useGanaderia();
  const { ajustes } = useAjustes();
  const u = ajustes.semaforoUmbrales;
  const [sortStates, setSortStates] = useState<Record<string, { key: string; asc: boolean }>>({});

  const toggleSort = (section: string, key: string) => {
    setSortStates(prev => {
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
    if (!reales.some(v => v > 0)) return 0;
    const pots = DIAS.map((dia, i) => {
      let closest = POTENCIALES[0];
      let minD = Math.abs(calcWood(POTENCIALES[0], dia) - reales[i]);
      for (const p of POTENCIALES) {
        const d = Math.abs(calcWood(p, dia) - reales[i]);
        if (d < minD) { minD = d; closest = p; }
      }
      return closest;
    });
    return pots.reduce((s, v) => s + v, 0) / pots.length;
  };

  const vacaData = useMemo(() => {
    return registrosBasicos.map(vaca => {
      const prod  = registrosProductivos.find(p => p.id_vaca === vaca.id_vaca);
      const repro = registrosReproductivos.find(r => r.id_vaca === vaca.id_vaca);
      const outro = registrosOtros.find(o => o.id_vaca === vaca.id_vaca);

      // Productivo
      let lc305 = prod?.lc305_wood ? parseFloat(prod.lc305_wood) || 0 : 0;
      if (!lc305 && prod) lc305 = computeWood305(prod);
      const potencial = parseFloat(vaca.potencial_vaca) || 0;
      const prodPct   = potencial > 0 && lc305 > 0 ? (lc305 / potencial) * 100 : 0;

      const edad = parseInt(vaca.edad) || 0;
      const lactancia = parseInt(vaca.lactancia) || 0;
      const factor = factores.find(f => f.raza === (vaca.raza || "Otras") && f.edad === edad && f.lactancia === lactancia);
      const prodCorregida = lc305 > 0 ? lc305 * (factor?.factor ?? 1) : 0;

      const pctGrasa = prod ? parseFloat(prod.porcentaje_grasa) || 0 : 0;
      const pctProt  = prod ? parseFloat(prod.porcentaje_proteina) || 0 : 0;
      const kgGrasa  = calcKg(lc305, pctGrasa);
      const kgProt   = calcKg(lc305, pctProt);
      const kgSolidos = kgGrasa + kgProt;

      // Reproductivos
      const iip      = repro ? parseFloat(repro.iip) || 0 : 0;
      const ipc      = repro ? parseFloat(repro.ipc) || 0 : 0;
      const servConc = repro ? parseFloat(repro.serv_conc) || 0 : 0;
      let ips = 0;
      if (repro?.parto && repro?.servicio1) {
        const fp = new Date(repro.parto), fs = new Date(repro.servicio1);
        if (!isNaN(fp.getTime()) && !isNaN(fs.getTime()))
          ips = Math.round(Math.abs(fs.getTime() - fp.getTime()) / 86400000);
      }

      return {
        id_vaca: vaca.id_vaca,
        lc305, prodCorregida, prodPct, potencial,
        kgGrasa, kgProt, kgSolidos,
        l1: prod?.lact1 || "", l2: prod?.lact2 || "", l3: prod?.lact3 || "",
        l4: prod?.lact4 || "", l5: prod?.lact5 || "",
        iip, ipc, servConc, ips,
      };
    });
  }, [registrosBasicos, registrosProductivos, registrosReproductivos, registrosOtros, factores]);

  const sortAndSlice = (data: typeof vacaData, section: string, defaultKey: string) => {
    const s = sortStates[section] || { key: defaultKey, asc: false };
    return [...data]
      .sort((a, b) => {
        const va = (a as any)[s.key] ?? 0, vb = (b as any)[s.key] ?? 0;
        const na = typeof va === "string" ? parseFloat(va) || 0 : va;
        const nb = typeof vb === "string" ? parseFloat(vb) || 0 : vb;
        return s.asc ? na - nb : nb - na;
      })
      .slice(0, MAX_ROWS);
  };

  const SortBtn = ({ section, field, label }: { section: string; field: string; label: string }) => (
    <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(section, field)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3 shrink-0" /></span>
    </TableHead>
  );

  // ── Secciones: cada una define su propia función de semáforo ─────────────
  type VacaRow = typeof vacaData[0];

  const sections: {
    id: string;
    title: string;
    defaultSort: string;
    luzTitle: string;
    getLuz: (row: VacaRow, u: SemaforoUmbrales) => Luz;
    cols: { label: string; field: string; fmt: (v: any) => string }[];
  }[] = [
    {
      id: "leche",
      title: "1. Reporte Vacas Leche (Wood305)",
      defaultSort: "prodCorregida",
      luzTitle: "Prod. vs Potencial",
      getLuz: (r, u) => luzHigher(r.prodPct, u.prod_verde_min, u.prod_amarillo_min),
      cols: [
        { label: "Id Vaca",     field: "id_vaca",      fmt: v => String(v || "—") },
        { label: "LC305 (lt)",  field: "lc305",         fmt: v => v > 0 ? Number(v).toFixed(0) : "—" },
        { label: "Prod. Corr.", field: "prodCorregida", fmt: v => v > 0 ? Number(v).toFixed(0) : "—" },
        { label: "% vs Pot.",   field: "prodPct",       fmt: v => v > 0 ? `${Number(v).toFixed(1)}%` : "—" },
      ],
    },
    {
      id: "ips",
      title: "2. Reporte IPS (Parto–Servicio)",
      defaultSort: "ips",
      luzTitle: "IPS",
      getLuz: (r, u) => luzLower(r.ips, u.ips_verde_max, u.ips_amarillo_max),
      cols: [
        { label: "Id Vaca",    field: "id_vaca", fmt: v => String(v || "—") },
        { label: "IPS (días)", field: "ips",     fmt: v => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "ipc",
      title: "3. Reporte IPC",
      defaultSort: "ipc",
      luzTitle: "IPC",
      getLuz: (r, u) => luzLower(r.ipc, u.ipc_verde_max, u.ipc_amarillo_max),
      cols: [
        { label: "Id Vaca",    field: "id_vaca", fmt: v => String(v || "—") },
        { label: "IPC (días)", field: "ipc",     fmt: v => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "servconc",
      title: "4. Reporte Servicio/Concepción",
      defaultSort: "servConc",
      luzTitle: "Serv/Conc",
      getLuz: (r, u) => luzLower(r.servConc, u.sc_verde_max, u.sc_amarillo_max),
      cols: [
        { label: "Id Vaca",   field: "id_vaca",   fmt: v => String(v || "—") },
        { label: "Serv/Conc", field: "servConc",  fmt: v => v > 0 ? Number(v).toFixed(2) : "—" },
      ],
    },
    {
      id: "iip",
      title: "5. Reporte IIP",
      defaultSort: "iip",
      luzTitle: "IIP",
      getLuz: (r, u) => luzLower(r.iip, u.iip_verde_max, u.iip_amarillo_max),
      cols: [
        { label: "Id Vaca",    field: "id_vaca", fmt: v => String(v || "—") },
        { label: "IIP (días)", field: "iip",     fmt: v => v > 0 ? Number(v).toFixed(0) : "—" },
      ],
    },
    {
      id: "solidos",
      title: "6. Producción de Sólidos",
      defaultSort: "kgSolidos",
      luzTitle: "Prod. vs Potencial",
      getLuz: (r, u) => luzHigher(r.prodPct, u.prod_verde_min, u.prod_amarillo_min),
      cols: [
        { label: "Id Vaca",    field: "id_vaca",   fmt: v => String(v || "—") },
        { label: "Kg Grasa",   field: "kgGrasa",   fmt: v => v > 0 ? Number(v).toFixed(1) : "—" },
        { label: "Kg Prot",    field: "kgProt",    fmt: v => v > 0 ? Number(v).toFixed(1) : "—" },
        { label: "Kg Sólidos", field: "kgSolidos", fmt: v => v > 0 ? Number(v).toFixed(1) : "—" },
      ],
    },
  ];

  const Leyenda = () => (
    <div className="flex gap-4 flex-wrap text-xs text-muted-foreground items-center">
      <span className="font-medium text-foreground">Semáforo:</span>
      {(["green", "yellow", "red", "gray"] as Luz[]).map(c => (
        <span key={c} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${BG[c]} inline-block`} />
          {LABEL[c]}
        </span>
      ))}
    </div>
  );

  return (
    <FormLayout title="Reporte Vacas">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <Leyenda />
        <PdfReportButton
          title="Reporte Vacas"
          headers={["Id Vaca", "LC305", "Prod. Corr.", "% vs Pot.", "Kg Grasa", "Kg Prot", "Kg Sólidos", "IIP", "IPC", "IPS", "S/C"]}
          rows={vacaData.map(v => [
            v.id_vaca,
            v.lc305.toFixed(0), v.prodCorregida.toFixed(0),
            v.prodPct > 0 ? `${v.prodPct.toFixed(1)}%` : "—",
            v.kgGrasa.toFixed(1), v.kgProt.toFixed(1), v.kgSolidos.toFixed(1),
            v.iip || "—", v.ipc || "—", v.ips || "—", v.servConc || "—",
          ])}
        />
      </div>

      <div className="space-y-6">
        {sections.map(section => {
          const rows = sortAndSlice(vacaData, section.id, section.defaultSort);
          const hasData = rows.some(r => {
            const val = (r as any)[section.defaultSort];
            return typeof val === "number" ? val > 0 : !!val;
          });

          return (
            <Card key={section.id} className="border-2 border-primary/20">
              <CardHeader className="bg-accent/50 pb-2">
                <CardTitle className="text-lg font-bold">{section.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Máx. {MAX_ROWS} vacas — ordenar con ↑↓
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10">
                      <TableHead className="w-16">Luz</TableHead>
                      {section.cols.map(col => (
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
                    ) : rows.map(row => {
                      const luz = section.getLuz(row, u);
                      return (
                        <TableRow key={row.id_vaca} data-testid={`row-vaca-${row.id_vaca}-${section.id}`}>
                          <TableCell>
                            <Circle color={luz} title={section.luzTitle} />
                          </TableCell>
                          {section.cols.map(col => (
                            <TableCell
                              key={col.field}
                              className={col.field === section.defaultSort ? "font-bold" : ""}
                            >
                              {col.fmt((row as any)[col.field])}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
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
