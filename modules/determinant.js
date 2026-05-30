import { MathUtils } from '../math-utils.js';

/**
 * 模块一：行列式的几何意义 (体积与面积坍缩)
 */
export class DeterminantModule {
    constructor(appContext) {
        this.app = appContext;
        
        // 核心向量定义
        this.v1 = [3, 0, 0];
        this.v2 = [1, 2.5, 0];
        this.v3 = [0, 1, 2.5];
        
        // Three.js 物体句柄
        this.arrows = [];
        this.volumeMesh = null;
        this.volumeEdges = null;
        this.gridHelper = null;
        
        // UI颜色设定
        this.colors = {
            v1: 0x3b82f6, // 蓝色
            v2: 0xf43f5e, // 粉色
            v3: 0xf59e0b, // 金色
            volume: 0x14b8a6 // 青色
        };
    }
    
    // 初始化模块
    init() {
        // 1. 设置侧边面板信息
        this.app.setPanelInfo(
            "行列式的几何意义",
            "考研线性代数第一章的核心概念。二阶行列式代表两个向量张成的平行四边形的「面积」；三阶行列式代表三个向量张成的平行六面体的「体积」。当向量组线性相关时，空间会发生「维度坍缩」，体积归零，对应行列式 |A| = 0。",
            `
            <p><strong>1. 行列式的体积本质：</strong></p>
            <p>考研经常考查“行列式为0的充要条件”，几何上这直接对应于<strong>向量组线性相关（共面或共线）</strong>，使得围成的平行六面体高度降为0，体积塌缩。</p>
            <p><strong>2. 行列式的性质在几何上的体现：</strong></p>
            <ul>
                <li><strong>两列互换，行列式变号：</strong> 互换两根轴，围成的六面体体积大小不变，但按右手定则判定的<strong>空间定向（手性）发生反转</strong>，由正变负。</li>
                <li><strong>某列乘 k 倍，行列式乘 k 倍：</strong> 对应六面体的某一条棱拉伸 k 倍，其体积自然相应扩大 k 倍。</li>
                <li><strong>两列相同，行列式为0：</strong> 两条棱重合，六面体降维塌缩，体积必然为0。</li>
            </ul>
            `
        );
        
        // 2. 绘制 3D 辅助坐标网格
        this.gridHelper = new THREE.GridHelper(16, 16, 0x475569, 0x1e293b);
        this.gridHelper.position.y = -0.01; // 微调，避免与平面闪烁
        this.app.three.scene.add(this.gridHelper);
        
        // 3. 构建 3D 模型
        this.rebuildVisualization();
        
        // 4. 绑定交互滑块
        this.app.buildSliders([
            { id: 'v1x', label: '向量 α₁ (x 轴偏向)', min: 0.1, max: 4, step: 0.1, value: this.v1[0], color: '#3b82f6', onChange: (val) => { this.v1[0] = val; this.rebuildVisualization(); } },
            { id: 'v2x', label: '向量 α₂ (x 分量)', min: -3, max: 3, step: 0.1, value: this.v2[0], color: '#f43f5e', onChange: (val) => { this.v2[0] = val; this.rebuildVisualization(); } },
            { id: 'v2y', label: '向量 α₂ (y 分量 - 宽度)', min: 0.1, max: 4, step: 0.1, value: this.v2[1], color: '#f43f5e', onChange: (val) => { this.v2[1] = val; this.rebuildVisualization(); } },
            { id: 'v3x', label: '向量 α₃ (x 分量)', min: -3, max: 3, step: 0.1, value: this.v3[0], color: '#f59e0b', onChange: (val) => { this.v3[0] = val; this.rebuildVisualization(); } },
            { id: 'v3y', label: '向量 α₃ (y 分量)', min: -3, max: 3, step: 0.1, value: this.v3[1], color: '#f59e0b', onChange: (val) => { this.v3[1] = val; this.rebuildVisualization(); } },
            { id: 'v3z', label: '向量 α₃ (z 分量 - 高度)', min: 0.0, max: 4, step: 0.1, value: this.v3[2], color: '#f59e0b', onChange: (val) => { this.v3[2] = val; this.rebuildVisualization(); } }
        ]);
        
        // 5. 绑定代数与几何映射图例
        this.updateLegend();
    }
    
    // 渲染数学公式与高亮映射
    updateFormula(det) {
        const latex = `
        A = (\\vec{\\alpha}_1, \\vec{\\alpha}_2, \\vec{\\alpha}_3) = 
        \\begin{pmatrix} 
        ${this.v1[0].toFixed(1)} & ${this.v2[0].toFixed(1)} & ${this.v3[0].toFixed(1)} \\\\
        ${this.v1[1].toFixed(1)} & ${this.v2[1].toFixed(1)} & ${this.v3[1].toFixed(1)} \\\\
        ${this.v1[2].toFixed(1)} & ${this.v2[2].toFixed(1)} & ${this.v3[2].toFixed(1)}
        \\end{pmatrix} 
        \\\\
        \\text{行列式 } |A| = \\text{体积 } V = ${det.toFixed(2)}
        `;
        
        this.app.renderMath('math-formula', latex);
    }
    
    updateLegend() {
        const detVal = this.getDetValue();
        const isCollapsed = Math.abs(detVal) < 0.05;
        
        this.app.buildLegend([
            {
                symbol: "α₁",
                themeColor: "blue",
                title: "列向量 α₁",
                desc: `底面第一棱边向量，当前坐标：(${this.v1[0].toFixed(1)}, ${this.v1[1].toFixed(1)}, ${this.v1[2].toFixed(1)})`,
                onHoverIn: () => this.highlightArrow(0),
                onHoverOut: () => this.resetArrowColor(0)
            },
            {
                symbol: "α₂",
                themeColor: "pink",
                title: "列向量 α₂",
                desc: `底面第二棱边向量，当前坐标：(${this.v2[0].toFixed(1)}, ${this.v2[1].toFixed(1)}, ${this.v2[2].toFixed(1)})`,
                onHoverIn: () => this.highlightArrow(1),
                onHoverOut: () => this.resetArrowColor(1)
            },
            {
                symbol: "α₃",
                themeColor: "gold",
                title: "列向量 α₃",
                desc: `第三棱边向量（决定高度），当前坐标：(${this.v3[0].toFixed(1)}, ${this.v3[1].toFixed(1)}, ${this.v3[2].toFixed(1)})`,
                onHoverIn: () => this.highlightArrow(2),
                onHoverOut: () => this.resetArrowColor(2)
            },
            {
                symbol: "det",
                themeColor: isCollapsed ? "red" : "teal",
                title: isCollapsed ? "体积坍缩 (det = 0)" : "六面体体积 |A|",
                desc: isCollapsed 
                    ? `<span style="color:var(--color-red); font-weight:700;">向量 α₃ 落入 α₁ 与 α₂ 张成的平面！六面体高度降为0，体积归零，向量组线性相关！</span>` 
                    : `由三向量围成的平行六面体体积大小，当前值：${detVal.toFixed(2)}。`,
                onHoverIn: () => this.highlightVolume(),
                onHoverOut: () => this.resetVolumeColor()
            }
        ]);
    }
    
    getDetValue() {
        const matrix = [
            this.v1[0], this.v2[0], this.v3[0],
            this.v1[1], this.v2[1], this.v3[1],
            this.v1[2], this.v2[2], this.v3[2]
        ];
        return MathUtils.det3(matrix);
    }
    
    // 重建3D可视化元素
    rebuildVisualization() {
        const scene = this.app.three.scene;
        
        // 1. 清理已有的向量和六面体
        this.arrows.forEach(arrow => scene.remove(arrow));
        this.arrows = [];
        
        if (this.volumeMesh) {
            scene.remove(this.volumeMesh);
            this.volumeMesh.geometry.dispose();
            this.volumeMesh.material.dispose();
        }
        if (this.volumeEdges) {
            scene.remove(this.volumeEdges);
            this.volumeEdges.geometry.dispose();
            this.volumeEdges.material.dispose();
        }
        
        // 2. 绘制三根向量箭头 (高品质带有圆锥头的3D箭头)
        const origin = new THREE.Vector3(0, 0, 0);
        
        const arrowV1 = this.createVector3D(origin, this.v1, this.colors.v1);
        const arrowV2 = this.createVector3D(origin, this.v2, this.colors.v2);
        const arrowV3 = this.createVector3D(origin, this.v3, this.colors.v3);
        
        scene.add(arrowV1);
        scene.add(arrowV2);
        scene.add(arrowV3);
        
        this.arrows.push(arrowV1, arrowV2, arrowV3);
        
        // 3. 构建平行六面体网格几何体 (Parallelepiped)
        const detVal = this.getDetValue();
        this.buildParallelepipedMesh(detVal);
        
        // 4. 更新公式和图例内容
        this.updateFormula(detVal);
        this.updateLegend();
    }
    
    // 辅助方法：生成3D向量箭头
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = dir.length();
        const normDir = dir.clone().normalize();
        
        // 使用 Three.js 自带的 ArrowHelper，设置合理的头宽与轴粗
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.6, 0.25);
        
        // 调整线段粗度（通过在Arrow的Line上应用Scale）
        arrow.line.material.linewidth = 4; 
        return arrow;
    }
    
    // 构建平行六面体网格
    buildParallelepipedMesh(det) {
        const scene = this.app.three.scene;
        
        // 计算平行六面体的8个顶点
        const p = [
            new THREE.Vector3(0, 0, 0), // 0
            new THREE.Vector3(this.v1[0], this.v1[1], this.v1[2]), // 1 (v1)
            new THREE.Vector3(this.v2[0], this.v2[1], this.v2[2]), // 2 (v2)
            new THREE.Vector3(this.v3[0], this.v3[1], this.v3[2]), // 3 (v3)
            new THREE.Vector3(this.v1[0] + this.v2[0], this.v1[1] + this.v2[1], this.v1[2] + this.v2[2]), // 4 (v1+v2)
            new THREE.Vector3(this.v1[0] + this.v3[0], this.v1[1] + this.v3[1], this.v1[2] + this.v3[2]), // 5 (v1+v3)
            new THREE.Vector3(this.v2[0] + this.v3[0], this.v2[1] + this.v3[1], this.v2[2] + this.v3[2]), // 6 (v2+v3)
            new THREE.Vector3(this.v1[0] + this.v2[0] + this.v3[0], this.v1[1] + this.v2[1] + this.v3[2], this.v1[2] + this.v2[2] + this.v3[2]) // 7 (v1+v2+v3)
        ];
        
        // 建立六面几何体（使用6个四边形面，拆为12个三角形）
        const geometry = new THREE.BufferGeometry();
        
        // 顶点索引
        const indices = [
            // 底面 (0-1-4-2)
            0, 2, 1,   1, 2, 4,
            // 顶面 (3-5-7-6)
            3, 5, 6,   6, 5, 7,
            // 前面 (0-1-5-3)
            0, 1, 3,   3, 1, 5,
            // 后面 (2-4-7-6)
            2, 6, 4,   4, 6, 7,
            // 左侧面 (0-2-6-3)
            0, 3, 2,   2, 3, 6,
            // 右侧面 (1-4-7-5)
            1, 4, 5,   5, 4, 7
        ];
        
        const vertices = [];
        indices.forEach(idx => {
            vertices.push(p[idx].x, p[idx].y, p[idx].z);
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals(); // 自动计算法向量以获得平滑的光照
        
        // 选择色彩（如果坍缩，则变成警示红色，否则为健康的青色）
        const isCollapsed = Math.abs(det) < 0.05;
        const volumeColor = isCollapsed ? 0xef4444 : this.colors.volume;
        
        // 创建半透明玻璃材质
        const material = new THREE.MeshPhongMaterial({
            color: volumeColor,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            shininess: 90,
            specular: 0xffffff
        });
        
        this.volumeMesh = new THREE.Mesh(geometry, material);
        this.volumeMesh.castShadow = true;
        this.volumeMesh.receiveShadow = true;
        scene.add(this.volumeMesh);
        
        // 绘制边缘铁丝框 (Wireframe outline) 增强立体感
        const edgeGeometry = new THREE.BufferGeometry();
        // 12条边
        const linePairs = [
            p[0], p[1],  p[0], p[2],  p[1], p[4],  p[2], p[4], // 底面4边
            p[3], p[5],  p[3], p[6],  p[5], p[7],  p[6], p[7], // 顶面4边
            p[0], p[3],  p[1], p[5],  p[2], p[6],  p[4], p[7]  // 垂直4边
        ];
        
        const edgeVertices = [];
        linePairs.forEach(v => {
            edgeVertices.push(v.x, v.y, v.z);
        });
        
        edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeVertices, 3));
        
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: isCollapsed ? 0xef4444 : 0x14b8a6,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        
        this.volumeEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        scene.add(this.volumeEdges);
    }
    
    // ==========================================
    // 悬停交互高亮控制
    // ==========================================
    
    highlightArrow(index) {
        if (this.arrows[index]) {
            // 将指定箭头的颜色改为亮白色
            this.arrows[index].setColor(new THREE.Color(0xffffff));
        }
    }
    
    resetArrowColor(index) {
        if (this.arrows[index]) {
            const keys = ['v1', 'v2', 'v3'];
            this.arrows[index].setColor(new THREE.Color(this.colors[keys[index]]));
        }
    }
    
    highlightVolume() {
        if (this.volumeMesh) {
            // 使平行六面体高亮闪烁发光
            this.volumeMesh.material.opacity = 0.75;
            this.volumeMesh.material.emissive.setHex(0x14b8a6);
        }
    }
    
    resetVolumeColor() {
        if (this.volumeMesh) {
            this.volumeMesh.material.opacity = 0.35;
            this.volumeMesh.material.emissive.setHex(0x000000);
        }
    }
    
    // 销毁模块资源
    destroy() {
        const scene = this.app.three.scene;
        if (this.gridHelper) {
            scene.remove(this.gridHelper);
            this.gridHelper = null;
        }
        this.arrows.forEach(arrow => scene.remove(arrow));
        this.arrows = [];
        if (this.volumeMesh) {
            scene.remove(this.volumeMesh);
            this.volumeMesh = null;
        }
        if (this.volumeEdges) {
            scene.remove(this.volumeEdges);
            this.volumeEdges = null;
        }
    }
    
    // 每帧更新逻辑 (如果需要自转或波动等微动画，可在此编写)
    update() {
        // 让六面体表面反射产生极细微的金属折射波动，提升高端质感
        if (this.volumeMesh && Math.abs(this.getDetValue()) > 0.05) {
            const time = Date.now() * 0.001;
            // 产生极其微弱的自转，模拟展示台效果
            // this.volumeMesh.rotation.y = time * 0.05;
        }
    }
}
