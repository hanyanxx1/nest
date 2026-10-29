export const PATH_METADATA = 'path';
export const CONTROLLER_WATERMARK = '__controller__';
export const METHOD_METADATA = 'method';
// 标记类是否使用了 @Injectable()；例如 AppService 上读取到的值是 true。
export const INJECTABLE_WATERMARK = '__injectable__';

/**
 * 参数装饰器元数据键。
 * 存储方法参数的装饰器信息（如 @Res(), @Req(), @Param(), @Query(), @Body() 等）。
 * 格式：{ [paramIndex]: { decorator: 'Res', options: {...} } }
 */
export const PARAM_DECORATORS_METADATA = '__param_decorators__';
