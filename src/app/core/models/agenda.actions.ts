import {
  AgendaState,
  Appointment,
  Client,
  Design,
  normalizeName,
  Notice,
  conflicts,
  validateAppointment,
  Manicurist,
  Service,
  ServiceTime,
  isMoney,
} from './agenda.model';

export type AgendaCommand =
  | { action: 'save'; payload: Appointment }
  | { action: 'read'; payload: { id?: string } }
  | { action: 'remind'; payload: { id: string } }
  | { action: 'save-client'; payload: Client }
  | { action: 'save-design'; payload: Design }
  | { action: 'save-manicurist'; payload: Manicurist }
  | { action: 'save-service'; payload: Service }
  | { action: 'save-time'; payload: ServiceTime };

function requireId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !id.trim() || id.length > 100)
    throw new Error('Identificador inválido.');
}

// The same rules are used by the browser and the server.
export function applyCommand(
  old: AgendaState,
  command: AgendaCommand,
  id: () => string,
  now: () => string,
): AgendaState {
  let manicurists = [...old.manicurists];
  let services = [...old.services];
  let times = [...old.times];
  let appointments = [...old.appointments];
  let notices = [...old.notices];
  let clients = old.clients.map((c) => ({ ...c }));
  let designs = [...old.designs];
  const notice = (a: Appointment, message: string, kind: Notice['kind'] = 'success'): Notice => ({
    id: id(),
    appointmentId: a.id,
    message: `${message}: ${a.client} · ${a.date} a las ${a.time} · ${a.manicurist || 'Sin asignar'}.`,
    createdAt: now(),
    read: false,
    kind,
  });
  switch (command.action) {
    case 'save': {
      const payload = command.payload;
      requireId(payload?.id);
      const a: Appointment = {
        id: payload.id,
        clientId: payload.clientId,
        client: payload.client,
        manicurist: payload.manicurist,
        manicuristId: payload.manicuristId,
        serviceId: payload.serviceId,
        timeId: payload.timeId,
        totalPrice: payload.totalPrice,
        date: payload.date,
        time: payload.time,
        service: payload.service,
        duration: payload.duration,
        buffer: payload.buffer,
        deposit: payload.deposit,
        balancePaid: payload.balancePaid,
        attendance: payload.attendance,
        notes: payload.notes,
        status: payload.status,
      };
      const previous = appointments.find((x) => x.id === a.id);
      if (!a.manicuristId) throw new Error('Selecciona una manicurista del catálogo.');
      if (!a.serviceId) throw new Error('Selecciona un servicio del catálogo.');
      requireId(a.manicuristId);
      requireId(a.serviceId);
      const professional = manicurists.find((m) => m.id === a.manicuristId);
      const service = services.find((s) => s.id === a.serviceId);
      if (!professional || (!professional.active && previous?.manicuristId !== professional.id))
        throw new Error('Selecciona una manicurista activa del catálogo.');
      if (!service || (!service.active && previous?.serviceId !== service.id))
        throw new Error('Selecciona un servicio activo del catálogo.');
      if (a.timeId) {
        requireId(a.timeId);
        const time = times.find((t) => t.id === a.timeId);
        const previousTime = previous?.timeId
          ? times.find((t) => t.id === previous.timeId)
          : undefined;
        if (!time || (!time.active && !previousTime))
          throw new Error('Selecciona una duración activa del catálogo de tiempos.');
        // The booking keeps an immutable snapshot of the agreed duration, like the service name:
        // only a new booking or a newly chosen time copies the duration from the catalog.
        if (!previous || previous.timeId !== a.timeId) a.duration = time.duration;
        // The preparation (buffer) is variable per booking: it comes from the form,
        // prefilled with the catalog time's buffer.
        if (typeof a.buffer !== 'number' || !Number.isInteger(a.buffer) || a.buffer < 0)
          a.buffer = time.buffer;
      }
      a.manicurist = professional.name;
      a.service = service.name;
      const validation = validateAppointment(a);
      if (validation) throw new Error(validation);
      a.client = a.client.trim();
      a.manicurist = a.manicurist.trim();

      if (!previous && a.status !== 'Pendiente')
        throw new Error('Guarda la cita antes de confirmarla.');
      if (
        previous?.attendance !== undefined &&
        previous.attendance !== 'Sin registrar' &&
        a.status === 'Cancelada'
      )
        throw new Error(
          'Esta cita ya tiene asistencia registrada. Corrige la asistencia antes de cancelarla.',
        );
      if (a.status !== 'Cancelada' && conflicts(a, appointments))
        throw new Error(
          'Esta manicurista ya tiene una cita en ese horario, incluyendo su preparación. Elige otra hora o manicurista.',
        );
      if (!previous && appointments.length >= 1000)
        throw new Error('La demostración alcanzó su capacidad de citas.');
      if (a.clientId && !clients.some((c) => c.id === a.clientId))
        throw new Error('La clienta seleccionada ya no está disponible.');
      let client =
        clients.find((c) => c.id === a.clientId) ??
        clients.find((c) => normalizeName(c.name) === normalizeName(a.client));
      if (!client) {
        if (clients.length >= 1000)
          throw new Error('La demostración alcanzó su capacidad de clientas.');
        client = { id: id(), name: a.client, description: '', createdAt: now() };
        clients.push(client);
      }
      a.createdAt = previous?.createdAt || now();
      a.updatedAt = now();
      a.clientId = client.id;
      a.client = client.name;
      appointments = [...appointments.filter((x) => x.id !== a.id), a];
      notices.unshift(
        notice(
          a,
          !previous
            ? 'Cita registrada'
            : a.status === 'Cancelada'
              ? 'Cita cancelada'
              : a.status === 'Confirmada' && previous.status !== a.status
                ? 'Cita confirmada'
                : 'Cita actualizada',
          a.status === 'Cancelada' ? 'cancel' : 'success',
        ),
      );
      break;
    }
    case 'read': {
      const noticeId = command.payload?.id;
      if (noticeId !== undefined) requireId(noticeId);
      notices = notices.map((n) => (!noticeId || n.id === noticeId ? { ...n, read: true } : n));
      break;
    }
    case 'remind': {
      requireId(command.payload?.id);
      const a = appointments.find((x) => x.id === command.payload.id && x.status !== 'Cancelada');
      if (!a) throw new Error('No se encontró una cita activa.');
      notices.unshift(notice(a, 'Recordatorio interno pendiente de envío manual', 'reminder'));
      break;
    }
    case 'save-client': {
      const c = command.payload;
      requireId(c?.id);
      if (
        typeof c.name !== 'string' ||
        !c.name.trim() ||
        c.name.length > 60 ||
        typeof c.description !== 'string' ||
        c.description.length > 500
      )
        throw new Error('Revisa el nombre y la descripción de la clienta.');
      if (clients.some((x) => x.id !== c.id && normalizeName(x.name) === normalizeName(c.name)))
        throw new Error('Ya existe una clienta con ese nombre o código.');
      if (!clients.some((x) => x.id === c.id) && clients.length >= 1000)
        throw new Error('La demostración alcanzó su capacidad de clientas.');
      const cleaned = {
        id: c.id,
        name: c.name.trim(),
        description: c.description.trim(),
        createdAt: clients.find((x) => x.id === c.id)?.createdAt || now(),
      };
      clients = [...clients.filter((x) => x.id !== c.id), cleaned];
      appointments = appointments.map((a) =>
        a.clientId === c.id ? { ...a, client: cleaned.name } : a,
      );
      break;
    }
    case 'save-design': {
      const d = command.payload;
      requireId(d?.serviceId);
      const selectedService = services.find((s) => s.id === d.serviceId && s.active);
      if (!selectedService) throw new Error('Selecciona un servicio activo.');
      if (
        d.appointmentId &&
        !appointments.some(
          (a) =>
            a.id === d.appointmentId && a.clientId === d.clientId && a.serviceId === d.serviceId,
        )
      )
        throw new Error('La cita seleccionada debe corresponder a esa clienta y servicio.');
      requireId(d?.id);
      requireId(d.clientId);
      if (!clients.some((c) => c.id === d.clientId))
        throw new Error('Selecciona una clienta registrada.');
      if (
        typeof d.note !== 'string' ||
        d.note.length > 500
      )
        throw new Error('Revisa el servicio y la nota del diseño.');
      // Only small raster images are accepted; never HTML or SVG data URLs.
      if (
        typeof d.image !== 'string' ||
        d.image.length > 350000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(d.image)
      )
        throw new Error('Agrega una fotografía JPG, PNG o WebP de hasta 250 KB.');
      if (designs.some((x) => x.id === d.id)) throw new Error('Este diseño ya se guardó.');
      if (designs.length >= 30) throw new Error('La demostración permite hasta 30 diseños.');
      designs = [
        {
          id: d.id,
          clientId: d.clientId,
          service: selectedService.name,
          serviceId: selectedService.id,
          ...(d.appointmentId ? { appointmentId: d.appointmentId } : {}),
          note: d.note.trim(),
          image: d.image,
          createdAt: now(),
        },
        ...designs,
      ];
      break;
    }
    case 'save-manicurist': {
      const p = command.payload;
      requireId(p?.id);
      if (
        typeof p.name !== 'string' ||
        !p.name.trim() ||
        p.name.length > 60 ||
        typeof p.active !== 'boolean'
      )
        throw new Error('Revisa el nombre y el estado de la manicurista.');
      if (manicurists.some((m) => m.id !== p.id && normalizeName(m.name) === normalizeName(p.name)))
        throw new Error('Ya existe una manicurista con ese nombre.');
      const saved = {
        id: p.id,
        name: p.name.trim(),
        active: p.active,
        createdAt: manicurists.find((m) => m.id === p.id)?.createdAt || now(),
      };
      manicurists = [...manicurists.filter((m) => m.id !== p.id), saved];
      appointments = appointments.map((a) =>
        a.manicuristId === p.id ? { ...a, manicurist: saved.name } : a,
      );
      break;
    }
    case 'save-service': {
      const s = command.payload;
      requireId(s?.id);
      if (
        typeof s.name !== 'string' ||
        !s.name.trim() ||
        s.name.length > 80 ||
        typeof s.active !== 'boolean' ||
        !isMoney(s.basePrice)
      )
        throw new Error('Revisa el nombre, precio y estado del servicio.');
      if (s.defaultTimeId) {
        requireId(s.defaultTimeId);
        const previousService = services.find((x) => x.id === s.id);
        const time = times.find((t) => t.id === s.defaultTimeId);
        const previousTime = previousService?.defaultTimeId
          ? times.find((t) => t.id === previousService.defaultTimeId)
          : undefined;
        if (!time || (!time.active && !previousTime))
          throw new Error('Selecciona un tiempo activo del catálogo.');
      }
      if (services.some((x) => x.id !== s.id && normalizeName(x.name) === normalizeName(s.name)))
        throw new Error('Ya existe un servicio con ese nombre.');
      const saved: Service = {
        id: s.id,
        name: s.name.trim(),
        basePrice: s.basePrice,
        ...(s.defaultTimeId ? { defaultTimeId: s.defaultTimeId } : {}),
        active: s.active,
        createdAt: services.find((x) => x.id === s.id)?.createdAt || now(),
      };
      services = [...services.filter((x) => x.id !== s.id), saved];
      // A catalog edit changes display names, never the price and time already agreed in a booking.
      appointments = appointments.map((a) =>
        a.serviceId === s.id ? { ...a, service: saved.name } : a,
      );
      designs = designs.map((d) => (d.serviceId === s.id ? { ...d, service: saved.name } : d));
      break;
    }
    case 'save-time': {
      const t = command.payload;
      requireId(t?.id);
      if (
        typeof t.label !== 'string' ||
        !t.label.trim() ||
        t.label.length > 40 ||
        typeof t.duration !== 'number' ||
        t.duration <= 0 ||
        t.duration > 8 ||
        !Number.isInteger(t.buffer) ||
        t.buffer < 0 ||
        t.buffer > 120 ||
        typeof t.active !== 'boolean'
      )
        throw new Error(
          'Revisa la etiqueta, duración (0.25–8 horas) y preparación (0–120 min) del tiempo.',
        );
      const key = (d: number, b: number) => `${Math.round(d * 60)}:${b}`;
      if (times.some((x) => x.id !== t.id && key(x.duration, x.buffer) === key(t.duration, t.buffer)))
        throw new Error('Ya existe un tiempo con esa duración y preparación.');
      const saved: ServiceTime = {
        id: t.id,
        label: t.label.trim(),
        duration: t.duration,
        buffer: t.buffer,
        active: t.active,
        createdAt: times.find((x) => x.id === t.id)?.createdAt || now(),
      };
      times = [...times.filter((x) => x.id !== t.id), saved];
      // Bookings keep their own duration/buffer snapshot; editing the catalog never rewrites them.
      break;
    }
    default:
      throw new Error('Acción inválida.');
  }
  return { appointments, notices, clients, designs, manicurists, services, times };
}
