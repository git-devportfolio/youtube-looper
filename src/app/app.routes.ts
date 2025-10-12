import { Routes } from '@angular/router';
import { AppMainComponent } from './features/main-app';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/youtube-looper',
    pathMatch: 'full'
  },
  {
    path: 'youtube-looper',
    component: AppMainComponent,
    title: 'YouTube Looper'
  },
  {
    path: 'audio-looper',
    loadComponent: () =>
      import('./features/audio-looper/ui/audio-looper-container/audio-looper-container.component')
        .then(m => m.AudioLooperContainerComponent),
    title: 'Audio Looper'
  }
];
