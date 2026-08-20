import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ProductImage } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-image-carousel',
  templateUrl: './product-image-carousel.component.html',
  styleUrls: ['./product-image-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImageCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() images: ProductImage[] = [];
  @Input() autoPlayInterval = 4000;
  @Input() sizes = '(min-width: 720px) 280px, 50vw';

  @ViewChild('track') trackRef?: ElementRef<HTMLElement>;

  currentIndex = 0;
  isPaused = false;

  private autoPlayTimer?: ReturnType<typeof setInterval>;
  private observer?: IntersectionObserver;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  get hasMultiple(): boolean {
    return this.images.length > 1;
  }

  getSrcset(image: ProductImage): string {
    if (!image.variants?.length) return '';
    return image.variants.map(v => `${v.url} ${v.width}w`).join(', ');
  }

  ngAfterViewInit(): void {
    if (!this.hasMultiple) return;

    this.startAutoPlay();
    this.observeVisibility();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.observer?.disconnect();
  }

  goTo(index: number): void {
    this.currentIndex = index;
    this.scrollToCurrent();
    this.restartAutoPlay();
    this.cdr.markForCheck();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.scrollToCurrent();
    this.cdr.markForCheck();
  }

  onPointerEnter(): void {
    this.isPaused = true;
  }

  onPointerLeave(): void {
    this.isPaused = false;
  }

  onTrackScroll(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;
    const scrollLeft = track.scrollLeft;
    const cardWidth = track.clientWidth;
    if (cardWidth > 0) {
      const idx = Math.round(scrollLeft / cardWidth);
      if (idx !== this.currentIndex && idx >= 0 && idx < this.images.length) {
        this.currentIndex = idx;
        this.restartAutoPlay();
        this.cdr.markForCheck();
      }
    }
  }

  private scrollToCurrent(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;
    const cardWidth = track.clientWidth;
    track.scrollTo({ left: cardWidth * this.currentIndex, behavior: 'smooth' });
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    const jitter = 1500 + Math.floor(Math.random() * 3500);
    this.autoPlayTimer = setTimeout(() => {
      if (!this.isPaused) {
        this.next();
      }
      this.autoPlayTimer = setInterval(() => {
        if (!this.isPaused) {
          this.next();
        }
      }, this.autoPlayInterval);
    }, jitter) as unknown as ReturnType<typeof setInterval>;
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer as unknown as number);
      clearInterval(this.autoPlayTimer as unknown as number);
      this.autoPlayTimer = undefined;
    }
  }

  private restartAutoPlay(): void {
    if (this.autoPlayTimer) {
      this.startAutoPlay();
    }
  }

  private observeVisibility(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.startAutoPlay();
          } else {
            this.stopAutoPlay();
          }
        }
      },
      { threshold: 0.1 }
    );
    const el = this.trackRef?.nativeElement;
    if (el) {
      this.observer.observe(el.closest('.card') || el);
    }
  }
}
