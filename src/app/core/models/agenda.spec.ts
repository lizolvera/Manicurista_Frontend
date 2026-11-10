import { AgendaCommand, applyCommand } from './agenda.actions';
import {
  AgendaState,
  Appointment,
  conflicts,
  migrateState,
  validateAppointment,
} from './agenda.model';
import { summarizeAppointments } from './report.model';

const appointment = (changes: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  client: 'C01',
  manicurist: 'Manicurista 1',
  manicuristId: 'manicurista-001',
  serviceId: 'servicio-001',
  totalPrice: 2000,
  date: '2026-11-10',
  time: '09:00',
  service: 'Manicura',
  duration: 45,
  buffer: 15,
  deposit: 0,
  balancePaid: 0,
  attendance: 'Sin registrar',
  notes: '',
  status: 'Pendiente',
  ...changes,
});
const empty = (): AgendaState => ({
  appointments: [],
  notices: [],
  clients: [],
  designs: [],
  manicurists: [
    {
      id: 'manicurista-001',
      name: 'Manicurista 1',
      active: true,
      createdAt: '2026-11-09T18:00:00Z',
    },
    {
      id: 'manicurista-002',
      name: 'Manicurista 2',
      active: true,
      createdAt: '2026-11-09T18:00:00Z',
    },
  ],
  services: [
    {
      id: 'servicio-001',
      name: 'Manicura',
      basePrice: 350,
      duration: 45,
      buffer: 15,
      active: true,
      createdAt: '2026-11-09T18:00:00Z',
    },
  ],
});
let sequence = 0;
const apply = (state: AgendaState, command: AgendaCommand) =>
  applyCommand(
    state,
    command,
    () => `generated-${++sequence}`,
    () => '2026-11-10T12:00:00Z',
  );
const save = (state: AgendaState, a: Appointment) => apply(state, { action: 'save', payload: a });

describe('Disponibilidad por manicurista', () => {
  it('bloquea empalmes y preparación para la misma profesional', () => {
    expect(conflicts(appointment({ id: 'a2', time: '09:45' }), [appointment()])).toBe(true);
  });
  it('normaliza espacios y mayúsculas del nombre', () => {
    expect(
      conflicts(appointment({ id: 'a2', manicurist: ' MANICURISTA 1 ' }), [appointment()]),
    ).toBe(true);
  });
  it('permite horarios contiguos y profesionales diferentes', () => {
    expect(conflicts(appointment({ id: 'a2', time: '10:00' }), [appointment()])).toBe(false);
    expect(
      conflicts(
        appointment({ id: 'a2', manicurist: 'Manicurista 2', manicuristId: 'manicurista-002' }),
        [appointment()],
      ),
    ).toBe(false);
  });
  it('mantiene reservados los intervalos antiguos sin manicurista', () => {
    expect(conflicts(appointment({ id: 'a2' }), [appointment({ manicurist: '' })])).toBe(true);
  });
  it('ignora citas canceladas y la propia cita al editar', () => {
    expect(conflicts(appointment({ id: 'a2' }), [appointment({ status: 'Cancelada' })])).toBe(
      false,
    );
    expect(conflicts(appointment({ time: '09:30' }), [appointment()])).toBe(false);
  });
  it('exige manicurista y valida fecha, duración, horario y asistencia', () => {
    expect(validateAppointment(appointment({ manicurist: '' }))).toContain('manicurista');
    for (const changes of [
      { date: '2026-02-30' },
      { duration: -1 },
      { time: '20:30' },
      { balancePaid: -1 },
      { attendance: 'Asistió' as const },
    ]) {
      expect(validateAppointment(appointment(changes))).not.toBe('');
    }
  });
});

describe('Recorrido persistente de agenda', () => {
  it('registra, confirma, rechaza conflicto y libera al reprogramar y cancelar', () => {
    let state = save(empty(), appointment());
    expect(state.appointments[0].status).toBe('Pendiente');
    state = save(state, { ...state.appointments[0], status: 'Confirmada' });
    expect(() => save(state, appointment({ id: 'a2', time: '09:30' }))).toThrow('horario');
    state = save(state, { ...state.appointments[0], time: '12:00' });
    expect(conflicts(appointment({ id: 'a2' }), state.appointments)).toBe(false);
    expect(state.appointments.length).toBe(1);
    state = save(state, { ...state.appointments[0], status: 'Cancelada' });
    expect(conflicts(appointment({ id: 'a2', time: '12:00' }), state.appointments)).toBe(false);
  });
  it('rechaza confirmar una cita que no se ha guardado', () => {
    expect(() => save(empty(), appointment({ status: 'Confirmada' }))).toThrow(
      'antes de confirmarla',
    );
  });
  it('conserva avisos al marcar leídos y distingue cancelaciones y recordatorios', () => {
    let state = save(empty(), appointment());
    state = apply(state, { action: 'remind', payload: { id: 'a1' } });
    expect(state.notices[0].kind).toBe('reminder');
    state = apply(state, { action: 'read', payload: { id: state.notices[0].id } });
    expect(state.notices[0].read).toBe(true);
    expect(state.notices[1].read).toBe(false);
    state = save(state, { ...state.appointments[0], status: 'Cancelada' });
    expect(state.notices[0].kind).toBe('cancel');
  });
  it('migra citas anteriores sin perder campos ni inventar manicuristas', () => {
    const old = {
      appointments: [
        {
          id: 'old',
          client: 'C01',
          date: '2026-11-10',
          time: '09:00',
          service: 'Manicura',
          duration: 45,
          buffer: 15,
          deposit: 50,
          notes: 'Nota original',
          status: 'Pendiente',
        },
      ],
      notices: [],
    };
    const state = migrateState(old as unknown as Partial<AgendaState>);
    expect(state.appointments[0].notes).toBe('Nota original');
    expect(state.appointments[0].manicurist).toBe('');
    expect(state.appointments[0].deposit).toBe(50);
    expect(state.clients[0].name).toBe('C01');
    expect(migrateState(state).clients.length).toBe(1);
  });
});

describe('Clientas, diseños y reportes', () => {
  it('vincula citas al perfil y actualiza el nombre sin duplicar clientas', () => {
    let state = save(empty(), appointment());
    const c = state.clients[0];
    state = apply(state, {
      action: 'save-client',
      payload: { ...c, name: 'C01 Demo', description: 'Tonos nude' },
    });
    expect(state.appointments[0].client).toBe('C01 Demo');
    expect(state.clients.length).toBe(1);
    state = save(state, appointment({ id: 'a2', client: 'C01 Demo', time: '12:00' }));
    expect(state.clients.length).toBe(1);
  });
  it('no admite nombres duplicados en el directorio', () => {
    const state = save(empty(), appointment());
    expect(() =>
      apply(state, {
        action: 'save-client',
        payload: { id: 'other', name: ' c01 ', description: '' },
      }),
    ).toThrow('Ya existe');
  });
  it('vincula la imagen a la clienta y rechaza formatos activos y clientas inexistentes', () => {
    let state = save(empty(), appointment());
    const design = {
      id: 'd1',
      clientId: state.clients[0].id,
      service: 'Manicura',
      serviceId: 'servicio-001',
      note: 'Rosa suave',
      image: 'data:image/png;base64,aGVsbG8=',
      createdAt: '',
    };
    state = apply(state, { action: 'save-design', payload: design });
    expect(state.designs[0].clientId).toBe(state.clients[0].id);
    expect(state.designs[0].createdAt).toBe('2026-11-10T12:00:00Z');
    expect(() =>
      apply(state, {
        action: 'save-design',
        payload: { ...design, id: 'd2', image: 'data:image/svg+xml;base64,aGVsbG8=' },
      }),
    ).toThrow('fotografía');
    expect(() =>
      apply(state, {
        action: 'save-design',
        payload: { ...design, id: 'd2', clientId: 'missing' },
      }),
    ).toThrow('clienta');
  });
  it('separa falta de confirmación, inasistencia y cobros sin duplicar anticipos', () => {
    const all = [
      appointment({ deposit: 50, balancePaid: 150, attendance: 'Asistió', status: 'Confirmada' }),
      appointment({ id: 'a2', attendance: 'No asistió', status: 'Confirmada' }),
      appointment({ id: 'a3', status: 'Pendiente' }),
      appointment({ id: 'a4', status: 'Cancelada', deposit: 20 }),
      appointment({ id: 'a5', date: '2026-12-01', deposit: 1000 }),
    ];
    const report = summarizeAppointments(all, '2026-11-01', '2026-11-30');
    expect(report.total).toBe(4);
    expect(report.absent).toBe(1);
    expect(report.pending).toBe(1);
    expect(
      report.attended + report.absent + report.pending + report.cancelled + report.unrecorded,
    ).toBe(4);
    expect(report.received).toBe(220);
    expect(report.days.reduce((n, d) => n + d.total, 0)).toBe(4);
  });
});
