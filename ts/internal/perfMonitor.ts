/**
 * Minimal perf monitor shim for Indium components that previously depended on
 * Portfolio's global perf monitor. This keeps instrumentation call-sites intact
 * without requiring the full Portfolio runtime.
 */
const perf = {
    loopFrameStart(_loopName: string) {},
    loopFrameEnd(_loopName: string) {},
    segmentStart(_loopName: string, _segmentName: string): number { return -1; },
    segmentEnd(_segmentId: number) {}
};

export default perf;
