/**
 * EasyHermes 易墨 官方网站 Node.js 后端服务逻辑
 * * 架构声明 (扁平化部署)：
 * - 本文件与 index.html 位于同一个根目录下部署（无 public / api 文件夹）。
 * - 完美的本地回退与 Vercel Serverless Function 兼容。
 */

const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// 1. 允许将 server.js 所在的同级根目录作为静态资源服务目录
// 这保证了同级目录下的图片、配置文件、必读说明能够通过 HTTP 直接被读取或下载
app.use(express.static(__dirname));

// 2. 显式配置根路径路由 /
// 直接将同级目录下的 index.html 发送给浏览器
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // 友好防错提示：如果用户未将 index.html 放在同级目录，给予精准引导
            res.status(500).send(`
                <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #FAFAFD; color: #0F121D; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="background: #BD2E24; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; items-center: center; justify-content: center; font-size: 24px; font-weight: bold; line-height: 48px; margin-bottom: 20px;">!</div>
                    <h2 style="margin-bottom: 8px; font-weight: 700;">EasyHermes 官网服务启动失败</h2>
                    <p style="color: #64748B; max-width: 500px; line-height: 1.6; margin-top: 0;">
                        在 server.js 同级目录下未检测到 <b>index.html</b> 文件。<br/>
                        请确保您已将我们为您生成的 <b>index.html</b> 下载并保存在当前目录下：<br/>
                        <code style="background: #EEF1F6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; display: inline-block; margin-top: 8px;">D:\\Users\\wudonglin\\Desktop\\easyhermes\\官网</code>
                    </p>
                </div>
            `);
        }
    });
});

// 记录流量及接口上行数据
let metrics = {
    windowsDownloads: 156,
    macDownloads: 68,
    apiHits: 0
};

// 3. 状态监测接口
app.get('/api/status', (req, res) => {
    metrics.apiHits++;
    res.json({
        success: true,
        project: "EasyHermes 易墨 官方商业版终端",
        status: "Production Node.js Core Operational",
        version: "v1.0.0",
        last_updated: "2026-05-26",
        metrics: metrics
    });
});

// 4. 用户下载分流重定向接口 (支持在书斋中直接触发物理分流下载)
app.get('/api/download-redirect', (req, res) => {
    const platform = req.query.platform || 'windows';
    const downloadMirror = 'http://8.130.64.144:8888/EasyHermes';
    
    if (platform === 'mac') {
        metrics.macDownloads++;
        return res.redirect(downloadMirror);
    } else {
        metrics.windowsDownloads++;
        return res.redirect(downloadMirror);
    }
});

// 5. ESP32-S3 HTTP 局域网控制模拟接口
let simTasks = [];

app.post('/api/hw/command', (req, res) => {
    const { command, parameters } = req.body;
    
    if (!command) {
        return res.status(400).json({ success: false, error: "Command parameter is missing" });
    }
    
    const taskId = `sim_task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const mockTask = {
        taskId,
        command,
        parameters: parameters || {},
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    simTasks.push(mockTask);
    
    // 仿真硬件任务在 1.2 秒后完成状态转换
    setTimeout(() => {
        const found = simTasks.find(t => t.taskId === taskId);
        if (found) {
            found.status = 'completed';
            found.result = {
                sensor_data: command === 'DHT22_READ' ? { temp: 24.5, humidity: 48.0 } : null,
                action_completed: true
            };
        }
    }, 1200);
    
    res.json({
        success: true,
        message: "Command routed to simulated ESP32-S3 hardware bridge.",
        taskId,
        status: "pending"
    });
});

app.get('/api/hw/result/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = simTasks.find(t => t.taskId === taskId);
    
    if (!task) {
        return res.status(404).json({ success: false, error: "Simulated Task not found" });
    }
    
    res.json({
        success: true,
        taskId: task.taskId,
        status: task.status,
        result: task.result || null
    });
});

// 导出模块以支持 Vercel Serverless Function 路由托管
module.exports = app;

// 如果是本地非 Vercel 环境下直接运行
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`EasyHermes Local Server running on http://localhost:${PORT}`);
    });
}