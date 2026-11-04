export type RouteConflictPolicyLevel = 'off' | 'warn' | 'error';

export interface RouteConflictPolicy {
  duplicate?: RouteConflictPolicyLevel;
  shadow?: RouteConflictPolicyLevel;
}

export type RouteResolutionStrategy = 'declaration' | 'specificity';
