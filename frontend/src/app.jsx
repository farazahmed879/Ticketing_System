/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

import $ from 'jquery'
import _ from 'lodash'

window.jQuery = $
window.$ = $
window._ = _
window.react = window.react || {}
import 'sass/app.sass'
import { applyMiddleware, createStore, compose } from 'redux'
import { Provider } from 'react-redux'
import createSagaMiddleware from 'redux-saga'
import { middleware as thunkMiddleware } from 'redux-saga-thunk'
import IndexReducer from './reducers'
import IndexSagas from './sagas'
import { SingletonHooksContainer } from 'react-singleton-hook'
import TopbarContainer from './containers/Topbar/TopbarContainer'
import Sidebar from './components/Nav/Sidebar/index.jsx'
import ModalRoot from './containers/Modals'
import renderer from './renderer.jsx'

import SocketGlobal from 'containers/Global/SocketGlobal'
import SessionLoader from 'lib2/sessionLoader'
import HotKeysGlobal from 'containers/Global/HotKeysGlobal'
import BackupRestoreOverlay from 'containers/Global/BackupRestoreOverlay'
import ChatDock from 'containers/Global/ChatDock'

// Singletons
import SessionService from 'singleton/sessionSingleton'
import SettingsService from 'singleton/settingsSingleton'
import helpers from 'modules/helpers'

const sagaMiddleware = createSagaMiddleware()

/*eslint-disable */
const composeSetup =
  process.env.NODE_ENV !== 'production' && typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : compose
/*eslint-enable */

localStorage.setItem('debug', 'trudesk:*') // Enable logger

const store = createStore(IndexReducer, composeSetup(applyMiddleware(thunkMiddleware, sagaMiddleware)))

window.react.redux = { store }
sagaMiddleware.run(IndexSagas)

async function bootstrap() {
  console.log('Bootstrapping Trudesk...')

  try {
    // 1. Initialize Services
    await new Promise((resolve, reject) => {
      SettingsService.init((err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    await new Promise((resolve, reject) => {
      SessionService.init((err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    // 2. Initialize Helpers
    helpers.init()

    // 3. Mount React Components
    console.log('Services initialized. Mounting React...')

    // Mount Globals
    if (document.getElementById('globals')) {
      const GlobalsRoot = (
        <Provider store={store}>
          <>
            <SingletonHooksContainer />
            <SessionLoader />
            <SocketGlobal />
            <ChatDock />
            <BackupRestoreOverlay />
          </>
        </Provider>
      )

      ReactDOM.render(GlobalsRoot, document.getElementById('globals'))
    }

    if (document.getElementById('sidebar')) {
      const sidebarWithProvider = (
        <Provider store={store}>
          <Sidebar />
        </Provider>
      )
      ReactDOM.render(sidebarWithProvider, document.getElementById('sidebar'))
    }

    if (document.getElementById('modal-wrapper')) {
      const RootModal = (
        <Provider store={store}>
          <ModalRoot />
        </Provider>
      )
      ReactDOM.render(RootModal, document.getElementById('modal-wrapper'))
    }

    if (document.getElementById('topbar')) {
      const TopbarRoot = (
        <Provider store={store}>
          <TopbarContainer />
        </Provider>
      )
      ReactDOM.render(TopbarRoot, document.getElementById('topbar'))
    }

    window.react.renderer = renderer
    window.react.dom = ReactDOM

    // 4. Initial Page Render (Modules)
    renderer(store)

    // 5. Hide Loader
    setTimeout(() => {
      helpers.hideLoader(500)
    }, 100)
  } catch (error) {
    console.error('Bootstrap failed:', error)
    // If we fail to bootstrap (e.g. 401), we might need to redirect to login
    // but the API call itself inside SessionService handles some of this.
  }
}

// Start the app
bootstrap()
