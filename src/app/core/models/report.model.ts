import { Appointment } from './agenda.model';

export function summarizeAppointments(all: Appointment[], from: string, to: string) {
  const appointments = all.filter((a) => a.date >= from && a.date <= to);
  const attended = appointments.filter(
    (a) => a.status !== 'Cancelada' && a.attendance === 'Asistió',
  ).length;
  const absent = appointments.filter(
    (a) => a.status !== 'Cancelada' && a.attendance === 'No asistió',
  ).length;
  const pending = appointments.filter((a) => a.status === 'Pendiente').length;
  const cancelled = appointments.filter((a) => a.status === 'Cancelada').length;
  const unrecorded = appointments.length - attended - absent - pending - cancelled;
  const received = appointments.reduce((sum, a) => sum + a.deposit + a.balancePaid, 0);
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => {
    const dayAppointments = appointments.filter(
      (a) => (new Date(a.date + 'T12:00:00').getDay() + 6) % 7 === index,
    );
    return {
      label,
      total: dayAppointments.length,
      attended: dayAppointments.filter(
        (a) => a.attendance === 'Asistió' && a.status !== 'Cancelada',
      ).length,
    };
  });
  return {
    total: appointments.length,
    attended,
    absent,
    pending,
    cancelled,
    unrecorded,
    received,
    days,
  };
}
