import { RequestMethod } from '../../common/enums/request-method.enum.js';

export interface RouteConflictCandidate {
  method: RequestMethod;
  path: string;
  host?: string;
}

export class RouteConflictDetector {
  static detectDuplicateConflicts(routes: readonly RouteConflictCandidate[]): string[] {
    const conflicts: string[] = [];

    for (const [index, earlier] of routes.entries()) {
      for (const later of routes.slice(index + 1)) {
        const isDuplicate =
          earlier.method === later.method && earlier.path === later.path && earlier.host === later.host;

        if (isDuplicate) {
          conflicts.push(`${RequestMethod[earlier.method]} ${earlier.path} is registered more than once`);
        }
      }
    }

    return conflicts;
  }

  static detectShadowConflicts(routes: readonly RouteConflictCandidate[]): string[] {
    const conflicts: string[] = [];

    for (const [index, earlier] of routes.entries()) {
      for (const later of routes.slice(index + 1)) {
        if (!this.methodsCanOverlap(earlier.method, later.method)) {
          continue;
        }

        if (!this.hostsCanOverlap(earlier.host, later.host)) {
          continue;
        }

        if (!this.pathsHaveParameterLiteralOverlap(earlier.path, later.path)) {
          continue;
        }

        conflicts.push(
          `${RequestMethod[earlier.method]} ${earlier.path} overlaps ` + `${RequestMethod[later.method]} ${later.path}`,
        );
      }
    }

    return conflicts;
  }

  private static methodsCanOverlap(left: RequestMethod, right: RequestMethod): boolean {
    return left === right || left === RequestMethod.ALL || right === RequestMethod.ALL;
  }

  private static hostsCanOverlap(left?: string, right?: string): boolean {
    if (left === undefined || right === undefined) {
      return true;
    }

    const leftLabels = left.toLowerCase().split('.');
    const rightLabels = right.toLowerCase().split('.');

    if (leftLabels.length !== rightLabels.length) {
      return false;
    }

    return leftLabels.every((leftLabel, index) => {
      const rightLabel = rightLabels[index];
      return leftLabel === rightLabel || leftLabel.startsWith(':') || rightLabel.startsWith(':');
    });
  }

  private static pathsHaveParameterLiteralOverlap(leftPath: string, rightPath: string): boolean {
    const leftSegments = leftPath.split('/').filter(Boolean);
    const rightSegments = rightPath.split('/').filter(Boolean);

    if (leftSegments.length !== rightSegments.length) {
      return false;
    }

    let hasParameterOverlap = false;

    for (const [index, leftSegment] of leftSegments.entries()) {
      const rightSegment = rightSegments[index];

      if (leftSegment === rightSegment) {
        continue;
      }

      const leftIsParameter = leftSegment.startsWith(':');
      const rightIsParameter = rightSegment.startsWith(':');

      // 两个字面段不同才确定不重叠；只要一侧是参数段，就可能匹配同一路径。
      if (!leftIsParameter && !rightIsParameter) {
        return false;
      }

      hasParameterOverlap = true;
    }

    return hasParameterOverlap;
  }
}
