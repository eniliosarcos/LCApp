import { Component } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  readonly cartCount$ = this.cartService.getCount();

  constructor(private readonly cartService: CartService) {}
}
