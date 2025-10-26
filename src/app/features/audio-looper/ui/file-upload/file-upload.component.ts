import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface UploadError {
  type: 'format' | 'size' | 'general';
  message: string;
}

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent {
  // Formats audio supportés
  private readonly SUPPORTED_FORMATS = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
  private readonly SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo en octets (10 485 760)

  // Signals pour l'état du composant
  readonly isDragging = signal<boolean>(false);
  readonly error = signal<UploadError | null>(null);
  readonly selectedFileName = signal<string | null>(null);

  // Output pour émettre le fichier sélectionné
  readonly fileSelected = output<File>();

  /**
   * Gère le drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Gère le drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Gère le drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Gère la sélection de fichier via input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }

    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    input.value = '';
  }

  /**
   * Ouvre le sélecteur de fichiers
   */
  openFileSelector(): void {
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Traite le fichier sélectionné
   */
  private handleFile(file: File): void {
    // Réinitialiser l'erreur
    this.error.set(null);

    // Valider le format
    if (!this.isValidFormat(file)) {
      this.error.set({
        type: 'format',
        message: `Format non supporté. Formats acceptés : MP3, WAV, OGG, M4A`
      });
      return;
    }

    // Valider la taille
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.error.set({
        type: 'size',
        message: `Fichier trop volumineux (${sizeMB} Mo). Taille maximale : 10 Mo`
      });
      return;
    }

    // Fichier valide, émettre l'événement
    this.selectedFileName.set(file.name);
    this.fileSelected.emit(file);
  }

  /**
   * Vérifie si le format du fichier est valide
   */
  private isValidFormat(file: File): boolean {
    // Vérifier le type MIME
    const validMimeType = this.SUPPORTED_FORMATS.some(format =>
      file.type.toLowerCase() === format || file.type.toLowerCase().includes(format)
    );

    // Vérifier l'extension
    const fileName = file.name.toLowerCase();
    const validExtension = this.SUPPORTED_EXTENSIONS.some(ext =>
      fileName.endsWith(ext)
    );

    return validMimeType || validExtension;
  }

  /**
   * Ferme le message d'erreur
   */
  clearError(): void {
    this.error.set(null);
  }
}
