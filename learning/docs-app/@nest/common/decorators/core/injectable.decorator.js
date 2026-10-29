import 'reflect-metadata';
import { INJECTABLE_WATERMARK } from '../../constants.js';
export function Injectable() {
    return (target) => {
        Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    };
}
//# sourceMappingURL=injectable.decorator.js.map