import { useState } from "react";
import FormLayout from "@/components/FormLayout";
import FieldInput from "@/components/FieldInput";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useGanaderia, RegistroProductivo, calcWood, productivoToDb } from "@/context/GanaderiaContext";
import { supabase } from "@/integrations/supabase/client";
import PdfReportButton from "@/components/PdfReportButton";
import DeleteAllButton from "@/components/DeleteAllButton";

const DIAS = [30, 120, 210, 270];
const POTENCIALES = [2000, 3000, 4000, 5000, 6000, 7000];

type SortKey = "id_vaca" | "lc305_wood" | "porcentaje_grasa" | "porcentaje_proteina";

const RegistrosProductivos = () => {
  const { registrosBasicos, registrosProductivos, setRegistrosProductivos, deleteRegistro } = useGanaderia();
  const [editVacaId, setEditVacaId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistroProductivo | null>(null);
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const update = (key: keyof RegistroProductivo) => (value: string) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev);

  const findProd = (id_vaca: string) => registrosProductivos.find(r => r.id_vaca === id_vaca);

  const calcWood305 = (id_vaca: string, reg1: string, reg2: string, reg3: string, reg4: string): string => {
    const vaca = registrosBasicos.find(v => v.id_vaca === id_vaca);
    if (!vaca) return "";
    const potencial = parseFloat(vaca.potencial_vaca);
    if (!potencial || potencial <= 0) return "";
    const reales = [parseFloat(reg1), parseFloat(reg2), parseFloat(reg3), parseFloat(reg4)];
    if (reales.some(isNaN)) return "";
    const potAsignados = DIAS.map((dia, i) => {
      let closest = POTENCIALES[0];
      let minDiff = Math.abs(calcWood(POTENCIALES[0], dia) - reales[i]);
      for (const pot of POTENCIALES) {
        const diff = Math.abs(calcWood(pot, dia) - reales[i]);
        if (diff < minDiff) { minDiff = diff; closest = pot; }
      }
      return closest;
    });
    return (potAsignados.reduce((s, v) => s + v, 0) / potAsignados.length).toFixed(0);
  };

  const emptyProd = (id_vaca: string, ejercicio: string): RegistroProductivo => ({
    ejercicio, id_vaca,
    reg_1_dia30: "", reg_2_dia120: "", reg_3_dia210: "", reg_4_dia270: "",
    lc305_wood: "", porcentaje_grasa: "", porcentaje_proteina: "",
    lact1: "", lact2: "", lact3: "", lact4: "", lact5: "",
  });

  const startEdit = (id_vaca: string, ejercicio: string) => {
    const existing = findProd(id_vaca);
    setForm(existing || emptyProd(id_vaca, ejercicio));
    setEditVacaId(id_vaca);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const lc305 = calcWood305(form.id_vaca, form.reg_1_dia30, form.reg_2_dia120, form.reg_3_dia210, form.reg_4_dia270);
    const updatedForm: RegistroProductivo = { ...form, lc305_wood: lc305 };
    const existingIdx = registrosProductivos.findIndex(r => r.id_vaca === editVacaId);
    const dbRow = productivoToDb(updatedForm);

    if (existingIdx >= 0) {
      const { error } = await supabase.from('registros_productivos').update(dbRow).eq('id_vaca', updatedForm.id_vaca).eq('ejercicio', updatedForm.ejercicio);
      if (error) { toast.error(`Error al actualizar: ${error.message}`); console.error(error); return; }
      setRegistrosProductivos(prev => prev.map((r, i) => (i === existingIdx ? updatedForm : r)));
      toast.success("Registro actualizado");
    } else {
      const { error } = await supabase.from('registros_productivos').insert(dbRow);
      if (error) { toast.error(`Error al guardar: ${error.message}`); console.error(error); return; }
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
    await supabase.from('registros_productivos').delete().neq('id', '');
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
              <p className="text-sm font-semibold text-muted-foreground pt-2">Registros de Control (ingrese producción real)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FieldInput label="Reg 1 Día 30" value={form.reg_1_dia30} onChange={update("reg_1_dia30")} type="number" highlighted />
                <FieldInput label="Reg 2 Día 120" value={form.reg_2_dia120} onChange={update("reg_2_dia120")} type="number" highlighted />
                <FieldInput label="Reg 3 Día 210" value={form.reg_3_dia210} onChange={update("reg_3_dia210")} type="number" highlighted />
                <FieldInput label="Reg 4 Día 270" value={form.reg_4_dia270} onChange={update("reg_4_dia270")} type="number" highlighted />
              </div>
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
              <p className="text-xs text-muted-foreground">LC305 Wood se calcula automáticamente al guardar. Las lactancias se ingresan manualmente.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
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
              <TableHead>R1 D30</TableHead>
              <TableHead>R2 D120</TableHead>
              <TableHead>R3 D210</TableHead>
              <TableHead>R4 D270</TableHead>
              <SortHeader label="LC305" field="lc305_wood" />
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
            ) : sorted.map(({ vaca, prod }, i) => (
              <TableRow key={i}>
                <TableCell>{vaca.ejercicio}</TableCell>
                <TableCell className="font-medium">{vaca.id_vaca}</TableCell>
                <TableCell>{prod?.reg_1_dia30 || "—"}</TableCell>
                <TableCell>{prod?.reg_2_dia120 || "—"}</TableCell>
                <TableCell>{prod?.reg_3_dia210 || "—"}</TableCell>
                <TableCell>{prod?.reg_4_dia270 || "—"}</TableCell>
                <TableCell className="font-bold">{prod?.lc305_wood || "—"}</TableCell>
                <TableCell>{prod?.porcentaje_grasa || "—"}</TableCell>
                <TableCell>{prod?.porcentaje_proteina || "—"}</TableCell>
                <TableCell>{prod?.lact1 || "—"}</TableCell>
                <TableCell>{prod?.lact2 || "—"}</TableCell>
                <TableCell>{prod?.lact3 || "—"}</TableCell>
                <TableCell>{prod?.lact4 || "—"}</TableCell>
                <TableCell>{prod?.lact5 || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(vaca.id_vaca, vaca.ejercicio)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {prod && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vaca.id_vaca, vaca.ejercicio)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </FormLayout>
  );
};

export default RegistrosProductivos;
