import { MathUtils } from '../math-utils.js';

/**
 * 模块四：向量组的线性相关性与秩 (张成空间与极大无关组)
 */
export class VectorModule {
    constructor(appContext) {
        this.app = appContext;
        
        // 核心向量定义
        this.v1 = [3.0, 0.0, 0.0];
        this.v2 = [0.0, 3.0, 0.0];
        this.v3 = [2.0, 2.0, 1.5]; // 默认三维无关，第三分量不为0
        
        // Three.js 物体引用
        this.arrows = [];
        this.spanPlane = null;
        this.spanPlaneEdge = null;
        this.spanLine = null;
        this.projLines = []; // 投影辅助虚线
        this.gridHelper = null;
        
        // UI 色彩令牌
        this.colors = {
            v1: 0x3b82f6, // 蓝色
            v2: 0xf43f5e, // 粉色
            v3: 0xf59e0b, // 金色
            spanPlane: 0x10b981, // 绿色面
            spanLine: 0x8b5cf6 // 紫色线
        };
    }
    
    init() {
        this.app.setPanelInfo(
            "向量组线性相关性与秩",
            "一组向量的「张成空间」代表它们通过线性组合能平铺覆盖的几何物理空间。如果增加一个新向量未能拓宽张成空间的维度，则该向量组「线性相关」（多余降维）；极大线性无关组是撑起该空间的最简骨架，向量组的「秩」即代表该空间的几何维度。",
            `
            <p><strong>1. 线性无关 vs 相关（几何视点）：</strong></p>
            <ul>
                <li><strong>线性无关：</strong> 三个向量不在同一个平面上，撑起一个充满活力的 3D 平行六面体。</li>
                <li><strong>线性相关：</strong> 三个向量共面（或者共线），第三个向量只相当于前两个向量的影子组合，空间被瞬间“降维”。</li>
            </ul>
            <p><strong>2. 极大线性无关组：</strong></p>
            <p>即使我们有一百个向量，只要它们共面，它们之中能挑出撑起这个平面的<strong>最大且最简的非共线骨架（最多2个非共线向量）</strong>，就是极大线性无关组。</p>
            <p><strong>3. 秩 (Rank) 的几何真谛：</strong></p>
            <p>代数里深奥的“矩阵的秩”，几何上极其质朴：<strong>它就是张成空间的物理几何维度值</strong>（1D线 $\\rightarrow$ 秩1，2D面 $\\rightarrow$ 秩2，3D体 $\\rightarrow$ 秩3）。</p>
            `
        );
        
        // 2. 绘制 3D 基础网格
        this.gridHelper = new THREE.GridHelper(16, 16, 0x475569, 0x1e293b);
        this.gridHelper.position.y = -0.01;
        this.app.three.scene.add(this.gridHelper);
        
        // 3. 构建 3D 可视化
        this.rebuildVisualization();
        
        // 4. 绑定滑块控制器 (用户调节 α3 向量坐标，强力感受相关性突变)
        this.app.buildSliders([
            { id: 'v3x', label: '向量 α₃ 横坐标 (x 分量)', min: -3.0, max: 3.0, step: 0.1, value: this.v3[0], color: '#f59e0b', onChange: (val) => { this.v3[0] = val; this.rebuildVisualization(); } },
            { id: 'v3y', label: '向量 α₃ 纵坐标 (y 分量)', min: -3.0, max: 3.0, step: 0.1, value: this.v3[1], color: '#f59e0b', onChange: (val) => { this.v3[1] = val; this.rebuildVisualization(); } },
            { id: 'v3z', label: '向量 α₃ 竖向高度 (z 分量)', min: 0.0, max: 3.0, step: 0.1, value: this.v3[2], color: '#f59e0b', onChange: (val) => { this.v3[2] = val; this.rebuildVisualization(); } }
        ]);
        
        // 5. 快速预设按钮
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
            <div style="font-size: 12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">空间维度快速跃迁 (Presets)</div>
            <button id="pre-rank3" class="btn-primary" style="padding: 8px 12px; font-size:12px;">
                跃迁至 3D 空间 (秩 = 3，线性无关)
            </button>
            <button id="pre-rank2" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-green), #047857);">
                塌缩至 2D 平面 (秩 = 2，共面线性相关)
            </button>
            <button id="pre-rank1" class="btn-primary" style="padding: 8px 12px; font-size:12px; background: linear-gradient(135deg, var(--color-purple), #6d28d9);">
                退化为 1D 直线 (秩 = 1，共线线性相关)
            </button>
        `;
        container.appendChild(card);
        
        document.getElementById('pre-rank3').addEventListener('click', () => {
            this.v1 = [3.0, 0.0, 0.0];
            this.v2 = [0.0, 3.0, 0.0];
            this.v3 = [2.0, 2.0, 2.0];
            this.syncSlidersAndRebuild();
        });
        
        document.getElementById('pre-rank2').addEventListener('click', () => {
            this.v1 = [3.0, 0.0, 0.0];
            this.v2 = [0.0, 3.0, 0.0];
            this.v3 = [2.0, 2.0, 0.0]; // 高度设为0，共面于xy面
            this.syncSlidersAndRebuild();
        });
        
        document.getElementById('pre-rank1').addEventListener('click', () => {
            this.v1 = [3.0, 0.0, 0.0];
            this.v2 = [1.5, 0.0, 0.0]; // 共线于x轴
            this.v3 = [2.5, 0.0, 0.0]; // 共线于x轴
            this.syncSlidersAndRebuild();
        });
    }
    
    syncSlidersAndRebuild() {
        document.getElementById('input-v3x').value = this.v3[0];
        document.getElementById('val-v3x').innerText = this.v3[0].toFixed(1);
        
        document.getElementById('input-v3y').value = this.v3[1];
        document.getElementById('val-v3y').innerText = this.v3[1].toFixed(1);
        
        document.getElementById('input-v3z').value = this.v3[2];
        document.getElementById('val-v3z').innerText = this.v3[2].toFixed(1);
        
        this.rebuildVisualization();
    }
    
    // ==========================================
    // 计算并渲染
    // ==========================================
    rebuildVisualization() {
        const scene = this.app.three.scene;
        
        // 1. 清除旧元素
        this.arrows.forEach(arrow => scene.remove(arrow));
        this.arrows = [];
        this.projLines.forEach(line => scene.remove(line));
        this.projLines = [];
        
        if (this.spanPlane) { scene.remove(this.spanPlane); this.spanPlane.geometry.dispose(); this.spanPlane.material.dispose(); this.spanPlane = null; }
        if (this.spanPlaneEdge) { scene.remove(this.spanPlaneEdge); this.spanPlaneEdge.geometry.dispose(); this.spanPlaneEdge.material.dispose(); this.spanPlaneEdge = null; }
        if (this.spanLine) { scene.remove(this.spanLine); this.spanLine.geometry.dispose(); this.spanLine.material.dispose(); this.spanLine = null; }
        
        // 2. 绘制三向量箭头
        const origin = new THREE.Vector3(0, 0, 0);
        const arrow1 = this.createVector3D(origin, this.v1, this.colors.v1);
        const arrow2 = this.createVector3D(origin, this.v2, this.colors.v2);
        const arrow3 = this.createVector3D(origin, this.v3, this.colors.v3);
        
        scene.add(arrow1);
        scene.add(arrow2);
        scene.add(arrow3);
        this.arrows.push(arrow1, arrow2, arrow3);
        
        // 3. 计算秩和张成空间拓扑
        const rankInfo = this.calculateRankAndSpan();
        
        // 4. 绘制张成空间几何面/线
        if (rankInfo.rank === 1) {
            // 秩=1: 张成空间是一根直线
            const start = new THREE.Vector3(...this.v1).normalize().multiplyScalar(-10);
            const end = new THREE.Vector3(...this.v1).normalize().multiplyScalar(10);
            
            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({
                color: this.colors.spanLine,
                linewidth: 4
            });
            this.spanLine = new THREE.Line(geometry, material);
            scene.add(this.spanLine);
        } else if (rankInfo.rank === 2) {
            // 秩=2: 张成空间是一个 2D 平面片 (我们绘制一个 8x8 的薄膜面)
            // 取极大无关组的两个向量，求出它们的法向量以确定平面姿态
            const u1 = new THREE.Vector3(...rankInfo.basis[0]);
            const u2 = new THREE.Vector3(...rankInfo.basis[1]);
            
            const n = new THREE.Vector3().crossVectors(u1, u2).normalize();
            
            const geometry = new THREE.PlaneGeometry(8, 8);
            const defaultNormal = new THREE.Vector3(0, 0, 1);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, n);
            
            const material = new THREE.MeshPhongMaterial({
                color: this.colors.spanPlane,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                shininess: 60,
                depthWrite: false
            });
            
            this.spanPlane = new THREE.Mesh(geometry, material);
            this.spanPlane.applyQuaternion(quaternion);
            scene.add(this.spanPlane);
            
            // 平面边框
            const edgeGeometry = new THREE.EdgesGeometry(geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({
                color: this.colors.spanPlane,
                linewidth: 2,
                transparent: true,
                opacity: 0.7
            });
            this.spanPlaneEdge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
            this.spanPlaneEdge.applyQuaternion(quaternion);
            scene.add(this.spanPlaneEdge);
            
            // 绘制 α3 向 xy 面投影的辅助虚线（如果α3落在该平面上但不在标准xy上，这里我们画出α3到xy平面的竖直距离虚线）
            if (Math.abs(this.v3[2]) > 0.02) {
                // 如果 α3 没共面，画虚线
            } else {
                // 如果 α3 完全共面，画线性组合投影虚线
                this.drawLinearCombinationDashes();
            }
        } else {
            // 秩=3: 独立，张成整个3D空间。
            // 我们可以画一个极淡的半透明体积框，或者直接用高亮表示！
        }
        
        // 5. 更新数学公式和图例联动
        this.updateFormula(rankInfo);
        this.updateLegend(rankInfo);
    }
    
    // 辅助方法：绘制 α3 = c1 α1 + c2 α2 的组合线段
    drawLinearCombinationDashes() {
        const scene = this.app.three.scene;
        // 在 xy 共面时，求 c1, c2：α3 = c1 α1 + c2 α2
        // v1 = (x1, 0, 0), v2 = (0, y2, 0), v3 = (x3, y3, 0)
        // c1 = x3 / x1, c2 = y3 / y2
        if (Math.abs(this.v1[0]) > 0.01 && Math.abs(this.v2[1]) > 0.01) {
            const c1 = this.v3[0] / this.v1[0];
            const c2 = this.v3[1] / this.v2[1];
            
            const pt1 = new THREE.Vector3(c1 * this.v1[0], 0, 0);
            const pt2 = new THREE.Vector3(c1 * this.v1[0], c2 * this.v2[1], 0);
            
            // 虚线1: 从 c1*α1 延伸到 α3
            const points = [pt1, pt2];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: 0xffffff,
                dashSize: 0.2,
                gapSize: 0.1
            });
            const line = new THREE.Line(geometry, material);
            line.computeLineDistances(); // Three.js 必须计算线距离以渲染虚线
            scene.add(line);
            this.projLines.push(line);
        }
    }
    
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = Math.max(dir.length(), 0.1);
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.5, 0.2);
        arrow.line.material.linewidth = 3.5;
        return arrow;
    }
    
    // 核心矩阵秩计算逻辑
    calculateRankAndSpan() {
        const matrix = [
            this.v1[0], this.v2[0], this.v3[0],
            this.v1[1], this.v2[1], this.v3[1],
            this.v1[2], this.v2[2], this.v3[2]
        ];
        
        const det = MathUtils.det3(matrix);
        
        // 1. 检查是否三维无关 (det不为0)
        if (Math.abs(det) > 0.05) {
            return {
                rank: 3,
                basis: [[...this.v1], [...this.v2], [...this.v3]],
                isIndependent: true,
                relation: '线性无关，张成 3D 三维体空间。'
            };
        }
        
        // 2. 检查两两向量是否共线 (秩是否为1)
        const cross12 = MathUtils.vecCross(this.v1, this.v2);
        const len12 = MathUtils.vecLength(cross12);
        
        const cross13 = MathUtils.vecCross(this.v1, this.v3);
        const len13 = MathUtils.vecLength(cross13);
        
        const isV1Zero = MathUtils.vecLength(this.v1) < 0.1;
        const isV2Zero = MathUtils.vecLength(this.v2) < 0.1;
        
        if (len12 < 0.05 && len13 < 0.05) {
            return {
                rank: 1,
                basis: [isV1Zero ? (isV2Zero ? [...this.v3] : [...this.v2]) : [...this.v1]],
                isIndependent: false,
                relation: '线性相关，所有向量共线退化，张成 1D 直线。'
            };
        }
        
        // 3. 否则就是秩为 2（共面线性相关）
        let basis = [[...this.v1], [...this.v2]];
        if (len12 < 0.05) {
            basis = [[...this.v1], [...this.v3]];
        }
        
        // 计算线性组合系数
        let coeffString = "";
        // 如果 v3 共面于 v1, v2 张成的 xy 面：α3 = c1 α1 + c2 α2
        if (Math.abs(this.v3[2]) < 0.02 && Math.abs(this.v1[0]) > 0.05 && Math.abs(this.v2[1]) > 0.05) {
            const c1 = this.v3[0] / this.v1[0];
            const c2 = this.v3[1] / this.v2[1];
            coeffString = `\\vec{\\alpha}_3 = ${c1.toFixed(1)}\\vec{\\alpha}_1 + ${c2.toFixed(1)}\\vec{\\alpha}_2`;
        } else {
            coeffString = `\\vec{\\alpha}_3 = c_1\\vec{\\alpha}_1 + c_2\\vec{\\alpha}_2`;
        }
        
        return {
            rank: 2,
            basis,
            isIndependent: false,
            relation: '线性相关，三向量共面塌缩，张成 2D 平面。',
            coeffString
        };
    }
    
    updateFormula(rankInfo) {
        let rankString = `\\text{矩阵的秩 } r(A) = ${rankInfo.rank}`;
        let independentString = rankInfo.isIndependent 
            ? `\\rightarrow \\text{向量组线性无关}` 
            : `\\rightarrow \\text{向量组线性相关}`;
            
        let mathStr = `
        A = (\\vec{\\alpha}_1, \\vec{\\alpha}_2, \\vec{\\alpha}_3) = 
        \\begin{pmatrix}
        ${this.v1[0].toFixed(1)} & ${this.v2[0].toFixed(1)} & ${this.v3[0].toFixed(1)} \\\\
        ${this.v1[1].toFixed(1)} & ${this.v2[1].toFixed(1)} & ${this.v3[1].toFixed(1)} \\\\
        ${this.v1[2].toFixed(1)} & ${this.v2[2].toFixed(1)} & ${this.v3[2].toFixed(1)}
        \\end{pmatrix}
        \\\\
        ${rankString} \\quad ${independentString}
        `;
        
        if (rankInfo.rank === 2 && rankInfo.coeffString) {
            mathStr += `\\\\ \\text{线性组合关系：} ${rankInfo.coeffString}`;
        }
        
        this.app.renderMath('math-formula', mathStr);
    }
    
    updateLegend(rankInfo) {
        const basisSymbols = rankInfo.basis.map((v, i) => `\\vec{\\alpha}_${i+1}`);
        const isIndependent = rankInfo.isIndependent;
        
        this.app.buildLegend([
            {
                symbol: "α₁",
                themeColor: "blue",
                title: "列向量 α₁",
                desc: `第一骨架向量，当前坐标：(${this.v1[0].toFixed(1)}, ${this.v1[1].toFixed(1)}, ${this.v1[2].toFixed(1)})。`,
                onHoverIn: () => this.highlightArrow(0),
                onHoverOut: () => this.resetArrowColor(0)
            },
            {
                symbol: "α₂",
                themeColor: "pink",
                title: "列向量 α₂",
                desc: `第二骨架向量，当前坐标：(${this.v2[0].toFixed(1)}, ${this.v2[1].toFixed(1)}, ${this.v2[2].toFixed(1)})。`,
                onHoverIn: () => this.highlightArrow(1),
                onHoverOut: () => this.resetArrowColor(1)
            },
            {
                symbol: "α₃",
                themeColor: "gold",
                title: "列向量 α₃",
                desc: `第三测试向量，当前坐标：(${this.v3[0].toFixed(1)}, ${this.v3[1].toFixed(1)}, ${this.v3[2].toFixed(1)})。`,
                onHoverIn: () => this.highlightArrow(2),
                onHoverOut: () => this.resetArrowColor(2)
            },
            {
                symbol: "Span",
                themeColor: isIndependent ? "teal" : (rankInfo.rank === 2 ? "green" : "purple"),
                title: isIndependent ? "张成空间 (3D 体)" : (rankInfo.rank === 2 ? "共面张成空间 (2D 面)" : "共线张成空间 (1D 线)"),
                desc: `<strong>秩 = ${rankInfo.rank}</strong>。极大无关组为：{${basisSymbols.join(', ')}}。${rankInfo.relation}`,
                onHoverIn: () => this.highlightSpan(rankInfo.rank),
                onHoverOut: () => this.resetSpan(rankInfo.rank)
            }
        ]);
    }
    
    // ==========================================
    // 悬停交互高亮控制
    // ==========================================
    highlightArrow(index) {
        if (this.arrows[index]) {
            this.arrows[index].setColor(new THREE.Color(0xffffff));
        }
    }
    
    resetArrowColor(index) {
        if (this.arrows[index]) {
            const keys = ['v1', 'v2', 'v3'];
            this.arrows[index].setColor(new THREE.Color(this.colors[keys[index]]));
        }
    }
    
    highlightSpan(rank) {
        if (rank === 2 && this.spanPlane) {
            this.spanPlane.material.opacity = 0.8;
            this.spanPlane.material.emissive.setHex(0x10b981);
        } else if (rank === 1 && this.spanLine) {
            this.spanLine.material.color.setHex(0xffffff);
        }
    }
    
    resetSpan(rank) {
        if (rank === 2 && this.spanPlane) {
            this.spanPlane.material.opacity = 0.35;
            this.spanPlane.material.emissive.setHex(0x000000);
        } else if (rank === 1 && this.spanLine) {
            this.spanLine.material.color.setHex(this.colors.spanLine);
        }
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
        if (this.spanPlane) {
            scene.remove(this.spanPlane);
            this.spanPlane = null;
        }
        if (this.spanPlaneEdge) {
            scene.remove(this.spanPlaneEdge);
            this.spanPlaneEdge = null;
        }
        if (this.spanLine) {
            scene.remove(this.spanLine);
            this.spanLine = null;
        }
    }
    
    update() {
        // 微弱闪烁发光
        if (this.spanPlane) {
            // const time = Date.now() * 0.002;
            // this.spanPlane.material.opacity = 0.35 + Math.sin(time) * 0.05;
        }
    }
}
