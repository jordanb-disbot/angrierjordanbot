export class AuditService {
    sink;
    constructor(sink) {
        this.sink = sink;
    }
    async record(event) { await this.sink.write(event); }
}
//# sourceMappingURL=audit.js.map