import { Body, Controller, Post } from '@nestjs/common';

class CreateCatDto {
  name!: string;
  age!: number;
  breed!: string;
}

interface CreateCatShape {
  name: string;
}

@Controller('request-payloads')
class RequestPayloadsController {
  // class 参数类型应保留为可供反射读取的运行时构造函数。
  @Post()
  createWithClass(@Body() body: CreateCatDto): unknown {
    return body;
  }

  // interface 会在编译时消失，运行时元数据无法保留它本身。
  @Post('interface')
  createWithInterface(@Body() body: CreateCatShape): unknown {
    return body;
  }
}

describe('Request payload DTO metadata', () => {
  it('retains a DTO class and erases an interface in runtime parameter types', () => {
    const classParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RequestPayloadsController.prototype,
      'createWithClass',
    );
    const interfaceParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RequestPayloadsController.prototype,
      'createWithInterface',
    );

    expect(classParamTypes).toEqual([CreateCatDto]);
    expect(interfaceParamTypes).toEqual([Object]);
  });
});
