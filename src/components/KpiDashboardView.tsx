import React from 'react';
import { BarChart3, Target, CheckCircle2, DollarSign, Brain } from 'lucide-react';
import { FleetVehicle, FlowStage, ServiceRecord } from '../types/serjeau';
import { formatCOP, sumCostBreakdown } from '../data/initialData';

interface KpiDashboardViewProps {
  services: ServiceRecord[];
  fleet: FleetVehicle[];
  onSelectService: (service: ServiceRecord, initialStage?: FlowStage) => void;
}

export const KpiDashboardView: React.FC<KpiDashboardViewProps> = ({
  services,
  fleet,
  onSelectService,
}) => {
  const activeServices = services.filter(
    (s) =>
      s.status !== 'Rechazado Capacidad' &&
      s.status !== 'Renegociacion Margen' &&
      s.status !== 'Renegociacion Pago'
  );

  const totalIngresos = activeServices.reduce(
    (acc, s) => acc + (s.ingresosReales > 0 ? s.ingresosReales : s.tarifaServicio),
    0
  );

  const consolidatedCosts = activeServices.reduce(
    (acc, s) => {
      const c = sumCostBreakdown(s.costosReales) > 0 ? s.costosReales : s.costosEstimados;
      return {
        conductorCost: acc.conductorCost + c.conductorCost,
        combustible: acc.combustible + c.combustible,
        peajes: acc.peajes + c.peajes,
        seguridadSocial: acc.seguridadSocial + c.seguridadSocial,
        mantenimiento: acc.mantenimiento + c.mantenimiento,
        impuestos: acc.impuestos + c.impuestos,
        cuotaFinanciacion: acc.cuotaFinanciacion + c.cuotaFinanciacion,
        otros: acc.otros + c.otros,
      };
    },
    {
      conductorCost: 0,
      combustible: 0,
      peajes: 0,
      seguridadSocial: 0,
      mantenimiento: 0,
      impuestos: 0,
      cuotaFinanciacion: 0,
      otros: 0,
    }
  );

  const totalCostos =
    consolidatedCosts.conductorCost +
    consolidatedCosts.combustible +
    consolidatedCosts.peajes +
    consolidatedCosts.seguridadSocial +
    consolidatedCosts.mantenimiento +
    consolidatedCosts.impuestos +
    consolidatedCosts.cuotaFinanciacion +
    consolidatedCosts.otros;

  const utilidadRealConsolidada = totalIngresos - totalCostos;
  const rentabilidadPromedioPct =
    totalIngresos > 0 ? (utilidadRealConsolidada / totalIngresos) * 100 : 0;

  const totalKm = activeServices.reduce(
    (acc, s) => acc + (s.kmRecorridosReales > 0 ? s.kmRecorridosReales : s.kilometrajeTotal),
    0
  );

  const ingresoPorKm = totalKm > 0 ? totalIngresos / totalKm : 0;
  const costoPorKm = totalKm > 0 ? totalCostos / totalKm : 0;
  const produccionPromedioPorVehiculo = fleet.length > 0 ? totalIngresos / fleet.length : 0;
  const utilizacionPromedio =
    fleet.reduce((acc, v) => acc + v.utilizacionPct, 0) / Math.max(1, fleet.length);
  const cumplimientoRutasPromedio =
    fleet.reduce((acc, v) => acc + v.cumplimientoRutasPct, 0) / Math.max(1, fleet.length);
  const ausentismoPromedio =
    fleet.reduce((acc, v) => acc + v.ausentismoConductorPct, 0) / Math.max(1, fleet.length);

  const paidServices = activeServices.filter((s) => s.diasRealesRecaudo > 0);
  const diasPagoPromedio =
    paidServices.length > 0
      ? paidServices.reduce((acc, s) => acc + s.diasRealesRecaudo, 0) / paidServices.length
      : 12;

  const npsServices = activeServices.filter((s) => s.satisfaccionClienteNPS > 0);
  const npsPromedio =
    npsServices.length > 0
      ? npsServices.reduce((acc, s) => acc + s.satisfaccionClienteNPS, 0) / npsServices.length
      : 95;

  const kpiCards = [
    {
      idx: '01',
      name: 'Rentabilidad por servicio (%)',
      value: `${rentabilidadPromedioPct.toFixed(1)}%`,
      target: 'Meta ≥ 24.0%',
      detail: `Utilidad Neta: ${formatCOP(utilidadRealConsolidada)}`,
      ok: rentabilidadPromedioPct >= 24,
    },
    {
      idx: '02',
      name: 'Producción por vehículo (mensual)',
      value: formatCOP(produccionPromedioPorVehiculo),
      target: 'Meta Logan: $7.000.000 / mes',
      detail: `Flota total: ${formatCOP(totalIngresos)} en ${fleet.length} vehículos`,
      ok: produccionPromedioPorVehiculo >= 7000000,
    },
    {
      idx: '03',
      name: 'Ingresos por km',
      value: `${formatCOP(ingresoPorKm)} / km`,
      target: 'Meta ≥ $2.450 / km',
      detail: `Sobre ${totalKm.toLocaleString('es-CO')} km productivos`,
      ok: ingresoPorKm >= 2450,
    },
    {
      idx: '04',
      name: 'Costo por km',
      value: `${formatCOP(costoPorKm)} / km`,
      target: 'Tope ≤ $1.850 / km',
      detail: `Margen neto/km: ${formatCOP(ingresoPorKm - costoPorKm)}`,
      ok: costoPorKm <= 1850,
    },
    {
      idx: '05',
      name: 'Utilización del vehículo (%)',
      value: `${utilizacionPromedio.toFixed(1)}%`,
      target: 'Meta ≥ 85.0%',
      detail: '5 Logans + 2 Dusters + 1 Van activos',
      ok: utilizacionPromedio >= 85,
    },
    {
      idx: '06',
      name: 'Cumplimiento de rutas (%)',
      value: `${cumplimientoRutasPromedio.toFixed(1)}%`,
      target: 'Meta ≥ 98.0%',
      detail: 'Puntualidad y cobertura sin fallas',
      ok: cumplimientoRutasPromedio >= 98,
    },
    {
      idx: '07',
      name: 'Tiempo de pago de clientes (días)',
      value: `${diasPagoPromedio.toFixed(1)} días`,
      target: 'Meta ≤ 15 días',
      detail: 'Rotación de cartera saludable',
      ok: diasPagoPromedio <= 15,
    },
    {
      idx: '08',
      name: 'Satisfacción del cliente (NPS)',
      value: `${npsPromedio.toFixed(1)} / 100`,
      target: 'Meta ≥ 90 pts',
      detail: 'Más que un viaje, es confianza',
      ok: npsPromedio >= 90,
    },
    {
      idx: '09',
      name: 'Rotación / ausentismo del conductor',
      value: `${ausentismoPromedio.toFixed(1)}%`,
      target: 'Meta ≤ 2.0%',
      detail: 'Pago puntual del 25% + Seguridad Social',
      ok: ausentismoPromedio <= 2.0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Tablero Gerencial SERJEAU Transporte Especial
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
            Indicadores Clave (KPI), Estructura de Costos y Objetivo 20M Netos
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Monitoreo en tiempo real de los 9 KPIs del Flujograma de Toma de Decisiones y lecciones del Paso 7.
          </p>
        </div>

        <div className="bg-slate-900 text-white px-4 py-3 rounded-xl font-mono tabular-nums shrink-0">
          <div className="text-[11px] font-sans text-amber-400 font-bold uppercase">
            Utilidad Real Consolidada / Meta 20M
          </div>
          <div className="text-lg font-extrabold">
            {formatCOP(utilidadRealConsolidada)}{' '}
            <span className="text-xs font-normal text-slate-300">/ $20.000.000</span>
          </div>
        </div>
      </div>

      {/* 9 KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.idx}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-700">KPI {kpi.idx}</span>
                <span>{kpi.target}</span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">{kpi.name}</div>
              <div className="text-2xl font-mono font-extrabold text-slate-900 mt-2 tabular-nums">
                {kpi.value}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">{kpi.detail}</span>
              <span
                className={`font-bold ${kpi.ok ? 'text-emerald-700' : 'text-amber-700'}`}
              >
                {kpi.ok ? 'Cumple' : 'Revisar'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Consolidated Cost Structure & Step 7 Continuous Improvement Repository */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ESTRUCTURA DE COSTOS CONSOLIDADA */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              Estructura de Costos Consolidada (Mes Actual)
            </h2>
          </div>
          <div className="p-5 space-y-2.5 text-xs font-mono tabular-nums">
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pb-2 border-b border-slate-200">
              <span className="font-sans">Ingresos Operativos Brutos</span>
              <span>{formatCOP(totalIngresos)}</span>
            </div>

            {[
              { label: '– 25% Conductor', val: consolidatedCosts.conductorCost },
              { label: '– Combustible', val: consolidatedCosts.combustible },
              { label: '– Peajes', val: consolidatedCosts.peajes },
              { label: '– Seguridad social', val: consolidatedCosts.seguridadSocial },
              { label: '– Mantenimiento', val: consolidatedCosts.mantenimiento },
              { label: '– Impuestos', val: consolidatedCosts.impuestos },
              { label: '– Cuota / financiación', val: consolidatedCosts.cuotaFinanciacion },
              { label: '– Otros (lavado, imprevistos)', val: consolidatedCosts.otros },
            ].map((row, idx) => {
              const pct = totalIngresos > 0 ? (row.val / totalIngresos) * 100 : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-slate-700">
                  <span className="font-sans">{row.label}</span>
                  <div>
                    <span className="text-slate-400 mr-2">({pct.toFixed(1)}%)</span>
                    <span className="font-semibold text-slate-900">{formatCOP(row.val)}</span>
                  </div>
                </div>
              );
            })}

            <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-base font-extrabold text-emerald-700">
              <span className="font-sans">= Utilidad real</span>
              <span>{formatCOP(utilidadRealConsolidada)}</span>
            </div>
          </div>
        </div>

        {/* PASO 7: BITÁCORA DE APRENDIZAJE Y MEJORA CONTINUA */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              Paso 7: Aprendizaje y Mejora Continua (Lecciones Documentadas)
            </h2>
          </div>

          <div className="divide-y divide-slate-200">
            {services.slice(0, 5).map((srv) => (
              <div
                key={srv.id}
                onClick={() => onSelectService(srv, 7)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {srv.code} · {srv.clienteNombre}
                  </span>
                  <span className="font-semibold text-slate-600">
                    Decisión: {srv.decisionContinuidad}
                  </span>
                </div>
                <div className="text-slate-700">
                  <strong className="text-emerald-800">Qué funcionó:</strong> {srv.queFunciono}
                </div>
                <div className="text-slate-700">
                  <strong className="text-red-800">Qué no funcionó:</strong> {srv.queNoFunciono}
                </div>
                <div className="text-slate-700">
                  <strong className="text-amber-800">Oportunidad de mejora:</strong>{' '}
                  {srv.oportunidadesMejora}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
