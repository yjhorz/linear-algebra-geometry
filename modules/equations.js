import { MathUtils } from '../math-utils.js';

/**
 * 模块三：方程组解的几何空间 (三维平面求交)
 */
export class EquationsModule {
    constructor(appContext) {
        this.app = appContext;
        
        // 三条平面方程的代数系数定义 ax + by + cz = d
        this.eq1 = { a: 1.0, b: 1.0, c: 0.5, d: 1.0 };  // 平面1
        this.eq2 = { a: -0.5, b: 1.5, c: 1.0, d: 2.0 }; // 平面2
        this.eq3 = { a: 1.0, b: -0.5, c: 1.5, d: 1.5 }; // 平面3
        
        // 3D 渲染物体引用
        this.planeMeshes = [];
        this.planeEdges = [];
        this.intersectionObject = null; // 交点球或交线
        this.gridHelper = null;
        
        // UI 专属色彩令牌
        this.colors = {
            eq1: 0x3b82f6, // 蓝色
            eq2: 0xf43f5e, // 粉色
            eq3: 0xf59e0b, // 金色
            solvePoint: 0xffffff, // 交点亮白
            solveLine: 0x10b981 // 交线翠绿
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "方程组解的几何空间",
            "齐次或非齐次线性方程组的解，本质上是空间中多个几何曲面的「公共交集」。在 3D 空间下，三元一次方程代表一个平坦的平面，方程组的解即代表这三个平面在三维空间中的交点、交线或交面。",
            `
            <p><strong>1. 无解的几何成因（三棱柱与平行）：</strong></p>
            <p>考研经常考查“非齐次方程组无解”判定。几何上，无解代表<strong>三个平面没有共同交点</strong>：</p>
            <ul>
                <li>两两平面交线互相平行但不重合（形成一个中空的三棱柱），即使没有平行面也无解；</li>
                <li>存在两个平面严格平行且常数项不同。</li>
            </ul>
            <p><strong>2. 自由变量与解空间维度：</strong></p>
            <p>当系数矩阵秩 $r(A) < 3$ 时，方程组有无穷多解：</p>
            <ul>
                <li>若基础解系含 1 个向量（1个自由变量），三平面交于<strong>一条穿过原点（齐次时）的直线</strong>；</li>
                <li>若基础解系含 2 个向量（2个自由变量），三平面完全重合为<strong>一个面</strong>。</li>
            </ul>
            `
        );
        
        // 2. 绘制 3D 基础网格
        this.gridHelper = new THREE.GridHelper(16, 16, 0x475569, 0x1e293b);
        this.gridHelper.position.y = -3.0; // 稍微下移，避免干扰平面交叉视线
        this.app.three.scene.add(this.gridHelper);
        
        // 3. 初始绘制
        this.rebuildPlanes();
        
        // 4. 构建滑块与快速预设按钮
        this.buildSlidersAndPresets();
    }
    
    // 构建滑块面板与解结构预设按钮
    buildSlidersAndPresets() {
        // 4.1 绑定方程组常数平移滑块 (改变平面偏离原点距离)
        this.app.buildSliders([
            { id: 'd1', label: '方程一常数项 d₁ (蓝平面平移)', min: -3.0, max: 3.0, step: 0.1, value: this.eq1.d, color: '#3b82f6', onChange: (val) => { this.eq1.d = val; this.rebuildPlanes(); } },
            { id: 'd2', label: '方程二常数项 d₂ (粉平面平移)', min: -3.0, max: 3.0, step: 0.1, value: this.eq2.d, color: '#f43f5e', onChange: (val) => { this.eq2.d = val; this.rebuildPlanes(); } },
            { id: 'd3', label: '方程三常数项 d₃ (金平面平移)', min: -3.0, max: 3.0, step: 0.1, value: this.eq3.d, color: '#f59e0b', onChange: (val) => { this.eq3.d = val; this.rebuildPlanes(); } }
        ]);
        
        // 4.2 注入预设状态选择按钮（非常利于学生理解拓扑变化）
        const container = document.getElementById('controls-container');
        
        const presetCard = document.createElement('div');
        presetCard.style.marginTop = '15px';
        presetCard.style.display = 'flex';
        presetCard.style.flexDirection = 'column';
        presetCard.style.gap = '8px';
        
        presetCard.innerHTML = `
            <div style="font-size: 12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">解结构几何拓扑预设 (Presets)</div>
            <button id="pre-unique" class="btn-primary" style="padding: 8px 12px; font-size:12px;">
                唯一解相交 (交于唯一单点)
            </button>
            <button id="pre-infinite" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-green), #047857);">
                无穷解相交 (三面交于一线)
            </button>
            <button id="pre-no-prism" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-pink), #be123c);">
                无解 - 三棱柱 (交线两两平行)
            </button>
            <button id="pre-no-parallel" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-red), #991b1b);">
                无解 - 平面平行 (完全无交集)
            </button>
        `;
        container.appendChild(presetCard);
        
        // 预设按钮绑定
        document.getElementById('pre-unique').addEventListener('click', () => {
            this.setPreset({
                eq1: { a: 1.0, b: 1.0, c: 0.5, d: 1.0 },
                eq2: { a: -0.5, b: 1.5, c: 1.0, d: 2.0 },
                eq3: { a: 1.0, b: -0.5, c: 1.5, d: 1.5 }
            });
        });
        
        document.getElementById('pre-infinite').addEventListener('click', () => {
            // 三面交于一线：第三个面法向量是前两个法向量的线性组合，且d3符合相同组合
            // n1 = (1, 1, 0.5), n2 = (-0.5, 1.5, 1.0)
            // n3 = n1 + 2 * n2 = (0, 4, 2.5), d3 = d1 + 2 * d2 = 5.0
            this.setPreset({
                eq1: { a: 1.0, b: 1.0, c: 0.5, d: 1.0 },
                eq2: { a: -0.5, b: 1.5, c: 1.0, d: 2.0 },
                eq3: { a: 0.0, b: 4.0, c: 2.5, d: 5.0 }
            });
        });
        
        document.getElementById('pre-no-prism').addEventListener('click', () => {
            // 法向量共面，但 d 不符合线性组合。形成三棱柱无解。
            // n1 = (1, 1, 0.5), n2 = (-0.5, 1.5, 1.0), n3 = (0, 4, 2.5)
            // d1 = 1.0, d2 = 2.0, d3 = 1.0 (偏离 5.0)
            this.setPreset({
                eq1: { a: 1.0, b: 1.0, c: 0.5, d: 1.0 },
                eq2: { a: -0.5, b: 1.5, c: 1.0, d: 2.0 },
                eq3: { a: 0.0, b: 4.0, c: 2.5, d: 1.0 }
            });
        });
        
        document.getElementById('pre-no-parallel').addEventListener('click', () => {
            // 两个面法向量重合但 d 不同（严格平行面）
            this.setPreset({
                eq1: { a: 1.0, b: 1.0, c: 0.5, d: 1.0 },
                eq2: { a: 1.0, b: 1.0, c: 0.5, d: -1.0 }, // 平行于1
                eq3: { a: 1.0, b: -0.5, c: 1.5, d: 1.5 }
            });
        });
    }
    
    // 设置预设状态值，并更新滑块值显示
    setPreset(preset) {
        this.eq1 = preset.eq1;
        this.eq2 = preset.eq2;
        this.eq3 = preset.eq3;
        
        // 重写滑块 DOM 的值
        document.getElementById('input-d1').value = this.eq1.d;
        document.getElementById('val-d1').innerText = this.eq1.d.toFixed(1);
        
        document.getElementById('input-d2').value = this.eq2.d;
        document.getElementById('val-d2').innerText = this.eq2.d.toFixed(1);
        
        document.getElementById('input-d3').value = this.eq3.d;
        document.getElementById('val-d3').innerText = this.eq3.d.toFixed(1);
        
        this.rebuildPlanes();
    }
    
    // ==========================================
    // 渲染数学公式与高亮映射
    // ==========================================
    updateFormula(solveInfo) {
        let solveString = "";
        if (solveInfo.type === 'unique') {
            solveString = `\\text{唯一交点 } P(${solveInfo.point[0].toFixed(2)}, ${solveInfo.point[1].toFixed(2)}, ${solveInfo.point[2].toFixed(2)})`;
        } else if (solveInfo.type === 'infinite_line') {
            solveString = `\\text{无穷多解 } \\rightarrow \\text{公共交线直線}`;
        } else if (solveInfo.type === 'prism') {
            solveString = `\\text{无解 } (r(A)=2, r(A|b)=3 \\rightarrow \\text{平行三棱柱})`;
        } else if (solveInfo.type === 'parallel') {
            solveString = `\\text{无解 } (\\text{存在平行平面})`;
        } else {
            solveString = `\\text{无解 }`;
        }
        
        const latex = `
        \\begin{cases}
        ${this.eq1.a.toFixed(1)}x + ${this.eq1.b.toFixed(1)}y + ${this.eq1.c.toFixed(1)}z = ${this.eq1.d.toFixed(1)} \\quad (\\text{蓝}) \\\\
        ${this.eq2.a.toFixed(1)}x + ${this.eq2.b.toFixed(1)}y + ${this.eq2.c.toFixed(1)}z = ${this.eq2.d.toFixed(1)} \\quad (\\text{红}) \\\\
        ${this.eq3.a.toFixed(1)}x + ${this.eq3.b.toFixed(1)}y + ${this.eq3.c.toFixed(1)}z = ${this.eq3.d.toFixed(1)} \\quad (\\text{金})
        \\end{cases}
        \\\\
        \\text{计算行列式 } |A| = ${solveInfo.det.toFixed(2)}, \\quad ${solveString}
        `;
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend(solveInfo) {
        this.app.buildLegend([
            {
                symbol: "P₁",
                themeColor: "blue",
                title: "方程一代表的平面 (蓝)",
                desc: `法向量：(${this.eq1.a.toFixed(1)}, ${this.eq1.b.toFixed(1)}, ${this.eq1.c.toFixed(1)})，平移 d₁ = ${this.eq1.d.toFixed(1)}。`,
                onHoverIn: () => this.highlightPlane(0),
                onHoverOut: () => this.resetPlane(0)
            },
            {
                symbol: "P₂",
                themeColor: "pink",
                title: "方程二代表的平面 (红)",
                desc: `法向量：(${this.eq2.a.toFixed(1)}, ${this.eq2.b.toFixed(1)}, ${this.eq2.c.toFixed(1)})，平移 d₂ = ${this.eq2.d.toFixed(1)}。`,
                onHoverIn: () => this.highlightPlane(1),
                onHoverOut: () => this.resetPlane(1)
            },
            {
                symbol: "P₃",
                themeColor: "gold",
                title: "方程三代表的平面 (金)",
                desc: `法向量：(${this.eq3.a.toFixed(1)}, ${this.eq3.b.toFixed(1)}, ${this.eq3.c.toFixed(1)})，平移 d₃ = ${this.eq3.d.toFixed(1)}。`,
                onHoverIn: () => this.highlightPlane(2),
                onHoverOut: () => this.resetPlane(2)
            },
            {
                symbol: "Ans",
                themeColor: (solveInfo.type === 'unique' || solveInfo.type === 'infinite_line') ? 'green' : 'red',
                title: "公共交集 (方程组的解)",
                desc: solveInfo.type === 'unique' 
                    ? `三平面恰好交于**唯一一个共享点**！`
                    : (solveInfo.type === 'infinite_line' 
                        ? `法向量共面且常数组合一致，三面汇聚于**一根共同相交直线**！`
                        : `三平面没有能重合的公共区域，整体系统**无解**。`),
                onHoverIn: () => this.highlightIntersection(),
                onHoverOut: () => this.resetIntersection()
            }
        ]);
    }
    
    // ==========================================
    // 重绘3D平面系统
    // ==========================================
    rebuildPlanes() {
        const scene = this.app.three.scene;
        
        // 1. 清理旧物体
        this.planeMeshes.forEach(mesh => scene.remove(mesh));
        this.planeMeshes = [];
        this.planeEdges.forEach(edge => scene.remove(edge));
        this.planeEdges = [];
        
        if (this.intersectionObject) {
            scene.remove(this.intersectionObject);
            this.intersectionObject = null;
        }
        
        // 2. 绘制三个平面片 (8 x 8 规格)
        const planesData = [
            { eq: this.eq1, color: this.colors.eq1 },
            { eq: this.eq2, color: this.colors.eq2 },
            { eq: this.eq3, color: this.colors.eq3 }
        ];
        
        planesData.forEach(p => {
            const meshAndEdge = this.createPlaneMesh(p.eq, p.color);
            scene.add(meshAndEdge.mesh);
            scene.add(meshAndEdge.edge);
            
            this.planeMeshes.push(meshAndEdge.mesh);
            this.planeEdges.push(meshAndEdge.edge);
        });
        
        // 3. 计算交点/交线并绘制
        const solveInfo = MathUtils.solve3Planes(this.eq1, this.eq2, this.eq3);
        
        if (solveInfo.type === 'unique') {
            // 唯一解：绘制一个亮白色发光球体
            const geometry = new THREE.SphereGeometry(0.2, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: this.colors.solvePoint,
                emissive: 0xffffff,
                shininess: 100
            });
            this.intersectionObject = new THREE.Mesh(geometry, material);
            this.intersectionObject.position.set(...solveInfo.point);
            scene.add(this.intersectionObject);
            
            // 另外添加三条正交虚线，投影到坐标平面以辅助读数
            // (我们也可以精简，保持视口清爽)
        } else if (solveInfo.type === 'infinite_line') {
            // 无穷多解（交于一线）：绘制一根粗绿色的发光贯穿线
            const p0 = new THREE.Vector3(...solveInfo.point);
            const dir = new THREE.Vector3(...solveInfo.direction);
            
            // 构建一根在空间拉长 -10 到 10 的线段
            const start = p0.clone().addScaledVector(dir, -10);
            const end = p0.clone().addScaledVector(dir, 10);
            
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({
                color: this.colors.solveLine,
                linewidth: 5 // 注意在部分WebGL底层下，厚度可能不明显，但颜色足矣区分
            });
            
            this.intersectionObject = new THREE.Line(geometry, material);
            scene.add(this.intersectionObject);
        }
        
        // 4. 更新公式面板与图例
        this.updateFormula(solveInfo);
        this.updateLegend(solveInfo);
    }
    
    // 核心算法：基于 ax + by + cz = d 生成 plane 姿态与偏移
    createPlaneMesh(eq, colorHex) {
        // 平面法向量
        const n = new THREE.Vector3(eq.a, eq.b, eq.c);
        const len = n.length();
        n.normalize(); // 单位法向量
        
        // 计算平面偏离原点距离 offset = d / ||n||
        const offset = eq.d / len;
        
        // 建立平面几何体
        const geometry = new THREE.PlaneGeometry(8, 8);
        
        // 旋转平面使其法向从默认的 (0,0,1) 旋转对齐到 n 向量
        const defaultNormal = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, n);
        
        const material = new THREE.MeshPhongMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.38,
            side: THREE.DoubleSide,
            shininess: 40,
            depthWrite: false // 关闭深度写入避免重合像素闪烁
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.applyQuaternion(quaternion);
        
        // 位移平面：沿着法线方向移动 offset 个单位
        const pos = n.clone().multiplyScalar(offset);
        mesh.position.copy(pos);
        
        // 绘制平面四边形外边缘框线 (Wireframe edge)
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: colorHex,
            linewidth: 1.5,
            transparent: true,
            opacity: 0.7
        });
        const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edge.applyQuaternion(quaternion);
        edge.position.copy(pos);
        
        return { mesh, edge };
    }
    
    // ==========================================
    // 悬停交互高亮控制
    // ==========================================
    highlightPlane(index) {
        if (this.planeMeshes[index]) {
            this.planeMeshes[index].material.opacity = 0.8;
            this.planeMeshes[index].material.emissive.setHex(0x555555);
        }
    }
    
    resetPlane(index) {
        if (this.planeMeshes[index]) {
            this.planeMeshes[index].material.opacity = 0.38;
            this.planeMeshes[index].material.emissive.setHex(0x000000);
        }
    }
    
    highlightIntersection() {
        if (this.intersectionObject) {
            if (this.intersectionObject.isMesh) {
                // 球体缩放膨胀并剧烈闪烁
                this.intersectionObject.scale.set(1.8, 1.8, 1.8);
            }
        }
    }
    
    resetIntersection() {
        if (this.intersectionObject) {
            if (this.intersectionObject.isMesh) {
                this.intersectionObject.scale.set(1.0, 1.0, 1.0);
            }
        }
    }
    
    destroy() {
        const scene = this.app.three.scene;
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        this.planeMeshes.forEach(mesh => scene.remove(mesh));
        this.planeMeshes = [];
        this.planeEdges.forEach(edge => scene.remove(edge));
        this.planeEdges = [];
        if (this.intersectionObject) {
            scene.remove(this.intersectionObject);
            this.intersectionObject = null;
        }
    }
    
    update() {
        // 可以让交点球体呈现极其微弱的呼吸灯发光效果
        if (this.intersectionObject && this.intersectionObject.isMesh) {
            const time = Date.now() * 0.005;
            const wave = 0.8 + Math.sin(time) * 0.2;
            this.intersectionObject.material.emissive.setRGB(wave, wave, wave);
        }
    }
}
