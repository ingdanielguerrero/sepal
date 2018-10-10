import {filter, map, switchMap} from 'rxjs/operators'
import {select} from 'store'
import actionBuilder from 'action-builder'
import api from 'api'

export const currentUser = () => select('user.currentUser')
export const invalidCredentials = () => select('user.login.invalidCredentials')

export const resetInvalidCredentials = () =>
    actionBuilder('RESET_INVALID_CREDENTIALS')
        .del('user.login.invalidCredentials')
        .dispatch()

export const loadCurrentUser$ = () =>
    api.user.loadCurrentUser$().pipe(
        map((user) =>
            actionBuilder('SET_CURRENT_USER', {user})
                .set('user.currentUser', user)
                .build()
        )
    )

export const loadCurrentUserReport$ = () => {
    api.user.loadCurrentUserReport$().pipe(
        map((userReport) =>
            actionBuilder('SET_CURRENT_USER_REPORT', {userReport})
                .set('user.currentUserReport', userReport)
                .build()
        )
    )
}

export const login$ = (username, password) => {
    resetInvalidCredentials()
    return api.user.login$(username, password).pipe(
        map((user) => actionBuilder('CREDENTIALS_POSTED')
            .set('user.currentUser', user)
            .set('user.login.invalidCredentials', !user)
            .build()
        )
    )
}

export const requestPasswordReset$ = (email) =>
    api.user.requestPasswordReset$(email).pipe(
        filter(() => false)
    )

export const validateToken$ = (token) =>
    api.user.validateToken$(token).pipe(
        map(({user}) =>
            actionBuilder('TOKEN_VALIDATED', {valid: !!user})
                .set('user.tokenUser', user)
                .build())
    )

export const tokenUser = () =>
    select('user.tokenUser')

export const resetPassword$ = (token, username, password) =>
    api.user.resetPassword$(token, username, password).pipe(
        switchMap(
            () => login$(username, password)
        )
    )

export const logout = () => {
    actionBuilder('LOGOUT')
        .del('user')
        .dispatch()
    api.user.logout$().subscribe()
}

export const updateCurrentUserDetails$ = ({name, email, organization}) =>
    api.user.updateCurrentUserDetails$({name, email, organization}).pipe(
        map(({name, email, organization}) =>
            actionBuilder('UPDATE_USER_DETAILS', {name, email, organization})
                .set('user.currentUser.name', name)
                .set('user.currentUser.email', email)
                .set('user.currentUser.organization', organization)
                .dispatch()
        )
    )

export const changeUserPassword$ = ({oldPassword, newPassword}) =>
    api.user.changePassword$({oldPassword, newPassword}).pipe(
        map(({status}) => actionBuilder('PASSWORD_CHANGE_POSTED', {status})
            .build()
        )
    )

export const updateUserSession$ = (session) =>
    api.user.updateUserSession$(session).pipe(
        map(() =>
            actionBuilder('UPDATE_USER_SESSION_POSTED', {session})
                .assignValueByTemplate('user.currentUserReport.sessions', {
                    id: session.id
                }, {
                    earliestTimeoutHours: session.keepAlive
                })
                .dispatch()
        )
    )

export const stopUserSession$ = (session) =>
    api.user.stopUserSession$(session).pipe(
        map(() =>
            actionBuilder('STOP_USER_SESSION_POSTED', {session})
                .delValueByTemplate('user.currentUserReport.sessions', {
                    id: session.id
                })
                .dispatch()
        )
    )

// export const updateUserDetails$ = ({username, name, email, organization}) => {
//     return api.user.updateCurrentUserDetails$({username, name, email, organization})
// }

// export const updateUserBudget$ = ({username, monthlyInstanceBudget, monthlyStorageBudget, storageQuota}) => {
//     return api.user.updateUserBudget$({username, monthlyInstanceBudget, monthlyStorageBudget, storageQuota})
// }
