import {mapTo, tap} from 'rxjs/operators'
import {of} from 'rxjs'
import _ from 'lodash'
import ee from '@google/earthengine'
import guid from 'guid'

export default class EarthEngineLayer {
    constructor({mapContext, layerIndex, toggleable, label, description, bounds, mapId$, props, progress$}) {
        this.mapContext = mapContext
        this.layerIndex = layerIndex
        this.toggleable = toggleable
        this.label = label
        this.description = description
        this.bounds = bounds
        this.mapId$ = mapId$
        this.props = props
        this.progress$ = progress$
    }

    equals(o) {
        return _.isEqual(o && o.props, this.props)
    }

    addToMap() {
        const layer = new ee.layers.ImageOverlay(
            new ee.layers.EarthEngineTileSource(
                toMapId(this.mapId, this.token, this.urlTemplate)
            )
        )

        // [HACK] When fitting bounds with no change to bounds, after Google Maps v3.33,
        // tiles were loaded then removed. GEE used same id for tiles at the same position.
        // This caused freshly loaded tiles to be immediately removed.
        // This workaround uses unique tile ids. Hopefully this doesn't lead to any memory leaks.
        layer.getUniqueTileId_ = () => guid()

        this.mapContext.googleMap.overlayMapTypes.setAt(this.layerIndex, layer)

        const notifyOnProgress = () => {
            // Manually calculate stats, since GEE returns stats from multiple zoom-levels
            const tileStatuses = layer.tilesById.getValues()
                .filter(tile => tile.zoom === this.mapContext.googleMap.getZoom())
                .map(tile => tile.getStatus())
            const Status = ee.layers.AbstractTile.Status

            const loading = tileStatuses.filter(status => status === Status.LOADING).length
                + tileStatuses.filter(status => status === Status.NEW).length
                + tileStatuses.filter(status => status === Status.THROTTLED).length
            const loaded = tileStatuses.filter(status => status === Status.LOADED).length
            const failed = tileStatuses.filter(status => status === Status.FAILED).length
                + tileStatuses.filter(status => status === Status.ABORTED).length

            const tileStats = {
                count: loading + loaded + failed,
                loading,
                failed,
                loaded
            }
            tileStats.complete = tileStats.count === tileStats.loaded + tileStats.failed

            if (this.progress$ && tileStats.count > 0) {
                this.progress$.next(tileStats)
            } else {
                setTimeout(notifyOnProgress, 100)
            }
        }
        this.boundsChanged = this.mapContext.sepalMap.onBoundsChanged(notifyOnProgress)
        notifyOnProgress()
        layer.addEventListener('tile-load', notifyOnProgress)
        layer.addEventListener('tile-fail', notifyOnProgress)
    }

    removeFromMap() {
        this.boundsChanged && this.boundsChanged.removeListener()
        // [HACK] Prevent flashing of removed layers, which happens when just setting layer to null
        this.mapContext.googleMap.overlayMapTypes.insertAt(this.layerIndex, null)
        this.mapContext.googleMap.overlayMapTypes.removeAt(this.layerIndex + 1)
    }

    hide(hidden) {
        const layer = this.mapContext.googleMap.overlayMapTypes.getAt(this.layerIndex)
        layer && layer.setOpacity(hidden ? 0 : 1)
    }

    initialize$() {
        return this.mapId
            ? of(this)
            : this.mapId$.pipe(
                tap(({response: {token, mapId, urlTemplate, visParams}}) => {
                    this.token = token
                    this.mapId = mapId
                    this.urlTemplate = urlTemplate
                    this.visParams = visParams
                }),
                mapTo(this)
            )
    }
}

// Creates a ee.data.RawMapId.
// https://github.com/google/earthengine-api/blob/1a3121aa7574ecf2d5432c047621081aed8e1b28/javascript/src/data.js#L2198
const toMapId = (mapid, token, urlTemplate) => {
    const formatTileUrl = (x, y, z) => {
        const width = Math.pow(2, z)
        x = x % width
        if (x < 0) {
            x += width
        }
        return urlTemplate
            .replace('{x}', x)
            .replace('{y}', y)
            .replace('{z}', z)
    }
    return {mapid, token, formatTileUrl}
}
