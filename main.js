'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path        = require('path');
const os          = require('os');
const fs          = require('fs');
const http        = require('http');
const https       = require('https');
const { exec }    = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const HOME = os.homedir();

// ─── WINDOW ──────────────────────────────────────────────────────────────────

let win;

function devServerRunning() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:5173', () => { req.destroy(); resolve(true); });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => { req.destroy(); resolve(false); });
  });
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 800,
    minWidth: 360, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#07070f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  const isDev = await devServerRunning();
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'build-v3', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getDirSizeBytes(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const { stdout } = await execAsync(`du -sk "${dirPath}" 2>/dev/null | cut -f1`, { timeout: 8000 });
    return (parseInt(stdout.trim()) || 0) * 1024;
  } catch { return 0; }
}

async function countFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const { stdout } = await execAsync(`find "${dirPath}" -type f 2>/dev/null | wc -l`, { timeout: 8000 });
    return parseInt(stdout.trim()) || 0;
  } catch { return 0; }
}

function fmtBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}

function pathAge(p) {
  try {
    const days = Math.floor((Date.now() - fs.statSync(p).mtime.getTime()) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    return `${days} days`;
  } catch { return '—'; }
}

// ─── IPC: MAC SCAN ───────────────────────────────────────────────────────────

async function scanSystem() {
  const targets = [
    { id:1,  icon:'🛠', type:'cache', safe:true, name:'Xcode Derived Data',
      path: path.join(HOME,'Library/Developer/Xcode/DerivedData'),
      reason:'Rebuilt automatically by Xcode on next build.' },
    { id:2,  icon:'🛍', type:'cache', safe:true, name:'App Store Cache',
      path: path.join(HOME,'Library/Caches/com.apple.appstore'),
      reason:'Temporary download cache. App Store re-downloads as needed.' },
    { id:3,  icon:'🌐', type:'cache', safe:true, name:'Safari Web Cache',
      path: path.join(HOME,'Library/Caches/com.apple.Safari'),
      reason:'Web browsing cache. Safari rebuilds automatically.' },
    { id:4,  icon:'📦', type:'cache', safe:true, name:'All App Caches',
      path: path.join(HOME,'Library/Caches'),
      reason:'All application cache files. Rebuilt as apps need them.' },
    { id:5,  icon:'📹', type:'cache', safe:true, name:'Zoom Meeting Cache',
      path: path.join(HOME,'Library/Application Support/zoom.us'),
      reason:'Meeting thumbnails and temp data. Zoom recreates on launch.' },
    { id:6,  icon:'📧', type:'temp',  safe:true, name:'Mail Temp Files',
      path: path.join(HOME,'Library/Containers/com.apple.mail/Data/Library/Caches'),
      reason:'Mail temp files. Mail recreates them automatically.' },
    { id:7,  icon:'🗑️', type:'trash', safe:true, name:'Trash',
      path: path.join(HOME,'.Trash'),
      reason:'Items in Trash. This permanently removes them.' },
    { id:8,  icon:'📋', type:'log',   safe:true, name:'System Log Files',
      path: '/var/log',
      reason:'System diagnostic logs. macOS regenerates automatically.' },
    { id:9,  icon:'📋', type:'log',   safe:true, name:'User Log Files',
      path: path.join(HOME,'Library/Logs'),
      reason:'Application logs. Safe to remove; apps recreate them.' },
    { id:10, icon:'💥', type:'log',   safe:true, name:'Crash Reports',
      path: path.join(HOME,'Library/Logs/DiagnosticReports'),
      reason:'App crash diagnostics. Safe to clear.' },
    { id:11, icon:'🗂️', type:'temp',  safe:true, name:'System Temp Files',
      path: os.tmpdir(),
      reason:'System temporary files. Cleared on reboot anyway.' },
    { id:12, icon:'🍺', type:'cache', safe:true, name:'Homebrew Cache',
      path: path.join(HOME,'Library/Caches/Homebrew'),
      reason:'Old Homebrew package downloads. Re-fetched as needed.' },
  ];

  const results = [];
  for (const t of targets) {
    if (!fs.existsSync(t.path)) continue;
    try {
      const bytes = await getDirSizeBytes(t.path);
      if (bytes < 512 * 1024) continue;
      const files = await countFiles(t.path);
      results.push({ ...t, size: fmtBytes(bytes), bytes, files, age: pathAge(t.path) });
    } catch {}
  }
  return results.sort((a, b) => b.bytes - a.bytes);
}

ipcMain.handle('scan-system', () => scanSystem());

// ─── IPC: IPHONE DETECTION ───────────────────────────────────────────────────

async function getIphoneInfo() {
  const result = {
    connected: false,
    name: null,
    model: null,
    serialNumber: null,
    backups: [],
    backupTotalBytes: 0,
  };

  // 1. Detect connected iPhone/iPad via system_profiler USB
  try {
    const { stdout } = await execAsync(
      "system_profiler SPUSBDataType 2>/dev/null",
      { timeout: 8000 }
    );
    // Look for iPhone or iPad in USB device list
    const lines = stdout.split('\n');
    let inDevice = false;
    let deviceName = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s{8}(iPhone|iPad|iPod)/i.test(line)) {
        inDevice = true;
        deviceName = line.trim().replace(/:$/, '');
      }
      if (inDevice) {
        const serialMatch = line.match(/Serial Number:\s*(.+)/i);
        if (serialMatch) result.serialNumber = serialMatch[1].trim();
        const manufacturerMatch = line.match(/Manufacturer:\s*(.+)/i);
        if (manufacturerMatch && /apple/i.test(manufacturerMatch[1])) {
          result.connected = true;
          result.name = deviceName;
        }
        // Stop after 20 lines past device header
        if (inDevice && line.trim() === '' && result.connected) break;
      }
    }
  } catch {}

  // 2. Scan iPhone backups stored on this Mac
  const backupDirs = [
    path.join(HOME, 'Library/Application Support/MobileSync/Backup'),
    path.join(HOME, 'Library/Containers/com.apple.MobileSyncBackup'),
  ];

  for (const backupRoot of backupDirs) {
    if (!fs.existsSync(backupRoot)) continue;
    try {
      const entries = fs.readdirSync(backupRoot);
      for (const entry of entries) {
        const backupPath = path.join(backupRoot, entry);
        try {
          const stat = fs.statSync(backupPath);
          if (!stat.isDirectory()) continue;

          // Try reading device name from Info.plist
          let deviceName = 'Unknown Device';
          let deviceModel = 'iPhone';
          const infoPlist = path.join(backupPath, 'Info.plist');
          if (fs.existsSync(infoPlist)) {
            try {
              const { stdout: dName } = await execAsync(
                `defaults read "${infoPlist}" "Display Name" 2>/dev/null`, { timeout: 2000 }
              );
              if (dName.trim()) deviceName = dName.trim();
              const { stdout: dModel } = await execAsync(
                `defaults read "${infoPlist}" "Product Name" 2>/dev/null`, { timeout: 2000 }
              );
              if (dModel.trim()) deviceModel = dModel.trim();
            } catch {}
          }

          const bytes = await getDirSizeBytes(backupPath);
          if (bytes < 1024 * 1024) continue;

          const days = Math.floor((Date.now() - stat.mtime.getTime()) / 86400000);
          result.backups.push({
            id: result.backups.length + 1,
            name: deviceName,
            model: deviceModel,
            path: backupPath,
            size: fmtBytes(bytes),
            bytes,
            age: days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`,
            safe: true,
            reason: `iPhone backup from ${deviceName}. Delete to free space — you can re-backup anytime via Finder.`,
          });
          result.backupTotalBytes += bytes;
        } catch {}
      }
    } catch {}
  }

  result.backups.sort((a, b) => b.bytes - a.bytes);
  return result;
}

ipcMain.handle('get-iphone-info', () => getIphoneInfo());

// ─── IPC: SYSTEM STATS ───────────────────────────────────────────────────────

async function getSystemStats() {
  const stats = {
    cpu:  0,
    ram:  { total: os.totalmem(), used: 0, free: os.freemem() },
    disk: { total: 0, used: 0, free: 0 },
  };

  try {
    const { stdout } = await execAsync("df -k / | tail -1", { timeout: 3000 });
    const p = stdout.trim().split(/\s+/);
    stats.disk.total = parseInt(p[1]) * 1024;
    stats.disk.used  = parseInt(p[2]) * 1024;
    stats.disk.free  = parseInt(p[3]) * 1024;
  } catch {}

  try {
    const { stdout: vm } = await execAsync('vm_stat', { timeout: 3000 });
    const { stdout: ps } = await execAsync('sysctl -n hw.pagesize', { timeout: 2000 });
    const pg = parseInt(ps.trim()) || 4096;
    const get = key => { const m = vm.match(new RegExp(key + ':\\s+(\\d+)')); return m ? parseInt(m[1]) * pg : 0; };
    stats.ram.used = get('Pages active') + get('Pages wired down') + get('Pages occupied by compressor');
    stats.ram.free = stats.ram.total - stats.ram.used;
  } catch {}

  try {
    const { stdout: top } = await execAsync("top -l 1 -s 0 -n 0 | grep 'CPU usage'", { timeout: 5000 });
    const m = top.match(/([\d.]+)%\s+user/);
    if (m) stats.cpu = parseFloat(m[1]);
  } catch {}

  return stats;
}

ipcMain.handle('get-system-stats', () => getSystemStats());

// ─── IPC: INSTALLED APPS ─────────────────────────────────────────────────────

async function getInstalledApps() {
  const appDirs = ['/Applications', path.join(HOME, 'Applications')];
  const results = [];

  for (const dir of appDirs) {
    if (!fs.existsSync(dir)) continue;
    let entries;
    try { entries = fs.readdirSync(dir).filter(f => f.endsWith('.app')); }
    catch { continue; }

    for (const appName of entries) {
      const appPath = path.join(dir, appName);
      try {
        const bytes = await getDirSizeBytes(appPath);
        if (bytes < 5 * 1024 * 1024) continue;
        const name = appName.replace('.app', '');
        const stat = fs.statSync(appPath);
        const updatedDays = Math.floor((Date.now() - stat.mtime.getTime()) / 86400000);
        const updatedStr = updatedDays === 0 ? 'today'
          : updatedDays < 30 ? `${updatedDays}d`
          : `${Math.floor(updatedDays / 30)}mo`;

        let version = '—';
        try {
          const plist = path.join(appPath, 'Contents/Info.plist');
          if (fs.existsSync(plist)) {
            const { stdout: v } = await execAsync(
              `defaults read "${plist}" CFBundleShortVersionString 2>/dev/null`, { timeout: 2000 }
            );
            version = v.trim() || '—';
          }
        } catch {}

        let status = 'healthy';
        if (bytes > 5e9) status = 'large';
        else if (updatedDays > 60) status = 'outdated';

        results.push({
          id: results.length + 1, name, icon: '📦',
          size: fmtBytes(bytes), bytes, path: appPath,
          version, status, updated: updatedStr, last: '—', residual: '—',
          reason: `Installed at ${appPath}. Size: ${fmtBytes(bytes)}.`,
        });
      } catch {}
      if (results.length >= 20) break;
    }
    if (results.length >= 20) break;
  }
  return results.sort((a, b) => b.bytes - a.bytes);
}

ipcMain.handle('get-apps', () => getInstalledApps());

// ─── IPC: DELETE ─────────────────────────────────────────────────────────────

const FORBIDDEN = new Set([
  '/', '/System', '/usr', '/bin', '/sbin', '/etc', '/private',
  HOME,
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Desktop'),
  path.join(HOME, 'Pictures'),
  path.join(HOME, 'Music'),
  path.join(HOME, 'Movies'),
]);

ipcMain.handle('delete-item', async (_e, itemPath) => {
  if (!itemPath || FORBIDDEN.has(itemPath))
    return { success: false, error: 'Protected path — not allowed.' };
  const allowed = [HOME, '/tmp', '/var/log', os.tmpdir()];
  if (!allowed.some(a => itemPath.startsWith(a + '/') || itemPath === a))
    return { success: false, error: 'Path outside allowed zone.' };
  try {
    if (!fs.existsSync(itemPath)) return { success: true };
    fs.rmSync(itemPath, { recursive: true, force: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reveal-in-finder', (_e, itemPath) => shell.showItemInFinder(itemPath));
ipcMain.handle('quit-app', () => app.quit());

// ─── GITHUB INTEGRATION ───────────────────────────────────────────────────────

/** Generic GitHub API request */
function githubRequest(method, path, pat, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${pat}`,
        'User-Agent': 'NexaCleaner-Pro',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/** Validate GitHub PAT and return user info */
ipcMain.handle('github-validate', async (_e, pat) => {
  try {
    const res = await githubRequest('GET', '/user', pat);
    if (res.status === 200) {
      return { success: true, user: { login: res.body.login, name: res.body.name, avatar_url: res.body.avatar_url, public_repos: res.body.public_repos } };
    }
    return { success: false, error: 'Invalid token' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** List user's repos */
ipcMain.handle('github-list-repos', async (_e, pat) => {
  try {
    const res = await githubRequest('GET', '/user/repos?sort=updated&per_page=30', pat);
    if (res.status === 200) {
      return { success: true, repos: res.body.map(r => ({ name: r.name, full_name: r.full_name, private: r.private, description: r.description })) };
    }
    return { success: false, error: 'Could not fetch repos' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** Create a new repo */
ipcMain.handle('github-create-repo', async (_e, { pat, name, description, isPrivate }) => {
  try {
    const res = await githubRequest('POST', '/user/repos', pat, {
      name, description: description || 'NexaCleaner scan data and project',
      private: isPrivate || false, auto_init: true,
    });
    if (res.status === 201) return { success: true, repo: res.body.full_name };
    return { success: false, error: res.body.message || 'Failed to create repo' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** Save scan results as a JSON file in the repo */
ipcMain.handle('github-save-scan', async (_e, { pat, username, repo, scanData }) => {
  try {
    const filePath = `/repos/${username}/${repo}/contents/scans/scan-${Date.now()}.json`;
    const content = Buffer.from(JSON.stringify(scanData, null, 2)).toString('base64');
    const res = await githubRequest('PUT', filePath, pat, {
      message: `NexaCleaner scan — ${new Date().toLocaleString()}`,
      content,
    });
    if (res.status === 201 || res.status === 200) return { success: true, url: res.body.content?.html_url };
    return { success: false, error: res.body.message || 'Upload failed' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

/** Push local project source code to GitHub */
ipcMain.handle('github-push-code', async (_e, { pat, username, repo }) => {
  try {
    const dir = __dirname;
    // Init git if not already
    try { await execAsync(`git -C "${dir}" status`, { timeout: 3000 }); }
    catch { await execAsync(`git -C "${dir}" init`, { timeout: 5000 }); }

    // Set remote
    const remoteUrl = `https://${pat}@github.com/${username}/${repo}.git`;
    try { await execAsync(`git -C "${dir}" remote remove origin`, { timeout: 3000 }); } catch {}
    await execAsync(`git -C "${dir}" remote add origin "${remoteUrl}"`, { timeout: 3000 });

    // Configure git user
    await execAsync(`git -C "${dir}" config user.email "nexacleaner@app.com"`, { timeout: 3000 });
    await execAsync(`git -C "${dir}" config user.name "NexaCleaner Pro"`, { timeout: 3000 });

    // Create .gitignore
    const gitignore = 'node_modules/\nrelease/\nbuild-v3/\napp-dist/\ndist/\n*.log\n';
    fs.writeFileSync(path.join(dir, '.gitignore'), gitignore);

    // Commit all
    await execAsync(`git -C "${dir}" add -A`, { timeout: 5000 });
    await execAsync(`git -C "${dir}" commit -m "NexaCleaner Pro — sync ${new Date().toLocaleString()}" --allow-empty`, { timeout: 5000 });

    // Push
    await execAsync(`git -C "${dir}" push -u origin HEAD:main --force`, { timeout: 20000 });
    return { success: true, url: `https://github.com/${username}/${repo}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
