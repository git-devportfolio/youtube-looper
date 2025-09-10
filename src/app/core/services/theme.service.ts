import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly _theme = signal<Theme>(this.getInitialTheme());
  
  readonly theme = this._theme.asReadonly();
  
  constructor() {
    // Effet pour appliquer le thème à l'élément document
    effect(() => {
      this.applyTheme(this._theme());
    });
  }
  
  private getInitialTheme(): Theme {
    // Récupérer la préférence stockée ou utiliser la préférence système
    const storedTheme = localStorage.getItem('youtube-looper-theme') as Theme;
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
      return storedTheme;
    }
    
    // Utiliser la préférence système
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  private applyTheme(theme: Theme): void {
    // Supprimer les classes de thème existantes
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    
    // Ajouter la nouvelle classe de thème
    document.documentElement.classList.add(`${theme}-theme`);
    
    // Sauvegarder la préférence
    localStorage.setItem('youtube-looper-theme', theme);
  }
  
  toggleTheme(): void {
    const currentTheme = this._theme();
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this._theme.set(newTheme);
  }
  
  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }
  
  isDarkTheme(): boolean {
    return this._theme() === 'dark';
  }
  
  isLightTheme(): boolean {
    return this._theme() === 'light';
  }
}