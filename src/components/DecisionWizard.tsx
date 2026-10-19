import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  ClientType,
  FleetVehicle,
  FlowStage,
  PaymentMethod,
  RetentionAction,
  RouteRiskLevel,
  ServiceRecord,
  ServiceStatus,
  ServiceType,
  VehicleType,
} from '../types/serjeau';
import {
  calculateFinancialMetrics,
  estimateDefaultCosts,
  formatCOP,
  sumCostBreakdown,
} from '../data/initialData';

interface DecisionWizardProps {
  service: ServiceRecord;
  fleet: FleetVehicle[];
  initialStage?: FlowStage;
  onSaveService: (updated: ServiceRecord) => void;
  onCancel: () => void;
}

const STAGE_LABELS: { stage: FlowStage; short: string; full: string }[] = [
  { stage: 1, short: '1. Captación', full: '1. Captación y Capacidad' },
  { stage: 2, short: '2. Cotizar', full: '2. Evaluar y Cotizar Costos' },
  { stage: 3, short: '3. Aprobación', full: '3. Aprobación Gerencial' },
  { stage: 4, short: '4. Ejecución', full: '4. Ejecutar y Control Ruta' },
  { stage: 5, short: '5. Facturar', full: '5. Facturación y Recaudo' },
  { stage: 6, short: '6. Rentabilidad', full: '6. Evaluar Rentabilidad' },
  { stage: 7, short: '7. Aprendizaje', full: '7. Aprendizaje y Mejora' },
];

export const DecisionWizard: React.FC<DecisionWizardProps> = ({
  service,
  fleet,
  initialStage,
  onSaveService,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ServiceRecord>({ ...service });
  const [activeStep, setActiveStep] = useState<FlowStage>(initialStage || service.currentStage || 1);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Financial calculations for Step 2 (Quoted) and Step 6 (Real)
  const quotedMetrics = calculateFinancialMetrics(
    formData.tarifaServicio,
    formData.costosEstimados,
    formData.kilometrajeTotal
  );

  const realMetrics = calculateFinancialMetrics(
    formData.ingresosReales || formData.tarifaServicio,
    sumCostBreakdown(formData.costosReales) > 0 ? formData.costosReales : formData.costosEstimados,
    formData.kmRecorridosReales || formData.kilometrajeTotal
  );

  // Calculate minimum required tariff to hit target margin in Step 2
  const nonDriverCosts =
    formData.costosEstimados.combustible +
    formData.costosEstimados.peajes +
    formData.costosEstimados.seguridadSocial +
    formData.costosEstimados.mantenimiento +
    formData.costosEstimados.impuestos +
    formData.costosEstimados.cuotaFinanciacion +
    formData.costosEstimados.otros;

  const driverFraction = (formData.costosEstimados.conductorPct || 25) / 100;
  const targetMarginFraction = (formData.margenMinimoEsperadoPct || 24) / 100;
  const denominator = Math.max(0.05, 1 - driverFraction - targetMarginFraction);
  const tarifaMinimaSugerida = Math.ceil(nonDriverCosts / denominator / 10000) * 10000;

  // Step 1 Criteria Score (out of 25)
  const puntajeValeLaPena =
    formData.criterioRentabilidad +
    formData.criterioReputacionCliente +
    formData.criterioRiesgoPago +
    formData.criterioAjusteCapacidad +
    formData.criterioAlineacionEstrategia;

  const handleTarifaChange = (newTarifa: number) => {
    const newConductorCost = Math.round((newTarifa * formData.costosEstimados.conductorPct) / 100);
    const updatedCostos = {
      ...formData.costosEstimados,
      conductorCost: newConductorCost,
    };
    const newMetrics = calculateFinancialMetrics(newTarifa, updatedCostos, formData.kilometrajeTotal);
    const suficiente = newMetrics.margenPct >= formData.margenMinimoEsperadoPct;

    setFormData((prev) => ({
      ...prev,
      tarifaServicio: newTarifa,
      costosEstimados: updatedCostos,
      dejaMargenSuficiente: suficiente,
      controlesGerenciales: {
        ...prev.controlesGerenciales,
        financiero: suficiente,
      },
    }));
  };

  const handleAutoEstimateCosts = () => {
    const auto = estimateDefaultCosts(
      formData.tarifaServicio,
      formData.kilometrajeTotal,
      formData.tipoVehiculoRequerido,
      formData.costosEstimados.conductorPct || 25
    );
    const newMetrics = calculateFinancialMetrics(
      formData.tarifaServicio,
      auto,
      formData.kilometrajeTotal
    );
    const suficiente = newMetrics.margenPct >= formData.margenMinimoEsperadoPct;

    setFormData((prev) => ({
      ...prev,
      costosEstimados: auto,
      dejaMargenSuficiente: suficiente,
    }));
  };

  const updateCostField = (field: keyof ServiceRecord['costosEstimados'], value: number) => {
    const updatedCostos = {
      ...formData.costosEstimados,
      [field]: value,
    };
    if (field === 'conductorPct') {
      updatedCostos.conductorCost = Math.round((formData.tarifaServicio * value) / 100);
    }
    const newMetrics = calculateFinancialMetrics(
      formData.tarifaServicio,
      updatedCostos,
      formData.kilometrajeTotal
    );
    const suficiente = newMetrics.margenPct >= formData.margenMinimoEsperadoPct;

    setFormData((prev) => ({
      ...prev,
      costosEstimados: updatedCostos,
      dejaMargenSuficiente: suficiente,
    }));
  };

  const deriveStatus = (record: ServiceRecord, stage: FlowStage): ServiceStatus => {
    if (!record.tieneCapacidad) return 'Rechazado Capacidad';
    if (stage >= 2 && !record.dejaMargenSuficiente) return 'Renegociacion Margen';
    if (stage >= 3 && !record.condicionesPagoSeguras) return 'Renegociacion Pago';
    if (stage === 3 && record.condicionesPagoSeguras) return 'Aprobado';
    if (stage === 4) return 'En Ejecucion';
    if (stage === 5) return 'Facturado / Por Cobrar';
    if (stage >= 6) {
      return record.decisionContinuidad === 'Continuar y escalar'
        ? 'Cerrado / Escalado'
        : 'Ajustar o Finalizar';
    }
    return 'En Evaluacion';
  };

  const handleSave = (targetStage?: FlowStage) => {
    const nextStage = targetStage || activeStep;
    const updatedRecord: ServiceRecord = {
      ...formData,
      currentStage: nextStage,
      status: deriveStatus(formData, nextStage),
    };
    setFormData(updatedRecord);
    onSaveService(updatedRecord);
    setSavedBanner(`Expediente ${updatedRecord.code} guardado y actualizado en Paso ${nextStage}.`);
    setTimeout(() => setSavedBanner(null), 3500);
  };

  const copyQuotedToReal = () => {
    setFormData((prev) => ({
      ...prev,
      ingresosReales: prev.tarifaServicio,
      kmRecorridosReales: prev.kilometrajeTotal,
      combustibleReal: prev.costosEstimados.combustible,
      horasTrabajadasReales: prev.tiempoEstimadoHoras,
      costosReales: { ...prev.costosEstimados },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header with Service Summary & Save Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-mono font-bold text-slate-800">{formData.code}</span>
            <span>·</span>
            <span>{formData.tipoServicio}</span>
            <span>·</span>
            <span>Estado actual: {formData.status}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            {formData.clienteNombre || 'Nueva Oportunidad de Servicio'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Volver al listado
          </button>
          <button
            type="button"
            onClick={() => handleSave(activeStep)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Expediente
          </button>
        </div>
      </div>

      {savedBanner && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>✓ {savedBanner}</span>
          <button
            type="button"
            onClick={() => setSavedBanner(null)}
            className="text-emerald-200 hover:text-white underline ml-4 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 7-Step Interactive Stepper Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {STAGE_LABELS.map((st) => {
            const active = activeStep === st.stage;
            const passed = formData.currentStage > st.stage;
            return (
              <button
                key={st.stage}
                type="button"
                onClick={() => setActiveStep(st.stage)}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : passed
                    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{st.short}</span>
                {passed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP CONTENT + LIVE FINANCIAL & CONTROL SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLS: ACTIVE STEP FORM & ROMBO DECISION GATE */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6">
          {/* ==========================================
              PASO 1: CAPTACIÓN DE SERVICIO + ROMBO 1
          ========================================== */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Paso 1 del Flujograma · Control 1 (Comercial) y Control 2 (Operativo)
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  1. Llega una Oportunidad de Servicio (Captación y Evaluación Inicial)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cliente / Empresa Solicitante
                  </label>
                  <input
                    type="text"
                    value={formData.clienteNombre}
                    onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
                    placeholder="Ej. Grupo Industrial Andino S.A.S."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Persona de Contacto y Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.contactoNombre}
                    onChange={(e) => setFormData({ ...formData, contactoNombre: e.target.value })}
                    placeholder="Nombre del encargado de transporte"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Servicio (Ruta, Contrato, Evento)
                  </label>
                  <select
                    value={formData.tipoServicio}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoServicio: e.target.value as ServiceType })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Contrato Mensual">Contrato Mensual</option>
                    <option value="Ruta Empresarial">Ruta Empresarial</option>
                    <option value="Evento Especial">Evento Especial</option>
                    <option value="Traslado Aeropuerto / VIP">Traslado Aeropuerto / VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha y Horario Requerido
                  </label>
                  <input
                    type="text"
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    placeholder="Ej. Lunes a Sábado 06:00 AM - 05:30 PM"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Origen
                  </label>
                  <input
                    type="text"
                    value={formData.origen}
                    onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destino
                  </label>
                  <input
                    type="text"
                    value={formData.destino}
                    onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Requerimientos Especiales
                  </label>
                  <input
                    type="text"
                    value={formData.requerimientosEspeciales}
                    onChange={(e) =>
                      setFormData({ ...formData, requerimientosEspeciales: e.target.value })
                    }
                    placeholder="FUEC, protocolo de ingreso, aire acondicionado, bilingüe, etc."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* DECISIÓN CLAVE: ¿Vale la pena? Criterios de evaluación */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      DECISIÓN CLAVE: ¿Vale la pena? (Criterios de evaluación 1 a 5)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Evalúa si este cliente y propuesta se alinean con los criterios comerciales de SERJEAU.
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-xs text-slate-500 block">Puntaje Comercial</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {puntajeValeLaPena} / 25
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                  {[
                    { key: 'criterioRentabilidad', label: 'Rentabilidad' },
                    { key: 'criterioReputacionCliente', label: 'Reputación cliente' },
                    { key: 'criterioRiesgoPago', label: 'Bajo riesgo pago' },
                    { key: 'criterioAjusteCapacidad', label: 'Ajuste capacidad' },
                    { key: 'criterioAlineacionEstrategia', label: 'Alineación estrategia' },
                  ].map((crit) => {
                    const val = formData[crit.key as keyof ServiceRecord] as number;
                    return (
                      <div key={crit.key} className="bg-white border border-slate-200 rounded-lg p-2.5">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                          {crit.label}
                        </label>
                        <select
                          value={val}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [crit.key]: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded bg-slate-50"
                        >
                          <option value={5}>5 - Excelente</option>
                          <option value={4}>4 - Bueno</option>
                          <option value={3}>3 - Aceptable</option>
                          <option value={2}>2 - Riesgoso</option>
                          <option value={1}>1 - Deficiente</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ROMBO DE DECISIÓN 1: ¿TENEMOS CAPACIDAD? */}
              <div className="border-2 border-emerald-600 bg-emerald-50/50 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Rombo de Decisión 1
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      ¿TENEMOS CAPACIDAD? (Vehículo + conductor + horario disponible)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          tieneCapacidad: true,
                          status: 'En Evaluacion',
                          controlesGerenciales: {
                            ...formData.controlesGerenciales,
                            operativo: true,
                          },
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                        formData.tieneCapacidad
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      SÍ — Tenemos Capacidad
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          tieneCapacidad: false,
                          status: 'Rechazado Capacidad',
                          controlesGerenciales: {
                            ...formData.controlesGerenciales,
                            operativo: false,
                          },
                        })
                      }
                      className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                        !formData.tieneCapacidad
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      NO — Rechazar o Reprogramar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Justificación de capacidad operativa o reprogramación:
                  </label>
                  <input
                    type="text"
                    value={formData.motivoCapacidad}
                    onChange={(e) => setFormData({ ...formData, motivoCapacidad: e.target.value })}
                    placeholder="Ej. Logan #03 disponible con conductor Héctor Gómez sin afectar otras rutas."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                {!formData.tieneCapacidad && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2.5 text-xs text-red-900 font-semibold">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      ACCIÓN DEL FLUJOGRAMA (NO): Rechazar el servicio o proponer reprogramación de horario al cliente para no incumplir rutas actuales.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 2: EVALUAR Y COTIZAR + COSTO TOTAL + ROMBO 2
          ========================================== */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Paso 2 del Flujograma · Control 3 (Financiero: ¿Cuánto dinero realmente deja?)
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    2. Evaluar y Cotizar (Estimar Ingresos y Calcular Costo Total)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleAutoEstimateCosts}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recalcular Costos por Km y Tarifa
                </button>
              </div>

              {/* 2. ANÁLISIS DEL SERVICIO & ¿CUÁNTO PRODUCE? */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Vehículo
                  </label>
                  <select
                    value={formData.tipoVehiculoRequerido}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoVehiculoRequerido: e.target.value as VehicleType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="Logan">Renault Logan (Meta: $7.000.000/mes)</option>
                    <option value="Duster">Renault Duster (Meta: $8.500.000/mes)</option>
                    <option value="Van">Van Ejecutiva 15 pax (Meta: $13.000.000/mes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ruta y Kilometraje Total (km)
                  </label>
                  <input
                    type="number"
                    value={formData.kilometrajeTotal}
                    onChange={(e) =>
                      setFormData({ ...formData, kilometrajeTotal: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiempo Estimado (Horas)
                  </label>
                  <input
                    type="number"
                    value={formData.tiempoEstimadoHoras}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tiempoEstimadoHoras: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Pasajeros
                  </label>
                  <input
                    type="number"
                    value={formData.numeroPasajeros}
                    onChange={(e) =>
                      setFormData({ ...formData, numeroPasajeros: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Riesgos de la Ruta
                  </label>
                  <select
                    value={formData.riesgoRuta}
                    onChange={(e) =>
                      setFormData({ ...formData, riesgoRuta: e.target.value as RouteRiskLevel })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Bajo">Bajo (Pavimentado / Urbano)</option>
                    <option value="Medio">Medio (Intermunicipal / Tráfico pesado)</option>
                    <option value="Alto">Alto (Trocha / Montaña / Horario nocturno)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-amber-900 mb-1">
                    Tarifa del Servicio / Ingresos (COP)
                  </label>
                  <input
                    type="number"
                    step={50000}
                    value={formData.tarifaServicio}
                    onChange={(e) => handleTarifaChange(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-mono font-extrabold bg-amber-50 border-2 border-amber-500 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {/* CALCULAR COSTO TOTAL (Los 8 rubros exactos del flujograma) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      CALCULAR COSTO TOTAL (Estructura de Costos SERJEAU)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Ingresos – (25% Conductor + Combustible + Peajes + Seg. Social + Mantenimiento + Impuestos + Cuota + Otros) = Utilidad Real
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-[11px] text-slate-500 block">Costo Total Estimado</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCOP(quotedMetrics.costoTotal)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      1. Conductor ({formData.costosEstimados.conductorPct}% de tarifa)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={formData.costosEstimados.conductorCost}
                      onChange={(e) => updateCostField('conductorCost', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      2. Combustible (COP)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={formData.costosEstimados.combustible}
                      onChange={(e) => updateCostField('combustible', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      3. Peajes (COP)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={formData.costosEstimados.peajes}
                      onChange={(e) => updateCostField('peajes', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      4. Seguridad Social (COP)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={formData.costosEstimados.seguridadSocial}
                      onChange={(e) => updateCostField('seguridadSocial', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      5. Mantenimiento (COP)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={formData.costosEstimados.mantenimiento}
                      onChange={(e) => updateCostField('mantenimiento', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      6. Impuestos (COP)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={formData.costosEstimados.impuestos}
                      onChange={(e) => updateCostField('impuestos', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      7. Cuota / Financiación (COP)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={formData.costosEstimados.cuotaFinanciacion}
                      onChange={(e) => updateCostField('cuotaFinanciacion', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      8. Otros (lavado, imprevistos)
                    </label>
                    <input
                      type="number"
                      step={5000}
                      value={formData.costosEstimados.otros}
                      onChange={(e) => updateCostField('otros', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* ROMBO DE DECISIÓN 2: ¿DEJA MARGEN SUFICIENTE? */}
              <div
                className={`border-2 rounded-xl p-5 space-y-4 ${
                  quotedMetrics.margenPct >= formData.margenMinimoEsperadoPct
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-red-600 bg-red-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      Rombo de Decisión 2
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      ¿DEJA MARGEN SUFICIENTE? (Margen actual: {quotedMetrics.margenPct.toFixed(1)}% vs Meta mínima: {formData.margenMinimoEsperadoPct}%)
                    </h3>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Utilidad Real Estimada: <strong className="font-mono">{formatCOP(quotedMetrics.utilidadReal)}</strong> · Ingreso/km: <strong className="font-mono">{formatCOP(quotedMetrics.ingresoPorKm)}</strong> · Costo/km: <strong className="font-mono">{formatCOP(quotedMetrics.costoPorKm)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          dejaMargenSuficiente: true,
                          status: 'En Evaluacion',
                        })
                      }
                      className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
                        formData.dejaMargenSuficiente
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      SÍ — Margen Suficiente
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          dejaMargenSuficiente: false,
                          status: 'Renegociacion Margen',
                        })
                      }
                      className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
                        !formData.dejaMargenSuficiente
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      NO — Negociar o Rechazar
                    </button>
                  </div>
                </div>

                {quotedMetrics.margenPct < formData.margenMinimoEsperadoPct && (
                  <div className="p-3.5 bg-white border border-red-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-red-900">
                      <span className="font-extrabold block">
                        ALERTA FINANCIERA (NO → Negociar condiciones o rechazar):
                      </span>
                      Para cubrir todos los costos y lograr el margen meta del{' '}
                      <strong>{formData.margenMinimoEsperadoPct}%</strong> (pagando el 25% al conductor), la tarifa mínima debe ser de{' '}
                      <strong className="font-mono underline">{formatCOP(tarifaMinimaSugerida)}</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTarifaChange(tarifaMinimaSugerida)}
                      className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                    >
                      Aplicar Tarifa Mínima ({formatCOP(tarifaMinimaSugerida)})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 3: APROBACIÓN DEL SERVICIO + ROMBO 3
          ========================================== */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-800">
                  Paso 3 del Flujograma · Dueño / Gerencia
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  3. Aprobación del Servicio (Validar Cliente, Contrato y Seguridad de Pago)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Cliente (Empresa / Particular)
                  </label>
                  <select
                    value={formData.tipoCliente}
                    onChange={(e) =>
                      setFormData({ ...formData, tipoCliente: e.target.value as ClientType })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Empresa">Empresa (Persona Jurídica con Contrato)</option>
                    <option value="Particular">Particular / Evento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Forma de Pago Pactada
                  </label>
                  <select
                    value={formData.formaPago}
                    onChange={(e) =>
                      setFormData({ ...formData, formaPago: e.target.value as PaymentMethod })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Contado / Transferencia">Contado / Transferencia</option>
                    <option value="Anticipo 50% + Saldo Contraentrega">
                      Anticipo 50% + Saldo Contraentrega
                    </option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Crédito 45+ días">Crédito 45+ días (Riesgo Alto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Plazo de Pago (Días)
                  </label>
                  <input
                    type="number"
                    value={formData.diasPlazoPago}
                    onChange={(e) =>
                      setFormData({ ...formData, diasPlazoPago: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Porcentaje de Anticipo o Garantía (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.porcentajeAnticipo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        porcentajeAnticipo: Number(e.target.value),
                        tieneAnticipoGarantia: Number(e.target.value) > 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Checkboxes de validación legal y contractual */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Lista de Verificación: ¿El pago es seguro?
                </h3>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.documentacionLegalAlDia}
                    onChange={(e) =>
                      setFormData({ ...formData, documentacionLegalAlDia: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>
                    Documentación y legalidad completa (Contrato transporte especial para FUEC, RUT, Cámara de Comercio)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.tieneAnticipoGarantia}
                    onChange={(e) =>
                      setFormData({ ...formData, tieneAnticipoGarantia: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Anticipo recibido o garantía comercial verificada</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.penalidadesClaras}
                    onChange={(e) =>
                      setFormData({ ...formData, penalidadesClaras: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Condiciones de pago, plazos, horas extra y penalidades claras por escrito</span>
                </label>
              </div>

              {/* ROMBO 3: ¿CONDICIONES DE PAGO SON SEGURAS? */}
              <div
                className={`border-2 rounded-xl p-5 space-y-3 ${
                  formData.condicionesPagoSeguras
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-red-600 bg-red-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                      Rombo de Decisión 3 (Dueño / Gerencia)
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      ¿CONDICIONES DE PAGO SON SEGURAS?
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condicionesPagoSeguras: true,
                          status: 'Aprobado',
                          aprobadoPorGerencia: 'Aprobado por Gerencia SERJEAU',
                        })
                      }
                      className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
                        formData.condicionesPagoSeguras
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      SÍ — Aprobar Servicio
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          condicionesPagoSeguras: false,
                          status: 'Renegociacion Pago',
                        })
                      }
                      className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
                        !formData.condicionesPagoSeguras
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700'
                      }`}
                    >
                      NO — Negociar o Rechazar
                    </button>
                  </div>
                </div>
                {!formData.condicionesPagoSeguras && (
                  <p className="text-xs text-red-900 font-semibold">
                    ACCIÓN (NO): No despachar vehículo sin antes negociar anticipo mínimo o garantía de pago.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 4: EJECUTAR EL SERVICIO (OPERACIÓN DIARIA)
          ========================================== */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  Paso 4 del Flujograma · Operación Diaria y Control en Ruta
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  4. Ejecutar el Servicio (Asignación Vehículo/Conductor y Control en Ruta)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehículo Asignado (Flota SERJEAU: 5 Logans, 2 Dusters, 1 Van)
                  </label>
                  <select
                    value={formData.vehiculoId}
                    onChange={(e) => {
                      const veh = fleet.find((v) => v.id === e.target.value);
                      setFormData({
                        ...formData,
                        vehiculoId: e.target.value,
                        conductorId: veh ? veh.conductorId : formData.conductorId,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {fleet.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre} ({v.placa}) — Cond: {v.conductorAsignado}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cumplimiento de Ruta (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.cumplimientoRutaPct}
                    onChange={(e) =>
                      setFormData({ ...formData, cumplimientoRutaPct: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* 4. Asignación Vehículo / Conductor Checklists */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.estadoVehiculoOk}
                    onChange={(e) =>
                      setFormData({ ...formData, estadoVehiculoOk: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Estado del vehículo (Preoperacional OK)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.disponibilidadConductorOk}
                    onChange={(e) =>
                      setFormData({ ...formData, disponibilidadConductorOk: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Disponibilidad del conductor verificada</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.documentacionVehiculoAlDia}
                    onChange={(e) =>
                      setFormData({ ...formData, documentacionVehiculoAlDia: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Documentación al día (FUEC, SOAT, Tecno)</span>
                </label>
              </div>

              {/* Control en ruta */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Control en Ruta (Datos Reales de Operación)
                  </h3>
                  <button
                    type="button"
                    onClick={copyQuotedToReal}
                    className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
                  >
                    Copiar valores estimados de cotización →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Km Recorridos Reales (Cotizado: {formData.kilometrajeTotal} km)
                    </label>
                    <input
                      type="number"
                      value={formData.kmRecorridosReales}
                      onChange={(e) =>
                        setFormData({ ...formData, kmRecorridosReales: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Combustible Real Consumido (COP)
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={formData.combustibleReal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          combustibleReal: Number(e.target.value),
                          costosReales: {
                            ...(sumCostBreakdown(formData.costosReales) > 0
                              ? formData.costosReales
                              : formData.costosEstimados),
                            combustible: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Horas Trabajadas Reales
                    </label>
                    <input
                      type="number"
                      value={formData.horasTrabajadasReales}
                      onChange={(e) =>
                        setFormData({ ...formData, horasTrabajadasReales: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Incidentes / Novedades en Ruta
                    </label>
                    <input
                      type="text"
                      value={formData.incidentesNovedades}
                      onChange={(e) =>
                        setFormData({ ...formData, incidentesNovedades: e.target.value })
                      }
                      placeholder="Registra desvíos, tiempos de espera, peajes extra o novedades operativas"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 5: FACTURAR Y COBRAR (CIERRE DEL SERVICIO)
          ========================================== */}
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  Paso 5 del Flujograma · Facturación y Recaudo
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  5. Facturar y Cobrar (Cierre Administrativo y Control de Cartera)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Factura Electrónica / Soporte
                  </label>
                  <input
                    type="text"
                    value={formData.numeroFactura}
                    onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                    placeholder="Ej. FE-1065"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiempo Real de Pago del Cliente (Días)
                  </label>
                  <input
                    type="number"
                    value={formData.diasRealesRecaudo}
                    onChange={(e) =>
                      setFormData({ ...formData, diasRealesRecaudo: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h3 className="text-xs font-extrabold uppercase text-slate-800">
                    5. Facturación y Recaudo
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.facturaEnviada}
                      onChange={(e) =>
                        setFormData({ ...formData, facturaEnviada: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Enviar factura / soporte de planillas firmadas</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pagoConfirmado}
                      onChange={(e) =>
                        setFormData({ ...formData, pagoConfirmado: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Confirmar pago efectivo en bancos</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.registradoEnSistema}
                      onChange={(e) =>
                        setFormData({ ...formData, registradoEnSistema: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Registrar recaudo en el sistema contable</span>
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <h3 className="text-xs font-extrabold uppercase text-slate-800">
                    ¿Se recibió el pago?
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consistenteConPactado}
                      onChange={(e) =>
                        setFormData({ ...formData, consistenteConPactado: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Consistencia con lo pactado (sin descuentos arbitrarios)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sinCarteraPendiente}
                      onChange={(e) =>
                        setFormData({ ...formData, sinCarteraPendiente: e.target.checked })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Sin cartera pendiente vencida</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 6: EVALUAR RENTABILIDAD + ROMBO 4
          ========================================== */}
          {activeStep === 6 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    Paso 6 del Flujograma · Cierre Financiero y Control 4 (Vehículo)
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    6. Evaluar Rentabilidad (Ingresos Reales vs Costos Totales = Utilidad Neta)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={copyQuotedToReal}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Sincronizar con Cotización
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ingresos Reales Facturados (COP)
                  </label>
                  <input
                    type="number"
                    step={50000}
                    value={formData.ingresosReales || formData.tarifaServicio}
                    onChange={(e) =>
                      setFormData({ ...formData, ingresosReales: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satisfacción del Cliente (NPS 0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.satisfaccionClienteNPS}
                    onChange={(e) =>
                      setFormData({ ...formData, satisfaccionClienteNPS: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Desempeño del Conductor (1 a 5)
                  </label>
                  <select
                    value={formData.desempenoConductorCalificacion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        desempenoConductorCalificacion: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value={5}>5 - Sobresaliente</option>
                    <option value={4}>4 - Cumple estándar</option>
                    <option value={3}>3 - Regular</option>
                    <option value={2}>2 - Llamado de atención</option>
                    <option value={1}>1 - Crítico</option>
                  </select>
                </div>
              </div>

              {/* Comparativo Cotizado vs Real */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono tabular-nums">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-sans font-semibold text-slate-500">
                    Ingresos Reales
                  </div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {formatCOP(realMetrics.tarifa)}
                  </div>
                  <div className="text-[11px] font-sans text-slate-500 mt-1">
                    Meta Logan: $7.000.000 / mes
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-sans font-semibold text-slate-500">
                    Costos Totales Reales
                  </div>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {formatCOP(realMetrics.costoTotal)}
                  </div>
                  <div className="text-[11px] font-sans text-slate-500 mt-1">
                    Costo/km: {formatCOP(realMetrics.costoPorKm)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-sans font-semibold text-slate-500">
                    Utilidad Neta Real ({realMetrics.margenPct.toFixed(1)}%)
                  </div>
                  <div
                    className={`text-base font-extrabold mt-0.5 ${
                      realMetrics.utilidadReal >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {formatCOP(realMetrics.utilidadReal)}
                  </div>
                  <div className="text-[11px] font-sans text-slate-500 mt-1">
                    Aporte a meta de $20M netos
                  </div>
                </div>
              </div>

              {/* ROMBO 4: ¿MANTENER / MODIFICAR / ELIMINAR EL SERVICIO? */}
              <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Rombo de Decisión 4 · Decisión Estratégica de Cierre
                  </div>
                  <h3 className="text-base font-extrabold mt-0.5">
                    ¿MANTENER / MODIFICAR / ELIMINAR EL SERVICIO?
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        val: 'Continuar y escalar',
                        label: 'SÍ → Continuar y escalar',
                        desc: 'Cumplió objetivo de rentabilidad y producción del vehículo.',
                      },
                      {
                        val: 'Ajustar condiciones',
                        label: 'NO → Ajustar condiciones',
                        desc: 'Renegociar tarifa, peajes o tiempos muertos para el próximo mes.',
                      },
                      {
                        val: 'Finalizar servicio',
                        label: 'NO → Eliminar / Finalizar servicio',
                        desc: 'Liberar vehículo y conductor para asignarlo a una ruta más rentable.',
                      },
                    ] as { val: RetentionAction; label: string; desc: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          decisionContinuidad: opt.val,
                          status:
                            opt.val === 'Continuar y escalar'
                              ? 'Cerrado / Escalado'
                              : 'Ajustar o Finalizar',
                        })
                      }
                      className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                        formData.decisionContinuidad === opt.val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <div className="text-xs font-extrabold">{opt.label}</div>
                      <div className="text-[11px] opacity-85 mt-1 font-normal">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              PASO 7: APRENDIZAJE Y MEJORA CONTINUA
          ========================================== */}
          {activeStep === 7 && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Paso 7 del Flujograma · Control 5 (Estratégico)
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  7. Aprendizaje y Mejora Continua (Lecciones para la Próxima Decisión)
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. ¿Qué funcionó bien en este servicio?
                  </label>
                  <textarea
                    rows={2}
                    value={formData.queFunciono}
                    onChange={(e) => setFormData({ ...formData, queFunciono: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. ¿Qué no funcionó o generó sobrecostos?
                  </label>
                  <textarea
                    rows={2}
                    value={formData.queNoFunciono}
                    onChange={(e) => setFormData({ ...formData, queNoFunciono: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Oportunidades de mejora para la próxima cotización o ruta
                  </label>
                  <textarea
                    rows={2}
                    value={formData.oportunidadesMejora}
                    onChange={(e) =>
                      setFormData({ ...formData, oportunidadesMejora: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.actualizarTarifasCostos}
                    onChange={(e) =>
                      setFormData({ ...formData, actualizarTarifasCostos: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>
                    Actualizar tarifario maestro y estructura de costos por kilómetro con este aprendizaje
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP NAVIGATION FOOTER */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={activeStep === 1}
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1) as FlowStage)}
              className="px-4 py-2 border border-slate-300 disabled:opacity-40 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Paso Anterior
            </button>

            <div className="flex items-center gap-2.5">
              {activeStep < 7 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = (activeStep + 1) as FlowStage;
                    setActiveStep(next);
                    handleSave(next);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Guardar y Avanzar al Paso {activeStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(7)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-lg inline-flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar Ciclo y Guardar Lecciones (FIN)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLS: LIVE FINANCIAL SUMMARY & LOS 5 CONTROLES GERENCIALES */}
        <div className="lg:col-span-4 space-y-5">
          {/* ESTRUCTURA DE COSTOS EN VIVO DEL EXPEDIENTE */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3">
              <div className="text-[11px] text-amber-400 font-bold uppercase">
                Estructura de Costos del Servicio
              </div>
              <div className="text-sm font-extrabold">
                Resumen Financiero en Tiempo Real
              </div>
            </div>

            <div className="p-4 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">
                <span className="font-sans">Ingresos (Tarifa)</span>
                <span>{formatCOP(formData.tarifaServicio)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– {formData.costosEstimados.conductorPct}% Conductor</span>
                <span>{formatCOP(formData.costosEstimados.conductorCost)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Combustible</span>
                <span>{formatCOP(formData.costosEstimados.combustible)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Peajes</span>
                <span>{formatCOP(formData.costosEstimados.peajes)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Seguridad social</span>
                <span>{formatCOP(formData.costosEstimados.seguridadSocial)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Mantenimiento</span>
                <span>{formatCOP(formData.costosEstimados.mantenimiento)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Impuestos</span>
                <span>{formatCOP(formData.costosEstimados.impuestos)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Cuota / financiación</span>
                <span>{formatCOP(formData.costosEstimados.cuotaFinanciacion)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="font-sans">– Otros (lavado, imprev.)</span>
                <span>{formatCOP(formData.costosEstimados.otros)}</span>
              </div>

              <div className="pt-2.5 border-t-2 border-slate-900 flex justify-between items-center text-sm font-extrabold">
                <span className="font-sans">= Utilidad real</span>
                <span
                  className={
                    quotedMetrics.utilidadReal >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }
                >
                  {formatCOP(quotedMetrics.utilidadReal)}
                </span>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-sans">
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <span className="text-slate-500 block">Margen Neto</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {quotedMetrics.margenPct.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <span className="text-slate-500 block">Utilidad / km</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatCOP(quotedMetrics.utilidadPorKm)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CHECKLIST DE LOS 5 CONTROLES GERENCIALES */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3">
              <div className="text-xs font-extrabold uppercase tracking-wider">
                Validación: Los 5 Controles Gerenciales
              </div>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              {[
                {
                  key: 'comercial',
                  num: '1. COMERCIAL',
                  q: '¿Vale la pena aceptar este cliente/contrato?',
                },
                {
                  key: 'operativo',
                  num: '2. OPERATIVO',
                  q: '¿Podemos prestar el servicio sin afectar otras rutas?',
                },
                {
                  key: 'financiero',
                  num: '3. FINANCIERO',
                  q: '¿Cuánto dinero realmente deja?',
                },
                {
                  key: 'vehiculo',
                  num: '4. VEHÍCULO',
                  q: '¿El carro está produciendo lo que debería?',
                },
                {
                  key: 'estrategico',
                  num: '5. ESTRATÉGICO',
                  q: '¿Este servicio ayuda a crecer y cumplir la meta?',
                },
              ].map((c) => {
                const checked =
                  formData.controlesGerenciales[
                    c.key as keyof ServiceRecord['controlesGerenciales']
                  ];
                return (
                  <label
                    key={c.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          controlesGerenciales: {
                            ...formData.controlesGerenciales,
                            [c.key]: e.target.checked,
                          },
                        })
                      }
                      className="mt-0.5 w-4 h-4 rounded"
                    />
                    <div>
                      <div className="font-extrabold">{c.num}</div>
                      <div className="text-[11px]">{c.q}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
