/**
 * Tests for logger.js - Centralized logger module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/js/logger.js';

describe('Logger', () => {
    let consoleSpy = {};
    const originalLevel = Logger.currentLevel;
    
    beforeEach(() => {
        // Spy on console methods
        consoleSpy.error = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleSpy.warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleSpy.log = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        // Reset to default level
        Logger.currentLevel = Logger.LEVELS.ERROR;
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
        Logger.currentLevel = originalLevel;
    });

    describe('LEVELS', () => {
        it('should have correct level values', () => {
            expect(Logger.LEVELS.NONE).toBe(0);
            expect(Logger.LEVELS.ERROR).toBe(1);
            expect(Logger.LEVELS.WARN).toBe(2);
            expect(Logger.LEVELS.INFO).toBe(3);
            expect(Logger.LEVELS.DEBUG).toBe(4);
        });
        
        it('should have all expected levels', () => {
            const levels = Object.keys(Logger.LEVELS);
            expect(levels).toContain('NONE');
            expect(levels).toContain('ERROR');
            expect(levels).toContain('WARN');
            expect(levels).toContain('INFO');
            expect(levels).toContain('DEBUG');
            expect(levels.length).toBe(5);
        });
    });

    describe('error()', () => {
        it('should log with ERROR level', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.error('Test error');
            expect(consoleSpy.error).toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', 'Test error');
        });
        
        it('should log with WARN level', () => {
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.error('Test error');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
        
        it('should log with INFO level', () => {
            Logger.currentLevel = Logger.LEVELS.INFO;
            Logger.error('Test error');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
        
        it('should log with DEBUG level', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.error('Test error');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
        
        it('should NOT log with NONE level', () => {
            Logger.currentLevel = Logger.LEVELS.NONE;
            Logger.error('Test error');
            expect(consoleSpy.error).not.toHaveBeenCalled();
        });
        
        it('should pass additional arguments', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            const obj = { key: 'value' };
            Logger.error('Error with data', obj, 123);
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', 'Error with data', obj, 123);
        });
    });

    describe('warn()', () => {
        it('should NOT log with ERROR level', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.warn('Test warning');
            expect(consoleSpy.warn).not.toHaveBeenCalled();
        });
        
        it('should log with WARN level', () => {
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.warn('Test warning');
            expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️', 'Test warning');
        });
        
        it('should log with INFO level', () => {
            Logger.currentLevel = Logger.LEVELS.INFO;
            Logger.warn('Test warning');
            expect(consoleSpy.warn).toHaveBeenCalled();
        });
        
        it('should log with DEBUG level', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.warn('Test warning');
            expect(consoleSpy.warn).toHaveBeenCalled();
        });
        
        it('should NOT log with NONE level', () => {
            Logger.currentLevel = Logger.LEVELS.NONE;
            Logger.warn('Test warning');
            expect(consoleSpy.warn).not.toHaveBeenCalled();
        });
        
        it('should pass additional arguments', () => {
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.warn('Warning', 'extra', 456);
            expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️', 'Warning', 'extra', 456);
        });
    });

    describe('info()', () => {
        it('should NOT log with ERROR level', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.info('Test info');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should NOT log with WARN level', () => {
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.info('Test info');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should log with INFO level', () => {
            Logger.currentLevel = Logger.LEVELS.INFO;
            Logger.info('Test info');
            expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️', 'Test info');
        });
        
        it('should log with DEBUG level', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.info('Test info');
            expect(consoleSpy.log).toHaveBeenCalled();
        });
        
        it('should NOT log with NONE level', () => {
            Logger.currentLevel = Logger.LEVELS.NONE;
            Logger.info('Test info');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should pass additional arguments', () => {
            Logger.currentLevel = Logger.LEVELS.INFO;
            const arr = [1, 2, 3];
            Logger.info('Info', arr);
            expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️', 'Info', arr);
        });
    });

    describe('debug()', () => {
        it('should NOT log with ERROR level', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.debug('Test debug');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should NOT log with WARN level', () => {
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.debug('Test debug');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should NOT log with INFO level', () => {
            Logger.currentLevel = Logger.LEVELS.INFO;
            Logger.debug('Test debug');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should log with DEBUG level', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.debug('Test debug');
            expect(consoleSpy.log).toHaveBeenCalledWith('🔍', 'Test debug');
        });
        
        it('should NOT log with NONE level', () => {
            Logger.currentLevel = Logger.LEVELS.NONE;
            Logger.debug('Test debug');
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should pass additional arguments', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.debug('Debug', { data: true }, null, undefined);
            expect(consoleSpy.log).toHaveBeenCalledWith('🔍', 'Debug', { data: true }, null, undefined);
        });
    });

    describe('setLevel()', () => {
        it('should set level to NONE', () => {
            Logger.setLevel(Logger.LEVELS.NONE);
            expect(Logger.currentLevel).toBe(Logger.LEVELS.NONE);
        });
        
        it('should set level to ERROR', () => {
            Logger.setLevel(Logger.LEVELS.ERROR);
            expect(Logger.currentLevel).toBe(Logger.LEVELS.ERROR);
        });
        
        it('should set level to WARN', () => {
            Logger.setLevel(Logger.LEVELS.WARN);
            expect(Logger.currentLevel).toBe(Logger.LEVELS.WARN);
        });
        
        it('should set level to INFO', () => {
            Logger.setLevel(Logger.LEVELS.INFO);
            expect(Logger.currentLevel).toBe(Logger.LEVELS.INFO);
        });
        
        it('should set level to DEBUG', () => {
            Logger.setLevel(Logger.LEVELS.DEBUG);
            expect(Logger.currentLevel).toBe(Logger.LEVELS.DEBUG);
        });
        
        it('should log level change when INFO or higher', () => {
            Logger.setLevel(Logger.LEVELS.INFO);
            expect(consoleSpy.log).toHaveBeenCalled();
        });
        
        it('should log level change when DEBUG', () => {
            Logger.setLevel(Logger.LEVELS.DEBUG);
            expect(consoleSpy.log).toHaveBeenCalled();
        });
        
        it('should NOT log level change when ERROR', () => {
            Logger.setLevel(Logger.LEVELS.ERROR);
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
        
        it('should NOT log level change when WARN', () => {
            Logger.setLevel(Logger.LEVELS.WARN);
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe('enableDebug()', () => {
        it('should set level to DEBUG', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.enableDebug();
            expect(Logger.currentLevel).toBe(Logger.LEVELS.DEBUG);
        });
        
        it('should enable all log methods', () => {
            Logger.enableDebug();
            
            Logger.error('error');
            Logger.warn('warn');
            Logger.info('info');
            Logger.debug('debug');
            
            expect(consoleSpy.error).toHaveBeenCalled();
            expect(consoleSpy.warn).toHaveBeenCalled();
            // info and debug both use console.log
            expect(consoleSpy.log).toHaveBeenCalledTimes(3); // 2 for info/debug + 1 for level change
        });
    });

    describe('enableProduction()', () => {
        it('should set level to ERROR', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.enableProduction();
            expect(Logger.currentLevel).toBe(Logger.LEVELS.ERROR);
        });
        
        it('should only allow error logs', () => {
            Logger.enableProduction();
            
            Logger.error('error');
            Logger.warn('warn');
            Logger.info('info');
            Logger.debug('debug');
            
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe('level filtering behavior', () => {
        it('should block lower priority logs at each level', () => {
            // At ERROR level: only error
            Logger.currentLevel = Logger.LEVELS.ERROR;
            Logger.error('e'); Logger.warn('w'); Logger.info('i'); Logger.debug('d');
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            expect(consoleSpy.warn).toHaveBeenCalledTimes(0);
            expect(consoleSpy.log).toHaveBeenCalledTimes(0);
            
            vi.clearAllMocks();
            
            // At WARN level: error + warn
            Logger.currentLevel = Logger.LEVELS.WARN;
            Logger.error('e'); Logger.warn('w'); Logger.info('i'); Logger.debug('d');
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.log).toHaveBeenCalledTimes(0);
            
            vi.clearAllMocks();
            
            // At INFO level: error + warn + info
            Logger.currentLevel = Logger.LEVELS.INFO;
            Logger.error('e'); Logger.warn('w'); Logger.info('i'); Logger.debug('d');
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.log).toHaveBeenCalledTimes(1); // only info
            
            vi.clearAllMocks();
            
            // At DEBUG level: all logs
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.error('e'); Logger.warn('w'); Logger.info('i'); Logger.debug('d');
            expect(consoleSpy.error).toHaveBeenCalledTimes(1);
            expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
            expect(consoleSpy.log).toHaveBeenCalledTimes(2); // info + debug
        });
        
        it('should handle NONE level blocking all logs', () => {
            Logger.currentLevel = Logger.LEVELS.NONE;
            
            Logger.error('error');
            Logger.warn('warn');
            Logger.info('info');
            Logger.debug('debug');
            
            expect(consoleSpy.error).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle empty messages', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.error('');
            Logger.warn('');
            Logger.info('');
            Logger.debug('');
            
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', '');
            expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️', '');
            expect(consoleSpy.log).toHaveBeenCalledWith('ℹ️', '');
            expect(consoleSpy.log).toHaveBeenCalledWith('🔍', '');
        });
        
        it('should handle undefined messages', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.error(undefined);
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', undefined);
        });
        
        it('should handle null messages', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            Logger.warn(null);
            expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️', null);
        });
        
        it('should handle object messages', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            const obj = { error: 'details', code: 500 };
            Logger.error(obj);
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', obj);
        });
        
        it('should handle Error objects', () => {
            Logger.currentLevel = Logger.LEVELS.ERROR;
            const error = new Error('Test error');
            Logger.error('Caught error:', error);
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', 'Caught error:', error);
        });
        
        it('should handle multiple complex arguments', () => {
            Logger.currentLevel = Logger.LEVELS.DEBUG;
            const args = [
                'Context:',
                { user: 'test' },
                [1, 2, 3],
                new Date(),
                Symbol('test'),
                () => 'function'
            ];
            Logger.debug(...args);
            expect(consoleSpy.log).toHaveBeenCalledWith('🔍', ...args);
        });
        
        it('should handle numeric level directly', () => {
            Logger.setLevel(3); // INFO
            expect(Logger.currentLevel).toBe(3);
            
            Logger.setLevel(0); // NONE
            expect(Logger.currentLevel).toBe(0);
        });
    });
});
