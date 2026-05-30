import { MathUtils } from '../math-utils.js';

/**
 * 模块六：施密特正交化 (3D正交投影与分步分解)
 */
export class OrthogonalModule {
    constructor(appContext) {
        this.app = appContext;
        
        // 原始输入无关向量 α1, α2, α3
        this.v1 = [3.0, 0.0, 0.0];
        this.v2 = [1.5, 2.5, 0.0];
        this.v3 = [0.5, 1.5, 2.5];
        
        // 当前动画展示的步数：0 (原始), 1 (e1), 2 (e2), 3 (e3), 4 (单位化)
        this.currentStep = 0;
        
        // 3D 渲染物体引用
        this.arrows = [];
        this.projLines = [];
        this.spanPlanes = [];
        this.gridHelper = null;
        
        // 颜色设置
        this.colors = {
            v1: 0x3b82f6, // 蓝色 (α1)
            v2: 0xf43f5e, // 粉色 (α2)
            v3: 0xf59e0b, // 金色 (α3)
            beta: 0x10b981, // 翠绿 (正交基 β)
            proj: 0xffffff, // 亮白 (投影辅助虚线)
            plane: 0x06b6d4 // 靛蓝 (张成面)
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "施密特正交化过程",
            "考研线性代数中构造标准正交基的必考算法。几何本质是「剥离重叠投影」。通过依次在已有坐标轴方向上做正交投影，并剔除投影分量（留取垂直的几何误差），从而得到两两垂直的正交基 β，最后将其归一单位化。",
            `
            <p><strong>1. 分步投影剥离（几何动画）：</strong></p>
            <ul>
                <li><strong>第一步（β₁ = α₁）：</strong> 选定 α₁ 作为第一条基准轴 β₁。</li>
                <li><strong>第二步（β₂ = α₂ - proj₁）：</strong> 计算 α₂ 在 β₁ 上的正交投影，剪掉它！余下的垂直分量即为第二轴 β₂（两轴夹角严格为90°）。</li>
                <li><strong>第三步（β₃ = α₃ - proj₁ - proj₂）：</strong> 计算 α₃ 在前两轴张成的平面上的正交投影，并减掉它！留下凌空垂直的误差即为第三轴 β₃。</li>
            </ul>
            <p><strong>2. 考研常考公式与几何呼应：</strong></p>
            <p>公式中的 $\\frac{\\vec{\\alpha}_2 \\cdot \\vec{\\beta}_1}{\\vec{\\beta}_1 \\cdot \\vec{\\beta}_1}$ 就是几何投影长度的系数。正交矩阵 $Q$ 满足 $Q^T Q = I$，在几何上代表**“绝对刚性直角架”**，它的线性变换只旋转或镜像空间，<strong>绝对保持向量长度和夹角不变</strong>。</p>
            `
        );
        
        // 2. 绘制 3D 辅助网格
        this.gridHelper = new THREE.GridHelper(16, 16, 0x475569, 0x1e293b);
        this.gridHelper.position.y = -0.01;
        this.app.three.scene.add(this.gridHelper);
        
        // 3. 构建 3D 可视化
        this.rebuildVisualization();
        
        // 4. 构建滑块与分步推进控制器
        this.buildSlidersAndSteps();
    }
    
    buildSlidersAndSteps() {
        // 4.1 绑定滑块 (用户修改初始无关向量朝向，观察正交化如何自我修正)
        this.app.buildSliders([
            { id: 'v2x', label: '向量 α₂ (x 偏角)', min: -2.0, max: 3.0, step: 0.1, value: this.v2[0], color: '#f43f5e', onChange: (val) => { this.v2[0] = val; this.rebuildVisualization(); } },
            { id: 'v3x', label: '向量 α₃ (x 分量)', min: -2.0, max: 2.0, step: 0.1, value: this.v3[0], color: '#f59e0b', onChange: (val) => { this.v3[0] = val; this.rebuildVisualization(); } },
            { id: 'v3y', label: '向量 α₃ (y 分量)', min: -2.0, max: 3.0, step: 0.1, value: this.v3[1], color: '#f59e0b', onChange: (val) => { this.v3[1] = val; this.rebuildVisualization(); } }
        ]);
        
        // 4.2 注入正交化步骤条 (Step Bar)
        const container = document.getElementById('controls-container');
        const stepCard = document.createElement('div');
        stepCard.style.marginTop = '15px';
        stepCard.style.display = 'flex';
        stepCard.style.flexDirection = 'column';
        stepCard.style.gap = '8px';
        
        stepCard.innerHTML = `
            <div style="font-size: 12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">分步演变动画 (Step-by-Step)</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom:6px;">
                <button id="step-0" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); box-shadow:none;">原向量</button>
                <button id="step-1" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); box-shadow:none;">步骤 1</button>
                <button id="step-2" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); box-shadow:none;">步骤 2</button>
                <button id="step-3" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); box-shadow:none;">步骤 3</button>
                <button id="step-4" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); box-shadow:none;">单位化</button>
            </div>
            <button id="btn-next-step" class="btn-primary">
                推进下一步 (Next Step) →
            </button>
        `;
        
        container.appendChild(stepCard);
        
        // 绑定步骤跳转事件
        for (let i = 0; i <= 4; i++) {
            document.getElementById(`step-${i}`).addEventListener('click', () => {
                this.currentStep = i;
                this.updateStepUI();
                this.rebuildVisualization();
            });
        }
        
        document.getElementById('btn-next-step').addEventListener('click', () => {
            this.currentStep = (this.currentStep + 1) % 5;
            this.updateStepUI();
            this.rebuildVisualization();
        });
        
        this.updateStepUI();
    }
    
    updateStepUI() {
        // 更新步骤条高亮
        for (let i = 0; i <= 4; i++) {
            const btn = document.getElementById(`step-${i}`);
            if (i === this.currentStep) {
                btn.style.background = 'var(--color-blue)';
                btn.style.borderColor = 'var(--text-white)';
                btn.style.color = '#ffffff';
            } else {
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.borderColor = 'rgba(255,255,255,0.1)';
                btn.style.color = 'var(--text-secondary)';
            }
        }
    }
    
    // ==========================================
    // 代数运算与公式渲染
    // ==========================================
    updateFormula(gs) {
        let latex = "";
        const a1 = this.v1, a2 = this.v2, a3 = this.v3;
        
        switch(this.currentStep) {
            case 0:
                latex = `
                \\text{给定无关向量组：} 
                \\alpha_1 = \\begin{pmatrix} ${a1[0].toFixed(1)} \\\\ ${a1[1].toFixed(1)} \\\\ ${a1[2].toFixed(1)} \\end{pmatrix}, \\,
                \\alpha_2 = \\begin{pmatrix} ${a2[0].toFixed(1)} \\\\ ${a2[1].toFixed(1)} \\\\ ${a2[2].toFixed(1)} \\end{pmatrix}, \\,
                \\alpha_3 = \\begin{pmatrix} ${a3[0].toFixed(1)} \\\\ ${a3[1].toFixed(1)} \\\\ ${a3[2].toFixed(1)} \\end{pmatrix}
                \\\\
                \\text{下面将执行 Gram-Schmidt 正交化构造标准正交基。}
                `;
                break;
            case 1:
                latex = `
                \\text{【第一步：确定首轴】}
                \\\\
                \\vec{\\beta}_1 = \\vec{\\alpha}_1 = \\begin{pmatrix} ${gs.b[0][0].toFixed(1)} \\\\ ${gs.b[0][1].toFixed(1)} \\\\ ${gs.b[0][2].toFixed(1)} \\end{pmatrix}
                `;
                break;
            case 2:
                const dot21 = MathUtils.vecDot(a2, gs.b[0]);
                const lenSq1 = MathUtils.vecDot(gs.b[0], gs.b[0]);
                latex = `
                \\text{【第二步：剥离二轴重叠投影】}
                \\\\
                \\text{投影：} \\text{proj}_{\\beta_1}(\\alpha_2) = \\frac{\\alpha_2 \\cdot \\beta_1}{\\beta_1 \\cdot \\beta_1}\\beta_1 = \\frac{${dot21.toFixed(1)}}{${lenSq1.toFixed(1)}} \\beta_1
                \\\\
                \\vec{\\beta}_2 = \\vec{\\alpha}_2 - \\text{proj}_{\\beta_1}(\\alpha_2) = \\begin{pmatrix} ${gs.b[1][0].toFixed(1)} \\\\ ${gs.b[1][1].toFixed(1)} \\\\ ${gs.b[1][2].toFixed(1)} \\end{pmatrix}
                \\\\
                \\text{验证垂直度：} \\vec{\\beta}_1 \\cdot \\vec{\\beta}_2 = 0
                `;
                break;
            case 3:
                latex = `
                \\text{【第三步：剥离三轴面投影】}
                \\\\
                \\vec{\\beta}_3 = \\vec{\\alpha}_3 - \\text{proj}_{\\beta_1}(\\alpha_3) - \\text{proj}_{\\beta_2}(\\alpha_3)
                \\\\
                \\vec{\\beta}_3 = \\begin{pmatrix} ${gs.b[2][0].toFixed(1)} \\\\ ${gs.b[2][1].toFixed(1)} \\\\ ${gs.b[2][2].toFixed(1)} \\end{pmatrix}
                \\\\
                \\text{验证互相垂直：} \\vec{\\beta}_1 \\cdot \\vec{\\beta}_3 = 0, \\quad \\vec{\\beta}_2 \\cdot \\vec{\\beta}_3 = 0
                `;
                break;
            case 4:
                latex = `
                \\text{【第四步：长度收缩归一单位化】}
                \\\\
                \\vec{e}_1 = \\frac{\\vec{\\beta}_1}{\\|\\vec{\\beta}_1\\|} = \\begin{pmatrix} ${gs.e[0][0].toFixed(2)} \\\\ ${gs.e[0][1].toFixed(2)} \\\\ ${gs.e[0][2].toFixed(2)} \\end{pmatrix}, \\,
                \\vec{e}_2 = \\frac{\\vec{\\beta}_2}{\\|\\vec{\\beta}_2\\|} = \\begin{pmatrix} ${gs.e[1][0].toFixed(2)} \\\\ ${gs.e[1][1].toFixed(2)} \\\\ ${gs.e[1][2].toFixed(2)} \\end{pmatrix}
                \\\\
                \\vec{e}_3 = \\frac{\\vec{\\beta}_3}{\\|\\vec{\\beta}_3\\|} = \\begin{pmatrix} ${gs.e[2][0].toFixed(2)} \\\\ ${gs.e[2][1].toFixed(2)} \\\\ ${gs.e[2][2].toFixed(2)} \\end{pmatrix}
                \\\\
                Q = (\\vec{e}_1, \\vec{e}_2, \\vec{e}_3) \\quad \\text{ 构成严格的标准正交矩阵，满足 } Q^TQ=I
                `;
                break;
        }
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend(gs) {
        this.app.buildLegend([
            {
                symbol: "α₁",
                themeColor: "blue",
                title: "输入无关向量 α₁ (蓝)",
                desc: `原本的第一向量。当前坐标：(${this.v1[0].toFixed(1)}, ${this.v1[1].toFixed(1)}, ${this.v1[2].toFixed(1)})。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "α₂",
                themeColor: "pink",
                title: "输入无关向量 α₂ (红)",
                desc: `原本的第二向量。当前坐标：(${this.v2[0].toFixed(1)}, ${this.v2[1].toFixed(1)}, ${this.v2[2].toFixed(1)})。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "α₃",
                themeColor: "gold",
                title: "输入无关向量 α₃ (金)",
                desc: `原本的第三向量。当前坐标：(${this.v3[0].toFixed(1)}, ${this.v3[1].toFixed(1)}, ${this.v3[2].toFixed(1)})。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "e",
                themeColor: this.currentStep > 0 ? "green" : "muted",
                title: this.currentStep === 4 ? "正交单位基 e" : "正交基 β (绿)",
                desc: this.currentStep === 0 
                    ? `尚未开始正交分解。` 
                    : `当前正交步骤提取出的直角方向向量。互相垂直，夹角为 90°。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            }
        ]);
    }
    
    // ==========================================
    // 核心绘制调度
    // ==========================================
    rebuildVisualization() {
        const scene = this.app.three.scene;
        
        // 1. 清理旧物体
        this.arrows.forEach(arrow => scene.remove(arrow));
        this.arrows = [];
        this.projLines.forEach(line => scene.remove(line));
        this.projLines = [];
        this.spanPlanes.forEach(plane => scene.remove(plane));
        this.spanPlanes = [];
        
        // 2. 施密特数学算法求解各步骤向量
        const gs = MathUtils.gramSchmidt(this.v1, this.v2, this.v3);
        const origin = new THREE.Vector3(0, 0, 0);
        
        // 3. 根据当前步骤渲染对应的几何实体
        if (this.currentStep === 0) {
            // 步骤0：纯展示三只无关的原始彩色向量
            const a1 = this.createVector3D(origin, this.v1, this.colors.v1);
            const a2 = this.createVector3D(origin, this.v2, this.colors.v2);
            const a3 = this.createVector3D(origin, this.v3, this.colors.v3);
            scene.add(a1); scene.add(a2); scene.add(a3);
            this.arrows.push(a1, a2, a3);
        }
        else if (this.currentStep === 1) {
            // 步骤1：β1 = α1。展示 β1 (绿) 和 α2, α3 (原色)
            const b1 = this.createVector3D(origin, gs.b[0], this.colors.beta);
            const a2 = this.createVector3D(origin, this.v2, this.colors.v2);
            const a3 = this.createVector3D(origin, this.v3, this.colors.v3);
            scene.add(b1); scene.add(a2); scene.add(a3);
            this.arrows.push(b1, a2, a3);
        }
        else if (this.currentStep === 2) {
            // 步骤2：β2 诞生！展示 β1, β2 (绿) 和 α3 (金)
            // 另外添加 α2 及其到 β1 的投影辅助虚线
            const b1 = this.createVector3D(origin, gs.b[0], this.colors.beta);
            const b2 = this.createVector3D(origin, gs.b[1], this.colors.beta);
            const a3 = this.createVector3D(origin, this.v3, this.colors.v3);
            
            // 绘制 α2 (粉色线框，代表正在被剥离)
            const a2 = this.createVector3D(origin, this.v2, 0xd1d5db); // 灰色透明代表历史背景
            scene.add(b1); scene.add(b2); scene.add(a3); scene.add(a2);
            this.arrows.push(b1, b2, a3, a2);
            
            // 绘制投影辅助白色虚线
            // 投影点位置：proj21
            const p21 = new THREE.Vector3(...gs.projections.proj21);
            const target2 = new THREE.Vector3(...this.v2);
            
            // 虚线1: 原点到投影落点
            this.drawDashLine(origin, p21);
            // 虚线2: 投影落点到 α2 终点（这就是 β2，刚好垂直！）
            this.drawDashLine(p21, target2);
        }
        else if (this.currentStep === 3) {
            // 步骤3：β3 诞生！展示 β1, β2, β3 (绿) 互相垂直
            // 添加 β1 与 β2 张成的 2D 投影平面薄膜以供感知
            const b1 = this.createVector3D(origin, gs.b[0], this.colors.beta);
            const b2 = this.createVector3D(origin, gs.b[1], this.colors.beta);
            const b3 = this.createVector3D(origin, gs.b[2], this.colors.beta);
            
            // 画出 α3 (灰色) 和其在前两轴构成的面上的垂直投影落点
            const a3 = this.createVector3D(origin, this.v3, 0xd1d5db);
            scene.add(b1); scene.add(b2); scene.add(b3); scene.add(a3);
            this.arrows.push(b1, b2, b3, a3);
            
            // 绘制 β1, β2 张成的平面片
            this.drawPlaneSpannedBy(gs.b[0], gs.b[1]);
            
            // 绘制投影点及垂直虚线
            // α3 在平面的投影为 proj31 + proj32
            const projPt = new THREE.Vector3(...gs.projections.proj31).add(new THREE.Vector3(...gs.projections.proj32));
            const target3 = new THREE.Vector3(...this.v3);
            
            this.drawDashLine(origin, projPt);
            this.drawDashLine(projPt, target3); // 该虚线刚好就是 β3，高度垂直！
        }
        else if (this.currentStep === 4) {
            // 步骤4：标准正交基 e1, e2, e3 形成！展示三个长度为 1.0 且互相垂直的彩色刚性骨架
            const e1 = this.createVector3D(origin, gs.e[0], this.colors.beta);
            const e2 = this.createVector3D(origin, gs.e[1], this.colors.beta);
            const e3 = this.createVector3D(origin, gs.e[2], this.colors.beta);
            
            // 在直角交点处，绘制三只细微的“直角标记框 (Right Angle Mark)” 提升极客感
            scene.add(e1); scene.add(e2); scene.add(e3);
            this.arrows.push(e1, e2, e3);
            
            this.drawRightAngleMarks(gs.e[0], gs.e[1], gs.e[2]);
        }
        
        // 4. 更新公式与图例
        this.updateFormula(gs);
        this.updateLegend(gs);
    }
    
    // 辅助方法：绘制虚线段
    drawDashLine(fromVec, toVec) {
        const scene = this.app.three.scene;
        const geometry = new THREE.BufferGeometry().setFromPoints([fromVec, toVec]);
        const material = new THREE.LineDashedMaterial({
            color: this.colors.proj,
            dashSize: 0.15,
            gapSize: 0.08
        });
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        scene.add(line);
        this.projLines.push(line);
    }
    
    // 辅助方法：绘制由 u1, u2 张成的半透明面
    drawPlaneSpannedBy(u1, u2) {
        const scene = this.app.three.scene;
        const vU1 = new THREE.Vector3(...u1);
        const vU2 = new THREE.Vector3(...u2);
        const n = new THREE.Vector3().crossVectors(vU1, vU2).normalize();
        
        const geometry = new THREE.PlaneGeometry(7, 7);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        
        const material = new THREE.MeshPhongMaterial({
            color: this.colors.plane,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.applyQuaternion(quaternion);
        scene.add(mesh);
        this.spanPlanes.push(mesh);
    }
    
    // 辅助方法：绘制直角标记
    drawRightAngleMarks(e1, e2, e3) {
        const scene = this.app.three.scene;
        // 绘制三根互相垂直的 0.3 单位的小线框
        const d = 0.3;
        
        const markGeometry = new THREE.BufferGeometry();
        const points = [];
        
        // e1-e2 直角折线 (d, 0, 0) -> (d, d, 0) -> (0, d, 0)
        // 为方便，我们利用得到的特征骨架进行旋转对齐，这里简易用线段表达
        const vE1 = new THREE.Vector3(...e1).multiplyScalar(d);
        const vE2 = new THREE.Vector3(...e2).multiplyScalar(d);
        const vE3 = new THREE.Vector3(...e3).multiplyScalar(d);
        
        const p12 = vE1.clone().add(vE2);
        const p13 = vE1.clone().add(vE3);
        const p23 = vE2.clone().add(vE3);
        
        points.push(
            vE1, p12,  p12, vE2, // 1-2 面直角
            vE1, p13,  p13, vE3, // 1-3 面直角
            vE2, p23,  p23, vE3  // 2-3 面直角
        );
        
        markGeometry.setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const mark = new THREE.LineSegments(markGeometry, material);
        scene.add(mark);
        this.projLines.push(mark);
    }
    
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = dir.length();
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.45, 0.18);
        arrow.line.material.linewidth = 3.5;
        return arrow;
    }
    
    destroy() {
        const scene = this.app.three.scene;
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        this.arrows.forEach(arrow => scene.remove(arrow));
        this.arrows = [];
        this.projLines.forEach(line => scene.remove(line));
        this.projLines = [];
        this.spanPlanes.forEach(plane => scene.remove(plane));
        this.spanPlanes = [];
    }
    
    update() {
        // 微弱呼吸发光
    }
}
