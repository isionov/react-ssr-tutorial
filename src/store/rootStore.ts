import { createStore, compose, applyMiddleware, Store } from 'redux';
import createSagaMiddleware, { END, SagaMiddleware } from 'redux-saga';
import { routerMiddleware } from 'connected-react-router';
import { createBrowserHistory, createMemoryHistory } from 'history';
import { AppStore } from '../types';
import createRootReducer from './rootReducer';
import rootSaga from './rootSaga';

export const isServer = !(
    typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
);

function getComposeEnhancers() {
    if (process.env.NODE_ENV !== 'production' && !isServer) {
        return window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    }

    return compose;
}

export function configureStore(initialState = {}, url = '/') {
    const history = isServer
        ? createMemoryHistory({ initialEntries: [url] })
        : createBrowserHistory();

    const sagaMiddleware = createSagaMiddleware();
    const composeEnhancers = getComposeEnhancers();
    const middlewares = [routerMiddleware(history), sagaMiddleware];

    const store = createStore(
        createRootReducer(history),
        initialState,
        composeEnhancers(applyMiddleware(...middlewares))
    ) as AppStore;

    if (!isServer) {
        sagaMiddleware.run(rootSaga);
    }

    // enable hot module reloading for reducers
    if (module.hot) {
        module.hot.accept('./rootReducer', () => {
            // eslint-disable-next-line global-require
            store.replaceReducer(
                require('./rootReducer').default(createRootReducer(history))
            );
        });
    }

    // Path methods to store to use in the server
    store.runSaga = sagaMiddleware.run;
    store.close = () => store.dispatch(END);

    return { store, history };
}
