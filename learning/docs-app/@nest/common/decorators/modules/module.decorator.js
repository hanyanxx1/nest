import 'reflect-metadata';
export function Module(metadata) {
    return (target) => {
        for (const [key, value] of Object.entries(metadata)) {
            Reflect.defineMetadata(key, value, target);
        }
    };
}
//# sourceMappingURL=module.decorator.js.map