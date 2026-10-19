import React, { useEffect, useState } from 'react';
import { SerjeauLogo } from './components/SerjeauLogo';
import { InteractiveFlowchart } from './components/InteractiveFlowchart';
import { DecisionWizard } from './components/DecisionWizard';
import { ServicesPipelineView } from './components/ServicesPipelineView';
import { FleetAndAnalysisView } from './components/FleetAndAnalysisView';
import { KpiDashboardView } from './components/KpiDashboardView';
import { INITIAL_FLEET, INITIAL_SERVICES, estimateDefaultCosts } from './data/initialData';
import { FleetVehicle, FlowStage, ServiceRecord } from './types/serjeau';

type ActiveTab = 'flowchart' | 'evaluator' | 'services' | 'fleet' | 'kpis';

const STORAGE_KEY_SERVICES = 'serjeau_decision_services_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flowchart');
  const [fleet] = useState<FleetVehicle[]>(INITIAL_FLEET);
  const [services, setServices] = useState<ServiceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial services
    }
    return INITIAL_SERVICES;
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string>(INITIAL_SERVICES[0].id);
  const [wizardInitialStage, setWizardInitialStage] = useState<FlowStage>(1);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
    } catch {
      // Ignore storage quota errors
    }
  }, [services]);

  const handleSelectService = (service: ServiceRecord, initialStage?: FlowStage) => {
    setSelectedServiceId(service.id);
    setWizardInitialStage(initialStage || service.currentStage || 1);
    setActiveTab('evaluator');
  };

  const handleStartNewService = (initialStage: FlowStage = 1) => {
    const nextNum = services.length + 1;
    const defaultTarifa = 7000000;
    const defaultKm = 2750;
    const defaultCosts = estimateDefaultCosts(defaultTarifa, defaultKm, 'Logan', 25);

    const newRecord: ServiceRecord = {
      id: `srv-${Date.now()}`,
      code: `SRJ-2026-${String(nextNum).padStart(2, '0')}`,
      createdAt: new Date().toISOString().slice(0, 10),
      currentStage: initialStage,
      status: 'En Evaluacion',
      clienteNombre: 'Nuevo Cliente Corporativo S.A.S.',
      contactoNombre: 'Jefe de Logística y Transporte',
      contactoTelefono: '310 000 0000',
      tipoServicio: 'Contrato Mensual',
      fechaServicio: new Date().toISOString().slice(0, 10),
      horario: 'Lunes a Sábado 06:00 AM - 05:30 PM',
      frecuenciaMensual: 26,
      origen: 'Sede Norte',
      destino: 'Zona Industrial',
      requerimientosEspeciales: 'FUEC vigente, conductor uniformado, puntualidad 10 min antes.',
      criterioRentabilidad: 5,
      criterioReputacionCliente: 4,
      criterioRiesgoPago: 4,
      criterioAjusteCapacidad: 5,
      criterioAlineacionEstrategia: 5,
      tieneCapacidad: true,
      motivoCapacidad: 'Logan #03 (WLM-483) y conductor Héctor Gómez disponibles en horario.',
      kilometrajeTotal: defaultKm,
      tiempoEstimadoHoras: 175,
      tipoVehiculoRequerido: 'Logan',
      numeroPasajeros: 4,
      riesgoRuta: 'Bajo',
      tarifaServicio: defaultTarifa,
      costosEstimados: defaultCosts,
      margenMinimoEsperadoPct: 24,
      dejaMargenSuficiente: true,
      notasNegociacionMargen: 'Cotización base alineada con la meta de $7.000.000/mes por Logan.',
      tipoCliente: 'Empresa',
      formaPago: 'Crédito 15 días',
      diasPlazoPago: 15,
      tieneAnticipoGarantia: true,
      porcentajeAnticipo: 30,
      documentacionLegalAlDia: true,
      penalidadesClaras: true,
      condicionesPagoSeguras: true,
      aprobadoPorGerencia: 'Gerencia General SERJEAU',
      vehiculoId: 'veh-logan-03',
      conductorId: 'cond-03',
      estadoVehiculoOk: true,
      disponibilidadConductorOk: true,
      documentacionVehiculoAlDia: true,
      kmRecorridosReales: defaultKm,
      combustibleReal: defaultCosts.combustible,
      horasTrabajadasReales: 175,
      incidentesNovedades: 'Sin novedades.',
      cumplimientoRutaPct: 99,
      numeroFactura: 'PENDIENTE',
      facturaEnviada: false,
      pagoConfirmado: false,
      registradoEnSistema: false,
      diasRealesRecaudo: 15,
      consistenteConPactado: true,
      sinCarteraPendiente: true,
      ingresosReales: defaultTarifa,
      costosReales: { ...defaultCosts },
      satisfaccionClienteNPS: 95,
      desempenoConductorCalificacion: 5,
      decisionContinuidad: 'Continuar y escalar',
      queFunciono: 'Tarifa bien estructurada desde el Paso 2.',
      queNoFunciono: 'Sin contratiempos registrados.',
      oportunidadesMejora: 'Ofrecer vehículo adicional al cliente.',
      actualizarTarifasCostos: false,
      controlesGerenciales: {
        comercial: true,
        operativo: true,
        financiero: true,
        vehiculo: true,
        estrategico: true,
      },
    };

    setServices((prev) => [newRecord, ...prev]);
    setSelectedServiceId(newRecord.id);
    setWizardInitialStage(initialStage);
    setActiveTab('evaluator');
  };

  const handleSaveService = (updated: ServiceRecord) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }
      return [updated, ...prev];
    });
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY_SERVICES);
    setServices(INITIAL_SERVICES);
    setSelectedServiceId(INITIAL_SERVICES[0].id);
  };

  const currentService =
    services.find((s) => s.id === selectedServiceId) || services[0] || INITIAL_SERVICES[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Zone 1 (1-line Brand) — Zone 2 (5 concise single-line nav links) — Zone 3 (1 primary CTA) */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        <a
          href="#flowchart"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('flowchart');
          }}
          className="whitespace-nowrap shrink-0"
        >
          <SerjeauLogo variant="topbar" />
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          {[
            { id: 'flowchart', label: 'Flujograma' },
            { id: 'evaluator', label: 'Evaluador y Cotizador' },
            { id: 'services', label: 'Expedientes' },
            { id: 'fleet', label: 'Flota y Análisis' },
            { id: 'kpis', label: 'Indicadores KPI' },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab(item.id as ActiveTab);
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === item.id
                  ? 'text-slate-900 border-amber-500 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleStartNewService(1)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + Nueva Oportunidad
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar (visible only on small viewports) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {[
            { id: 'flowchart', label: 'Flujograma' },
            { id: 'evaluator', label: 'Evaluador' },
            { id: 'services', label: 'Expedientes' },
            { id: 'fleet', label: 'Flota' },
            { id: 'kpis', label: 'KPIs' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
        {activeTab === 'flowchart' && (
          <InteractiveFlowchart
            services={services}
            fleet={fleet}
            onSelectService={handleSelectService}
            onStartNewService={handleStartNewService}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'evaluator' && (
          <DecisionWizard
            key={`${currentService.id}-${wizardInitialStage}`}
            service={currentService}
            fleet={fleet}
            initialStage={wizardInitialStage}
            onSaveService={handleSaveService}
            onCancel={() => setActiveTab('services')}
          />
        )}

        {activeTab === 'services' && (
          <ServicesPipelineView
            services={services}
            fleet={fleet}
            onSelectService={handleSelectService}
            onStartNewService={() => handleStartNewService(1)}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetAndAnalysisView
            fleet={fleet}
            services={services}
            onSelectService={handleSelectService}
          />
        )}

        {activeTab === 'kpis' && (
          <KpiDashboardView
            services={services}
            fleet={fleet}
            onSelectService={handleSelectService}
          />
        )}
      </main>

      {/* Footer with SERJEAU Moto & Data Reset */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-6 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <SerjeauLogo variant="full" />

          <div className="text-left sm:text-right space-y-1">
            <div className="text-sm font-bold italic text-amber-700">
              “Disciplina en las decisiones, resultados en el camino.”
            </div>
            <div className="flex items-center sm:justify-end gap-3 text-xs text-slate-500">
              <span>Flota Objetivo: 5 Logans · 2 Dusters · 1 Van</span>
              <span>·</span>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Restaurar datos base
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
