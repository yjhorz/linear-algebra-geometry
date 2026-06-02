import { MathUtils } from '../math-utils.js';

/**
 * 第四章：线性方程组解空间 (Ch4 Linear Equations Module)
 */
export class Chapter4Equations {
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 两条平面方程定义 ax + by + cz = d (方程组个数 m=2 < n=3，天生有无穷多解)
        this.eq1 = { a: 1.0, b: 1.0, c: -0.5, d: 0.0 };
        this.eq2 = { a: -0.5, b: 1.5, c: 1.0, d: 0.0 };
        
        this.d1 = 1.2; // 非齐次时的平移距离
        this.d2 = 0.8;
        
        // 渲染物体
        this.objects = [];
        this.leftObjects = [];
        this.rightObjects = [];
        this.grid = null;
        
        this.colors = {
            eq1: 0x3b82f6,      // 蓝色面
            eq2: 0xf43f5e,      // 粉色面
            nullspace: 0x10b981, // 翠绿解线
            particular: 0xffffff // 亮白特解向量
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        
        if (tabId === "homogeneous") {
            this.app.setRenderMode('3d_single');
            this.initHomogeneousView();
        } else if (tabId === "non_homogeneous") {
            this.app.setRenderMode('3d_dual'); // 双画布对比平移
            this.initNonHomogeneousView();
        }
    }
    
    // ==========================================
    // 1. 齐次线性方程组解空间 (过原点)
    // ==========================================
    initHomogeneousView() {
        this.app.setPanelInfo(
            "齐次方程解空间 (Nullspace)",
            "齐次线性方程组 Ax = 0 的解集构成一个「向量子空间 (核空间)」，在几何上表现为穿过原点的点、线或平面。",
            `
            <p><strong>1. 过原点与子空间封闭性：</strong></p>
            <p>由于常数项 $d_1 = 0, d_2 = 0$，两个平面**必须强行穿过原点**。它们的公共相交线（基础解系张成的空间）自然也穿过原点。</p>
            <p><strong>2. 基础解系的几何含义：</strong></p>
            <p>这里的相交线是 1 维直线，其**基础解系包含 1 个非零方向向量 $\\vec{\\xi}_1$**。解线上的任意一点都是该方程组的一个合法解。</p>
            `
        );
        
        // 强制常数项归0
        this.eq1.d = 0.0;
        this.eq2.d = 0.0;
        
        this.rebuildHomogeneous3D();
        this.app.buildSliders([]); // 齐次过原点无需平移
    }
    
    rebuildHomogeneous3D() {
        const scene = this.app.three.scene;
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        
        const baseGrid = new THREE.GridHelper(16,16, 0x475569, 0x1e293b);
        baseGrid.position.y = -2.0;
        scene.add(baseGrid);
        this.objects.push(baseGrid);
        
        // 绘制两个过原点的平面
        const p1 = this.createPlaneMesh(this.eq1, this.colors.eq1);
        const p2 = this.createPlaneMesh(this.eq2, this.colors.eq2);
        scene.add(p1.mesh); scene.add(p1.edge);
        scene.add(p2.mesh); scene.add(p2.edge);
        this.objects.push(p1.mesh, p1.edge, p2.mesh, p2.edge);
        
        // 计算交线 (即解空间线)
        const n1 = [this.eq1.a, this.eq1.b, this.eq1.c];
        const n2 = [this.eq2.a, this.eq2.b, this.eq2.c];
        const lineDir = MathUtils.vecNormalize(MathUtils.vecCross(n1, n2));
        
        const start = new THREE.Vector3().addScaledVector(new THREE.Vector3(...lineDir), -6);
        const end = new THREE.Vector3().addScaledVector(new THREE.Vector3(...lineDir), 6);
        
        const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
        const lineMat = new THREE.LineBasicMaterial({
            color: this.colors.nullspace, linewidth: 4
        });
        const solveLine = new THREE.Line(lineGeom, lineMat);
        scene.add(solveLine);
        this.objects.push(solveLine);
        
        // 绘制基础解系向量 (箭头)
        const xi1 = MathUtils.vecScale(lineDir, 2.0);
        const xiArrow = this.createVector3D(new THREE.Vector3(0,0,0), xi1, this.colors.nullspace);
        scene.add(xiArrow);
        this.objects.push(xiArrow);
        
        const latex = `
        \\begin{cases}
        ${this.eq1.a.toFixed(1)}x + ${this.eq1.b.toFixed(1)}y + ${this.eq1.c.toFixed(1)}z = 0 \\\\
        ${this.eq2.a.toFixed(1)}x + ${this.eq2.b.toFixed(1)}y + ${this.eq2.c.toFixed(1)}z = 0
        \\end{cases}
        \\\\
        \\text{解集直线：} \\vec{x} = k \\vec{\\xi}_1 = k \\begin{pmatrix} ${xi1[0].toFixed(2)} \\\\ ${xi1[1].toFixed(2)} \\\\ ${xi1[2].toFixed(2)} \\end{pmatrix}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "P₁", themeColor: "blue", title: "方程一代表的平面", desc: "过原点蓝色平面。" },
            { symbol: "P₂", themeColor: "pink", title: "方程二代表的平面", desc: "过原点粉色平面。" },
            { symbol: "ξ₁", themeColor: "green", title: "基础解系 ξ₁ (绿)", desc: "解空间直线的方向向量，解集表示为全部线性组合 k·ξ₁。" }
        ]);
    }

    // ==========================================
    // 2. 非齐次线性方程组解空间 (平行平移)
    // ==========================================
    initNonHomogeneousView() {
        this.app.setPanelInfo(
            "非齐次与齐次解平行平移",
            "非齐次方程 Ax = b 的解集是「仿射空间」，在几何上等于把对应的齐次解空间（零空间）沿着一个特定的特解向量 x₀ 进行「平行平移」。",
            `
            <p><strong>1. 特解 + 齐次通解的几何图像：</strong></p>
            <ul>
                <li><strong>左侧画布：</strong> 齐次方程组 $Ax = 0$，解线 $L_0$（翠绿）精确穿过原点。</li>
                <li><strong>右侧画布：</strong> 非齐次方程组 $Ax = \\vec{b}$。平面偏离原点，交线 $L_b$（翠绿）**被水平架空，但与左边直线严格平行**！</li>
            </ul>
            <p><strong>2. 亮白特解向量 x₀ 的桥梁作用：</strong></p>
            <p>右侧绘制了亮白色的**特解向量 $\\vec{x}_0$**，它从原点射出，终点刚好落在悬空的解线上，生动体现 $\\vec{x} = \\vec{x}_0 + k\\vec{\\xi}_1$ 的平移关系。</p>
            `
        );
        
        this.d1 = 1.2;
        this.d2 = 0.8;
        this.rebuildNonHomogeneous3D();
        
        this.app.buildSliders([
            { id: 'eq_d1', label: '非齐次项 d₁ (移位)', min: -2.0, max: 2.0, step: 0.1, value: this.d1, color: '#3b82f6', onChange: (val) => { this.d1 = val; this.rebuildNonHomogeneous3D(); } },
            { id: 'eq_d2', label: '非齐次项 d₂ (移位)', min: -2.0, max: 2.0, step: 0.1, value: this.d2, color: '#f43f5e', onChange: (val) => { this.d2 = val; this.rebuildNonHomogeneous3D(); } }
        ]);
    }
    
    rebuildNonHomogeneous3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // ----------------- 左侧：齐次 Ax=0 -----------------
        const gridL = new THREE.GridHelper(12,12, 0x475569, 0x1e293b);
        gridL.position.y = -2.0;
        dual.left.scene.add(gridL);
        this.leftObjects.push(gridL);
        
        const eq1_0 = { ...this.eq1, d: 0.0 };
        const eq2_0 = { ...this.eq2, d: 0.0 };
        
        const p1_0 = this.createPlaneMesh(eq1_0, this.colors.eq1);
        const p2_0 = this.createPlaneMesh(eq2_0, this.colors.eq2);
        dual.left.scene.add(p1_0.mesh); dual.left.scene.add(p1_0.edge);
        dual.left.scene.add(p2_0.mesh); dual.left.scene.add(p2_0.edge);
        this.leftObjects.push(p1_0.mesh, p1_0.edge, p2_0.mesh, p2_0.edge);
        
        // 交线
        const n1 = [this.eq1.a, this.eq1.b, this.eq1.c];
        const n2 = [this.eq2.a, this.eq2.b, this.eq2.c];
        const lineDir = MathUtils.vecNormalize(MathUtils.vecCross(n1, n2));
        
        const start0 = new THREE.Vector3().addScaledVector(new THREE.Vector3(...lineDir), -6);
        const end0 = new THREE.Vector3().addScaledVector(new THREE.Vector3(...lineDir), 6);
        
        const solveLineL = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start0, end0]), new THREE.LineBasicMaterial({
            color: this.colors.nullspace, linewidth: 4
        }));
        dual.left.scene.add(solveLineL);
        this.leftObjects.push(solveLineL);
        
        // ----------------- 右侧：非齐次 Ax=b -----------------
        const gridR = new THREE.GridHelper(12,12, 0x475569, 0x1e293b);
        gridR.position.y = -2.0;
        dual.right.scene.add(gridR);
        this.rightObjects.push(gridR);
        
        const eq1_b = { ...this.eq1, d: this.d1 };
        const eq2_b = { ...this.eq2, d: this.d2 };
        
        const p1_b = this.createPlaneMesh(eq1_b, this.colors.eq1);
        const p2_b = this.createPlaneMesh(eq2_b, this.colors.eq2);
        dual.right.scene.add(p1_b.mesh); dual.right.scene.add(p1_b.edge);
        dual.right.scene.add(p2_b.mesh); dual.right.scene.add(p2_b.edge);
        this.rightObjects.push(p1_b.mesh, p1_b.edge, p2_b.mesh, p2_b.edge);
        
        // 计算非齐次特解 x0 (利用最小二乘/伪逆特解，或者令 z=0 求解)
        // eq1: ax + by = d1, eq2: cx + dy = d2
        const det2D = this.eq1.a * this.eq2.b - this.eq1.b * this.eq2.a;
        let x0 = [0, 0, 0];
        if (Math.abs(det2D) > 1e-4) {
            x0 = [
                (this.d1 * this.eq2.b - this.d2 * this.eq1.b) / det2D,
                (this.eq1.a * this.d2 - this.eq2.a * this.d1) / det2D,
                0.0
            ];
        }
        
        // 非齐次交线：平行于 lineDir，但经过 x0
        const p0 = new THREE.Vector3(...x0);
        const startB = p0.clone().addScaledVector(new THREE.Vector3(...lineDir), -6);
        const endB = p0.clone().addScaledVector(new THREE.Vector3(...lineDir), 6);
        
        const solveLineR = new THREE.Line(new THREE.BufferGeometry().setFromPoints([startB, endB]), new THREE.LineBasicMaterial({
            color: this.colors.nullspace, linewidth: 4
        }));
        dual.right.scene.add(solveLineR);
        this.rightObjects.push(solveLineR);
        
        // 绘制特解向量 x0 (亮白)
        const x0Arrow = this.createVector3D(new THREE.Vector3(0,0,0), x0, this.colors.particular);
        dual.right.scene.add(x0Arrow);
        this.rightObjects.push(x0Arrow);
        
        // 更新公式
        const latex = `
        \\text{右侧非齐次：} 
        \\begin{cases}
        x + y - 0.5z = ${this.d1.toFixed(1)} \\\\
        -0.5x + 1.5y + z = ${this.d2.toFixed(1)}
        \\end{cases}
        \\\\
        \\text{特解：} \\vec{x}_0 = \\begin{pmatrix} ${x0[0].toFixed(2)} \\\\ ${x0[1].toFixed(2)} \\\\ ${x0[2].toFixed(2)} \\end{pmatrix}, \\quad
        \\text{齐次解方向：} \\vec{\\xi}_1
        \\\\
        \\text{非齐次通解直线：} \\vec{x} = \\vec{x}_0 + k\\vec{\\xi}_1 \\quad [\\text{平行平移解线}]
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "L₀", themeColor: "green", title: "齐次解集直线 (左)", desc: "穿过原点的翠绿色解空间线。对应通解 k·ξ₁。" },
            { symbol: "x₀", themeColor: "white", title: "特解向量 x₀ (右)", desc: "连接原点到悬空解线的亮白色指针桥梁。" },
            { symbol: "L_b", themeColor: "teal", title: "非齐次解集直线 (右)", desc: "被平移架空、但与左线严格平行的直线，通解为 x₀ + k·ξ₁。" }
        ]);
    }
    
    // ==========================================
    // 几何工具
    // ==========================================
    createPlaneMesh(eq, colorHex) {
        const n = new THREE.Vector3(eq.a, eq.b, eq.c);
        const len = n.length();
        n.normalize();
        
        const offset = eq.d / len;
        const geometry = new THREE.PlaneGeometry(6, 6);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n);
        
        const material = new THREE.MeshPhongMaterial({
            color: colorHex, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.applyQuaternion(quaternion);
        mesh.position.copy(n.clone().multiplyScalar(offset));
        
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({
            color: colorHex, linewidth: 1.5, transparent: true, opacity: 0.6
        }));
        edge.applyQuaternion(quaternion);
        edge.position.copy(n.clone().multiplyScalar(offset));
        
        return { mesh, edge };
    }
    
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = Math.max(dir.length(), 0.1);
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.35, 0.15);
        arrow.line.material.linewidth = 3.5;
        return arrow;
    }
    
    clearDualObjects() {
        const clearS = (scene, list) => {
            if (scene) {
                list.forEach(obj => {
                    scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
            }
        };
        clearS(this.app.dualThree.left.scene, this.leftObjects);
        this.leftObjects = [];
        clearS(this.app.dualThree.right.scene, this.rightObjects);
        this.rightObjects = [];
    }
    
    destroy() {
        const scene = this.app.three.scene;
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        this.clearDualObjects();
    }
}
