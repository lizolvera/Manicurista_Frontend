import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: 'catalogos',
    loadComponent: () => import('./pages/catalogs/catalogs').then((m) => m.CatalogsPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'agenda' },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/agenda/agenda').then((m) => m.AgendaPage),
  },
  {
    path: 'citas/nueva',
    loadComponent: () =>
      import('./pages/appointment-form/appointment-form').then((m) => m.AppointmentFormPage),
  },
  {
    path: 'citas/:id/editar',
    loadComponent: () =>
      import('./pages/appointment-form/appointment-form').then((m) => m.AppointmentFormPage),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./pages/notifications/notifications').then((m) => m.NotificationsPage),
  },
  {
    path: 'clientas',
    loadComponent: () => import('./pages/clients/clients').then((m) => m.ClientsPage),
  },
  {
    path: 'clientas/:id',
    loadComponent: () =>
      import('./pages/client-profile/client-profile').then((m) => m.ClientProfilePage),
  },
  {
    path: 'disenos/nuevo',
    loadComponent: () => import('./pages/design-form/design-form').then((m) => m.DesignFormPage),
  },
  {
    path: 'disenos',
    loadComponent: () => import('./pages/designs/designs').then((m) => m.DesignsPage),
  },
  {
    path: 'reportes',
    loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsPage),
  },
  { path: '**', redirectTo: 'agenda' },
];
