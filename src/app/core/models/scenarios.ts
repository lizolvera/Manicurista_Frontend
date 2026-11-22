import type {
  AgendaState,
  Appointment,
  Client,
  Manicurist,
  Service,
  ServiceTime,
} from './agenda.model';

// Día fijo de prueba para que cada restablecimiento deje el estado idéntico.
export const SCENARIO_DATE = '2026-11-25';
export const SCENARIOS = ['T1', 'T2', 'T3', 'T4'] as const;
export type ScenarioId = (typeof SCENARIOS)[number];

export function isScenario(value: unknown): value is ScenarioId {
  return typeof value === 'string' && (SCENARIOS as readonly string[]).includes(value);
}

const CREATED = '2026-11-01T00:00:00.000Z';

const BASE_CLIENTS: Client[] = [
  { id: 'clienta-C01', name: 'C01', description: 'Clienta ficticia del experimento', createdAt: CREATED },
  { id: 'clienta-C02', name: 'C02', description: 'Clienta ficticia del experimento', createdAt: CREATED },
];
const BASE_MANICURISTS: Manicurist[] = [
  { id: 'manicurista-001', name: 'Manicurista 1', active: true, createdAt: CREATED },
];
const BASE_TIMES: ServiceTime[] = [
  { id: 'tiempo-045', label: '45 min', duration: 0.75, buffer: 15, active: true, createdAt: CREATED },
];
const BASE_SERVICES: Service[] = [
  {
    id: 'servicio-001',
    name: 'Servicio demo 45 min',
    basePrice: 350,
    defaultTimeId: 'tiempo-045',
    active: true,
    createdAt: CREATED,
  },
];

// Cita de 45 min + 15 min de preparación: ocupa exactamente una hora (ej. 09:00–10:00).
function scenarioCita(id: string, time: string): Appointment {
  return {
    id,
    clientId: 'clienta-C01',
    client: 'C01',
    manicurist: 'Manicurista 1',
    manicuristId: 'manicurista-001',
    serviceId: 'servicio-001',
    timeId: 'tiempo-045',
    date: SCENARIO_DATE,
    time,
    service: 'Servicio demo 45 min',
    duration: 0.75,
    buffer: 15,
    totalPrice: 350,
    deposit: 0,
    balancePaid: 0,
    attendance: 'Sin registrar',
    notes: '',
    status: 'Pendiente',
    createdAt: CREATED,
    updatedAt: CREATED,
  };
}

/**
 * Estado completo y determinista de un escenario EXP01:
 * T1 y T2 sin citas; T3 con C01 a las 09:00; T4 con C01 a las 10:00.
 */
export function scenarioState(scenario: ScenarioId): AgendaState {
  const appointments: Appointment[] =
    scenario === 'T3'
      ? [scenarioCita('cita-T3-C01', '09:00')]
      : scenario === 'T4'
        ? [scenarioCita('cita-T4-C01', '10:00')]
        : [];
  return {
    appointments,
    notices: [],
    clients: BASE_CLIENTS.map((c) => ({ ...c })),
    designs: [],
    manicurists: BASE_MANICURISTS.map((m) => ({ ...m })),
    services: BASE_SERVICES.map((s) => ({ ...s })),
    times: BASE_TIMES.map((t) => ({ ...t })),
    log: [],
    scenario,
  };
}
