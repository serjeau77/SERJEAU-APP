import React, { useState } from 'react';
import {
  Users,
  Calculator,
  FileCheck,
  Car,
  Receipt,
  TrendingUp,
  Brain,
  XCircle,
  CheckCircle2,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Settings,
  DollarSign,
  Target,
  BarChart3,
  ClipboardList,
  Wallet,
  ChevronRight,
  Play,
} from 'lucide-react';
import { FleetVehicle, FlowStage, ServiceRecord } from '../types/serjeau';
import { calculateFinancialMetrics, formatCOP, sumCostBreakdown } from '../data/initialData';

interface InteractiveFlowchartProps {
  services: ServiceRecord[];
  fleet: FleetVehicle[];
  onSelectService: (service: ServiceRecord, initialStage?: FlowStage) => void;
  onStartNewService: (initialStage?: FlowStage) => void;
  onNavigateTab: (tab: 'flowchart' | 'evaluator' | 'services' | 'fleet' | 'kpis') => void;
}

interface StageDefinition {
  stage: FlowStage;
  title: string;
  subtitle: string;
  headerBg: string;
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightSubtitle?: string;
  rightItems: string[];
  diamondQuestion?: string;
  diamondSubtext?: string;
  noActionLabel?: string;
  yesActionLabel?: string;
  controlNumber: number;
  controlName: string;
}

const FLOW_STAGES: StageDefinition[] = [
  {
    stage: 1,
    title: '1. LLEGA UNA OPORTUNIDAD DE SERVICIO',
    subtitle: '(Cliente o propuesta)',
    headerBg: 'bg-blue-700 text-white',
    leftTitle: '1. CAPTACIÓN DE SERVICIO',
    leftItems: [
      'Cliente / contacto',
      'Tipo de servicio (ruta, contrato, evento)',
      'Fecha y horario',
      'Origen – destino',
      'Requerimientos especiales',
    ],
    rightTitle: 'DECISIÓN CLAVE: ¿Vale la pena?',
    rightSubtitle: 'Criterios de evaluación:',
    rightItems: [
      'Rentabilidad',
      'Reputación del cliente',
      'Riesgo de pago',
      'Ajuste a la capacidad operativa',
      'Alineación con la estrategia',
    ],
    diamondQuestion: '¿TENEMOS CAPACIDAD?',
    diamondSubtext: 'Vehículo + conductor + horario disponible',
    noActionLabel: 'Rechazar o reprogramar',
    controlNumber: 1,
    controlName: 'Control Comercial y Operativo',
  },
  {
    stage: 2,
    title: '2. EVALUAR Y COTIZAR',
    subtitle: 'Estimar ingresos y costos',
    headerBg: 'bg-amber-500 text-slate-950',
    leftTitle: '2. ANÁLISIS DEL SERVICIO',
    leftItems: [
      'Ruta y kilometraje',
      'Tiempo estimado',
      'Tipo de vehículo',
      'Número de pasajeros',
      'Riesgos de la ruta',
    ],
    rightTitle: '¿Cuánto produce?',
    rightItems: [
      'Tarifa del servicio',
      'Kilómetros / tiempo',
      'Ingresos esperados',
    ],
    diamondQuestion: '¿DEJA MARGEN SUFICIENTE?',
    noActionLabel: 'Negociar condiciones o rechazar',
    controlNumber: 3,
    controlName: 'Control Financiero de Cotización',
  },
  {
    stage: 3,
    title: '3. APROBACIÓN DEL SERVICIO',
    subtitle: '(Dueño / Gerencia)',
    headerBg: 'bg-purple-800 text-white',
    leftTitle: '3. VALIDAR CLIENTE / CONTRATO',
    leftItems: [
      'Tipo de cliente (empresa/particular)',
      'Forma de pago',
      'Plazos y penalidades',
      'Documentación / legalidad',
    ],
    rightTitle: '¿El pago es seguro?',
    rightItems: [
      'Cliente confiable',
      'Anticipo o garantía',
      'Condiciones de pago claras',
    ],
    diamondQuestion: '¿CONDICIONES DE PAGO SON SEGURAS?',
    noActionLabel: 'Negociar o rechazar',
    controlNumber: 1,
    controlName: 'Validación Contractual y Riesgo',
  },
  {
    stage: 4,
    title: '4. EJECUTAR EL SERVICIO',
    subtitle: '(Operación diaria)',
    headerBg: 'bg-teal-700 text-white',
    leftTitle: '4. ASIGNACIÓN VEHÍCULO / CONDUCTOR',
    leftItems: [
      'Estado del vehículo',
      'Disponibilidad del conductor',
      'Ruta y horarios',
      'Documentación al día',
    ],
    rightTitle: 'Control en ruta',
    rightItems: [
      'Km recorridos',
      'Combustible',
      'Horas trabajadas',
      'Incidentes / novedades',
    ],
    controlNumber: 2,
    controlName: 'Control Operativo y de Vehículo',
  },
  {
    stage: 5,
    title: '5. FACTURAR Y COBRAR',
    subtitle: '(Cierre del servicio)',
    headerBg: 'bg-sky-700 text-white',
    leftTitle: '5. FACTURACIÓN Y RECAUDO',
    leftItems: [
      'Enviar factura / soporte',
      'Confirmar pago',
      'Registrar en el sistema',
    ],
    rightTitle: '¿Se recibió el pago?',
    rightItems: [
      'Tiempo de pago',
      'Consistencia con lo pactado',
      'Sin cartera pendiente',
    ],
    controlNumber: 3,
    controlName: 'Control de Facturación y Cartera',
  },
  {
    stage: 6,
    title: '6. EVALUAR RENTABILIDAD',
    subtitle: '(Análisis financiero)',
    headerBg: 'bg-indigo-800 text-white',
    leftTitle: '6. CIERRE FINANCIERO',
    leftItems: [
      'Ingresos reales',
      'Costos totales',
      'Utilidad neta',
      'Comparar con objetivo',
    ],
    rightTitle: '¿Cumplió el objetivo?',
    rightItems: [
      'Margen de utilidad',
      'Producción del vehículo',
      'Desempeño del conductor',
      'Satisfacción del cliente',
    ],
    diamondQuestion: '¿MANTENER / MODIFICAR / ELIMINAR EL SERVICIO?',
    noActionLabel: 'Ajustar condiciones o finalizar',
    yesActionLabel: 'Continuar y escalar',
    controlNumber: 4,
    controlName: 'Control de Rentabilidad y Vehículo',
  },
  {
    stage: 7,
    title: '7. APRENDIZAJE Y MEJORA CONTINUA',
    subtitle: '(Lecciones para la próxima decisión)',
    headerBg: 'bg-slate-900 text-white',
    leftTitle: 'Documentar y analizar:',
    leftItems: [
      'Qué funcionó',
      'Qué no funcionó',
      'Oportunidades de mejora',
      'Actualizar tarifas y costos',
    ],
    rightTitle: 'Impacto Estratégico',
    rightItems: [
      'Estandarización de rutas rentables',
      'Actualización de matriz de costos/km',
      'Crecimiento sostenible de flota',
    ],
    controlNumber: 5,
    controlName: 'Control Estratégico y Escalamiento',
  },
];

export const InteractiveFlowchart: React.FC<InteractiveFlowchartProps> = ({
  services,
  fleet,
  onSelectService,
  onStartNewService,
  onNavigateTab,
}) => {
  const [selectedStage, setSelectedStage] = useState<FlowStage>(2);
  const [quickSimTarifa, setQuickSimTarifa] = useState<number>(7000000);

  const activeStageDef = FLOW_STAGES.find((s) => s.stage === selectedStage) || FLOW_STAGES[0];
  const stageServices = services.filter((s) => s.currentStage === selectedStage);

  // Aggregate financial stats for right sidebar
  const activeServices = services.filter(
    (s) => s.status !== 'Rechazado Capacidad' && s.status !== 'Renegociacion Margen' && s.status !== 'Renegociacion Pago'
  );
  const totalIngresosMes = activeServices.reduce(
    (acc, s) => acc + (s.ingresosReales > 0 ? s.ingresosReales : s.tarifaServicio),
    0
  );
  const totalCostosMes = activeServices.reduce((acc, s) => {
    const c = sumCostBreakdown(s.costosReales) > 0 ? s.costosReales : s.costosEstimados;
    return acc + sumCostBreakdown(c);
  }, 0);
  const utilidadNetaRealMes = totalIngresosMes - totalCostosMes;
  const margenPromedioPct = totalIngresosMes > 0 ? (utilidadNetaRealMes / totalIngresosMes) * 100 : 0;
  const totalKmMes = activeServices.reduce(
    (acc, s) => acc + (s.kmRecorridosReales > 0 ? s.kmRecorridosReales : s.kilometrajeTotal),
    0
  );

  const stageIcon = (stage: FlowStage) => {
    switch (stage) {
      case 1:
        return <Users className="w-5 h-5 shrink-0" />;
      case 2:
        return <Calculator className="w-5 h-5 shrink-0" />;
      case 3:
        return <FileCheck className="w-5 h-5 shrink-0" />;
      case 4:
        return <Car className="w-5 h-5 shrink-0" />;
      case 5:
        return <Receipt className="w-5 h-5 shrink-0" />;
      case 6:
        return <TrendingUp className="w-5 h-5 shrink-0" />;
      case 7:
        return <Brain className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Header faithful to the SERJEAU Infographic */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
            SERJEAU Transporte Especial · Más que un viaje, es confianza
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            FLUJOGRAMA DE TOMA DE DECISIONES
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Cada decisión cuenta. El objetivo es maximizar la rentabilidad, garantizar la operación y hacer crecer el negocio. Haz clic en cualquier etapa o rombo de decisión para inspeccionar criterios o evaluar un servicio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onStartNewService(1)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Evaluar Oportunidad Paso a Paso
          </button>
          <button
            onClick={() => onNavigateTab('kpis')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ver Indicadores Clave (KPI)
          </button>
        </div>
      </div>

      {/* Main Layout: Left/Center Interactive Flowchart (8 cols) + Right Managerial Controls & KPIs Sidebar (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLUMNS: THE COMPLETE 7-STEP FLOWCHART */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          {/* Interactive Stage Inspector Bar */}
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Etapa seleccionada en el flujograma · {activeStageDef.controlName}
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {activeStageDef.title} <span className="font-normal text-slate-600">{activeStageDef.subtitle}</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {stageServices.length === 0
                  ? 'No hay servicios detenidos en esta etapa actualmente.'
                  : `${stageServices.length} expediente(s) ubicado(s) en esta etapa: ${stageServices.map((s) => s.clienteNombre).join(' · ')}`}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {stageServices.length > 0 && (
                <button
                  onClick={() => onSelectService(stageServices[0], selectedStage)}
                  className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Abrir Expediente ({stageServices[0].code})
                </button>
              )}
              <button
                onClick={() => onStartNewService(selectedStage)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Simular en Paso {selectedStage}
              </button>
            </div>
          </div>

          {/* INICIO NODE */}
          <div className="flex flex-col items-center">
            <div className="px-8 py-2 bg-slate-900 text-white font-extrabold text-sm tracking-widest rounded-full shadow-xs">
              INICIO
            </div>
            <ArrowDown className="w-5 h-5 text-slate-400 my-1.5" />
          </div>

          {/* 7 STAGES OF THE FLOWCHART */}
          <div className="space-y-4">
            {FLOW_STAGES.map((item) => {
              const isSelected = selectedStage === item.stage;
              const countInStage = services.filter((s) => s.currentStage === item.stage).length;

              return (
                <div key={item.stage} className="space-y-3">
                  {/* 3-Column Row: Left Input Box | Center Process Node | Right Criteria Box */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                    {/* Left Detail Box */}
                    <div
                      onClick={() => setSelectedStage(item.stage)}
                      className={`lg:col-span-4 rounded-lg border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/90'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 pb-1.5 mb-2 border-b border-slate-200 flex items-center justify-between gap-2">
                          <span>{item.leftTitle}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:inline shrink-0" />
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {item.leftItems.map((li, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-slate-400 select-none">•</span>
                              <span>{li}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Center Main Flowchart Step Node */}
                    <div className="lg:col-span-4 flex flex-col justify-center">
                      <button
                        type="button"
                        onClick={() => setSelectedStage(item.stage)}
                        className={`w-full rounded-xl p-4 text-left transition-all cursor-pointer border-2 ${
                          item.headerBg
                        } ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/40'
                            : 'border-transparent hover:opacity-95'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-black/15 shrink-0 mt-0.5">
                            {stageIcon(item.stage)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-extrabold tracking-tight leading-snug">
                              {item.title}
                            </div>
                            <div className="text-[11px] opacity-90 mt-0.5">
                              {item.subtitle}
                            </div>
                            <div className="mt-2 pt-2 border-t border-current/15 flex items-center justify-between text-[11px] font-mono tabular-nums">
                              <span>Paso {item.stage} de 7</span>
                              <span>{countInStage} servicio(s)</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* STEP 2 SPECIAL SUB-BOX: CALCULAR COSTO TOTAL (Directly from the flowchart) */}
                      {item.stage === 2 && (
                        <div className="mt-2.5 flex flex-col items-center">
                          <ArrowDown className="w-4 h-4 text-slate-400 mb-1.5" />
                          <div
                            onClick={() => setSelectedStage(2)}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 cursor-pointer hover:border-slate-400 transition-colors"
                          >
                            <div className="text-xs font-extrabold text-slate-900 text-center pb-1.5 mb-2 border-b border-slate-200 flex items-center justify-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-slate-700" />
                              <span>CALCULAR COSTO TOTAL</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-700">
                              <div>• Conductor (25%)</div>
                              <div>• Mantenimiento</div>
                              <div>• Combustible</div>
                              <div>• Impuestos</div>
                              <div>• Peajes</div>
                              <div>• Cuota / financiación</div>
                              <div>• Seguridad social</div>
                              <div>• Otros (lavado, imprevistos)</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Criteria / Verification Box */}
                    <div
                      onClick={() => setSelectedStage(item.stage)}
                      className={`lg:col-span-4 rounded-lg border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/90'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-200 flex items-center justify-between gap-2">
                          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 hidden lg:inline shrink-0" />
                          <span className="flex-1">{item.rightTitle}</span>
                        </div>
                        {item.rightSubtitle && (
                          <div className="text-[11px] font-semibold text-slate-700 mb-1">
                            {item.rightSubtitle}
                          </div>
                        )}
                        <ul className="space-y-1 text-xs text-slate-700">
                          {item.rightItems.map((ri, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-slate-400 select-none">•</span>
                              <span>{ri}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* DECISION DIAMOND (ROMBO) IF PRESENT FOR THIS STAGE */}
                  {item.diamondQuestion && (
                    <div className="py-1">
                      <div className="flex justify-center">
                        <ArrowDown className="w-4 h-4 text-slate-400 mb-1" />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                        {/* NO Branch (Left Red Rejection / Negotiation Box) */}
                        <div className="lg:col-span-4 flex items-center justify-end gap-2 order-2 lg:order-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStage(item.stage);
                              onStartNewService(item.stage);
                            }}
                            className="w-full lg:w-auto flex-1 rounded-lg border border-red-300 bg-red-50/80 hover:bg-red-100/80 px-3 py-2.5 text-left transition-colors cursor-pointer flex items-center gap-2.5"
                          >
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <div>
                              <div className="text-[10px] font-extrabold text-red-700 uppercase">
                                Decisión: NO
                              </div>
                              <div className="text-xs font-bold text-red-900 leading-tight">
                                {item.noActionLabel}
                              </div>
                            </div>
                          </button>
                          <div className="hidden lg:flex items-center gap-1 text-xs font-extrabold text-red-600 shrink-0">
                            <span>NO</span>
                            <ArrowLeft className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Center Decision Diamond (Rombo) */}
                        <div className="lg:col-span-4 flex flex-col items-center order-1 lg:order-2">
                          <div
                            onClick={() => setSelectedStage(item.stage)}
                            className={`w-full rounded-xl border-2 px-4 py-3 text-center cursor-pointer transition-all ${
                              item.stage === 6
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-emerald-50/90 border-emerald-600 text-slate-900 hover:bg-emerald-100/70'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                              Rombo de Decisión
                            </div>
                            <div className="text-xs font-extrabold tracking-tight mt-0.5">
                              {item.diamondQuestion}
                            </div>
                            {item.diamondSubtext && (
                              <div className="text-[11px] opacity-85 mt-0.5">
                                {item.diamondSubtext}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Branch (SÍ Continue & Scale for Stage 6, or SÍ downward label) */}
                        <div className="lg:col-span-4 order-3">
                          {item.yesActionLabel ? (
                            <div className="flex items-center gap-2">
                              <div className="hidden lg:flex items-center gap-1 text-xs font-extrabold text-emerald-700 shrink-0">
                                <ArrowRight className="w-4 h-4" />
                                <span>SÍ</span>
                              </div>
                              <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50/80 px-3 py-2.5 flex items-center gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="text-[10px] font-extrabold text-emerald-700 uppercase">
                                    Decisión: SÍ
                                  </div>
                                  <div className="text-xs font-bold text-emerald-950 leading-tight">
                                    {item.yesActionLabel}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="hidden lg:flex items-center text-xs text-emerald-700 font-semibold pl-2">
                              SÍ → Avanza al Paso {item.stage + 1}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Downward Connector between steps */}
                  {item.stage < 7 && (
                    <div className="flex flex-col items-center py-0.5">
                      <span className="text-[11px] font-extrabold text-emerald-700">SÍ</span>
                      <ArrowDown className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* FIN NODE */}
          <div className="flex flex-col items-center mt-3">
            <ArrowDown className="w-5 h-5 text-slate-400 mb-1.5" />
            <div className="px-9 py-2 bg-slate-900 text-white font-extrabold text-sm tracking-widest rounded-full">
              FIN
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLUMNS: LOS 5 CONTROLES GERENCIALES, KPIS, UNIDAD DE ANÁLISIS, ESTRUCTURA DE COSTOS, OBJETIVO */}
        <div className="xl:col-span-4 space-y-5">
          {/* 1. LOS 5 CONTROLES GERENCIALES */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2.5">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-xs font-extrabold tracking-wider uppercase">
                LOS 5 CONTROLES GERENCIALES
              </h2>
            </div>
            <div className="p-3.5 space-y-2.5">
              {[
                {
                  num: 1,
                  title: 'COMERCIAL',
                  question: '¿Vale la pena aceptar este cliente/contrato?',
                  bg: 'bg-blue-50/70 border-blue-200',
                  numBg: 'bg-blue-700 text-white',
                  stage: 1 as FlowStage,
                },
                {
                  num: 2,
                  title: 'OPERATIVO',
                  question: '¿Podemos prestar el servicio sin afectar otras rutas?',
                  bg: 'bg-emerald-50/70 border-emerald-200',
                  numBg: 'bg-emerald-700 text-white',
                  stage: 4 as FlowStage,
                },
                {
                  num: 3,
                  title: 'FINANCIERO',
                  question: '¿Cuánto dinero realmente deja?',
                  bg: 'bg-amber-50/80 border-amber-200',
                  numBg: 'bg-amber-500 text-slate-950',
                  stage: 2 as FlowStage,
                },
                {
                  num: 4,
                  title: 'VEHÍCULO',
                  question: '¿El carro está produciendo lo que debería?',
                  bg: 'bg-purple-50/70 border-purple-200',
                  numBg: 'bg-purple-800 text-white',
                  stage: 6 as FlowStage,
                },
                {
                  num: 5,
                  title: 'ESTRATÉGICO',
                  question: '¿Este servicio ayuda a crecer y cumplir la meta?',
                  bg: 'bg-teal-50/70 border-teal-200',
                  numBg: 'bg-teal-700 text-white',
                  stage: 7 as FlowStage,
                },
              ].map((ctrl) => (
                <button
                  key={ctrl.num}
                  type="button"
                  onClick={() => setSelectedStage(ctrl.stage)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${ctrl.bg} hover:opacity-90`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg font-mono font-extrabold text-sm flex items-center justify-center shrink-0 ${ctrl.numBg}`}
                  >
                    {ctrl.num}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-slate-900 tracking-wide">
                      {ctrl.title}
                    </div>
                    <div className="text-xs text-slate-700 leading-snug">
                      {ctrl.question}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. INDICADORES CLAVE (KPI) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                <h2 className="text-xs font-extrabold tracking-wider uppercase">
                  INDICADORES CLAVE (KPI)
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('kpis')}
                className="text-[11px] text-amber-300 hover:underline font-medium cursor-pointer"
              >
                Abrir tablero →
              </button>
            </div>
            <div className="p-4 divide-y divide-slate-100 text-xs">
              {[
                {
                  label: 'Rentabilidad por servicio (%)',
                  val: `${margenPromedioPct.toFixed(1)}%`,
                },
                {
                  label: 'Producción por vehículo (mensual)',
                  val: formatCOP(totalIngresosMes / fleet.length),
                },
                {
                  label: 'Ingresos por km',
                  val: `${formatCOP(totalKmMes > 0 ? totalIngresosMes / totalKmMes : 0)} / km`,
                },
                {
                  label: 'Costo por km',
                  val: `${formatCOP(totalKmMes > 0 ? totalCostosMes / totalKmMes : 0)} / km`,
                },
                {
                  label: 'Utilización del vehículo (%)',
                  val: `${(
                    fleet.reduce((a, v) => a + v.utilizacionPct, 0) / fleet.length
                  ).toFixed(1)}%`,
                },
                {
                  label: 'Cumplimiento de rutas (%)',
                  val: `${(
                    fleet.reduce((a, v) => a + v.cumplimientoRutasPct, 0) / fleet.length
                  ).toFixed(1)}%`,
                },
                {
                  label: 'Tiempo de pago de clientes (días)',
                  val: '11.5 días',
                },
                {
                  label: 'Satisfacción del cliente (NPS)',
                  val: '95.8 / 100',
                },
                {
                  label: 'Rotación / ausentismo del conductor',
                  val: '0.6%',
                },
              ].map((kpi, i) => (
                <div key={i} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-700">• {kpi.label}</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                    {kpi.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. UNIDAD DE ANÁLISIS */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-xs font-extrabold tracking-wider uppercase">
                UNIDAD DE ANÁLISIS
              </h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-600 mb-3">
                Trazabilidad operativa y contable en cada eslabón del negocio:
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900">
                {['Servicio', 'Vehículo', 'Conductor', 'Día', 'Semana', 'Mes'].map(
                  (unit, idx, arr) => (
                    <React.Fragment key={unit}>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('fleet')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        {unit}
                      </button>
                      {idx < arr.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 4. ESTRUCTURA DE COSTOS (referencia interactiva) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                <h2 className="text-xs font-extrabold tracking-wider uppercase">
                  ESTRUCTURA DE COSTOS (referencia)
                </h2>
              </div>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <label htmlFor="sim-tarifa" className="font-bold text-slate-900">
                  Ingresos (Simulador rápido COP):
                </label>
                <input
                  id="sim-tarifa"
                  type="number"
                  step={100000}
                  value={quickSimTarifa}
                  onChange={(e) => setQuickSimTarifa(Math.max(0, Number(e.target.value)))}
                  className="w-32 px-2 py-1 text-right font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded tabular-nums"
                />
              </div>

              {(() => {
                const cond = Math.round(quickSimTarifa * 0.25);
                const comb = Math.round(quickSimTarifa * 0.17);
                const peajes = Math.round(quickSimTarifa * 0.04);
                const segSoc = Math.round(quickSimTarifa * 0.045);
                const mant = Math.round(quickSimTarifa * 0.075);
                const imp = Math.round(quickSimTarifa * 0.035);
                const cuota = Math.round(quickSimTarifa * 0.11);
                const utilidad =
                  quickSimTarifa - (cond + comb + peajes + segSoc + mant + imp + cuota);
                const margen = quickSimTarifa > 0 ? (utilidad / quickSimTarifa) * 100 : 0;

                return (
                  <>
                    <div className="space-y-1 text-slate-700 font-mono tabular-nums">
                      <div className="flex justify-between">
                        <span>– 25% Conductor</span>
                        <span>{formatCOP(cond)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Combustible (~17%)</span>
                        <span>{formatCOP(comb)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Peajes (~4%)</span>
                        <span>{formatCOP(peajes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Seguridad social (~4.5%)</span>
                        <span>{formatCOP(segSoc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Mantenimiento (~7.5%)</span>
                        <span>{formatCOP(mant)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Impuestos (~3.5%)</span>
                        <span>{formatCOP(imp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>– Cuota / financiación (~11%)</span>
                        <span>{formatCOP(cuota)}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t-2 border-slate-900 flex items-center justify-between font-mono font-extrabold text-sm text-emerald-800 tabular-nums">
                      <span>= Utilidad real ({margen.toFixed(1)}%)</span>
                      <span>{formatCOP(utilidad)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* 5. OBJETIVO DEL NEGOCIO */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-xs font-extrabold tracking-wider uppercase">
                OBJETIVO DEL NEGOCIO
              </h2>
            </div>
            <div className="p-4 space-y-2 text-xs text-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">✓ Logan: $7.000.000 / mes (producción)</span>
                <span className="font-mono text-emerald-700 font-bold tabular-nums">Meta Base</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">✓ 5 Logans + 2 Dusters + 1 Van</span>
                <span className="font-mono text-slate-600 tabular-nums">8 Vehículos</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">✓ 20M netos (expansión)</span>
                <span className="font-mono text-emerald-700 font-bold tabular-nums">
                  Actual: {formatCOP(utilidadNetaRealMes)}
                </span>
              </div>
              <div className="font-semibold">✓ Crecimiento sostenible</div>
              <div className="font-semibold">✓ Generación de patrimonio</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
