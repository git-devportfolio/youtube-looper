import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  icon: string;
}

@Component({
  selector: 'app-help-guide',
  imports: [CommonModule],
  templateUrl: './help-guide.component.html',
  styleUrl: './help-guide.component.scss'
})
export class HelpGuideComponent {
  private readonly _currentStep = signal(0);
  private readonly _isOpen = signal(false);

  readonly currentStep = this._currentStep.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();

  readonly steps: GuideStep[] = [
    {
      id: 'url-input',
      title: '1. Coller une URL YouTube',
      description: 'Commencez par coller l\'URL d\'une vidéo YouTube dans le champ de saisie.',
      tips: [
        'Utilisez des vidéos de qualité musicale (guitare, piano, etc.)',
        'Les vidéos courtes sont idéales pour commencer',
        'Vérifiez que la vidéo n\'est pas bloquée dans votre région'
      ],
      icon: '🎵'
    },
    {
      id: 'set-bounds',
      title: '2. Définir la boucle',
      description: 'Utilisez les boutons "Set Start" et "Set End" pour marquer le début et la fin de votre boucle.',
      tips: [
        'Lancez d\'abord la vidéo pour repérer le passage à travailler',
        'Cliquez sur "Set Start" au moment précis où vous voulez commencer',
        'Cliquez sur "Set End" à la fin du passage',
        'Vous pouvez aussi glisser les poignées sur la timeline'
      ],
      icon: '🎯'
    },
    {
      id: 'speed-control',
      title: '3. Ajuster la vitesse',
      description: 'Ralentissez la lecture pour faciliter l\'apprentissage avec les boutons de vitesse.',
      tips: [
        '0.45x - 0.5x : Pour les passages très difficiles',
        '0.70x - 0.75x : Pour l\'apprentissage progressif',
        '1x : Vitesse normale pour vérifier votre progression'
      ],
      icon: '⚡'
    },
    {
      id: 'loop-playback',
      title: '4. Lancer la boucle',
      description: 'Cliquez sur "Play Loop" pour répéter automatiquement votre segment sélectionné.',
      tips: [
        'La boucle se lance automatiquement après avoir défini start/end',
        'Vous pouvez arrêter/redémarrer avec le bouton "Play Loop"',
        'Combinez vitesse lente et boucle pour un apprentissage optimal'
      ],
      icon: '🔄'
    },
    {
      id: 'practice-tips',
      title: '5. Conseils de pratique',
      description: 'Optimisez votre apprentissage avec ces techniques éprouvées.',
      tips: [
        'Commencez très lentement (0.45x) puis accélérez progressivement',
        'Travaillez de petits segments (2-4 secondes) avant d\'enchaîner',
        'Répétez jusqu\'à jouer parfaitement, puis passez au segment suivant',
        'Alternez entre practice lente et vérification à vitesse normale'
      ],
      icon: '🎸'
    }
  ];

  readonly currentStepData = computed(() => this.steps[this._currentStep()]);
  readonly isFirstStep = computed(() => this._currentStep() === 0);
  readonly isLastStep = computed(() => this._currentStep() === this.steps.length - 1);
  readonly progress = computed(() => ((this._currentStep() + 1) / this.steps.length) * 100);

  open(): void {
    this._isOpen.set(true);
    this._currentStep.set(0);
  }

  close(): void {
    this._isOpen.set(false);
  }

  nextStep(): void {
    if (!this.isLastStep()) {
      this._currentStep.set(this._currentStep() + 1);
    }
  }

  previousStep(): void {
    if (!this.isFirstStep()) {
      this._currentStep.set(this._currentStep() - 1);
    }
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this._currentStep.set(index);
    }
  }
}
