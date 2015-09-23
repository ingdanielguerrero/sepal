package org.openforis.sepal.metadata.crawling

import groovy.util.slurpersupport.GPathResult
import org.apache.commons.io.IOUtils
import org.openforis.sepal.SepalConfiguration
import org.openforis.sepal.metadata.MetadataProvider
import org.openforis.sepal.metadata.UsgsDataRepository
import org.openforis.sepal.scene.DataSet
import org.openforis.sepal.util.DateTime
import org.openforis.sepal.util.ResourceLocator
import org.openforis.sepal.util.XmlUtils
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import static org.openforis.sepal.util.DateTime.parseEarthExplorerDateString

class EarthExplorerMetadataCrawler implements MetadataCrawler{

    private static final Integer PROVIDER_ID = 1
    private static final Logger LOG = LoggerFactory.getLogger(this)

    final UsgsDataRepository usgsDataRepository
    final ResourceLocator downloader
    final File downloadWorkingDir = new File(SepalConfiguration.instance.downloadWorkingDirectory)

    EarthExplorerMetadataCrawler(UsgsDataRepository usgsDataRepository, ResourceLocator downloader){
        this.usgsDataRepository = usgsDataRepository
        this.downloader = downloader
    }

    @Override
    def getProviderId() { PROVIDER_ID }


    def crawl(MetadataProvider crawlerInfo) {
        LOG.debug("Going to crawl $crawlerInfo")
        crawlerInfo.dataSets.each { dataSet ->
            def baseDownloadURL = "$crawlerInfo.entrypoint??sensor=$dataSet&start_path=1&start_row=1&end_path=233&end_row=248"
            int iterations = crawlerInfo.iterations
            def currentEndDate = new Date()
            def currentStartDate = DateTime.addDays(currentEndDate, crawlerInfo.iterationSize * -1)
            iterations.times {
                def end = DateTime.toDateString(currentEndDate)
                def start = DateTime.toDateString(currentStartDate)
                def downloadUrl = "$baseDownloadURL&start_date=$start&end_date=$end"
                LOG.info("Going to request metadata through $downloadUrl")
                downloader.download(downloadUrl) { InputStream inputStream ->
                    def storedFile = store(inputStream)
                    process(dataSet,storedFile)
                }
                currentEndDate = DateTime.addDays(currentStartDate, -1)
                currentStartDate = DateTime.addDays(currentEndDate, crawlerInfo.iterationSize * -1)
            }

        }
    }


    def store(InputStream stream){
        def fName = "metadata_" + System.currentTimeMillis() + ".xml"
        File fsFile = new File(downloadWorkingDir,fName)
        FileOutputStream fos = new FileOutputStream(fsFile)
        fos.withCloseable {
            IOUtils.copy(stream,fos)
        }

        return fsFile
    }

    private def process(DataSet dataSet, metadataFile){
        try{
            def metaDataTags = parse(metadataFile)
            metaDataTags.each{
                def attributeMap = normalize(it)
                def sceneId = attributeMap.sceneID
                def row = usgsDataRepository.getSceneMetadata(dataSet.id,sceneId)
                def dateUpdated = DateTime.parseDateString(attributeMap.dateUpdated)
                if (row && dateUpdated > row.dateUpdated){
                    updateMetadata(attributeMap,row.id)
                }else if (!row){
                    insertMetadata(dataSet,attributeMap)
                }
            }

        }finally{
            metadataFile.delete()
        }
    }

    private def parse(metadataFile){ new XmlSlurper().parse(metadataFile).depthFirst().findAll { it.name() == 'metaData' } }

    private def normalize(GPathResult node){
        def attributeMap = XmlUtils.nodeToMap(node)

        /*  Parsing some date strings */
        def startTime = attributeMap.get('sceneStartTime')
        startTime = (startTime) ? parseEarthExplorerDateString(startTime) : null
        attributeMap.put('sceneStartTime',startTime)

        def endTime = attributeMap.get('sceneStopTime')
        endTime = (endTime) ? parseEarthExplorerDateString(endTime) : null
        attributeMap.put('sceneStopTime',endTime)

        return attributeMap

    }

    private def updateMetadata(Map metadata,rowId){ usgsDataRepository.updateMetadata(rowId,metadata) }

    private def insertMetadata(DataSet dataSet,Map metadata){ usgsDataRepository.storeMetadata(dataSet.id,metadata) }
}