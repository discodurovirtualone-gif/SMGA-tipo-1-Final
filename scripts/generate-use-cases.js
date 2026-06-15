const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
const out = path.join(__dirname, '../generated-docs/casos-de-uso-uml.pdf');
doc.pipe(fs.createWriteStream(out));

// ── Colores y helpers ──────────────────────────────────────────────────────────
const C = { navy:'#1a2e4a', green:'#166534', blue:'#1e3a5f', purple:'#4c1d95',
             amber:'#92400e', gray:'#374151', light:'#f8fafc', mid:'#e2e8f0',
             dark:'#111827', red:'#7f1d1d', teal:'#134e4a' };

const W = doc.page.width - 100;

const heading1 = (txt) => {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, W, 28).fill(C.navy);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
     .text(txt, 58, doc.y - 24, { width: W - 16 });
  doc.fillColor(C.dark).moveDown(0.6);
};

const heading2 = (txt, color=C.blue) => {
  doc.moveDown(0.3);
  doc.rect(50, doc.y, 4, 16).fill(color);
  doc.fillColor(color).font('Helvetica-Bold').fontSize(11)
     .text(txt, 60, doc.y - 14);
  doc.fillColor(C.dark).moveDown(0.4);
};

const body = (txt, indent=0) => {
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(txt, 50 + indent, doc.y, { width: W - indent, lineGap: 2 });
};

const bullet = (txt, indent=10) => {
  const y = doc.y;
  doc.circle(55 + indent, y + 4, 2).fill(C.blue);
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(txt, 62 + indent, y, { width: W - 12 - indent, lineGap: 2 });
};

const tableRow = (cols, widths, isHeader=false, bg=null) => {
  const x0 = 50, rowH = isHeader ? 18 : 14;
  const y0 = doc.y;
  if (bg) doc.rect(x0, y0, widths.reduce((a,b)=>a+b,0), rowH).fill(bg);
  let x = x0;
  cols.forEach((c, i) => {
    doc.rect(x, y0, widths[i], rowH).stroke('#cbd5e1');
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(isHeader ? 8 : 8)
       .fillColor(isHeader ? 'white' : C.gray)
       .text(String(c), x + 3, y0 + (isHeader ? 4 : 2), { width: widths[i]-6, height: rowH, lineBreak: false });
    x += widths[i];
  });
  doc.y = y0 + rowH;
};

const ucBox = (id, name, actor, pre, main, alt, post, color=C.blue) => {
  if (doc.y > 680) doc.addPage();
  const startY = doc.y;
  doc.rect(50, startY, W, 16).fill(color);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
     .text(`${id} — ${name}`, 56, startY + 3, { width: W - 12 });
  doc.fillColor(C.dark);
  doc.y = startY + 18;

  const field = (label, val, c='#e0f2fe') => {
    if (doc.y > 720) doc.addPage();
    const fy = doc.y;
    doc.rect(50, fy, 85, 12).fill(c);
    doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8).text(label, 53, fy + 2, { width: 80 });
    doc.fillColor(C.gray).font('Helvetica').fontSize(8)
       .text(val, 138, fy + 2, { width: W - 88, lineBreak: false });
    doc.y = fy + 13;
  };

  field('Actor Principal:', actor, '#dbeafe');
  field('Precondición:', pre, '#f0fdf4');
  // main flow
  const mfy = doc.y;
  doc.rect(50, mfy, 85, 12).fill('#fef9c3');
  doc.fillColor(C.amber).font('Helvetica-Bold').fontSize(8).text('Flujo Principal:', 53, mfy + 2, { width: 80 });
  doc.y = mfy + 13;
  main.forEach((step, i) => {
    if (doc.y > 720) doc.addPage();
    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
       .text(`  ${i+1}. ${step}`, 55, doc.y, { width: W - 10, lineGap: 1 });
  });
  doc.moveDown(0.2);
  if (alt) {
    const afy = doc.y;
    doc.rect(50, afy, 85, 12).fill('#fce7f3');
    doc.fillColor('#9d174d').font('Helvetica-Bold').fontSize(8).text('Flujo Alternativo:', 53, afy + 2, { width: 80 });
    doc.y = afy + 13;
    doc.font('Helvetica').fontSize(8).fillColor(C.gray)
       .text(`  ${alt}`, 55, doc.y, { width: W - 10, lineGap: 1 });
    doc.moveDown(0.2);
  }
  field('Postcondición:', post, '#f0fdf4');
  doc.rect(50, startY, W, doc.y - startY).stroke('#94a3b8');
  doc.moveDown(0.6);
};

const seqDiagram = (steps) => {
  if (doc.y > 600) doc.addPage();
  const x0 = 60, actW = 90, sysW = 90;
  const actX = x0 + 10, sysX = x0 + W - sysW - 10;
  const midX = (actX + sysX) / 2;
  const boxH = 14;

  // actors header
  doc.rect(x0, doc.y, actW, boxH).fill(C.blue);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('GANADERO', x0 + 5, doc.y - boxH + 3, { width: actW - 10, lineBreak: false });
  doc.rect(x0 + W - sysW, doc.y - boxH, sysW, boxH).fill(C.navy);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text('SISTEMA SMGA', x0 + W - sysW + 5, doc.y - boxH + 3, { width: sysW - 10, lineBreak: false });
  doc.fillColor(C.dark);

  let y = doc.y + 4;
  steps.forEach(([dir, msg]) => {
    if (y > 720) { doc.addPage(); y = doc.y + 4; }
    // lifelines
    doc.moveTo(x0 + actW/2, y).lineTo(x0 + actW/2, y + 16).stroke('#94a3b8');
    doc.moveTo(x0 + W - sysW/2, y).lineTo(x0 + W - sysW/2, y + 16).stroke('#94a3b8');
    const fromX = dir === '→' ? x0 + actW/2 : x0 + W - sysW/2;
    const toX   = dir === '→' ? x0 + W - sysW/2 : x0 + actW/2;
    doc.moveTo(fromX, y + 8).lineTo(toX, y + 8).stroke(C.blue);
    // arrowhead
    const tip = toX > fromX ? [toX, y+8] : [toX, y+8];
    const d = toX > fromX ? -6 : 6;
    doc.polygon([tip[0], tip[1]], [tip[0]+d, tip[1]-3], [tip[0]+d, tip[1]+3]).fill(C.blue);
    // label
    doc.font('Helvetica').fontSize(7).fillColor(C.gray)
       .text(msg, Math.min(fromX, toX) + 5, y + 1, { width: Math.abs(toX - fromX) - 10, lineBreak: false });
    y += 18;
  });
  doc.y = y + 4;
};

// ═══════════════════════════════════════════════════════════════════
// PORTADA
// ═══════════════════════════════════════════════════════════════════
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
doc.rect(0, 0, doc.page.width, 8).fill('#16a34a');
doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill('#16a34a');

doc.fillColor('#f0fdf4').font('Helvetica-Bold').fontSize(9).text('SISTEMA DE MEJORA GENÉTICA ANIMAL — SMGA', 0, 80, { align: 'center' });
doc.fillColor('white').font('Helvetica-Bold').fontSize(28)
   .text('Casos de Uso', 0, 110, { align: 'center' });
doc.fillColor('#86efac').fontSize(20).text('y Diagramas UML', 0, 145, { align: 'center' });

doc.fillColor('#94a3b8').fontSize(10).text('Documento de Especificación Funcional', 0, 200, { align: 'center' });
doc.fillColor('#64748b').fontSize(9).text('Versión 2.0 — Junio 2026', 0, 220, { align: 'center' });

doc.rect(100, 260, doc.page.width - 200, 1).fill('#334155');

const modules = [
  '📋  Registros Básicos, Productivos, Reproductivos y de Salud',
  '📊  Cálculo de Producción LC305 (Wood e Interpolación)',
  '🧬  Valor de Cría e Indicadores Reproductivos',
  '📈  Reportes de Vacas, Toros y Tablero General',
  '🌍  Comparación con Promedios Nacionales',
  '⚙️   Carga Masiva y Configuración del Sistema',
];
doc.fillColor('#cbd5e1').fontSize(10);
modules.forEach((m, i) => {
  doc.text(m, 0, 285 + i * 28, { align: 'center' });
});

doc.rect(100, 460, doc.page.width - 200, 1).fill('#334155');
doc.fillColor('#64748b').fontSize(8)
   .text('Universidad / Institución — Proyecto SMGA Tipo 2', 0, 475, { align: 'center' })
   .text('GitHub: github.com/discodurovirtualone-gif/SMGA-tipo-1-Final', 0, 490, { align: 'center' });

// ═══════════════════════════════════════════════════════════════════
// PÁGINA 2: ACTORES Y VISIÓN GENERAL
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('1. INTRODUCCIÓN Y ACTORES DEL SISTEMA');
body('El Sistema de Mejora Genética Animal (SMGA) es una aplicación web diseñada para ganaderos y técnicos que necesitan registrar, calcular y analizar datos productivos, reproductivos y de salud de su rodeo bovino. La aplicación permite gestionar la información de cada animal, calcular índices genéticos y productivos, y compararlos con referencias nacionales.');
doc.moveDown(0.5);

heading2('1.1 Actores del Sistema');
const actors = [
  ['GANADERO / USUARIO', 'Actor principal. Persona que opera el sistema, ingresa datos, consulta reportes y configura parámetros. Puede ser el propietario del establecimiento o un técnico agropecuario.'],
  ['SISTEMA SMGA', 'Actor secundario (sistema). Ejecuta los cálculos automáticos (LC305, IIP, IPC, S/C, Valor de Cría), valida los datos ingresados y persiste la información en la base de datos Supabase.'],
  ['BASE DE DATOS (Supabase)', 'Almacén persistente. PostgreSQL alojado en Supabase. Recibe y entrega datos a través de la API REST generada automáticamente.'],
];
actors.forEach(([name, desc]) => {
  if (doc.y > 700) doc.addPage();
  const y = doc.y;
  doc.rect(50, y, W, 13).fill('#e0f2fe');
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(9).text(name, 54, y + 2, { width: W - 8 });
  doc.y = y + 14;
  body(desc, 10);
  doc.moveDown(0.3);
});

heading2('1.2 Diagrama General de Casos de Uso (visión global)');

// Draw a simple use case overview diagram as styled text
const ucGroups = [
  { label: 'GESTIÓN DE DATOS', color: '#fef3c7', border: C.amber, items: ['UC-01 Registrar Animal','UC-02 Editar Animal','UC-03 Eliminar Animal','UC-04 Datos Productivos','UC-05 Datos Reproductivos','UC-06 Datos de Salud','UC-07 Carga Masiva'] },
  { label: 'CÁLCULOS', color: '#dcfce7', border: C.green, items: ['UC-08 Producción Wood','UC-09 Producción Interp.','UC-10 Ind. Reproductivos','UC-11 Valor de Cría'] },
  { label: 'REPORTES', color: '#dbeafe', border: C.blue, items: ['UC-12 Reporte Vacas','UC-13 Reporte Toros','UC-14 Tablero General','UC-15 Exportar PDF'] },
  { label: 'CONFIGURACIÓN', color: '#f3e8ff', border: C.purple, items: ['UC-16 Ajustes Sistema','UC-17 Promedios Nac.','UC-18 Comparación Nac.'] },
];

const colW = (W - 15) / 2;
let gx = 50, gy = doc.y;
ucGroups.forEach((g, i) => {
  if (i === 2) { gx = 50; gy += 120; }
  const gxCur = i % 2 === 0 ? 50 : 50 + colW + 5;
  doc.rect(gxCur, gy, colW, 110).fill(g.color).stroke(g.border);
  doc.rect(gxCur, gy, colW, 16).fill(g.border);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(8).text(g.label, gxCur + 4, gy + 4, { width: colW - 8 });
  g.items.forEach((item, j) => {
    doc.fillColor(C.gray).font('Helvetica').fontSize(7.5)
       .text(`• ${item}`, gxCur + 6, gy + 20 + j * 12, { width: colW - 12, lineBreak: false });
  });
});

// Actor box on the left side
doc.rect(10, gy + 20, 35, 50).fill('#1e3a5f');
doc.fillColor('white').font('Helvetica-Bold').fontSize(6).text('GANADERO', 12, gy + 30, { width: 31, align: 'center' });
doc.moveTo(45, gy + 45).lineTo(50, gy + 45).stroke(C.blue);

doc.y = gy + 250;
doc.moveDown(0.3);

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 2: CASOS DE USO DETALLADOS
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('2. ESPECIFICACIÓN DETALLADA DE CASOS DE USO');

// ── UC-01
ucBox('UC-01','Registrar Animal', 'Ganadero',
  'El sistema está disponible. El Ganadero accede a la sección "Datos de Animales".',
  ['El Ganadero abre la pantalla "Datos de Animales".',
   'El sistema muestra el formulario con campos: ID Vaca, Ejercicio, Raza, Fecha de Nacimiento, Partos, Lactancia, Potencial.',
   'El Ganadero completa los campos obligatorios (ID Vaca, Raza, Fecha Nacimiento).',
   'El sistema calcula automáticamente la edad en meses a partir de la fecha de nacimiento.',
   'El Ganadero hace clic en "Guardar".',
   'El sistema valida los datos y los persiste en la tabla registros_basicos de Supabase.',
   'El sistema muestra confirmación de éxito y actualiza la tabla de registros.'],
  'El Ganadero no completa los campos obligatorios: el sistema muestra mensajes de error específicos por campo y no guarda.',
  'El nuevo animal queda registrado en el sistema y disponible para asociar datos productivos, reproductivos y de salud.',
  C.amber);

ucBox('UC-02','Editar Datos de un Animal', 'Ganadero',
  'Existen animales registrados en el sistema.',
  ['El Ganadero ubica el animal en la tabla de registros.',
   'Hace clic en el botón "Editar" (ícono de lápiz) de la fila correspondiente.',
   'El sistema carga los datos actuales del animal en el formulario.',
   'El Ganadero modifica los campos deseados.',
   'El Ganadero confirma los cambios haciendo clic en "Actualizar".',
   'El sistema valida y persiste los cambios en Supabase mediante UPDATE.',
   'La tabla se actualiza mostrando los datos modificados.'],
  'Los datos modificados son inválidos: el sistema muestra errores y no guarda.',
  'Los datos del animal quedan actualizados en el sistema.',
  C.amber);

ucBox('UC-03','Eliminar Animal', 'Ganadero',
  'Existe al menos un animal registrado.',
  ['El Ganadero ubica el animal en la tabla.',
   'Hace clic en el botón "Eliminar" (ícono de papelera) de la fila correspondiente.',
   'El sistema solicita confirmación al usuario.',
   'El Ganadero confirma la eliminación.',
   'El sistema ejecuta DELETE en Supabase y actualiza el estado local.',
   'La tabla se refresca sin el animal eliminado.'],
  'El Ganadero cancela la confirmación: no se realiza ninguna acción.',
  'El animal y todos sus datos asociados son eliminados del sistema.',
  C.amber);

if (doc.y > 650) doc.addPage();
ucBox('UC-04','Registrar Datos Productivos', 'Ganadero',
  'Existe al menos un animal registrado (UC-01 completado).',
  ['El Ganadero accede a "Datos Productivos de Leche".',
   'Selecciona el método activo (Wood o Interpolación, configurado en Ajustes).',
   'Si método = Wood: ingresa pesajes en días fijos (D30, D120, D210, D270), % grasa, % proteína y lactancias corregidas.',
   'Si método = Interpolación: ingresa N puntos de control con día y producción variables.',
   'El sistema calcula automáticamente LC305 usando la fórmula de Wood o la interpolación trapezoidal.',
   'El Ganadero hace clic en "Guardar".',
   'El sistema persiste los datos en registros_productivos en Supabase.'],
  'El campo LC305 es 0 o negativo: el sistema advierte al usuario antes de guardar.',
  'Los datos productivos quedan vinculados al animal (por id_vaca y ejercicio).',
  C.green);

ucBox('UC-05','Registrar Datos Reproductivos', 'Ganadero',
  'Existe al menos un animal registrado.',
  ['El Ganadero accede a "Datos Reproductivos".',
   'Ingresa fechas de parto actual, servicios (hasta 3), fecha de concepción, toro utilizado y fecha de parto siguiente.',
   'El sistema calcula automáticamente IIP (días entre partos), IPC (días parto a concepción) y S/C (servicios usados).',
   'El Ganadero revisa los valores calculados y guarda.',
   'El sistema persiste en registros_reproductivos en Supabase.'],
  'Las fechas son inválidas o inconsistentes: el sistema muestra advertencia y no calcula.',
  'Los datos reproductivos quedan vinculados al animal con IIP, IPC y S/C calculados.',
  C.blue);

ucBox('UC-06','Registrar Datos de Salud y Condición', 'Ganadero',
  'Existe al menos un animal registrado.',
  ['El Ganadero accede a "Datos de Salud y Condición".',
   'Ingresa puntajes (escala 1-5) para: Renguera, Mastitis, Facilidad al Parto, Longevidad y Fortaleza de Patas.',
   'El Ganadero guarda los datos.',
   'El sistema persiste en registros_otros en Supabase.'],
  null,
  'Los puntajes de salud quedan registrados y disponibles para comparación con promedios nacionales.',
  C.purple);

doc.addPage();
ucBox('UC-07','Carga Masiva desde Excel/CSV', 'Ganadero',
  'El Ganadero posee un archivo Excel o CSV con datos de animales en el formato esperado.',
  ['El Ganadero accede al componente "Carga Masiva" en la pantalla principal.',
   'Hace clic en "Subir Excel/CSV" y selecciona el archivo.',
   'El sistema lee todas las hojas del archivo y detecta el tipo de datos por las columnas presentes.',
   'Para cada hoja reconocida (Básicos, Productivos, Reproductivos, Otros), el sistema valida y mapea los campos.',
   'El sistema inserta los registros válidos en Supabase y actualiza el estado local.',
   'El sistema muestra un resumen con la cantidad de registros cargados por sección y los errores encontrados.'],
  'El archivo no tiene columnas reconocibles: el sistema advierte y no inserta datos.',
  'Todos los registros válidos quedan persistidos en Supabase.',
  C.navy);

ucBox('UC-08','Calcular Producción Estimada a 305 Días (Wood)', 'Sistema SMGA',
  'Existen datos productivos registrados. Método configurado = "Wood Estándar".',
  ['El Ganadero accede a "Producción Estimada a 305 Días".',
   'El sistema recupera todos los registros productivos.',
   'Para cada animal, el sistema calcula la curva Wood estándar: Y(d) = (potencial × 0.00318) × d^0.1027 × e^(-0.003×d).',
   'Calcula Ya_std (área bajo la curva estándar hasta el último pesaje) y Yn_std (producción estándar en ese día).',
   'Calcula el FPR = Ya_real / (Ya_std × (Yn_real / Yn_std)).',
   'Calcula P305 = (área trapezoidal pesajes reales) × FPR × (305 / Ya_real × potencial estimado).',
   'Muestra la tabla con Real D30, D120, D210, D270, potencial asignado y P305 calculado.'],
  'No hay datos productivos: la tabla muestra mensaje informativo.',
  'Cada animal tiene su producción estimada a 305 días calculada y visible.',
  C.green);

ucBox('UC-09','Calcular Producción por Interpolación', 'Sistema SMGA',
  'Existen datos productivos con N controles variables. Método = "Interpolación".',
  ['El sistema recupera los puntos de control (día, producción) guardados en controles_adicionales.',
   'Ordena los puntos por día ascendente.',
   'Calcula el área bajo la curva real usando integración trapezoidal entre todos los puntos.',
   'Calcula la curva Wood estándar hasta el día del último control.',
   'Aplica el FPR para proyectar a 305 días.',
   'Muestra los N puntos de control junto con P305 proyectado.'],
  'Menos de 2 puntos de control: el sistema advierte que se necesita mínimo 2 pesajes.',
  'P305 calculado por interpolación para cada animal con controles suficientes.',
  C.green);

ucBox('UC-10','Consultar Indicadores Reproductivos', 'Ganadero',
  'Existen datos reproductivos registrados.',
  ['El Ganadero accede a "Indicadores Reproductivos".',
   'El sistema recupera todos los registros reproductivos.',
   'Calcula y muestra: IIP promedio del rodeo, IPC promedio, S/C promedio, distribución de servicios.',
   'Presenta ranking de animales por eficiencia reproductiva.',
   'El Ganadero puede filtrar por ejercicio o raza.'],
  null,
  'El Ganadero visualiza los indicadores reproductivos del rodeo completo.',
  C.blue);

ucBox('UC-11','Calcular Valor de Cría Genético', 'Ganadero',
  'Existen datos básicos y productivos. Heredabilidad y repetibilidad configuradas en Ajustes.',
  ['El Ganadero accede a "Valor de Cría Genético".',
   'Selecciona el animal o ingresa los datos de producción.',
   'El sistema aplica la fórmula: VC = h² × (desviación del animal respecto al promedio del grupo).',
   'Calcula también el valor esperado de las hijas (VEH = VC / 2).',
   'Muestra el resultado con interpretación cualitativa.'],
  null,
  'El Ganadero conoce el valor genético estimado del animal y sus hijas.',
  C.purple);

doc.addPage();
ucBox('UC-12','Generar Reporte de Vacas', 'Ganadero',
  'Existen datos en el sistema (básicos, productivos o reproductivos).',
  ['El Ganadero accede a "Reporte de Vacas".',
   'El sistema cruza datos de las tablas básicos, productivos, reproductivos y otros por id_vaca.',
   'Presenta una tabla consolidada con todos los indicadores de cada animal.',
   'El Ganadero puede ordenar por cualquier columna y filtrar por ejercicio.',
   'Hace clic en "PDF" para exportar el reporte.'],
  null,
  'Reporte completo del rodeo generado y exportable.',
  C.navy);

ucBox('UC-13','Generar Reporte de Toros', 'Ganadero',
  'Existen registros de toros cargados en el sistema.',
  ['El Ganadero accede a "Reporte de Toros".',
   'El sistema calcula el índice INIA: 0.4×DEP_leche + 0.3×DEP_grasa + 0.2×DEP_proteína + 0.1×DEP_tph.',
   'Calcula el índice Rovere con sus propios ponderadores.',
   'Ordena los toros por índice y muestra ranking.',
   'Permite exportar PDF con el ranking completo.'],
  null,
  'Ranking de toros calculado y disponible para decisiones de servicio.',
  C.navy);

ucBox('UC-14','Cargar Promedios Nacionales de Referencia', 'Ganadero',
  'El Ganadero posee un archivo Excel con promedios nacionales.',
  ['El Ganadero accede a "Comparación con Promedios Nacionales".',
   'Hace clic en "Subir promedios" y selecciona el archivo.',
   'El archivo contiene columnas: variable, tipo (primipara/multipara/todas), valor.',
   'El sistema parsea el archivo y almacena los valores en localStorage.',
   'La tabla de comparación se actualiza automáticamente mostrando los valores de referencia.'],
  'El archivo no tiene las columnas requeridas: el sistema muestra mensaje de error.',
  'Los promedios nacionales quedan disponibles para comparación hasta que el usuario los borre.',
  C.teal);

ucBox('UC-15','Comparar Rodeo con Promedios Nacionales', 'Ganadero',
  'Existen animales registrados. Promedios nacionales cargados (UC-14).',
  ['El Ganadero accede a "Comparación con Promedios Nacionales".',
   'El sistema clasifica los animales: primíparas (lactancia=1) y multíparas (lactancia>1).',
   'Calcula el promedio del sistema para cada variable (LC305, %Grasa, %Proteína, IIP, IPC, S/C, salud).',
   'Muestra tabla comparativa: Sistema Primíparas | Sistema Multíparas | Nacional Primíparas | Nacional Multíparas.',
   'Indica con íconos si el rodeo está por encima (↑) o por debajo (↓) de la referencia nacional.',
   'El Ganadero puede exportar la comparación en PDF.'],
  'No hay promedios nacionales cargados: las columnas de referencia muestran "sin dato".',
  'El Ganadero tiene una visión clara de la posición relativa de su rodeo respecto a los estándares nacionales.',
  C.teal);

ucBox('UC-16','Configurar Ajustes del Sistema', 'Ganadero',
  'El Ganadero accede a la sección de Ajustes.',
  ['El Ganadero accede a "Ajustes del Sistema".',
   'Puede modificar: heredabilidad (h²), repetibilidad, rango de potenciales, método de cálculo Wood305.',
   'Selecciona el método de cálculo: "Wood Estándar" o "Interpolación N pesajes".',
   'El Ganadero guarda los ajustes.',
   'El sistema persiste los valores en localStorage y los aplica a todos los cálculos automáticamente.'],
  null,
  'Los parámetros configurados son usados por todos los módulos de cálculo del sistema.',
  C.gray);

ucBox('UC-17','Ver Tablero General de Indicadores', 'Ganadero',
  'Existen datos en el sistema.',
  ['El Ganadero accede al "Tablero General".',
   'El sistema presenta un resumen ejecutivo con: número de animales, producción promedio del rodeo, principales indicadores reproductivos y de salud.',
   'Los datos se actualizan en tiempo real al cargar la pantalla.'],
  null,
  'El Ganadero tiene una vista ejecutiva del estado general del rodeo.',
  C.navy);

ucBox('UC-18','Exportar Reporte en PDF', 'Ganadero',
  'El Ganadero está en cualquier pantalla con datos calculados.',
  ['El Ganadero hace clic en el botón "PDF" disponible en la pantalla actual.',
   'El sistema usa jsPDF y jsPDF-AutoTable para generar el documento.',
   'El PDF incluye título, fecha, tabla con todos los datos visibles y logo del sistema.',
   'El navegador descarga automáticamente el archivo PDF.'],
  null,
  'El PDF queda descargado en el dispositivo del Ganadero.',
  C.navy);

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 3: DIAGRAMAS DE SECUENCIA
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('3. DIAGRAMAS DE SECUENCIA SIMPLIFICADOS');

heading2('Secuencia UC-01: Registrar Animal', C.amber);
seqDiagram([
  ['→', 'Abre pantalla "Datos de Animales"'],
  ['←', 'Muestra formulario vacío'],
  ['→', 'Completa ID Vaca, Raza, Fecha Nacimiento, etc.'],
  ['←', 'Calcula edad automáticamente'],
  ['→', 'Hace clic en "Guardar"'],
  ['←', 'Valida campos requeridos'],
  ['→', 'INSERT en registros_basicos (Supabase)'],
  ['←', 'Confirma éxito — tabla actualizada'],
]);
doc.moveDown(0.5);

heading2('Secuencia UC-04: Registrar Datos Productivos (Wood)', C.green);
seqDiagram([
  ['→', 'Accede a "Datos Productivos"'],
  ['←', 'Muestra formulario según método activo (Wood/Interp.)'],
  ['→', 'Ingresa pesajes D30, D120, D210, D270 y %Grasa, %Prot'],
  ['←', 'Calcula LC305 en tiempo real'],
  ['→', 'Hace clic en "Guardar"'],
  ['←', 'INSERT en registros_productivos (Supabase)'],
  ['←', 'Confirmación y tabla actualizada'],
]);
doc.moveDown(0.5);

heading2('Secuencia UC-07: Carga Masiva Excel/CSV', C.navy);
seqDiagram([
  ['→', 'Selecciona archivo .xlsx / .csv'],
  ['←', 'Lee ArrayBuffer con librería XLSX'],
  ['←', 'Detecta tipo de hoja por columnas'],
  ['←', 'Valida y mapea cada fila'],
  ['→', 'INSERT masivo en Supabase (por sección)'],
  ['←', 'Muestra resumen: "N registros cargados"'],
]);
doc.moveDown(0.5);

heading2('Secuencia UC-08: Calcular Producción Wood', C.green);
seqDiagram([
  ['→', 'Accede a "Producción Estimada 305 Días"'],
  ['←', 'Recupera registros productivos y básicos'],
  ['←', 'Calcula curva Wood Y(d) para cada animal'],
  ['←', 'Calcula Ya_std, Yn_std, Ya_real, FPR, P305'],
  ['←', 'Muestra tabla con resultados'],
  ['→', 'Opcional: hace clic en "PDF"'],
  ['←', 'Descarga PDF con tabla de resultados'],
]);
doc.moveDown(0.5);

heading2('Secuencia UC-14 + UC-15: Cargar y Comparar Promedios Nacionales', C.teal);
seqDiagram([
  ['→', 'Accede a "Comparación Nacional"'],
  ['←', 'Muestra tabla con promedios del sistema (vacías las col. nacionales)'],
  ['→', 'Sube archivo Excel con variable/tipo/valor'],
  ['←', 'Parsea y almacena en localStorage'],
  ['←', 'Actualiza tabla: col. nacionales con valores cargados'],
  ['←', 'Muestra íconos ↑↓ comparando sistema vs nacional'],
]);

// ── Página final: instrucciones de lectura
doc.addPage();
heading1('4. GLOSARIO Y FÓRMULAS CLAVE');

const formulas = [
  ['LC305 (Wood)', 'Y(d) = (potencial × 0.00318) × d^0.1027 × e^(-0.003 × d)'],
  ['FPR', 'FPR = Ya_real / (Ya_std × Yn_real / Yn_std)'],
  ['P305', 'P305 = ∑(área trapezoidal pesajes reales) × FPR × factor escala'],
  ['IIP', 'IIP (días) = Fecha Parto Siguiente – Fecha Parto Actual'],
  ['IPC', 'IPC (días) = Fecha Concepción – Fecha Parto'],
  ['S/C', 'S/C = Número de servicios hasta la concepción'],
  ['Índice INIA', 'INIA = 0.4×DEP_leche + 0.3×DEP_grasa + 0.2×DEP_proteína + 0.1×DEP_tph'],
  ['Valor de Cría', 'VC = h² × (desviación del animal respecto al promedio del grupo)'],
];
tableRow(['Indicador / Fórmula','Expresión Matemática'], [160, W-160], true, C.navy);
formulas.forEach(([k,v], i) => tableRow([k,v], [160, W-160], false, i%2===0 ? C.light : null));

doc.moveDown(0.5);
heading2('Siglas y Términos');
const glosario = [
  ['LC305','Lactancia Corregida a 305 días'],
  ['FPR','Factor de Producción Real (ratio real/estándar)'],
  ['IIP','Intervalo Interparto (días entre partos consecutivos)'],
  ['IPC','Intervalo Parto-Concepción (días desde el parto hasta quedar gestante)'],
  ['S/C','Servicios por Concepción (eficiencia reproductiva)'],
  ['DEP','Diferencia Esperada en la Progenie (índice genético)'],
  ['h²','Heredabilidad (fracción de la varianza total debida a genes)'],
  ['Wood','Modelo matemático de curva de lactancia (Wood, 1967)'],
  ['VC','Valor de Cría: contribución genética transmisible a la descendencia'],
];
tableRow(['Sigla','Definición'], [80, W-80], true, C.blue);
glosario.forEach(([k,v], i) => tableRow([k,v], [80, W-80], false, i%2===0 ? C.light : null));

// Page numbers
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  if (i === 0) continue; // skip cover
  doc.switchToPage(i);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
     .text(`SMGA — Casos de Uso y UML    |    Página ${i} de ${totalPages - 1}    |    Junio 2026`,
       50, doc.page.height - 35, { width: W, align: 'center' });
}

doc.end();
console.log('PDF 1 generado:', out);
