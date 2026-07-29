const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const fileMap = {
    'constants.ts': 'core/constants.ts',
    'i18n.ts': 'core/i18n.ts',
    'customSelect.ts': 'components/custom-select.ts',
    'login.ts': 'features/auth/login.ts',
    'profile-main.ts': 'features/auth/profile-main.ts',
    'loadMixamoAnimation.ts': 'utils/mixamo-loader.ts',
    'mixamoVRMRigMap.ts': 'utils/mixamo-vrm-rig-map.ts',
    'scene/environment.ts': 'features/scene/environment.ts',
    'scene/setup.ts': 'features/scene/setup.ts',
    'scene/sky.ts': 'features/scene/sky.ts',
    'scene/weather.ts': 'features/scene/weather.ts',
    'ui/chatbot.ts': 'features/chat/chat-ui.ts',
    'ui/CustomDialog.ts': 'components/custom-dialog.ts',
    'ui/profile.ts': 'features/auth/profile.ts',
    'ui/UIManager.ts': 'components/ui-manager.ts',
    'vrm/VRMManager.ts': 'features/vrm-viewer/vrm-manager.ts',
    'counter.ts': 'utils/counter.ts'
};

const moduleMap = {};
for (const [oldPath, newPath] of Object.entries(fileMap)) {
    moduleMap[oldPath.replace('.ts', '')] = newPath.replace('.ts', '');
}

// Giữ nguyên đường dẫn cho css, glb, json
// moduleMap không xử lý ảnh, css, v.v., chỉ ts files.

function getAllTsFiles(dir, list = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllTsFiles(fullPath, list);
        } else if (file.endsWith('.ts')) {
            list.push(fullPath);
        }
    }
    return list;
}

// 1. Rewrite imports in all TS files before moving
const allTsFiles = getAllTsFiles(srcDir);
for (const file of allTsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const fileRelDir = path.dirname(path.relative(srcDir, file)).replace(/\\/g, '/');

    // Regex to match relative imports (./ or ../)
    const importRegex = /from\s+['"](\.\/|\.\.\/)(.*?)['"]/g;
    content = content.replace(importRegex, (match, prefix, modulePath) => {
        // Resolve absolute path relative to srcDir
        let absModulePath;
        if (fileRelDir === '.') {
             absModulePath = path.posix.join(prefix + modulePath);
        } else {
             absModulePath = path.posix.join(fileRelDir, prefix + modulePath);
        }
        
        // Always convert to @/ absolute path
        const mappedModule = moduleMap[absModulePath];
        if (mappedModule) {
            return `from '@/${mappedModule}'`;
        }
        
        return `from '@/${absModulePath}'`;
    });

    // Handle dynamic import() as well
    const dynImportRegex = /import\(['"](\.\/|\.\.\/)(.*?)['"]\)/g;
    content = content.replace(dynImportRegex, (match, prefix, modulePath) => {
        let absModulePath = fileRelDir === '.' ? path.posix.join(prefix + modulePath) : path.posix.join(fileRelDir, prefix + modulePath);
        const mappedModule = moduleMap[absModulePath];
        return mappedModule ? `import('@/${mappedModule}')` : `import('@/${absModulePath}')`;
    });

    fs.writeFileSync(file, content, 'utf8');
}

// 2. Move files
for (const [oldPath, newPath] of Object.entries(fileMap)) {
    const fullOld = path.join(srcDir, oldPath);
    const fullNew = path.join(srcDir, newPath);
    if (fs.existsSync(fullOld)) {
        fs.mkdirSync(path.dirname(fullNew), { recursive: true });
        fs.renameSync(fullOld, fullNew);
    }
}

// 3. Update HTML files (index.html, login.html, profile.html)
const htmlFiles = ['index.html', 'login.html', 'profile.html'];
for (const htmlFile of htmlFiles) {
    const fullPath = path.join(__dirname, '..', htmlFile);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace script src paths
    content = content.replace(/\/src\/main\.ts/g, '/src/main.ts'); // main doesn't move
    content = content.replace(/\/src\/login\.ts/g, '/src/features/auth/login.ts');
    content = content.replace(/\/src\/profile-main\.ts/g, '/src/features/auth/profile-main.ts');
    
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Files moved and imports updated.");
