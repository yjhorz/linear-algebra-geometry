import { MathUtils } from '../math-utils.js';

/**
 * 第三章：向量空间与相关性 (Ch3 Vector Spaces Module)
 */
export class Chapter3Vectors {
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 核心向量定义
        this.v1 = [3.0, 0.0, 0.0];
        this.v2 = [0.0, 3.0, 0.0];
        this.v3 = [2.0, 2.0, 1.5]; // 默认三维无关
        
        // 2D 坐标变换拖拽点
        this.vecX = [2.0, 1.0];
        this.isDragging = false;
        
        // 施密特正交化步骤
        this.gsStep = 0;
        
        // 渲染物体引用
        this.objects = [];
        this.leftObjects = [];
        this.rightObjects = [];
        this.grid = null;
        
        // 绑定 2D 鼠标监听
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        
        this.colors = {
            v1: 0x3b82f6,      // 蓝色
            v2: 0xf43f5e,      // 粉色
            v3: 0xf59e0b,      // 金色
            spanPlane: 0x10b981, // 绿色张成面
            spanLine: 0x8b5cf6,  // 紫色张成线
            proj: 0xffffff     // 白色投影线
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        
        // 注销 2D 监听，防多重绑定
        const canvas = this.app.canvas2d.canvas;
        canvas.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
        
        if (tabId === "span_rank") {
            this.app.setRenderMode('3d_single');
            this.initSpanRankView();
        } else if (tabId === "basis_coord") {
            this.app.setRenderMode('2d_single');
            this.initBasisCoordView();
        } else if (tabId === "equiv_vectors") {
            this.app.setRenderMode('3d_dual');
            this.initEquivVectorsView();
        } else if (tabId === "orthogonalization") {
            this.app.setRenderMode('3d_single');
            this.initOrthogonalizationView();
        }
    }
    
    // ==========================================
    // 1. 张成空间与秩
    // ==========================================
    initSpanRankView() {
        this.app.setPanelInfo(
            "张成空间与秩",
            "向量组线性组合能铺满的几何物理空间即为「张成空间 (Span)」，其极大线性无关组是空间的「最简骨架（基）」，张成空间的「几何维度」直接映射矩阵的「秩 (Rank)」。",
            `
            <p><strong>1. 降维与相关：</strong></p>
            <p>如果新加入的向量落在了已有向量张成的空间中，则未对空间维度做任何贡献，向量组**线性相关**（多余）。</p>
            <p><strong>2. 秩代表空间维度：</strong></p>
            <p>拖动滑块控制 $\\vec{\\alpha}_3$ 的 $z$ 分量高度。当高度降为0时，张成空间从 3D 体坍缩为 2D 绿色平面，矩阵的秩也同步从 3 降为 2！</p>
            `
        );
        
        this.v3 = [2.0, 2.0, 1.5];
        this.rebuildSpanRank3D();
        
        this.app.buildSliders([
            { id: 'v3z', label: 'α₃ 竖向高度 (z - 维度坍缩控制)', min: 0.0, max: 3.0, step: 0.1, value: this.v3[2], color: '#f59e0b', onChange: (val) => { this.v3[2] = val; this.rebuildSpanRank3D(); } }
        ]);
    }
    
    rebuildSpanRank3D() {
        const scene = this.app.three.scene;
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        
        // 基础网格
        const baseGrid = new THREE.GridHelper(16,16, 0x475569, 0x1e293b);
        scene.add(baseGrid);
        this.objects.push(baseGrid);
        
        // 绘制三向量
        const origin = new THREE.Vector3(0,0,0);
        const a1 = this.createVector3D(origin, this.v1, this.colors.v1);
        const a2 = this.createVector3D(origin, this.v2, this.colors.v2);
        const a3 = this.createVector3D(origin, this.v3, this.colors.v3);
        scene.add(a1); scene.add(a2); scene.add(a3);
        this.objects.push(a1, a2, a3);
        
        // 计算秩
        const isCollapsed = Math.abs(this.v3[2]) < 0.05;
        const rank = isCollapsed ? 2 : 3;
        
        if (isCollapsed) {
            // 秩=2: 绘制 2D xy 平面片
            const geom = new THREE.PlaneGeometry(8, 8);
            const mat = new THREE.MeshPhongMaterial({
                color: this.colors.spanPlane, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.rotation.x = -Math.PI / 2;
            scene.add(mesh);
            this.objects.push(mesh);
            
            const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({
                color: this.colors.spanPlane, linewidth: 2
            }));
            edge.rotation.x = -Math.PI / 2;
            scene.add(edge);
            this.objects.push(edge);
        }
        
        const latex = `
        A = (\\vec{\\alpha}_1, \\vec{\\alpha}_2, \\vec{\\alpha}_3) = 
        \\begin{pmatrix} 
        3.0 & 0.0 & 2.0 \\\\
        0.0 & 3.0 & 2.0 \\\\
        0.0 & 0.0 & ${this.v3[2].toFixed(1)}
        \\end{pmatrix}
        \\\\
        \\text{张成空间维度 } = \\text{矩阵的秩 } r(A) = ${rank}
        \\\\
        ${isCollapsed ? '\\text{向量组共面 [线性相关]，极大无关组为 } \\{\\vec{\\alpha}_1, \\vec{\\alpha}_2\\}' : '\\text{向量组独立 [线性无关]，极大无关组为 } \\{\\vec{\\alpha}_1, \\vec{\\alpha}_2, \\vec{\\alpha}_3\\}'}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "α₁", themeColor: "blue", title: "骨架向量 α₁", desc: "第一基底向量" },
            { symbol: "α₂", themeColor: "pink", title: "骨架向量 α₂", desc: "第二基底向量" },
            { symbol: "α₃", themeColor: "gold", title: "测试向量 α₃", desc: "当 z 分量为0时，落入 α₁ 与 α₂ 张成的 xy 平面" },
            { symbol: "rk", themeColor: isCollapsed ? "green" : "teal", title: `张成空间 (秩 = ${rank})`, desc: isCollapsed ? "发生维度坍缩，张成空间退化为 2D 绿平面。" : "张成整个 3D 三维体空间。" }
        ]);
    }

    // ==========================================
    // 2. 基底与坐标变换 (2D Canvas 拖拽)
    // ==========================================
    initBasisCoordView() {
        this.app.setPanelInfo(
            "基底与坐标变换",
            "基底是向量空间的坐标测量刻度尺。同一个向量，在标准直角网格（标准基）与偏斜网格（新基）中，其对应的坐标读数（代数分量）完全不同。",
            `
            <p><strong>1. 坐标变换的几何意义 [x]_B = B⁻¹x：</strong></p>
            <p>用鼠标在画布上拖拽绿色的向量 $\\vec{x}$。我们同时绘制了：</p>
            <ul>
                <li>标准白色正交网格下的投影刻度轴（标准坐标 X，Y）；</li>
                <li>偏斜倾伸的紫色网格下的投影刻度轴（新基坐标 Y₁，Y₂）。</li>
            </ul>
            <p><strong>2. 过渡矩阵与坐标改变：</strong></p>
            <p>当您拖拽时，两个基底网格下的投影数值实时演变，直觉展现 $x = y_1 \\vec{u}_1 + y_2 \\vec{u}_2$ 的坐标投影拆分。</p>
            `
        );
        
        // 绑定鼠标事件
        const canvas = this.app.canvas2d.canvas;
        canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);
        
        this.updateBasisCoordFormula();
        this.updateBasisCoordLegend();
        this.draw();
    }
    
    updateBasisCoordFormula() {
        // 新基 B = [[1.5, 0.5], [0.5, 1.5]]
        const B = [1.5, 0.5, 0.5, 1.5];
        // 计算逆矩阵 B^-1
        // det = 2.25 - 0.25 = 2.0
        // B^-1 = [[1.5, -0.5], [-0.5, 1.5]] / 2 = [[0.75, -0.25], [-0.25, 0.75]]
        const invB = [0.75, -0.25, -0.25, 0.75];
        
        // 求解新坐标 [x]_B = B^-1 * x
        const y1 = invB[0] * this.vecX[0] + invB[1] * this.vecX[1];
        const y2 = invB[2] * this.vecX[0] + invB[3] * this.vecX[1];
        
        const latex = `
        \\text{标准基底 } E = \\{\\vec{e}_1, \\vec{e}_2\\}, \\quad 
        \\text{新基底 } B = \\{\\vec{u}_1, \\vec{u}_2\\} = 
        \\left\\{ 
        \\begin{pmatrix} 1.5 \\\\ 0.5 \\end{pmatrix}, 
        \\begin{pmatrix} 0.5 \\\\ 1.5 \\end{pmatrix} 
        \\right\\}
        \\\\
        \\vec{x}_E = \\begin{pmatrix} ${this.vecX[0].toFixed(1)} \\\\ ${this.vecX[1].toFixed(1)} \\end{pmatrix}_E, \\quad
        \\vec{x}_B = B^{-1}\\vec{x}_E = \\begin{pmatrix} ${y1.toFixed(2)} \\\\ ${y2.toFixed(2)} \\end{pmatrix}_B
        \\\\
        \\text{代数等价：} \\vec{x} = ${this.vecX[0].toFixed(1)}\\vec{e}_1 + ${this.vecX[1].toFixed(1)}\\vec{e}_2 = ${y1.toFixed(2)}\\vec{u}_1 + ${y2.toFixed(2)}\\vec{u}_2
        `;
        this.app.renderMath('math-formula', latex);
    }
    
    updateBasisCoordLegend() {
        this.app.buildLegend([
            { symbol: "x", themeColor: "green", title: "测试向量 x (绿 - 可拖拽)", desc: `空间测试向量，标准坐标：(${this.vecX[0].toFixed(1)}, ${this.vecX[1].toFixed(1)})。` },
            { symbol: "u₁", themeColor: "blue", title: "新基底向量 u₁ (蓝)", desc: "新坐标系的第一基准轴，坐标：(1.5, 0.5)。" },
            { symbol: "u₂", themeColor: "pink", title: "新基底向量 u₂ (粉)", desc: "新坐标系的第二基准轴，坐标：(0.5, 1.5)。" },
            { symbol: "x_B", themeColor: "purple", title: "新坐标读数 [x]_B", desc: "在偏斜紫色网格下度量出的 Y₁，Y₂ 坐标分量。" }
        ]);
    }
    
    // ==========================================
    // 3. 向量组间等价性
    // ==========================================
    initEquivVectorsView() {
        this.app.setPanelInfo(
            "向量组间的等价",
            "如果向量组 A 与向量组 B 可以互相线性表出，则称它们是「等价向量组」。在几何上，等价向量组意味着它们能「张成完全相同的子空间平面」。",
            `
            <p><strong>1. 两组不同的骨架，同一个平面：</strong></p>
            <p>左侧展示向量组 $A = \{\\vec{\\alpha}_1, \\vec{\\alpha}_2\}$，右侧展示不同的向量组 $B = \{\\vec{\\beta}_1, \\vec{\\beta}_2\}$。它们的长短、倾角完全不同。</p>
            <p><strong>2. 空间重合验证：</strong></p>
            <p>但两边围成的半透明绿色张成面（Span）在 3D 空间中是**完全重合、一模一样的平面**！这雄辩地证明了这两组骨架能够覆盖的空间一模一样，因此它们是<strong>等价向量组</strong>。</p>
            `
        );
        
        this.rebuildEquivVectors3D();
        this.app.buildSliders([]); // 无需滑块，直观比对空间重合
    }
    
    rebuildEquivVectors3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 向量组 A: 蓝 α1(3,0,0), 粉 α2(0,3,0) -> 张成 xy 面
        const alpha1 = [3.0, 0.0, 0.0];
        const alpha2 = [0.0, 3.0, 0.0];
        
        // 向量组 B: 金 β1(2,2,0), 紫 β2(-1.5,2.0,0) -> 同样张成 xy 面！
        const beta1 = [2.0, 2.0, 0.0];
        const beta2 = [-1.5, 2.0, 0.0];
        
        const origin = new THREE.Vector3(0,0,0);
        
        // 左侧画 A
        const a1 = this.createVector3D(origin, alpha1, this.colors.v1);
        const a2 = this.createVector3D(origin, alpha2, this.colors.v2);
        dual.left.scene.add(a1); dual.left.scene.add(a2);
        this.leftObjects.push(a1, a2);
        this.drawSpanPlaneOnDual(dual.left.scene, this.leftObjects);
        
        // 右侧画 B
        const b1 = this.createVector3D(origin, beta1, this.colors.v3);
        const b2 = this.createVector3D(origin, beta2, 0x8b5cf6); // 紫色
        dual.right.scene.add(b1); dual.right.scene.add(b2);
        this.rightObjects.push(b1, b2);
        this.drawSpanPlaneOnDual(dual.right.scene, this.rightObjects);
        
        const latex = `
        \\text{向量组 A (左)：} \\vec{\\alpha}_1 = \\begin{pmatrix} 3 \\\\ 0 \\\\ 0 \\end{pmatrix}, \\, \\vec{\\alpha}_2 = \\begin{pmatrix} 0 \\\\ 3 \\\\ 0 \\end{pmatrix}
        \\\\
        \\text{向量组 B (右)：} \\vec{\\beta}_1 = \\begin{pmatrix} 2 \\\\ 2 \\\\ 0 \\end{pmatrix}, \\, \\vec{\\beta}_2 = \\begin{pmatrix} -1.5 \\\\ 2 \\\\ 0 \\end{pmatrix}
        \\\\
        \\text{证明：} \\text{Span}(\\vec{\\alpha}_1, \\vec{\\alpha}_2) = \\text{Span}(\\vec{\\beta}_1, \\vec{\\beta}_2) = xy \\text{ 平面 [向量组等价]}
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "blue", title: "骨架 A (左)", desc: "由 α₁ (蓝) 和 α₂ (粉) 撑起的标准直角面。" },
            { symbol: "B", themeColor: "gold", title: "等价骨架 B (右)", desc: "由 β₁ (金) 和 β₂ (紫) 撑起的偏斜面，其覆盖空间与 A 完全重合等价。" }
        ]);
    }
    
    drawSpanPlaneOnDual(scene, objectList) {
        const geom = new THREE.PlaneGeometry(7,7);
        const mat = new THREE.MeshPhongMaterial({
            color: this.colors.spanPlane, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        objectList.push(mesh);
        
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geom), new THREE.LineBasicMaterial({
            color: this.colors.spanPlane, linewidth: 1.5
        }));
        edge.rotation.x = -Math.PI / 2;
        scene.add(edge);
        objectList.push(edge);
        
        const grid = new THREE.GridHelper(12, 12, 0x475569, 0x1e293b);
        grid.position.y = -0.01;
        scene.add(grid);
        objectList.push(grid);
    }

    // ==========================================
    // 4. 施密特正交化分步投影
    // ==========================================
    initOrthogonalizationView() {
        this.app.setPanelInfo(
            "施密特正交化",
            "考研线代经典大题算法。通过分步剔除向量在已有正交基上的正交投影（剔除重叠影响，获取垂直分量），强行将任意无关骨架重构为直角的标准正交基坐标架。",
            `
            <p><strong>1. 分步剥离（直观动画）：</strong></p>
            <ul>
                <li><strong>步骤 1：</strong> 直接选定第一方向 $\\vec{\\beta}_1 = \\vec{\\alpha}_1$。</li>
                <li><strong>步骤 2：</strong> 从 $\\vec{\\alpha}_2$ 中减去它在第一轴的投影（用白色虚线画出），余下垂直的几何误差即为第二轴 $\\vec{\\beta}_2$（90°直角）。</li>
                <li><strong>步骤 3：</strong> 减去在底面两轴张成薄膜上的投影，余下凌空垂直的线即为第三轴 $\\vec{\\beta}_3$。</li>
                <li><strong>单位化：</strong> 收缩所有正交向量长度为 1.0。</li>
            </ul>
            `
        );
        
        this.gsStep = 0;
        this.rebuildOrthogonalization3D();
        
        // 构建步骤按钮
        const container = document.getElementById('controls-container');
        container.innerHTML = `
            <div style="font-size: 12px; font-weight:600; color:var(--text-secondary); margin-bottom:6px;">正交化步推进 (Step Tracker)</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom:10px;">
                <button id="gs-0" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); box-shadow:none;">原向量</button>
                <button id="gs-1" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); box-shadow:none;">步骤 1</button>
                <button id="gs-2" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); box-shadow:none;">步骤 2</button>
                <button id="gs-3" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); box-shadow:none;">步骤 3</button>
                <button id="gs-4" class="btn-primary" style="padding: 6px 0; font-size:11px; background: rgba(255,255,255,0.06); box-shadow:none;">单位化</button>
            </div>
        `;
        
        for (let i = 0; i <= 4; i++) {
            document.getElementById(`gs-${i}`).addEventListener('click', () => {
                this.gsStep = i;
                this.updateGSStepUI();
                this.rebuildOrthogonalization3D();
            });
        }
        this.updateGSStepUI();
    }
    
    updateGSStepUI() {
        for (let i = 0; i <= 4; i++) {
            const btn = document.getElementById(`gs-${i}`);
            if (i === this.gsStep) {
                btn.style.background = 'var(--color-blue)';
                btn.style.borderColor = 'var(--text-white)';
                btn.style.color = '#ffffff';
            } else {
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.borderColor = 'transparent';
                btn.style.color = 'var(--text-secondary)';
            }
        }
    }
    
    rebuildOrthogonalization3D() {
        const scene = this.app.three.scene;
        this.objects.forEach(obj => scene.remove(obj));
        this.objects = [];
        
        const baseGrid = new THREE.GridHelper(16,16, 0x475569, 0x1e293b);
        scene.add(baseGrid);
        this.objects.push(baseGrid);
        
        // 原始输入向量
        const a1 = [3.0, 0.0, 0.0];
        const a2 = [1.5, 2.5, 0.0];
        const a3 = [0.5, 1.5, 2.5];
        
        const gs = MathUtils.gramSchmidt(a1, a2, a3);
        const origin = new THREE.Vector3(0,0,0);
        
        if (this.gsStep === 0) {
            const arrow1 = this.createVector3D(origin, a1, this.colors.v1);
            const arrow2 = this.createVector3D(origin, a2, this.colors.v2);
            const arrow3 = this.createVector3D(origin, a3, this.colors.v3);
            scene.add(arrow1); scene.add(arrow2); scene.add(arrow3);
            this.objects.push(arrow1, arrow2, arrow3);
            
            this.app.renderMath('math-formula', `\\text{原无关向量组：} \\alpha_1, \\alpha_2, \\alpha_3 \\quad [\\text{夹角斜歪}]`);
        } 
        else if (this.gsStep === 1) {
            const arrow1 = this.createVector3D(origin, gs.b[0], this.colors.spanPlane); // 绿表示确定
            const arrow2 = this.createVector3D(origin, a2, this.colors.v2);
            const arrow3 = this.createVector3D(origin, a3, this.colors.v3);
            scene.add(arrow1); scene.add(arrow2); scene.add(arrow3);
            this.objects.push(arrow1, arrow2, arrow3);
            
            this.app.renderMath('math-formula', `\\vec{\\beta}_1 = \\vec{\\alpha}_1 = \\begin{pmatrix} 3.0 \\\\ 0.0 \\\\ 0.0 \\end{pmatrix}`);
        }
        else if (this.gsStep === 2) {
            const arrow1 = this.createVector3D(origin, gs.b[0], this.colors.spanPlane);
            const arrow2 = this.createVector3D(origin, gs.b[1], this.colors.spanPlane);
            const arrow3 = this.createVector3D(origin, a3, this.colors.v3);
            scene.add(arrow1); scene.add(arrow2); scene.add(arrow3);
            this.objects.push(arrow1, arrow2, arrow3);
            
            // 绘制投影辅助白色虚线
            const p21 = new THREE.Vector3(...gs.projections.proj21);
            const target2 = new THREE.Vector3(...a2);
            this.drawDashLine(origin, p21);
            this.drawDashLine(p21, target2);
            
            this.app.renderMath('math-formula', `\\vec{\\beta}_2 = \\vec{\\alpha}_2 - \\text{proj}_{\\beta_1}(\\alpha_2) = \\begin{pmatrix} 0.0 \\\\ 2.5 \\\\ 0.0 \\end{pmatrix}`);
        }
        else if (this.gsStep === 3) {
            const arrow1 = this.createVector3D(origin, gs.b[0], this.colors.spanPlane);
            const arrow2 = this.createVector3D(origin, gs.b[1], this.colors.spanPlane);
            const arrow3 = this.createVector3D(origin, gs.b[2], this.colors.spanPlane);
            scene.add(arrow1); scene.add(arrow2); scene.add(arrow3);
            this.objects.push(arrow1, arrow2, arrow3);
            
            // 绘制底面两轴张成薄膜
            const geom = new THREE.PlaneGeometry(6,6);
            const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
                color: 0x06b6d4, transparent:true, opacity:0.25, side:THREE.DoubleSide, depthWrite:false
            }));
            mesh.rotation.x = -Math.PI / 2;
            scene.add(mesh);
            this.objects.push(mesh);
            
            const projPt = new THREE.Vector3(...gs.projections.proj31).add(new THREE.Vector3(...gs.projections.proj32));
            this.drawDashLine(origin, projPt);
            this.drawDashLine(projPt, new THREE.Vector3(...a3));
            
            this.app.renderMath('math-formula', `\\vec{\\beta}_3 = \\vec{\\alpha}_3 - \\text{proj}_{\\beta_1}(\\alpha_3) - \\text{proj}_{\\beta_2}(\\alpha_3) = \\begin{pmatrix} 0.0 \\\\ 0.0 \\\\ 2.5 \\end{pmatrix}`);
        }
        else if (this.gsStep === 4) {
            // 单位化
            const arrow1 = this.createVector3D(origin, gs.e[0], this.colors.spanPlane);
            const arrow2 = this.createVector3D(origin, gs.e[1], this.colors.spanPlane);
            const arrow3 = this.createVector3D(origin, gs.e[2], this.colors.spanPlane);
            scene.add(arrow1); scene.add(arrow2); scene.add(arrow3);
            this.objects.push(arrow1, arrow2, arrow3);
            
            this.app.renderMath('math-formula', `\\vec{e}_i = \\frac{\\vec{\\beta}_i}{\\|\\vec{\\beta}_i\\|} \\, \\rightarrow \\, Q^TQ = I \\quad [\\text{直角单位架}]`);
        }
        
        this.updateGSColorsLegend();
    }
    
    drawDashLine(fromVec, toVec) {
        const scene = this.app.three.scene;
        const geom = new THREE.BufferGeometry().setFromPoints([fromVec, toVec]);
        const line = new THREE.Line(geom, new THREE.LineDashedMaterial({
            color: 0xffffff, dashSize: 0.15, gapSize: 0.08
        }));
        line.computeLineDistances();
        scene.add(line);
        this.objects.push(line);
    }
    
    updateGSColorsLegend() {
        this.app.buildLegend([
            { symbol: "α₁", themeColor: "blue", title: "向量 α₁ (蓝)", desc: "原本的倾斜骨架第一轴。" },
            { symbol: "α₂", themeColor: "pink", title: "向量 α₂ (粉)", desc: "原本的倾斜骨架第二轴。" },
            { symbol: "α₃", themeColor: "gold", title: "向量 α₃ (金)", desc: "原本的倾斜骨架第三轴。" },
            { symbol: "e_i", themeColor: this.gsStep > 0 ? "green" : "muted", title: "直角坐标架 (绿)", desc: "经施密特剥离投影后，两两垂直夹角 90° 的正交基。" }
        ]);
    }

    // ==========================================
    // 2D 坐标变换绘图与交互
    // ==========================================
    draw() {
        if (this.currentTab !== "basis_coord") return;
        
        const canvas = this.app.canvas2d.canvas;
        const ctx = this.app.canvas2d.ctx;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0,0,w,h);
        
        const scale = 50;
        const centerX = w / 2;
        const centerY = h / 2;
        const project = (x,y) => [centerX + x*scale, centerY - y*scale];
        
        // 1. 绘制标准白色直角刻度网格
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        const limit = 6;
        for (let i = -limit; i <= limit; i++) {
            ctx.beginPath();
            const pL = project(-limit, i); const pR = project(limit, i);
            ctx.moveTo(pL[0], pL[1]); ctx.lineTo(pR[0], pR[1]); ctx.stroke();
            const pB = project(i, -limit); const pT = project(i, limit);
            ctx.beginPath(); ctx.moveTo(pB[0], pB[1]); ctx.lineTo(pT[0], pT[1]); ctx.stroke();
        }
        
        // 2. 绘制新基底 B 网格 (紫色偏斜网格)
        // u1 = (1.5, 0.5), u2 = (0.5, 1.5)
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.16)';
        ctx.lineWidth = 1;
        const transformNewBasis = (y1, y2) => {
            return [
                1.5 * y1 + 0.5 * y2,
                0.5 * y1 + 1.5 * y2
            ];
        };
        
        for (let y2 = -limit; y2 <= limit; y2++) {
            ctx.beginPath();
            const start = transformNewBasis(-limit, y2);
            const startPix = project(start[0], start[1]);
            ctx.moveTo(startPix[0], startPix[1]);
            for (let y1 = -limit + 1; y1 <= limit; y1++) {
                const pt = transformNewBasis(y1, y2);
                const pix = project(pt[0], pt[1]);
                ctx.lineTo(pix[0], pix[1]);
            }
            ctx.stroke();
        }
        for (let y1 = -limit; y1 <= limit; y1++) {
            ctx.beginPath();
            const start = transformNewBasis(y1, -limit);
            const startPix = project(start[0], start[1]);
            ctx.moveTo(startPix[0], startPix[1]);
            for (let y2 = -limit + 1; y2 <= limit; y2++) {
                const pt = transformNewBasis(y1, y2);
                const pix = project(pt[0], pt[1]);
                ctx.lineTo(pix[0], pix[1]);
            }
            ctx.stroke();
        }
        
        // 3. 绘制两根新基底向量 u1 (蓝) 和 u2 (粉)
        const originPix = project(0,0);
        const u1Pix = project(1.5, 0.5);
        const u2Pix = project(0.5, 1.5);
        this.drawVector2D(ctx, originPix, u1Pix, '#3b82f6', 3.5);
        this.drawVector2D(ctx, originPix, u2Pix, '#f43f5e', 3.5);
        ctx.font = '12px Fira Code';
        ctx.fillStyle = '#3b82f6'; ctx.fillText("u₁ (1.5, 0.5)", u1Pix[0]+5, u1Pix[1]-5);
        ctx.fillStyle = '#f43f5e'; ctx.fillText("u₂ (0.5, 1.5)", u2Pix[0]+5, u2Pix[1]-5);
        
        // 4. 绘制测试向量 x 并加拖动圈
        const xPix = project(this.vecX[0], this.vecX[1]);
        this.drawVector2D(ctx, originPix, xPix, '#10b981', 3.5);
        ctx.fillStyle = '#10b981'; ctx.fillText("x (Drag)", xPix[0]+8, xPix[1]-8);
        
        // 拖动圆圈手柄
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = this.isDragging ? '#ffffff' : 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(xPix[0], xPix[1], 8, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
        
        // 5. 绘制在新坐标系 B 下坐标分量的投影虚线
        const invB = [0.75, -0.25, -0.25, 0.75];
        const y1 = invB[0] * this.vecX[0] + invB[1] * this.vecX[1];
        const y2 = invB[2] * this.vecX[0] + invB[3] * this.vecX[1];
        
        // 沿 u1 方向的投影线段
        const proj1 = transformNewBasis(y1, 0);
        const proj1Pix = project(proj1[0], proj1[1]);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)';
        ctx.lineWidth = 1.5;
        // 连接 y1*u1 到 x
        ctx.beginPath(); ctx.moveTo(proj1Pix[0], proj1Pix[1]); ctx.lineTo(xPix[0], xPix[1]); ctx.stroke();
        // 沿 u2 方向的投影线段
        const proj2 = transformNewBasis(0, y2);
        const proj2Pix = project(proj2[0], proj2[1]);
        // 连接 y2*u2 到 x
        ctx.beginPath(); ctx.moveTo(proj2Pix[0], proj2Pix[1]); ctx.lineTo(xPix[0], xPix[1]); ctx.stroke();
        ctx.setLineDash([]);
        
        // 在投影轴上加点高亮显示刻度读数
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath(); ctx.arc(proj1Pix[0], proj1Pix[1], 4, 0, 2*Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(proj2Pix[0], proj2Pix[1], 4, 0, 2*Math.PI); ctx.fill();
    }
    
    onMouseDown(e) {
        const canvas = this.app.canvas2d.canvas;
        const rect = canvas.getBoundingClientRect();
        const scale = 50;
        const mouseX = (e.clientX - rect.left - canvas.width/2)/scale;
        const mouseY = (canvas.height/2 - (e.clientY - rect.top))/scale;
        
        const dist = Math.sqrt(Math.pow(mouseX - this.vecX[0], 2) + Math.pow(mouseY - this.vecX[1], 2));
        if (dist < 0.4) {
            this.isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
    }
    
    onMouseMove(e) {
        if (!this.isDragging) return;
        const canvas = this.app.canvas2d.canvas;
        const rect = canvas.getBoundingClientRect();
        const scale = 50;
        const mouseX = (e.clientX - rect.left - canvas.width/2)/scale;
        const mouseY = (canvas.height/2 - (e.clientY - rect.top))/scale;
        
        const len = Math.sqrt(mouseX*mouseX + mouseY*mouseY);
        if (len < 0.2) return;
        
        if (len > 4.5) {
            const norm = [mouseX/len, mouseY/len];
            this.vecX = [norm[0]*4.5, norm[1]*4.5];
        } else {
            this.vecX = [mouseX, mouseY];
        }
        
        this.updateBasisCoordFormula();
        this.updateBasisCoordLegend();
        this.draw();
    }
    
    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.app.canvas2d.canvas.style.cursor = 'default';
        }
    }
    
    drawVector2D(ctx, from, to, color, thickness) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = thickness;
        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
        
        const angle = Math.atan2(to[1]-from[1], to[0]-from[0]);
        const head = 11;
        ctx.beginPath(); ctx.moveTo(to[0], to[1]);
        ctx.lineTo(to[0]-head*Math.cos(angle-Math.PI/6), to[1]-head*Math.sin(angle-Math.PI/6));
        ctx.lineTo(to[0]-head*Math.cos(angle+Math.PI/6), to[1]-head*Math.sin(angle+Math.PI/6));
        ctx.closePath(); ctx.fill();
    }
    
    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = dir.length();
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.45, 0.18);
        arrow.line.material.linewidth = 3;
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
