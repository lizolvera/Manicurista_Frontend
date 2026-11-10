import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import {
  AgendaState,
  Appointment,
  localDate,
  migrateState,
  emptyState,
} from '../models/agenda.model';
import { AgendaCommand, applyCommand } from '../models/agenda.actions';
import { API_URL } from '../config/connection';

export const API_ENDPOINT = new InjectionToken<string>('API_ENDPOINT', {
  providedIn: 'root',
  factory: () => API_URL,
});

@Injectable({ providedIn: 'root' })
export class AgendaService {
  readonly state = signal<AgendaState>(emptyState());
  private readonly endpoint = inject(API_ENDPOINT);
  readonly remote = Boolean(this.endpoint);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly selectedDate = signal(localDate());
  readonly unread = computed(() => this.state().notices.filter((n) => !n.read).length);
  private readonly key = 'bina03-agenda-v1';

  async load() {
    this.error.set('');
    try {
      if (this.remote) {
        const response = await fetch(`${this.endpoint}/state`);
        if (!response.ok) throw new Error('No se pudo consultar la agenda. Intenta de nuevo.');
        this.state.set(migrateState(await response.json()));
      } else {
        const saved = localStorage.getItem(this.key);
        if (saved) this.state.set(migrateState(JSON.parse(saved)));
      }
      this.ready.set(true);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }

  clearFeedback() {
    this.error.set('');
    this.message.set('');
  }

  async command(command: AgendaCommand, success: string): Promise<boolean> {
    if (this.busy() || !this.ready()) return false;
    this.busy.set(true);
    this.clearFeedback();
    try {
      if (this.remote) {
        const response = await fetch(`${this.endpoint}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'No se pudo guardar. Intenta de nuevo.');
        this.state.set(migrateState(body));
      } else {
        const next = applyCommand(
          this.state(),
          command,
          () => crypto.randomUUID(),
          () => new Date().toISOString(),
        );
        // Keep the current view unchanged if browser storage fails.
        try {
          localStorage.setItem(this.key, JSON.stringify(next));
        } catch {
          throw new Error(
            'No se pudo guardar en este navegador. Puede que el espacio esté lleno; la información anterior se conserva.',
          );
        }
        this.state.set(next);
      }
      this.message.set(success);
      return true;
    } catch (e) {
      this.error.set((e as Error).message);
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  saveAppointment(a: Appointment) {
    return this.command({ action: 'save', payload: a }, 'Cita guardada correctamente.');
  }

  async copyReminder(a: Appointment) {
    this.clearFeedback();
    try {
      await navigator.clipboard.writeText(
        `Hola ${a.client}, te recordamos tu cita de ${a.service} con ${a.manicurist || 'tu manicurista'} el ${a.date} a las ${a.time}. ¿Nos confirmas tu asistencia?`,
      );
      this.message.set('Mensaje copiado. Revísalo y envíalo por tu canal habitual.');
    } catch {
      this.error.set('No fue posible copiar el mensaje en este navegador.');
    }
  }
}
