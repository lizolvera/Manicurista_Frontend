import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { AgendaService, API_ENDPOINT } from './core/services/agenda.service';
import { AppointmentFormPage } from './pages/appointment-form/appointment-form';
import { AgendaPage } from './pages/agenda/agenda';
import { Appointment } from './core/models/agenda.model';

// UI integration checks exercise independent screens and their shared persistence.
describe('Pantallas de Entre Uñas', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: API_ENDPOINT, useValue: '' }],
    });
    const store = TestBed.inject(AgendaService);
    await store.load();
    store.state.update((state) => ({
      ...state,
      services: [
        {
          id: 'servicio-001',
          name: 'Manicura',
          basePrice: 350,
          duration: 45,
          buffer: 15,
          active: true,
        },
      ],
      manicurists: [{ id: 'manicurista-001', name: 'Profesional demo', active: true }],
    }));
  });
  it('muestra navegación para las seis secciones', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('nav a').length).toBe(6);
  });
  it('permite abrir cada pantalla mediante su propia ruta', async () => {
    const store = TestBed.inject(AgendaService);
    await store.load();
    store.state.update((state) => ({
      ...state,
      services: [
        {
          id: 'servicio-001',
          name: 'Manicura',
          basePrice: 350,
          duration: 45,
          buffer: 15,
          active: true,
        },
      ],
      manicurists: [{ id: 'manicurista-001', name: 'Profesional demo', active: true }],
    }));
    const harness = await RouterTestingHarness.create();
    const screens = [
      ['/agenda', 'Tu agenda de belleza'],
      ['/clientas', 'Tus clientas'],
      ['/notificaciones', 'Notificaciones'],
      ['/disenos', 'Galería de diseños'],
      ['/reportes', 'Reportes de las citas'],
      ['/catalogos', 'Servicios y manicuristas'],
      ['/citas/nueva', 'Agendar una cita'],
      ['/disenos/nuevo', 'Registrar diseño'],
    ];
    for (const [route, title] of screens) {
      await harness.navigateByUrl(route);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(title);
    }
  });
  it('guarda la manicurista y conserva la cita al recargar', async () => {
    const store = TestBed.inject(AgendaService);
    await store.load();
    const harness = await RouterTestingHarness.create();
    const form = await harness.navigateByUrl('/citas/nueva', AppointmentFormPage);
    Object.assign(form.form, {
      client: 'C01',
      manicurist: 'Profesional demo',
      manicuristId: 'manicurista-001',
      serviceId: 'servicio-001',
      totalPrice: 350,
      date: '2026-11-10',
    });
    await form.save();
    expect(store.state().appointments[0].manicurist).toBe('Profesional demo');
    expect(store.state().appointments[0].status).toBe('Pendiente');
    expect(store.state().clients[0].name).toBe('C01');
    await store.load();
    expect(store.state().appointments[0].manicurist).toBe('Profesional demo');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Tu agenda de belleza',
    );
  });
  it('mantiene el estado anterior cuando el navegador no permite guardar', async () => {
    const store = TestBed.inject(AgendaService);
    await store.load();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const saved = await store.command(
      { action: 'save-client', payload: { id: 'c1', name: 'C01', description: '' } },
      'Guardada',
    );
    expect(saved).toBe(false);
    expect(store.state().clients.length).toBe(0);
    expect(store.error()).toContain('espacio');
    set.mockRestore();
  });
  it('seleccionar un servicio carga precio y duración, y editar una cita conserva lo acordado', async () => {
    const store = TestBed.inject(AgendaService);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/citas/nueva', AppointmentFormPage);
    page.selectService('servicio-001');
    page.selectManicurist('manicurista-001');
    expect(page.form.totalPrice).toBe(350);
    expect(page.form.duration).toBe(45);
    page.form.client = 'C02';
    page.form.totalPrice = 400;
    page.form.duration = 60;
    await page.save();
    const a = store.state().appointments[0];
    expect(a.serviceId).toBe('servicio-001');
    expect(a.manicuristId).toBe('manicurista-001');
    await store.command(
      {
        action: 'save-service',
        payload: { ...store.state().services[0], basePrice: 500, duration: 90 },
      },
      'Guardado',
    );
    const edit = await harness.navigateByUrl(`/citas/${a.id}/editar`, AppointmentFormPage);
    expect(edit.form.totalPrice).toBe(400);
    expect(edit.form.duration).toBe(60);
  });
  it('el precio total valida pagos y no guarda un importe recibido mayor', async () => {
    const store = TestBed.inject(AgendaService);
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/citas/nueva', AppointmentFormPage);
    page.selectService('servicio-001');
    page.selectManicurist('manicurista-001');
    page.form.client = 'C03';
    page.form.deposit = 300;
    page.form.balancePaid = 100;
    await page.save();
    expect(store.error()).toContain('superar');
    expect(store.state().appointments.length).toBe(0);
  });
  it('los tres botones del resumen muestran las clientas del estado y día elegidos', async () => {
    const store = TestBed.inject(AgendaService);
    await store.load();
    store.selectedDate.set('2026-11-10');
    const appointments: Appointment[] = ['Confirmada', 'Pendiente', 'Cancelada'].map(
      (status, i) => ({
        id: `summary-${i}`,
        client: `Clienta ${status}`,
        manicurist: 'Manicurista demo',
        manicuristId: 'manicurista-001',
        serviceId: 'servicio-001',
        totalPrice: 350,
        date: '2026-11-10',
        time: '09:00',
        service: 'Manicura',
        duration: 45,
        buffer: 15,
        deposit: 0,
        balancePaid: 0,
        attendance: 'Sin registrar',
        notes: '',
        status: status as Appointment['status'],
      }),
    );
    store.state.set({
      appointments: [
        ...appointments,
        { ...appointments[0], id: 'other-day', client: 'Otro día', date: '2026-11-11' },
      ],
      notices: [],
      clients: [],
      designs: [],
      manicurists: [],
      services: [],
    });
    const harness = await RouterTestingHarness.create();
    const agenda = await harness.navigateByUrl('/agenda', AgendaPage);
    for (const [selector, expected] of [
      ['.confirmed-card', 'Confirmada'],
      ['.pending-card', 'Pendiente'],
      ['.cancelled-card', 'Cancelada'],
    ]) {
      agenda.search.set('Una búsqueda anterior sin coincidencias');
      const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>(selector)!;
      button.click();
      harness.detectChanges();
      await harness.fixture.whenStable();
      expect(agenda.search()).toBe('');
      expect(agenda.appointments().map((a) => a.client)).toEqual([`Clienta ${expected}`]);
      expect(button.getAttribute('aria-pressed')).toBe('true');
      const card = harness.routeNativeElement!.querySelector('.appointment-grid')!.textContent;
      expect(card).toContain(`Clienta ${expected}`);
      expect(card).toContain('Manicurista demo');
      expect(card).not.toContain('Otro día');
    }
    store.selectedDate.set('2026-11-12');
    harness.detectChanges();
    expect(agenda.appointments().length).toBe(0);
    expect(harness.routeNativeElement!.querySelector('.empty')!.textContent).toContain(
      'Sin citas en esta categoría',
    );
    expect(
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.cancelled-card')!.disabled,
    ).toBe(false);
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('.results-summary button')!
      .click();
    expect(agenda.status()).toBe('Todas');
  });
});
