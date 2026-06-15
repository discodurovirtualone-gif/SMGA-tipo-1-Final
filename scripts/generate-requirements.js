const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
const out = path.join(__dirname, '../generated-docs/mapeo-requerimientos.pdf');
doc.pipe(fs.createWriteStream(out));

const C = { navy:'#1a2e4a', green:'#166534', blue:'#1e3a5f', purple:'#4c1d95',
             amber:'#92400e', gray:'#374151', light:'#f8fafc', mid:'#e2e8f0',
             dark:'#111827', red:'#7f1d1d', teal:'#134e4a', emerald:'#064e3b' };
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

const body = (txt) => {
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(txt, 50, doc.y, { width: W, lineGap: 2 });
};

const tableRow = (cols, widths, isHeader=false, bg=null) => {
  if (doc.y > 740) doc.addPage();
  const x0 = 50, rowH = isHeader ? 18 : 13;
  const y0 = doc.y;
  const totalW = widths.reduce((a,b)=>a+b,0);
  if (bg) doc.rect(x0, y0, totalW, rowH).fill(bg);
  doc.rect(x0, y0, totalW, rowH).stroke('#cbd5e1');
  let x = x0;
  cols.forEach((c, i) => {
    doc.rect(x, y0, widths[i], rowH).stroke('#cbd5e1');
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(isHeader ? 7.5 : 7.5)
       .fillColor(isHeader ? 'white' : C.gray)
       .text(String(c), x + 3, y0 + (isHeader ? 4 : 2), { width: widths[i]-6, height: rowH-2, lineBreak: false });
    x += widths[i];
  });
  doc.y = y0 + rowH;
};

const rfBox = (id, name, desc, priority, cat, color=C.blue, bg='#eff6ff') => {
  if (doc.y > 700) doc.addPage();
  const startY = doc.y;
  doc.rect(50, startY, W, 14).fill(color);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
     .text(`${id}  •  ${name}  [${priority}]`, 56, startY + 3, { width: W - 12 });
  doc.y = startY + 15;
  doc.rect(50, doc.y, W, 0.5).fill('#cbd5e1');
  doc.y += 2;
  doc.font('Helvetica').fontSize(8.5).fillColor(C.gray)
     .text(desc, 54, doc.y, { width: W - 8, lineGap: 2 });
  doc.rect(50, startY, W, doc.y - startY + 3).stroke('#94a3b8');
  doc.y += 5;
};

// ═══════════════════════════════════════════════════════════════════
// PORTADA
// ═══════════════════════════════════════════════════════════════════
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
doc.rect(0, 0, doc.page.width, 8).fill('#16a34a');
doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill('#16a34a');

doc.fillColor('#f0fdf4').font('Helvetica-Bold').fontSize(9)
   .text('SISTEMA DE MEJORA GENÉTICA ANIMAL — SMGA', 0, 80, { align: 'center' });
doc.fillColor('white').font('Helvetica-Bold').fontSize(26)
   .text('Mapeo de Requerimientos', 0, 110, { align: 'center' });
doc.fillColor('#86efac').fontSize(17)
   .text('Funcionales y No Funcionales — Cobertura del Sistema', 0, 148, { align: 'center' });

doc.fillColor('#94a3b8').fontSize(10)
   .text('Documento de Trazabilidad de Requerimientos', 0, 200, { align: 'center' });
doc.fillColor('#64748b').fontSize(9)
   .text('Versión 2.0 — Junio 2026', 0, 218, { align: 'center' });

doc.rect(100, 250, doc.page.width - 200, 1).fill('#334155');

const stats = [
  ['15', 'Requerimientos\nFuncionales'],
  ['7', 'Requerimientos\nNo Funcionales'],
  ['18', 'Casos de Uso\nCubiertos'],
  ['10', 'Componentes\nde Software'],
];
stats.forEach(([n, label], i) => {
  const bx = 75 + i * 115;
  doc.rect(bx, 275, 100, 70).fill('#1e3a5f').stroke('#334155');
  doc.fillColor('#86efac').font('Helvetica-Bold').fontSize(30).text(n, bx, 285, { width: 100, align: 'center' });
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text(label, bx, 318, { width: 100, align: 'center' });
});

doc.rect(100, 370, doc.page.width - 200, 1).fill('#334155');
doc.fillColor('#64748b').fontSize(8)
   .text('GitHub: github.com/discodurovirtualone-gif/SMGA-tipo-1-Final', 0, 385, { align: 'center' });

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 1: REQUERIMIENTOS FUNCIONALES
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('1. REQUERIMIENTOS FUNCIONALES (RF)');
body('Los requerimientos funcionales describen QUÉ debe hacer el sistema. Se clasifican por prioridad: ALTA (indispensable), MEDIA (importante) y BAJA (deseable).');
doc.moveDown(0.4);

heading2('1.1 Gestión de Registros', C.amber);

rfBox('RF-01','Registrar Datos Básicos del Animal',
  'El sistema debe permitir registrar información básica de cada animal: identificador único (id_vaca), ejercicio productivo, raza, fecha de nacimiento, número de partos, número de lactancia y potencial productivo. El sistema calculará automáticamente la edad en meses a partir de la fecha de nacimiento.',
  'ALTA', 'Gestión', C.amber);

rfBox('RF-02','Editar y Eliminar Registros',
  'El sistema debe permitir editar cualquier campo de un registro existente y eliminarlo. Antes de eliminar debe solicitar confirmación al usuario.',
  'ALTA', 'Gestión', C.amber);

rfBox('RF-03','Registrar Datos Productivos de Leche',
  'El sistema debe permitir registrar pesajes de producción de leche en días fijos (D30, D120, D210, D270) o en N días variables, junto con porcentaje de grasa, porcentaje de proteína y lactancias corregidas (L1 a L5). El modo de ingreso (fijo vs. variable) depende del método configurado en Ajustes.',
  'ALTA', 'Gestión', C.green);

rfBox('RF-04','Registrar Datos Reproductivos',
  'El sistema debe permitir registrar fechas de parto, hasta 3 servicios (con fechas), fecha de concepción, toro utilizado y fecha de parto siguiente. Los indicadores IIP, IPC y S/C se calcularán automáticamente.',
  'ALTA', 'Gestión', C.blue);

rfBox('RF-05','Registrar Datos de Salud y Condición',
  'El sistema debe permitir registrar puntajes de: renguera, mastitis, facilidad al parto, longevidad y fortaleza de patas en escala 1 a 5.',
  'MEDIA', 'Gestión', C.purple);

rfBox('RF-06','Cargar Datos Masivamente desde Excel/CSV',
  'El sistema debe permitir subir archivos Excel (.xlsx, .xls) o CSV con registros de cualquiera de las cuatro categorías (Básicos, Productivos, Reproductivos, Otros). El sistema debe detectar automáticamente el tipo de hoja por las columnas presentes e insertar los datos válidos en la base de datos.',
  'ALTA', 'Gestión', C.navy);

doc.moveDown(0.3);
heading2('1.2 Cálculos y Estimaciones', C.green);

rfBox('RF-07','Calcular Producción Estimada a 305 Días — Método Wood Estándar',
  'El sistema debe calcular la producción estimada a 305 días (LC305) usando la curva de Wood: Y(d) = (potencial × 0.00318) × d^0.1027 × e^(-0.003×d). El cálculo debe incluir: Ya_std (acumulado estándar), Yn_std (producción estándar en día n), FPR = Ya_real / (Ya_std × Yn_real/Yn_std), y P305 a partir de la integración trapezoidal real escalada por FPR.',
  'ALTA', 'Cálculo', C.green);

rfBox('RF-08','Calcular Producción por Interpolación con N Pesajes Variables',
  'El sistema debe soportar un método alternativo de cálculo donde el Ganadero ingresa hasta 20 puntos de control (día, producción) en cualquier día de lactancia. El sistema aplicará integración trapezoidal sobre los puntos reales y proyectará a 305 días usando el FPR de la curva Wood estándar como referencia.',
  'ALTA', 'Cálculo', C.green);

rfBox('RF-09','Calcular Indicadores Reproductivos',
  'El sistema debe calcular y mostrar automáticamente: IIP (Intervalo Interparto = días entre partos consecutivos), IPC (Intervalo Parto-Concepción = días desde parto hasta concepción) y S/C (servicios por concepción = número de servicios usados).',
  'ALTA', 'Cálculo', C.blue);

rfBox('RF-10','Calcular Valor de Cría Genético',
  'El sistema debe calcular el Valor de Cría (VC = h² × desviación respecto al promedio del grupo) y el Valor Esperado de las Hijas. Los parámetros heredabilidad (h²) y repetibilidad son configurables por el usuario.',
  'MEDIA', 'Cálculo', C.purple);

rfBox('RF-11','Calcular Índices de Toros (INIA y Rovere)',
  'El sistema debe calcular los índices genéticos de toros: Índice INIA = 0.4×DEP_leche + 0.3×DEP_grasa + 0.2×DEP_proteína + 0.1×DEP_tph, e Índice Rovere con sus propios ponderadores. Debe generar un ranking ordenado.',
  'MEDIA', 'Cálculo', C.navy);

doc.addPage();
heading2('1.3 Consultas, Reportes y Exportación', C.navy);

rfBox('RF-12','Generar Reporte Consolidado de Vacas',
  'El sistema debe cruzar automáticamente los datos básicos, productivos, reproductivos y de salud de cada animal y presentarlos en una tabla unificada ordenable por cualquier columna.',
  'ALTA', 'Reporte', C.navy);

rfBox('RF-13','Comparar Promedios del Rodeo con Promedios Nacionales',
  'El sistema debe calcular promedios separados para vacas primíparas (lactancia=1) y multíparas (lactancia>1) para todas las variables clave, y compararlos con valores de referencia nacional que el usuario puede cargar mediante un archivo Excel.',
  'MEDIA', 'Reporte', C.teal);

rfBox('RF-14','Ver Tablero General de Indicadores',
  'El sistema debe presentar un tablero ejecutivo con los principales indicadores del rodeo en una sola pantalla: totales, promedios y rankings.',
  'MEDIA', 'Reporte', C.navy);

rfBox('RF-15','Exportar Reportes en PDF',
  'Todas las pantallas con datos calculados deben ofrecer un botón "PDF" que genere y descargue automáticamente un documento PDF con los datos visibles, título, fecha y marca del sistema.',
  'MEDIA', 'Exportación', C.gray);

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 2: REQUERIMIENTOS NO FUNCIONALES
// ═══════════════════════════════════════════════════════════════════
doc.moveDown(0.4);
heading1('2. REQUERIMIENTOS NO FUNCIONALES (RNF)');

const rnfs = [
  ['RNF-01','Accesibilidad (NIH/NLM)','ALTA',
   'La interfaz debe cumplir las pautas de accesibilidad NIH/NLM: fuente base ≥18px (Arial/Verdana), contraste alto (texto oscuro sobre fondo claro), botones grandes con texto e ícono, ayuda contextual en cada sección, y botón "Volver al Inicio" visible en todas las pantallas.'],
  ['RNF-02','Usabilidad y Lenguaje Claro','ALTA',
   'El sistema debe usar lenguaje sencillo y directo, sin jerga técnica innecesaria. Las etiquetas descriptivas deben indicar claramente qué se ingresa (ej: "Datos de Animales: nombre, raza, edad"). Los mensajes de confirmación deben ser visibles y comprensibles.'],
  ['RNF-03','Persistencia y Disponibilidad de Datos','ALTA',
   'Todos los datos deben persistir en Supabase PostgreSQL. El sistema debe tolerar pérdida de conectividad transitoria: los datos del estado local (React Context) se mantienen durante la sesión y se sincronizan al recuperar la conexión.'],
  ['RNF-04','Rendimiento — Cálculos en Tiempo Real','ALTA',
   'Los cálculos de LC305, IIP, IPC y S/C deben realizarse en tiempo real mientras el usuario completa el formulario, sin requerir recarga de página. El tiempo de respuesta para carga inicial de datos debe ser menor a 3 segundos en condiciones normales de conectividad.'],
  ['RNF-05','Compatibilidad Multiplataforma','MEDIA',
   'La aplicación debe funcionar en navegadores modernos (Chrome, Firefox, Safari, Edge) en dispositivos de escritorio y tablets. No se requiere soporte para IE11 ni versiones obsoletas.'],
  ['RNF-06','Seguridad','MEDIA',
   'Las credenciales de Supabase (URL y anon key) no deben estar expuestas en el frontend más allá de la clave pública (anon key). Los datos sensibles de producción deben transmitirse sobre HTTPS. No se implementa autenticación de usuarios en la versión actual (acceso abierto en red local).'],
  ['RNF-07','Mantenibilidad y Extensibilidad','BAJA',
   'El código fuente debe seguir la estructura React + Vite + TypeScript con componentes separados por responsabilidad. El esquema de base de datos y los tipos compartidos deben definirse en shared/schema.ts para garantizar consistencia. Los nuevos módulos deben poder agregarse sin modificar la arquitectura existente.'],
];

rnfs.forEach(([id, name, priority, desc]) => {
  rfBox(id, name, desc, priority, '', priority === 'ALTA' ? C.navy : priority === 'MEDIA' ? C.blue : C.gray);
});

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 3: MATRIZ DE TRAZABILIDAD
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('3. MATRIZ DE TRAZABILIDAD — Requerimientos vs. Casos de Uso');
body('La siguiente matriz muestra qué casos de uso cubren cada requerimiento funcional. ✓ = cubierto directamente, (✓) = cubierto parcialmente.');
doc.moveDown(0.4);

// Matrix headers: RF vs UC groups
const ucCols = ['UC-01\nUC-02\nUC-03','UC-04','UC-05','UC-06','UC-07','UC-08\nUC-09','UC-10','UC-11','UC-12','UC-13','UC-14\nUC-15','UC-16','UC-17','UC-18'];
const ucLabels = ['Reg.\nBásico','Prod.','Repro.','Salud','Carga\nMasiva','Calc.\nWood','Ind.\nReprod.','Val.\nCría','Rep.\nVacas','Rep.\nToros','Prom.\nNac.','Ajustes','Tablero','PDF'];
const rfIds = ['RF-01','RF-02','RF-03','RF-04','RF-05','RF-06','RF-07','RF-08','RF-09','RF-10','RF-11','RF-12','RF-13','RF-14','RF-15'];
const rfNames = ['Datos Básicos','Editar/Eliminar','Datos Productivos','Datos Reproductivos','Datos Salud','Carga Masiva','Calc. Wood','Calc. Interpol.','Ind. Reproductivos','Valor de Cría','Índices Toros','Reporte Vacas','Comp. Nacional','Tablero','Exportar PDF'];

// Matrix data: rows = RF, cols = UC (14 cols)
const matrix = [
//       UC01  UC04  UC05  UC06  UC07  UC08  UC10  UC11  UC12  UC13  UC14  UC16  UC17  UC18
  ['RF-01',  '✓','  ','  ','  ','(✓)','  ','  ','  ','(✓)','  ','  ','  ','(✓)','  '],
  ['RF-02',  '✓','  ','  ','  ','  ','  ','  ','  ','  ','  ','  ','  ','  ','  '],
  ['RF-03',  '  ','✓','  ','  ','(✓)','(✓)','  ','  ','(✓)','  ','(✓)','  ','(✓)','  '],
  ['RF-04',  '  ','  ','✓','  ','(✓)','  ','✓','  ','(✓)','  ','(✓)','  ','(✓)','  '],
  ['RF-05',  '  ','  ','  ','✓','(✓)','  ','  ','  ','(✓)','  ','(✓)','  ','(✓)','  '],
  ['RF-06',  '(✓)','(✓)','(✓)','(✓)','✓','  ','  ','  ','  ','  ','  ','  ','  ','  '],
  ['RF-07',  '  ','(✓)','  ','  ','  ','✓','  ','  ','(✓)','  ','(✓)','(✓)','(✓)','(✓)'],
  ['RF-08',  '  ','(✓)','  ','  ','  ','✓','  ','  ','(✓)','  ','(✓)','(✓)','(✓)','(✓)'],
  ['RF-09',  '  ','  ','(✓)','  ','  ','  ','✓','  ','(✓)','  ','(✓)','  ','(✓)','(✓)'],
  ['RF-10',  '(✓)','(✓)','  ','  ','  ','  ','  ','✓','(✓)','  ','  ','(✓)','(✓)','(✓)'],
  ['RF-11',  '  ','  ','  ','  ','  ','  ','  ','  ','  ','✓','  ','  ','(✓)','(✓)'],
  ['RF-12',  '(✓)','(✓)','(✓)','(✓)','(✓)','(✓)','(✓)','(✓)','✓','  ','  ','  ','(✓)','(✓)'],
  ['RF-13',  '(✓)','(✓)','(✓)','(✓)','  ','(✓)','(✓)','  ','  ','  ','✓','  ','  ','(✓)'],
  ['RF-14',  '(✓)','(✓)','(✓)','(✓)','  ','(✓)','(✓)','(✓)','(✓)','(✓)','  ','  ','✓','  '],
  ['RF-15',  '  ','(✓)','(✓)','  ','  ','(✓)','(✓)','(✓)','(✓)','(✓)','(✓)','  ','(✓)','✓'],
];

// draw matrix
const c0 = 80, cW = (W - c0) / 14;
// header row 1
const hy = doc.y;
doc.rect(50, hy, c0, 36).fill(C.navy).stroke('#334155');
doc.fillColor('white').font('Helvetica-Bold').fontSize(7).text('Requerimiento', 52, hy + 10, { width: c0-4, align: 'center' });
ucLabels.forEach((lbl, i) => {
  const x = 50 + c0 + i * cW;
  doc.rect(x, hy, cW, 36).fill(i%2===0 ? '#1e3a5f' : '#2d4a6f').stroke('#334155');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(6)
     .text(lbl, x+1, hy+3, { width: cW-2, align: 'center', lineGap: 1 });
});
doc.y = hy + 37;

matrix.forEach(([rfid, ...cells], ri) => {
  const ry = doc.y;
  const rowBg = ri % 2 === 0 ? '#f8fafc' : '#f1f5f9';
  doc.rect(50, ry, c0, 13).fill(rowBg).stroke('#cbd5e1');
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(7)
     .text(`${rfid} — ${rfNames[ri]}`, 52, ry + 3, { width: c0-4, lineBreak: false });
  cells.forEach((val, ci) => {
    const x = 50 + c0 + ci * cW;
    const cellBg = val.trim() === '✓' ? '#dcfce7' : val.trim() === '(✓)' ? '#fef9c3' : rowBg;
    doc.rect(x, ry, cW, 13).fill(cellBg).stroke('#cbd5e1');
    doc.fillColor(val.trim() === '✓' ? C.green : val.trim() === '(✓)' ? C.amber : '#94a3b8')
       .font('Helvetica-Bold').fontSize(7)
       .text(val.trim(), x, ry+3, { width: cW, align: 'center', lineBreak: false });
  });
  doc.y = ry + 13;
});

doc.moveDown(0.4);
// Legend
const ly = doc.y;
doc.rect(50, ly, 16, 10).fill('#dcfce7').stroke('#94a3b8');
doc.fillColor(C.green).font('Helvetica-Bold').fontSize(7).text('✓', 50, ly+2, { width: 16, align: 'center' });
doc.fillColor(C.gray).font('Helvetica').fontSize(8).text('= Cubierto directamente', 70, ly+2);
doc.y = ly;
doc.rect(200, ly, 16, 10).fill('#fef9c3').stroke('#94a3b8');
doc.fillColor(C.amber).font('Helvetica-Bold').fontSize(7).text('(✓)', 200, ly+2, { width: 16, align: 'center' });
doc.fillColor(C.gray).font('Helvetica').fontSize(8).text('= Cubierto parcialmente', 220, ly+2);
doc.y = ly + 15;

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 4: COBERTURA TECNOLÓGICA
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('4. COBERTURA TECNOLÓGICA — Cómo Está Implementado Cada Requerimiento');
body('Esta sección detalla qué componentes de software, archivos y tecnologías implementan cada requerimiento funcional.');
doc.moveDown(0.4);

const coverage = [
  ['RF-01','Registrar Datos Básicos',
   'Componente: RegistrosBasicos.tsx\nContexto: GanaderiaContext.tsx (registrosBasicos)\nBase de datos: Tabla registros_basicos en Supabase\nBibliotecas: react-hook-form, zod\nCálculo automático: calcEdadMeses() en GanaderiaContext.tsx'],
  ['RF-02','Editar y Eliminar',
   'Componente: RegistrosBasicos.tsx (botones Editar/Eliminar por fila)\nPatrón: DELETE en Supabase + setRegistrosBasicos() para actualización local\nConfirmación: Dialog de shadcn/ui antes de eliminar'],
  ['RF-03','Datos Productivos',
   'Componente: RegistrosProductivos.tsx\nModo Wood: campos fijos D30, D120, D210, D270\nModo Interpolación: N puntos variables (controles_adicionales JSON)\nContexto: GanaderiaContext.tsx (RegistroProductivo, controles_adicionales)\nBase de datos: Tabla registros_productivos + columna controles_adicionales (TEXT)'],
  ['RF-04','Datos Reproductivos',
   'Componente: RegistrosReproductivos.tsx\nCálculo IIP: diferencia en días entre parto1 y parto\nCálculo IPC: diferencia en días entre concepcion1 y parto\nCálculo S/C: conteo de servicios no vacíos\nBase de datos: Tabla registros_reproductivos'],
  ['RF-05','Datos de Salud',
   'Componente: RegistrosOtros.tsx\nCampos: renguera, mastitis, facParto, longevidad, fortalezaPatas (escala 1-5)\nBase de datos: Tabla registros_otros'],
  ['RF-06','Carga Masiva',
   'Componente: BulkUpload.tsx\nBiblioteca: xlsx (SheetJS) para leer .xlsx/.xls/.csv\nDetección automática: matchSection() por columnas presentes\nAliases de columnas: COL_ALIASES para variaciones de nombre\nConversión fechas: excelDateToString() para seriales Excel\nInsert en Supabase: por sección (Básicos, Productivos, Reproductivos, Otros)'],
  ['RF-07','Cálculo Wood LC305',
   'Componente: ProduccionWood.tsx\nFórmula: Y(d) = (potencial × 0.00318) × d^0.1027 × e^(-0.003×d)\nVariables clave: Ya_std, Yn_std (curva estándar), Ya_real (trapezoidal real), FPR\nFuente de datos: registrosProductivos + registrosBasicos (potencial_vaca)\nExportación: PdfReportButton.tsx (jsPDF + jspdf-autotable)'],
  ['RF-08','Cálculo Interpolación',
   'Componente: ProduccionWood.tsx (rama metodo = "interpolacion")\nDatos de entrada: controles_adicionales (JSON array de {dia, produccion})\nMétodo: integración trapezoidal sobre N puntos variables\nFPR: calculado vs. curva Wood estándar en el rango de días registrados'],
  ['RF-09','Indicadores Reproductivos',
   'Componente: IndicadoresReproductivos.tsx\nFórmulas: IIP = |parto1 - parto| en días, IPC = |concepcion1 - parto| en días, S/C = count(servicios)\nFuente: GanaderiaContext.tsx (registrosReproductivos)\nVisualización: tabla con ranking y promedios del rodeo'],
  ['RF-10','Valor de Cría',
   'Componente: ValorCria.tsx\nFórmula: VC = h² × (producción animal - promedio grupo)\nParámetros: heredabilidad h² y repetibilidad de AjustesContext.tsx\nEntrada de usuario: datos del animal o selección de id_vaca'],
  ['RF-11','Índices Toros',
   'Componente: ReporteToros.tsx\nÍndice INIA: 0.4×DEP_leche + 0.3×DEP_grasa + 0.2×DEP_proteína + 0.1×DEP_tph\nÍndice Rovere: ponderadores propios del modelo Rovere\nFuente: Tabla toros en Supabase'],
  ['RF-12','Reporte Vacas',
   'Componente: ReporteVacas.tsx\nCruce de datos: registrosBasicos + registrosProductivos + registrosReproductivos + registrosOtros por id_vaca\nExportación: PdfReportButton.tsx'],
  ['RF-13','Comparación Nacional',
   'Componente: ComparacionNacional.tsx\nClasificación: primíparas (lactancia=1) vs. multíparas (lactancia>1)\nAlmacenamiento promedios nacionales: localStorage (clave smga_promedios_nacionales)\nCarga: parser XLSX integrado en el componente\nIndicadores: TrendingUp / TrendingDown de lucide-react'],
  ['RF-14','Tablero General',
   'Componente: TableroFinal.tsx\nFuente: GanaderiaContext.tsx (todos los registros)\nVista: resumen ejecutivo con métricas consolidadas del rodeo'],
  ['RF-15','Exportar PDF',
   'Componente: PdfReportButton.tsx\nBibliotecas: jspdf, jspdf-autotable\nDisparo: botón en cada pantalla de reporte/cálculo\nContenido: título, fecha, tabla de datos, marca SMGA'],
];

coverage.forEach(([id, name, detail]) => {
  if (doc.y > 680) doc.addPage();
  const startY = doc.y;
  doc.rect(50, startY, W, 14).fill(C.navy);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
     .text(`${id}  —  ${name}`, 56, startY + 3, { width: W - 12 });
  doc.y = startY + 15;
  detail.split('\n').forEach(line => {
    if (doc.y > 730) { doc.addPage(); }
    const parts = line.split(':');
    if (parts.length >= 2) {
      const label = parts[0] + ':';
      const val   = parts.slice(1).join(':').trim();
      const ly2 = doc.y;
      doc.fillColor(C.blue).font('Helvetica-Bold').fontSize(8).text(label, 54, ly2, { continued: true, width: 110 });
      doc.fillColor(C.gray).font('Helvetica').fontSize(8).text(' ' + val, { width: W - 70, lineGap: 1 });
    } else {
      doc.fillColor(C.gray).font('Helvetica').fontSize(8).text(line, 54, doc.y, { width: W - 8, lineGap: 1 });
    }
  });
  doc.rect(50, startY, W, doc.y - startY + 2).stroke('#94a3b8');
  doc.y += 5;
});

// ═══════════════════════════════════════════════════════════════════
// SECCIÓN 5: TABLA RNF — COBERTURA
// ═══════════════════════════════════════════════════════════════════
doc.addPage();
heading1('5. COBERTURA DE REQUERIMIENTOS NO FUNCIONALES');

const rnfCoverage = [
  ['RNF-01','Accesibilidad (NIH/NLM)','ALTA',
   'Implementado en: index.css (fuente base 18px, variables CSS de color por categoría), AccessibilityControls.tsx (control de tamaño de fuente en tiempo real), FormLayout.tsx (botón "Volver al Inicio" fijo en bottom-left), todas las páginas (textos de ayuda contextual debajo de cada campo), Index.tsx (tarjetas descriptivas con ícono + título + subtítulo + descripción)'],
  ['RNF-02','Usabilidad y Lenguaje Claro','ALTA',
   'Implementado en: etiquetas de todos los formularios (lenguaje descriptivo, ej. "Ingrese aquí el peso en kilogramos"), mensajes de confirmación con sonner/toast (visibles, centrados), botones siempre con texto + ícono (componente Button de shadcn/ui con className gap-2)'],
  ['RNF-03','Persistencia — Supabase','ALTA',
   'Implementado en: src/integrations/supabase/client.ts (conexión Supabase), GanaderiaContext.tsx (carga inicial desde Supabase al montar, persistencia en cada CRUD), todas las tablas en PostgreSQL gestionado por Supabase'],
  ['RNF-04','Rendimiento — Tiempo Real','ALTA',
   'Implementado en: cálculos derivados en GanaderiaContext.tsx sin llamadas adicionales al servidor, actualización optimista del estado local (setRegistros...()) antes de confirmar con Supabase, React Context evita prop drilling y re-renders innecesarios'],
  ['RNF-05','Compatibilidad Multiplataforma','MEDIA',
   'Implementado en: Vite + React (build transpilado a ES2015+), Tailwind CSS (responsive con breakpoints md: lg:), configuración Vite (vite.config.ts) con soporte de HMR para desarrollo en cualquier entorno Replit'],
  ['RNF-06','Seguridad','MEDIA',
   'Implementado en: supabase anon key solo en el cliente (no es secreta por diseño), comunicación HTTPS con Supabase, no se exponen contraseñas ni tokens de admin. Limitación actual: no hay autenticación de usuarios (acceso abierto, apropiado para red local de establecimiento)'],
  ['RNF-07','Mantenibilidad','BAJA',
   'Implementado en: shared/schema.ts (tipos Drizzle compartidos), separación clara de capas (páginas/componentes/contexto/server), TypeScript estricto en toda la base de código, estructura de directorios estándar React+Vite'],
];

tableRow(['RNF','Nombre','Prioridad','Cobertura / Implementación'], [45, 95, 45, W-185], true, C.navy);
rnfCoverage.forEach(([id, name, pri, cov], i) => {
  if (doc.y > 720) doc.addPage();
  const ry = doc.y;
  const bg = i % 2 === 0 ? '#f8fafc' : '#f1f5f9';
  const priColor = pri === 'ALTA' ? '#dcfce7' : pri === 'MEDIA' ? '#fef9c3' : '#f3e8ff';
  const priText  = pri === 'ALTA' ? C.green : pri === 'MEDIA' ? C.amber : C.purple;

  // Calculate height needed
  const covLines = cov.length / 85 * 9 + 2;
  const rowH = Math.max(covLines * 9, 26);

  doc.rect(50, ry, 45, rowH).fill(bg).stroke('#cbd5e1');
  doc.rect(95, ry, 95, rowH).fill(bg).stroke('#cbd5e1');
  doc.rect(190, ry, 45, rowH).fill(priColor).stroke('#cbd5e1');
  doc.rect(235, ry, W-185, rowH).fill(bg).stroke('#cbd5e1');

  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(7.5).text(id, 52, ry+4, { width: 41, lineBreak: false });
  doc.fillColor(C.gray).font('Helvetica').fontSize(7.5).text(name, 97, ry+4, { width: 91, lineBreak: true });
  doc.fillColor(priText).font('Helvetica-Bold').fontSize(7).text(pri, 192, ry+8, { width: 41, align: 'center', lineBreak: false });
  doc.fillColor(C.gray).font('Helvetica').fontSize(7.5).text(cov, 237, ry+3, { width: W-190, lineGap: 1 });

  doc.y = ry + rowH;
});

// ── Página final: resumen ejecutivo
doc.addPage();
heading1('6. RESUMEN EJECUTIVO DE COBERTURA');

const summary = [
  ['Total RF definidos', '15', '15', '100%'],
  ['RF cubiertos completamente', '15', '15', '100%'],
  ['Total RNF definidos', '7', '7', '100%'],
  ['RNF cubiertos completamente', '7', '7', '100%'],
  ['Casos de Uso especificados', '18', '18', '100%'],
  ['Módulos de pantalla implementados', '14', '14', '100%'],
  ['Tablas en Base de Datos', '5', '5', '100%'],
  ['Exportación PDF disponible', '—', 'Sí (jsPDF)', '✓'],
  ['Carga masiva Excel/CSV', '—', 'Sí (SheetJS)', '✓'],
  ['Comparación con Promedios Nacionales', '—', 'Sí (localStorage)', '✓'],
];

tableRow(['Criterio','Planificado','Implementado','Cobertura'], [200, 80, 120, 70], true, C.navy);
summary.forEach(([c, p, im, cov], i) => {
  const bg = i % 2 === 0 ? '#f0fdf4' : '#f8fafc';
  const covColor = cov === '100%' || cov === '✓' ? C.green : C.amber;
  if (doc.y > 720) doc.addPage();
  const ry = doc.y;
  doc.rect(50, ry, 200, 14).fill(bg).stroke('#cbd5e1');
  doc.rect(250, ry, 80, 14).fill(bg).stroke('#cbd5e1');
  doc.rect(330, ry, 120, 14).fill(bg).stroke('#cbd5e1');
  doc.rect(450, ry, 70, 14).fill(bg).stroke('#cbd5e1');
  doc.fillColor(C.gray).font('Helvetica').fontSize(8.5).text(c, 53, ry+3, { width: 196, lineBreak: false });
  doc.fillColor(C.gray).font('Helvetica').fontSize(8.5).text(p, 252, ry+3, { width: 76, align: 'center', lineBreak: false });
  doc.fillColor(C.gray).font('Helvetica').fontSize(8.5).text(im, 332, ry+3, { width: 116, lineBreak: false });
  doc.fillColor(covColor).font('Helvetica-Bold').fontSize(8.5).text(cov, 452, ry+3, { width: 66, align: 'center', lineBreak: false });
  doc.y = ry + 14;
});

doc.moveDown(0.8);
heading2('Stack Tecnológico del Sistema', C.navy);
const stack = [
  ['Frontend','React 18 + Vite + TypeScript','Interfaz de usuario reactiva con renderizado en cliente'],
  ['Estilos','Tailwind CSS + shadcn/ui','Componentes accesibles y diseño responsive'],
  ['Estado','React Context (GanaderiaContext, AjustesContext)','Gestión global de datos sin Redux'],
  ['Base de Datos','Supabase (PostgreSQL)','Persistencia en la nube con API REST automática'],
  ['PDF','jsPDF + jspdf-autotable','Exportación de reportes en formato PDF'],
  ['Excel','SheetJS (xlsx)','Lectura e importación de archivos Excel y CSV'],
  ['Backend','Express.js (puerto 3001)','Servidor de desarrollo con proxy para Vite'],
  ['Deploy','Replit (Nix + Node.js 20)','Alojamiento y ejecución del entorno de desarrollo'],
  ['Código','github.com/discodurovirtualone-gif/SMGA-tipo-1-Final','Repositorio público en GitHub'],
];
tableRow(['Capa','Tecnología','Rol'], [80, 165, W-245], true, C.blue);
stack.forEach(([l, t, r], i) => tableRow([l, t, r], [80, 165, W-245], false, i%2===0 ? '#f0f9ff' : null));

// Page numbers
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  if (i === 0) continue;
  doc.switchToPage(i);
  doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
     .text(`SMGA — Mapeo de Requerimientos    |    Página ${i} de ${totalPages-1}    |    Junio 2026`,
       50, doc.page.height - 35, { width: W, align: 'center' });
}

doc.end();
console.log('PDF 2 generado:', out);
