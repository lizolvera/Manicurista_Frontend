import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Appointment, endTime } from '../../core/models/agenda.model';
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
  readonly end = endTime;
  private initialized = false;
  form: Appointment = {
    id: '',
    client: '',
    manicurist: '',
    manicuristId: '',
    serviceId: '',
    service: '',
    date: this.store.selectedDate(),
    time: '09:00',
    duration: 45,
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
      this.form.duration = s.duration;
      this.form.buffer = s.buffer;
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
  async save() {
    if (!this.form.serviceId || !this.form.manicuristId) {
      this.store.error.set('Selecciona un servicio y una manicurista del catálogo.');
      return;
    }
    const a = { ...this.form, id: this.form.id || crypto.randomUUID() };
    if (await this.store.saveAppointment(a)) {
      this.store.selectedDate.set(a.date);
      this.store.message.set(
        this.editId
          ? 'Cita actualizada conservando su identificador.'
          : 'Cita guardada como pendiente en la colección citas.',
      );
      await this.router.navigate(['/agenda']);
    }
  }
}
