require('sepal/log').configureServer(require('./log.json'))
const log = require('sepal/log').getLogger('main')

const _ = require('lodash')

const {connect$} = require('./messageQueue')
const {logStats} = require('./emailQueue')
const {messageHandler} = require('./messageHandler')

const main = async () => {
    const initialize = async ({topicSubscriber}) => {
        await topicSubscriber({
            queue: 'email.send',
            topic: 'email.send',
            handler: messageHandler
        })
        
        await logStats()
    }
    
    await connect$().subscribe(
        connection => initialize(connection)
    )
}

main().catch(log.error)