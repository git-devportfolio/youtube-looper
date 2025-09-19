import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header';
import { AppMainComponent } from '../../../main-app';
import { HelpGuideComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, AppMainComponent, HelpGuideComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  @ViewChild(HelpGuideComponent) helpGuide!: HelpGuideComponent;

  readonly currentYear = new Date().getFullYear();

  // Pour l'instant, on affiche toujours l'accueil
  // Cette propriété sera utilisée plus tard quand on aura des routes
  get hasRouterContent(): boolean {
    return false;
  }

  openHelpGuide(): void {
    this.helpGuide.open();
  }
}