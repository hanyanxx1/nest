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
        // 完全相同的 method/path/host 属于 duplicate，不重复归类为 shadow。
        const isExactDuplicate =
          earlier.method === later.method && earlier.path === later.path && earlier.host === later.host;

        if (isExactDuplicate) {
          continue;
        }

        if (!this.methodsCanOverlap(earlier.method, later.method)) {
          continue;
        }

        if (!this.hostsCanOverlap(earlier.host, later.host)) {
          continue;
        }

        if (!this.pathsCanOverlap(earlier.path, later.path)) {
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

  private static pathsCanOverlap(leftPath: string, rightPath: string): boolean {
    const leftSegments = leftPath.split('/').filter(Boolean);
    const rightSegments = rightPath.split('/').filter(Boolean);

    const isWildcard = (segment: string | undefined): boolean =>
      segment !== undefined && (segment.startsWith('*') || (segment.startsWith('{*') && segment.endsWith('}')));

    const leftEndsInWildcard = isWildcard(leftSegments[leftSegments.length - 1]);
    const rightEndsInWildcard = isWildcard(rightSegments[rightSegments.length - 1]);

    if (leftSegments.length !== rightSegments.length) {
      // 只有较短路径以末尾 wildcard 结束时，才能吸收路径段数差。
      const shorterEndsInWildcard =
        leftSegments.length < rightSegments.length ? leftEndsInWildcard : rightEndsInWildcard;

      if (!shorterEndsInWildcard) {
        return false;
      }
    }

    const sharedLength = Math.min(leftSegments.length, rightSegments.length);

    for (const [index, leftSegment] of leftSegments.slice(0, sharedLength).entries()) {
      const rightSegment = rightSegments[index];

      if (leftSegment === rightSegment) {
        continue;
      }

      const leftIsParameter = leftSegment.startsWith(':');
      const rightIsParameter = rightSegment.startsWith(':');

      // 参数段或 wildcard 段可以与另一条路由的对应段重叠。
      if (!leftIsParameter && !rightIsParameter && !isWildcard(leftSegment) && !isWildcard(rightSegment)) {
        return false;
      }
    }

    return true;
  }
}
