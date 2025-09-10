import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);
  
  readonly theme = this.themeService.theme;
  
  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }
  
  get isDarkTheme(): boolean {
    return this.themeService.isDarkTheme();
  }
  
  get isLightTheme(): boolean {
    return this.themeService.isLightTheme();
  }
}