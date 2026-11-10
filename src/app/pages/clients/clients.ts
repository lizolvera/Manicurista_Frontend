import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-clients-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class ClientsPage {
  readonly store = inject(AgendaService);
  readonly query = signal('');
  readonly adding = signal(false);
  readonly clients = computed(() =>
    this.store
      .state()
      .clients.filter((c) => c.name.toLowerCase().includes(this.query().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  );
  name = '';
  description = '';
  count(id: string) {
    return this.store.state().appointments.filter((a) => a.clientId === id).length;
  }
  async save() {
    if (
      await this.store.command(
        {
          action: 'save-client',
          payload: { id: crypto.randomUUID(), name: this.name, description: this.description },
        },
        'Clienta registrada. Ya puedes agendar su próxima cita.',
      )
    ) {
      this.name = '';
      this.description = '';
      this.adding.set(false);
    }
  }
}
