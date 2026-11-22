export type Status = 'Pendiente' | 'Confirmada' | 'Cancelada';
export type Attendance = 'Sin registrar' | 'Asistió' | 'No asistió';

export interface Appointment {
  id: string;
  clientId?: string;
  client: string;
  manicurist: string;
  manicuristId: string;
  serviceId: string;
  timeId?: string;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
  date: string;
  time: string;
  service: string;
  duration: number;
  buffer: number;
  deposit: number;
  balancePaid: number;
  attendance: Attendance;
  notes: string;
  status: Status;
}

export interface Manicurist {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
}
export interface Service {
  id: string;
  name: string;
  basePrice: number;
  defaultTimeId?: string;  // Tiempo del catálogo que se sugiere al agendar este servicio
  active: boolean;
  createdAt?: string;
}
export interface ServiceTime {
  id: string;
  label: string;     // ej. "1 hora y media"
  duration: number;  // Duración en HORAS (ej: 1.5 = 1 hora y 30 minutos)
  buffer: number;    // Tiempo de preparación en MINUTOS
  active: boolean;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
}
export interface Design {
  id: string;
  serviceId: string;
  appointmentId?: string;
  clientId: string;
  service: string;
  note: string;
  image: string;
  createdAt: string;
}
export interface Notice {
  id: string;
  appointmentId: string;
  message: string;
  createdAt: string;
  read: boolean;
  kind?: 'success' | 'cancel' | 'reminder';
}
export interface BitacoraEntry {
  id: string;
  timestamp: string;  // ISO 8601 UTC, tal como se capturó
  scenario: string;   // escenario activo ('T1'…'T4') o '' si no hay ninguno
  action: string;     // restablecer-escenario | guardar-cita | confirmar-cita | reprogramar-cita | actualizar-cita | intento-rechazado
  appointmentId: string;
  result: 'ok' | 'error';
  message: string;
}
export interface AgendaState {
  appointments: Appointment[];
  notices: Notice[];
  clients: Client[];
  designs: Design[];
  manicurists: Manicurist[];
  services: Service[];
  times: ServiceTime[];
  log: BitacoraEntry[];
  scenario: string;
}

export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const normalizeName = (name: string) => name.trim().toLocaleLowerCase('es-MX');
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} hora${h > 1 ? 's' : ''} y ${m} min`;
  if (h > 0) return `${h} hora${h > 1 ? 's' : ''}`;
  return `${m} min`;
}
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function endTime(a: Appointment): string {
  const totalMinutes = minutes(a.time) + a.duration * 60 + a.buffer;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
export function conflicts(candidate: Appointment, all: Appointment[]): boolean {
  return all.some(
    (a) =>
      a.id !== candidate.id &&
      a.status !== 'Cancelada' &&
      a.date === candidate.date &&
      // Old appointments without an assigned professional conservatively reserve the slot.
      (!a.manicurist ||
        !candidate.manicurist ||
        (a.manicuristId && candidate.manicuristId
          ? a.manicuristId === candidate.manicuristId
          : normalizeName(a.manicurist) === normalizeName(candidate.manicurist))) &&
      minutes(candidate.time) < minutes(a.time) + a.duration * 60 + a.buffer &&
      minutes(a.time) < minutes(candidate.time) + candidate.duration * 60 + candidate.buffer,
  );
}
export function validateAppointment(a: Appointment): string {
  if (typeof a.client !== 'string' || !a.client.trim() || a.client.length > 60)
    return 'Escribe un nombre o código de clienta de hasta 60 caracteres.';
  if (typeof a.manicurist !== 'string' || !a.manicurist.trim() || a.manicurist.length > 60)
    return 'Indica el nombre de la manicurista que realizará el servicio.';
  if (
    typeof a.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
    Number.isNaN(Date.parse(a.date)) ||
    new Date(a.date + 'T12:00:00Z').toISOString().slice(0, 10) !== a.date
  )
    return 'Selecciona una fecha válida.';
  if (typeof a.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time))
    return 'Selecciona una hora válida.';
  if (
    typeof a.duration !== 'number' ||
    a.duration <= 0 ||
    a.duration > 8 ||
    !Number.isInteger(a.buffer) ||
    a.buffer < 0 ||
    a.buffer > 120
  )
    return 'Revisa la duración (0.25–8 horas) y preparación (0–120 min).';
  if (minutes(a.time) < 420 || minutes(a.time) + a.duration * 60 + a.buffer > 1260)
    return 'La cita y su preparación deben quedar entre las 07:00 y las 21:00.';
  if (!isMoney(a.totalPrice))
    return 'Indica un precio total válido en MXN, con hasta dos decimales.';
  if (Math.round((a.deposit + a.balancePaid) * 100) > Math.round(a.totalPrice! * 100))
    return 'Los pagos recibidos no pueden superar el precio total de la cita.';
  if (![a.deposit, a.balancePaid].every((n) => isMoney(n)))
    return 'Revisa los importes registrados.';
  if (
    !['Pendiente', 'Confirmada', 'Cancelada'].includes(a.status) ||
    !['Sin registrar', 'Asistió', 'No asistió'].includes(a.attendance)
  )
    return 'Estado de cita inválido.';
  if (a.attendance !== 'Sin registrar' && a.status !== 'Confirmada')
    return 'Confirma la cita antes de registrar la asistencia.';
  if (
    typeof a.service !== 'string' ||
    !a.service.trim() ||
    a.service.length > 80 ||
    typeof a.notes !== 'string' ||
    a.notes.length > 500
  )
    return 'Revisa el servicio y las notas de la cita.';
  return '';
}

export function isMoney(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}

export function emptyState(): AgendaState {
  return {
    appointments: [],
    clients: [],
    notices: [],
    designs: [],
    manicurists: [],
    services: [],
    times: [],
    log: [],
    scenario: '',
  };
}

/** Reads older local demos without discarding records or inventing service prices. */
export function migrateState(raw: Partial<AgendaState>): AgendaState {
  if (!Array.isArray(raw.appointments) || !Array.isArray(raw.notices))
    throw new Error('No se pudieron leer los datos guardados.');
  const manicurists = raw.manicurists ?? [];
  const services = (raw.services ?? []).map((s) => ({ ...s }));
  const clients: Client[] = Array.isArray(raw.clients) ? raw.clients : [];
  // Older demos stored duration/buffer inside each service; lift them into the time catalog.
  let times: ServiceTime[] = Array.isArray(raw.times) ? raw.times : [];
  if (!Array.isArray(raw.times)) {
    for (const s of services) {
      const legacy = s as unknown as { duration?: unknown; buffer?: unknown };
      if (typeof legacy.duration === 'number' && typeof legacy.buffer === 'number') {
        let time = times.find(
          (t) => t.duration === legacy.duration && t.buffer === legacy.buffer,
        );
        if (!time) {
          time = {
            id: `legacy-time-${times.length + 1}`,
            label: formatHours(legacy.duration),
            duration: legacy.duration,
            buffer: legacy.buffer,
            active: true,
          };
          times.push(time);
        }
        s.defaultTimeId = time.id;
      }
    }
  }
  const appointments = raw.appointments.map((a) => {
    let client = clients.find(
      (c) => c.id === a.clientId || normalizeName(c.name) === normalizeName(a.client),
    );
    if (!client) {
      client = { id: `legacy-${a.id}`, name: a.client, description: '' };
      clients.push(client);
    }
    return {
      ...a,
      clientId: client.id,
      manicurist: a.manicurist ?? '',
      manicuristId:
        a.manicuristId ??
        manicurists.find((m) => normalizeName(m.name) === normalizeName(a.manicurist || ''))?.id ??
        '',
      serviceId:
        a.serviceId ??
        services.find((s) => normalizeName(s.name) === normalizeName(a.service))?.id ??
        '',
      timeId: a.timeId ?? times.find((t) => t.duration === a.duration && t.buffer === a.buffer)?.id,
      balancePaid: a.balancePaid ?? 0,
      attendance: a.attendance ?? 'Sin registrar',
    };
  });
  const log: BitacoraEntry[] = Array.isArray(raw.log) ? raw.log : [];
  return {
    appointments,
    manicurists,
    services,
    times,
    notices: raw.notices,
    clients,
    designs: Array.isArray(raw.designs) ? raw.designs : [],
    log,
    // El escenario activo se deriva de la última entrada de restablecimiento.
    scenario: log.find((e) => e.action === 'restablecer-escenario')?.scenario ?? '',
  };
}
