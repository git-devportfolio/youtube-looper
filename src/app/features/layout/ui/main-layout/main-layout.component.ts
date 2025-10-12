import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header';
import { HelpGuideComponent, ModuleNavComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, ModuleNavComponent, HelpGuideComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  @ViewChild(HelpGuideComponent) helpGuide!: HelpGuideComponent;

  readonly currentYear = new Date().getFullYear();

  openHelpGuide(): void {
    this.helpGuide.open();
  }
}