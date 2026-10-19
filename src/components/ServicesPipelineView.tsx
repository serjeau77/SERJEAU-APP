import React, { useState } from 'react';
import { Search, Plus, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { FleetVehicle, FlowStage, ServiceRecord } from '../types/serjeau';
import { calculateFinancialMetrics, formatCOP, sumCostBreakdown } from '../data/initialData';

interface ServicesPipelineViewProps {
  services: ServiceRecord[];
  fleet: FleetVehicle[];
  onSelectService: (service: ServiceRecord, initialStage?: FlowStage) => void;
  onStartNewService: () => void;
}

export const ServicesPipelineView: React.FC<ServicesPipelineViewProps> = ({
  services,
  fleet,
  onSelectService,
  onStartNewService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'ALERT' | 'ACTIVE' | 'CLOSED'>('ALL');

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destino.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (stageFilter === 'ALERT') {
      return (
        !s.tieneCapacidad ||
        !s.dejaMargenSuficiente ||
        !s.condicionesPagoSeguras ||
        s.status.includes('Renegociacion') ||
        s.status.includes('Rechazado')
      );
    }
    if (stageFilter === 'ACTIVE') {
      return s.currentStage >= 3 && s.currentStage <= 5 && s.condicionesPagoSeguras;
    }
    if (stageFilter === 'CLOSED') {
      return s.currentStage >= 6;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Expedientes de Servicio y Control de Rombos de Decisión
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Trazabilidad completa desde el Paso 1 (Captación) hasta el Paso 7 (Aprendizaje y Mejora Continua).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, código, ruta..."
              className="pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg w-60 focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={onStartNewService}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Oportunidad
          </button>
        </div>
      </div>

      {/* Interactive Filter Segmented Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
          {[
            { id: 'ALL', label: `Todos los Servicios (${services.length})` },
            { id: 'ACTIVE', label: 'En Operación / Facturación' },
            { id: 'CLOSED', label: 'Cerrados y Evaluados (Pasos 6–7)' },
            { id: 'ALERT', label: 'Detenidos en Rombo (NO → Negociar / Rechazar)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStageFilter(tab.id as typeof stageFilter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                stageFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-mono tabular-nums">
          Mostrando {filteredServices.length} de {services.length} expedientes
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-sm font-bold text-slate-900">
              No se encontraron expedientes con el filtro actual
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Puedes limpiar la búsqueda o registrar una nueva oportunidad de servicio en el Paso 1 del Flujograma.
            </p>
            <button
              type="button"
              onClick={onStartNewService}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Registrar Primera Oportunidad
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Expediente / Cliente</th>
                  <th className="py-3 px-4">Vehículo / Ruta</th>
                  <th className="py-3 px-4">Etapa Flujograma</th>
                  <th className="py-3 px-4">Estado Rombos</th>
                  <th className="py-3 px-4 text-right">Ingresos (COP)</th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4 text-right">Utilidad Real</th>
                  <th className="py-3 px-4 text-right">Margen</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredServices.map((srv) => {
                  const income = srv.ingresosReales > 0 ? srv.ingresosReales : srv.tarifaServicio;
                  const costs =
                    sumCostBreakdown(srv.costosReales) > 0
                      ? srv.costosReales
                      : srv.costosEstimados;
                  const km =
                    srv.kmRecorridosReales > 0 ? srv.kmRecorridosReales : srv.kilometrajeTotal;
                  const fin = calculateFinancialMetrics(income, costs, km);
                  const veh = fleet.find((v) => v.id === srv.vehiculoId);

                  const hasGateAlert =
                    !srv.tieneCapacidad ||
                    !srv.dejaMargenSuficiente ||
                    !srv.condicionesPagoSeguras;

                  return (
                    <tr
                      key={srv.id}
                      onClick={() => onSelectService(srv, srv.currentStage)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{srv.clienteNombre}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold text-slate-700">{srv.code}</span>
                          <span> · </span>
                          <span>{srv.tipoServicio}</span>
                          <span> · </span>
                          <span>{srv.tipoCliente}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {veh ? `${veh.nombre} (${veh.placa})` : srv.tipoVehiculoRequerido}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {srv.origen} → {srv.destino} · <span className="font-mono">{km} km</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          Paso {srv.currentStage} de 7
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{srv.status}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {hasGateAlert ? (
                          <div className="inline-flex items-center gap-1.5 text-red-700 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {!srv.tieneCapacidad
                                ? 'Rombo 1: Sin capacidad'
                                : !srv.dejaMargenSuficiente
                                ? 'Rombo 2: Negociar tarifa'
                                : 'Rombo 3: Pago inseguro'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Rombos aprobados (SÍ)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCOP(fin.tarifa)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                        {formatCOP(fin.costoTotal)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                          fin.utilidadReal >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {formatCOP(fin.utilidadReal)}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                          fin.margenPct >= srv.margenMinimoEsperadoPct
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {fin.margenPct.toFixed(1)}%
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectService(srv, srv.currentStage);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Evaluar</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
