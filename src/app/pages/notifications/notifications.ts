import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';
@Component({
  selector: 'app-notifications-page',
  imports: [CommonModule, Icon],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class NotificationsPage {
  readonly store = inject(AgendaService);
  private readonly router = inject(Router);
  readonly filter = signal('Todas');
  readonly expanded = signal('');
  readonly notices = computed(() =>
    this.store.state().notices.filter((n) => this.filter() !== 'Sin leer' || !n.read),
  );
  read(id?: string) {
    void this.store.command(
      { action: 'read', payload: { id } },
      'Notificaciones marcadas como leídas.',
    );
  }
  async open(id: string) {
    const a = this.store.state().appointments.find((a) => a.id === id);
    if (a) {
      this.store.selectedDate.set(a.date);
      await this.router.navigate(['/agenda']);
    } else this.store.error.set('La cita asociada ya no está disponible.');
  }
}
