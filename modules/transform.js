import { MathUtils } from '../math-utils.js';

/**
 * 模块二：矩阵与线性变换 (弹性网格与复合变换)
 */
export class TransformModule {
    static get is2DMode() { return true; }
    
    constructor(appContext) {
        this.app = appContext;
        
        // 变换矩阵 A = [[a, b], [c, d]] (按行存储为：a, b, c, d)
        this.matrix = [1.5, 0.5, 0.2, 1.0]; // 默认拉伸与剪切
        
        // 动画控制状态
        this.t = 1.0; // 变形进度 0.0 -> 1.0
        this.animationMode = 'none'; // 'none', 'morph', 'composite', 'inverse'
        this.animationStartTime = 0;
        this.duration = 1500; // 动画时长 1.5s
        
        // 复合变换下的两个矩阵：B (先变换) 和 A (后变换)
        this.matrixB = [1.0, 1.0, 0.0, 1.0]; // 剪切
        this.matrixA = [0.7, -0.7, 0.7, 0.7]; // 旋转45度并缩放
        
        // 绑定重绘方法以便动画调用
        this.boundAnimate = this.animateLoop.bind(this);
        this.isDestroyed = false;
        
        // UI 色彩令牌
        this.colors = {
            grid: 'rgba(71, 85, 105, 0.3)',
            axis: 'rgba(255, 255, 255, 0.25)',
            e1: '#3b82f6', // 蓝色
            e2: '#f43f5e', // 粉色
            shape: 'rgba(20, 184, 166, 0.4)', // 湖水青
            shapeBorder: '#14b8a6'
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "矩阵与线性变换",
            "矩阵的乘法 Ax = y 在几何上代表对整个空间进行「线性形变」。矩阵的各列坐标即代表基底向量在新空间中的落点。逆矩阵 A⁻¹ 代表将扭曲的空间还原；矩阵乘法 AB 则代表将两次独立变换进行「连续复合」。",
            `
            <p><strong>1. 列向量的基底指向作用：</strong></p>
            <p>观察公式 $A\\vec{e}_1$ 和 $A\\vec{e}_2$。矩阵第一列是标准基 $\\vec{i}(1,0)$ 变形后的新坐标；第二列是 $\\vec{j}(0,1)$ 变形后的新坐标。只要确定了基向量的落点，整个空间中任意点 $\\vec{x}$ 的新落点就被唯一确定！</p>
            <p><strong>2. 逆矩阵 A⁻¹ 与不可逆：</strong></p>
            <p>逆矩阵的几何意义是<strong>“反向还原形变”</strong>。如果行列式 $|A|=0$，说明空间被压扁坍缩（如投影到一条线上），信息发生永久丢失，因此该线性变换“不可逆”，对应<strong>逆矩阵不存在</strong>。</p>
            <p><strong>3. 矩阵乘法结合律：</strong></p>
            <p>表达式 $C(BA)\\vec{x}$ 代表先经历 $A$ 形变，再经历 $B$ 形变，最后经历 $C$ 形变。矩阵乘法的结合律说明：**多次连续的空间扭曲，可以被单次复合矩阵一次性完成**。</p>
            `
        );
        
        // 2. 绑定交互滑块
        this.app.buildSliders([
            { id: 'm_a', label: '矩阵元素 a (X轴水平拉伸)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[0], color: '#3b82f6', onChange: (val) => { this.matrix[0] = val; this.t = 1.0; this.draw(); } },
            { id: 'm_b', label: '矩阵元素 b (X轴沿Y向剪切)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[1], color: '#3b82f6', onChange: (val) => { this.matrix[1] = val; this.t = 1.0; this.draw(); } },
            { id: 'm_c', label: '矩阵元素 c (Y轴沿X向剪切)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[2], color: '#f43f5e', onChange: (val) => { this.matrix[2] = val; this.t = 1.0; this.draw(); } },
            { id: 'm_d', label: '矩阵元素 d (Y轴垂直拉伸)', min: -2.0, max: 2.0, step: 0.1, value: this.matrix[3], color: '#f43f5e', onChange: (val) => { this.matrix[3] = val; this.t = 1.0; this.draw(); } }
        ]);
        
        // 注入功能按钮
        const controlPanel = document.getElementById('controls-container');
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.flexDirection = 'column';
        btnGroup.style.gap = '10px';
        btnGroup.style.marginTop = '15px';
        
        btnGroup.innerHTML = `
            <button id="btn-morph" class="btn-primary">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                单次变换过渡动画 (I → A)
            </button>
            <button id="btn-composite" class="btn-primary" style="background: linear-gradient(135deg, var(--color-purple), #6d28d9); box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17l10 5 10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5z"></path></svg>
                复合乘法连续过渡 (I → B → AB)
            </button>
            <button id="btn-inverse" class="btn-primary" style="background: linear-gradient(135deg, var(--color-teal), #0f766e); box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                逆矩阵空间还原动画 (A → I)
            </button>
        `;
        controlPanel.appendChild(btnGroup);
        
        // 绑定按钮事件
        document.getElementById('btn-morph').addEventListener('click', () => this.startMorphAnimation());
        document.getElementById('btn-composite').addEventListener('click', () => this.startCompositeAnimation());
        document.getElementById('btn-inverse').addEventListener('click', () => this.startInverseAnimation());
        
        // 启动动画循环
        this.animationStartTime = performance.now();
        requestAnimationFrame(this.boundAnimate);
        
        // 初次更新公式与图例
        this.updateFormula();
        this.updateLegend();
        this.draw();
    }
    
    // 渲染数学公式
    updateFormula() {
        const a = this.matrix[0], b = this.matrix[1], c = this.matrix[2], d = this.matrix[3];
        const det = a*d - b*c;
        const detStr = det.toFixed(2);
        
        let latex = `
        A = \\begin{pmatrix} 
        ${a.toFixed(1)} & ${b.toFixed(1)} \\\\
        ${c.toFixed(1)} & ${d.toFixed(1)}
        \\end{pmatrix}, \\quad
        \\vec{x} = \\begin{pmatrix} x \\\\ y \\end{pmatrix}
        \\\\
        A\\vec{x} = 
        \\begin{pmatrix} 
        ${a.toFixed(1)}x + ${b.toFixed(1)}y \\\\
        ${c.toFixed(1)}x + ${d.toFixed(1)}y
        \\end{pmatrix}, \\quad
        |A| = ${detStr}
        `;
        
        // 复合动画时展示复合乘积公式
        if (this.animationMode === 'composite') {
            const ab = MathUtils.matMulMat3(
                [this.matrixA[0], this.matrixA[1], 0, this.matrixA[2], this.matrixA[3], 0, 0, 0, 1],
                [this.matrixB[0], this.matrixB[1], 0, this.matrixB[2], this.matrixB[3], 0, 0, 0, 1]
            );
            latex = `
            B = \\begin{pmatrix} 1.0 & 1.0 \\\\ 0.0 & 1.0 \\end{pmatrix} \\text{ (剪切)}, \\quad
            A = \\begin{pmatrix} 0.7 & -0.7 \\\\ 0.7 & 0.7 \\end{pmatrix} \\text{ (旋转)}
            \\\\
            AB = \\begin{pmatrix} 
            ${ab[0].toFixed(1)} & ${ab[1].toFixed(1)} \\\\
            ${ab[3].toFixed(1)} & ${ab[4].toFixed(1)}
            \\end{pmatrix} 
            \\quad \\text{ 连续复合线性变换}
            `;
        }
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend() {
        const a = this.matrix[0], b = this.matrix[1], c = this.matrix[2], d = this.matrix[3];
        const det = a*d - b*c;
        const isCollapsed = Math.abs(det) < 0.05;
        
        this.app.buildLegend([
            {
                symbol: "Ae₁",
                themeColor: "blue",
                title: "标准基 i 变换后 (第一列)",
                desc: `原本的 (1, 0) 变换后的新落点位置：(${a.toFixed(1)}, ${c.toFixed(1)})。`,
                onHoverIn: () => { this.highlightAe1 = true; this.draw(); },
                onHoverOut: () => { this.highlightAe1 = false; this.draw(); }
            },
            {
                symbol: "Ae₂",
                themeColor: "pink",
                title: "标准基 j 变换后 (第二列)",
                desc: `原本的 (0, 1) 变换后的新落点位置：(${b.toFixed(1)}, ${d.toFixed(1)})。`,
                onHoverIn: () => { this.highlightAe2 = true; this.draw(); },
                onHoverOut: () => { this.highlightAe2 = false; this.draw(); }
            },
            {
                symbol: "Det",
                themeColor: isCollapsed ? "red" : "teal",
                title: isCollapsed ? "空间压扁 (|A|=0)" : "网格面积缩放倍数",
                desc: isCollapsed 
                    ? `<span style="color:var(--color-red); font-weight:700;">行列式为0，网格面积缩水为0，整片平面坍缩成一条直线，变换不可逆！</span>`
                    : `变换后，任何单位图形的面积缩放倍数为 $|A| = ${Math.abs(det).toFixed(2)}$。`,
                onHoverIn: () => { this.highlightDet = true; this.draw(); },
                onHoverOut: () => { this.highlightDet = false; this.draw(); }
            }
        ]);
    }
    
    // ==========================================
    // 动画启动控制
    // ==========================================
    startMorphAnimation() {
        this.animationMode = 'morph';
        this.animationStartTime = performance.now();
        this.t = 0.0;
        this.updateFormula();
        this.updateLegend();
    }
    
    startCompositeAnimation() {
        this.animationMode = 'composite';
        this.animationStartTime = performance.now();
        this.t = 0.0;
        this.updateFormula();
        this.updateLegend();
    }
    
    startInverseAnimation() {
        const a = this.matrix[0], b = this.matrix[1], c = this.matrix[2], d = this.matrix[3];
        const det = a*d - b*c;
        if (Math.abs(det) < 0.05) {
            alert("当前矩阵行列式为 0 (不可逆)，空间已坍缩丢失高度信息，无法进行还原！请先调节滑块使其可逆。");
            return;
        }
        
        this.animationMode = 'inverse';
        this.animationStartTime = performance.now();
        this.t = 0.0;
        this.updateFormula();
        this.updateLegend();
    }
    
    animateLoop(time) {
        if (this.isDestroyed) return;
        
        const elapsed = time - this.animationStartTime;
        
        if (this.animationMode !== 'none') {
            let progress = elapsed / this.duration;
            if (progress >= 1.0) {
                progress = 1.0;
                this.animationMode = 'none'; // 动画结束
            }
            
            // 缓动函数 (easeInOutQuad)
            this.t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            this.draw();
        }
        
        requestAnimationFrame(this.boundAnimate);
    }
    
    // ==========================================
    // 2D Canvas 绘制核心逻辑
    // ==========================================
    draw() {
        const canvas = this.app.canvas2d.canvas;
        const ctx = this.app.canvas2d.ctx;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // 建立数学坐标系：原点在中心，X轴向右，Y轴向上
        const scale = 50; // 1个代数单位 = 50像素
        const centerX = w / 2;
        const centerY = h / 2;
        
        // 坐标投影映射函数 (数学坐标 -> 屏幕像素)
        const project = (x, y) => {
            return [centerX + x * scale, centerY - y * scale];
        };
        
        // 计算当前帧的矩阵形变状态
        let currentM = [1, 0, 0, 1]; // 当前生效的 2x2 变形矩阵
        
        if (this.animationMode === 'morph') {
            // 线性插值 I -> A
            const a = 1.0 + (this.matrix[0] - 1.0) * this.t;
            const b = 0.0 + (this.matrix[1] - 0.0) * this.t;
            const c = 0.0 + (this.matrix[2] - 0.0) * this.t;
            const d = 1.0 + (this.matrix[3] - 1.0) * this.t;
            currentM = [a, b, c, d];
        } else if (this.animationMode === 'inverse') {
            // 线性插值 A -> I (还原过程)
            const a = this.matrix[0] + (1.0 - this.matrix[0]) * this.t;
            const b = this.matrix[1] + (0.0 - this.matrix[1]) * this.t;
            const c = this.matrix[2] + (0.0 - this.matrix[2]) * this.t;
            const d = this.matrix[3] + (1.0 - this.matrix[3]) * this.t;
            currentM = [a, b, c, d];
        } else if (this.animationMode === 'composite') {
            // 复合变换：先 B，再 A
            // t ∈ [0, 0.5] 时，执行 I -> B
            // t ∈ [0.5, 1.0] 时，执行 B -> AB
            if (this.t <= 0.5) {
                const subT = this.t * 2;
                const a = 1.0 + (this.matrixB[0] - 1.0) * subT;
                const b = 0.0 + (this.matrixB[1] - 0.0) * subT;
                const c = 0.0 + (this.matrixB[2] - 0.0) * subT;
                const d = 1.0 + (this.matrixB[3] - 1.0) * subT;
                currentM = [a, b, c, d];
            } else {
                const subT = (this.t - 0.5) * 2;
                // 复合矩阵乘积
                const ab = MathUtils.matMulMat3(
                    [this.matrixA[0], this.matrixA[1], 0, this.matrixA[2], this.matrixA[3], 0, 0, 0, 1],
                    [this.matrixB[0], this.matrixB[1], 0, this.matrixB[2], this.matrixB[3], 0, 0, 0, 1]
                );
                
                const a = this.matrixB[0] + (ab[0] - this.matrixB[0]) * subT;
                const b = this.matrixB[1] + (ab[1] - this.matrixB[1]) * subT;
                const c = this.matrixB[2] + (ab[3] - this.matrixB[2]) * subT;
                const d = this.matrixB[3] + (ab[4] - this.matrixB[3]) * subT;
                currentM = [a, b, c, d];
            }
        } else {
            // 正常静态展示态
            currentM = [...this.matrix];
        }
        
        // 核心网格线性映射公式
        const transformPoint = (x, y) => {
            return [
                currentM[0] * x + currentM[1] * y,
                currentM[2] * x + currentM[3] * y
            ];
        };
        
        // 1. 绘制形变后的坐标格网 (Deformed grid lines)
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.colors.grid;
        
        const gridLimit = 6;
        // 绘制水平变形线 (y 为常数，x 连续变化)
        for (let y = -gridLimit; y <= gridLimit; y++) {
            ctx.beginPath();
            const startPt = transformPoint(-gridLimit, y);
            const startPix = project(startPt[0], startPt[1]);
            ctx.moveTo(startPix[0], startPix[1]);
            
            for (let x = -gridLimit + 0.5; x <= gridLimit; x += 0.5) {
                const pt = transformPoint(x, y);
                const pix = project(pt[0], pt[1]);
                ctx.lineTo(pix[0], pix[1]);
            }
            ctx.stroke();
        }
        
        // 绘制垂直变形线 (x 为常数，y 连续变化)
        for (let x = -gridLimit; x <= gridLimit; x++) {
            ctx.beginPath();
            const startPt = transformPoint(x, -gridLimit);
            const startPix = project(startPt[0], startPt[1]);
            ctx.moveTo(startPix[0], startPix[1]);
            
            for (let y = -gridLimit + 0.5; y <= gridLimit; y += 0.5) {
                const pt = transformPoint(x, y);
                const pix = project(pt[0], pt[1]);
                ctx.lineTo(pix[0], pix[1]);
            }
            ctx.stroke();
        }
        
        // 2. 绘制标准的物理正交主坐标轴（未发生形变，作为空间比对）
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = this.colors.axis;
        // X 轴
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        // Y 轴
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, h);
        ctx.stroke();
        
        // 3. 绘制带有几何意义的测试图形：经典「房屋 (House)」多边形
        // 房屋顶点集合（标准基底下的原始坐标）
        const houseVertices = [
            [-1, -1], [1, -1], [1, 1], [0, 2], [-1, 1]
        ];
        
        // 应用矩阵形变后的新房屋坐标
        const transHouse = houseVertices.map(v => transformPoint(v[0], v[1]));
        const transPixels = transHouse.map(v => project(v[0], v[1]));
        
        ctx.fillStyle = this.highlightDet ? 'rgba(20, 184, 166, 0.75)' : this.colors.shape;
        ctx.strokeStyle = this.colors.shapeBorder;
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.moveTo(transPixels[0][0], transPixels[0][1]);
        for (let i = 1; i < transPixels.length; i++) {
            ctx.lineTo(transPixels[i][0], transPixels[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 4. 绘制新基底的两个变换向量 Ae1 和 Ae2
        const originPix = project(0, 0);
        const transE1 = transformPoint(1, 0);
        const transE2 = transformPoint(0, 1);
        
        const e1Pix = project(transE1[0], transE1[1]);
        const e2Pix = project(transE2[0], transE2[1]);
        
        // 绘制 Ae1 (第一列向量，蓝色)
        const isAe1Hover = this.highlightAe1 || false;
        this.drawVector2D(ctx, originPix, e1Pix, isAe1Hover ? '#ffffff' : this.colors.e1, isAe1Hover ? 4 : 3);
        
        // 绘制 Ae2 (第二列向量，粉色)
        const isAe2Hover = this.highlightAe2 || false;
        this.drawVector2D(ctx, originPix, e2Pix, isAe2Hover ? '#ffffff' : this.colors.e2, isAe2Hover ? 4 : 3);
        
        // 绘制向量文本标注
        ctx.font = '13px Fira Code';
        ctx.fillStyle = '#ffffff';
        ctx.fillText("Ae₁", e1Pix[0] + 5, e1Pix[1] - 5);
        ctx.fillText("Ae₂", e2Pix[0] + 5, e2Pix[1] - 5);
    }
    
    // 辅助方法：绘制2D箭头向量
    drawVector2D(ctx, from, to, color, thickness) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = thickness;
        
        // 绘制主线
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();
        
        // 绘制箭头圆锥帽
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        const headLength = 12; // 箭头帽长度
        
        ctx.beginPath();
        ctx.moveTo(to[0], to[1]);
        ctx.lineTo(to[0] - headLength * Math.cos(angle - Math.PI / 6), to[1] - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to[0] - headLength * Math.cos(angle + Math.PI / 6), to[1] - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }
    
    destroy() {
        this.isDestroyed = true;
    }
}
