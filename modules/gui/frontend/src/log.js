/* eslint-disable no-console */
import _ from 'lodash'
import config from './log.json'

const levels = {
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARN: 4,
    ERROR: 5,
    FATAL: 6
}

const defaultLevelName = config.default || 'error'

const getLevel = (levelName = '') =>
    levels[levelName.toUpperCase()] || levels[defaultLevelName.toUpperCase()]

const isEnabled = (level, minLevel) =>
    level <= minLevel

const foo = (func, levelName, loggerName, args) =>
    func(`[${new Date().toISOString()}]`, `[${levelName}]`, `${loggerName} -`, ...args)

export const getLogger = name => {
    const levelName = config[name]
    const level = getLevel(levelName)
    return {
        trace: (...args) => isEnabled(level, levels.TRACE) && foo(console.log, 'TRACE', name, args),
        debug: (...args) => isEnabled(level, levels.DEBUG) && foo(console.log, 'DEBUG', name, args),
        info: (...args) => isEnabled(level, levels.INFO) && foo(console.log, 'INFO', name, args),
        warn: (...args) => isEnabled(level, levels.WARN) && foo(console.warn, 'WARN', name, args),
        error: (...args) => isEnabled(level, levels.ERROR) && foo(console.error, 'ERROR', name, args),
        fatal: (...args) => isEnabled(level, levels.FATAL) && foo(console.error, 'UNKNOWN', name, args)
    }
}
