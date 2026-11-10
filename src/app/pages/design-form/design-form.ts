import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgendaService } from '../../core/services/agenda.service';
import { Icon } from '../../shared/icon/icon';
@Component({
  selector: 'app-design-form-page',
  imports: [FormsModule, RouterLink, Icon],
  templateUrl: './design-form.html',
  styleUrl: './design-form.css',
})
export class DesignFormPage {
  readonly store = inject(AgendaService);
  private readonly router = inject(Router);
  readonly services = computed(() => this.store.state().services.filter((s) => s.active));
  appointments() {
    return this.store
      .state()
      .appointments.filter((a) => a.clientId === this.clientId && a.serviceId === this.serviceId);
  }
  readonly image = signal('');
  readonly loading = signal(false);
  readonly fileError = signal('');
  clientId = inject(ActivatedRoute).snapshot.queryParamMap.get('client') || '';
  serviceId = '';
  appointmentId = '';
  note = '';
  async choose(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileError.set('');
    this.image.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 250 * 1024) {
      this.fileError.set('Elige una fotografía JPG, PNG o WebP de hasta 250 KB.');
      return;
    }
    this.loading.set(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error());
        img.src = data;
      });
      this.image.set(data);
    } catch {
      this.fileError.set('No se pudo leer esta imagen. Selecciona otra fotografía.');
    } finally {
      this.loading.set(false);
    }
  }
  async save() {
    if (!this.image()) {
      this.fileError.set('Agrega una fotografía del diseño.');
      return;
    }
    if (
      await this.store.command(
        {
          action: 'save-design',
          payload: {
            id: crypto.randomUUID(),
            clientId: this.clientId,
            service: this.store.state().services.find((s) => s.id === this.serviceId)?.name || '',
            serviceId: this.serviceId,
            ...(this.appointmentId ? { appointmentId: this.appointmentId } : {}),
            note: this.note,
            image: this.image(),
            createdAt: '',
          },
        },
        'Diseño guardado en el perfil de la clienta.',
      )
    ) {
      await this.router.navigate(['/clientas', this.clientId]);
    }
  }
}
