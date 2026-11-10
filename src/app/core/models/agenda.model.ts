export type Status = 'Pendiente' | 'Confirmada' | 'Cancelada';
export type Attendance = 'Sin registrar' | 'Asistió' | 'No asistió';

export interface Appointment {
  id: string;
  clientId?: string;
  client: string;
  manicurist: string;
  manicuristId: string;
  serviceId: string;
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
  duration: number;
  buffer: number;
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
export interface AgendaState {
  appointments: Appointment[];
  notices: Notice[];
  clients: Client[];
  designs: Design[];
  manicurists: Manicurist[];
  services: Service[];
}

export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const normalizeName = (name: string) => name.trim().toLocaleLowerCase('es-MX');
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function endTime(a: Appointment): string {
  const end = minutes(a.time) + a.duration + a.buffer;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
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
      minutes(candidate.time) < minutes(a.time) + a.duration + a.buffer &&
      minutes(a.time) < minutes(candidate.time) + candidate.duration + candidate.buffer,
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
    !Number.isInteger(a.duration) ||
    a.duration < 15 ||
    a.duration > 480 ||
    !Number.isInteger(a.buffer) ||
    a.buffer < 0 ||
    a.buffer > 120
  )
    return 'Revisa la duración (15–480 min) y preparación (0–120 min).';
  if (minutes(a.time) < 420 || minutes(a.time) + a.duration + a.buffer > 1260)
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
  return { appointments: [], clients: [], notices: [], designs: [], manicurists: [], services: [] };
}

/** Reads older local demos without discarding records or inventing service prices. */
export function migrateState(raw: Partial<AgendaState>): AgendaState {
  if (!Array.isArray(raw.appointments) || !Array.isArray(raw.notices))
    throw new Error('No se pudieron leer los datos guardados.');
  const manicurists = raw.manicurists ?? [];
  const services = raw.services ?? [];
  const clients: Client[] = Array.isArray(raw.clients) ? raw.clients : [];
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
      balancePaid: a.balancePaid ?? 0,
      attendance: a.attendance ?? 'Sin registrar',
    };
  });
  return {
    appointments,
    manicurists,
    services,
    notices: raw.notices,
    clients,
    designs: Array.isArray(raw.designs) ? raw.designs : [],
  };
}
