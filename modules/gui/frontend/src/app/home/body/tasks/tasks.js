import {Button} from 'widget/button'
import {Content, SectionLayout, TopBar} from 'widget/sectionLayout'
import {Msg, msg} from 'translate'
import {Progress} from 'widget/progress'
import {connect} from 'store'
import React from 'react'
import api from 'api'
import styles from './tasks.module.css'
import look from 'style/look.module.css'
import clipboard from 'clipboard'

const mapStateToProps = (state) => ({
    tasks: state.tasks,
})

class Tasks extends React.Component {
    constructor(props) {
        super(props)
        this.state = {tasks: props.tasks || []}
    }

    renderOverlay(task) {
        return (
            <div className={styles.overlay}>
                {['FAILED', 'COMPLETED', 'CANCELED'].includes(task.status) ? (
                    <React.Fragment>
                        <Button
                            icon='copy'
                            label={msg('button.copyToClipboard')}
                            onClick={() => this.copyToClipboard(task)}/>
                        <Button
                            look={'cancel'}
                            icon='times'
                            label={msg('button.remove')}
                            onClick={() => this.removeTask(task)}/>
                    </React.Fragment>
                ) : task.status === 'ACTIVE' ?
                    <Button
                        className={styles.stop}
                        icon='stop'
                        label={msg('button.stop')}
                        onClick={() => this.stopTask(task)}/>
                    : null}
            </div>
        )
    }

    renderTask(task) {
        return (
            <div key={task.id} className={[styles.task, look.look, look.transparent].join(' ')}>
                <div className={styles.name}>{task.name}</div>
                <Progress className={styles.progress} status={task.status}/>
                <div className={styles.statusDescription}>{task.statusDescription}</div>
                {this.renderOverlay(task)}
            </div>
        )
    }

    renderTasks() {
        const {tasks} = this.state
        return tasks.length
            ? (
                <div className={styles.tasks}>
                    {tasks.map(task => this.renderTask(task))}
                </div>
            )
            : (
                <div className={styles.none}>
                    <Msg id='tasks.none'/>
                </div>
            )
    }

    renderToolbar() {
        const {tasks} = this.state
        return (
            <div className={styles.toolbar}>
                <Button
                    chromeless
                    size='large'
                    shape='circle'
                    icon='times'
                    tooltip={msg('tasks.removeAll.tooltip')}
                    tooltipPlacement='bottom'
                    onClick={() => this.removeAllTasks()}
                    disabled={!tasks.length}/>
            </div>
        )
    }

    render() {
        return (
            <SectionLayout>
                <TopBar label={msg('home.sections.tasks')}>
                    {this.renderToolbar()}
                </TopBar>
                <Content edgePadding menuPadding>
                    {this.renderTasks()}
                </Content>
            </SectionLayout>
        )
    }

    componentDidUpdate(prevProps) {
        if (prevProps.tasks !== this.props.tasks)
            this.setState(prevState => ({...prevState, tasks: this.props.tasks}))
    }

    copyToClipboard(task) {
        clipboard.copy(JSON.stringify(task, null, '  '))
    }

    removeTask(task) {
        const {asyncActionBuilder} = this.props
        const {tasks} = this.state
        this.setState(prevState => ({
            ...prevState,
            tasks: tasks.filter(t => t.id !== task.id)
        }))
        asyncActionBuilder('REMOVE_TASK',
            api.tasks.remove$(task.id)
        ).dispatch()
    }

    removeAllTasks() {
        const {asyncActionBuilder} = this.props
        const {tasks} = this.state
        this.setState(prevState => ({
            ...prevState,
            tasks: tasks.filter(t => !['FAILED', 'COMPLETED', 'CANCELED'].includes(t.status))
        }))
        asyncActionBuilder('REMOVE_ALL_TASK',
            api.tasks.removeAll$()
        ).dispatch()
    }

    stopTask(task) {
        const {asyncActionBuilder} = this.props
        this.updateTaskInState(task, () => ({
            ...task,
            status: 'CANCELED',
            statusDescription: 'Stopping...'
        }))
        asyncActionBuilder('STOP_TASK',
            api.tasks.cancel$(task.id)
        ).dispatch()
    }

    updateTaskInState(task, onUpdate) {
        const {tasks} = this.state
        this.setState(prevState => ({
            ...prevState,
            tasks: tasks.map(t =>
                t.id === task.id ? onUpdate() : t)
        }))
    }
}

export default connect(mapStateToProps)(Tasks)
