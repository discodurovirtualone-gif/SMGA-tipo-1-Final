const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 40, size: 'A3', bufferPages: true, layout: 'landscape' });
const out = path.join(__dirname, '../generated-docs/diagrama-de-clases.pdf');
doc.pipe(fs.createWriteStream(out));

// ── Paleta ─────────────────────────────────────────────────────────
const C = {
  navy:    '#1a2e4a', blue:   '#1e3a5f', dkblue: '#0f2240',
  green:   '#14532d', teal:   '#134e4a', emerald:'#065f46',
  amber:   '#78350f', orange: '#9a3412', purple: '#4c1d95',
  gray:    '#374151', light:  '#f8fafc', mid:    '#e2e8f0',
  dark:    '#111827', white:  '#ffffff', border: '#94a3b8',
  // category fills
  basicFill:  '#fffbeb', basicHead:  '#92400e', basicBorder:'#d97706',
  prodFill:   '#f0fdf4', prodHead:   '#14532d', prodBorder: '#16a34a',
  reproFill:  '#eff6ff', reproHead:  '#1e3a5f', reproBorder:'#2563eb',
  saludFill:  '#faf5ff', saludHead:  '#4c1d95', saludBorder:'#7c3aed',
  toroFill:   '#fff1f2', toroHead:   '#881337', toroBorder: '#e11d48',
  ctxFill:    '#f0f9ff', ctxHead:    '#0369a1', ctxBorder:  '#0284c7',
  dbFill:     '#fefce8', dbHead:     '#713f12', dbBorder:   '#ca8a04',
  utilFill:   '#f0fdfa', utilHead:   '#134e4a', utilBorder: '#0d9488',
};

const PW = doc.page.width  - 80; // printable width
const PH = doc.page.height - 80;

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Draw a UML class box
 * @param x,y top-left corner
 * @param w   box width
 * @param name class name
 * @param stereotype e.g. «interface», «context»
 * @param attrs array of strings for attributes section
 * @param methods array of strings for methods section
 * @param colors {fill, head, border}
 * @returns height of the drawn box
 */
function umlClass(x, y, w, name, stereotype, attrs, methods, colors) {
  const lineH = 11;
  const padV  = 4;
  const nameH = stereotype ? 30 : 20;
  const attrH = attrs.length   * lineH + padV * 2;
  const methH = methods.length * lineH + padV * 2;
  const totalH = nameH + attrH + (methods.length ? methH : 0);

  if (y + totalH > doc.page.height - 40) return totalH;

  // ── header ──
  doc.rect(x, y, w, nameH).fill(colors.head);
  doc.rect(x, y, w, nameH).stroke(colors.border);
  if (stereotype) {
    doc.fillColor(colors.fill).font('Helvetica-Oblique').fontSize(7)
       .text(stereotype, x, y + 4, { width: w, align: 'center' });
  }
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
     .text(name, x, y + (stereotype ? 14 : 6), { width: w, align: 'center' });

  // ── attributes ──
  const ay = y + nameH;
  doc.rect(x, ay, w, attrH).fill(colors.fill);
  doc.rect(x, ay, w, attrH).stroke(colors.border);
  attrs.forEach((a, i) => {
    const isSection = a.startsWith('──');
    doc.fillColor(isSection ? colors.head : C.gray)
       .font(isSection ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
       .text(a, x + 6, ay + padV + i * lineH, { width: w - 10, lineBreak: false });
  });

  // ── methods ──
  if (methods.length) {
    const my = ay + attrH;
    doc.rect(x, my, w, methH).fill(colors.fill);
    doc.rect(x, my, w, methH).stroke(colors.border);
    // divider line
    doc.moveTo(x, my).lineTo(x + w, my).stroke(colors.border);
    methods.forEach((m, i) => {
      doc.fillColor('#1e40af').font('Helvetica-Oblique').fontSize(7.5)
         .text(m, x + 6, my + padV + i * lineH, { width: w - 10, lineBreak: false });
    });
  }

  return totalH;
}

/** Draw arrow between two points with label */
function arrow(x1, y1, x2, y2, label='', style='solid', color=C.border) {
  if (style === 'dashed') {
    doc.dash(4, { space: 3 });
  }
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke(color);
  doc.undash();

  // arrowhead
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const aLen = 7;
  doc.polygon(
    [x2, y2],
    [x2 - aLen * Math.cos(angle - 0.4), y2 - aLen * Math.sin(angle - 0.4)],
    [x2 - aLen * Math.cos(angle + 0.4), y2 - aLen * Math.sin(angle + 0.4)]
  ).fill(color);

  if (label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    doc.fillColor(C.gray).font('Helvetica').fontSize(7)
       .text(label, mx - 20, my - 8, { width: 50, align: 'center' });
  }
}

/** Horizontal labeled line (no arrowhead) */
function assocLine(x1, y1, x2, y2, label='', color=C.border) {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke(color);
  if (label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    doc.fillColor(C.gray).font('Helvetica').fontSize(7)
       .text(label, mx - 25, my - 9, { width: 55, align: 'center' });
  }
}

function sectionTitle(x, y, w, title, color) {
  doc.rect(x, y, w, 16).fill(color);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
     .text(title, x + 6, y + 4, { width: w - 12 });
  return y + 20;
}

// ══════════════════════════════════════════════════════════════════
// PORTADA
// ══════════════════════════════════════════════════════════════════
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
doc.rect(0, 0, doc.page.width, 8).fill('#16a34a');
doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill('#16a34a');

doc.fillColor('#f0fdf4').font('Helvetica-Bold').fontSize(10)
   .text('SISTEMA DE MEJORA GENÉTICA ANIMAL — SMGA', 0, 100, { align: 'center' });
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(34)
   .text('Diagrama de Clases UML', 0, 130, { align: 'center' });
doc.fillColor('#86efac').fontSize(16)
   .text('Modelo de Dominio · Contextos · Base de Datos · Componentes', 0, 175, { align: 'center' });

doc.fillColor('#94a3b8').fontSize(10).text('Versión 2.0 — Junio 2026', 0, 220, { align: 'center' });
doc.rect(150, 250, doc.page.width - 300, 1).fill('#334155');

// Legend on cover
const layers = [
  ['#fffbeb','#d97706','Datos Básicos (RegistroBasico)'],
  ['#f0fdf4','#16a34a','Datos Productivos (RegistroProductivo)'],
  ['#eff6ff','#2563eb','Datos Reproductivos (RegistroReproductivo)'],
  ['#faf5ff','#7c3aed','Datos de Salud (RegistroOtro)'],
  ['#fff1f2','#e11d48','Toros y Genética (Toro)'],
  ['#f0f9ff','#0284c7','Capa de Contexto (React Context)'],
  ['#fefce8','#ca8a04','Base de Datos (Supabase PostgreSQL)'],
  ['#f0fdfa','#0d9488','Funciones de Utilidad'],
];
layers.forEach(([fill, border, label], i) => {
  const lx = 200 + (i % 4) * 220, ly = 275 + Math.floor(i / 4) * 35;
  doc.rect(lx, ly, 14, 14).fill(fill).stroke(border);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text(label, lx + 18, ly + 2);
});

doc.fillColor('#64748b').fontSize(8)
   .text('GitHub: github.com/discodurovirtualone-gif/SMGA-tipo-1-Final', 0, doc.page.height - 60, { align: 'center' });

// ══════════════════════════════════════════════════════════════════
// PÁGINA 2: MODELO DE DOMINIO COMPLETO
// ══════════════════════════════════════════════════════════════════
doc.addPage();

// Title bar
doc.rect(40, 40, PW, 22).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(12)
   .text('DIAGRAMA DE CLASES — CAPA DE DOMINIO (Interfaces / Modelos de Datos)', 46, 46);

const CW = 165; // class box width
const startY = 72;

// ── Row 1: RegistroBasico, RegistroProductivo, ControlPunto ───────
const r1y = startY;

// RegistroBasico
const rbX = 40, rbY = r1y;
const rbH = umlClass(rbX, rbY, CW, 'RegistroBasico', '«interface»',
  ['ejercicio : string','id_vaca : string  {PK lógico}','partos : string',
   'fecha_nacimiento : string','raza : string','lactancia : string',
   'edad : string  {auto-calculado}','potencial_vaca : string'],
  [],
  { fill: C.basicFill, head: C.basicHead, border: C.basicBorder });

// RegistroProductivo
const rpX = rbX + CW + 50, rpY = r1y;
const rpH = umlClass(rpX, rpY, CW + 10, 'RegistroProductivo', '«interface»',
  ['ejercicio : string','id_vaca : string  {FK → RegistroBasico}',
   'reg_1_dia30 : string','reg_2_dia120 : string',
   'reg_3_dia210 : string','reg_4_dia270 : string',
   'lc305_wood : string  {calculado}','porcentaje_grasa : string',
   'porcentaje_proteina : string','lact1..lact5 : string',
   'controles_adicionales? : string  {JSON}'],
  [],
  { fill: C.prodFill, head: C.prodHead, border: C.prodBorder });

// ControlPunto
const cpX = rpX + CW + 60, cpY = r1y;
const cpH = umlClass(cpX, cpY, 130, 'ControlPunto', '«interface»',
  ['dia : number','produccion : number'],
  [],
  { fill: C.prodFill, head: C.prodHead, border: C.prodBorder });

// Association RegistroProductivo → ControlPunto (composition)
const compY = rpY + 20;
doc.circle(rpX + CW + 10, compY, 5).fill(C.prodBorder);           // filled diamond
doc.moveTo(rpX + CW + 15, compY).lineTo(cpX, compY).stroke(C.prodBorder);
arrow(cpX, compY, cpX + 130, compY, '0..*', 'solid', C.prodBorder);
doc.fillColor(C.gray).font('Helvetica').fontSize(7)
   .text('contiene (JSON)', rpX + CW + 18, compY - 9);

// ── Row 2: RegistroReproductivo, RegistroOtro ─────────────────────
const r2y = r1y + Math.max(rbH, rpH) + 35;

const rrepX = 40, rrepY = r2y;
const rrepH = umlClass(rrepX, rrepY, CW + 15, 'RegistroReproductivo', '«interface»',
  ['id_vaca : string  {FK → RegistroBasico}','ejercicio : string',
   'parto : string  (fecha)','raza : string',
   'servicio1..3 : string  (fechas)','concepcion1 : string',
   'toroUsado : string  {FK → Toro}','aborto1..2 : string',
   'parto1 : string  (fecha siguiente)',
   '── Calculados automáticamente ──',
   'iip : string  (días entre partos)',
   'ipc : string  (días parto→concepción)',
   'serv_conc : string  (S/C)'],
  [],
  { fill: C.reproFill, head: C.reproHead, border: C.reproBorder });

const rotX = rrepX + CW + 65, rotY = r2y;
const rotH = umlClass(rotX, rotY, CW, 'RegistroOtro', '«interface»',
  ['id_vaca : string  {FK → RegistroBasico}','ejercicio : string',
   '── Puntajes 1–5 ──',
   'renguera : string','mastitis : string',
   'facParto : string','longevidad : string','fortalezaPatas : string'],
  [],
  { fill: C.saludFill, head: C.saludHead, border: C.saludBorder });

// ── Row 3: Toro, FactorCorreccion, AjustesState, PromedioNacional ─
const r3y = r2y + Math.max(rrepH, rotH) + 35;

const torX = 40, torY = r3y;
const torH = umlClass(torX, torY, CW, 'Toro', '«interface»',
  ['id_toro : string  {PK}','nombre : string',
   '── DEP (Diferencia Esperada Progenie) ──',
   'dep_leche : number','dep_grasa : number',
   'dep_prot : number','dep_tph : number',
   '── Índices calculados ──',
   'indice_inia : number','indice_rovere : number',
   'caracteristicas : string','precio_dosis : number'],
  [],
  { fill: C.toroFill, head: C.toroHead, border: C.toroBorder });

const fcX = torX + CW + 50, fcY = r3y;
const fcH = umlClass(fcX, fcY, CW, 'FactorCorreccion', '«interface»',
  ['raza : string','nivel_produccion : string',
   'edad : number','lactancia : number',
   'factor : number'],
  [],
  { fill: C.basicFill, head: C.basicHead, border: C.basicBorder });

const ajX = fcX + CW + 50, ajY = r3y;
const ajH = umlClass(ajX, ajY, CW + 10, 'AjustesState', '«interface»',
  ['heredabilidad : string','repetibilidad : string',
   'rangoPotenciales : number[]',
   'factores : FactorCorreccion[]',
   'metodoWood305 : MetodoWood305'],
  [],
  { fill: C.ctxFill, head: C.ctxHead, border: C.ctxBorder });

const pnX = ajX + CW + 60, pnY = r3y;
const pnH = umlClass(pnX, pnY, CW, 'PromedioNacional', '«interface»',
  ['variable : string  {clave}',
   'tipo : "primipara" | "multipara" | "todas"',
   'valor : number','descripcion? : string'],
  [],
  { fill: C.utilFill, head: C.utilHead, border: C.utilBorder });

// ── Association arrows ────────────────────────────────────────────
// RegistroBasico ← RegistroProductivo (id_vaca FK)
const aY1 = rbY + 30;
arrow(rpX, rpY + 22, rbX + CW, rbY + 22, '', 'dashed', C.prodBorder);
doc.fillColor(C.gray).font('Helvetica').fontSize(7).text('id_vaca FK', rbX + CW + 2, rbY + 14);

// RegistroBasico ← RegistroReproductivo
const aY2 = rbY + rbH + 5;
doc.moveTo(rbX + CW/2, rbY + rbH)
   .lineTo(rbX + CW/2, rrepY - 10)
   .lineTo(rrepX + 60, rrepY - 10)
   .lineTo(rrepX + 60, rrepY).stroke(C.reproBorder);
doc.polygon([rrepX+60, rrepY],[rrepX+55,rrepY-7],[rrepX+65,rrepY-7]).fill(C.reproBorder);
doc.fillColor(C.gray).font('Helvetica').fontSize(7).text('id_vaca FK', rrepX + 62, rrepY - 18);

// RegistroBasico ← RegistroOtro
doc.moveTo(rbX + CW - 10, rbY + rbH)
   .lineTo(rbX + CW - 10, rotY - 10)
   .lineTo(rotX + 60, rotY - 10)
   .lineTo(rotX + 60, rotY).stroke(C.saludBorder);
doc.polygon([rotX+60, rotY],[rotX+55,rotY-7],[rotX+65,rotY-7]).fill(C.saludBorder);

// Toro ← RegistroReproductivo (toroUsado FK)
doc.dash(4, { space: 3 });
doc.moveTo(rrepX + CW + 15, rrepY + 70)
   .lineTo(torX + CW/2, rrepY + 70)
   .lineTo(torX + CW/2, torY).stroke(C.toroBorder);
doc.undash();
doc.polygon([torX+CW/2, torY],[torX+CW/2-5,torY-7],[torX+CW/2+5,torY-7]).fill(C.toroBorder);
doc.fillColor(C.gray).font('Helvetica').fontSize(7).text('toroUsado FK', torX + CW/2 + 3, rrepY + 62);

// AjustesState uses FactorCorreccion
arrow(ajX, ajY + 25, fcX + CW, fcY + 25, 'factores[]', 'dashed', C.ctxBorder);

// ── MetodoWood305 enum box ────────────────────────────────────────
const mwX = ajX, mwY = ajY + ajH + 20;
umlClass(mwX, mwY, 140, 'MetodoWood305', '«enumeration»',
  ['"actual" (Wood Estándar)', '"interpolacion" (N pesajes)'],
  [],
  { fill: '#fef3c7', head: C.amber, border: '#d97706' });
doc.dash(4, { space: 3 });
doc.moveTo(ajX + 60, ajY + ajH).lineTo(mwX + 60, mwY).stroke(C.amber);
doc.undash();

// ══════════════════════════════════════════════════════════════════
// PÁGINA 3: CONTEXTO REACT + DB SUPABASE
// ══════════════════════════════════════════════════════════════════
doc.addPage();

doc.rect(40, 40, PW, 22).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(12)
   .text('DIAGRAMA DE CLASES — CAPA DE CONTEXTO REACT Y BASE DE DATOS SUPABASE', 46, 46);

const p3Y = 72;

// ── GanaderiaContextType ──────────────────────────────────────────
const gcW = 220;
const gcX = 40, gcY = p3Y;
const gcH = umlClass(gcX, gcY, gcW, 'GanaderiaContext', '«React Context»',
  ['registrosBasicos : RegistroBasico[]',
   'registrosProductivos : RegistroProductivo[]',
   'registrosReproductivos : RegistroReproductivo[]',
   'registrosOtros : RegistroOtro[]',
   'toros : Toro[]',
   'factores : FactorCorreccion[]',
   'loading : boolean'],
  ['setRegistrosBasicos(data): void',
   'setRegistrosProductivos(data): void',
   'setRegistrosReproductivos(data): void',
   'setRegistrosOtros(data): void',
   'setToros(data): void',
   'setFactores(data): void',
   'deleteRegistro(table,id,ej): Promise<void>'],
  { fill: C.ctxFill, head: C.ctxHead, border: C.ctxBorder });

// ── AjustesContextType ────────────────────────────────────────────
const acX = gcX + gcW + 50, acY = p3Y;
const acH = umlClass(acX, acY, gcW, 'AjustesContext', '«React Context»',
  ['ajustes : AjustesState','potencialesAuto : number[]'],
  ['setHeredabilidad(v: string): void',
   'setRepetibilidad(v: string): void',
   'setRangoPotenciales(v: number[]): void',
   'setMetodoWood305(v: MetodoWood305): void'],
  { fill: C.ctxFill, head: C.ctxHead, border: C.ctxBorder });

// ── GanaderiaContext → AjustesContext dependency ──────────────────
arrow(acX, acY + 30, gcX + gcW, gcY + 30, 'useGanaderia()', 'dashed', C.ctxBorder);

// ── SupabaseClient ────────────────────────────────────────────────
const scX = acX + gcW + 60, scY = p3Y;
const scH = umlClass(scX, scY, 180, 'SupabaseClient', '«singleton»',
  ['SUPABASE_URL : string','SUPABASE_ANON_KEY : string'],
  ['from(table): QueryBuilder',
   'select(*): Promise<data>',
   'insert(rows): Promise<void>',
   'update(data): Promise<void>',
   'delete(): Promise<void>'],
  { fill: C.dbFill, head: C.dbHead, border: C.dbBorder });

// GanaderiaContext → SupabaseClient
arrow(gcX + gcW, gcY + 60, scX, scY + 60, 'CRUD', 'dashed', C.dbBorder);

// ── DATABASE TABLES ───────────────────────────────────────────────
const dbY = p3Y + Math.max(gcH, acH, scH) + 40;
let db = sectionTitle(40, dbY - 20, PW, '  BASE DE DATOS SUPABASE (PostgreSQL) — Tablas', C.dbHead);

const dbTables = [
  { name: 'registros_basicos', cols: ['id: uuid {PK}','ejercicio: text','id_vaca: text','partos: text','fecha_nacimiento: date','raza: text','lactancia: integer','edad: integer','potencial_vaca: text','created_at: timestamptz'], head: C.basicHead, border: C.basicBorder, fill: C.basicFill },
  { name: 'registros_productivos', cols: ['id: uuid {PK}','ejercicio: text','id_vaca: text','reg_1_dia30: numeric','reg_2_dia120: numeric','reg_3_dia210: numeric','reg_4_dia270: numeric','lc305_wood: numeric','porcentaje_grasa: numeric','porcentaje_proteina: numeric','lact1..lact5: numeric','controles_adicionales: text','created_at: timestamptz'], head: C.prodHead, border: C.prodBorder, fill: C.prodFill },
  { name: 'registros_reproductivos', cols: ['id: uuid {PK}','ejercicio: text','id_vaca: text','parto: date','raza: text','servicio1..3: date','concepcion1: date','toro_usado: text','aborto1..2: date','parto1: date','iip: numeric','ipc: numeric','serv_conc: numeric','created_at: timestamptz'], head: C.reproHead, border: C.reproBorder, fill: C.reproFill },
  { name: 'registros_otros', cols: ['id: uuid {PK}','ejercicio: text','id_vaca: text','renguera: integer','mastitis: integer','fac_parto: integer','longevidad: integer','fortaleza_patas: integer','created_at: timestamptz'], head: C.saludHead, border: C.saludBorder, fill: C.saludFill },
  { name: 'toros', cols: ['id: uuid {PK}','id_toro: text','nombre: text','dep_leche: numeric','dep_grasa: numeric','dep_prot: numeric','dep_tph: numeric','indice_inia: numeric','indice_rovere: numeric','caracteristicas: text','precio_dosis: numeric','created_at: timestamptz'], head: C.toroHead, border: C.toroBorder, fill: C.toroFill },
];

const dbCW = (PW - 20) / 5;
dbTables.forEach((t, i) => {
  umlClass(40 + i * (dbCW + 5), db + 2, dbCW - 5, t.name, '«table»',
    t.cols, [],
    { fill: t.fill, head: t.head, border: t.border });
});

// Arrows: GanaderiaContext → each table
const tbases = [40, 40 + dbCW + 5, 40 + (dbCW+5)*2, 40 + (dbCW+5)*3, 40 + (dbCW+5)*4];
tbases.forEach((tx, i) => {
  const gcBottom = gcY + gcH;
  doc.dash(3, { space: 3 });
  doc.moveTo(gcX + gcW/2 + i*15, gcBottom)
     .lineTo(gcX + gcW/2 + i*15, dbY - 5)
     .lineTo(tx + dbCW/2, dbY - 5)
     .lineTo(tx + dbCW/2, db + 2).stroke(C.dbBorder);
  doc.undash();
});

// ══════════════════════════════════════════════════════════════════
// PÁGINA 4: FUNCIONES DE UTILIDAD + COMPONENTES REACT
// ══════════════════════════════════════════════════════════════════
doc.addPage();

doc.rect(40, 40, PW, 22).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(12)
   .text('DIAGRAMA DE CLASES — FUNCIONES UTILITARIAS Y COMPONENTES REACT (PÁGINAS)', 46, 46);

// ── Utility Functions ─────────────────────────────────────────────
const uf1Y = 72;
sectionTitle(40, uf1Y, PW/2 - 20, '  Funciones de Utilidad (GanaderiaContext.tsx)', C.utilHead);

const ufW = 200;
const utils = [
  { name: 'WoodCalculator', st: '«utility»', attrs: [], methods: [
    'calcWood(potencial: number, dia: number): number',
    '  → (p × 0.00318) × dia^0.1027 × e^(-0.003×dia)',
    'calcEdadMeses(fechaNac: string): number',
    '  → años transcurridos desde nacimiento',
    'calcTrapez(puntos: ControlPunto[]): number',
    '  → área bajo curva por integración trapezoidal',
  ]},
  { name: 'DbMappers', st: '«utility»', attrs: [], methods: [
    'basicoToDb(r: RegistroBasico): DbRow',
    'productivoToDb(r: RegistroProductivo): DbRow',
    'reproductivoToDb(r: RegistroReproductivo): DbRow',
    'otroToDb(r: RegistroOtro): DbRow',
  ]},
  { name: 'ExcelParser', st: '«utility»', attrs: [], methods: [
    'matchSection(headers: string[]): Section',
    'excelDateToString(v: any): string',
    'normalize(s: string): string',
    'processFile(file: File): Promise<void>',
  ]},
];
utils.forEach((u, i) => {
  umlClass(40 + i * (ufW + 20), uf1Y + 22, ufW, u.name, u.st, u.attrs, u.methods,
    { fill: C.utilFill, head: C.utilHead, border: C.utilBorder });
});

// ── React Components (Pages) ──────────────────────────────────────
const compY2 = uf1Y + 22 + 180;
sectionTitle(40, compY2, PW, '  Componentes React — Páginas del Sistema', C.navy);

const pages = [
  { name: 'RegistrosBasicos',     deps: ['GanaderiaContext'] },
  { name: 'RegistrosProductivos', deps: ['GanaderiaContext','AjustesContext'] },
  { name: 'RegistrosReproductivos',deps: ['GanaderiaContext'] },
  { name: 'RegistrosOtros',       deps: ['GanaderiaContext'] },
  { name: 'ProduccionWood',       deps: ['GanaderiaContext','AjustesContext'] },
  { name: 'IndicadoresReproductivos',deps: ['GanaderiaContext'] },
  { name: 'ValorCria',            deps: ['GanaderiaContext','AjustesContext'] },
  { name: 'ReporteVacas',         deps: ['GanaderiaContext'] },
  { name: 'ReporteToros',         deps: ['GanaderiaContext'] },
  { name: 'ComparacionNacional',  deps: ['GanaderiaContext'] },
  { name: 'TableroFinal',         deps: ['GanaderiaContext'] },
  { name: 'Ajustes',              deps: ['AjustesContext','GanaderiaContext'] },
];

const pCW = (PW - 10) / 6;
pages.forEach((p, i) => {
  const px = 40 + (i % 6) * (pCW + 2);
  const py = compY2 + 18 + Math.floor(i / 6) * 75;
  umlClass(px, py, pCW - 2, p.name, '«React Page»',
    p.deps.map(d => `uses: ${d}`),
    [],
    { fill: '#f8fafc', head: C.blue, border: C.mid });
});

// ── Shared Components ─────────────────────────────────────────────
const shY = compY2 + 18 + Math.ceil(pages.length / 6) * 75 + 20;
if (shY < doc.page.height - 100) {
  sectionTitle(40, shY, PW, '  Componentes Compartidos (src/components/)', C.gray);
  const shared = [
    { name: 'BulkUpload',         st: '«component»', attrs: [], methods: ['processFile(f: File): void','matchSection(headers): Section'] },
    { name: 'PdfReportButton',    st: '«component»', attrs: [], methods: ['generate(title,headers,rows): void'] },
    { name: 'FormLayout',         st: '«component»', attrs: [], methods: ['render(): JSX (+ back button)'] },
    { name: 'AccessibilityControls',st: '«component»', attrs: ['fontSize: number'], methods: ['increase(): void','decrease(): void'] },
    { name: 'PdfDownload',        st: '«component»', attrs: [], methods: ['downloadTemplate(): void'] },
  ];
  const sCW = (PW - 10) / shared.length;
  shared.forEach((s, i) => {
    umlClass(40 + i * (sCW + 2), shY + 18, sCW - 2, s.name, s.st, s.attrs, s.methods,
      { fill: '#f1f5f9', head: C.gray, border: C.border });
  });
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA 5: RELACIONES / LEYENDA COMPLETA
// ══════════════════════════════════════════════════════════════════
doc.addPage();

doc.rect(40, 40, PW, 22).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(12)
   .text('LEYENDA DE RELACIONES Y RESUMEN DEL MODELO', 46, 46);

let ly = 80;

// Notation examples
const notations = [
  { lbl: 'Asociación directa',      ex: 'RegistroReproductivo ──────▶ Toro', color: C.toroBorder, style: 'solid',  desc: 'Una clase referencia a otra por un atributo (id FK).' },
  { lbl: 'Dependencia (uso)',        ex: 'Componente ------▶ GanaderiaContext', color: C.ctxBorder, style: 'dashed', desc: 'Un componente usa un contexto o función sin poseerlo.' },
  { lbl: 'Composición',             ex: 'RegistroProductivo ◆──▶ ControlPunto (0..*)', color: C.prodBorder, style: 'solid', desc: 'ControlPunto existe dentro de RegistroProductivo (JSON serializado).' },
  { lbl: 'Realización / implementa',ex: 'SupabaseClient ......▶ tabla de Supabase', color: C.dbBorder, style: 'dashed', desc: 'El cliente ejecuta operaciones CRUD sobre las tablas de la base de datos.' },
];

notations.forEach((n, i) => {
  const ny = ly + i * 32;
  // color chip
  doc.rect(40, ny, 14, 14).fill(n.color).stroke(n.color);
  // label
  doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(9)
     .text(n.lbl, 60, ny, { width: 200 });
  // description
  doc.fillColor(C.gray).font('Helvetica').fontSize(8.5)
     .text(n.desc, 60, ny + 11, { width: PW - 220 });
  // example
  doc.fillColor(n.color).font('Helvetica-Oblique').fontSize(8)
     .text(n.ex, PW - 150, ny + 2, { width: 150 });
});

ly += notations.length * 32 + 20;

// Summary table
doc.rect(40, ly, PW, 16).fill(C.navy);
doc.fillColor(C.white).font('Helvetica-Bold').fontSize(10).text('  RESUMEN DE CLASES / INTERFACES DEL SISTEMA', 46, ly + 4);
ly += 18;

const summaryRows = [
  ['RegistroBasico',         '«interface»','GanaderiaContext.tsx','Datos básicos del animal (nombre, raza, DOB, potencial)','registros_basicos (Supabase)'],
  ['RegistroProductivo',     '«interface»','GanaderiaContext.tsx','Pesajes de leche D30/D120/D210/D270 o N variables, %grasa, %prot, LC305','registros_productivos'],
  ['ControlPunto',           '«interface»','GanaderiaContext.tsx','Punto de control {dia, produccion} para interpolación','JSON en controles_adicionales'],
  ['RegistroReproductivo',   '«interface»','GanaderiaContext.tsx','Partos, servicios, concepción, IIP/IPC/S/C calculados','registros_reproductivos'],
  ['RegistroOtro',           '«interface»','GanaderiaContext.tsx','Puntajes de salud y condición (1-5)','registros_otros'],
  ['Toro',                   '«interface»','GanaderiaContext.tsx','DEP genéticos, índices INIA y Rovere calculados','toros'],
  ['FactorCorreccion',       '«interface»','GanaderiaContext.tsx','Factor de corrección por raza, edad, lactancia','en memoria (defaultFactores)'],
  ['AjustesState',           '«interface»','AjustesContext.tsx', 'Configuración del sistema: h², repetibilidad, método Wood','localStorage'],
  ['MetodoWood305',          '«enumeration»','AjustesContext.tsx','Enumeración: "actual" | "interpolacion"','localStorage'],
  ['PromedioNacional',       '«interface»','ComparacionNacional.tsx','Promedios de referencia nacional por variable y tipo','localStorage'],
  ['GanaderiaContext',       '«React Context»','GanaderiaContext.tsx','Estado global de todos los registros del rodeo','— (wrapper)'],
  ['AjustesContext',         '«React Context»','AjustesContext.tsx','Estado global de configuración del sistema','— (wrapper)'],
  ['SupabaseClient',         '«singleton»','supabase/client.ts','Cliente de Supabase para operaciones CRUD','Supabase REST API'],
  ['WoodCalculator (fns)',   '«utility»','GanaderiaContext.tsx','calcWood, calcEdadMeses, integración trapezoidal','—'],
  ['DbMappers (fns)',        '«utility»','GanaderiaContext.tsx','basicoToDb, productivoToDb, reproductivoToDb, otroToDb','—'],
  ['ExcelParser (fns)',      '«utility»','BulkUpload.tsx','matchSection, excelDateToString, processFile','SheetJS (xlsx)'],
  ['BulkUpload',             '«component»','BulkUpload.tsx','Carga masiva Excel/CSV — detecta tipo y persiste','—'],
  ['PdfReportButton',        '«component»','PdfReportButton.tsx','Genera y descarga PDFs con jsPDF + autotable','jspdf'],
];

const colW = [130, 75, 165, 230, PW - 600 - 5];
const hd = ['Clase / Interfaz','Estereotipo','Archivo Fuente','Responsabilidad','Persistencia'];
let row_y = ly;
// header
let rx = 40;
hd.forEach((h, ci) => {
  doc.rect(rx, row_y, colW[ci], 14).fill(C.navy).stroke('#334155');
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
     .text(h, rx+3, row_y+3, { width: colW[ci]-6, lineBreak: false });
  rx += colW[ci];
});
row_y += 14;

summaryRows.forEach((r, ri) => {
  if (row_y > doc.page.height - 50) return;
  const bg = ri % 2 === 0 ? C.light : '#f1f5f9';
  let rx = 40;
  r.forEach((cell, ci) => {
    doc.rect(rx, row_y, colW[ci], 12).fill(bg).stroke('#e2e8f0');
    doc.fillColor(ci === 0 ? C.navy : C.gray)
       .font(ci === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
       .text(cell, rx+3, row_y+2, { width: colW[ci]-6, lineBreak: false });
    rx += colW[ci];
  });
  row_y += 12;
});

// Page numbers
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  if (i === 0) continue;
  doc.switchToPage(i);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
     .text(`SMGA — Diagrama de Clases    |    Página ${i} de ${totalPages - 1}    |    Junio 2026`,
       40, doc.page.height - 30, { width: PW, align: 'center' });
}

doc.end();
console.log('PDF diagrama de clases generado:', out);
