const {job} = require('root/jobs/job')

const worker$ = ({tableId, columnName}) => {
    const ee = require('ee')

    return ee.getInfo$(
        ee.FeatureCollection(tableId)
            .distinct(columnName)
            .sort(columnName)
            .aggregate_array(columnName),
        'column values'
    )
}

module.exports = job({
    jobName: 'Get EE Table column values',
    jobPath: __filename,
    args: ctx => [ctx.request.query],
    worker$
})
