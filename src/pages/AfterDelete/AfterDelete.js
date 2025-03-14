import { useState, useEffect } from 'react';
import styles from './styles.module.scss';

export default function Home() {
	const [data, setData] = useState({ project: '' });

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search);
		const project = searchParams.get('proj') || '';

		if (project) {
			setData((data) => { return { ...data, project }; });
		}
	}, []);

	return (
		<section className={styles.wrapper}>
			<h2 className={styles.warnMsg}>"{data.project}" has been marked for deletion, this action can take up to 1h to be finalized.<br/><br/>Once the project has been completely deleted, it will no longer be visible in your projects feed.</h2>
			<div>
				<a className={styles.warnButton} href="/">OK</a>
			</div>
		</section>
	);
}
