import { MathUtils } from '../math-utils.js';

/**
 * 模块七：实对称矩阵、二次型与正定性 (3D二次曲面与惯性定理)
 */
export class QuadraticModule {
    constructor(appContext) {
        this.app = appContext;
        
        // 实对称矩阵 A = [[a, b], [b, c]] 的元素定义
        // 对角项 a, c; 交叉项 b
        this.a = 0.8;
        this.b = 0.0; // 初始无旋转
        this.c = 0.8; // 初始正定
        
        // 合同变换矩阵 C = [[1, k], [0, 1]] (剪切矩阵，用于演示合同)
        this.shearK = 0.0;
        
        // 3D 渲染物体引用
        this.surfaceMesh = null;
        this.surfaceWireframe = null;
        this.axisLines = []; // 特征主轴线
        this.gridHelper = null;
        
        // 预设高亮色彩
        this.colors = {
            positive: 0x10b981,   // 翡翠绿 (正定 - 碗向上)
            negative: 0xf43f5e,   // 珊瑚红 (负定 - 碗向下)
            indefinite: 0xf59e0b, // 琥珀金 (不定 - 双曲马鞍面)
            semidefinite: 0x06b6d4 // 靛蓝 (半正定 - 抛物槽谷)
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "相似、合同与正定矩阵",
            "考研线性代数的压轴必考点。二次型 xᵀAx 在三维空间代表一张连续弯曲的「二次曲面」。对矩阵进行合同变换 CᵀAC 相当于对曲面所在的地面坐标网格实施平滑拉伸，它虽然改变了曲面倾角，但绝对保持曲面的「几何拓扑类型」（惯性指数）守恒。",
            `
            <p><strong>1. 二次型曲面形状与正定判别：</strong></p>
            <ul>
                <li><strong>正定矩阵 (Bowl)：</strong> 曲面是一个完美的“朝天饭碗”，除原点外所有点高度都严格大于0，对应特征值全部大于0，顺序主子式全大于0。</li>
                <li><strong>不定矩阵 (Saddle)：</strong> 曲面是一个酷炫的“马鞍面”，沿着主轴一个方向向上弯，另一方向向下凹，特征值一正一负。</li>
                <li><strong>半正定矩阵 (Trough)：</strong> 碗底退化成了一条平坦的一维长槽谷，特征值有一个为0。</li>
            </ul>
            <p><strong>2. 相似 vs 合同的几何区别：</strong></p>
            <p><strong>相似变换</strong>是旋转视角，代数特征值（两个对称主轴的绝对弯曲率）丝毫不变；<strong>合同变换</strong>是平滑拉伸地面坐标系，虽然弯曲的曲率大小变了，但<strong>“向上弯的轴数”和“向下弯的轴数”绝对不变</strong>（正负特征值个数守恒，即惯性定理）。</p>
            `
        );
        
        // 2. 绘制 3D 辅助底网格 (下移，避免干扰曲面)
        this.gridHelper = new THREE.GridHelper(12, 12, 0x475569, 0x1e293b);
        this.gridHelper.position.y = -2.5;
        this.app.three.scene.add(this.gridHelper);
        
        // 3. 构建 3D 二次曲面
        this.rebuildSurface();
        
        // 4. 绑定对角元素滑块
        this.app.buildSliders([
            { id: 'qa', label: '对角项 a (X轴向翘度)', min: -1.5, max: 1.5, step: 0.1, value: this.a, color: '#3b82f6', onChange: (val) => { this.a = val; this.rebuildSurface(); } },
            { id: 'qb', label: '混合项 b (旋转偏斜偏角)', min: -1.5, max: 1.5, step: 0.1, value: this.b, color: '#f43f5e', onChange: (val) => { this.b = val; this.rebuildSurface(); } },
            { id: 'qc', label: '对角项 c (Y轴向翘度)', min: -1.5, max: 1.5, step: 0.1, value: this.c, color: '#f59e0b', onChange: (val) => { this.c = val; this.rebuildSurface(); } },
            { id: 'qk', label: '合同剪切系数 k (坐标替换)', min: -1.5, max: 1.5, step: 0.1, value: this.shearK, color: '#8b5cf6', onChange: (val) => { this.shearK = val; this.rebuildSurface(); } }
        ]);
        
        // 5. 注入预设快速跳转按钮
        this.injectPresets();
    }
    
    injectPresets() {
        const container = document.getElementById('controls-container');
        const card = document.createElement('div');
        card.style.marginTop = '15px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        
        card.innerHTML = `
            <div style="font-size: 12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">二次曲面拓扑快速分类 (Presets)</div>
            <button id="pre-pos" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-green), #047857);">
                大饭碗 (正定矩阵：λ₁ > 0, λ₂ > 0)
            </button>
            <button id="pre-saddle" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-gold), #b45309);">
                马鞍面 (不定矩阵：λ₁ > 0, λ₂ < 0)
            </button>
            <button id="pre-trough" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-teal), #0f766e);">
                凹长槽 (半正定矩阵：λ₁ > 0, λ₂ = 0)
            </button>
            <button id="pre-neg" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-pink), #be123c);">
                倒扣碗 (负定矩阵：λ₁ < 0, λ₂ < 0)
            </button>
        `;
        container.appendChild(card);
        
        document.getElementById('pre-pos').addEventListener('click', () => {
            this.a = 0.8; this.b = 0.0; this.c = 0.8; this.shearK = 0.0; this.syncSliders();
        });
        document.getElementById('pre-saddle').addEventListener('click', () => {
            this.a = 0.8; this.b = 0.0; this.c = -0.8; this.shearK = 0.0; this.syncSliders();
        });
        document.getElementById('pre-trough').addEventListener('click', () => {
            this.a = 0.8; this.b = 0.0; this.c = 0.0; this.shearK = 0.0; this.syncSliders();
        });
        document.getElementById('pre-neg').addEventListener('click', () => {
            this.a = -0.8; this.b = 0.0; this.c = -0.8; this.shearK = 0.0; this.syncSliders();
        });
    }
    
    syncSliders() {
        document.getElementById('input-qa').value = this.a;
        document.getElementById('val-qa').innerText = this.a.toFixed(1);
        document.getElementById('input-qb').value = this.b;
        document.getElementById('val-qb').innerText = this.b.toFixed(1);
        document.getElementById('input-qc').value = this.c;
        document.getElementById('val-qc').innerText = this.c.toFixed(1);
        document.getElementById('input-qk').value = this.shearK;
        document.getElementById('val-qk').innerText = this.shearK.toFixed(1);
        
        this.rebuildSurface();
    }
    
    // ==========================================
    // 代数运算与公式渲染
    // ==========================================
    calculateAlgebra() {
        // 原始二次型对称矩阵 A
        const A = [
            this.a, this.b,
            this.b, this.c
        ];
        
        // 顺序主子式
        const d1 = this.a;
        const d2 = this.a * this.c - this.b * this.b;
        
        // 特征值求解
        const eigen = MathUtils.solveEigen2(this.a, this.b, this.b, this.c);
        const l1 = eigen.eigVals[0];
        const l2 = eigen.eigVals[1];
        
        // 计算合同变换后的矩阵 B = C^T A C
        // C = [[1, k], [0, 1]]
        // C^T = [[1, 0], [k, 1]]
        // A * C = [[a, a*k + b], [b, b*k + c]]
        // C^T * A * C = [[a, a*k + b], [k*a + b, k*(a*k+b) + b*k+c]]
        //            = [[a, a*k+b], [a*k+b, a*k^2 + 2b*k + c]]
        const b_a = this.a;
        const b_b = this.a * this.shearK + this.b;
        const b_c = this.a * this.shearK * this.shearK + 2 * this.b * this.shearK + this.c;
        
        // 合同后的特征值与主子式
        const d2_congruent = b_a * b_c - b_b * b_b;
        const eigen_congruent = MathUtils.solveEigen2(b_a, b_b, b_b, b_c);
        
        // 正惯性指数 p 和负惯性指数 q (符号判定)
        let p = 0, q = 0;
        if (l1 > 1e-4) p++; else if (l1 < -1e-4) q++;
        if (l2 > 1e-4) p++; else if (l2 < -1e-4) q++;
        
        // 二次曲面形状分类
        let shapeType = "indefinite"; // 默认不定
        let shapeName = "双曲马鞍面 (Indefinite)";
        let shapeColor = this.colors.indefinite;
        
        if (Math.abs(d2) < 0.05) {
            shapeType = "semidefinite";
            shapeName = "抛物线槽谷面 (Semi-definite)";
            shapeColor = this.colors.semidefinite;
        } else if (d2 > 0) {
            if (d1 > 0) {
                shapeType = "positive";
                shapeName = "朝上椭圆抛物面 (Positive Definite)";
                shapeColor = this.colors.positive;
            } else {
                shapeType = "negative";
                shapeName = "倒扣椭圆抛物面 (Negative Definite)";
                shapeColor = this.colors.negative;
            }
        }
        
        return {
            d1, d2, l1, l2, p, q,
            b_a, b_b, b_c,
            d2_congruent,
            eigen_congruent,
            shapeType, shapeName, shapeColor,
            eigVecs: eigen.eigVecs
        };
    }
    
    updateFormula(alg) {
        const signString = `(\\text{正惯性指数 } p = ${alg.p}, \\, \\text{负 } q = ${alg.q})`;
        
        const latex = `
        A = \\begin{pmatrix} 
        ${this.a.toFixed(1)} & ${this.b.toFixed(1)} \\\\
        ${this.b.toFixed(1)} & ${this.c.toFixed(1)}
        \\end{pmatrix} 
        \\, \\rightarrow \\,
        f(x, y) = ${this.a.toFixed(1)}x^2 + ${(2*this.b).toFixed(1)}xy + ${this.c.toFixed(1)}y^2
        \\\\
        \\text{顺序主子式 } D_1 = ${alg.d1.toFixed(1)}, \\, D_2 = ${alg.d2.toFixed(2)}
        \\\\
        \\text{求特征值：} \\lambda_1 = ${alg.l1.toFixed(2)}, \\, \\lambda_2 = ${alg.l2.toFixed(2)}
        \\\\
        \\text{【合同变换】} B = C^T A C = \\begin{pmatrix} 
        ${alg.b_a.toFixed(1)} & ${alg.b_b.toFixed(1)} \\\\
        ${alg.b_b.toFixed(1)} & ${alg.b_c.toFixed(1)}
        \\end{pmatrix}
        \\\\
        \\text{合同特征值：} \\bar{\\lambda}_1 = ${alg.eigen_congruent.eigVals[0].toFixed(2)}, \\, \\bar{\\lambda}_2 = ${alg.eigen_congruent.eigVals[1].toFixed(2)} \\, ${signString}
        `;
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend(alg) {
        this.app.buildLegend([
            {
                symbol: "z",
                themeColor: alg.shapeType === 'positive' ? 'green' : (alg.shapeType === 'negative' ? 'red' : (alg.shapeType === 'semidefinite' ? 'teal' : 'gold')),
                title: alg.shapeName,
                desc: `当前曲面物理形态。惯性指数：(+, -) = (${alg.p}, ${alg.q})。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "D₂",
                themeColor: "white",
                title: "矩阵行列式 (ac - b²)",
                desc: `Sylvester判别数当前值：${alg.d2.toFixed(2)}。决定曲面为碗状还是马鞍面。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "v₁",
                themeColor: "blue",
                title: "曲面对称主轴 1 (蓝)",
                desc: `对应特征值 λ₁ = ${alg.l1.toFixed(2)}。代表曲率弯曲最陡（最缓）的方向。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            },
            {
                symbol: "v₂",
                themeColor: "pink",
                title: "曲面对称主轴 2 (红)",
                desc: `对应特征值 λ₂ = ${alg.l2.toFixed(2)}。正交于主轴 1。`,
                onHoverIn: () => {},
                onHoverOut: () => {}
            }
        ]);
    }
    
    // ==========================================
    // 重建二次曲面 3D 网格模型
    // ==========================================
    rebuildSurface() {
        const scene = this.app.three.scene;
        
        // 1. 清理旧物体
        if (this.surfaceMesh) { scene.remove(this.surfaceMesh); this.surfaceMesh.geometry.dispose(); this.surfaceMesh.material.dispose(); this.surfaceMesh = null; }
        if (this.surfaceWireframe) { scene.remove(this.surfaceWireframe); this.surfaceWireframe.geometry.dispose(); this.surfaceWireframe.material.dispose(); this.surfaceWireframe = null; }
        this.axisLines.forEach(line => scene.remove(line));
        this.axisLines = [];
        
        // 2. 代数计算
        const alg = this.calculateAlgebra();
        
        // 3. 构建 3D 曲面
        // 使用 PlaneGeometry 结合高度函数扭曲生成极高品质三维曲面
        const gridSegments = 40;
        const width = 6.0;
        const geometry = new THREE.PlaneGeometry(width, width, gridSegments, gridSegments);
        
        // 获取顶点数据并施加二次型高度： z = ax^2 + 2bxy + cy^2
        // 注意：如果存在合同矩阵 C 剪切，需要将代数变量进行替换
        // 这里，我们直接根据合同后的系数 B 绘制曲面（即演示合同变换后曲面的变形与旋转！）
        // 或者是直接绘制合同后的状态 B = C^T A C，完美展示底网剪切带来的形状拉伸！
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            
            // 计算高度：应用合同矩阵 B 对应的二次型
            const z = alg.b_a * x * x + 2 * alg.b_b * x * y + alg.b_c * y * y;
            
            // 为了视觉美观，将高度 z 乘以 0.5 缩小，防止太陡峭飞出视口
            position.setZ(i, z * 0.4);
        }
        
        geometry.computeVertexNormals(); // 重新计算法向量以确保高级金属质感渲染
        
        // 材质：高抛光双面金属发光半透明材质
        const material = new THREE.MeshPhongMaterial({
            color: alg.shapeColor,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            shininess: 90,
            specular: 0xffffff,
            depthWrite: true
        });
        
        this.surfaceMesh = new THREE.Mesh(geometry, material);
        this.surfaceMesh.castShadow = true;
        this.surfaceMesh.receiveShadow = true;
        
        // 让曲面水平躺下（PlaneGeometry 默认在 XY 平面，绕 X 旋转 90 度躺在 XZ 平面上，高度 z 转化为三维中的 Y 坐标！）
        this.surfaceMesh.rotation.x = -Math.PI / 2;
        scene.add(this.surfaceMesh);
        
        // 4. 绘制网格线条框 (Wireframe) 凸显网格扭曲的空间曲率
        const wireframeGeom = new THREE.WireframeGeometry(geometry);
        const wireframeMat = new THREE.LineBasicMaterial({
            color: alg.shapeColor,
            transparent: true,
            opacity: 0.25
        });
        this.surfaceWireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
        this.surfaceWireframe.rotation.x = -Math.PI / 2;
        scene.add(this.surfaceWireframe);
        
        // 5. 绘制曲面上对称的特征主轴对称线 (Symmetry Axes / Eigenspaces)
        // 只要特征值存在，对称对称主轴就存在
        // 我们利用 solveEigen 得到的主轴向量，投影并画在曲面上，极其炫酷！
        if (Math.abs(alg.l1) > 0.01 || Math.abs(alg.l2) > 0.01) {
            const ev1 = alg.eigVecs[0];
            const ev2 = alg.eigVecs[1];
            
            this.drawSymmetryAxisOnSurface(ev1, 0x3b82f6, alg); // 蓝主轴
            this.drawSymmetryAxisOnSurface(ev2, 0xf43f5e, alg); // 粉主轴
        }
        
        // 6. 更新公式与图例
        this.updateFormula(alg);
        this.updateLegend(alg);
    }
    
    // 辅助方法：在 3D 二次曲面上贴合绘制对称轴
    drawSymmetryAxisOnSurface(evDir, colorHex, alg, customEv) {
        const scene = this.app.three.scene;
        const dir = customEv ? new THREE.Vector3(customEv[0], customEv[1], 0) : new THREE.Vector3(evDir[0], evDir[1], 0);
        dir.normalize();
        
        const points = [];
        const steps = 40;
        const halfWidth = 3.0;
        
        // 沿着主轴方向从 -halfWidth 到 halfWidth 采样顶点高度，构建贴合曲面的主轴线
        for (let i = -steps; i <= steps; i++) {
            const t = (i / steps) * halfWidth;
            const x = dir.x * t;
            const y = dir.y * t;
            
            // 高度映射
            const z = alg.b_a * x * x + 2 * alg.b_b * x * y + alg.b_c * y * y;
            
            // 注意：Three中的Y对应高度，代数中高度是z
            points.push(new THREE.Vector3(x, z * 0.4 + 0.02, -y)); // 稍微抬高 0.02 避开曲面闪烁
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: colorHex,
            linewidth: 4.5
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        this.axisLines.push(line);
    }
    
    destroy() {
        const scene = this.app.three.scene;
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        if (this.surfaceMesh) { scene.remove(this.surfaceMesh); this.surfaceMesh = null; }
        if (this.surfaceWireframe) { scene.remove(this.surfaceWireframe); this.surfaceWireframe = null; }
        this.axisLines.forEach(line => scene.remove(line));
        this.axisLines = [];
    }
    
    update() {
        // 让曲面呈现温润缓慢的旋转，方便考生 360 度全方位领会马鞍面的空间扭翘
        if (this.surfaceMesh && this.surfaceWireframe) {
            const time = Date.now() * 0.0002;
            // 缓慢自转
            this.surfaceMesh.rotation.z = time;
            this.surfaceWireframe.rotation.z = time;
            
            // 旋转特征主轴线以保持同步
            this.axisLines.forEach(line => {
                line.rotation.y = time;
            });
        }
    }
}
