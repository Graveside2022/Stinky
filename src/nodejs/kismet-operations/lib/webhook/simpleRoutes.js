/**
 * Simple Webhook Routes - Minimal implementation for testing
 */

const express = require('express');

module.exports = (app) => {
    const router = express.Router();
    
    // In-memory webhook storage
    const webhooks = new Map();
    
    /**
     * POST /api/webhooks/configure
     * Configure webhook settings
     */
    router.post('/configure', (req, res) => {
        try {
            const { url, events = ['all'], enabled = true, headers = {} } = req.body;
            
            // Basic validation
            if (!url) {
                return res.status(400).json({
                    success: false,
                    error: 'MISSING_URL',
                    message: 'URL is required',
                    timestamp: new Date().toISOString()
                });
            }
            
            // Generate unique webhook ID
            const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            const webhookConfig = {
                id: webhookId,
                url,
                events,
                enabled,
                headers,
                createdAt: new Date().toISOString(),
                lastTriggered: null,
                triggerCount: 0
            };
            
            webhooks.set(webhookId, webhookConfig);
            
            res.status(201).json({
                success: true,
                message: 'Webhook configured successfully',
                webhook: webhookConfig,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'CONFIGURATION_FAILED',
                message: 'Failed to configure webhook',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    /**
     * GET /api/webhooks
     * Get all configured webhooks
     */
    router.get('/', (req, res) => {
        try {
            const { enabled, event } = req.query;
            
            let webhooksList = Array.from(webhooks.values());
            
            // Filter by enabled status if specified
            if (enabled !== undefined) {
                webhooksList = webhooksList.filter(w => w.enabled === (enabled === 'true'));
            }
            
            // Filter by event if specified
            if (event) {
                webhooksList = webhooksList.filter(w => 
                    w.events.includes('all') || w.events.includes(event)
                );
            }
            
            res.json({
                success: true,
                webhooks: webhooksList,
                total: webhooksList.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'FETCH_FAILED',
                message: 'Failed to retrieve webhooks',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    /**
     * DELETE /api/webhooks/:id
     * Delete a specific webhook
     */
    router.delete('/:id', (req, res) => {
        try {
            const { id } = req.params;
            
            // Check if webhook exists
            if (!webhooks.has(id)) {
                return res.status(404).json({
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Webhook not found',
                    details: `No webhook with ID: ${id}`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Get webhook details before deletion
            const webhook = webhooks.get(id);
            
            // Delete the webhook
            webhooks.delete(id);
            
            res.json({
                success: true,
                message: 'Webhook deleted successfully',
                webhook: { id, url: webhook.url },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'DELETE_FAILED',
                message: 'Failed to delete webhook',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Mount the router
    app.use('/api/webhooks', router);
    
    console.log('Simple webhook routes mounted at /api/webhooks');
};