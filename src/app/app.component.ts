import { Component } from '@angular/core';
import { MainLayoutComponent } from './features/layout';
import { ToastContainerComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [MainLayoutComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'YouTube Looper';
}
