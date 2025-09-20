import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject, signal, output, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { youtubeUrlValidator, youtubeVideoIdValidator, extractYouTubeVideoId, YouTubeUrlInfo, analyzeYouTubeUrl } from '../../../../core';

@Component({
  selector: 'app-url-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './url-input.component.html',
  styleUrl: './url-input.component.scss'
})
export class UrlInputComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  
  @ViewChild('urlInput', { static: true }) 
  urlInputRef!: ElementRef<HTMLInputElement>;

  // Signals pour l'état du composant
  private readonly _isLoading = signal<boolean>(false);
  private readonly _urlInfo = signal<YouTubeUrlInfo | null>(null);
  private readonly _hasError = signal<boolean>(false);
  private readonly _errorMessage = signal<string | null>(null);

  // Signals publics en lecture seule
  readonly isLoading = this._isLoading.asReadonly();
  readonly urlInfo = this._urlInfo.asReadonly();
  readonly hasError = this._hasError.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  // Events
  readonly validUrlSubmitted = output<YouTubeUrlInfo>();
  readonly urlChanged = output<string>();
  readonly urlCleared = output<void>();

  // Formulaire réactif
  urlForm!: FormGroup;
  
  // Placeholder avec exemples d'URLs
  readonly placeholders = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/9bZkp7q19f0',
    'https://youtube.com/watch?v=jNQXAC9IVRw'
  ];
  
  currentPlaceholderIndex = 0;
  currentPlaceholder = this.placeholders[0];

  constructor() {
    // Rotation des placeholders toutes les 3 secondes
    setInterval(() => {
      this.currentPlaceholderIndex = (this.currentPlaceholderIndex + 1) % this.placeholders.length;
      this.currentPlaceholder = this.placeholders[this.currentPlaceholderIndex];
    }, 3000);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
    this.loadDefaultUrl();
  }

  ngAfterViewInit(): void {
    // Auto-focus sur le champ de saisie
    if (this.urlInputRef?.nativeElement) {
      setTimeout(() => {
        this.urlInputRef.nativeElement.focus();
      }, 100);
    }
  }

  private initializeForm(): void {
    this.urlForm = this.fb.group({
      url: [
        '', 
        [
          Validators.required,
          youtubeUrlValidator(),
          youtubeVideoIdValidator()
        ]
      ]
    });
  }

  private setupFormValidation(): void {
    // Écouter les changements de valeur avec debounce
    this.urlForm.get('url')?.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        distinctUntilChanged(),
        filter(value => value !== null)
      )
      .subscribe(url => {
        this.handleUrlChange(url);
      });
  }

  private loadDefaultUrl(): void {
    // URL de test par défaut - une vidéo musicale courte et libre de droits
    const defaultTestUrl = 'https://www.youtube.com/watch?v=zdI76A_zALI&list=PLQLMktq8kjwXz9oMz-rB6enkPQ8gD1WWX&index=8';

    // Charger l'URL par défaut après un court délai pour permettre l'initialisation complète
    setTimeout(() => {
      this.urlForm.get('url')?.setValue(defaultTestUrl);
    }, 500);
  }

  private handleUrlChange(url: string): void {
    this.urlChanged.emit(url);
    
    // Réinitialiser l'état
    this._hasError.set(false);
    this._errorMessage.set(null);
    this._urlInfo.set(null);

    if (!url || !url.trim()) {
      this.urlCleared.emit();
      return;
    }

    // Valider et analyser l'URL
    this.validateAndAnalyzeUrl(url.trim());
  }

  private validateAndAnalyzeUrl(url: string): void {
    try {
      this._isLoading.set(true);

      // Analyser l'URL YouTube
      const urlInfo = analyzeYouTubeUrl(url);
      
      if (urlInfo && urlInfo.isValid) {
        this._urlInfo.set(urlInfo);
        this._hasError.set(false);
        this._errorMessage.set(null);
        
        // Si le formulaire est valide, émettre l'événement
        if (this.urlForm.valid) {
          this.validUrlSubmitted.emit(urlInfo);
        }
      } else {
        this.setError('Format d\'URL YouTube non reconnu');
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse de l\'URL:', error);
      this.setError('Erreur lors de la validation de l\'URL');
    } finally {
      this._isLoading.set(false);
    }
  }

  private setError(message: string): void {
    this._hasError.set(true);
    this._errorMessage.set(message);
    this._urlInfo.set(null);
  }

  onSubmit(): void {
    if (this.urlForm.valid && this.urlInfo()) {
      this.validUrlSubmitted.emit(this.urlInfo()!);
    } else {
      this.markFormGroupTouched();
    }
  }

  onClear(): void {
    this.urlForm.reset();
    this._hasError.set(false);
    this._errorMessage.set(null);
    this._urlInfo.set(null);
    this.urlCleared.emit();
    
    // Remettre le focus
    if (this.urlInputRef?.nativeElement) {
      this.urlInputRef.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    // Gérer le collage d'URL
    const pastedData = event.clipboardData?.getData('text/plain');
    if (pastedData) {
      // Permettre au navigateur de coller d'abord, puis traiter
      setTimeout(() => {
        this.urlForm.get('url')?.setValue(pastedData.trim());
      }, 10);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.urlForm.controls).forEach(key => {
      const control = this.urlForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Getters pour le template
  get urlControl() {
    return this.urlForm.get('url');
  }

  get isUrlInvalid(): boolean {
    const control = this.urlControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isUrlValid(): boolean {
    const control = this.urlControl;
    return !!(control && control.valid && control.value && control.value.trim());
  }

  get validationErrorMessage(): string | null {
    const control = this.urlControl;
    if (!control || !control.errors || !this.isUrlInvalid) {
      return null;
    }

    const errors = control.errors;
    
    if (errors['required']) {
      return 'Veuillez saisir une URL YouTube';
    }
    
    if (errors['youtubeUrl']) {
      return errors['youtubeUrl'].message || 'Format d\'URL YouTube invalide';
    }
    
    if (errors['youtubeVideoId']) {
      return errors['youtubeVideoId'].message || 'ID de vidéo YouTube invalide';
    }

    return 'URL invalide';
  }

  get showLoadingSpinner(): boolean {
    return this.isLoading() && !!this.urlControl?.value?.trim();
  }

  get showValidIcon(): boolean {
    return this.isUrlValid && !this.isLoading() && !!this.urlInfo();
  }
}