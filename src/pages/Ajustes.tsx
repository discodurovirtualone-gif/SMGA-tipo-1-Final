import { useState } from "react";
import FormLayout from "@/components/FormLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle2, TrendingUp } from "lucide-react";
import { useAjustes, MetodoWood305 } from "@/context/AjustesContext";
import { useGanaderia, FactorCorreccion } from "@/context/GanaderiaContext";
import FieldInput from "@/components/FieldInput";
import FieldSelect from "@/components/FieldSelect";

const razaOptions = [
  { value: "Holstein", label: "Holstein" },
  { value: "Jersey", label: "Jersey" },
];
const nivelOptions = [
  { value: "Alto", label: "Alto" },
  { value: "Medio", label: "Medio" },
  { value: "Bajo", label: "Bajo" },
];
const emptyFactor: FactorCorreccion = { raza: "", nivel_produccion: "", edad: 0, lactancia: 0, factor: 0 };

const EDITABLE_INPUT = "h-8 text-sm bg-field-highlight border-accent";
const NON_EDITABLE_INPUT = "h-8 text-sm bg-white";

const METODOS: { value: MetodoWood305; label: string; subtitle: string; formula: string; badge: string }[] = [
  {
    value: "simplificado",
    label: "Método Simplificado (Wood)",
    subtitle: "Curva de Wood estándar con parámetros fijos. Asigna el potencial más cercano de una lista discreta según cada pesaje.",
    formula: "Y(d) = (pot × 0.00318) × d^0.1027 × e^(−0.003×d)  →  LC305 = promedio de potenciales asignados",
    badge: "Rápido",
  },
  {
    value: "actual",
    label: "Método Actual (Wood) — Levenberg-Marquardt",
    subtitle: "Ajusta los parámetros a,b,c de la curva de Wood a los pesajes reales. Mayor precisión con 3 o 4 controles.",
    formula: "Y(d) = a·d^b·e^(−c·d)  →  LC305 = ∫₁³⁰⁵ Y(d)dd  (trapecio)  |  R² como indicador de confianza",
    badge: "Recomendado",
  },
  {
    value: "interpolacion",
    label: "Interpolación y Proyección",
    subtitle: "Proyecta la producción real al día 305 usando N pesajes en días variables y un factor de proyección.",
    formula: "FPR = (Y305 − Ya) / (Yn × (305 − n))  →  P305 = Ya + FPR × Yn × (305 − n)",
    badge: "N pesajes",
  },
];

const Ajustes = () => {
  const { ajustes, setHeredabilidad, setRepetibilidad, setRangoPotenciales, setMetodoWood305, potencialesAuto } = useAjustes();
  const { factores, setFactores } = useGanaderia();

  const [customRange, setCustomRange] = useState(ajustes.rangoPotenciales.join(", "));
  const [factorForm, setFactorForm] = useState<FactorCorreccion>(emptyFactor);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const handleRangeApply = () => {
    const vals = customRange.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (vals.length < 2) { toast.error("Ingrese al menos 2 valores separados por comas"); return; }
    setRangoPotenciales(vals.sort((a, b) => a - b));
    toast.success("Rango de potenciales actualizado");
  };

  const handleResetRange = () => {
    setRangoPotenciales([]);
    setCustomRange(potencialesAuto.join(", "));
    toast.success("Rango restablecido al valor automático");
  };

  const handleFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorForm.raza || factorForm.edad <= 0) { toast.error("Complete los campos obligatorios"); return; }
    if (editIndex !== null) {
      setFactores(prev => prev.map((f, i) => (i === editIndex ? factorForm : f)));
      toast.success("Factor actualizado");
    } else {
      setFactores(prev => [...prev, factorForm]);
      toast.success("Factor agregado");
    }
    setFactorForm(emptyFactor);
    setEditIndex(null);
    setOpen(false);
  };

  const handleDeleteFactor = (i: number) => {
    setFactores(prev => prev.filter((_, idx) => idx !== i));
    toast.success("Factor eliminado");
  };

  return (
    <FormLayout
      title="Ajustes del Sistema"
      helpText="Configure los parámetros que se usan en todos los cálculos del sistema."
    >
      <div className="space-y-6">

        {/* Método de cálculo Wood 305 */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-accent/50 pb-2">
            <CardTitle className="text-lg font-bold">Método de Cálculo — Producción a 305 días</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Elija el método que se usará para estimar la producción de leche a 305 días de lactancia.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {METODOS.map((m) => {
                const selected = ajustes.metodoWood305 === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setMetodoWood305(m.value); toast.success(`Método cambiado: ${m.label}`); }}
                    className={`text-left rounded-xl border-2 p-4 transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary/30
                      ${selected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    data-testid={`button-metodo-${m.value}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 rounded-full p-1 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-sm ${selected ? "text-primary" : "text-foreground"}`}>{m.label}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0
                            ${m.badge === 'Recomendado' ? 'bg-green-100 text-green-700' :
                              m.badge === 'Rápido' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'}`}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{m.subtitle}</p>
                        <code className="text-[10px] bg-muted px-2 py-1 rounded block mt-1 leading-relaxed break-all">{m.formula}</code>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rango de Potenciales */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-accent/50 pb-2">
            <CardTitle className="text-lg font-bold">Rango de Potenciales (Wood 305)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Rango automático basado en el potencial promedio del rodeo. Puede modificarlo manualmente.
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium">Potenciales (separados por coma)</Label>
                <Input
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="Ej: 4000, 5000, 6000, 7000, 8000"
                  className={EDITABLE_INPUT}
                />
              </div>
              <Button onClick={handleRangeApply} size="sm">Aplicar</Button>
              <Button onClick={handleResetRange} variant="outline" size="sm">Auto</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ajustes.rangoPotenciales.map((p) => (
                <span key={p} className="px-3 py-1 rounded-full bg-primary/10 text-sm font-medium">{p.toLocaleString()} lt</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Heredabilidad y Repetibilidad */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-accent/50 pb-2">
            <CardTitle className="text-lg font-bold">Heredabilidad y Repetibilidad (Leche)</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Heredabilidad (h²)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ajustes.heredabilidad}
                  onChange={(e) => setHeredabilidad(e.target.value)}
                  className={EDITABLE_INPUT}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Repetibilidad (R)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ajustes.repetibilidad}
                  onChange={(e) => setRepetibilidad(e.target.value)}
                  className={EDITABLE_INPUT}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Estos valores se aplican automáticamente en Valor de Cría y Tablero Final.
            </p>
          </CardContent>
        </Card>

        {/* Factores de Corrección */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-accent/50 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Factores de Corrección</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => { setFactorForm(emptyFactor); setEditIndex(null); setOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editIndex !== null ? "Editar Factor" : "Nuevo Factor"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFactorSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldSelect label="Raza" value={factorForm.raza} onChange={(v) => setFactorForm(p => ({ ...p, raza: v }))} options={razaOptions} placeholder="Seleccionar" highlighted />
                    <FieldSelect label="Nivel Producción" value={factorForm.nivel_produccion} onChange={(v) => setFactorForm(p => ({ ...p, nivel_produccion: v }))} options={nivelOptions} placeholder="Seleccionar" highlighted />
                    <FieldInput label="Edad" value={String(factorForm.edad)} onChange={(v) => setFactorForm(p => ({ ...p, edad: parseInt(v) || 0 }))} type="number" highlighted />
                    <FieldInput label="Lactancia" value={String(factorForm.lactancia)} onChange={(v) => setFactorForm(p => ({ ...p, lactancia: parseInt(v) || 0 }))} type="number" highlighted />
                    <FieldInput label="Factor" value={String(factorForm.factor)} onChange={(v) => setFactorForm(p => ({ ...p, factor: parseFloat(v) || 0 }))} type="number" highlighted />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editIndex !== null ? "Actualizar" : "Guardar"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="font-semibold text-foreground">Raza</TableHead>
                    <TableHead className="font-semibold text-foreground">Nivel</TableHead>
                    <TableHead className="font-semibold text-foreground">Edad</TableHead>
                    <TableHead className="font-semibold text-foreground">Lactancia</TableHead>
                    <TableHead className="font-semibold text-foreground">Factor</TableHead>
                    <TableHead className="w-20">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-4">Sin factores</TableCell>
                    </TableRow>
                  ) : factores.map((f, i) => (
                    <TableRow key={`${f.raza}-${f.edad}-${f.lactancia}-${i}`}>
                      <TableCell>{f.raza}</TableCell>
                      <TableCell>{f.nivel_produccion}</TableCell>
                      <TableCell>{f.edad}</TableCell>
                      <TableCell>{f.lactancia}</TableCell>
                      <TableCell className="font-medium">{f.factor}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFactorForm(f); setEditIndex(i); setOpen(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFactor(i)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </FormLayout>
  );
};

export default Ajustes;
