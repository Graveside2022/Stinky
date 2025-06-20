/**
 * Object Pooling Utilities for Memory Optimization
 * Reuses objects to reduce garbage collection pressure
 */

class ObjectPool {
    constructor(createFn, resetFn, maxSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.pool = [];
        this.size = 0;
    }

    acquire() {
        if (this.size > 0) {
            this.size--;
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        if (this.size < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
            this.size++;
        }
    }

    clear() {
        this.pool.length = 0;
        this.size = 0;
    }

    getStats() {
        return {
            poolSize: this.size,
            maxSize: this.maxSize,
            utilizationPercent: Math.round((this.size / this.maxSize) * 100)
        };
    }
}

// Predefined pools for common objects
const bufferPool = new ObjectPool(
    () => Buffer.alloc(1024),
    (buffer) => buffer.fill(0),
    50
);

const responsePool = new ObjectPool(
    () => ({}),
    (obj) => {
        Object.keys(obj).forEach(key => delete obj[key]);
        return obj;
    },
    20
);

const arrayPool = new ObjectPool(
    () => [],
    (arr) => {
        arr.length = 0;
        return arr;
    },
    30
);

module.exports = {
    ObjectPool,
    bufferPool,
    responsePool,
    arrayPool
};