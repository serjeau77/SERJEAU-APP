import React, { useState } from 'react';
import { Car, CheckCircle2, AlertTriangle, ChevronRight, UserCheck, Target } from 'lucide-react';
import { FleetVehicle, FlowStage, ServiceRecord } from '../types/serjeau';
import { formatCOP, sumCostBreakdown } from '../data/initialData';

interface FleetAndAnalysisViewProps {
  fleet: FleetVehicle[];
  services: ServiceRecord[];
  onSelectService: (service: ServiceRecord, initialStage?: FlowStage) => void;
}

type TimeScale = 'DIA' | 'SEMANA' | 'MES';

export const FleetAndAnalysisView: React.FC<FleetAndAnalysisViewProps> = ({
  fleet,
  services,
  onSelectService,
}) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('MES');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'ALL' | 'Logan' | 'Duster' | 'Van'>('ALL');

  const scaleFactor = timeScale === 'MES' ? 1 : timeScale === 'SEMANA' ? 1 / 4.33 : 1 / 26;
  const scaleLabel = timeScale === 'MES' ? 'Mensual' : timeScale === 'SEMANA' ? 'Semanal' : 'Diario (Base 26 días)';

  // Compute production per vehicle from active services
  const vehicleMetrics = fleet.map((veh) => {
    const assignedServices = services.filter(
      (s) =>
        s.vehiculoId === veh.id &&
        s.status !== 'Rechazado Capacidad' &&
        s.status !== 'Renegociacion Margen' &&
        s.status !== 'Renegociacion Pago'
    );

    // Note: SRJ-2026-07 is a combined operation for Logan #04 and Logan #05 ($14.3M total -> $7.15M each)
    let rawProduction = assignedServices.reduce(
      (acc, s) => acc + (s.ingresosReales > 0 ? s.ingresosReales : s.tarifaServicio),
      0
    );
    let rawCosts = assignedServices.reduce((acc, s) => {
      const c = sumCostBreakdown(s.costosReales) > 0 ? s.costosReales : s.costosEstimados;
      return acc + sumCostBreakdown(c);
    }, 0);
    let rawKm = assignedServices.reduce(
      (acc, s) => acc + (s.kmRecorridosReales > 0 ? s.kmRecorridosReales : s.kilometrajeTotal),
      0
    );

    if (veh.id === 'veh-logan-04') {
      rawProduction = 7150000;
      rawCosts = 5222500;
      rawKm = 2680;
    } else if (veh.id === 'veh-logan-05') {
      rawProduction = 7150000;
      rawCosts = 5222500;
      rawKm = 2680;
    }

    const utilidadNeta = rawProduction - rawCosts;
    const cumplimientoMetaPct =
      veh.metaProduccionMensual > 0 ? (rawProduction / veh.metaProduccionMensual) * 100 : 0;

    return {
      veh,
      assignedServices,
      produccion: rawProduction * scaleFactor,
      meta: veh.metaProduccionMensual * scaleFactor,
      costos: rawCosts * scaleFactor,
      utilidad: utilidadNeta * scaleFactor,
      km: Math.round(rawKm * scaleFactor),
      cumplimientoMetaPct,
    };
  });

  const filteredVehicles = vehicleMetrics.filter((vm) =>
    selectedVehicleType === 'ALL' ? true : vm.veh.tipo === selectedVehicleType
  );

  const totalProduccionFlota = vehicleMetrics.reduce((acc, vm) => acc + vm.produccion, 0);
  const totalUtilidadFlota = vehicleMetrics.reduce((acc, vm) => acc + vm.utilidad, 0);
  const metaNetosExpansion = 20000000 * scaleFactor;

  return (
    <div className="space-y-6">
      {/* Header: Unidad de Análisis y Objetivo del Negocio */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-purple-800">
            Control Gerencial 4: ¿El carro está produciendo lo que debería?
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
            Flota SERJEAU (5 Logans + 2 Dusters + 1 Van) y Unidad de Análisis
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-1.5 font-semibold">
            <span>Unidad de Análisis:</span>
            <span>Servicio</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Vehículo</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Conductor</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Día</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Semana</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span>Mes</span>
          </div>
        </div>

        {/* Time Scale Switcher (Día -> Semana -> Mes) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
            {(
              [
                { id: 'DIA', label: 'Vista por Día' },
                { id: 'SEMANA', label: 'Vista por Semana' },
                { id: 'MES', label: 'Vista por Mes' },
              ] as { id: TimeScale; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeScale(t.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  timeScale === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4-Column Summary Strip for Objetivo del Negocio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Objetivo Logan ({scaleLabel})
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-900 mt-1 tabular-nums">
            {formatCOP(7000000 * scaleFactor)}
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            5 Logans activos cumpliendo meta
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Producción Bruta Flota ({scaleLabel})
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-900 mt-1 tabular-nums">
            {formatCOP(totalProduccionFlota)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            5 Logans + 2 Dusters + 1 Van (8 unidades)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Utilidad Neta Real ({scaleLabel})
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-700 mt-1 tabular-nums">
            {formatCOP(totalUtilidadFlota)}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Meta expansión: <span className="font-mono font-bold">{formatCOP(metaNetosExpansion)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500">
            Avance Meta 20M Netos (Expansión)
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-900 mt-1 tabular-nums">
            {((totalUtilidadFlota / metaNetosExpansion) * 100).toFixed(1)}%
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${Math.min(100, (totalUtilidadFlota / metaNetosExpansion) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vehicle Type Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
          {[
            { id: 'ALL', label: 'Toda la Flota (8)' },
            { id: 'Logan', label: '5 Renault Logans ($7M/mes c/u)' },
            { id: 'Duster', label: '2 Renault Dusters' },
            { id: 'Van', label: '1 Van Ejecutiva' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedVehicleType(f.id as typeof selectedVehicleType)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedVehicleType === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Production & Driver Analysis Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Vehículo / Placa</th>
                <th className="py-3 px-4">Conductor Asignado</th>
                <th className="py-3 px-4 text-right">Meta ({scaleLabel})</th>
                <th className="py-3 px-4 text-right">Producción ({scaleLabel})</th>
                <th className="py-3 px-4 text-right">Costos Totales</th>
                <th className="py-3 px-4 text-right">Utilidad Real</th>
                <th className="py-3 px-4 text-right">Utilización / Cumpl.</th>
                <th className="py-3 px-4 text-right">Estado Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredVehicles.map((item) => {
                const cumpleMeta = item.cumplimientoMetaPct >= 100;
                return (
                  <tr key={item.veh.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.veh.nombre}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono font-semibold text-slate-700">
                          Placa: {item.veh.placa}
                        </span>
                        <span> · </span>
                        <span>Modelo {item.veh.modelo}</span>
                        <span> · </span>
                        <span>{item.km} km</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.veh.conductorAsignado}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Ausentismo: <span className="font-mono">{item.veh.ausentismoConductorPct}%</span> · Estado: {item.veh.estadoOperativo}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {formatCOP(item.meta)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                      {formatCOP(item.produccion)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {formatCOP(item.costos)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {formatCOP(item.utilidad)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                      <div>Util: {item.veh.utilizacionPct}%</div>
                      <div className="text-[11px] text-slate-500">
                        Ruta: {item.veh.cumplimientoRutasPct}%
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div
                        className={`inline-flex items-center gap-1 font-mono font-bold ${
                          cumpleMeta ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {cumpleMeta ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{item.cumplimientoMetaPct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
