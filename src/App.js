import { createContext, useReducer } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ApiProvider } from './common';
import { initialState, reducer } from './store/reducer';
import './global.scss';

export const AuthContext = createContext();

const App = () => {
	const [state, dispatch] = useReducer(reducer, initialState);

	const { server_port, react_port } = initialState;

	if (server_port && react_port && window.location.port === react_port) {
		window.location.replace(`http://localhost:${server_port}/`);
		return <div />;
	}

	const onAuthError = () => {
		if (window.location.pathname !== '/auth') {
			window.location.href = '/auth';
		}
	};

	return (
		<AuthContext.Provider value={{ state, dispatch }}>
			<ApiProvider onAuthError={onAuthError}>
				<RouterProvider router={router}/>
			</ApiProvider>
		</AuthContext.Provider>
	);
};

export default App;
