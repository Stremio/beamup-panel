import React from 'react';
import { useServerUsage } from '../../common';
import styles from './styles.module.scss';

function getTime(timestamp, type) {
	const tm = (new Date(timestamp))['get'+type]()
	return addZero(tm)
}

function addZero(tm) {
	return ('0' + tm).slice(-2)
}

function fill(obj) {
	if (obj?.usage) {
		if (obj.usage.length < 288) {
			const arrLength = obj.usage.length
			const d = (new Date(obj.usage[0].timestamp))
			const method = d.getHours() >= 23 && d.getMinutes() >= 50 ? 'push' : 'unshift'
			for (var j = 0; j < 288 - arrLength; j++) {
				obj.usage[method]({})
			}
		} else if (obj.usage.length > 288) {
			obj.usage = obj.usage.slice(0, 288)
		}
	}
	return obj
}

export default function ServerUsage() {
	const { serverUsage } = useServerUsage();

	const days = []

	let current = ''

	let obj = {}

	for (var i = 0; serverUsage[i]; i++) {
		const d = new Date(serverUsage[i].timestamp)
		const dateString = addZero(d.getDate()) + '/' + addZero(d.getMonth()+1) + '/' + d.getFullYear()
		if (current !== dateString) {
			if (Object.keys(obj).length)
				days.push(fill(obj))
			current = dateString
			obj = {
				day: dateString,
				usage: [serverUsage[i]]
			}
		} else {
			obj.usage.push(serverUsage[i])
		}
	}

	if (Object.keys(obj).length)
		days.push(fill(obj))

	const daysDetailed = []

	days.forEach(data => {
		const parts = []
		let obj = {}
		for (var i = 0; data.usage[i]; i++) {
			const usage = data.usage[i]
			const isDanger = usage?.cpu > 0.9 || usage?.mem > 0.9 || usage?.swap > 0.9 || usage?.hdd > 0.93
			const isWarning = usage?.cpu > 0.8 || usage?.mem > 0.8 || usage?.swap > 0.8 || usage?.hdd > 0.84
			const state = isDanger ? 'Red' : isWarning ? 'Yellow' : 'Green'
			if (obj.state === state) {
				obj.startTime = usage.timestamp
				obj.usage.push(usage)
				obj.minCpu = Math.min(obj.minCpu, usage?.cpu || 0)
				obj.maxCpu = Math.max(obj.maxCpu, usage?.cpu || 0)
				obj.minMem = Math.min(obj.minMem, usage?.mem || 0)
				obj.maxMem = Math.max(obj.maxMem, usage?.mem || 0)
				obj.minSwap = Math.min(obj.minSwap, usage?.swap || 0)
				obj.maxSwap = Math.max(obj.maxSwap, usage?.swap || 0)
				obj.minHdd = Math.min(obj.minHdd, usage?.hdd || 0)
				obj.maxHdd = Math.max(obj.maxHdd, usage?.hdd || 0)
			} else {
				if (Object.keys(obj).length && ['Red', 'Yellow'].includes(obj.state))
					parts.push(obj)
				obj = {
					state: state,
					startTime: usage?.timestamp,
					endTime: usage?.timestamp,
					minCpu: usage?.cpu || 0,
					maxCpu: usage?.cpu || 0,
					minMem: usage?.mem || 0,
					maxMem: usage?.mem || 0,
					minSwap: usage?.swap || 0,
					maxSwap: usage?.swap || 0,
					minHdd: usage?.hdd || 0,
					maxHdd: usage?.hdd || 0,
					usage: [usage]
				}
			}
		}
		if (Object.keys(obj).length && ['Red', 'Yellow'].includes(obj.state))
			parts.push(obj)
		daysDetailed.push({
			day: data.day,
			parts: parts,
		})
	})

	function showDetailed(idx) {
		window.document.querySelectorAll('.'+styles.dayContainer)[idx].classList.add(styles.showDetailed)
	}

	const lastServerUsage = serverUsage[0]

	return (
		<section className={styles.statsWrapper}>
			<div className={styles.tasksContainer}>
				<a href={'/'} className={styles.titleHref}><h1 className={styles.heading}>BeamUp</h1></a>
				<div className={styles.serverUsage}>
					<div className={styles.serverUsageHeader}>Current Status</div>
					<div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastServerUsage?.cpu ? (lastServerUsage.cpu > 0.9 ? 'Red' : lastServerUsage.cpu > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.sameHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>CPU</div>
							<div>{lastServerUsage?.cpu ? (lastServerUsage.cpu * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastServerUsage?.mem ? (lastServerUsage.mem > 0.9 ? 'Red' : lastServerUsage.mem > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.sameHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Mem</div>
							<div>{lastServerUsage?.mem ? (lastServerUsage.mem * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastServerUsage?.swap ? (lastServerUsage.swap > 0.9 ? 'Red' : lastServerUsage.swap > 0.8 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.sameHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Swap</div>
							<div>{lastServerUsage?.swap ? (lastServerUsage.swap * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div><div className={`${styles.serverUsageTab} ${styles['serverUsage' + (lastServerUsage?.hdd ? (lastServerUsage.hdd > 0.93 ? 'Red' : lastServerUsage.hdd > 0.84 ? 'Yellow' : 'Green') : 'Gray') ]}`}>
						<div className={styles.sameHeight}></div>
						<div className={styles.serverUsageElement}>
							<div className={styles.serverUsageTitle}>Disk</div>
							<div>{lastServerUsage?.hdd ? (lastServerUsage.hdd * 100).toFixed(2) + '%' : '0.00%' }</div>
						</div>
					</div>
				</div>
				<div className={styles.pageTitle}>Status History</div>
				{
					(
						days.map((data, dayIdx) => (
							<div className={styles.dayContainer}>
								<div className={styles.blockTitle}>{data.day}</div>
								<div className={styles.blockContainer} title={'Click for details'} onClick={showDetailed.bind(null, dayIdx)}>
								{
									data.usage.map((usage, index) => (
										<div key={data.day+index}className={`${styles.miniBlock} ${styles['miniBlock' + ((usage?.cpu && usage.cpu > 0.9) || (usage?.mem && usage.mem > 0.9) || (usage?.hdd && usage.hdd > 0.93) ? 'Red' : (usage?.cpu && usage.cpu > 0.8) || (usage?.mem && usage.mem > 0.8) || (usage?.hdd && usage.hdd > 0.84) ? 'Yellow' : usage?.cpu && usage?.mem && usage?.hdd ? 'Green' : '') ]}`} />
									))
								}
								</div>
								{
									!daysDetailed[dayIdx].parts.length ? 
										<div className={styles.resourcesLine}>No incidents for this day</div>
									:
										daysDetailed[dayIdx].parts.map((detailed, partIdx) => (
											<div className={styles.detailed}>
												<div className={`${styles.hourTitle} ${styles['hourTitle' + detailed.state]}`}>
													{getTime(detailed.startTime, 'Hours')+':'+getTime(detailed.startTime, 'Minutes')+':'+getTime(detailed.startTime, 'Seconds')+(detailed.startTime !== detailed.endTime ? ' -> '+getTime(detailed.endTime, 'Hours')+':'+getTime(detailed.endTime, 'Minutes')+':'+getTime(detailed.endTime, 'Seconds') : '')}
												</div>
												<div className={styles.resourcesLine}>
													<div className={styles.fourBoxes}>CPU: {(detailed.minCpu * 100).toFixed(2)+(detailed.minCpu !== detailed.maxCpu ? '-'+(detailed.maxCpu * 100).toFixed(2) : '')+'%'}</div><div className={styles.fourBoxes}>Mem: {(detailed.minMem * 100).toFixed(2)+(detailed.minMem !== detailed.maxMem ? '-'+(detailed.maxMem * 100).toFixed(2) : '')+'%'}</div><div className={styles.fourBoxes}>Swap: {(detailed.minSwap * 100).toFixed(2)+(detailed.minSwap !== detailed.maxSwap ? '-'+(detailed.maxSwap * 100).toFixed(2) : '')+'%'}</div><div className={styles.fourBoxes}>Disk: {(detailed.minHdd * 100).toFixed(2)+(detailed.minHdd !== detailed.maxHdd ? '-'+(detailed.maxHdd * 100).toFixed(2) : '')+'%'}</div>
												</div>
											</div>
										))
								}
							</div>
						))
					)
				}
			</div>
		</section>
	);
}
