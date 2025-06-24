/**
 * WebSocket Message Batcher
 * Optimizes WebSocket performance by batching messages and implementing backpressure
 */

const EventEmitter = require('events');

class WebSocketBatcher extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.batchSize = options.batchSize || 50;
        this.batchInterval = options.batchInterval || 100; // ms
        this.maxQueueSize = options.maxQueueSize || 1000;
        this.compressionThreshold = options.compressionThreshold || 1024; // bytes
        
        // State
        this.messageQueue = new Map(); // Map of message type to array of messages
        this.batchTimer = null;
        this.stats = {
            messagesSent: 0,
            messagesDropped: 0,
            batchesSent: 0,
            bytesTransmitted: 0,
            compressionSavings: 0
        };
        
        // Start batch processing
        this.startBatchProcessing();
    }

    /**
     * Add a message to the batch queue
     * @param {string} type - Message type
     * @param {any} data - Message data
     * @param {Object} options - Message options
     */
    addMessage(type, data, options = {}) {
        // Check queue size to prevent memory issues
        const totalQueueSize = Array.from(this.messageQueue.values())
            .reduce((sum, queue) => sum + queue.length, 0);
            
        if (totalQueueSize >= this.maxQueueSize) {
            this.stats.messagesDropped++;
            this.emit('backpressure', { queueSize: totalQueueSize });
            return false;
        }

        // Initialize queue for message type if needed
        if (!this.messageQueue.has(type)) {
            this.messageQueue.set(type, []);
        }

        // Add message to queue
        const queue = this.messageQueue.get(type);
        queue.push({
            data,
            timestamp: Date.now(),
            priority: options.priority || 0
        });

        // Sort by priority if needed
        if (options.priority) {
            queue.sort((a, b) => b.priority - a.priority);
        }

        // Send immediately if high priority
        if (options.immediate || options.priority > 5) {
            this.processBatch();
        }

        return true;
    }

    /**
     * Start the batch processing timer
     */
    startBatchProcessing() {
        if (this.batchTimer) {
            return;
        }

        this.batchTimer = setInterval(() => {
            this.processBatch();
        }, this.batchInterval);
    }

    /**
     * Stop the batch processing timer
     */
    stopBatchProcessing() {
        if (this.batchTimer) {
            clearInterval(this.batchTimer);
            this.batchTimer = null;
        }
    }

    /**
     * Process and send the current batch
     */
    processBatch() {
        const batches = [];
        let totalMessages = 0;

        // Collect messages from all queues
        for (const [type, queue] of this.messageQueue.entries()) {
            if (queue.length === 0) {
                continue;
            }

            // Take up to batchSize messages
            const messages = queue.splice(0, this.batchSize);
            totalMessages += messages.length;

            // Create batch payload
            const batch = {
                type,
                messages: messages.map(m => ({
                    data: m.data,
                    ts: m.timestamp
                })),
                batchId: this.generateBatchId(),
                timestamp: Date.now()
            };

            batches.push(batch);
        }

        // Send batches if any
        if (batches.length > 0) {
            this.sendBatches(batches);
            this.stats.batchesSent++;
            this.stats.messagesSent += totalMessages;
        }
    }

    /**
     * Send batches to WebSocket
     * @param {Array} batches - Array of batch objects
     */
    sendBatches(batches) {
        const payload = {
            batches,
            stats: {
                queueSize: this.getQueueSize(),
                droppedMessages: this.stats.messagesDropped
            }
        };

        // Convert to JSON
        let data = JSON.stringify(payload);
        const originalSize = data.length;

        // Compress if above threshold
        if (originalSize > this.compressionThreshold) {
            data = this.compressData(data);
            this.stats.compressionSavings += (originalSize - data.length);
        }

        this.stats.bytesTransmitted += data.length;

        // Emit the batch for sending
        this.emit('batch', {
            data,
            compressed: originalSize > this.compressionThreshold,
            originalSize,
            compressedSize: data.length
        });
    }

    /**
     * Compress data using simple RLE or base64
     * @param {string} data - Data to compress
     * @returns {string} Compressed data
     */
    compressData(data) {
        // Simple compression - in production, use proper compression library
        try {
            // Convert to base64 (not true compression, but demonstrates the pattern)
            return Buffer.from(data).toString('base64');
        } catch (error) {
            console.error('Compression error:', error);
            return data;
        }
    }

    /**
     * Generate unique batch ID
     * @returns {string} Batch ID
     */
    generateBatchId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get total queue size across all message types
     * @returns {number} Total queue size
     */
    getQueueSize() {
        return Array.from(this.messageQueue.values())
            .reduce((sum, queue) => sum + queue.length, 0);
    }

    /**
     * Clear all queued messages
     */
    clearQueue() {
        for (const queue of this.messageQueue.values()) {
            queue.length = 0;
        }
    }

    /**
     * Get current statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            currentQueueSize: this.getQueueSize(),
            messageTypes: Array.from(this.messageQueue.keys())
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            messagesSent: 0,
            messagesDropped: 0,
            batchesSent: 0,
            bytesTransmitted: 0,
            compressionSavings: 0
        };
    }

    /**
     * Destroy the batcher and clean up
     */
    destroy() {
        this.stopBatchProcessing();
        this.clearQueue();
        this.removeAllListeners();
    }
}

module.exports = WebSocketBatcher;