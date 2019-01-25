import {Field, form} from 'widget/form'
import {RecipeActions, RecipeState} from '../../mosaicRecipe'
import {initValues} from 'app/home/body/process/recipe'
import {msg} from 'translate'
import {recipePath} from 'app/home/body/process/mosaic/mosaicRecipe'
import Buttons from 'widget/buttons'
import Label from 'widget/label'
import Panel, {PanelContent, PanelHeader} from 'widget/panel'
import PanelButtons from 'widget/panelButtons'
import PropTypes from 'prop-types'
import React from 'react'
import Slider from 'widget/slider'
import styles from './composite.module.css'

const fields = {
    corrections: new Field(),
    shadowPercentile: new Field(),
    hazePercentile: new Field(),
    ndviPercentile: new Field(),
    dayOfYearPercentile: new Field(),
    mask: new Field(),
    compose: new Field()
}

class Composite extends React.Component {
    constructor(props) {
        super(props)
        this.recipeActions = RecipeActions(props.recipeId)
    }

    renderContent() {
        const {
            inputs: {
                corrections, shadowPercentile, hazePercentile, ndviPercentile, dayOfYearPercentile, mask, compose
            },
            source
        } = this.props
        return (
            <div className={styles.content}>
                <Buttons
                    label={msg('process.mosaic.panel.composite.form.corrections.label')}
                    input={corrections}
                    multiple={true}
                    options={[{
                        value: 'SR',
                        label: msg('process.mosaic.panel.composite.form.corrections.surfaceReflectance.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.corrections.surfaceReflectance.tooltip'),
                        neverSelected: source !== 'LANDSAT'
                    }, {
                        value: 'BRDF',
                        label: msg('process.mosaic.panel.composite.form.corrections.brdf.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.corrections.brdf.tooltip'),
                        neverSelected: source !== 'LANDSAT'
                    }]}
                />
                <div className={styles.filters}>
                    <Label
                        msg={msg('process.mosaic.panel.composite.form.filters.label')}
                        tooltip={msg('process.mosaic.panel.composite.form.filters.tooltip')}
                        tooltipPlacement='topLeft'/>
                    <PercentileField input={shadowPercentile}/>
                    <PercentileField
                        input={hazePercentile}
                        disabled={source === 'LANDSAT' && corrections.value.includes('SR')}/>
                    <PercentileField input={ndviPercentile}/>
                    <PercentileField input={dayOfYearPercentile}/>
                </div>
                <Buttons
                    label={msg('process.mosaic.panel.composite.form.mask.label')}
                    input={mask}
                    multiple={true}
                    options={[{
                        value: 'CLOUDS',
                        label: msg('process.mosaic.panel.composite.form.mask.clouds.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.mask.clouds.tooltip')
                    }, {
                        value: 'SNOW',
                        label: msg('process.mosaic.panel.composite.form.mask.snow.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.mask.snow.tooltip')
                    }]}
                />
                <Buttons
                    label={msg('process.mosaic.panel.composite.form.composingMethod.label')}
                    input={compose}
                    options={[{
                        value: 'MEDOID',
                        label: msg('process.mosaic.panel.composite.form.composingMethod.medoid.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.composingMethod.medoid.tooltip')
                    }, {
                        value: 'MEDIAN',
                        label: msg('process.mosaic.panel.composite.form.composingMethod.median.label'),
                        tooltip: msg('process.mosaic.panel.composite.form.composingMethod.median.tooltip')
                    }]}
                />
            </div>
        )
    }

    render() {
        const {recipeId, form} = this.props
        return (
            <Panel
                className={styles.panel}
                form={form}
                statePath={recipePath(recipeId, 'ui')}
                onApply={values => this.recipeActions.setCompositeOptions({
                    values,
                    model: valuesToModel(values)
                }).dispatch()}>
                <PanelHeader
                    icon='layer-group'
                    title={msg('process.mosaic.panel.composite.title')}/>

                <PanelContent>
                    {this.renderContent()}
                </PanelContent>

                <PanelButtons/>
            </Panel>
        )
    }
}

Composite.propTypes = {
    disabled: PropTypes.any,
    recipeId: PropTypes.string,
    source: PropTypes.string
}

const PercentileField = ({input, disabled = false}) => {
    return (
        <Slider
            input={input}
            minValue={0}
            maxValue={100}
            ticks={[0, 10, 25, 50, 75, 90, 100]}
            snap
            range='right'
            info={percentile => {
                const type = percentile === 0 ? 'off' : percentile === 100 ? 'max' : 'percentile'
                return msg(['process.mosaic.panel.composite.form.filters', input.name, type], {percentile})
            }}
            disabled={disabled}/>
    )
}

PercentileField.propTypes = {
    disabled: PropTypes.any,
    input: PropTypes.object
}

const valuesToModel = values => ({
    corrections: values.corrections,
    filters: [
        {type: 'SHADOW', percentile: values.shadowPercentile},
        {type: 'HAZE', percentile: values.hazePercentile},
        {type: 'NDVI', percentile: values.ndviPercentile},
        {type: 'DAY_OF_YEAR', percentile: values.dayOfYearPercentile},
    ].filter(({percentile}) => percentile),
    mask: values.mask,
    compose: values.compose,
})

const modelToValues = model => {
    const getPercentile = type => {
        const filter = model.filters.find(filter => filter.type === type)
        return filter ? filter.percentile : 0
    }
    return ({
        corrections: model.corrections,
        shadowPercentile: getPercentile('SHADOW'),
        hazePercentile: getPercentile('HAZE'),
        ndviPercentile: getPercentile('NDVI'),
        dayOfYearPercentile: getPercentile('DAY_OF_YEAR'),
        mask: model.mask,
        compose: model.compose,
    })
}

export default initValues({
    getModel: props => RecipeState(props.recipeId)('model.compositeOptions'),
    getValues: props => RecipeState(props.recipeId)('ui.compositeOptions'),
    modelToValues,
    onInitialized: ({model, values, props}) =>
        RecipeActions(props.recipeId)
            .setCompositeOptions({values, model})
            .dispatch()
})(
    form({fields})(Composite)
)
