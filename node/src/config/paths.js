import path from 'path';

export const PATHS = {
    // 项目根目录
    ROOT: process.cwd(),
    
    // 系统文件夹
    LOCKS: path.join(process.cwd(), '.locks'),
    DATA: path.join(process.cwd(), '.data'),
    
    // 获取锁文件路径
    getLockFile: (port) => path.join(PATHS.LOCKS, `port-${port}.lock`),
    
    // 获取数据文件路径
    getDataFile: (name) => path.join(PATHS.DATA, name)
};

// 确保系统目录存在
export function ensureSystemDirs() {
    const dirs = [PATHS.LOCKS, PATHS.DATA];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[System] Created directory: ${dir}`);
        }
    }
} 