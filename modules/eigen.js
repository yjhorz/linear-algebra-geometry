import { MathUtils } from '../math-utils.js';

/**
 * 模块五：特征值与特征向量 (方向不动拉伸线与重合高亮交互)
 */
export class EigenModule {
    static get is2DMode() { return true; }
    
    constructor(appContext) {
        this.app = appContext;
        
        // 变换矩阵 A = [[a, b], [c, d]]
        this.matrix = [1.2, 0.4, 0.2, 1.0]; // 默认拥有二实特征值的非对称矩阵
        
        // 用户鼠标拖拽的测试向量 x (默认指向 [2, 0])
        this.vecX = [2.0, 0.5];
        
        // 拖拽状态
        this.isDragging = false;
        
        // 特征值计算结果缓存
        this.eigenResults = null;
        
        // 是否与特征向量共线对齐标记
        this.isAligned1 = false;
        this.isAligned2 = false;
        
        // 绑定的鼠标与重绘监听器
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        
        // UI 色彩令牌
        this.colors = {
            grid: 'rgba(71, 85, 105, 0.2)',
            axis: 'rgba(255, 255, 255, 0.2)',
            vecX: '#ffffff', // 输入向量白色
            vecAx: '#ec4899', // 变换后向量霓虹粉
            eigen1: '#3b82f6', // 特征空间1蓝色
            eigen2: '#f59e0b', // 特征空间2黄色
            glow: 'rgba(255, 255, 255, 0.15)'
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "特征值与特征向量",
            "线性变换 A 扭曲空间时，大部分向量都会偏离原来的方向。然而，存在某些「特殊的方向」（特征子空间），在此方向上的所有向量在形变后依然保持在原直线上，只是长度被拉伸或缩短。拉伸倍数即为「特征值 λ」。",
            `
            <p><strong>1. 特征方程 Ax = λx 的几何大白话：</strong></p>
            <p>特征向量的本质是<strong>“变换后方向保持不变”</strong>。点击左侧画布，用鼠标拖动白色的输入向量 $\\vec{x}$，观察粉色向量 $A\\vec{x}$ 的跟随运动。</p>
            <p><strong>2. 寻找特征向量的游戏：</strong></p>
            <p>当您拖拽使白色向量与背景的<strong>蓝色或黄色特征直线</strong>重合时，粉色向量会同步重合共线，且爆发霓虹发光，此时其拉伸倍数即为特征值 $\\lambda$！</p>
            <p><strong>3. 实特征值消失与虚数：</strong></p>
            <p>若将矩阵调整为<strong>“纯旋转矩阵”</strong>（例如 $a=0.7, b=-0.7, c=0.7, d=0.7$），特征直线会瞬间消失，无论怎么拽白色向量也无法与变换后向量重合。这完美解释了为什么旋转矩阵在实数范围内<strong>没有特征值与特征向量</strong>！</p>
            `
        );
        
        // 1. 计算初始特征值
        this.calculateEigen();
        
        // 2. 绑定交互滑块
        this.app.buildSliders([
            { id: 'ea', label: '矩阵元素 a (X向拉伸)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[0], color: '#3b82f6', onChange: (val) => { this.matrix[0] = val; this.calculateEigen(); this.draw(); } },
            { id: 'eb', label: '矩阵元素 b (Y向切变)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[1], color: '#3b82f6', onChange: (val) => { this.matrix[1] = val; this.calculateEigen(); this.draw(); } },
            { id: 'ec', label: '矩阵元素 c (X向切变)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[2], color: '#f59e0b', onChange: (val) => { this.matrix[2] = val; this.calculateEigen(); this.draw(); } },
            { id: 'ed', label: '矩阵元素 d (Y向拉伸)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[3], color: '#f59e0b', onChange: (val) => { this.matrix[3] = val; this.calculateEigen(); this.draw(); } }
        ]);
        
        // 3. 绑定 Canvas 鼠标拖拽事件
        const canvas = this.app.canvas2d.canvas;
        canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);
        
        this.updateFormula();
        this.updateLegend();
        this.draw();
    }
    
    // 计算特征值与特征向量
    calculateEigen() {
        this.eigenResults = MathUtils.solveEigen2(
            this.matrix[0], this.matrix[1],
            this.matrix[2], this.matrix[3]
        );
    }
    
    updateFormula() {
        const a = this.matrix[0], b = this.matrix[1], c = this.matrix[2], d = this.matrix[3];
        let eigenStr = "";
        
        if (this.eigenResults.isReal) {
            const l1 = this.eigenResults.eigVals[0];
            const l2 = this.eigenResults.eigVals[1];
            eigenStr = `\\lambda_1 = ${l1.toFixed(2)}, \\quad \\lambda_2 = ${l2.toFixed(2)} \\quad (\\text{实特征值})`;
        } else {
            eigenStr = `\\lambda_{1,2} = \\alpha \\pm \\beta i \\quad (\\text{复特征值 } \\rightarrow \\text{无实特征向量})`;
        }
        
        const latex = `
        A = \\begin{pmatrix} 
        ${a.toFixed(1)} & ${b.toFixed(1)} \\\\
        ${c.toFixed(1)} & ${d.toFixed(1)}
        \\end{pmatrix}, \\quad
        \\vec{x} = \\begin{pmatrix} ${this.vecX[0].toFixed(1)} \\\\ ${this.vecX[1].toFixed(1)} \\end{pmatrix}
        \\\\
        A\\vec{x} = 
        \\begin{pmatrix} 
        ${(a*this.vecX[0] + b*this.vecX[1]).toFixed(2)} \\\\
        ${(c*this.vecX[0] + d*this.vecX[1]).toFixed(2)}
        \\end{pmatrix}
        \\\\
        \\text{特征方程 } |A - \\lambda I| = 0 \\rightarrow ${eigenStr}
        `;
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend() {
        const isReal = this.eigenResults.isReal;
        
        this.app.buildLegend([
            {
                symbol: "x",
                themeColor: "white",
                title: "输入测试向量 x",
                desc: `用鼠标拖动其箭头发起形变，当前坐标：(${this.vecX[0].toFixed(1)}, ${this.vecX[1].toFixed(1)})。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "Ax",
                themeColor: (this.isAligned1 || this.isAligned2) ? "green" : "pink",
                title: "变换后输出向量 Ax",
                desc: (this.isAligned1 || this.isAligned2)
                    ? `<span style="color:var(--color-green); font-weight:700;">🎉 捕获特征向量！与 x 完美共线，缩放倍数即为 λ = ${(this.isAligned1 ? this.eigenResults.eigVals[0] : this.eigenResults.eigVals[1]).toFixed(2)}。</span>`
                    : `空间经形变后的向量落点，当前偏角为：${this.getAngleBetweenVectors().toFixed(1)}°。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "λ₁",
                themeColor: isReal ? "blue" : "muted",
                title: "特征子空间 E_λ₁ (蓝)",
                desc: isReal 
                    ? `对应特征值 λ₁ = ${this.eigenResults.eigVals[0].toFixed(2)}。在此方向上的向量都会单纯拉伸 ${this.eigenResults.eigVals[0].toFixed(1)} 倍。`
                    : `当前无实特征方向（空间经历旋转）。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "λ₂",
                themeColor: isReal ? "gold" : "muted",
                title: "特征子空间 E_λ₂ (金)",
                desc: isReal 
                    ? `对应特征值 λ₂ = ${this.eigenResults.eigVals[1].toFixed(2)}。在此方向上的向量都会单纯拉伸 ${this.eigenResults.eigVals[1].toFixed(1)} 倍。`
                    : `当前无实特征方向（空间经历旋转）。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            }
        ]);
    }
    
    // 计算 x 与 Ax 之间的夹角 (以度为单位)
    getAngleBetweenVectors() {
        const Ax = MathUtils.matMulVec2(this.matrix, this.vecX);
        const dot = MathUtils.vecDot(this.vecX, Ax);
        const lenProd = MathUtils.vecLength(this.vecX) * MathUtils.vecLength(Ax);
        if (lenProd < 1e-6) return 0;
        
        let cos = dot / lenProd;
        cos = Math.max(-1, Math.min(1, cos)); // 消除浮点误差
        return Math.acos(cos) * (180 / Math.PI);
    }
    
    // ==========================================
    // 鼠标交互拖拽事件
    // ==========================================
    onMouseDown(e) {
        const canvas = this.app.canvas2d.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // 算出鼠标在 Canvas 数学坐标系下的位置
        const scale = 50;
        const mouseX = (e.clientX - rect.left - canvas.width / 2) / scale;
        const mouseY = (canvas.height / 2 - (e.clientY - rect.top)) / scale;
        
        // 如果点击距离向量 x 终点足够近，则开启拖拽
        const dist = Math.sqrt(Math.pow(mouseX - this.vecX[0], 2) + Math.pow(mouseY - this.vecX[1], 2));
        if (dist < 0.4) {
            this.isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        
        const canvas = this.app.canvas2d.canvas;
        const rect = canvas.getBoundingClientRect();
        
        const scale = 50;
        const mouseX = (e.clientX - rect.left - canvas.width / 2) / scale;
        const mouseY = (canvas.height / 2 - (e.clientY - rect.top)) / scale;
        
        // 限制拖动长度，防止拉得过长偏离视口
        const rawVec = [mouseX, mouseY];
        const len = MathUtils.vecLength(rawVec);
        if (len < 0.2) return; // 避免靠近原点抖动
        
        if (len > 4.5) {
            this.vecX = MathUtils.vecScale(MathUtils.vecNormalize(rawVec), 4.5);
        } else {
            this.vecX = rawVec;
        }
        
        // 检查是否对齐特征方向
        this.checkAlignment();
        
        this.updateFormula();
        this.updateLegend();
        this.draw();
    }
    
    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.app.canvas2d.canvas.style.cursor = 'default';
        }
    }
    
    // 对齐特征直线检测 (精度设定在 3.5 度以内)
    checkAlignment() {
        if (!this.eigenResults.isReal) {
            this.isAligned1 = false;
            this.isAligned2 = false;
            return;
        }
        
        const normX = MathUtils.vecNormalize(this.vecX);
        const ev1 = this.eigenResults.eigVecs[0];
        const ev2 = this.eigenResults.eigVecs[1];
        
        // 向量点积绝对值越接近1说明方向越共线
        const dot1 = Math.abs(MathUtils.vecDot(normX, ev1));
        const dot2 = Math.abs(MathUtils.vecDot(normX, ev2));
        
        const threshold = Math.cos(3.5 * Math.PI / 180); // 3.5度阈值
        
        this.isAligned1 = dot1 > threshold;
        this.isAligned2 = dot2 > threshold;
        
        // 磁吸效应 (Magnetic Snapping)：一旦极度贴近，强行把向量 x 矫正并吸附到特征向量上！
        if (this.isAligned1) {
            const currentLen = MathUtils.vecLength(this.vecX);
            const sign = MathUtils.vecDot(this.vecX, ev1) >= 0 ? 1 : -1;
            this.vecX = MathUtils.vecScale(ev1, currentLen * sign);
        } else if (this.isAligned2) {
            const currentLen = MathUtils.vecLength(this.vecX);
            const sign = MathUtils.vecDot(this.vecX, ev2) >= 0 ? 1 : -1;
            this.vecX = MathUtils.vecScale(ev2, currentLen * sign);
        }
    }
    
    // ==========================================
    // 绘图
    // ==========================================
    draw() {
        const canvas = this.app.canvas2d.canvas;
        const ctx = this.app.canvas2d.ctx;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        const scale = 50;
        const centerX = w / 2;
        const centerY = h / 2;
        
        const project = (x, y) => [centerX + x * scale, centerY - y * scale];
        
        // 1. 绘制网格背景
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = this.colors.grid;
        const gridLimit = 6;
        for (let i = -gridLimit; i <= gridLimit; i++) {
            // 水平线
            const pLeft = project(-gridLimit, i);
            const pRight = project(gridLimit, i);
            ctx.beginPath(); ctx.moveTo(pLeft[0], pLeft[1]); ctx.lineTo(pRight[0], pRight[1]); ctx.stroke();
            // 垂直线
            const pBottom = project(i, -gridLimit);
            const pTop = project(i, gridLimit);
            ctx.beginPath(); ctx.moveTo(pBottom[0], pBottom[1]); ctx.lineTo(pTop[0], pTop[1]); ctx.stroke();
        }
        
        // 2. 绘制静止主坐标轴
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.colors.axis;
        ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(w, centerY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h); ctx.stroke();
        
        // 3. 绘制实特征子空间直线 (Eigenspaces)
        if (this.eigenResults.isReal) {
            const ev1 = this.eigenResults.eigVecs[0];
            const ev2 = this.eigenResults.eigVecs[1];
            
            // 绘制特征空间1 (蓝色虚线)
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = this.isAligned1 ? 2.5 : 1.5;
            ctx.strokeStyle = this.isAligned1 ? '#ffffff' : this.colors.eigen1;
            ctx.beginPath();
            const pStart1 = project(-ev1[0] * 10, -ev1[1] * 10);
            const pEnd1 = project(ev1[0] * 10, ev1[1] * 10);
            ctx.moveTo(pStart1[0], pStart1[1]);
            ctx.lineTo(pEnd1[0], pEnd1[1]);
            ctx.stroke();
            
            // 绘制特征空间2 (金色虚线)
            ctx.lineWidth = this.isAligned2 ? 2.5 : 1.5;
            ctx.strokeStyle = this.isAligned2 ? '#ffffff' : this.colors.eigen2;
            ctx.beginPath();
            const pStart2 = project(-ev2[0] * 10, -ev2[1] * 10);
            const pEnd2 = project(ev2[0] * 10, ev2[1] * 10);
            ctx.moveTo(pStart2[0], pStart2[1]);
            ctx.lineTo(pEnd2[0], pEnd2[1]);
            ctx.stroke();
            
            ctx.setLineDash([]); // 还原线型为实线
        }
        
        // 4. 绘制输入向量 x (白)
        const originPix = project(0, 0);
        const xPix = project(this.vecX[0], this.vecX[1]);
        this.drawVector2D(ctx, originPix, xPix, this.colors.vecX, 3, true); // 白色带空心圆点拖拽圈
        
        // 5. 绘制变换后向量 Ax (粉色，捕获共线时变为绿色)
        const Ax = MathUtils.matMulVec2(this.matrix, this.vecX);
        const AxPix = project(Ax[0], Ax[1]);
        const isAligned = this.isAligned1 || this.isAligned2;
        
        // 绘制霓虹捕获外晕
        if (isAligned) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#10b981';
        }
        this.drawVector2D(ctx, originPix, AxPix, isAligned ? '#10b981' : this.colors.vecAx, isAligned ? 4.5 : 3.0, false);
        ctx.shadowBlur = 0; // 还原发光
        
        // 标注名字
        ctx.font = '13px Fira Code';
        ctx.fillStyle = '#ffffff';
        ctx.fillText("x (Drag)", xPix[0] + 8, xPix[1] - 8);
        ctx.fillStyle = isAligned ? '#10b981' : this.colors.vecAx;
        ctx.fillText("Ax", AxPix[0] + 8, AxPix[1] - 8);
    }
    
    drawVector2D(ctx, from, to, color, thickness, hasHandle) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = thickness;
        
        // 绘制向量箭身
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();
        
        // 绘制箭头
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        const headLength = 11;
        
        ctx.beginPath();
        ctx.moveTo(to[0], to[1]);
        ctx.lineTo(to[0] - headLength * Math.cos(angle - Math.PI / 6), to[1] - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to[0] - headLength * Math.cos(angle + Math.PI / 6), to[1] - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        // 特别：如果是输入向量 x，在箭头顶部画一圈精致拖拽点，提醒用户此处可交互
        if (hasHandle) {
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = this.isDragging ? '#ffffff' : 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(to[0], to[1], 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
    
    destroy() {
        const canvas = this.app.canvas2d.canvas;
        canvas.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
    }
}
