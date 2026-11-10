import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaService } from '../../core/services/agenda.service';
import { localDate } from '../../core/models/agenda.model';
import { summarizeAppointments } from '../../core/models/report.model';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-reports-page',
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class ReportsPage {
  readonly store = inject(AgendaService);
  readonly from = signal(localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly to = signal(localDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
  readonly preset = signal('month');
  readonly report = computed(() =>
    summarizeAppointments(this.store.state().appointments, this.from(), this.to()),
  );
  readonly max = computed(() => Math.max(1, ...this.report().days.map((d) => d.total)));
  readonly segments = computed(() => {
    const r = this.report();
    return [
      { label: 'Asistió', count: r.attended, color: '#9caa8a' },
      { label: 'No asistió', count: r.absent, color: '#c68e80' },
      { label: 'Pendiente de confirmar', count: r.pending, color: '#d7bc85' },
      { label: 'Confirmada sin asistencia registrada', count: r.unrecorded, color: '#c7b7a9' },
      { label: 'Cancelada', count: r.cancelled, color: '#e8d4c9' },
    ];
  });
  readonly donut = computed(() => {
    const total = this.report().total;
    if (!total) return '#efe6dd';
    let start = 0;
    const segments = this.segments().map((s) => {
      const end = start + (s.count / total) * 100;
      const value = `${s.color} ${start}% ${end}%`;
      start = end;
      return value;
    });
    return `conic-gradient(${segments.join(',')})`;
  });
  period(value: string) {
    const today = new Date();
    if (value === 'week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      this.from.set(localDate(monday));
      this.to.set(localDate(sunday));
    } else {
      this.from.set(localDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      this.to.set(localDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    }
    this.preset.set(value);
  }
}
