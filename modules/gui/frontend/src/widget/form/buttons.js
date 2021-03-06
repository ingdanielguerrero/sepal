import {Buttons} from 'widget/buttons'
import PropTypes from 'prop-types'
import React from 'react'
import _ from 'lodash'

export class FormButtons extends React.Component {
    render() {
        let {chromeless, look, shape, air, className, input, label, multiple, options, tooltip, tooltipPlacement,
            layout, alignment, spacing, disabled, onChange
        } = this.props
        return (
            <Buttons
                chromeless={chromeless}
                look={look}
                shape={shape}
                air={air}
                className={className}
                selected={input.value}
                onChange={value => {
                    input.set(value)
                    onChange && onChange(value)
                }}
                label={label}
                multiple={multiple}
                options={options}
                tooltip={tooltip}
                tooltipPlacement={tooltipPlacement}
                layout={layout}
                alignment={alignment}
                spacing={spacing}
                disabled={disabled}/>
        )
    }

    componentDidUpdate() {
        const {multiple, input, options} = this.props
        if (_.isUndefined(input.value) || _.isNull(input.value) || !input.value.length) {
            return
        }
        const availableValues = options
            .map(optionOrGroup =>
                Object.keys(optionOrGroup).includes('options')
                    ? optionOrGroup.disabled ? [] : optionOrGroup.options
                    : [optionOrGroup]
            )
            .flat()
            .filter(({disabled, neverSelected}) => !disabled && !neverSelected)
            .map(({value}) => value)

        input.set(multiple
            ? input.value.filter(value => availableValues.includes(value))
            : availableValues.includes(input.value)
                ? input.value
                : null
        )
    }
}

FormButtons.propTypes = {
    air: PropTypes.any,
    alignment: PropTypes.string,
    chromeless: PropTypes.any,
    className: PropTypes.string,
    disabled: PropTypes.any,
    input: PropTypes.object,
    label: PropTypes.any,
    layout: PropTypes.string,
    look: PropTypes.string,
    multiple: PropTypes.any,
    options: PropTypes.array,
    shape: PropTypes.string,
    spacing: PropTypes.string,
    tooltip: PropTypes.string,
    tooltipPlacement: PropTypes.string,
    onChange: PropTypes.any
}
