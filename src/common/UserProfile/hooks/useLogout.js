import { useNavigate } from 'react-router-dom';

const useLogout = () => {
	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			const response = await fetch('/logout', { method: 'POST' });

			if (response.ok) {
				navigate('/auth');
			} else {
				console.error('Logout failed:', response.statusText);
			}
		} catch (error) {
			console.error('An error occurred while logging out:', error);
		}
	};

	return handleLogout;
};

export default useLogout;
