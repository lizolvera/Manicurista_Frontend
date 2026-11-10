import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AgendaService } from './core/services/agenda.service';
import { Icon } from './shared/icon/icon';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly store = inject(AgendaService);
  readonly links = [
    { path: '/agenda', label: 'Agenda', icon: 'calendar' },
    { path: '/clientas', label: 'Clientas', icon: 'clients' },
    { path: '/notificaciones', label: 'Notificaciones', icon: 'bell' },
    { path: '/disenos', label: 'Diseños', icon: 'image' },
    { path: '/reportes', label: 'Reportes', icon: 'chart' },
    { path: '/catalogos', label: 'Catálogos', icon: 'sparkle' },
  ];
  ngOnInit() {
    void this.store.load();
  }
}
