import {
	FixTMDBIcon, RefreshMetadataIcon, RemoveAddonIcon, RemoveUserIcon,
	RestartAPIServersIcon, RestartMetadataCrawlerIcon, RetrieveMetadataIcon,
	FixTVDBIcon, BanAddonIcon
} from '../assets/icons';

const ICON_MAP = [
	{ title: 'Retrieve Metadata', icon: <RetrieveMetadataIcon /> },
	{ title: 'Refresh Metadata', icon: <RefreshMetadataIcon /> },
	{ title: 'Fix TMDB ID Mismatch', icon: <FixTMDBIcon /> },
	{ title: 'Fix TVDB ID Mismatch', icon: <FixTVDBIcon /> },
	{ title: 'Remove User by Email', icon: <RemoveUserIcon /> },
	{ title: 'Retrieve Metadata Crawler Logs', icon: <RetrieveMetadataIcon /> },
	{ title: 'Restart Metadata Crawler', icon: <RestartMetadataCrawlerIcon /> },
	{ title: 'Restart API Servers', icon: <RestartAPIServersIcon /> },
	{ title: 'Remove Addon', icon: <RemoveAddonIcon /> },
	{ title: 'Ban Addon', icon: <BanAddonIcon /> }
];

export { ICON_MAP };
