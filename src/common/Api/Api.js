import { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const ApiContext = createContext();

const request = async (path) => {
	try {
		const response = await fetch(path);
		if (response.status !== 200) {
			throw new Error(`Failed to fetch ${path}`);
		}
		return response.json();
	} catch(e) {
		console.error(e);
		return Promise.reject(e);
	}
};

const getUserInfo = () => request('/getUserInfo');
const getProjects = () => request('/getProjects');
const getServerUsage = () => request('/getServerUsage');

const ApiProvider = ({ children, onAuthError }) => {
	const [user, setUser] = useState({});
	const [projects, setProjects] = useState([]);
	const [serverUsage, setServerUsage] = useState([]);

	const initializeApi = async () => {
		getUserInfo()
			.then(setUser)
			.catch(onAuthError);
		getProjects().then(setProjects);
		getServerUsage().then(setServerUsage);
	};

	useEffect(() => {
		initializeApi();
	}, []);

	return (
		<ApiContext.Provider value={{ user, projects, serverUsage }}>
			{ children }
		</ApiContext.Provider>
	);
};

ApiProvider.propTypes = {
	children: PropTypes.node.isRequired,
	onAuthError: PropTypes.func.isRequired,
};

const useApi = () => {
	return useContext(ApiContext);
};

export {
	ApiProvider,
	useApi,
};
