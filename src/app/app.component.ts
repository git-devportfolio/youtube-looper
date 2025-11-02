import { Component, inject, OnInit } from '@angular/core';
import { MainLayoutComponent } from './features/layout';
import { ToastContainerComponent } from './shared/ui';
import { LamejsTestService } from './shared/services/lamejs-test.service';
import { Mp3WorkerTestService } from './shared/services/mp3-worker-test.service';

@Component({
  selector: 'app-root',
  imports: [MainLayoutComponent, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'YouTube Looper';

  private lamejsTest = inject(LamejsTestService);
  private mp3WorkerTest = inject(Mp3WorkerTestService);

  async ngOnInit(): Promise<void> {
    // Test lamejs au démarrage de l'application
    this.lamejsTest.runAllTests();

    // Test du Web Worker MP3
    await this.mp3WorkerTest.runAllTests();
  }
}
