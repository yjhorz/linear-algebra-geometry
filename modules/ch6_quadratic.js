import { MathUtils } from '../math-utils.js';

/**
 * 第六章：二次型与正定性 (Ch6 Quadratic Forms Module)
 */
export class Chapter6Quadratic {
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 核心系数
        this.a = 0.8;
        this.b = 0.0; // 交叉项
        this.c = 0.8;
        
        // 剪切因子
        this.shearK = 0.0;
        
        // 3D 渲染物体引用
        this.objects = [];
        this.leftObjects = [];
        this.rightObjects = [];
        
        this.colors = {
            positive: 0x10b981,     // 绿 (正定)
            negative: 0xf43f5e,     // 红 (负定)
            indefinite: 0xf59e0b,   // 金 (不定)
            semidefinite: 0x06b6d4, // 蓝 (半正定)
            axis1: 0x3b82f6,        // 蓝色主轴
            axis2: 0xf43f5e         // 粉色主轴
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        
        if (tabId === "quadratic_types") {
            this.app.setRenderMode('3d_single');
            this.initTypesView();
        } else if (tabId === "std_norm") {
            this.app.setRenderMode('3d_dual'); // 标准化与规范化对比
            this.initStdNormView();
        } else if (tabId === "inertia_theorem") {
            this.app.setRenderMode('3d_dual'); // 合同与惯性定理
            this.initInertiaView();
        }
    }
    
    // ==========================================
    // 1. 二次曲面与正定判定 (Sylvester)
    // ==========================================
    initTypesView() {
        this.app.setPanelInfo(
            "二次曲面与正定性判定",
            "实对称矩阵 A 定义的二次型 xᵀAx 在 3D 空间对应一张二次曲面 z = ax² + 2bxy + cy²。曲面的开口弯曲拓扑对应着正定、负定和不定等代数性质。",
            `
            <p><strong>1. 二次曲面四大拓扑形状：</strong></p>
            <ul>
                <li><strong>正定碗 (Positive Definite)：</strong> 特征值均为正，顺序主子式全大于0。曲面呈<strong>向上开口的“大圆碗”</strong>。</li>
                <li><strong>负定倒扣碗 (Negative Definite)：</strong> 特征值均为负。曲面呈<strong>向下倒扣的碗</strong>。</li>
                <li><strong>不定马鞍面 (Indefinite)：</strong> 特征值一正一负。曲面呈<strong>“马鞍面（鞍点）”</strong>。</li>
                <li><strong>半正定槽谷 (Semi-definite)：</strong> 有一个特征值为 0。曲面呈<strong>平坦的长槽谷</strong>。</li>
            </ul>
            `
        );
        
        this.a = 0.8; this.b = 0.0; this.c = 0.8;
        this.rebuildTypes3D();
        
        // 绑定滑块
        this.app.buildSliders([
            { id: 'qa', label: 'X轴开口系数 a', min: -1.5, max: 1.5, step: 0.1, value: this.a, color: '#3b82f6', onChange: (val) => { this.a = val; this.rebuildTypes3D(); } },
            { id: 'qb', label: '旋转项系数 b (倾斜主轴)', min: -1.5, max: 1.5, step: 0.1, value: this.b, color: '#f43f5e', onChange: (val) => { this.b = val; this.rebuildTypes3D(); } },
            { id: 'qc', label: 'Y轴开口系数 c', min: -1.5, max: 1.5, step: 0.1, value: this.c, color: '#f59e0b', onChange: (val) => { this.c = val; this.rebuildTypes3D(); } }
        ]);
    }
    
    rebuildTypes3D() {
        const scene = this.app.three.scene;
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        
        // 基础底格
        const baseGrid = new THREE.GridHelper(12, 12, 0x475569, 0x1e293b);
        baseGrid.position.y = -2.5;
        scene.add(baseGrid);
        this.objects.push(baseGrid);
        
        // 代数计算
        const d1 = this.a;
        const d2 = this.a * this.c - this.b * this.b;
        const eigen = MathUtils.solveEigen2(this.a, this.b, this.b, this.c);
        const l1 = eigen.eigVals[0];
        const l2 = eigen.eigVals[1];
        
        // 拓扑判定
        let shapeColor = this.colors.indefinite;
        let shapeName = "双曲马鞍面 (不定)";
        let shapeType = "indefinite";
        
        if (Math.abs(d2) < 0.05) {
            shapeColor = this.colors.semidefinite;
            shapeName = "抛物槽谷面 (半正定/半负定)";
            shapeType = "semidefinite";
        } else if (d2 > 0) {
            if (d1 > 0) {
                shapeColor = this.colors.positive;
                shapeName = "朝上椭圆抛物面 (正定)";
                shapeType = "positive";
            } else {
                shapeColor = this.colors.negative;
                shapeName = "倒扣椭圆抛物面 (负定)";
                shapeType = "negative";
            }
        }
        
        // 绘制曲面
        this.drawQuadraticSurface(scene, this.a, this.b, this.c, this.objects, shapeColor);
        
        // 公式
        const latex = `
        A = \\begin{pmatrix} ${this.a.toFixed(1)} & ${this.b.toFixed(1)} \\\\ ${this.b.toFixed(1)} & ${this.c.toFixed(1)} \\end{pmatrix}, \\quad
        f(x, y) = ${this.a.toFixed(1)}x^2 + ${(2*this.b).toFixed(1)}xy + ${this.c.toFixed(1)}y^2
        \\\\
        \\text{子式：} D_1 = ${d1.toFixed(1)}, \\, D_2 = ${d2.toFixed(2)} \\, \\rightarrow \\, \\text{曲面类型：} \\text{${shapeName}}
        \\\\
        \\text{求得特征值：} \\lambda_1 = ${l1.toFixed(2)}, \\quad \\lambda_2 = ${l2.toFixed(2)}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "z", themeColor: shapeType === 'positive' ? 'green' : (shapeType === 'negative' ? 'red' : (shapeType === 'semidefinite' ? 'teal' : 'gold')), title: shapeName, desc: `曲面状态。顺序主子式全正代表正定大圆碗。` },
            { symbol: "v₁", themeColor: "blue", title: "第一主弯曲对称轴", desc: `对应特征值 λ₁ = ${l1.toFixed(2)}。` },
            { symbol: "v₂", themeColor: "pink", title: "第二主弯曲对称轴", desc: `对应特征值 λ₂ = ${l2.toFixed(2)}。` }
        ]);
    }

    // ==========================================
    // 2. 标准化与规范化 (椭圆碗 vs 正圆标准碗)
    // ==========================================
    initStdNormView() {
        this.app.setPanelInfo(
            "二次型的标准化与规范化",
            "标准化是旋转曲面消除交叉项；规范化则是进一步拉伸坐标轴，把任意扁平的椭圆抛物碗拉伸规范为一个完美的正圆标准抛物面。",
            `
            <p><strong>标准化（左） vs 规范化（右）：</strong></p>
            <ul>
                <li><strong>左侧（标准型）：</strong> $z = 1.6 x^2 + 0.4 y^2$。已消去交叉项，主轴已扶正，但由于两个特征值不等，**截面是一个拉长的椭圆（椭圆抛物面碗）**。</li>
                <li><strong>右侧（规范型）：</strong> $z = 1.0 x^2 + 1.0 y^2$。不仅扶正，且通过坐标轴的拉伸，将所有正系数规范为了 1，**椭圆碗完美收缩规范为正圆形圆抛物碗**！</li>
            </ul>
            `
        );
        
        this.rebuildStdNorm3D();
        this.app.buildSliders([]); // 纯静态直观对比标准化与规范化
    }
    
    rebuildStdNorm3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 左边：标准化 A (椭圆碗：a=1.5, b=0, c=0.4)
        this.drawQuadraticSurface(dual.left.scene, 1.5, 0.0, 0.4, this.leftObjects, this.colors.positive);
        
        // 右边：规范化 B (正圆碗：a=1.0, b=0, c=1.0)
        this.drawQuadraticSurface(dual.right.scene, 1.0, 0.0, 1.0, this.rightObjects, this.colors.positive);
        
        const latex = `
        \\text{左侧标准化 } f = 1.5 y_1^2 + 0.4 y_2^2 \\quad [\\text{系数为特征值，截面是椭圆碗}]
        \\\\
        \\text{右侧规范化 } f = 1.0 z_1^2 + 1.0 z_2^2 \\quad [\\text{系数缩放为 1，截面被拉伸规整为正圆碗}]
        \\\\
        \\text{代数真谛：规范型完全由正负特征值数量 (惯性指数) 唯一确定}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "Std", themeColor: "green", title: "标准型椭圆碗 (左)", desc: "消除交叉项，主轴对齐坐标轴。截面是椭圆形。" },
            { symbol: "Norm", themeColor: "teal", title: "规范型正圆碗 (右)", desc: "对对角轴进行了伸缩收平，使得椭圆变成了完美标准正圆。" }
        ]);
    }

    // ==========================================
    // 3. 合同变换与惯性定理
    // ==========================================
    initInertiaView() {
        this.app.setPanelInfo(
            "合同变换与惯性定理不变性",
            "实对称矩阵合同 B = CᵀAC。几何上代表对其底面坐标网络进行平滑剪切拉伸，这虽然会扭曲曲面的倾斜度，但绝对无法将向上弯曲的轴扭成向下弯曲，即惯性拓扑类型守恒不变。",
            `
            <p><strong>合同剪切与惯性定理：</strong></p>
            <p>拖动下方滑块改变剪切系数 $k$。右侧曲面将随坐标系的剪切发生严重的倾斜拉伸，**但无论怎么歪斜，它依然是那个向上开口的碗，正负特征值的符号（惯性指数）绝对不发生任何突变**！</p>
            `
        );
        
        this.shearK = 0.5;
        this.rebuildInertia3D();
        
        this.app.buildSliders([
            { id: 'in_shear', label: '合同剪切变形因子 k (C 矩阵)', min: -1.2, max: 1.2, step: 0.1, value: this.shearK, color: '#8b5cf6', onChange: (val) => { this.shearK = val; this.rebuildInertia3D(); } }
        ]);
    }
    
    rebuildInertia3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 原始二次型 A = [[0.8, 0], [0, 0.8]] (正正)
        const a_a = 0.8, a_b = 0.0, a_c = 0.8;
        
        // 合同 B = C^T * A * C
        const b_a = a_a;
        const b_b = a_a * this.shearK;
        const b_c = a_a * this.shearK * this.shearK + a_c;
        
        // 绘制左侧原对称正正圆碗
        this.drawQuadraticSurface(dual.left.scene, a_a, a_b, a_c, this.leftObjects, this.colors.positive);
        
        // 绘制右侧经 C 剪切合同后的扭翘偏斜碗
        this.drawQuadraticSurface(dual.right.scene, b_a, b_b, b_c, this.rightObjects, this.colors.positive);
        
        const latex = `
        A = \\begin{pmatrix} 0.8 & 0 \\\\ 0 & 0.8 \\end{pmatrix}, \\quad
        B = C^T A C = \\begin{pmatrix} 0.8 & ${(0.8*this.shearK).toFixed(2)} \\\\ ${(0.8*this.shearK).toFixed(2)} & ${(0.8*this.shearK*this.shearK+0.8).toFixed(2)} \\end{pmatrix}
        \\\\
        \\text{虽然 B 的特征值变了，但其符号全正 [正定] 绝对不变！}
        \\\\
        \\text{正负惯性指数守恒：} (p, q) = (2, 0) \\, \\rightarrow \\, \\text{曲面拓扑碗状不变 [惯性定理]}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "green", title: "标准曲面碗 (左)", desc: "特征值为常数正值，向上正圆开口。" },
            { symbol: "CᵀAC", themeColor: "purple", title: "合同偏斜碗 (右)", desc: `底面网格发生了剪切变形，碗被拉扯倾斜，但开口朝上的饭碗形状拓扑完全保留守恒。` }
        ]);
    }
    
    // ==========================================
    // 渲染工具
    // ==========================================
    drawQuadraticSurface(scene, a, b, c, objectList, colorHex) {
        const gridSegments = 30;
        const width = 5.0;
        const geometry = new THREE.PlaneGeometry(width, width, gridSegments, gridSegments);
        
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = a * x * x + 2 * b * x * y + c * y * y;
            position.setZ(i, z * 0.4);
        }
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
            color: colorHex, transparent: true, opacity: 0.72, side: THREE.DoubleSide, shininess: 85, specular: 0xffffff
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        objectList.push(mesh);
        
        const wireframeGeom = new THREE.WireframeGeometry(geometry);
        const wireframe = new THREE.LineSegments(wireframeGeom, new THREE.LineBasicMaterial({
            color: colorHex, transparent: true, opacity: 0.2
        }));
        wireframe.rotation.x = -Math.PI / 2;
        scene.add(wireframe);
        objectList.push(wireframe);
        
        // 特征主轴
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
            const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
                color: axisColor, linewidth: 3
            }));
            scene.add(axisLine);
            objectList.push(axisLine);
        };
        
        drawAxis(ev1, 0x3b82f6);
        drawAxis(ev2, 0xf43f5e);
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
    
    update() {
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
                    obj.rotation.y = time; // 旋转主轴
                }
            });
        };
        
        if (this.currentTab === "quadratic_types") {
            rotateObj(this.objects);
        } else {
            rotateObj(this.leftObjects);
            rotateObj(this.rightObjects);
        }
    }
}
