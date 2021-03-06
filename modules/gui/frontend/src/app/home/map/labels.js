import {NEVER, of} from 'rxjs'
import actionBuilder from 'action-builder'

export default class Labels {
    static showLabelsAction({mapContext: {google, googleMap, sepalMap}, layerIndex = 2, shown, statePath}) {
        return actionBuilder('SET_LABELS_SHOWN', {shown})
            .set([statePath, 'labelsShown'], shown)
            .sideEffect(() => {
                const layer = shown ? new Labels({google, googleMap, layerIndex}) : null
                sepalMap.setLayer({id: 'labels', layer, destroy$: NEVER})
            })
            .build()
    }

    constructor({google, googleMap, layerIndex}) {
        this.googleMap = googleMap
        this.layer = new google.maps.StyledMapType(labelsLayerStyle, {name: 'labels'})
        this.bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(90, -180),
            new google.maps.LatLng(-90, 180)
        )
        this.layerIndex = layerIndex
    }

    equals(o) {
        return o === this || o instanceof Labels
    }

    addToMap() {
        this.googleMap.overlayMapTypes.setAt(this.layerIndex, this.layer)
    }

    removeFromMap() {
        // [HACK] Prevent Google Maps locking up the GUI when zooming
        this.googleMap.overlayMapTypes.insertAt(this.layerIndex, null)
        this.googleMap.overlayMapTypes.removeAt(this.layerIndex + 1)
    }

    initialize$() {
        return of(this)
    }
}

const labelsLayerStyle = [
    {featureType: 'all', stylers: [{visibility: 'off'}]},
    {elementType: 'labels.text.fill', stylers: [{color: '#ebd1aa'}, {visibility: 'on'}]},
    {elementType: 'labels.text.stroke', stylers: [{color: '#000000'}, {visibility: 'on'}, {weight: 2}]},
    {elementType: 'geometry.stroke', stylers: [{color: '#000000'}, {visibility: 'on'}]},
    {featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{color: '#ebe5dd'}, {visibility: 'on'}]},
    {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{color: '#ebd9ca'}, {visibility: 'on'}]
    },
    {featureType: 'road', elementType: 'geometry', stylers: [{color: '#ebd1b1'}, {visibility: 'on'}]},
    {featureType: 'road', elementType: 'geometry.stroke', stylers: [{color: '#212a37'}, {visibility: 'on'}]},
    {featureType: 'road', elementType: 'labels.text.fill', stylers: [{color: '#ebe1db'}, {visibility: 'on'}]},
    {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#ebbba2'}, {visibility: 'on'}]},
    {featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{color: '#1f2835'}, {visibility: 'on'}]}
]
