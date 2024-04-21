import { createBrowserRouter } from 'react-router-dom';
import { Root, Home, Auth, ServerUsage, ProjectUsage, Warn, AfterDelete } from './pages';
import { ErrorPage } from './ErrorPage';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
		error: <ErrorPage />,
		children: [
			{
				path: '/auth',
				element: <Auth />,
				error: <ErrorPage />,
			},
			{
				index: true,
				element: <Home/>,
				error: <ErrorPage />,
			},
			{
				path: '/server_usage',
				element: <ServerUsage />,
				error: <ErrorPage />,
			},
			{
				path: '/project_usage',
				element: <ProjectUsage />,
				error: <ErrorPage />,
			},
			{
				path: '/warn',
				element: <Warn />,
				error: <ErrorPage />,
			},
			{
				path: '/afterDelete',
				element: <AfterDelete />,
				error: <ErrorPage />,
			},
		]
	},
]);
