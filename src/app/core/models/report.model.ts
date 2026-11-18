import { Appointment } from './agenda.model';

export function summarizeAppointments(all: Appointment[], from: string, to: string) {
  const appointments = all.filter((a) => a.date >= from && a.date <= to);
  const pending = appointments.filter((a) => a.status === 'Pendiente').length;
  const confirmed = appointments.filter((a) => a.status === 'Confirmada').length;
  const cancelled = appointments.filter((a) => a.status === 'Cancelada').length;
  const received = appointments.reduce((sum, a) => sum + a.deposit + a.balancePaid, 0);
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => {
    const dayAppointments = appointments.filter(
      (a) => (new Date(a.date + 'T12:00:00').getDay() + 6) % 7 === index,
    );
    return {
      label,
      total: dayAppointments.length,
    };
  });
  return {
    total: appointments.length,
    pending,
    confirmed,
    cancelled,
    received,
    days,
  };
}
