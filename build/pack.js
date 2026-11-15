// Usage: node build/pack.js <darwin|win32|linux> <arm64|x64>
const { packager } = require('@electron/packager');
const path = require('path');
const VERSION = require('../app/package.json').version;
const [platform = process.platform, arch = process.arch] = process.argv.slice(2);
const root = path.join(__dirname, '..');
const docTypes = [
  { CFBundleTypeName: 'CEsim Circuit', CFBundleTypeExtensions: ['cesim'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner' },
  { CFBundleTypeName: 'SPICE Netlist', CFBundleTypeExtensions: ['cir', 'net', 'sp'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'CEsim Diagram', CFBundleTypeExtensions: ['cediag'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner' },
  { CFBundleTypeName: 'Diagram file', CFBundleTypeExtensions: ['drawio', 'dio', 'mmd', 'mermaid'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'CEsim Logic', CFBundleTypeExtensions: ['cedig'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner' },
  { CFBundleTypeName: 'Logic circuit', CFBundleTypeExtensions: ['circ'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'Assembly source', CFBundleTypeExtensions: ['asm'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'Arduino sketch', CFBundleTypeExtensions: ['ino'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'Verilog source', CFBundleTypeExtensions: ['v'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'Waveform', CFBundleTypeExtensions: ['vcd'], CFBundleTypeRole: 'Viewer', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'MIPS or RISC-V assembly', CFBundleTypeExtensions: ['s'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' },
  { CFBundleTypeName: 'CEsim 3D', CFBundleTypeExtensions: ['ce3d'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Owner' },
  { CFBundleTypeName: '3D model', CFBundleTypeExtensions: ['stl', 'obj', '3mf'], CFBundleTypeRole: 'Editor', LSHandlerRank: 'Alternate' }];
(async () => {
  const opts = { dir: path.join(root, 'app'), name: 'CEsim Studio', platform, arch, electronVersion: '33.2.1', out: path.join(root, 'out'), overwrite: true,
    appVersion: VERSION, buildVersion: VERSION, appCopyright: 'BY. YOUSEF A.ALGHAMDI' };
  if (platform === 'darwin') Object.assign(opts, { executableName: 'CEsim Studio', icon: path.join(root, 'assets/icon.icns'), appBundleId: 'com.yousef.cesim', appCategoryType: 'public.app-category.education', extendInfo: { CFBundleDocumentTypes: docTypes } });
  if (platform === 'win32') Object.assign(opts, { executableName: 'CEsim Studio', icon: path.join(root, 'assets/icon.ico'), win32metadata: { CompanyName: 'YOUSEF A.ALGHAMDI', FileDescription: 'CEsim Studio', ProductName: 'CEsim Studio' } });
  if (platform === 'linux') Object.assign(opts, { executableName: 'cesim-studio', icon: path.join(root, 'assets/icon.png') });
  console.log(await packager(opts));
})().catch(e => { console.error(e); process.exit(1); });
