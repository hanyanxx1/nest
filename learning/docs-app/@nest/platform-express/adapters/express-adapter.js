export class ExpressAdapter {
    httpServer;
    constructor(httpServer) {
        this.httpServer = httpServer;
    }
    registerGet(path, handler) {
        return this.httpServer.get(path, handler);
    }
    reply(response, body, statusCode) {
        if (statusCode !== undefined) {
            response.status(statusCode);
        }
        if (body === null || body === undefined) {
            return response.send();
        }
        if (typeof body === 'object') {
            return response.json(body);
        }
        return response.send(String(body));
    }
}
//# sourceMappingURL=express-adapter.js.map