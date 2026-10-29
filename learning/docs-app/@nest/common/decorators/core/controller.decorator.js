import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA } from '../../constants.js';
export function Controller(prefix = '/') {
    return (target) => {
        Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
        Reflect.defineMetadata(PATH_METADATA, prefix, target);
    };
}
//# sourceMappingURL=controller.decorator.js.map