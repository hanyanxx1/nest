export interface ModuleMetadata {
  imports?: Array<Function | DynamicModule>;
  controllers?: Function[];
  providers?: Function[];
  exports?: Function[];
}

export interface DynamicModule extends ModuleMetadata {
  module: Function;
}
