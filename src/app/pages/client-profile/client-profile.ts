import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';
@Component({
  selector: 'app-client-profile-page',
  imports: [CommonModule, FormsModule, RouterLink, Icon],
  templateUrl: './client-profile.html',
  styleUrl: './client-profile.css',
})
export class ClientProfilePage {
  readonly store = inject(AgendaService);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly client = computed(() => this.store.state().clients.find((c) => c.id === this.id));
  readonly designs = computed(() =>
    this.store.state().designs.filter((d) => d.clientId === this.id),
  );
  readonly appointments = computed(() =>
    this.store
      .state()
      .appointments.filter((a) => a.clientId === this.id)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
  );
  readonly editing = signal(false);
  name = '';
  description = '';
  edit() {
    const c = this.client();
    if (c) {
      this.name = c.name;
      this.description = c.description;
      this.editing.set(true);
    }
  }
  async save() {
    if (
      await this.store.command(
        {
          action: 'save-client',
          payload: { id: this.id!, name: this.name, description: this.description },
        },
        'Perfil actualizado.',
      )
    )
      this.editing.set(false);
  }
}
