import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Appointment, endTime, localDate, Status } from '../../core/models/agenda.model';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-agenda-page',
  imports: [CommonModule, FormsModule, RouterLink, Icon],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
})
export class AgendaPage {
  readonly store = inject(AgendaService);
  readonly month = signal(new Date(this.store.selectedDate() + 'T12:00:00'));
  readonly search = signal('');
  readonly status = signal('Todas');
  readonly cancelId = signal('');
  readonly menuId = signal('');
  readonly end = endTime;
  private readonly injector = inject(Injector);
  private readonly resultsHeading = viewChild<ElementRef<HTMLElement>>('resultsHeading');
  readonly statusLabel = computed(
    () =>
      ({
        Todas: 'Todas las citas',
        Confirmada: 'Citas confirmadas',
        Pendiente: 'Citas pendientes de confirmar',
        Cancelada: 'Citas canceladas',
      })[this.status()] || 'Todas las citas',
  );
  readonly appointments = computed(() =>
    this.store
      .state()
      .appointments.filter(
        (a) =>
          a.date === this.store.selectedDate() &&
          (this.status() === 'Todas' || a.status === this.status()) &&
          `${a.client} ${a.service} ${a.manicurist}`
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => a.time.localeCompare(b.time)),
  );
  readonly daily = computed(() =>
    this.store.state().appointments.filter((a) => a.date === this.store.selectedDate()),
  );
  readonly counts = computed(() => ({
    confirmed: this.daily().filter((a) => a.status === 'Confirmada').length,
    pending: this.daily().filter((a) => a.status === 'Pendiente').length,
    cancelled: this.daily().filter((a) => a.status === 'Cancelada').length,
  }));
  readonly days = computed(() => {
    const m = this.month();
    const offset = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(m.getFullYear(), m.getMonth(), i - offset + 1);
      const date = localDate(d);
      return {
        date,
        day: d.getDate(),
        current: d.getMonth() === m.getMonth(),
        today: date === localDate(),
        count: this.store
          .state()
          .appointments.filter((a) => a.date === date && a.status !== 'Cancelada').length,
      };
    });
  });

  showStatus(status: Status) {
    this.status.set(status);
    // The summary counts all appointments for the day, so clear any previous search.
    this.search.set('');
    this.menuId.set('');
    this.cancelId.set('');
    afterNextRender(
      () => {
        const heading = this.resultsHeading()?.nativeElement;
        heading?.scrollIntoView?.({
          block: 'start',
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
        heading?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  shiftMonth(n: number) {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + n, 1));
  }
  today() {
    this.store.selectedDate.set(localDate());
    this.month.set(new Date());
  }
  async change(a: Appointment, status: Appointment['status']) {
    if (await this.store.saveAppointment({ ...a, status })) {
      this.cancelId.set('');
      this.menuId.set('');
      this.store.message.set(
        status === 'Cancelada'
          ? 'Cita cancelada. Su horario quedó disponible.'
          : 'Cita confirmada.',
      );
    }
  }
  async remind(a: Appointment) {
    await this.store.command(
      { action: 'remind', payload: { id: a.id } },
      'Recordatorio interno creado. El envío a la clienta es manual.',
    );
    this.menuId.set('');
  }
  async attendance(a: Appointment, value: Appointment['attendance']) {
    if (await this.store.saveAppointment({ ...a, attendance: value })) this.menuId.set('');
  }
  exportList() {
    const rows = this.appointments().map((a) => [
      a.client,
      a.date,
      a.time,
      endTime(a),
      a.service,
      a.manicurist || 'Sin asignar',
      a.status,
      a.attendance,
    ]);
    const csv =
      '\uFEFF' +
      [
        [
          'Clienta ficticia',
          'Fecha',
          'Inicio',
          'Fin con preparación',
          'Servicio',
          'Manicurista',
          'Estado',
          'Asistencia',
        ],
        ...rows,
      ]
        .map((row) =>
          row.map((cell) => '"' + cell.replace(/"/g, '""').replace(/^[=+@-]/, "'") + '"').join(','),
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `citas-${this.store.selectedDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
