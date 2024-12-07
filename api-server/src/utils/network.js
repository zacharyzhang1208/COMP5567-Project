import os from 'os';

class NetworkUtils {
    /**
     * 获取本机IP地址
     * @returns {string} IP地址
     */
    static getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                // 跳过内部地址和非IPv4地址
                if (iface.internal || iface.family !== 'IPv4') {
                    continue;
                }
                return iface.address;
            }
        }
        return 'localhost'; // 如果没找到，返回localhost
    }

    /**
     * 获取所有可用的IP地址
     * @returns {Array<{name: string, address: string}>} IP地址列表
     */
    static getAllIPs() {
        const interfaces = os.networkInterfaces();
        const addresses = [];

        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.internal || iface.family !== 'IPv4') {
                    continue;
                }
                addresses.push({
                    name: name,
                    address: iface.address
                });
            }
        }

        return addresses;
    }

    /**
     * 打印所有网络接口信息
     */
    static printNetworkInfo() {
        const interfaces = os.networkInterfaces();
        console.log('\nAvailable network interfaces:');
        for (const name of Object.keys(interfaces)) {
            console.log(`\nInterface: ${name}`);
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4') {
                    console.log(`  IPv4: ${iface.address}`);
                    console.log(`  Internal: ${iface.internal}`);
                }
            }
        }
    }

    /**
     * 获取当前网络的子网信息
     * @returns {{baseIP: string, subnet: string}} 子网信息
     */
    static getSubnetInfo() {
        const ip = NetworkUtils.getLocalIP();
        if (ip === 'localhost') return null;
        
        // 假设子网掩码是 255.255.255.0
        const parts = ip.split('.');
        return {
            baseIP: `${parts[0]}.${parts[1]}.${parts[2]}`,
            subnet: '255.255.255.0'
        };
    }

    /**
     * 生成子网内的所有可能IP
     * @returns {string[]} IP地址列表
     */
    static getAllPossibleIPs() {
        const subnetInfo = NetworkUtils.getSubnetInfo();
        if (!subnetInfo) return ['localhost'];

        const ips = [];
        // 扫描 1-254 的地址范围
        for (let i = 1; i < 255; i++) {
            ips.push(`${subnetInfo.baseIP}.${i}`);
        }
        return ips;
    }
}

export default NetworkUtils; 