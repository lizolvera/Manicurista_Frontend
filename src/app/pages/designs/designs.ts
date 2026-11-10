import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';
@Component({
  selector: 'app-designs-page',
  imports: [CommonModule, FormsModule, RouterLink, Icon],
  templateUrl: './designs.html',
  styleUrl: './designs.css',
})
export class DesignsPage {
  readonly store = inject(AgendaService);
  readonly query = signal('');
  readonly designs = computed(() =>
    this.store
      .state()
      .designs.filter((d) =>
        `${d.service} ${d.note} ${this.clientName(d.clientId)}`
          .toLowerCase()
          .includes(this.query().toLowerCase()),
      ),
  );
  clientName(id: string) {
    return this.store.state().clients.find((c) => c.id === id)?.name || 'Clienta';
  }
}
