import React from 'react';
import { Outlet } from 'react-router-dom';

const Root = () => {
	return <React.Fragment>
		<Outlet />
	</React.Fragment>;
};

export default Root;
