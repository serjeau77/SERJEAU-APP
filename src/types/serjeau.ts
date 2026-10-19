export type VehicleType = 'Logan' | 'Duster' | 'Van';

export type ServiceType = 'Ruta Empresarial' | 'Contrato Mensual' | 'Evento Especial' | 'Traslado Aeropuerto / VIP';

export type FlowStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ServiceStatus =
  | 'En Evaluacion'
  | 'Rechazado Capacidad'
  | 'Renegociacion Margen'
  | 'Renegociacion Pago'
  | 'Aprobado'
  | 'En Ejecucion'
  | 'Facturado / Por Cobrar'
  | 'Cerrado / Escalado'
  | 'Ajustar o Finalizar';

export type ClientType = 'Empresa' | 'Particular';

export type PaymentMethod = 'Contado / Transferencia' | 'Anticipo 50% + Saldo Contraentrega' | 'Crédito 15 días' | 'Crédito 30 días' | 'Crédito 45+ días';

export type RouteRiskLevel = 'Bajo' | 'Medio' | 'Alto';

export type RetentionAction = 'Continuar y escalar' | 'Ajustar condiciones' | 'Finalizar servicio' | 'Pendiente';

export interface CostBreakdown {
  conductorPct: number; // default 25%
  conductorCost: number;
  combustible: number;
  peajes: number;
  seguridadSocial: number;
  mantenimiento: number;
  impuestos: number;
  cuotaFinanciacion: number;
  otros: number; // lavado, imprevistos
}

export interface ManagerialControlsCheck {
  comercial: boolean; // 1. ¿Vale la pena aceptar este cliente/contrato?
  operativo: boolean; // 2. ¿Podemos prestar el servicio sin afectar otras rutas?
  financiero: boolean; // 3. ¿Cuánto dinero realmente deja?
  vehiculo: boolean; // 4. ¿El carro está produciendo lo que debería?
  estrategico: boolean; // 5. ¿Este servicio ayuda a crecer y cumplir la meta?
}

export interface ServiceRecord {
  id: string;
  code: string;
  createdAt: string;
  currentStage: FlowStage;
  status: ServiceStatus;

  // PASO 1: Captación de Servicio & Decisión Clave
  clienteNombre: string;
  contactoNombre: string;
  contactoTelefono: string;
  tipoServicio: ServiceType;
  fechaServicio: string;
  horario: string;
  frecuenciaMensual: number; // cuántos viajes/días al mes representa
  origen: string;
  destino: string;
  requerimientosEspeciales: string;
  // Criterios de evaluación Paso 1 (1-5)
  criterioRentabilidad: number;
  criterioReputacionCliente: number;
  criterioRiesgoPago: number;
  criterioAjusteCapacidad: number;
  criterioAlineacionEstrategia: number;
  // Rombo 1: ¿Tenemos capacidad?
  tieneCapacidad: boolean;
  motivoCapacidad: string;

  // PASO 2: Evaluar y Cotizar (Análisis del servicio + Costo Total)
  kilometrajeTotal: number; // km por servicio o mes según tarifa
  tiempoEstimadoHoras: number;
  tipoVehiculoRequerido: VehicleType;
  numeroPasajeros: number;
  riesgoRuta: RouteRiskLevel;
  tarifaServicio: number; // Ingresos esperados en COP
  costosEstimados: CostBreakdown;
  margenMinimoEsperadoPct: number; // ej. 22%
  // Rombo 2: ¿Deja margen suficiente?
  dejaMargenSuficiente: boolean;
  notasNegociacionMargen: string;

  // PASO 3: Aprobación del Servicio (Validar cliente / contrato)
  tipoCliente: ClientType;
  formaPago: PaymentMethod;
  diasPlazoPago: number;
  tieneAnticipoGarantia: boolean;
  porcentajeAnticipo: number;
  documentacionLegalAlDia: boolean; // Contrato, FUEC, RUT, Cámara de Comercio
  penalidadesClaras: boolean;
  // Rombo 3: ¿Condiciones de pago son seguras?
  condicionesPagoSeguras: boolean;
  aprobadoPorGerencia: string;

  // PASO 4: Ejecutar el Servicio (Operación diaria + Control en ruta)
  vehiculoId: string;
  conductorId: string;
  estadoVehiculoOk: boolean;
  disponibilidadConductorOk: boolean;
  documentacionVehiculoAlDia: boolean; // SOAT, Tecnomecánica, Tarjeta Operación, FUEC
  kmRecorridosReales: number;
  combustibleReal: number;
  horasTrabajadasReales: number;
  incidentesNovedades: string;
  cumplimientoRutaPct: number;

  // PASO 5: Facturar y Cobrar (Cierre del servicio)
  numeroFactura: string;
  facturaEnviada: boolean;
  pagoConfirmado: boolean;
  registradoEnSistema: boolean;
  diasRealesRecaudo: number;
  consistenteConPactado: boolean;
  sinCarteraPendiente: boolean;

  // PASO 6: Evaluar Rentabilidad (Análisis financiero)
  ingresosReales: number;
  costosReales: CostBreakdown;
  satisfaccionClienteNPS: number; // 0 a 100 o escala 1-10
  desempenoConductorCalificacion: number; // 1 a 5
  // Rombo 4: ¿Mantener / Modificar / Eliminar el servicio?
  decisionContinuidad: RetentionAction;

  // PASO 7: Aprendizaje y Mejora Continua
  queFunciono: string;
  queNoFunciono: string;
  oportunidadesMejora: string;
  actualizarTarifasCostos: boolean;

  // Los 5 Controles Gerenciales
  controlesGerenciales: ManagerialControlsCheck;
}

export interface FleetVehicle {
  id: string;
  placa: string;
  nombre: string;
  tipo: VehicleType;
  modelo: number;
  capacidadPasajeros: number;
  conductorAsignado: string;
  conductorId: string;
  metaProduccionMensual: number; // Logan: $7.000.000 / mes
  consumoCombustibleKm: number; // COP por km estimado
  costoMantenimientoKm: number; // COP por km estimado
  cuotaFinanciacionMensual: number;
  estadoOperativo: 'Disponible' | 'En Ruta' | 'Mantenimiento';
  utilizacionPct: number;
  cumplimientoRutasPct: number;
  ausentismoConductorPct: number;
}
