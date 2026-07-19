import express from "express";
import cors from "cors";
import { db } from "./db.js";
import {
  registrosBasicos,
  registrosProductivos,
  registrosReproductivos,
  registrosOtros,
  toros,
} from "../shared/schema.js";
import { eq, and, ne } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ─── Registros Basicos ─────────────────────────────────────────────────────

app.get("/api/registros_basicos", async (_req, res) => {
  try {
    const rows = await db.select().from(registrosBasicos);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registros_basicos" });
  }
});

app.post("/api/registros_basicos", async (req, res) => {
  try {
    const row = req.body;
    const inserted = await db.insert(registrosBasicos).values(row).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert registros_basicos" });
  }
});

app.put("/api/registros_basicos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosBasicos)
      .where(and(eq(registrosBasicos.id_vaca, id_vaca), eq(registrosBasicos.ejercicio, ejercicio)));
    const inserted = await db.insert(registrosBasicos).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update registros_basicos" });
  }
});

app.delete("/api/registros_basicos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosBasicos)
      .where(and(eq(registrosBasicos.id_vaca, id_vaca), eq(registrosBasicos.ejercicio, ejercicio)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete registros_basicos" });
  }
});

app.delete("/api/registros_basicos", async (_req, res) => {
  try {
    await db.delete(registrosBasicos).where(ne(registrosBasicos.id_vaca, ""));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete all registros_basicos" });
  }
});

// ─── Registros Productivos ────────────────────────────────────────────────

app.get("/api/registros_productivos", async (_req, res) => {
  try {
    const rows = await db.select().from(registrosProductivos);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registros_productivos" });
  }
});

app.post("/api/registros_productivos", async (req, res) => {
  try {
    const inserted = await db.insert(registrosProductivos).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert registros_productivos" });
  }
});

app.put("/api/registros_productivos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosProductivos)
      .where(and(eq(registrosProductivos.id_vaca, id_vaca), eq(registrosProductivos.ejercicio, ejercicio)));
    const inserted = await db.insert(registrosProductivos).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update registros_productivos" });
  }
});

app.delete("/api/registros_productivos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosProductivos)
      .where(and(eq(registrosProductivos.id_vaca, id_vaca), eq(registrosProductivos.ejercicio, ejercicio)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete registros_productivos" });
  }
});

app.delete("/api/registros_productivos", async (_req, res) => {
  try {
    await db.delete(registrosProductivos).where(ne(registrosProductivos.id_vaca, ""));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete all registros_productivos" });
  }
});

// ─── Registros Reproductivos ──────────────────────────────────────────────

app.get("/api/registros_reproductivos", async (_req, res) => {
  try {
    const rows = await db.select().from(registrosReproductivos);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registros_reproductivos" });
  }
});

app.post("/api/registros_reproductivos", async (req, res) => {
  try {
    const inserted = await db.insert(registrosReproductivos).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert registros_reproductivos" });
  }
});

app.put("/api/registros_reproductivos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosReproductivos)
      .where(and(eq(registrosReproductivos.id_vaca, id_vaca), eq(registrosReproductivos.ejercicio, ejercicio)));
    const inserted = await db.insert(registrosReproductivos).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update registros_reproductivos" });
  }
});

app.delete("/api/registros_reproductivos/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosReproductivos)
      .where(and(eq(registrosReproductivos.id_vaca, id_vaca), eq(registrosReproductivos.ejercicio, ejercicio)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete registros_reproductivos" });
  }
});

app.delete("/api/registros_reproductivos", async (_req, res) => {
  try {
    await db.delete(registrosReproductivos).where(ne(registrosReproductivos.id_vaca, ""));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete all registros_reproductivos" });
  }
});

// ─── Registros Otros ──────────────────────────────────────────────────────

app.get("/api/registros_otros", async (_req, res) => {
  try {
    const rows = await db.select().from(registrosOtros);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registros_otros" });
  }
});

app.post("/api/registros_otros", async (req, res) => {
  try {
    const inserted = await db.insert(registrosOtros).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert registros_otros" });
  }
});

app.put("/api/registros_otros/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosOtros)
      .where(and(eq(registrosOtros.id_vaca, id_vaca), eq(registrosOtros.ejercicio, ejercicio)));
    const inserted = await db.insert(registrosOtros).values(req.body).returning();
    res.json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update registros_otros" });
  }
});

app.delete("/api/registros_otros/:id_vaca/:ejercicio", async (req, res) => {
  try {
    const { id_vaca, ejercicio } = req.params;
    await db
      .delete(registrosOtros)
      .where(and(eq(registrosOtros.id_vaca, id_vaca), eq(registrosOtros.ejercicio, ejercicio)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete registros_otros" });
  }
});

app.delete("/api/registros_otros", async (_req, res) => {
  try {
    await db.delete(registrosOtros).where(ne(registrosOtros.id_vaca, ""));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete all registros_otros" });
  }
});

// ─── Toros ────────────────────────────────────────────────────────────────

app.get("/api/toros", async (_req, res) => {
  try {
    const rows = await db.select().from(toros);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch toros" });
  }
});

app.post("/api/toros", async (req, res) => {
  try {
    const body = req.body;
    const rows = Array.isArray(body) ? body : [body];
    const inserted = await db.insert(toros).values(rows).returning();
    res.json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert toros" });
  }
});

app.put("/api/toros/:id_toro", async (req, res) => {
  try {
    const { id_toro } = req.params;
    const body = req.body;
    await db.update(toros).set(body).where(eq(toros.id_toro, id_toro));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update toro" });
  }
});

app.delete("/api/toros/:id_toro", async (req, res) => {
  try {
    const { id_toro } = req.params;
    await db.delete(toros).where(eq(toros.id_toro, id_toro));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete toro" });
  }
});

// ─── Export (datos crudos, 5 tablas) ──────────────────────────────────────

app.get("/api/export", async (_req, res) => {
  try {
    const [basicos, productivos, reproductivos, otros, torosRows] = await Promise.all([
      db.select().from(registrosBasicos),
      db.select().from(registrosProductivos),
      db.select().from(registrosReproductivos),
      db.select().from(registrosOtros),
      db.select().from(toros),
    ]);
    res.json({ basicos, productivos, reproductivos, otros, toros: torosRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export data" });
  }
});

// ─── Bulk Insert (transaccional) ──────────────────────────────────────────

app.post("/api/bulk_insert", async (req, res) => {
  try {
    const {
      basicos = [],
      productivos = [],
      reproductivos = [],
      otros = [],
    } = req.body as {
      basicos: any[];
      productivos: any[];
      reproductivos: any[];
      otros: any[];
    };
    await db.transaction(async (tx) => {
      if (basicos.length > 0)
        await tx.insert(registrosBasicos).values(basicos).onConflictDoNothing();
      if (productivos.length > 0)
        await tx.insert(registrosProductivos).values(productivos).onConflictDoNothing();
      if (reproductivos.length > 0)
        await tx.insert(registrosReproductivos).values(reproductivos).onConflictDoNothing();
      if (otros.length > 0)
        await tx.insert(registrosOtros).values(otros).onConflictDoNothing();
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
