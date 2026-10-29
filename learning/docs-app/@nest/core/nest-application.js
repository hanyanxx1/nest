export class NestApplication {
    httpServer;
    constructor(httpServer) {
        this.httpServer = httpServer;
    }
    listen(port) {
        const numericPort = typeof port === 'number' ? port : Number(port);
        if (!Number.isInteger(numericPort) ||
            numericPort < 0 ||
            numericPort > 65535) {
            throw new RangeError(`无效的 HTTP 端口：${port}`);
        }
        return new Promise((resolve, reject) => {
            const server = this.httpServer.listen(numericPort, () => resolve());
            server.once('error', reject);
        });
    }
}
//# sourceMappingURL=nest-application.js.map