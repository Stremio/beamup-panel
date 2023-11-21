import { useState, useEffect } from 'react';
import styles from './styles.module.scss';
import GithubIcon from 'mdi-react/GithubIcon';
import { BeamUpLogo } from '../../assets';

export default function Auth() {
	const [data, setData] = useState({ errMessage: '', isLoading: false });

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const errMessage = searchParams.get('errMessage') || '';

		if (errMessage) setData((data) => { return { ...data, errMessage }; });
	}, []);

	return (
		<section className={styles.container}>
			<div>
				<img src={BeamUpLogo} alt='BeamUp logo' className={styles.appLogo}/>
				<h1 className={styles.heading}>BeamUp</h1>
				<span className={styles.appError}>{data.errMessage}</span>
				{
					data.isLoading ? (
						<div className={styles.customLoaderSpinner}></div>
					) : (
						<div className={styles.loginContainer}>
							<a
								className={styles.loginLink}
								href={`/login?redirect_uri=${window.location.origin}/login`}
								onClick={() => setData({ ...data, errMessage: '' })}
								style={{cursor: 'pointer'}}
							>
								<GithubIcon />
								<span>Login with GitHub</span>
							</a>
						</div>
					)
				}
				<span className={styles.footerContact}>Contact: <a href="mailto:webmaster@baby-beamup.club">webmaster@baby-beamup.club</a></span>
			</div>
		</section>
	);
}
