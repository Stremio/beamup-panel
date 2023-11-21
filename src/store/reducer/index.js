export const initialState = {
	server_port: process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_SERVER_PORT || '5000' : false,
	react_port: process.env.NODE_ENV !== 'production' ? process.env.REACT_APP_PORT || '3000' : false,
};

export const reducer = (state, action) => {
	switch (action.type) {
	case 'LOGIN': {
		return {
			...state,
		};
	}
	case 'LOGOUT': {
		localStorage.clear();
		return {
			...state,
		};
	}
	default:
		return state;
	}
};
