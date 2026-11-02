import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../constants.js';
export interface ResDecoratorOptions {
  passthrough?: boolean;
}

function createParamDecorator(decoratorName: string, options?: any): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      return;
    }

    const existingDecorators = Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, target, propertyKey) || {};

    existingDecorators[parameterIndex] = {
      decorator: decoratorName,
      options: options || {},
    };

    Reflect.defineMetadata(PARAM_DECORATORS_METADATA, existingDecorators, target, propertyKey);
  };
}

export function Res(options?: ResDecoratorOptions): ParameterDecorator {
  return createParamDecorator('Res', options);
}

export function Req(): ParameterDecorator {
  return createParamDecorator('Req');
}

export function Next(): ParameterDecorator {
  return createParamDecorator('Next');
}

export const Request = Req;
export const Response = Res;

export function Param(name?: string): ParameterDecorator {
  return createParamDecorator('Param', { name });
}

export function Query(name?: string): ParameterDecorator {
  return createParamDecorator('Query', { name });
}

export function Body(name?: string): ParameterDecorator {
  return createParamDecorator('Body', { name });
}

export function Headers(name?: string): ParameterDecorator {
  return createParamDecorator('Headers', { name });
}

export function Ip(): ParameterDecorator {
  return createParamDecorator('Ip');
}

export function HostParam(name?: string): ParameterDecorator {
  return createParamDecorator('HostParam', { name });
}
