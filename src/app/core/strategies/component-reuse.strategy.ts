import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

export class ComponentReuseStrategy implements RouteReuseStrategy {
  private readonly cache = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  store(_route: ActivatedRouteSnapshot, _handle: DetachedRouteHandle | null): void {}

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return false;
  }

  retrieve(_route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig?.component === curr.routeConfig?.component;
  }
}
