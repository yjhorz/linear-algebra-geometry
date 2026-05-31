import { MathUtils } from '../math-utils.js';

/**
 * 第二章：矩阵的四大核心关系 (Ch2 Matrix Relations Module)
 */
export class Chapter2Relations {
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 渲染物体缓存
        this.leftObjects = [];
        this.rightObjects = [];
        this.sliderVal = 0.5; // 通用滑块变量
        
        this.colors = {
            v1: 0x3b82f6,      // 蓝色
            v2: 0xf43f5e,      // 粉色
            v3: 0xf59e0b,      // 金色
            spanPlane: 0x10b981, // 绿色等价面
            surfaceLeft: 0x06b6d4, // 左曲面
            surfaceRight: 0x10b981 // 右曲面
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        this.app.setRenderMode('3d_dual'); // 全部为双 3D 画布对比视角
        
        if (tabId === "equivalence") {
            this.initEquivalenceView();
        } else if (tabId === "similarity") {
            this.initSimilarityView();
        } else if (tabId === "congruence") {
            this.initCongruenceView();
        } else if (tabId === "orthogonality") {
            this.initOrthogonalityView();
        }
    }
    
    // ==========================================
    // 1. 矩阵等价关系: PAQ
    // ==========================================
    initEquivalenceView() {
        this.app.setPanelInfo(
            "矩阵等价 (Equivalent Matrices)",
            "两个矩阵等价 A ~ B 的充要条件是它们的「秩相等」r(A) = r(B)。在几何上，这代表它们可以将三维空间压缩为相同维度的子空间（例如都压成二维面或一维线）。",
            `
            <p><strong>1. 等价与初等变换：</strong></p>
            <p>初等变换是通过左乘可逆阵 $P$（改变输出基底）和右乘可逆阵 $Q$（改变输入基底）实现的。<strong>基底的改变绝不改变空间扭曲后的值域维度（即秩）</strong>。</p>
            <p><strong>2. 秩相等即等价的几何直觉：</strong></p>
            <p>左侧和右侧分别展示两个不同的投影降维矩阵。虽然它们把网格拍扁的朝向和形状不同，但**它们都将 3D 空间完全拍扁在了一个 2D 平面上**，它们的秩都是 2，因此它们在代数上是等价的！</p>
            `
        );
        
        this.sliderVal = 0.5;
        this.rebuildEquivalence3D();
        
        this.app.buildSliders([
            { id: 'eq_shear', label: '等价矩阵 B 的倾斜偏角', min: -1.5, max: 1.5, step: 0.1, value: this.sliderVal, color: '#3b82f6', onChange: (val) => { this.sliderVal = val; this.rebuildEquivalence3D(); } }
        ]);
    }
    
    rebuildEquivalence3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 矩阵 A: 秩为2的垂直投影矩阵 [[1, 0, 0], [0, 1, 0], [0, 0, 0]]
        const matA = [
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0
        ];
        
        // 矩阵 B: 也是秩为2，但是带有倾斜剪切 B = P * A * Q
        const matB = [
            1.0, this.sliderVal, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0
        ];
        
        // 左侧绘制 A (把格网和向量拍扁在标准的 XY 2D平面上)
        this.drawDeformedSpaceWithRankPlane(dual.left.scene, matA, this.leftObjects, 0.0);
        
        // 右侧绘制 B (把格网和向量拍扁在带有偏斜角度的 2D平面上)
        this.drawDeformedSpaceWithRankPlane(dual.right.scene, matB, this.rightObjects, this.sliderVal);
        
        // 更新公式
        const latex = `
        A = \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 0 \\end{pmatrix}, \\quad
        B = \\begin{pmatrix} 1 & ${this.sliderVal.toFixed(1)} & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 0 \\end{pmatrix}
        \\\\
        \\text{计算秩：} r(A) = 2, \\quad r(B) = 2
        \\\\
        \\text{因 } r(A)=r(B) \\, \\rightarrow \\, A \\sim B \\, (\\text{等价于相同降维})
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "r(A)", themeColor: "blue", title: "矩阵 A 的值域面 (左)", desc: "空间被压实拍扁在标准 xy 水平绿面上。维度 = 2。" },
            { symbol: "r(B)", themeColor: "pink", title: "矩阵 B 的值域面 (右)", desc: "空间被拍扁在偏斜的绿色切面上，虽然方向不同，但维度同样 = 2。" }
        ]);
    }
    
    // ==========================================
    // 2. 矩阵相似关系: P⁻¹AP
    // ==========================================
    initSimilarityView() {
        this.app.setPanelInfo(
            "矩阵相似 (Similar Matrices)",
            "相似矩阵 B = P⁻¹AP 描述的是「同一个线性变换在不同坐标系下的代数表示」。几何上，它是在特征向量对齐的坐标系下，消除切变，还原为最单纯的轴向拉伸。",
            `
            <p><strong>1. 换个视角看形变：</strong></p>
            <p>左侧展示矩阵 $A$ 对空间的形变，网格倾斜发生严重剪切。右侧展示对角化相似矩阵 $\Lambda = P^{-1}AP$ 对空间的形变。<strong>在右侧由特征向量充当的坐标轴下，空间只是在单纯地沿坐标轴拉伸</strong>，完全消除了倾斜歪歪扭扭的现象！</p>
            <p><strong>2. 相似特征值守恒：</strong></p>
            <p>因为它们描述的是同一种拉伸形变，所以它们的<strong>特征值（主拉伸倍数）完全相等</strong>。特征值即代表了空间最本质的拉伸基因。</p>
            `
        );
        
        this.sliderVal = 0.5;
        this.rebuildSimilarity3D();
        
        this.app.buildSliders([
            { id: 'sim_shear', label: '矩阵 A 剪切变形系数', min: 0.1, max: 1.5, step: 0.1, value: this.sliderVal, color: '#3b82f6', onChange: (val) => { this.sliderVal = val; this.rebuildSimilarity3D(); } }
        ]);
    }
    
    rebuildSimilarity3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 矩阵 A: 带有特征剪切
        // A = [[1.5, shear], [0, 1.0]] (2D嵌入3D)
        const matA = [
            1.5, this.sliderVal, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 相似对角阵 B = P^-1 A P = [[1.5, 0], [0, 1.0]] (纯轴向拉伸!)
        const matB = [
            1.5, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 左边绘制 A (歪歪扭扭的变形网格)
        this.drawDeformedSpace(dual.left.scene, matA, this.leftObjects);
        
        // 右边绘制 B (完全笔直、仅沿X轴拉伸 1.5 倍的纯净网格!)
        this.drawDeformedSpace(dual.right.scene, matB, this.rightObjects);
        
        const latex = `
        A = \\begin{pmatrix} 1.5 & ${this.sliderVal.toFixed(1)} & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}, \\quad
        \\Lambda = P^{-1}AP = \\begin{pmatrix} 1.5 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}
        \\\\
        \\text{相似特征值：} \\lambda_1 = 1.5, \\quad \\lambda_2 = 1.0, \\quad \\lambda_3 = 1.0
        \\\\
        \\text{右画布去除了倾斜剪切，退化为最单纯的 [轴向等比拉伸]}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "blue", title: "扭曲网格 (左)", desc: "在标准基下，线性变换产生了倾斜剪切变形。" },
            { symbol: "Λ", themeColor: "green", title: "对角化网格 (右)", desc: "在新特征基下，变换消除了剪切，完全表现为轴向拉伸。" }
        ]);
    }
    
    // ==========================================
    // 3. 矩阵合同关系: CᵀAC
    // ==========================================
    initCongruenceView() {
        this.app.setPanelInfo(
            "矩阵合同与二次曲面 (Congruent Matrices)",
            "矩阵合同 B = CᵀAC 是二次型进行非退化变量替换时的等价关系。在几何上，它代表底面度量坐标网格的拉伸形变，绝对保持二次曲面向上凸和向下凹的主轴数量（惯性指数）不变。",
            `
            <p><strong>1. 碗依然是碗，马鞍依然是马鞍：</strong></p>
            <p>左侧绘制二次型曲面 $z = x^T A x$（呈朝天开口的大饭碗）。右侧绘制对其进行合同变量替换 $x = Cy$ 后的新二次曲面 $z = y^T B y$。虽然由于 $C$ 的拉伸和剪切，<strong>碗的倾斜角度和椭圆扁圆度变了，但它依然是一只完美的朝上开口的碗</strong>！</p>
            <p><strong>2. 惯性定理的几何铁律：</strong></p>
            <p>无论你怎么扭曲底面网格，正负特征值的个数（正负惯性指数）在合同变换下**绝对保持恒定**，几何拓扑类型合同守恒！</p>
            `
        );
        
        this.sliderVal = 0.0;
        this.rebuildCongruence3D();
        
        this.app.buildSliders([
            { id: 'cong_shear', label: '合同变换剪切系数 k (C 矩阵)', min: -1.0, max: 1.0, step: 0.1, value: this.sliderVal, color: '#8b5cf6', onChange: (val) => { this.sliderVal = val; this.rebuildCongruence3D(); } }
        ]);
    }
    
    rebuildCongruence3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 原始二次型矩阵 A = [[0.8, 0], [0, 0.8]] (正定，开口朝上的圆饭碗)
        const a_a = 0.8, a_b = 0.0, a_c = 0.8;
        
        // 合同变换矩阵 C = [[1, k], [0, 1]]
        // B = C^T * A * C = [[a, a*k], [a*k, a*k^2 + c]]
        const b_a = a_a;
        const b_b = a_a * this.sliderVal + a_b;
        const b_c = a_a * this.sliderVal * this.sliderVal + a_c;
        
        // 绘制左侧 A 对应的正圆曲面碗
        this.drawQuadraticSurface(dual.left.scene, a_a, a_b, a_c, this.leftObjects, this.colors.surfaceLeft);
        
        // 绘制右侧合同变换后 B 对应的椭圆剪切曲面碗
        this.drawQuadraticSurface(dual.right.scene, b_a, b_b, b_c, this.rightObjects, this.colors.surfaceRight);
        
        // 更新公式
        const latex = `
        A = \\begin{pmatrix} 0.8 & 0 \\\\ 0 & 0.8 \\end{pmatrix} [\\text{标准圆碗}], \\quad
        C = \\begin{pmatrix} 1 & ${this.sliderVal.toFixed(1)} \\\\ 0 & 1 \\end{pmatrix}
        \\\\
        B = C^T A C = \\begin{pmatrix} 0.8 & ${(0.8*this.sliderVal).toFixed(2)} \\\\ ${(0.8*this.sliderVal).toFixed(2)} & ${(0.8*this.sliderVal*this.sliderVal+0.8).toFixed(2)} \\end{pmatrix} [\\text{剪切椭圆碗}]
        \\\\
        \\text{正负特征值数量不变 } \\rightarrow \\text{惯性指数守恒：} (p, q) = (2, 0)
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "teal", title: "标准正定曲面 (左)", desc: "正圆开口抛物碗，特征值全为正。" },
            { symbol: "B", themeColor: "green", title: "合同偏斜曲面 (右)", desc: "由于 C 的拉伸剪切，圆碗变成了椭圆偏斜碗，但其拓扑开口朝上类型绝对守恒！" }
        ]);
    }
    
    // ==========================================
    // 4. 正交矩阵: QᵀQ = I
    // ==========================================
    initOrthogonalityView() {
        this.app.setPanelInfo(
            "正交矩阵与刚性变换 (Orthogonal Matrices)",
            "正交矩阵 Q 满足 QᵀQ = I。几何上，正交变换代表对整个空间进行「绝对刚性的旋转或镜像反射」，夹角和长度完全不变。",
            `
            <p><strong>1. 最完美的刚性空间：</strong></p>
            <p>左侧展示原始标准网格，右侧展示经正交旋转矩阵 $Q$ 变换后的形变网格。**网格中的所有正方形大小、长宽比例、以及两两线条交角（90°）都完美保持不变**！</p>
            <p><strong>2. 行列式的刚性标志：</strong></p>
            <p>正交矩阵的行列式必为 $|Q| = \pm 1$。当 $|Q|=1$ 时，代表空间发生了纯粹的**刚性旋转**；当 $|Q|=-1$ 时，代表空间发生了**刚性镜像翻转**，它们绝不拉伸撕裂任何空间距离。</p>
            `
        );
        
        this.sliderVal = 30; // 初始旋转30度
        this.rebuildOrthogonality3D();
        
        this.app.buildSliders([
            { id: 'orth_rot', label: '正交变换刚性旋转角度 θ', min: 0, max: 180, step: 5, value: this.sliderVal, color: '#f43f5e', onChange: (val) => { this.sliderVal = val; this.rebuildOrthogonality3D(); } }
        ]);
    }
    
    rebuildOrthogonality3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 角度弧度制转换
        const rad = this.sliderVal * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        // 矩阵 Q = [[cos, -sin, 0], [sin, cos, 0], [0, 0, 1]] (正交旋转)
        const matQ = [
            cos, -sin, 0.0,
            sin, cos, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 左边绘制未发生任何变化的原始正交网格 (I 矩阵)
        this.drawDeformedSpace(dual.left.scene, [1,0,0, 0,1,0, 0,0,1], this.leftObjects);
        
        // 右边绘制经过正交旋转 Q 后的扭曲空间
        this.drawDeformedSpace(dual.right.scene, matQ, this.rightObjects);
        
        // 更新公式
        const latex = `
        Q = \\begin{pmatrix} 
        \\cos\\theta & -\\sin\\theta & 0 \\\\ 
        \\sin\\theta & \\cos\\theta & 0 \\\\ 
        0 & 0 & 1 
        \\end{pmatrix} =
        \\begin{pmatrix} 
        ${cos.toFixed(2)} & ${(-sin).toFixed(2)} & 0 \\\\ 
        ${sin.toFixed(2)} & ${cos.toFixed(2)} & 0 \\\\ 
        0 & 0 & 1 
        \\end{pmatrix}
        \\\\
        \\text{计算正交积：} Q^T Q = \\begin{pmatrix} 1&0&0 \\\\ 0&1&0 \\\\ 0&0&1 \\end{pmatrix} = I
        \\\\
        \\text{右网格完美保持 90° 直角与 1.0 边长 [空间无损刚性旋转]}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "I", themeColor: "blue", title: "原始正方网格 (左)", desc: "标准笛卡尔坐标空间网格。" },
            { symbol: "Q", themeColor: "pink", title: "正交旋转网格 (右)", desc: "空间被旋转了一个角度，但网格仍维持完美 90° 直角，不产生任何拉伸剪切。" }
        ]);
    }
    
    // ==========================================
    // 渲染工具方法
    // ==========================================
    
    drawDeformedSpace(scene, mat, objectList) {
        const origin = new THREE.Vector3(0,0,0);
        const transE1 = MathUtils.matMulVec(mat, [1.5, 0, 0]);
        const transE2 = MathUtils.matMulVec(mat, [0, 1.5, 0]);
        const transE3 = MathUtils.matMulVec(mat, [0, 0, 1.5]);
        
        const a1 = this.createVector3D(origin, transE1, this.colors.v1);
        const a2 = this.createVector3D(origin, transE2, this.colors.v2);
        const a3 = this.createVector3D(origin, transE3, this.colors.v3);
        
        scene.add(a1); scene.add(a2); scene.add(a3);
        objectList.push(a1, a2, a3);
        
        const size = 3;
        const steps = 6;
        const gridGeom = new THREE.BufferGeometry();
        const points = [];
        
        for (let y = -size; y <= size; y += size/steps) {
            for (let z = -size; z <= size; z += size/steps) {
                const pStart = MathUtils.matMulVec(mat, [-size, y, z]);
                const pEnd = MathUtils.matMulVec(mat, [size, y, z]);
                points.push(new THREE.Vector3(...pStart), new THREE.Vector3(...pEnd));
            }
        }
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
    
    drawDeformedSpaceWithRankPlane(scene, mat, objectList, skewVal) {
        // 绘制向量
        this.drawDeformedSpace(scene, mat, objectList);
        
        // 绘制被拍扁的值域 2D 面薄膜
        const geometry = new THREE.PlaneGeometry(7, 7);
        // 根据剪切算出面的法向量
        const n = new THREE.Vector3(0, 0, 1);
        if (Math.abs(skewVal) > 0.01) {
            // 剪切面法向量
            n.set(-skewVal, 1.0, 0.0).normalize().cross(new THREE.Vector3(1,0,0)).normalize();
        }
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), n);
        
        const material = new THREE.MeshPhongMaterial({
            color: this.colors.spanPlane,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.applyQuaternion(quaternion);
        scene.add(mesh);
        objectList.push(mesh);
        
        // 边缘框
        const edgeGeom = new THREE.EdgesGeometry(geometry);
        const edge = new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
            color: this.colors.spanPlane, linewidth: 2, transparent: true, opacity: 0.6
        }));
        edge.applyQuaternion(quaternion);
        scene.add(edge);
        objectList.push(edge);
    }
    
    drawQuadraticSurface(scene, a, b, c, objectList, colorHex) {
        const gridSegments = 30;
        const width = 5.0;
        const geometry = new THREE.PlaneGeometry(width, width, gridSegments, gridSegments);
        
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            // 高度函数 z = ax^2 + 2bxy + cy^2
            const z = a * x * x + 2 * b * x * y + c * y * y;
            position.setZ(i, z * 0.4);
        }
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            shininess: 85,
            specular: 0xffffff
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        objectList.push(mesh);
        
        // 线框
        const wireframeGeom = new THREE.WireframeGeometry(geometry);
        const wireframe = new THREE.LineSegments(wireframeGeom, new THREE.LineBasicMaterial({
            color: colorHex, transparent: true, opacity: 0.2
        }));
        wireframe.rotation.x = -Math.PI / 2;
        scene.add(wireframe);
        objectList.push(wireframe);
        
        // 添加特征主轴线
        const eigen = MathUtils.solveEigen2(a, b, b, c);
        const ev1 = eigen.eigVecs[0];
        const ev2 = eigen.eigVecs[1];
        
        const drawAxis = (ev, axisColor) => {
            const points = [];
            const halfW = 2.5;
            for (let i = -20; i <= 20; i++) {
                const t = (i / 20) * halfW;
                const px = ev[0] * t;
                const py = ev[1] * t;
                const pz = a*px*px + 2*b*px*py + c*py*py;
                points.push(new THREE.Vector3(px, pz * 0.4 + 0.02, -py));
            }
            const axisGeom = new THREE.BufferGeometry().setFromPoints(points);
            const axisLine = new THREE.Line(axisGeom, new THREE.LineBasicMaterial({
                color: axisColor, linewidth: 3
            }));
            scene.add(axisLine);
            objectList.push(axisLine);
        };
        
        drawAxis(ev1, 0x3b82f6);
        drawAxis(ev2, 0xf43f5e);
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
        const sceneLeft = this.app.dualThree.left.scene;
        const sceneRight = this.app.dualThree.right.scene;
        
        const cleanup = (scene, list) => {
            if (scene) {
                list.forEach(obj => {
                    scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) obj.material.dispose();
                });
            }
        };
        cleanup(sceneLeft, this.leftObjects);
        this.leftObjects = [];
        cleanup(sceneRight, this.rightObjects);
        this.rightObjects = [];
    }
    
    destroy() {
        this.clearDualObjects();
    }
    
    update() {
        // 轻微旋转
        const time = Date.now() * 0.00015;
        const rotateObj = (list) => {
            list.forEach(obj => {
                if (obj.isMesh && obj.geometry.type === 'PlaneGeometry') {
                    obj.rotation.z = time;
                }
                if (obj.isLine && obj.geometry.type === 'WireframeGeometry') {
                    obj.rotation.z = time;
                }
                if (obj.isLine && obj.geometry.type === 'BufferGeometry' && obj.material.linewidth === 3) {
                    obj.rotation.y = time; // 旋转特征主轴
                }
            });
        };
        if (this.currentTab === "congruence") {
            rotateObj(this.leftObjects);
            rotateObj(this.rightObjects);
        }
    }
}
