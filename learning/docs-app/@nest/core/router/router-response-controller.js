import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../common/constants.js';
export class RouterResponseController {
    applicationRef;
    constructor(applicationRef) {
        this.applicationRef = applicationRef;
    }
    apply(result, response, statusCode, handlerMethod) {
        const paramDecorators = handlerMethod
            ? (Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, handlerMethod) || {})
            : {};
        let hasResDecorator = false;
        let hasPassthrough = false;
        for (const paramIndex in paramDecorators) {
            const paramInfo = paramDecorators[paramIndex];
            if (paramInfo.decorator === 'Res') {
                hasResDecorator = true;
                if (paramInfo.options?.passthrough === true) {
                    hasPassthrough = true;
                }
                break;
            }
        }
        if (hasResDecorator && !hasPassthrough && result === undefined) {
            return;
        }
        return this.applicationRef.reply(response, result, statusCode);
    }
}
//# sourceMappingURL=router-response-controller.js.map