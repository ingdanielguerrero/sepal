import {ReplaySubject} from 'rxjs'
import {finalize, first, takeUntil} from 'rxjs/operators'
import {requestTag} from './tag'

export const getRequestExecutor = concurrency => {
    const requestHandlers = {}
    const executed$ = new ReplaySubject()

    const addRequest = ({tileProviderId, requestId, request, response$, cancel$}) => {
        const requestHandler = {tileProviderId, request, response$, cancel$, timestamp: Date.now()}
        requestHandlers[requestId] = requestHandler
        console.log(`Added ${requestTag({tileProviderId, requestId})}`)
    }
    
    const removeRequest = ({tileProviderId, requestId}) => {
        delete requestHandlers[requestId]
        console.log(`Removed ${requestTag({tileProviderId, requestId})}`)
    }
    
    const available = () => {
        return Object.keys(requestHandlers).length < concurrency
    }
    
    const execute = ({tileProvider, tileProviderId, requestId, request, response$, cancel$}) => {
        addRequest({tileProviderId, requestId, request, response$, cancel$})
        tileProvider.loadTile$(request).pipe(
            first(),
            takeUntil(cancel$),
            finalize(() => {
                removeRequest({tileProviderId, requestId})
                executed$.next({tileProviderId, requestId})
            })
        ).subscribe({
            next: response => {
                response$.next(response)
                response$.complete()
            },
            error: error => {
                response$.error(error)
            }
        })
    }
    
    return {available, execute, executed$}
}