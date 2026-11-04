export class RouteConflictException extends Error {
  constructor(conflicts: string[]) {
    super(`Conflicting HTTP routes detected:\n${conflicts.map((conflict) => `- ${conflict}`).join('\n')}`);
    this.name = 'RouteConflictException';
  }
}
