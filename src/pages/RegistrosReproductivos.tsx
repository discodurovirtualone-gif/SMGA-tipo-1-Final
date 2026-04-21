import { useState } from "react";
import FormLayout from "@/components/FormLayout";
import FieldInput from "@/components/FieldInput";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useGanaderia, RegistroReproductivo, reproductivoToDb } from "@/context/GanaderiaContext";
import { supabase } from "@/integrations/supabase/client";
import PdfReportButton from "@/components/PdfReportButton";
import DeleteAllButton from "@/components/DeleteAllButton";

const emptyRepro = (id_vaca: string, ejercicio: string): RegistroReproductivo => ({
  id_vaca, ejercicio, parto: "", raza: "",
  servicio1: "", servicio2: "", servicio3: "",
  concepcion1: "", toroUsado: "", aborto1: "", aborto2: "", parto1: "",
  iip: "", ipc: "", serv_conc: "",
});

const RegistrosReproductivos = () => {
  const { registrosBasicos, registrosReproductivos, setRegistrosReproductivos, deleteRegistro } = useGanaderia();
  const [form, setForm] = useState<RegistroReproductivo | null>(null);
  const [editVacaId, setEditVacaId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const update = (key: keyof RegistroReproductivo) => (value: string) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev);

  const findRepro = (id_vaca: string) => registrosReproductivos.find(r => r.id_vaca === id_vaca);

  const startEdit = (id_vaca: string, ejercicio: string) => {
    const existing = findRepro(id_vaca);
    setForm(existing || emptyRepro(id_vaca, ejercicio));
    setEditVacaId(id_vaca);
    setOpen(true);
  };

  const startNew = () => { setForm(emptyRepro("", "")); setEditVacaId(null); setOpen(true); };

  const calcIIP = (parto: string, parto1: string): string => {
    if (!parto || !parto1) return "";
    const d1 = new Date(parto), d2 = new Date(parto1);
    const diff = Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.round(diff).toString() : "";
  };

  const calcIPC = (parto: string, concepcion1: string): string => {
    if (!parto || !concepcion1) return "";
    const d1 = new Date(parto), d2 = new Date(concepcion1);
    const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.round(diff).toString() : "";
  };

  const calcServConc = (s1: string, s2: string, s3: string): string => {
    let count = 0;
    if (s1) count++;
    if (s2) count++;
    if (s3) count++;
    return count > 0 ? count.toString() : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.id_vaca) { toast.error("El campo Id Vaca es obligatorio"); return; }

    const updatedForm = {
      ...form,
      iip: calcIIP(form.parto, form.parto1),
      ipc: calcIPC(form.parto, form.concepcion1),
      serv_conc: calcServConc(form.servicio1, form.servicio2, form.servicio3),
    };

    const dbRow = reproductivoToDb(updatedForm);
    const existingIdx = registrosReproductivos.findIndex(r => r.id_vaca === editVacaId);

    if (existingIdx >= 0) {
      const { error } = await supabase.from('registros_reproductivos').update(dbRow).eq('id_vaca', updatedForm.id_vaca).eq('ejercicio', updatedForm.ejercicio);
      if (error) { toast.error(`Error al actualizar: ${error.message}`); console.error(error); return; }
      setRegistrosReproductivos(prev => prev.map((r, i) => (i === existingIdx ? updatedForm : r)));
      toast.success("Registro actualizado");
    } else {
      const { error } = await supabase.from('registros_reproductivos').insert(dbRow);
      if (error) { toast.error(`Error al guardar: ${error.message}`); console.error(error); return; }
      setRegistrosReproductivos(prev => [...prev, updatedForm]);
      toast.success("Registro guardado");
    }
    setForm(null); setEditVacaId(null); setOpen(false);
  };

  const handleDelete = async (id_vaca: string, ejercicio: string) => {
    await deleteRegistro('registros_reproductivos', id_vaca, ejercicio);
    toast.success("Registro eliminado");
  };

  const handleDeleteAll = async () => {
    await supabase.from('registros_reproductivos').delete().neq('id', '');
    setRegistrosReproductivos([]);
    toast.success("Todos los registros reproductivos eliminados");
  };

  return (
    <FormLayout
      title="Datos Reproductivos"
      helpText="Registre las fechas de parto, servicios, concepción y el toro utilizado en cada animal. Estos datos permiten calcular los índices reproductivos del rodeo."
    >
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex gap-2">
          <PdfReportButton
            title="Registros Reproductivos"
            headers={["Ejercicio", "Id Vaca", "Parto", "Serv 1", "Serv 2", "Serv 3", "Concepción", "Parto 1", "IIP", "IPC", "S/C"]}
            rows={registrosBasicos.map(v => {
              const r = registrosReproductivos.find(rr => rr.id_vaca === v.id_vaca);
              return [v.ejercicio, v.id_vaca, r?.parto||"", r?.servicio1||"", r?.servicio2||"", r?.servicio3||"", r?.concepcion1||"", r?.parto1||"", r?.iip||"", r?.ipc||"", r?.serv_conc||""];
            })}
          />
          <DeleteAllButton onConfirm={handleDeleteAll} />
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Agregar Datos</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datos Reproductivos - Vaca #{form?.id_vaca}</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FieldInput label="Id Vaca" value={form.id_vaca} onChange={editVacaId ? () => {} : update("id_vaca")} />
                <FieldInput label="Ejercicio" value={form.ejercicio} onChange={editVacaId ? () => {} : update("ejercicio")} />
                <FieldInput label="Parto" value={form.parto} onChange={update("parto")} type="date" highlighted />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FieldInput label="Servicio 1" value={form.servicio1} onChange={update("servicio1")} type="date" highlighted />
                <FieldInput label="Servicio 2" value={form.servicio2} onChange={update("servicio2")} type="date" highlighted />
                <FieldInput label="Servicio 3" value={form.servicio3} onChange={update("servicio3")} type="date" highlighted />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FieldInput label="Concepción 1" value={form.concepcion1} onChange={update("concepcion1")} type="date" highlighted />
                <FieldInput label="Toro Usado" value={form.toroUsado} onChange={update("toroUsado")} highlighted />
                <FieldInput label="Aborto 1" value={form.aborto1} onChange={update("aborto1")} type="date" highlighted />
                <FieldInput label="Aborto 2" value={form.aborto2} onChange={update("aborto2")} type="date" highlighted />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FieldInput label="Parto 1 (siguiente)" value={form.parto1} onChange={update("parto1")} type="date" highlighted />
              </div>
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
              <TableHead>Id Vaca</TableHead>
              <TableHead>Parto</TableHead>
              <TableHead>Serv 1</TableHead>
              <TableHead>Serv 2</TableHead>
              <TableHead>Serv 3</TableHead>
              <TableHead>Concepción</TableHead>
              <TableHead>Parto 1</TableHead>
              <TableHead>IIP</TableHead>
              <TableHead>IPC</TableHead>
              <TableHead>S/C</TableHead>
              <TableHead className="w-24">Acc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosBasicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  No hay vacas registradas.
                </TableCell>
              </TableRow>
            ) : registrosBasicos.map((vaca, i) => {
              const repro = findRepro(vaca.id_vaca);
              return (
                <TableRow key={i}>
                  <TableCell>{vaca.ejercicio}</TableCell>
                  <TableCell className="font-medium">{vaca.id_vaca}</TableCell>
                  <TableCell>{repro?.parto || "—"}</TableCell>
                  <TableCell>{repro?.servicio1 || "—"}</TableCell>
                  <TableCell>{repro?.servicio2 || "—"}</TableCell>
                  <TableCell>{repro?.servicio3 || "—"}</TableCell>
                  <TableCell>{repro?.concepcion1 || "—"}</TableCell>
                  <TableCell>{repro?.parto1 || "—"}</TableCell>
                  <TableCell>{repro?.iip || "—"}</TableCell>
                  <TableCell>{repro?.ipc || "—"}</TableCell>
                  <TableCell>{repro?.serv_conc || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(vaca.id_vaca, vaca.ejercicio)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {repro && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(vaca.id_vaca, vaca.ejercicio)} className="text-destructive hover:text-destructive">
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
    </FormLayout>
  );
};

export default RegistrosReproductivos;
