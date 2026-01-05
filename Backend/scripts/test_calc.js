const calculateDays = (start, end, type) => {
    try {
        const [startY, startM, startD] = (start instanceof Date)
            ? [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()]
            : String(start).split('-').map(Number);

        const [endY, endM, endD] = (end instanceof Date)
            ? [end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()]
            : String(end).split('-').map(Number);

        console.log("Success:", startY, startM, startD, "->", endY, endM, endD);
        return true;
    } catch (e) {
        console.log("Failed:", e.message);
        return false;
    }
};

console.log("Testing string:");
calculateDays('2025-12-18', '2025-12-19', 'Annual');

console.log("\nTesting Date object:");
calculateDays(new Date(), '2025-12-19', 'Annual');
