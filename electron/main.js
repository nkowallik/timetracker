// Desktop shell: runs the SvelteKit server on a loopback port and opens a window on it.

const { app, BrowserWindow, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

const APP_ROOT = __dirname;
const PREFERRED_PORT = 45832;

app.setPath('userData', path.join(app.getPath('appData'), 'TimeTracker'));

let mainWindow = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
} else {
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});
	app.whenReady().then(start).catch((err) => {
		console.error(err);
		app.quit();
	});
}

app.on('window-all-closed', () => app.quit());

async function start() {
	const port = await getPort(PREFERRED_PORT);

	process.env.DB_PATH = path.join(app.getPath('userData'), 'timetracker.db');
	process.env.HOST = '127.0.0.1';
	process.env.PORT = String(port);
	// adapter-node rejects POSTs whose origin does not match ORIGIN
	process.env.ORIGIN = `http://127.0.0.1:${port}`;

	// the migrator resolves drizzle/ against cwd
	process.chdir(APP_ROOT);

	await import(pathToFileURL(path.join(APP_ROOT, 'app', 'build', 'index.js')).href);
	await waitForServer(port);

	// save exports to Downloads and reveal them
	session.defaultSession.on('will-download', (_event, item) => {
		const target = uniquePath(path.join(app.getPath('downloads'), item.getFilename()));
		item.setSavePath(target);
		item.once('done', (_e, state) => {
			if (state === 'completed') shell.showItemInFolder(target);
		});
	});

	mainWindow = new BrowserWindow({
		width: 1150,
		height: 850,
		autoHideMenuBar: true,
		webPreferences: { contextIsolation: true, nodeIntegration: false }
	});
	mainWindow.on('closed', () => (mainWindow = null));

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	await mainWindow.loadURL(`http://127.0.0.1:${port}`);
}

function uniquePath(target) {
	if (!fs.existsSync(target)) return target;
	const dir = path.dirname(target);
	const ext = path.extname(target);
	const base = path.basename(target, ext);
	for (let i = 1; ; i++) {
		const candidate = path.join(dir, `${base} (${i})${ext}`);
		if (!fs.existsSync(candidate)) return candidate;
	}
}

// prefer a fixed port so the origin stays stable; fall back to any free port
function getPort(preferred) {
	return new Promise((resolve) => {
		const probe = net.createServer();
		probe.once('error', () => {
			const fallback = net.createServer();
			fallback.listen(0, '127.0.0.1', () => {
				const p = fallback.address().port;
				fallback.close(() => resolve(p));
			});
		});
		probe.listen(preferred, '127.0.0.1', () => {
			probe.close(() => resolve(preferred));
		});
	});
}

function waitForServer(port, timeoutMs = 15000) {
	const deadline = Date.now() + timeoutMs;
	return new Promise((resolve, reject) => {
		const attempt = () => {
			const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
				res.resume();
				resolve();
			});
			req.on('error', () => {
				if (Date.now() > deadline) reject(new Error(`Server did not start on port ${port}`));
				else setTimeout(attempt, 150);
			});
		};
		attempt();
	});
}
