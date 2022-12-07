export async function delay(ms) {
    if (typeof window !== "undefined") {
        return new Promise((exec) => window.setTimeout(exec, ms));
    }
    else {
        // @ts-nocheck
        return new Promise((exec) => exec);
    }
}
export class CancellationToken {
    isCancelled = false;
}
