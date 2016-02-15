package org.openforis.sepal.component.sandboxmanager

import groovymvc.Controller
import org.openforis.sepal.SepalConfiguration
import org.openforis.sepal.command.Command
import org.openforis.sepal.command.HandlerRegistryCommandDispatcher
import org.openforis.sepal.component.sandboxmanager.command.*
import org.openforis.sepal.component.sandboxmanager.endpoint.SepalSessionEndpoint
import org.openforis.sepal.component.sandboxmanager.query.*
import org.openforis.sepal.endpoint.EndpointRegistry
import org.openforis.sepal.hostingservice.HostingService
import org.openforis.sepal.hostingservice.WorkerInstanceManager
import org.openforis.sepal.query.HandlerRegistryQueryDispatcher
import org.openforis.sepal.query.Query
import org.openforis.sepal.transaction.SqlConnectionManager
import org.openforis.sepal.user.JDBCUserRepository
import org.openforis.sepal.util.Clock
import org.openforis.sepal.util.SystemClock

import javax.sql.DataSource

final class SandboxManagerComponent implements EndpointRegistry {
    private final HandlerRegistryCommandDispatcher commandDispatcher
    private final HandlerRegistryQueryDispatcher queryDispatcher
    private final SqlConnectionManager connectionManager
    private final SandboxWorkScheduler sandboxCleanup
    private final WorkerInstanceManager instanceManager
    private final Clock clock

    SandboxManagerComponent(SepalConfiguration config) {
        this(
                config.dataSource,
                instantiateHostingService(config).workerInstanceManager,
                new DockerSandboxSessionProvider(config, new SystemClock()),
                new SystemClock()
        )
    }

    SandboxManagerComponent(DataSource dataSource,
                            WorkerInstanceManager instanceManager,
                            SandboxSessionProvider sessionProvider,
                            Clock clock) {
        this.instanceManager = instanceManager
        connectionManager = new SqlConnectionManager(dataSource)
        def sessionRepository = new JdbcSessionRepository(connectionManager, clock)
        def userBudgetRepository = new JdbcUserBudgetRepository(connectionManager)
        this.clock = clock

        commandDispatcher = new HandlerRegistryCommandDispatcher(connectionManager)
                .register(CreateSession, new CreateSessionHandler(sessionRepository, instanceManager, sessionProvider, clock))
                .register(JoinSession, new JoinSessionHandler(sessionRepository, instanceManager, sessionProvider, clock))
                .register(CloseSession, new CloseSessionHandler(sessionRepository, sessionProvider))
                .register(CloseTimedOutSessions, new CloseTimedOutSessionsHandler(sessionRepository, sessionProvider))
                .register(UpdateInstances, new UpdateInstancesHandler(sessionRepository, instanceManager, sessionProvider))
                .register(SessionHeartbeatReceived, new SessionHeartbeatReceivedHandler(sessionRepository, clock))
                .register(UpdateUserBudget, new UpdateUserBudgetHandler(userBudgetRepository))
                .register(DeployStartingSessions, new DeployStartingSessionsHandler(sessionRepository, instanceManager, sessionProvider))

        queryDispatcher = new HandlerRegistryQueryDispatcher()
                .register(FindInstanceTypes, new FindInstanceTypesHandler(instanceManager))
                .register(LoadSandboxInfo, new LoadSandboxInfoHandler(sessionRepository, instanceManager, userBudgetRepository, clock))
                .register(LoadSession, new LoadSessionHandler(sessionRepository))

        sandboxCleanup = new SandboxWorkScheduler(commandDispatcher)
    }

    void registerEndpointsWith(Controller controller) {
        new SepalSessionEndpoint(queryDispatcher, commandDispatcher, new JDBCUserRepository(connectionManager), clock)
                .registerWith(controller)
    }

    SandboxManagerComponent start() {
        sandboxCleanup.start()
        instanceManager.start()
        return this
    }

    void stop() {
        sandboxCleanup?.stop()
        instanceManager?.stop()
    }

    def <R> R submit(Command<R> command) {
        commandDispatcher.submit(command)
    }

    def <R> R submit(Query<R> query) {
        queryDispatcher.submit(query)
    }

    private static HostingService instantiateHostingService(SepalConfiguration config) {
        HostingService.Factory.create(config.hostingService)
    }
}
