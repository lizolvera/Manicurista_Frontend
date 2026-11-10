import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { AgendaService } from '../../core/services/agenda.service';
import { Manicurist, Service } from '../../core/models/agenda.model';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-catalogs',
  imports: [FormsModule, CurrencyPipe, Icon],
  templateUrl: './catalogs.html',
  styleUrl: './catalogs.css',
})
export class CatalogsPage {
  readonly store = inject(AgendaService);
  professional: Manicurist = { id: '', name: '', active: true };
  service: Service = { id: '', name: '', basePrice: 0, duration: 45, buffer: 15, active: true };
  editProfessional(m: Manicurist) {
    this.professional = { ...m };
  }
  editService(s: Service) {
    this.service = { ...s };
  }
  resetProfessional() {
    this.professional = { id: '', name: '', active: true };
  }
  resetService() {
    this.service = { id: '', name: '', basePrice: 0, duration: 45, buffer: 15, active: true };
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
}
