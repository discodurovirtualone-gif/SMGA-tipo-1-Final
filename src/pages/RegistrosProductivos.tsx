import { useState, useEffect } from "react";
import FormLayout from "@/components/FormLayout";
import FieldInput from "@/components/FieldInput";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, ArrowUpDown, Plus, X, RefreshCw } from "lucide-react";
import { useGanaderia, RegistroProductivo, ControlPunto, calcWood, productivoToDb, basicoToDb } from "@/context/GanaderiaContext";
import { useAjustes } from "@/context/AjustesContext";
import { ajustarWoodLM, WoodFitResult } from "@/lib/woodLM";
import PdfReportButton from "@/components/PdfReportButton";
import DeleteAllButton from "@/components/DeleteAllButton";

const DIAS_FIJOS = [30, 120, 210, 270];
const POTENCIALES = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

type SortKey = "id_vaca" | "lc305_wood" | "porcentaje_grasa" | "porcentaje_proteina";

const parseControles = (json?: string): ControlPunto[] => {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((c: any) => typeof c.dia === "number" && typeof c.produccion === "number");
  } catch { return []; }
};

const RegistrosProductivos = () => {
  const { registrosBasicos, setRegistrosBasicos, registrosProductivos, setRegistrosProductivos, deleteRegistro } = useGanaderia();
  const { ajustes } = useAjustes();
  const metodo = ajustes.metodoWood305;
  const isInterp = metodo === "interpolacion";
  const isLM = metodo === "actual";
  const isSimple = metodo === "simplificado";

  const [editVacaId, setEditVacaId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistroProductivo | null>(null);
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [woodPreview, setWoodPreview] = useState<WoodFitResult | null>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  // Estado local para los controles de interpolación (N pesajes variables)
  const [controles, setControles] = useState<{ dia: string; produccion: string }[]>([]);

  const update = (key: keyof RegistroProductivo) => (value: string) => {
    setForm(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      // Preview en tiempo real solo para Método Actual (L-M)
      if (isLM && ["reg_1_dia30","reg_2_dia120","reg_3_dia210","reg_4_dia270"].includes(key)) {
        recalcWoodPreview(next);
      }
      return next;
    });
  };

  const findProd = (id_vaca: string) => registrosProductivos.find(r => r.id_vaca === id_vaca);

  /** Ejecuta ajuste L-M y actualiza el preview sin guardar */
  const recalcWoodPreview = (f: RegistroProductivo) => {
    const vaca = registrosBasicos.find(v => v.id_vaca === f.id_vaca);
    const raza = vaca?.raza ?? 'Holstein';
    const pares: { dia: number; prod: number }[] = [
      { dia: 30,  prod: parseFloat(f.reg_1_dia30)  },
      { dia: 120, prod: parseFloat(f.reg_2_dia120) },
      { dia: 210, prod: parseFloat(f.reg_3_dia210) },
      { dia: 270, prod: parseFloat(f.reg_4_dia270) },
    ].filter(p => !isNaN(p.prod) && p.prod > 0);

    if (pares.length === 0) { setWoodPreview(null); return; }
    const result = ajustarWoodLM(pares.map(p => p.dia), pares.map(p => p.prod), raza);
    setWoodPreview(result);
  };

  /**
   * Método Simplificado (Wood): asigna el potencial discreto más cercano
   * por cada pesaje y promedia los 4 potenciales asignados.
   */
  const calcWood305Simplificado = (f: RegistroProductivo): string => {
    // Emparejamos cada registro con su día correcto antes de filtrar
    const pares = [
      { dia: 30,  real: parseFloat(f.reg_1_dia30)  },
      { dia: 120, real: parseFloat(f.reg_2_dia120) },
      { dia: 210, real: parseFloat(f.reg_3_dia210) },
      { dia: 270, real: parseFloat(f.reg_4_dia270) },
    ].filter(p => !isNaN(p.real) && p.real > 0);
    if (pares.length === 0) return "";
    const pots = pares.map(({ dia, real }) => {
      let closest = POTENCIALES[0];
      let minDiff = Math.abs(calcWood(POTENCIALES[0], dia) - real);
      for (const pot of POTENCIALES) {
        const diff = Math.abs(calcWood(pot, dia) - real);
        if (diff < minDiff) { minDiff = diff; closest = pot; }
      }
      return closest;
    });
    return (pots.reduce((s, v) => s + v, 0) / pots.length).toFixed(0);
  };

  /**
   * Método Actual (Wood) — Levenberg-Marquardt.
   * Retorna el valor como string redondeado o "" si no hay datos suficientes.
   */
  const calcWood305LM = (f: RegistroProductivo): string => {
    const vaca = registrosBasicos.find(v => v.id_vaca === f.id_vaca);
    const raza = vaca?.raza ?? 'Holstein';
    const pares: { dia: number; prod: number }[] = [
      { dia: 30,  prod: parseFloat(f.reg_1_dia30)  },
      { dia: 120, prod: parseFloat(f.reg_2_dia120) },
      { dia: 210, prod: parseFloat(f.reg_3_dia210) },
      { dia: 270, prod: parseFloat(f.reg_4_dia270) },
    ].filter(p => !isNaN(p.prod) && p.prod > 0);

    if (pares.length === 0) return "";
    const result = ajustarWoodLM(pares.map(p => p.dia), pares.map(p => p.prod), raza);
    if (!result) return "";
    return result.lc305.toFixed(0);
  };

  const handleRecalcularLC305 = async () => {
    setRecalcLoading(true);
    let updatedProds = [...registrosProductivos];
    let lc305Count = 0;

    for (const prod of registrosProductivos) {
      if (prod.lc305_wood && prod.lc305_wood !== "") continue;
      const vaca = registrosBasicos.find(v => v.id_vaca === prod.id_vaca && v.ejercicio === prod.ejercicio)
               || registrosBasicos.find(v => v.id_vaca === prod.id_vaca);
      const raza = vaca?.raza ?? 'Holstein';
      const pares = [
        { dia: 30,  prod: parseFloat(prod.reg_1_dia30)  },
        { dia: 120, prod: parseFloat(prod.reg_2_dia120) },
        { dia: 210, prod: parseFloat(prod.reg_3_dia210) },
        { dia: 270, prod: parseFloat(prod.reg_4_dia270) },
      ].filter(p => !isNaN(p.prod) && p.prod > 0);
      if (pares.length === 0) continue;
      const result = ajustarWoodLM(pares.map(p => p.dia), pares.map(p => p.prod), raza);
      if (!result) continue;
      const lc305_wood = result.lc305.toFixed(0);
      try {
        const resp = await fetch(
          `/api/registros_productivos/${encodeURIComponent(prod.id_vaca)}/${encodeURIComponent(prod.ejercicio)}`,
          { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productivoToDb({ ...prod, lc305_wood })) }
        );
        if (resp.ok) {
          updatedProds = updatedProds.map(p =>
            p.id_vaca === prod.id_vaca && p.ejercicio === prod.ejercicio
              ? { ...p, lc305_wood } : p
          );
          lc305Count++;
        }
      } catch { /* continuar con la siguiente fila */ }
    }
    setRegistrosProductivos(updatedProds);

    // Ahora actualizar potencial_vaca en basicos = max LC305 por vaca
    const maxLc305: Record<string, number> = {};
    for (const p of updatedProds) {
      const lc = parseFloat(p.lc305_wood);
      if (!isNaN(lc) && lc > 0)
        maxLc305[p.id_vaca] = Math.max(maxLc305[p.id_vaca] || 0, lc);
    }
    // Actualizar potencial_vaca por vaca (un solo PATCH por id_vaca, no por ejercicio)
    const vacasConNuevoPotencial = Object.entries(maxLc305)
      .map(([id_vaca, maxLc]) => ({ id_vaca, potencial_vaca: Math.round(maxLc).toString() }))
      .filter(({ id_vaca, potencial_vaca }) => {
        const actual = registrosBasicos.find(b => b.id_vaca === id_vaca)?.potencial_vaca;
        return actual !== potencial_vaca;
      });

    let updatedBasicos = [...registrosBasicos];
    let basicosCount = 0;
    for (const { id_vaca, potencial_vaca } of vacasConNuevoPotencial) {
      try {
        const resp = await fetch(
          `/api/registros_basicos/${encodeURIComponent(id_vaca)}/potencial`,
          { method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ potencial_vaca }) }
        );
        if (resp.ok) {
          updatedBasicos = updatedBasicos.map(b =>
            b.id_vaca === id_vaca ? { ...b, potencial_vaca } : b
          );
          basicosCount++;
        }
      } catch { /* continuar */ }
    }
    setRegistrosBasicos(updatedBasicos);
    setRecalcLoading(false);
    toast.success(`LC305 calculado: ${lc305Count} filas. Potencial actualizado: ${basicosCount} registros.`);
  };

  const emptyProd = (id_vaca: string, ejercicio: string): RegistroProductivo => ({
    ejercicio, id_vaca,
    reg_1_dia30: "", reg_2_dia120: "", reg_3_dia210: "", reg_4_dia270: "",
    lc305_wood: "", porcentaje_grasa: "", porcentaje_proteina: "",
    lact1: "", lact2: "", lact3: "", lact4: "", lact5: "",
  });

  const startEdit = (id_vaca: string, ejercicio: string) => {
    const existing = findProd(id_vaca);
    const f = existing || emptyProd(id_vaca, ejercicio);
    setForm(f);
    setEditVacaId(id_vaca);
    setWoodPreview(null);
    // Inicializar preview solo para Método Actual (L-M)
    if (isLM) recalcWoodPreview(f);
    // Inicializar controles desde JSON guardado, o desde los 4 campos fijos si hay datos
    const parsed = parseControles(f.controles_adicionales);
    if (parsed.length > 0) {
      setControles(parsed.map(c => ({ dia: String(c.dia), produccion: String(c.produccion) })));
    } else {
      const prefill = [
        { dia: "30", produccion: f.reg_1_dia30 },
        { dia: "120", produccion: f.reg_2_dia120 },
        { dia: "210", produccion: f.reg_3_dia210 },
        { dia: "270", produccion: f.reg_4_dia270 },
      ].filter(c => c.produccion !== "");
      setControles(prefill.length > 0 ? prefill : [{ dia: "", produccion: "" }]);
    }
    setOpen(true);
  };

  const addControl = () => setControles(prev => [...prev, { dia: "", produccion: "" }]);
  const removeControl = (idx: number) => setControles(prev => prev.filter((_, i) => i !== idx));
  const updateControl = (idx: number, field: "dia" | "produccion", value: string) =>
    setControles(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    let updatedForm: RegistroProductivo = { ...form };

    if (isInterp) {
      // Método interpolación: guardar controles en JSON
      const validControles: ControlPunto[] = controles
        .filter(c => c.dia !== "" && c.produccion !== "")
        .map(c => ({ dia: parseInt(c.dia), produccion: parseFloat(c.produccion) }))
        .filter(c => !isNaN(c.dia) && !isNaN(c.produccion) && c.dia > 0 && c.produccion > 0)
        .sort((a, b) => a.dia - b.dia);

      if (validControles.length === 0) {
        toast.error("Ingrese al menos un control válido (día y producción)");
        return;
      }

      // Sync los 4 campos fijos desde los controles más cercanos (compatibilidad)
      const findNearest = (targetDia: number) => {
        const sorted = [...validControles].sort((a, b) => Math.abs(a.dia - targetDia) - Math.abs(b.dia - targetDia));
        return sorted[0] ? String(sorted[0].produccion) : "";
      };
      updatedForm = {
        ...form,
        reg_1_dia30: findNearest(30),
        reg_2_dia120: findNearest(120),
        reg_3_dia210: findNearest(210),
        reg_4_dia270: findNearest(270),
        controles_adicionales: JSON.stringify(validControles),
        lc305_wood: "",
      };
    } else if (isLM) {
      // Método Actual (Wood) — Levenberg-Marquardt
      const lc305 = calcWood305LM(form);
      updatedForm = { ...form, lc305_wood: lc305, controles_adicionales: undefined };
    } else {
      // Método Simplificado (Wood) — lookup discreto original
      const lc305 = calcWood305Simplificado(form);
      updatedForm = { ...form, lc305_wood: lc305, controles_adicionales: undefined };
    }

    const existingIdx = registrosProductivos.findIndex(r => r.id_vaca === editVacaId);
    const dbRow = productivoToDb(updatedForm);

    if (existingIdx >= 0) {
      const resp = await fetch(`/api/registros_productivos/${encodeURIComponent(updatedForm.id_vaca)}/${encodeURIComponent(updatedForm.ejercicio)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbRow),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({ error: resp.statusText })); toast.error(`Error al actualizar: ${e.error}`); return; }
      setRegistrosProductivos(prev => prev.map((r, i) => (i === existingIdx ? updatedForm : r)));
      toast.success("Registro actualizado");
    } else {
      const resp = await fetch('/api/registros_productivos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbRow),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({ error: resp.statusText })); toast.error(`Error al guardar: ${e.error}`); return; }
      setRegistrosProductivos(prev => [...prev, updatedForm]);
      toast.success("Registro guardado");
    }
    setForm(null); setEditVacaId(null); setOpen(false);
  };

  const handleDelete = async (id_vaca: string, ejercicio: string) => {
    await deleteRegistro('registros_productivos', id_vaca, ejercicio);
    toast.success("Registro eliminado");
  };

  const handleDeleteAll = async () => {
    await fetch('/api/registros_productivos', { method: 'DELETE' });
    setRegistrosProductivos([]);
    toast.success("Todos los registros productivos eliminados");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const vacasFiltradas = registrosBasicos.filter(v => filterText === "" || v.id_vaca.includes(filterText));
  const rows = vacasFiltradas.map(vaca => ({ vaca, prod: findProd(vaca.id_vaca) }));
  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const va = a.prod ? parseFloat(a.prod[sortKey]) || 0 : 0;
        const vb = b.prod ? parseFloat(b.prod[sortKey]) || 0 : 0;
        return sortAsc ? va - vb : vb - va;
      })
    : rows;

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  return (
    <FormLayout
      title="Datos Productivos de Leche"
      helpText="Ingrese los controles de producción de leche de cada animal. Los valores se usan para calcular la producción estimada a 305 días."
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <Input placeholder="Filtrar por Id Vaca..." value={filterText} onChange={e => setFilterText(e.target.value)} className="max-w-xs" />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRecalcularLC305}
            disabled={recalcLoading}
            data-testid="button-recalcular-lc305"
            className="flex items-center gap-2 border-green-400 text-green-700 hover:bg-green-50"
          >
            <RefreshCw className={`h-4 w-4 ${recalcLoading ? "animate-spin" : ""}`} />
            {recalcLoading ? "Recalculando…" : "Recalcular LC305 + Potencial"}
          </Button>
          <PdfReportButton
            title="Registros Productivos"
            headers={["Ejercicio", "Id Vaca", "R1 D30", "R2 D120", "R3 D210", "R4 D270", "LC305", "% Grasa", "% Prot", "L1", "L2", "L3", "L4", "L5"]}
            rows={sorted.map(({ vaca, prod }) => [vaca.ejercicio, vaca.id_vaca, prod?.reg_1_dia30||"", prod?.reg_2_dia120||"", prod?.reg_3_dia210||"", prod?.reg_4_dia270||"", prod?.lc305_wood||"", prod?.porcentaje_grasa||"", prod?.porcentaje_proteina||"", prod?.lact1||"", prod?.lact2||"", prod?.lact3||"", prod?.lact4||"", prod?.lact5||""])}
          />
          <DeleteAllButton onConfirm={handleDeleteAll} />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datos Productivos - Vaca #{form?.id_vaca}</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FieldInput label="Ejercicio" value={form.ejercicio} onChange={() => {}} />
                <FieldInput label="Id Vaca" value={form.id_vaca} onChange={() => {}} />
              </div>

              {/* ---- SECCIÓN CONTROLES: según método activo ---- */}
              {isInterp ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Pesajes de Control — Interpolación y Proyección</p>
                      <p className="text-xs text-muted-foreground">Ingrese el día de lactancia y la producción real (kg/día) de cada pesaje. Puede agregar hasta 20 pesajes en días variables.</p>
                    </div>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 text-xs">
                      Método: Interpolación
                    </Badge>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-semibold text-muted-foreground px-1">
                      <span>Día de lactancia</span>
                      <span>Producción (kg/día)</span>
                      <span className="w-8" />
                    </div>
                    {controles.map((c, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="ej. 30"
                          value={c.dia}
                          onChange={e => updateControl(idx, "dia", e.target.value)}
                          min={1}
                          max={305}
                          className="h-9 text-sm"
                          data-testid={`input-control-dia-${idx}`}
                        />
                        <Input
                          type="number"
                          placeholder="ej. 25.5"
                          value={c.produccion}
                          onChange={e => updateControl(idx, "produccion", e.target.value)}
                          min={0}
                          step="0.1"
                          className="h-9 text-sm"
                          data-testid={`input-control-prod-${idx}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => removeControl(idx)}
                          disabled={controles.length <= 1}
                          data-testid={`button-remove-control-${idx}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {controles.length < 20 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 w-full border-dashed"
                        onClick={addControl}
                        data-testid="button-add-control"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar pesaje
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El sistema ordenará los pesajes por día automáticamente al guardar.
                  </p>
                </div>
              ) : isLM ? (
                /* ── Método Actual (Wood) — Levenberg-Marquardt ── */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground pt-2">Registros de Control — Método Actual Wood (días fijos)</p>
                    <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                      Levenberg-Marquardt
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingrese la producción real (kg/día). El sistema ajusta la curva Y(d)=a·d^b·e^(−c·d) a los datos reales y calcula LC305 por integración trapezoidal (D1→D305).
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FieldInput label="Reg 1 Día 30 (kg/día)" value={form.reg_1_dia30} onChange={update("reg_1_dia30")} type="number" highlighted />
                    <FieldInput label="Reg 2 Día 120 (kg/día)" value={form.reg_2_dia120} onChange={update("reg_2_dia120")} type="number" highlighted />
                    <FieldInput label="Reg 3 Día 210 (kg/día)" value={form.reg_3_dia210} onChange={update("reg_3_dia210")} type="number" highlighted />
                    <FieldInput label="Reg 4 Día 270 (kg/día)" value={form.reg_4_dia270} onChange={update("reg_4_dia270")} type="number" highlighted />
                  </div>
                  {/* Panel de preview L-M en tiempo real */}
                  {woodPreview && (
                    <div className="rounded-lg border bg-green-50 border-green-200 p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-semibold text-green-800">Ajuste Wood en tiempo real</span>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={
                            woodPreview.confianza === 'Alta' ? 'bg-green-600 text-white text-xs' :
                            woodPreview.confianza === 'Media' ? 'bg-amber-500 text-white text-xs' :
                            'bg-gray-400 text-white text-xs'
                          }>{woodPreview.confianza}</Badge>
                          {woodPreview.nPuntos >= 2 && (
                            <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                              R² = {woodPreview.r2.toFixed(3)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {woodPreview.nPuntos} pesaje{woodPreview.nPuntos !== 1 ? 's' : ''} · {woodPreview.parametrosLibres} param. libre{woodPreview.parametrosLibres !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white rounded border border-green-100 p-2 text-center">
                          <div className="font-bold text-green-800 text-base">{woodPreview.lc305.toFixed(0)}</div>
                          <div className="text-muted-foreground">LC305 (litros)</div>
                        </div>
                        <div className="bg-white rounded border border-green-100 p-2 text-center">
                          <div className="font-bold text-green-700">{woodPreview.diaPico.toFixed(0)}</div>
                          <div className="text-muted-foreground">Día pico</div>
                        </div>
                        <div className="bg-white rounded border border-green-100 p-2 text-center">
                          <div className="font-mono text-xs text-gray-600">a={woodPreview.a.toFixed(3)}</div>
                          <div className="font-mono text-xs text-gray-600">b={woodPreview.b.toFixed(4)}</div>
                          <div className="text-muted-foreground text-[10px]">Parámetros</div>
                        </div>
                        <div className="bg-white rounded border border-green-100 p-2 text-center">
                          <div className="font-mono text-xs text-gray-600">c={woodPreview.c.toFixed(5)}</div>
                          <div className="text-muted-foreground text-[10px]">Persistencia</div>
                        </div>
                      </div>
                      {woodPreview.confianza === 'Estimación aproximada' && (
                        <p className="text-[10px] text-amber-700">
                          Con 1 pesaje, b y c se fijan en valores estándar. Más controles mejoran la precisión.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Método Simplificado (Wood) — lookup discreto ── */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground pt-2">Registros de Control — Método Simplificado Wood (días fijos)</p>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 text-xs">
                      Potencial discreto
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingrese la producción real (kg/día). El sistema asigna el potencial más cercano de la lista discreta por cada pesaje y promedia el resultado como LC305.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FieldInput label="Reg 1 Día 30 (kg/día)" value={form.reg_1_dia30} onChange={update("reg_1_dia30")} type="number" highlighted />
                    <FieldInput label="Reg 2 Día 120 (kg/día)" value={form.reg_2_dia120} onChange={update("reg_2_dia120")} type="number" highlighted />
                    <FieldInput label="Reg 3 Día 210 (kg/día)" value={form.reg_3_dia210} onChange={update("reg_3_dia210")} type="number" highlighted />
                    <FieldInput label="Reg 4 Día 270 (kg/día)" value={form.reg_4_dia270} onChange={update("reg_4_dia270")} type="number" highlighted />
                  </div>
                  <p className="text-[11px] text-muted-foreground bg-blue-50 border border-blue-100 rounded px-2 py-1">
                    Potenciales disponibles: {POTENCIALES.map(p => p.toLocaleString()).join(', ')} litros. LC305 Wood se calcula automáticamente al guardar.
                  </p>
                </div>
              )}

              <p className="text-sm font-semibold text-muted-foreground pt-2">Composición</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FieldInput label="% Grasa" value={form.porcentaje_grasa} onChange={update("porcentaje_grasa")} type="number" highlighted />
                <FieldInput label="% Proteína" value={form.porcentaje_proteina} onChange={update("porcentaje_proteina")} type="number" highlighted />
              </div>
              <p className="text-sm font-semibold text-muted-foreground pt-2">Lactancias corregidas (litros)</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <FieldInput label="Lact 1" value={form.lact1} onChange={update("lact1")} type="number" highlighted />
                <FieldInput label="Lact 2" value={form.lact2} onChange={update("lact2")} type="number" highlighted />
                <FieldInput label="Lact 3" value={form.lact3} onChange={update("lact3")} type="number" highlighted />
                <FieldInput label="Lact 4" value={form.lact4} onChange={update("lact4")} type="number" highlighted />
                <FieldInput label="Lact 5" value={form.lact5} onChange={update("lact5")} type="number" highlighted />
              </div>
              <p className="text-xs text-muted-foreground">
                {isInterp
                  ? "El método de interpolación calculará P305 automáticamente desde los pesajes."
                  : isLM
                  ? "LC305 se calcula ajustando los parámetros Wood con Levenberg-Marquardt al guardar."
                  : "LC305 se asigna por potencial discreto más cercano al guardar."}
                {" "}Las lactancias se ingresan manualmente.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" data-testid="button-guardar-productivo">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Ejercicio</TableHead>
              <SortHeader label="Id Vaca" field="id_vaca" />
              {isInterp ? (
                <TableHead title="Pesajes registrados para interpolación"># Pesajes</TableHead>
              ) : (
                <>
                  <TableHead>R1 D30</TableHead>
                  <TableHead>R2 D120</TableHead>
                  <TableHead>R3 D210</TableHead>
                  <TableHead>R4 D270</TableHead>
                  <SortHeader label="LC305" field="lc305_wood" />
                </>
              )}
              <SortHeader label="% Grasa" field="porcentaje_grasa" />
              <SortHeader label="% Prot" field="porcentaje_proteina" />
              <TableHead>L1</TableHead>
              <TableHead>L2</TableHead>
              <TableHead>L3</TableHead>
              <TableHead>L4</TableHead>
              <TableHead>L5</TableHead>
              <TableHead className="w-24">Acc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  No hay vacas registradas.
                </TableCell>
              </TableRow>
            ) : sorted.map(({ vaca, prod }, i) => {
              const numControles = parseControles(prod?.controles_adicionales).length;
              return (
                <TableRow key={i}>
                  <TableCell>{vaca.ejercicio}</TableCell>
                  <TableCell className="font-medium">{vaca.id_vaca}</TableCell>
                  {isInterp ? (
                    <TableCell>
                      {numControles > 0
                        ? <span className="font-medium text-blue-700">{numControles} pesajes</span>
                        : prod?.reg_1_dia30
                          ? <span className="text-muted-foreground text-xs">4 fijos</span>
                          : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{prod?.reg_1_dia30 || "—"}</TableCell>
                      <TableCell>{prod?.reg_2_dia120 || "—"}</TableCell>
                      <TableCell>{prod?.reg_3_dia210 || "—"}</TableCell>
                      <TableCell>{prod?.reg_4_dia270 || "—"}</TableCell>
                      <TableCell className="font-bold">{prod?.lc305_wood || "—"}</TableCell>
                    </>
                  )}
                  <TableCell>{prod?.porcentaje_grasa || "—"}</TableCell>
                  <TableCell>{prod?.porcentaje_proteina || "—"}</TableCell>
                  <TableCell>{prod?.lact1 || "—"}</TableCell>
                  <TableCell>{prod?.lact2 || "—"}</TableCell>
                  <TableCell>{prod?.lact3 || "—"}</TableCell>
                  <TableCell>{prod?.lact4 || "—"}</TableCell>
                  <TableCell>{prod?.lact5 || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(vaca.id_vaca, vaca.ejercicio)} data-testid={`button-edit-prod-${vaca.id_vaca}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {prod && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(vaca.id_vaca, vaca.ejercicio)} className="text-destructive hover:text-destructive" data-testid={`button-delete-prod-${vaca.id_vaca}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isInterp && (
        <p className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <strong>Método Interpolación activo:</strong> Ingrese todos los pesajes en días variables para cada vaca. El cálculo de P305 se realiza automáticamente en{" "}
          <a href="/produccion-wood" className="underline font-medium">Producción Estimada a 305 Días</a>.
          Para cambiar al método Wood estándar, vaya a <a href="/ajustes" className="underline font-medium">Ajustes del Sistema</a>.
        </p>
      )}
    </FormLayout>
  );
};

export default RegistrosProductivos;
