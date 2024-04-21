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
const getLastServerUsage = () => request('/getLastServerUsage');
const getServerUsage = () => request('/getServerUsage');
const getProjectUsage = (proj) => request('/getProjectUsage?proj=' + encodeURIComponent(proj));

const ApiProvider = ({ children, onAuthError }) => {
	const [user, setUser] = useState({});
	const [projects, setProjects] = useState([]);
	const [lastServerUsage, setLastServerUsage] = useState({});

	const initializeApi = async () => {
		getUserInfo()
			.then(setUser)
			.catch(onAuthError);
		getProjects().then(setProjects);
		getLastServerUsage().then(setLastServerUsage);
	};

	useEffect(() => {
		initializeApi();
	}, []);

	return (
		<ApiContext.Provider value={{ user, projects, lastServerUsage }}>
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

const ServerUsageContext = createContext();

const ServerUsageProvider = ({ children }) => {
	const [serverUsage, setServerUsage] = useState([]);

	const initializeApi = async () => {
		getServerUsage().then(setServerUsage);
	};

	useEffect(() => {
		initializeApi();
	}, []);

	return (
		<ServerUsageContext.Provider value={{ serverUsage }}>
			{ children }
		</ServerUsageContext.Provider>
	);
}

ServerUsageProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

const useServerUsage = () => {
	return useContext(ServerUsageContext);
};

const ProjectUsageContext = createContext();

const ProjectUsageProvider = ({ children }) => {
	const [projectUsage, setProjectUsage] = useState([]);

	const initializeApi = async () => {
		getProjectUsage((new URLSearchParams(window.location.search)).get('proj')).then(setProjectUsage);
	};

	useEffect(() => {
		initializeApi();
	}, []);

	return (
		<ProjectUsageContext.Provider value={{ projectUsage }}>
			{ children }
		</ProjectUsageContext.Provider>
	);
}

ProjectUsageProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

const useProjectUsage = () => {
	return useContext(ProjectUsageContext);
};

export {
	ApiProvider,
	useApi,
	ServerUsageProvider,
	useServerUsage,
	ProjectUsageProvider,
	useProjectUsage
};
