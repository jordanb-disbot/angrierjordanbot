export class SystemClock {
    now() { return new Date(); }
}
export class FixedClock {
    current;
    constructor(current) {
        this.current = current;
    }
    now() { return new Date(this.current); }
    set(value) { this.current = new Date(value); }
    advanceMs(ms) { this.current = new Date(this.current.getTime() + ms); }
}
//# sourceMappingURL=time.js.map