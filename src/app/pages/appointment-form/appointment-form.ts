import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Appointment, ServiceTime, endTime } from '../../core/models/agenda.model';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-appointment-form',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './appointment-form.html',
  styleUrl: './appointment-form.css',
})
export class AppointmentFormPage {
  readonly store = inject(AgendaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly editId = this.route.snapshot.paramMap.get('id');
  readonly missing = signal(false);
  readonly services = computed(() =>
    this.store
      .state()
      .services.filter(
        (s) =>
          s.active ||
          s.id === this.store.state().appointments.find((a) => a.id === this.editId)?.serviceId,
      ),
  );
  readonly manicurists = computed(() =>
    this.store
      .state()
      .manicurists.filter(
        (m) =>
          m.active ||
          m.id === this.store.state().appointments.find((a) => a.id === this.editId)?.manicuristId,
      ),
  );
  readonly times = computed(() =>
    this.store
      .state()
      .times.filter(
        (t) =>
          t.active ||
          t.id === this.store.state().appointments.find((a) => a.id === this.editId)?.timeId,
      ),
  );
  // The duration select shows one option per distinct duration; its buffer only
  // prefills the separate, editable preparation field.
  readonly durationOptions = computed(() => {
    const byDuration = new Map<number, ServiceTime>();
    for (const t of this.times()) if (!byDuration.has(t.duration)) byDuration.set(t.duration, t);
    return [...byDuration.values()].sort((a, b) => a.duration - b.duration);
  });
  readonly end = endTime;
  private initialized = false;
  form: Appointment = {
    id: '',
    client: '',
    manicurist: '',
    manicuristId: '',
    serviceId: '',
    service: '',
    timeId: '',
    date: this.store.selectedDate(),
    time: '09:00',
    duration: 0.75,  // 45 minutos = 0.75 horas (instantánea de la cita)
    buffer: 15,
    totalPrice: undefined,
    deposit: 0,
    balancePaid: 0,
    attendance: 'Sin registrar',
    notes: '',
    status: 'Pendiente',
  };
  constructor() {
    this.store.clearFeedback();
    effect(() => {
      if (!this.store.ready() || this.initialized) return;
      this.initialized = true;
      if (this.editId) {
        const found = this.store.state().appointments.find((a) => a.id === this.editId);
        if (found) this.form = { ...found };
        else this.missing.set(true);
      } else {
        const c = this.store
          .state()
          .clients.find((c) => c.id === this.route.snapshot.queryParamMap.get('client'));
        if (c) {
          this.form.clientId = c.id;
          this.form.client = c.name;
        }
      }
    });
  }
  clientChanged() {
    this.form.clientId = this.store.state().clients.find((c) => c.name === this.form.client)?.id;
  }
  selectService(id: string) {
    this.form.serviceId = id;
    const s = this.store.state().services.find((s) => s.id === id);
    if (s) {
      this.form.service = s.name;
      this.form.totalPrice = s.basePrice;
      if (s.defaultTimeId) this.selectTime(s.defaultTimeId);
      else this.form.timeId = '';
    }
  }
  selectTime(id: string) {
    const t = this.store.state().times.find((t) => t.id === id);
    if (t) {
      this.form.timeId = t.id;
      this.form.duration = t.duration;
      this.form.buffer = t.buffer;
    }
  }
  selectManicurist(id: string) {
    this.form.manicuristId = id;
    this.form.manicurist = this.store.state().manicurists.find((m) => m.id === id)?.name || '';
  }
  received() {
    return (
      Math.round((Number(this.form.deposit || 0) + Number(this.form.balancePaid || 0)) * 100) / 100
    );
  }
  remaining() {
    return Math.round((Number(this.form.totalPrice || 0) - this.received()) * 100) / 100;
  }
  
  formatDuration(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours % 1) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
  async save() {
    if (!this.form.serviceId || !this.form.manicuristId) {
      this.store.error.set('Selecciona un servicio y una manicurista del catálogo.');
      return;
    }
    if (!this.form.timeId) {
      this.store.error.set('Selecciona una duración del catálogo de tiempos.');
      return;
    }
    const a = { ...this.form, id: this.form.id || crypto.randomUUID() };
    if (await this.store.saveAppointment(a)) {
      this.store.selectedDate.set(a.date);
      await this.router.navigate(['/agenda']);
    }
  }
}
