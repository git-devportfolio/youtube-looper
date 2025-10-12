import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-module-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './module-nav.component.html',
  styleUrl: './module-nav.component.scss'
})
export class ModuleNavComponent {
  readonly navItems: NavItem[] = [
    {
      label: 'YouTube Looper',
      route: '/youtube-looper'
    },
    {
      label: 'Audio Looper',
      route: '/audio-looper'
    }
  ];
}
