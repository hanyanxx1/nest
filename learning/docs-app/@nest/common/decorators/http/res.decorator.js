import { PARAM_DECORATORS_METADATA } from '../../constants.js';
function createParamDecorator(decoratorName, options) {
    return (target, propertyKey, parameterIndex) => {
        const existingDecorators = Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, target, propertyKey) ||
            {};
        existingDecorators[parameterIndex] = {
            decorator: decoratorName,
            options: options || {},
        };
        Reflect.defineMetadata(PARAM_DECORATORS_METADATA, existingDecorators, target, propertyKey);
    };
}
export function Res(options) {
    return createParamDecorator('Res', options);
}
export function Req() {
    return createParamDecorator('Req');
}
//# sourceMappingURL=res.decorator.js.map