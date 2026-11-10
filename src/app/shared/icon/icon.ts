import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input('calendar');
}
