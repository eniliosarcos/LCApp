import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { CategoryStripComponent } from './category-strip.component';

describe('CategoryStripComponent', () => {
  let fixture: ComponentFixture<CategoryStripComponent>;
  let component: CategoryStripComponent;
  let router: { navigate: jasmine.Spy; url: string; events: Observable<never> };
  let scrollToSpy: jasmine.Spy;

  const categories: Category[] = [
    { id: 'c1', name: 'Maquillaje', slug: 'maquillaje', description: 'Productos de maquillaje' },
    { id: 'c2', name: 'Cuidado', slug: 'cuidado', description: 'Productos de cuidado' }
  ];

  beforeEach(async () => {
    router = { navigate: jasmine.createSpy('navigate'), url: '/', events: of() };
    scrollToSpy = jasmine.createSpy('scrollTo');

    await TestBed.configureTestingModule({
      declarations: [CategoryStripComponent],
      providers: [
        { provide: CatalogService, useValue: { getCategories: () => of(categories) } },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('scrollea al inicio al seleccionar una categoría distinta', () => {
    spyOn(window, 'scrollTo').and.callFake(scrollToSpy);

    component.selectCategory('c1');
    fixture.detectChanges();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(router.navigate).toHaveBeenCalledWith(['/catalog', 'c1']);
  });

  it('scrollea al inicio también al seleccionar la categoría ya activa', () => {
    spyOn(window, 'scrollTo').and.callFake(scrollToSpy);

    component.selectCategory('c1');
    router.navigate.calls.reset();
    scrollToSpy.calls.reset();
    component.selectCategory('c1');
    fixture.detectChanges();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('scrollea al inicio al seleccionar "Todos"', () => {
    spyOn(window, 'scrollTo').and.callFake(scrollToSpy);

    component.selectCategory('c2');
    component.selectCategory('');
    fixture.detectChanges();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});