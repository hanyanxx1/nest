export interface ResDecoratorOptions {
  passthrough?: boolean;
}
export declare function Res(options?: ResDecoratorOptions): ParameterDecorator;
export declare function Req(): ParameterDecorator;
