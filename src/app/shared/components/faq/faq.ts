import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class FaqComponent {
  @Input() title = 'Preguntas Frecuentes';
  @Input() items: FaqItem[] = [];
  @Input() multiple = false;

  openIndexes = new Set<number>();

  toggle(i: number) {
    if (this.multiple) {
      if (this.openIndexes.has(i)) this.openIndexes.delete(i);
      else this.openIndexes.add(i);
    } else {
      if (this.openIndexes.has(i)) this.openIndexes.clear();
      else {
        this.openIndexes.clear();
        this.openIndexes.add(i);
      }
    }
  }

  isOpen(i: number): boolean {
    return this.openIndexes.has(i);
  }
}