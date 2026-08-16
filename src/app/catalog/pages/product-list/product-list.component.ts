import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
  category?: Category;
  products: Product[] = [];
  loading = true;
  error = false;
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', link: '/' },
    { label: 'Productos', link: '' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    const categoryId = this.route.snapshot.paramMap.get('categoryId');
    if (categoryId) {
      this.catalogService.getCategoryById(categoryId).subscribe(category => {
        this.category = category;
        if (category) {
          this.breadcrumbItems = [
            { label: 'Inicio', link: '/' },
            { label: category.name, link: '' }
          ];
        }
      });
      this.catalogService.getProductsByCategory(categoryId).subscribe({
        next: products => {
          this.products = products;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = true;
        }
      });
    } else {
      this.loading = false;
    }
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }
}
