/**
 * Unit Tests for ProcessManager Service
 * Tests process lifecycle, PID management, and service orchestration
 */

const ProcessManager = require('../../../phase3/webhook_implementation/services/processManager');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const treeKill = require('tree-kill');

// Mock dependencies
jest.mock('fs').promises;
jest.mock('child_process');
jest.mock('tree-kill');

describe('ProcessManager', () => {
    let processManager;
    let mockLogger;
    let mockProcess;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        // Create mock process
        mockProcess = new EventEmitter();
        mockProcess.pid = 12345;
        mockProcess.unref = jest.fn();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();

        // Initialize ProcessManager
        processManager = new ProcessManager(mockLogger);
    });

    describe('startMainScript', () => {
        it('should start the main orchestration script successfully', async () => {
            spawn.mockReturnValue(mockProcess);
            
            const startPromise = processManager.startMainScript();
            
            // Verify spawn was called correctly
            expect(spawn).toHaveBeenCalledWith('sudo', ['-u', 'pi', '/home/pi/stinky/gps_kismet_wigle.sh'], {
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            // Wait for the promise to resolve
            const result = await startPromise;
            
            expect(result).toEqual({ success: true, pid: 12345 });
            expect(mockProcess.unref).toHaveBeenCalled();
            expect(processManager.runningProcesses.has('main')).toBe(true);
        });

        it('should handle stdout output correctly', async () => {
            spawn.mockReturnValue(mockProcess);
            
            const outputSpy = jest.fn();
            processManager.on('output', outputSpy);
            
            await processManager.startMainScript();
            
            // Simulate stdout data
            mockProcess.stdout.emit('data', Buffer.from('Test output'));
            
            expect(outputSpy).toHaveBeenCalledWith({
                script: 'main',
                type: 'stdout',
                data: 'Test output',
                timestamp: expect.any(Number)
            });
        });

        it('should handle stderr output correctly', async () => {
            spawn.mockReturnValue(mockProcess);
            
            const outputSpy = jest.fn();
            processManager.on('output', outputSpy);
            
            await processManager.startMainScript();
            
            // Simulate stderr data
            mockProcess.stderr.emit('data', Buffer.from('Error output'));
            
            expect(outputSpy).toHaveBeenCalledWith({
                script: 'main',
                type: 'stderr',
                data: 'Error output',
                timestamp: expect.any(Number)
            });
        });

        it('should handle process errors', async () => {
            spawn.mockReturnValue(mockProcess);
            
            const startPromise = processManager.startMainScript();
            
            // Simulate process error
            setImmediate(() => {
                mockProcess.emit('error', new Error('Failed to start'));
            });
            
            await expect(startPromise).rejects.toThrow('Failed to start');
        });

        it('should emit status change when process exits', async () => {
            spawn.mockReturnValue(mockProcess);
            
            const statusSpy = jest.fn();
            processManager.on('status_changed', statusSpy);
            
            await processManager.startMainScript();
            
            // Simulate process exit
            mockProcess.emit('close', 0);
            
            expect(statusSpy).toHaveBeenCalledWith({
                script: 'main',
                status: 'stopped',
                code: 0
            });
            expect(processManager.runningProcesses.has('main')).toBe(false);
        });
    });

    describe('stopAll', () => {
        it('should stop all services successfully', async () => {
            // Mock PID file reading
            fs.readFile = jest.fn()
                .mockResolvedValueOnce('12345') // main script PID
                .mockRejectedValue(new Error('File not found'));
            
            // Mock process killing
            treeKill.mockImplementation((pid, signal, cb) => cb(null));
            exec.mockImplementation((cmd, cb) => {
                if (cmd.includes('pkill')) {
                    cb(null, '', '');
                } else if (cmd.includes('systemctl restart gpsd')) {
                    cb(null, '', '');
                } else if (cmd.includes('ip link') || cmd.includes('iw dev')) {
                    cb(null, '', '');
                }
            });
            
            // Mock file deletion
            fs.unlink = jest.fn().mockResolvedValue();
            
            const result = await processManager.stopAll();
            
            expect(result.success).toBe(true);
            expect(result.message).toContain('Main script stopped');
            expect(treeKill).toHaveBeenCalledWith(12345, 'SIGTERM', expect.any(Function));
            expect(exec).toHaveBeenCalledWith(expect.stringContaining('pkill -f "kismet"'), expect.any(Function));
            expect(exec).toHaveBeenCalledWith(expect.stringContaining('systemctl restart gpsd'), expect.any(Function));
        });

        it('should handle missing PID files gracefully', async () => {
            fs.readFile = jest.fn().mockRejectedValue(new Error('ENOENT'));
            fs.unlink = jest.fn().mockRejectedValue(new Error('ENOENT'));
            exec.mockImplementation((cmd, cb) => cb(null, '', ''));
            
            const result = await processManager.stopAll();
            
            expect(result.success).toBe(true);
            expect(result.message).toContain('PID not found');
        });

        it('should restore wlan2 to managed mode', async () => {
            fs.readFile = jest.fn().mockRejectedValue(new Error('ENOENT'));
            fs.unlink = jest.fn().mockResolvedValue();
            
            const execCalls = [];
            exec.mockImplementation((cmd, cb) => {
                execCalls.push(cmd);
                cb(null, '', '');
            });
            
            await processManager.stopAll();
            
            expect(execCalls).toContain('sudo ip link set wlan2 down');
            expect(execCalls).toContain('sudo iw dev wlan2 set type managed');
            expect(execCalls).toContain('sudo ip link set wlan2 up');
        });
    });

    describe('Status checks', () => {
        describe('isMainScriptRunning', () => {
            it('should return true when main script is running', async () => {
                fs.readFile = jest.fn().mockResolvedValue('12345\n');
                process.kill = jest.fn(); // Mock successful kill(0)
                
                const result = await processManager.isMainScriptRunning();
                
                expect(result).toBe(true);
                expect(fs.readFile).toHaveBeenCalledWith('/tmp/kismet_script.pid', 'utf8');
            });

            it('should return false when PID file does not exist', async () => {
                fs.readFile = jest.fn().mockRejectedValue(new Error('ENOENT'));
                
                const result = await processManager.isMainScriptRunning();
                
                expect(result).toBe(false);
            });

            it('should return false when process is not running', async () => {
                fs.readFile = jest.fn().mockResolvedValue('12345\n');
                process.kill = jest.fn().mockImplementation(() => {
                    throw new Error('ESRCH');
                });
                
                const result = await processManager.isMainScriptRunning();
                
                expect(result).toBe(false);
            });
        });

        describe('isKismetRunning', () => {
            it('should return true when Kismet is running', async () => {
                exec.mockImplementation((cmd, cb) => cb(null, '12345\n12346\n', ''));
                
                const result = await processManager.isKismetRunning();
                
                expect(result).toBe(true);
                expect(exec).toHaveBeenCalledWith('pgrep -f "kismet"', expect.any(Function));
            });

            it('should return false when Kismet is not running', async () => {
                exec.mockImplementation((cmd, cb) => cb(null, '', ''));
                
                const result = await processManager.isKismetRunning();
                
                expect(result).toBe(false);
            });

            it('should return false on error', async () => {
                exec.mockImplementation((cmd, cb) => cb(new Error('Command failed'), '', ''));
                
                const result = await processManager.isKismetRunning();
                
                expect(result).toBe(false);
            });
        });

        describe('isWigleToTakRunning', () => {
            it('should check PID file for WigleToTAK status', async () => {
                fs.readFile = jest.fn().mockResolvedValue('54321\n');
                process.kill = jest.fn(); // Mock successful kill(0)
                
                const result = await processManager.isWigleToTakRunning();
                
                expect(result).toBe(true);
                expect(fs.readFile).toHaveBeenCalledWith('/home/pi/tmp/wigletotak.specific.pid', 'utf8');
            });
        });
    });

    describe('getStatus', () => {
        it('should return comprehensive status of all services', async () => {
            // Mock all status checks
            processManager.isMainScriptRunning = jest.fn().mockResolvedValue(true);
            processManager.isKismetRunning = jest.fn().mockResolvedValue(true);
            processManager.isWigleToTakRunning = jest.fn().mockResolvedValue(true);
            
            const status = await processManager.getStatus();
            
            expect(status).toEqual({
                main_running: true,
                kismet_running: true,
                wigle_running: true,
                has_unhealthy: false
            });
        });

        it('should detect unhealthy state when main is running but Kismet is not', async () => {
            processManager.isMainScriptRunning = jest.fn().mockResolvedValue(true);
            processManager.isKismetRunning = jest.fn().mockResolvedValue(false);
            processManager.isWigleToTakRunning = jest.fn().mockResolvedValue(true);
            
            const status = await processManager.getStatus();
            
            expect(status.has_unhealthy).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('should clean up orphaned processes and stale PID files', async () => {
            // Mock PID file operations
            fs.readFile = jest.fn()
                .mockResolvedValueOnce('12345') // main PID
                .mockResolvedValueOnce('54321') // kismet PID
                .mockResolvedValueOnce('99999'); // wigle PID
            
            // Mock process checks - simulate stale PIDs
            process.kill = jest.fn().mockImplementation((pid) => {
                if (pid === 99999) throw new Error('ESRCH'); // stale PID
            });
            
            fs.unlink = jest.fn().mockResolvedValue();
            exec.mockImplementation((cmd, cb) => cb(null, '', ''));
            
            await processManager.cleanup();
            
            // Should try to kill orphaned processes
            expect(exec).toHaveBeenCalledWith('pkill -f "kismet"', expect.any(Function));
            expect(exec).toHaveBeenCalledWith('pkill -f "WigleToTak"', expect.any(Function));
            
            // Should remove stale PID file
            expect(fs.unlink).toHaveBeenCalledWith('/home/pi/tmp/wigletotak.specific.pid');
        });
    });

    describe('Helper methods', () => {
        describe('readPidFile', () => {
            it('should parse valid PID from file', async () => {
                fs.readFile = jest.fn().mockResolvedValue('12345\n');
                
                const pid = await processManager.readPidFile('/tmp/test.pid');
                
                expect(pid).toBe(12345);
            });

            it('should return null for invalid PID', async () => {
                fs.readFile = jest.fn().mockResolvedValue('not-a-number');
                
                const pid = await processManager.readPidFile('/tmp/test.pid');
                
                expect(pid).toBe(null);
            });

            it('should return null on error', async () => {
                fs.readFile = jest.fn().mockRejectedValue(new Error('ENOENT'));
                
                const pid = await processManager.readPidFile('/tmp/test.pid');
                
                expect(pid).toBe(null);
            });
        });

        describe('isProcessRunning', () => {
            it('should return true for running process', async () => {
                const originalKill = process.kill;
                process.kill = jest.fn();
                
                const result = await processManager.isProcessRunning(12345);
                
                expect(result).toBe(true);
                expect(process.kill).toHaveBeenCalledWith(12345, 0);
                
                process.kill = originalKill;
            });

            it('should return false for non-existent process', async () => {
                const originalKill = process.kill;
                process.kill = jest.fn().mockImplementation(() => {
                    throw new Error('ESRCH');
                });
                
                const result = await processManager.isProcessRunning(12345);
                
                expect(result).toBe(false);
                
                process.kill = originalKill;
            });
        });

        describe('executeCommand', () => {
            it('should execute command successfully', async () => {
                exec.mockImplementation((cmd, cb) => cb(null, 'output', ''));
                
                const result = await processManager.executeCommand('echo test');
                
                expect(result).toBe('output');
            });

            it('should reject on command error', async () => {
                exec.mockImplementation((cmd, cb) => cb(new Error('Command failed'), '', 'error'));
                
                await expect(processManager.executeCommand('invalid-command')).rejects.toThrow('Command failed');
            });
        });
    });
});