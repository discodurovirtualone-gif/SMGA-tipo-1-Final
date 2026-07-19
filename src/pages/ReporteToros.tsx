import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import FormLayout from "@/components/FormLayout";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowUpDown, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useGanaderia, Toro } from "@/context/GanaderiaContext";

const calcINIA = (dep_leche: number, dep_grasa: number, dep_prot: number) =>
  -0.0477 * dep_leche + 0.8317 * dep_grasa + 1.4394 * dep_prot;

const calcRovere = (dep_leche: number, dep_grasa: number, dep_prot: number, dep_tph: number) =>
  -0.037 * dep_leche + 0.288 * dep_grasa + 1.977 * dep_prot + 2.298 * dep_tph;

type EditState = Omit<Toro, "indice_inia" | "indice_rovere"> & {
  dep_leche: string;
  dep_grasa: string;
  dep_prot: string;
  dep_tph: string;
  precio_dosis: string;
};

const toroToEdit = (t: Toro): EditState => ({
  id_toro: t.id_toro,
  nombre: t.nombre || "",
  dep_leche: String(t.dep_leche ?? ""),
  dep_grasa: String(t.dep_grasa ?? ""),
  dep_prot: String(t.dep_prot ?? ""),
  dep_tph: String(t.dep_tph ?? ""),
  precio_dosis: String(t.precio_dosis ?? ""),
  caracteristicas: t.caracteristicas || "",
});

const InlineInput = ({
  value,
  onChange,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`h-8 text-sm px-2 rounded border border-primary/40 bg-yellow-50 focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
  />
);

const ReporteToros = () => {
  const { toros, setToros } = useGanaderia();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sortKey, setSortKey] = useState<string>("indice_inia");
  const [sortAsc, setSortAsc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const startEdit = (toro: Toro) => {
    setEditingId(toro.id_toro);
    setEditState(toroToEdit(toro));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const updateEdit = (field: keyof EditState) => (value: string) => {
    setEditState(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const saveEdit = async () => {
    if (!editState || !editingId) return;
    setSaving(true);
    const dep_leche = parseFloat(editState.dep_leche) || 0;
    const dep_grasa = parseFloat(editState.dep_grasa) || 0;
    const dep_prot = parseFloat(editState.dep_prot) || 0;
    const dep_tph = parseFloat(editState.dep_tph) || 0;
    const precio_dosis = parseFloat(editState.precio_dosis) || 0;
    const indice_inia = calcINIA(dep_leche, dep_grasa, dep_prot);
    const indice_rovere = calcRovere(dep_leche, dep_grasa, dep_prot, dep_tph);

    const updated: Toro = {
      id_toro: editState.id_toro,
      nombre: editState.nombre,
      dep_leche,
      dep_grasa,
      dep_prot,
      dep_tph,
      indice_inia,
      indice_rovere,
      precio_dosis,
      caracteristicas: editState.caracteristicas,
    };

    const resp = await fetch(`/api/toros/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: updated.nombre, dep_leche, dep_grasa, dep_prot, dep_tph,
        indice_inia, indice_rovere, precio_dosis, caracteristicas: updated.caracteristicas,
      }),
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({ error: resp.statusText }));
      toast.error(`Error al guardar: ${e.error}`);
    } else {
      setToros(prev => prev.map(t => t.id_toro === editingId ? updated : t));
      toast.success("Toro actualizado");
      cancelEdit();
    }
    setSaving(false);
  };

  const handleDelete = async (id_toro: string) => {
    const resp = await fetch(`/api/toros/${id_toro}`, { method: 'DELETE' });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({ error: resp.statusText }));
      toast.error(`Error al eliminar: ${e.error}`);
    } else {
      setToros(prev => prev.filter(t => t.id_toro !== id_toro));
      toast.success("Toro eliminado");
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

        const newToros: Toro[] = json
          .filter((row) => row.id_toro || row.Id_Toro || row.ID_TORO || row.id)
          .map((row) => {
            const id_toro = String(row.id_toro || row.Id_Toro || row.ID_TORO || row.id || "");
            const nombre = String(row.nombre || row.Nombre || "");
            const dep_leche = parseFloat(row.dep_leche || row.DEP_Leche || row.DEP_leche || 0) || 0;
            const dep_grasa = parseFloat(row.dep_grasa || row.DEP_Grasa || row.DEP_grasa || 0) || 0;
            const dep_prot = parseFloat(row.dep_prot || row.DEP_Prot || row.DEP_prot || 0) || 0;
            const dep_tph = parseFloat(row.dep_tph || row.DEP_TPH || row.DEP_tph || 0) || 0;
            const caracteristicas = String(row.caracteristicas || row.Caracteristicas || "");
            const precio_dosis = parseFloat(row.precio_dosis || row.Precio_Dosis || row.precio || 0) || 0;
            return {
              id_toro, nombre, dep_leche, dep_grasa, dep_prot, dep_tph,
              indice_inia: calcINIA(dep_leche, dep_grasa, dep_prot),
              indice_rovere: calcRovere(dep_leche, dep_grasa, dep_prot, dep_tph),
              caracteristicas,
              precio_dosis,
            };
          });

        if (newToros.length > 0) {
          setToros((prev) => [...prev, ...newToros]);
          const dbRows = newToros.map(t => ({
            id_toro: t.id_toro, nombre: t.nombre, dep_leche: t.dep_leche,
            dep_grasa: t.dep_grasa, dep_prot: t.dep_prot, dep_tph: t.dep_tph,
            indice_inia: t.indice_inia, indice_rovere: t.indice_rovere,
            caracteristicas: t.caracteristicas, precio_dosis: t.precio_dosis,
          }));
          fetch('/api/toros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbRows),
          }).then(r => { if (!r.ok) r.json().then(e => console.error('Error saving toros:', e)); });
          toast.success(`${newToros.length} toros importados con índices calculados`);
        } else {
          toast.error("No se encontraron datos de toros válidos");
        }
      } catch {
        toast.error("Error al procesar el archivo");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const sorted = [...toros].sort((a, b) => {
    const va = (a as any)[sortKey] ?? 0;
    const vb = (b as any)[sortKey] ?? 0;
    return sortAsc ? va - vb : vb - va;
  });

  const SortBtn = ({ field, label }: { field: string; label: string }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">{label} <ArrowUpDown className="h-3 w-3" /></span>
    </TableHead>
  );

  return (
    <FormLayout title="Reporte Toros">
      <div className="flex justify-end mb-4 gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
        />
        <Button onClick={() => fileRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" /> Subir Planilla Toros
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="border-2 border-primary/20">
          <CardHeader className="bg-accent/50 pb-2">
            <CardTitle className="text-lg font-bold">Índices de Toros</CardTitle>
            <p className="text-sm text-muted-foreground">
              INIA = -0.0477×DEP_Leche + 0.8317×DEP_Grasa + 1.4394×DEP_Prot &nbsp;|&nbsp;
              Rovere = -0.037×DEP_Leche + 0.288×DEP_Grasa + 1.977×DEP_Prot + 2.298×DEP_TPH
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <SortBtn field="id_toro" label="Id Toro" />
                    <TableHead>Nombre</TableHead>
                    <SortBtn field="dep_leche" label="DEP Leche" />
                    <SortBtn field="dep_grasa" label="DEP Grasa" />
                    <SortBtn field="dep_prot" label="DEP Prot" />
                    <SortBtn field="dep_tph" label="DEP TPH" />
                    <SortBtn field="indice_inia" label="Índice INIA" />
                    <SortBtn field="indice_rovere" label="Índice Rovere" />
                    <TableHead>Precio Dosis ($)</TableHead>
                    <TableHead>Características</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No hay toros cargados. Suba una planilla Excel con columnas: id_toro, DEP_Leche, DEP_Grasa, DEP_Prot, DEP_TPH
                      </TableCell>
                    </TableRow>
                  ) : sorted.map((toro) => {
                    const isEditing = editingId === toro.id_toro;
                    const e = editState;

                    const previewINIA = isEditing && e
                      ? calcINIA(parseFloat(e.dep_leche) || 0, parseFloat(e.dep_grasa) || 0, parseFloat(e.dep_prot) || 0)
                      : toro.indice_inia;
                    const previewRovere = isEditing && e
                      ? calcRovere(parseFloat(e.dep_leche) || 0, parseFloat(e.dep_grasa) || 0, parseFloat(e.dep_prot) || 0, parseFloat(e.dep_tph) || 0)
                      : toro.indice_rovere;

                    return (
                      <TableRow key={toro.id_toro} className={isEditing ? "bg-yellow-50" : ""}>
                        <TableCell className="font-medium">{toro.id_toro}</TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.nombre} onChange={updateEdit("nombre")} className="w-32" />
                            : toro.nombre || "—"}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.dep_leche} onChange={updateEdit("dep_leche")} type="number" className="w-20" />
                            : toro.dep_leche.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.dep_grasa} onChange={updateEdit("dep_grasa")} type="number" className="w-20" />
                            : toro.dep_grasa.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.dep_prot} onChange={updateEdit("dep_prot")} type="number" className="w-20" />
                            : toro.dep_prot.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.dep_tph} onChange={updateEdit("dep_tph")} type="number" className="w-20" />
                            : toro.dep_tph.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {previewINIA.toFixed(4)}
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          {previewRovere.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.precio_dosis} onChange={updateEdit("precio_dosis")} type="number" className="w-24" />
                            : (toro.precio_dosis ? `$${Number(toro.precio_dosis).toLocaleString()}` : "—")}
                        </TableCell>
                        <TableCell>
                          {isEditing && e
                            ? <InlineInput value={e.caracteristicas} onChange={updateEdit("caracteristicas")} className="w-48" />
                            : toro.caracteristicas || "—"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                variant="default"
                                size="icon"
                                onClick={saveEdit}
                                disabled={saving}
                                className="h-8 w-8 bg-primary hover:bg-primary/90"
                                title="Guardar"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={cancelEdit}
                                className="h-8 w-8"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEdit(toro)}
                                className="h-8 w-8"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(toro.id_toro)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </FormLayout>
  );
};

export default ReporteToros;
