import { useState } from "react";
import FormLayout from "@/components/FormLayout";
import FieldInput from "@/components/FieldInput";
import FieldSelect from "@/components/FieldSelect";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useGanaderia, RegistroBasico, basicoToDb, calcEdadAnios } from "@/context/GanaderiaContext";
import { supabase } from "@/integrations/supabase/client";
import PdfReportButton from "@/components/PdfReportButton";
import DeleteAllButton from "@/components/DeleteAllButton";

const ejercicioOptions = Array.from({ length: 10 }, (_, i) => {
  const y = 2020 + i;
  return { value: `${y % 100}/${(y + 1) % 100}`, label: `${y % 100}/${(y + 1) % 100}` };
});


const lactanciaOptions = Array.from({ length: 6 }, (_, i) => ({
  value: String(i + 1), label: String(i + 1),
}));

const emptyRegistro: RegistroBasico = {
  ejercicio: "", id_vaca: "", partos: "", fecha_nacimiento: "",
  raza: "", lactancia: "", edad: "", potencial_vaca: "",
};

const RegistrosBasicos = () => {
  const { registrosBasicos, setRegistrosBasicos, deleteRegistro } = useGanaderia();
  const [form, setForm] = useState<RegistroBasico>(emptyRegistro);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const update = (key: keyof RegistroBasico) => (value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "fecha_nacimiento" && value) {
        next.edad = String(calcEdadAnios(value));
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id_vaca) { toast.error("El campo Id Vaca es obligatorio"); return; }
    const dbRow = basicoToDb(form);
    if (editIndex !== null) {
      const old = registrosBasicos[editIndex];
      const { error } = await supabase.from('registros_basicos').update(dbRow).eq('id_vaca', old.id_vaca).eq('ejercicio', old.ejercicio);
      if (error) { toast.error(`Error al actualizar: ${error.message}`); console.error(error); return; }
      setRegistrosBasicos(prev => prev.map((r, i) => (i === editIndex ? form : r)));
      toast.success("Registro actualizado");
    } else {
      const { error } = await supabase.from('registros_basicos').insert(dbRow);
      if (error) { toast.error(`Error al guardar: ${error.message}`); console.error(error); return; }
      setRegistrosBasicos(prev => [...prev, form]);
      toast.success("Registro guardado");
    }
    setForm(emptyRegistro); setEditIndex(null); setOpen(false);
  };

  const handleDelete = async (i: number) => {
    const r = registrosBasicos[i];
    await deleteRegistro('registros_basicos', r.id_vaca, r.ejercicio);
    toast.success("Registro eliminado");
  };

  const handleDeleteAll = async () => {
    await supabase.from('registros_basicos').delete().neq('id', '');
    setRegistrosBasicos([]);
    toast.success("Todos los registros básicos eliminados");
  };

  const startEdit = (i: number) => { setForm(registrosBasicos[i]); setEditIndex(i); setOpen(true); };
  const startNew = () => { setForm(emptyRegistro); setEditIndex(null); setOpen(true); };

  return (
    <FormLayout
      title="Datos de Animales"
      helpText="Aquí registra la información básica de cada vaca: nombre o número, raza, fecha de nacimiento y potencial de producción."
    >
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex gap-2">
          <PdfReportButton
            title="Datos de Animales"
            headers={["Ejercicio", "Id Vaca", "Fecha Nac.", "Raza", "Lactancia", "Edad (años)", "Potencial"]}
            rows={registrosBasicos.map(r => [r.ejercicio, r.id_vaca, r.fecha_nacimiento, r.raza, r.lactancia, r.edad, r.potencial_vaca])}
          />
          <DeleteAllButton onConfirm={handleDeleteAll} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Agregar Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editIndex !== null ? "Editar Registro" : "Nuevo Registro"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldSelect label="Ejercicio" value={form.ejercicio} onChange={update("ejercicio")} options={ejercicioOptions} placeholder="Seleccionar" highlighted />
                <FieldInput label="Id Vaca" value={form.id_vaca} onChange={update("id_vaca")} type="number" highlighted />
                <FieldInput label="Fecha Nacimiento" value={form.fecha_nacimiento} onChange={update("fecha_nacimiento")} type="date" highlighted />
                <FieldSelect label="Raza" value={form.raza} onChange={update("raza")} options={[{ value: "Jersey", label: "Jersey" }, { value: "Holando", label: "Holando" }, { value: "Otras", label: "Otras" }]} placeholder="Seleccionar raza" highlighted />
                <FieldSelect label="Lactancia" value={form.lactancia} onChange={update("lactancia")} options={lactanciaOptions} placeholder="Seleccionar" highlighted />
                <FieldInput label="Edad (años)" value={form.edad} onChange={() => {}} type="number" />
                <FieldInput label="Potencial Vaca (lt)" value={form.potencial_vaca} onChange={update("potencial_vaca")} type="number" highlighted />
              </div>
              <p className="text-xs text-muted-foreground">La edad se calcula automáticamente en años a partir de la fecha de nacimiento.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">{editIndex !== null ? "Actualizar" : "Guardar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Ejercicio</TableHead>
              <TableHead>Id Vaca</TableHead>
              <TableHead>Fecha Nac.</TableHead>
              <TableHead>Raza</TableHead>
              <TableHead>Lactancia</TableHead>
              <TableHead>Edad (años)</TableHead>
              <TableHead>Potencial</TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosBasicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay registros. Haga clic en "Agregar Registro" para comenzar.
                </TableCell>
              </TableRow>
            ) : registrosBasicos.map((r, i) => (
              <TableRow key={`${r.id_vaca}-${r.ejercicio}-${i}`}>
                <TableCell>{r.ejercicio}</TableCell>
                <TableCell className="font-medium">{r.id_vaca}</TableCell>
                <TableCell>{r.fecha_nacimiento}</TableCell>
                <TableCell>{r.raza}</TableCell>
                <TableCell>{r.lactancia}</TableCell>
                <TableCell>{r.edad}</TableCell>
                <TableCell>{r.potencial_vaca}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(i)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default RegistrosBasicos;
