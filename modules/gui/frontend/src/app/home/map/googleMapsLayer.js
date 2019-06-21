import ee from 'earthengine-api'
import guid from 'guid'
import {get$} from 'http-client'
import {JobQueue, JobScheduler} from 'jobScheduler'
import {EMPTY, of, Subject} from 'rxjs'
import {delay, filter, first, flatMap, map, mergeAll, switchMap, takeUntil, tap} from 'rxjs/operators'
import {google} from './map'

class TileRequestQueue extends JobQueue {
    pendingRequests = []

    push(tile$, tileRequest) {
        this.pendingRequests.push({tile$, tileRequest})
    }

    nextJob$() {
        const [tile$] = this.pendingRequests.splice(-1, 1)
        return tile$ ? tile$ : EMPTY
    }
}

const tileRequestQueue = new TileRequestQueue()

export class GoogleMapsLayer {
    subscriptions = []

    constructor(tileProvider, {
        name,
        minZoom = 0,
        maxZoom = 20,
        tileSize = 256,
        opacity = 1
    } = {}) {
        this.tileProvider =
            new ThrottlingTileProvider(
                // new CancellingTileProvider(
                    tileProvider
                // )
            )
        this.name = name
        this.minZoom = minZoom
        this.maxZoom = maxZoom
        this.tileSize = new google.maps.Size(
            ee.layers.AbstractOverlay.DEFAULT_TILE_EDGE_LENGTH,
            ee.layers.AbstractOverlay.DEFAULT_TILE_EDGE_LENGTH
        )
        this.alt = undefined
        this.projection = undefined
        this.radius = undefined
    }

    getTile({x, y}, zoom, doc) {
        const tileRequest = this._toTileRequest({x, y, zoom, minZoom: this.minZoom, doc})
        if (tileRequest.outOfBounds)
            return tileRequest.element

        const tile$ = this.tileProvider.loadTile$(tileRequest)
        // tile$.subscribe(blob => renderImageBlob(tileRequest.element, blob))
        tile$.subscribe(
            next => console.log('next', {next}),
            error => console.log('error', {error}),
            () => console.log('complete'),
        )
        return tileRequest.element
    }

    releaseTile(tileElement) {
        this.tileProvider.releaseTile(tileElement.id)
    }

    addSubscription(subscription) {
        this.subscriptions.push(subscription)
    }

    close() {
        this.subscribers.forEach(subscription => subscription.unsubscribe())
        this.tileProvider.close()
    }

    _toTileRequest({x, y, zoom, minZoom, doc}) {
        const maxCoord = 1 << zoom
        x = x % maxCoord
        if (x < 0) {
            x += maxCoord
        }
        const element = doc.createElement('div')
        const id = [this.tileProvider.id, zoom, x, y].join('/')
        element.id = id
        const outOfBounds = zoom < minZoom || y < 0 || y >= maxCoord
        return {id, x, y, zoom, element, outOfBounds}
    }
}

// https://developers.google.com/maps/documentation/javascript/reference/image-overlay#MapType
// https://developers.google.com/maps/documentation/javascript/maptypes


export class TileProvider {
    id = guid()

    loadTile$(tileRequest) {
        throw Error('loadTile$ is expected to be overridden by subclass.')
    }

    releaseTile(tileElement) {
    }

    close() {
    }
}

export class EarthEngineTileProvider extends TileProvider {
    constructor(mapId, token) {
        super()
        this.mapId = mapId
        this.token = token
        this.priority = 1
    }

    loadTile$(tileRequest) {
        const url = `https://earthengine.googleapis.com/map/${this.mapId}/${tileRequest.zoom}/${tileRequest.x}/${tileRequest.y}?token=${this.token}`
        // return of(tileRequest).pipe(
        //     tap(() => console.log('executing', tileRequest)),
        //     delay(2000),
        //     tap(() => console.log('executed', tileRequest)),
        // )
        return get$(url, {retries: 0, noAuthChallenge: false, responseType: 'blob'}).pipe(
            map(e => e.response)
        )
    }
}

class CancellingTileProvider extends TileProvider {
    release$ = new Subject()
    close$ = new Subject()

    constructor(nextTileProvider) {
        super()
        this.nextTileProvider = nextTileProvider
    }

    loadTile$(tileRequest) {
        const tile$ = this.nextTileProvider.loadTile$(tileRequest)
        const releaseTile$ = this.release$.pipe(
            filter(requestId => requestId === tileRequest.id)
        )
        return tile$.pipe(
            takeUntil(releaseTile$),
            takeUntil(this.close$)
        )
    }

    releaseTile(requestId) {
        this.release$.next(requestId)
        this.nextTileProvider.releaseTile()
    }

    close() {
        this.close.next()
        this.nextTileProvider.close()
    }
}

class ThrottlingTileProvider extends TileProvider {
    jobScheduler = new JobScheduler(tileRequestQueue, 2)

    constructor(nextTileProvider) {
        super()
        this.nextTileProvider = nextTileProvider
    }

    loadTile$(tileRequest) {
        const tile$ = this.nextTileProvider.loadTile$(tileRequest)
        return this.jobScheduler.schedule$(tile$)
    }

    releaseTile(requestId) {
        this.nextTileProvider.releaseTile()
    }

    close() {
        this.nextTileProvider.close()
    }
}


const renderImageBlob = (element, blob) =>
    element.innerHTML = `<img src="${(window.URL || window.webkitURL).createObjectURL(blob)}"/>`

