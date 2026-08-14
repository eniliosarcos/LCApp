import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
import { CategoriesComponent } from './categories.component';

const categories: Category[] = [
  { id: 'c1', name: 'Rosas', slug: 'rosas', description: 'Ramos y flores' },
  { id: 'c2', name: 'Girasoles', slug: 'girasoles', description: '' }
];

describe('CategoriesComponent', () => {
  let fixture: ComponentFixture<CategoriesComponent>;
  let component: CategoriesComponent;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCategories', 'createCategory', 'updateCategory']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['show']);

    await TestBed.configureTestingModule({
      declarations: [CategoriesComponent, AppModalComponent, AppLoadingSpinnerComponent],
      imports: [FormsModule],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy }
      ]
    }).compileComponents();
  });

  it('carga y muestra las categorías', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    createComponent();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Rosas');
    expect(rows[0].textContent).toContain('Ramos y flores');
    expect(rows[1].textContent).toContain('-');
  });

  it('muestra el error si falla la carga', () => {
    catalogServiceSpy.getCategories.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las categorías.');
  });

  it('abre el modal con el formulario vacío al pulsar "Nueva categoría"', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    createComponent();

    fixture.nativeElement.querySelector('.btn-primary').click();
    fixture.detectChanges();

    expect(component.formOpen).toBeTrue();
    expect(component.form.name).toBe('');
    expect(fixture.nativeElement.querySelector('.modal-header h2').textContent).toContain('Nueva categoría');
  });

  it('precarga el formulario al editar una categoría', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    createComponent();

    component.openEdit(categories[0]);

    expect(component.editingCategory).toBe(categories[0]);
    expect(component.form.name).toBe('Rosas');
    expect(component.form.description).toBe('Ramos y flores');
  });

  it('crea una categoría y muestra el mensaje de éxito', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.createCategory.and.returnValue(of(categories[0]));
    createComponent();

    component.openCreate();
    component.form.name = 'Orquídeas';
    component.onSubmit();

    expect(catalogServiceSpy.createCategory).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Orquídeas' }));
    expect(snackbarSpy.show).toHaveBeenCalledWith('Categoría creada', 'success');
    expect(component.formOpen).toBeFalse();
  });

  it('edita una categoría y muestra el mensaje de éxito', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.updateCategory.and.returnValue(of(categories[0]));
    createComponent();

    component.openEdit(categories[0]);
    component.form.name = 'Rosas premium';
    component.onSubmit();

    expect(catalogServiceSpy.updateCategory).toHaveBeenCalledWith('c1', jasmine.objectContaining({ name: 'Rosas premium' }));
    expect(snackbarSpy.show).toHaveBeenCalledWith('Categoría actualizada', 'success');
  });

  it('no envía el formulario sin nombre', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    createComponent();

    component.openCreate();
    component.form.name = '';
    component.onSubmit();

    expect(catalogServiceSpy.createCategory).not.toHaveBeenCalled();
    expect(component.formError).toContain('nombre');
  });

  it('muestra el error del servidor en el formulario', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.createCategory.and.returnValue(throwError(() => new Error('El slug ya existe')));
    createComponent();

    component.openCreate();
    component.form.name = 'Rosas';
    component.onSubmit();

    expect(component.formError).toBe('El slug ya existe');
    expect(component.formSaving).toBeFalse();
  });
});
