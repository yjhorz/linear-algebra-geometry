import { MathUtils } from '../math-utils.js';

/**
 * 第一章：行列式与矩阵运算基础 (Ch1 Basics Module)
 */
export class Chapter1Basics {
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 核心数据 (矩阵 A 和 3D 向量)
        this.v1 = [2.5, 0.0, 0.0];
        this.v2 = [0.8, 2.2, 0.0];
        this.v3 = [0.0, 0.8, 2.0];
        
        // 渲染物体缓存
        this.objects = [];
        this.leftObjects = [];
        this.rightObjects = [];
        this.grid = null;
        
        this.colors = {
            v1: 0x3b82f6,      // 蓝色 α1
            v2: 0xf43f5e,      // 粉色 α2
            v3: 0xf59e0b,      // 金色 α3
            volume: 0x14b8a6,  // 青色体积
            adjoint: 0x8b5cf6, // 紫色伴随
            inverse: 0x06b6d4  // 靛蓝逆矩阵
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        
        if (tabId === "det") {
            this.app.setRenderMode('3d_single');
            this.initDetView();
        } else if (tabId === "transpose") {
            this.app.setRenderMode('3d_dual');
            this.initTransposeView();
        } else if (tabId === "inverse_adj") {
            this.app.setRenderMode('3d_dual');
            this.initInverseAdjView();
        }
    }
    
    // ==========================================
    // 子 Tab 1: 行列式与体积坍缩
    // ==========================================
    initDetView() {
        this.app.setPanelInfo(
            "行列式与体积坍缩",
            "考研线性代数核心考点。三阶行列式 |A| 在几何上代表由其三个列向量围成的平行六面体的「有向体积」。当且仅当向量组线性相关时，体积发生「维度坍缩」归零，对应行列式 |A| = 0。",
            `
            <p><strong>1. 行列式与秩、可逆性、相关性的完美统一：</strong></p>
            <ul>
                <li><strong>|A| ≠ 0 </strong> $\\rightarrow$ 3D体积非零 $\\rightarrow$ 空间未发生坍缩 $\\rightarrow$ 秩 $r(A)=3$ $\\rightarrow$ 矩阵可逆 $\\rightarrow$ 向量组线性无关。</li>
                <li><strong>|A| = 0 </strong> $\\rightarrow$ 六面体被压扁 $\\rightarrow$ **维度坍缩** $\\rightarrow$ 秩 $r(A)<3$ $\\rightarrow$ 矩阵不可逆 $\\rightarrow$ 向量组共面或共线线性相关。</li>
            </ul>
            <p><strong>2. 拖动滑块体验维度塌缩：</strong></p>
            <p>拖动下方滑块控制 $\\vec{\\alpha}_3$ 的 $z$ 分量（代表高度）。当高度降为 0 时，六面体压扁成一个面，体积为 0，行列式 $|A| = 0$！</p>
            `
        );
        
        // 绘制基础底格
        this.grid = new THREE.GridHelper(16, 16, 0x475569, 0x1e293b);
        this.grid.position.y = -0.01;
        this.app.three.scene.add(this.grid);
        
        // 渲染 3D
        this.rebuildDet3D();
        
        // 构建滑块
        this.app.buildSliders([
            { id: 'v1x', label: 'α₁ 横轴偏向 (x)', min: 0.5, max: 4.0, step: 0.1, value: this.v1[0], color: '#3b82f6', onChange: (val) => { this.v1[0] = val; this.rebuildDet3D(); } },
            { id: 'v2y', label: 'α₂ 纵向宽度 (y)', min: 0.5, max: 4.0, step: 0.1, value: this.v2[1], color: '#f43f5e', onChange: (val) => { this.v2[1] = val; this.rebuildDet3D(); } },
            { id: 'v3z', label: 'α₃ 竖向高度 (z - 坍缩控制)', min: 0.0, max: 4.0, step: 0.1, value: this.v3[2], color: '#f59e0b', onChange: (val) => { this.v3[2] = val; this.rebuildDet3D(); } }
        ]);
    }
    
    rebuildDet3D() {
        const scene = this.app.three.scene;
        
        // 清理
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        
        // 绘制三根向量
        const origin = new THREE.Vector3(0,0,0);
        const a1 = this.createVector3D(origin, this.v1, this.colors.v1);
        const a2 = this.createVector3D(origin, this.v2, this.colors.v2);
        const a3 = this.createVector3D(origin, this.v3, this.colors.v3);
        scene.add(a1); scene.add(a2); scene.add(a3);
        this.objects.push(a1, a2, a3);
        
        // 计算行列式
        const mat = [
            this.v1[0], this.v2[0], this.v3[0],
            this.v1[1], this.v2[1], this.v3[1],
            this.v1[2], this.v2[2], this.v3[2]
        ];
        const det = MathUtils.det3(mat);
        const isCollapsed = Math.abs(det) < 0.05;
        
        // 绘制六面体
        const p = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(...this.v1),
            new THREE.Vector3(...this.v2),
            new THREE.Vector3(...this.v3),
            new THREE.Vector3(this.v1[0]+this.v2[0], this.v1[1]+this.v2[1], this.v1[2]+this.v2[2]),
            new THREE.Vector3(this.v1[0]+this.v3[0], this.v1[1]+this.v3[1], this.v1[2]+this.v3[2]),
            new THREE.Vector3(this.v2[0]+this.v3[0], this.v2[1]+this.v3[1], this.v2[2]+this.v3[2]),
            new THREE.Vector3(this.v1[0]+this.v2[0]+this.v3[0], this.v1[1]+this.v2[1]+this.v3[1], this.v1[2]+this.v2[2]+this.v3[2])
        ];
        
        const geometry = new THREE.BufferGeometry();
        const indices = [
            0,2,1, 1,2,4, 3,5,6, 6,5,7,
            0,1,3, 3,1,5, 2,6,4, 4,6,7,
            0,3,2, 2,3,6, 1,4,5, 5,4,7
        ];
        const vertices = [];
        indices.forEach(idx => vertices.push(p[idx].x, p[idx].y, p[idx].z));
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: isCollapsed ? 0xef4444 : this.colors.volume,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            shininess: 80
        }));
        scene.add(mesh);
        this.objects.push(mesh);
        
        // 线框边
        const edgeGeom = new THREE.BufferGeometry();
        const linePairs = [
            p[0],p[1], p[0],p[2], p[1],p[4], p[2],p[4],
            p[3],p[5], p[3],p[6], p[5],p[7], p[6],p[7],
            p[0],p[3], p[1],p[5], p[2],p[6], p[4],p[7]
        ];
        const edgeVertices = [];
        linePairs.forEach(v => edgeVertices.push(v.x, v.y, v.z));
        edgeGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
        const edge = new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
            color: isCollapsed ? 0xef4444 : this.colors.volume, linewidth: 2
        }));
        scene.add(edge);
        this.objects.push(edge);
        
        // 更新公式与图例
        const latex = `
        A = (\\vec{\\alpha}_1, \\vec{\\alpha}_2, \\vec{\\alpha}_3) = 
        \\begin{pmatrix} 
        ${this.v1[0].toFixed(1)} & ${this.v2[0].toFixed(1)} & ${this.v3[0].toFixed(1)} \\\\
        ${this.v1[1].toFixed(1)} & ${this.v2[1].toFixed(1)} & ${this.v3[1].toFixed(1)} \\\\
        ${this.v1[2].toFixed(1)} & ${this.v2[2].toFixed(1)} & ${this.v3[2].toFixed(1)}
        \\end{pmatrix} 
        \\\\
        \\text{行列式 } |A| = \\text{有向体积 } V = ${det.toFixed(2)}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "α₁", themeColor: "blue", title: "列向量 α₁", desc: `平行六面体第一基底棱边` },
            { symbol: "α₂", themeColor: "pink", title: "列向量 α₂", desc: `平行六面体第二基底棱边` },
            { symbol: "α₃", themeColor: "gold", title: "列向量 α₃", desc: `高度方向控制轴，当高度降为0时体积坍缩` },
            { symbol: "det", themeColor: isCollapsed ? "red" : "teal", title: isCollapsed ? "体积坍缩 (det=0)" : "行列式值 (体积)", desc: isCollapsed ? "向量共面线性相关！发生维度坍缩！" : `当前六面体物理有向体积：${det.toFixed(2)}。` }
        ]);
    }

    // ==========================================
    // 子 Tab 2: 矩阵转置与对称翻转
    // ==========================================
    initTransposeView() {
        this.app.setPanelInfo(
            "矩阵转置与对称镜像",
            "转置矩阵 Aᵀ 将 A 的行向量变成列向量。在几何上，转置变换等价于将整个三维扭曲的空间坐标格网，沿着主对角对称线进行「对称翻转镜像（Reflection）」。",
            `
            <p><strong>1. 行列与对称反射：</strong></p>
            <p>左侧画布展示矩阵 $A$ 对空间的扭曲形变，右侧画布展示转置矩阵 $A^T$ 对空间的扭曲形变。您可以通过对比两边网格在各个轴向上的歪斜程度，直观看出它们关于<strong>主对角平面的反射对称性</strong>。</p>
            <p><strong>2. 对称矩阵与转置：</strong></p>
            <p>当实对称矩阵满足 $A^T = A$ 时，代表空间网格的形变完全是对称的，关于对角平面的映射两两对称，因此其转置矩阵在几何上和原矩阵毫无差别。</p>
            `
        );
        
        // 准备双画布 3D 渲染
        this.rebuildTranspose3D();
        
        this.app.buildSliders([
            { id: 'skew', label: '空间剪切翘角 (Skew)', min: -1.5, max: 1.5, step: 0.1, value: 0.8, color: '#3b82f6', onChange: (val) => { this.rebuildTranspose3D(val); } }
        ]);
    }
    
    rebuildTranspose3D(skew = 0.8) {
        const dual = this.app.dualThree;
        
        // 清理
        this.clearDualObjects();
        
        // 定义矩阵 A = [[1.2, skew, 0], [0, 1.0, 0], [0, 0, 1.0]] (剪切矩阵)
        const matA = [
            1.2, skew, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ];
        // 转置 A^T
        const matAT = MathUtils.transpose3(matA);
        
        // 在左侧绘制 A 的空间扭曲 (彩色向量 + 扭曲网格)
        this.drawDeformedSpace(dual.left.scene, matA, this.leftObjects);
        
        // 在右侧绘制 A^T 的空间扭曲 (彩色向量 + 扭曲网格)
        this.drawDeformedSpace(dual.right.scene, matAT, this.rightObjects);
        
        // 更新公式
        const latex = `
        A = \\begin{pmatrix} 1.2 & ${skew.toFixed(1)} & 0.0 \\\\ 0.0 & 1.0 & 0.0 \\\\ 0.0 & 0.0 & 1.0 \\end{pmatrix}, \\quad
        A^T = \\begin{pmatrix} 1.2 & 0.0 & 0.0 \\\\ ${skew.toFixed(1)} & 1.0 & 0.0 \\\\ 0.0 & 0.0 & 1.0 \\end{pmatrix}
        \\\\
        \\text{左画布 } \\vec{y} = A\\vec{x} \\quad \\leftrightarrow \\quad \\text{右画布 } \\vec{z} = A^T\\vec{x} \\quad [\\text{对称反射}]
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "blue", title: "原形变网格 (左)", desc: "矩阵 A 的剪切空间形变，网格斜向拉伸。" },
            { symbol: "Aᵀ", themeColor: "pink", title: "转置形变网格 (右)", desc: "行变列后，空间沿主对角平面对称翻转剪切。" }
        ]);
    }
    
    // ==========================================
    // 子 Tab 3: 逆与伴随
    // ==========================================
    initInverseAdjView() {
        this.app.setPanelInfo(
            "逆矩阵还原与伴随矩阵缩放",
            "逆矩阵 A⁻¹ 的几何意义是「空间无损还原器」；伴随矩阵 A* 基于公式 A* = |A|A⁻¹，在几何上代表「缩放了 |A| 倍的逆形变空间」。",
            `
            <p><strong>1. A⁻¹：无损还原的倒退动画：</strong></p>
            <p>当空间被矩阵 $A$ 扭曲后，逆矩阵 $A^{-1}$ 代表反向操作。点击下方“空间无损还原”按钮，您将看到左侧被扭曲的网格沿反轨迹完美退回正方形标准网格。</p>
            <p><strong>2. A*：伴随的体积倍率关系：</strong></p>
            <p>右侧画布展示伴随矩阵 $A^*$ 对空间的形变。由于伴随矩阵携带了行列式体积因数 $|A|$，**其形变的大小比例与左边的逆矩阵呈 $|A|$ 倍正比**。当拉大 $|A|$ 时，伴随矩阵形变范围同步剧烈扩大！</p>
            `
        );
        
        this.rebuildInverseAdj3D();
        
        this.app.buildSliders([
            { id: 'scaleA', label: '矩阵 A 主拉伸倍数 (影响 |A| 体积)', min: 0.5, max: 2.0, step: 0.1, value: 1.2, color: '#3b82f6', onChange: (val) => { this.rebuildInverseAdj3D(val); } }
        ]);
        
        // 加入还原动画按钮
        const container = document.getElementById('controls-container');
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.style.marginTop = '10px';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0-.57-8.38l5.67-5.67"></path></svg>
            启动逆矩阵还原动画 (A⁻¹ → I)
        `;
        btn.addEventListener('click', () => this.runInverseAnimation());
        container.appendChild(btn);
    }
    
    rebuildInverseAdj3D(scaleVal = 1.2) {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 构造矩阵 A = [[scaleVal, 0, 0], [0, 1.0, 0.5], [0, 0, 1.0]]
        const matA = [
            scaleVal, 0.0, 0.0,
            0.0, 1.0, 0.5,
            0.0, 0.0, 1.0
        ];
        
        const det = MathUtils.det3(matA);
        const invA = MathUtils.invertMat3(matA);
        const adjA = MathUtils.adjoint3(matA);
        
        this.currentInvMatrix = invA; // 存入类属性，用于动画插值
        
        // 左边绘制逆形变 A^-1 空间
        this.drawDeformedSpace(dual.left.scene, invA, this.leftObjects);
        
        // 右边绘制伴随形变 A* 空间 (体积缩放逆变换)
        this.drawDeformedSpace(dual.right.scene, adjA, this.rightObjects);
        
        const latex = `
        |A| = ${det.toFixed(2)}, \\quad
        A^{-1} = \\begin{pmatrix} 
        ${invA[0].toFixed(2)} & 0 & 0 \\\\ 
        0 & 1 & -0.5 \\\\ 
        0 & 0 & 1
        \\end{pmatrix} [\\text{无损还原}]
        \\\\
        A^* = |A|A^{-1} = \\begin{pmatrix} 
        ${adjA[0].toFixed(2)} & 0 & 0 \\\\ 
        0 & ${adjA[4].toFixed(2)} & ${adjA[5].toFixed(2)} \\\\ 
        0 & 0 & ${adjA[8].toFixed(2)}
        \\end{pmatrix} [\\text{体积倍率伴随}]
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A⁻¹", themeColor: "teal", title: "逆矩阵空间 (左)", desc: "无损撤销 A 形变的原位形变格网。" },
            { symbol: "A*", themeColor: "purple", title: "伴随矩阵空间 (右)", desc: `缩放了 |A| = ${det.toFixed(2)} 倍的逆形变格网。` }
        ]);
    }
    
    runInverseAnimation() {
        // 播放 1.5s 动画：从 A^-1 线性退化到 I (单位矩阵)
        const startTime = performance.now();
        const duration = 1500;
        const inv = this.currentInvMatrix;
        const dual = this.app.dualThree;
        
        const anim = (time) => {
            if (this.currentTab !== 'inverse_adj') return; // 防跨页面干扰
            let progress = (time - startTime) / duration;
            if (progress >= 1.0) progress = 1.0;
            
            // 缓动
            const t = progress; 
            const currentM = [
                inv[0] + (1.0 - inv[0])*t, 0, 0,
                0, inv[4] + (1.0 - inv[4])*t, inv[5] + (0.0 - inv[5])*t,
                0, 0, inv[8] + (1.0 - inv[8])*t
            ];
            
            this.clearLeftObjects();
            this.drawDeformedSpace(dual.left.scene, currentM, this.leftObjects);
            
            if (progress < 1.0) {
                requestAnimationFrame(anim);
            }
        };
        requestAnimationFrame(anim);
    }
    
    // ==========================================
    // 渲染工具函数 (Deformed space helpers)
    // ==========================================
    
    drawDeformedSpace(scene, mat, objectList) {
        // 1. 绘制扭曲的三轴向量
        const origin = new THREE.Vector3(0,0,0);
        const transE1 = MathUtils.matMulVec(mat, [1.5, 0, 0]);
        const transE2 = MathUtils.matMulVec(mat, [0, 1.5, 0]);
        const transE3 = MathUtils.matMulVec(mat, [0, 0, 1.5]);
        
        const a1 = this.createVector3D(origin, transE1, this.colors.v1);
        const a2 = this.createVector3D(origin, transE2, this.colors.v2);
        const a3 = this.createVector3D(origin, transE3, this.colors.v3);
        
        scene.add(a1); scene.add(a2); scene.add(a3);
        objectList.push(a1, a2, a3);
        
        // 2. 绘制扭曲的三维格网
        const size = 3;
        const steps = 6;
        const gridGeom = new THREE.BufferGeometry();
        const points = [];
        
        // 沿着 X 轴平行的线
        for (let y = -size; y <= size; y += size/steps) {
            for (let z = -size; z <= size; z += size/steps) {
                const pStart = MathUtils.matMulVec(mat, [-size, y, z]);
                const pEnd = MathUtils.matMulVec(mat, [size, y, z]);
                points.push(new THREE.Vector3(...pStart), new THREE.Vector3(...pEnd));
            }
        }
        // 沿着 Y 轴平行的线
        for (let x = -size; x <= size; x += size/steps) {
            for (let z = -size; z <= size; z += size/steps) {
                const pStart = MathUtils.matMulVec(mat, [x, -size, z]);
                const pEnd = MathUtils.matMulVec(mat, [x, size, z]);
                points.push(new THREE.Vector3(...pStart), new THREE.Vector3(...pEnd));
            }
        }
        
        gridGeom.setFromPoints(points);
        const gridMat = new THREE.LineBasicMaterial({
            color: 0x475569, transparent: true, opacity: 0.22
        });
        const gridLines = new THREE.LineSegments(gridGeom, gridMat);
        scene.add(gridLines);
        objectList.push(gridLines);
    }
    
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = Math.max(dir.length(), 0.1);
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.35, 0.15);
        arrow.line.material.linewidth = 3;
        return arrow;
    }
    
    clearDualObjects() {
        this.clearLeftObjects();
        this.clearRightObjects();
    }
    
    clearLeftObjects() {
        const scene = this.app.dualThree.left.scene;
        if (scene) {
            this.leftObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            this.leftObjects = [];
        }
    }
    
    clearRightObjects() {
        const scene = this.app.dualThree.right.scene;
        if (scene) {
            this.rightObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            this.rightObjects = [];
        }
    }
    
    destroy() {
        const scene = this.app.three.scene;
        if (this.grid) {
            scene.remove(this.grid);
            this.grid = null;
        }
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        this.clearDualObjects();
    }
    
    update() {
        // 轻微呼吸效果
    }
}
