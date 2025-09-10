import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header';
import { TestYouTubeComponent } from '../../../../test-youtube.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, TestYouTubeComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  readonly currentYear = new Date().getFullYear();
  
  // Pour l'instant, on affiche toujours l'accueil
  // Cette propriété sera utilisée plus tard quand on aura des routes
  get hasRouterContent(): boolean {
    return false;
  }
}