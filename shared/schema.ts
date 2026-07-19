import { pgTable, text, uuid, numeric, integer, date, timestamp, unique, foreignKey, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const registrosBasicos = pgTable("registros_basicos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ejercicio: text("ejercicio").notNull().default(""),
  id_vaca: text("id_vaca").notNull(),
  partos: text("partos").notNull().default(""),
  fecha_nacimiento: date("fecha_nacimiento"),
  raza: text("raza").notNull().default(""),
  lactancia: integer("lactancia"),
  edad: integer("edad"),
  potencial_vaca: text("potencial_vaca"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  uqVacaEjercicio: unique("uq_basicos_vaca_ejercicio").on(t.id_vaca, t.ejercicio),
}));

export const toros = pgTable("toros", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  id_toro: text("id_toro").notNull(),
  nombre: text("nombre"),
  dep_leche: numeric("dep_leche").default("0"),
  dep_grasa: numeric("dep_grasa").default("0"),
  dep_prot: numeric("dep_prot").default("0"),
  dep_tph: numeric("dep_tph").default("0"),
  indice_inia: numeric("indice_inia").default("0"),
  indice_rovere: numeric("indice_rovere").default("0"),
  caracteristicas: text("caracteristicas"),
  precio_dosis: numeric("precio_dosis").default("0"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  uqIdToro: unique("uq_toros_id_toro").on(t.id_toro),
}));

export const registrosProductivos = pgTable("registros_productivos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ejercicio: text("ejercicio").notNull().default(""),
  id_vaca: text("id_vaca").notNull(),
  reg_1_dia30: numeric("reg_1_dia30"),
  reg_2_dia120: numeric("reg_2_dia120"),
  reg_3_dia210: numeric("reg_3_dia210"),
  reg_4_dia270: numeric("reg_4_dia270"),
  lc305_wood: numeric("lc305_wood"),
  porcentaje_grasa: numeric("porcentaje_grasa"),
  porcentaje_proteina: numeric("porcentaje_proteina"),
  lact1: numeric("lact1"),
  lact2: numeric("lact2"),
  lact3: numeric("lact3"),
  lact4: numeric("lact4"),
  lact5: numeric("lact5"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  fkBasicos: foreignKey({
    name: "fk_productivos_basicos",
    columns: [t.id_vaca, t.ejercicio],
    foreignColumns: [registrosBasicos.id_vaca, registrosBasicos.ejercicio],
  }).onDelete("cascade"),
  uqVacaEj: unique("uq_prod_vaca_ej").on(t.id_vaca, t.ejercicio),
  ckEjercicio: check("ck_prod_ejercicio", sql`${t.ejercicio} <> ''`),
}));

export const registrosReproductivos = pgTable("registros_reproductivos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  id_vaca: text("id_vaca").notNull(),
  ejercicio: text("ejercicio").notNull().default(""),
  parto: date("parto"),
  raza: text("raza"),
  servicio1: date("servicio1"),
  servicio2: date("servicio2"),
  servicio3: date("servicio3"),
  concepcion1: date("concepcion1"),
  toro_usado: text("toro_usado"),
  aborto1: date("aborto1"),
  aborto2: date("aborto2"),
  parto1: date("parto1"),
  iip: numeric("iip"),
  ipc: numeric("ipc"),
  serv_conc: numeric("serv_conc"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  fkBasicos: foreignKey({
    name: "fk_reproductivos_basicos",
    columns: [t.id_vaca, t.ejercicio],
    foreignColumns: [registrosBasicos.id_vaca, registrosBasicos.ejercicio],
  }).onDelete("cascade"),
  fkToros: foreignKey({
    name: "fk_reproductivos_toros",
    columns: [t.toro_usado],
    foreignColumns: [toros.id_toro],
  }).onDelete("set null"),
  uqVacaEj: unique("uq_repro_vaca_ej").on(t.id_vaca, t.ejercicio),
  ckEjercicio: check("ck_repro_ejercicio", sql`${t.ejercicio} <> ''`),
}));

export const registrosOtros = pgTable("registros_otros", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  id_vaca: text("id_vaca").notNull(),
  ejercicio: text("ejercicio").notNull().default(""),
  renguera: integer("renguera"),
  mastitis: integer("mastitis"),
  fac_parto: integer("fac_parto"),
  longevidad: integer("longevidad"),
  fortaleza_patas: integer("fortaleza_patas"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  fkBasicos: foreignKey({
    name: "fk_otros_basicos",
    columns: [t.id_vaca, t.ejercicio],
    foreignColumns: [registrosBasicos.id_vaca, registrosBasicos.ejercicio],
  }).onDelete("cascade"),
  uqVacaEj: unique("uq_otros_vaca_ej").on(t.id_vaca, t.ejercicio),
  ckEjercicio: check("ck_otros_ejercicio", sql`${t.ejercicio} <> ''`),
}));
