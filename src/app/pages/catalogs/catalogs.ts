import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { AgendaService } from '../../core/services/agenda.service';
import { Manicurist, Service, ServiceTime, formatHours } from '../../core/models/agenda.model';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-catalogs',
  imports: [FormsModule, CurrencyPipe, Icon],
  templateUrl: './catalogs.html',
  styleUrl: './catalogs.css',
})
export class CatalogsPage {
  readonly store = inject(AgendaService);
  readonly durationOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 8];
  professional: Manicurist = { id: '', name: '', active: true };
  service: Service = { id: '', name: '', basePrice: 0, active: true };
  time: ServiceTime = { id: '', label: '', duration: 1, buffer: 15, active: true };
  editProfessional(m: Manicurist) {
    this.professional = { ...m };
  }
  editService(s: Service) {
    this.service = { ...s };
  }
  editTime(t: ServiceTime) {
    this.time = { ...t };
  }
  resetProfessional() {
    this.professional = { id: '', name: '', active: true };
  }
  resetService() {
    this.service = { id: '', name: '', basePrice: 0, active: true };
  }
  resetTime() {
    this.time = { id: '', label: '', duration: 1, buffer: 15, active: true };
  }
  timeLabel(id?: string): string {
    const t = this.store.state().times.find((t) => t.id === id);
    return t ? `${t.label} + ${t.buffer} min` : 'Sin tiempo sugerido';
  }
  async saveProfessional() {
    if (
      await this.store.command(
        {
          action: 'save-manicurist',
          payload: { ...this.professional, id: this.professional.id || crypto.randomUUID() },
        },
        'Manicurista guardada.',
      )
    )
      this.resetProfessional();
  }
  async saveService() {
    if (
      await this.store.command(
        {
          action: 'save-service',
          payload: { ...this.service, id: this.service.id || crypto.randomUUID() },
        },
        'Servicio guardado. Las citas anteriores conservan su precio y duración.',
      )
    )
      this.resetService();
  }
  async saveTime() {
    const label = this.time.label.trim() || formatHours(this.time.duration);
    if (
      await this.store.command(
        {
          action: 'save-time',
          payload: { ...this.time, label, id: this.time.id || crypto.randomUUID() },
        },
        'Tiempo guardado. Las citas anteriores conservan su duración acordada.',
      )
    )
      this.resetTime();
  }
}
