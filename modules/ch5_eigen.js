import { MathUtils } from '../math-utils.js';

/**
 * 第五章：特征值与相似对角化 (Ch5 Eigenvalues Module)
 */
export class Chapter5Eigen {
    static get is2DMode() { return true; } // 2D 拖拽时由 app.js 分配
    
    constructor(appContext) {
        this.app = appContext;
        this.currentTab = "";
        
        // 游戏测试矩阵 A
        this.matrix2D = [1.2, 0.4, 0.2, 1.0];
        this.vecX = [2.0, 0.5];
        this.isDragging = false;
        this.eigenResults = null;
        this.isAligned1 = false;
        this.isAligned2 = false;
        
        // 相似对角化 3D 旋转角度 (动画使用)
        this.rotT = 0.0;
        this.isRotating = false;
        
        // 3D 渲染物体引用
        this.leftObjects = [];
        this.rightObjects = [];
        
        // 绑定 2D 监听
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        
        this.colors = {
            v1: 0x3b82f6,      // 蓝色
            v2: 0xf43f5e,      // 粉色
            v3: 0xf59e0b,      // 金色
            eigen1: '#3b82f6',
            eigen2: '#f59e0b',
            vecAx: '#ec4899'
        };
    }
    
    initTab(tabId) {
        this.currentTab = tabId;
        
        const canvas = this.app.canvas2d.canvas;
        canvas.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
        
        if (tabId === "eigen_hunt") {
            this.app.setRenderMode('2d_single');
            this.initEigenHuntView();
        } else if (tabId === "diagonalization") {
            this.app.setRenderMode('3d_dual');
            this.initDiagonalizationView();
        }
    }
    
    // ==========================================
    // 1. 特征值特征向量磁吸对齐游戏
    // ==========================================
    initEigenHuntView() {
        this.app.setPanelInfo(
            "特征向量对齐捕捉沙盒",
            "特征向量是空间扭曲形变中，方向完全保持不变的特殊直线；特征值是它在其上的单纯拉伸倍数。",
            `
            <p><strong>特征向量磁吸挑战：</strong></p>
            <p>1. 在左侧画布上，用鼠标任意拖拽白色的输入向量 $\vec{x}$。</p>
            <p>2. 观察粉色变换向量 $A\vec{x}$。当且仅当指针被吸附到<strong>蓝色或黄色特征直线</strong>上时，它们发生完美共线！</p>
            <p>3. 此时发生磁吸霓虹高亮，公式计算板实时锁死展示拉伸特征值 $\lambda$。</p>
            `
        );
        
        // 绑定 2D 事件
        const canvas = this.app.canvas2d.canvas;
        canvas.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);
        
        this.calculateEigen2D();
        this.updateEigenFormula();
        this.updateEigenLegend();
        this.draw();
    }
    
    calculateEigen2D() {
        this.eigenResults = MathUtils.solveEigen2(
            this.matrix2D[0], this.matrix2D[1],
            this.matrix2D[2], this.matrix2D[3]
        );
    }
    
    updateEigenFormula() {
        const a = this.matrix2D[0], b = this.matrix2D[1], c = this.matrix2D[2], d = this.matrix2D[3];
        const l1 = this.eigenResults.eigVals[0];
        const l2 = this.eigenResults.eigVals[1];
        
        const latex = `
        A = \\begin{pmatrix} ${a.toFixed(1)} & ${b.toFixed(1)} \\\\ ${c.toFixed(1)} & ${d.toFixed(1)} \\end{pmatrix}, \\quad
        \\vec{x} = \\begin{pmatrix} ${this.vecX[0].toFixed(1)} \\\\ ${this.vecX[1].toFixed(1)} \\end{pmatrix}
        \\\\
        A\\vec{x} = \\begin{pmatrix} ${(a*this.vecX[0]+b*this.vecX[1]).toFixed(2)} \\\\ ${(c*this.vecX[0]+d*this.vecX[1]).toFixed(2)} \\end{pmatrix}
        \\\\
        \\text{计算实特征值：} \\lambda_1 = ${l1.toFixed(2)}, \\quad \\lambda_2 = ${l2.toFixed(2)}
        `;
        this.app.renderMath('math-formula', latex);
    }
    
    updateEigenLegend() {
        this.app.buildLegend([
            { symbol: "x", themeColor: "white", title: "测试输入 x", desc: "鼠标拖动终点，坐标刻度在公式区同步联动。" },
            { symbol: "Ax", themeColor: (this.isAligned1 || this.isAligned2) ? "green" : "pink", title: "形变输出 Ax", desc: (this.isAligned1 || this.isAligned2) ? `🎉 捕获特征向量！与 x 完美共线，特征值 λ = ${(this.isAligned1 ? this.eigenResults.eigVals[0] : this.eigenResults.eigVals[1]).toFixed(2)}。` : "形变后落点向量。" },
            { symbol: "E₁", themeColor: "blue", title: "特征空间 1 (蓝)", desc: `对应特征值 λ₁ = ${this.eigenResults.eigVals[0].toFixed(2)} 的不动直线方向。` },
            { symbol: "E₂", themeColor: "gold", title: "特征空间 2 (金)", desc: `对应特征值 λ₂ = ${this.eigenResults.eigVals[1].toFixed(2)} 的不动直线方向。` }
        ]);
    }

    // ==========================================
    // 2. 相似/正交相似对角化 (3D 双画布刚性旋转)
    // ==========================================
    initDiagonalizationView() {
        this.app.setPanelInfo(
            "对称矩阵的正交相似对角化",
            "实对称矩阵的特征向量天然正交。正交相似对角化 QᵀAQ = Λ 的几何真谛是「对整个坐标系做刚性旋转」，把正交的特征轴旋转对齐到标准直角轴上。",
            `
            <p><strong>1. 正交旋转拉直主轴：</strong></p>
            <p>左侧展示对称矩阵 $A$ 的偏斜形变网格。可以看到，它的特征向量（蓝色和粉色轴线）呈正交 90° 斜指。**点击下方对角化旋转按钮**，您将看到空间发生刚性旋转！</p>
            <p><strong>2. 相似对角阵的完美状态：</strong></p>
            <p>旋转 45° 之后，右侧特征主轴与水平垂直的 X、Y 坐标轴完全重合，此时空间形变在对角矩阵 $\Lambda$ 的驱动下，表现为最单纯的**轴向垂直拉伸**。</p>
            `
        );
        
        this.rotT = 0.0;
        this.isRotating = false;
        
        this.rebuildDiagonalization3D();
        
        // 注入旋转动画按钮
        const container = document.getElementById('controls-container');
        container.innerHTML = '';
        
        const btn = document.createElement('button');
        btn.className = 'btn-primary';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
            启动正交相似对角化刚性旋转 (QᵀAQ)
        `;
        btn.addEventListener('click', () => this.runDiagonalizationRotation());
        container.appendChild(btn);
    }
    
    rebuildDiagonalization3D() {
        const dual = this.app.dualThree;
        this.clearDualObjects();
        
        // 实对称矩阵 A = [[1.5, 0.5, 0], [0.5, 1.5, 0], [0, 0, 1]]
        // 其特征值为 λ1=2.0 (方向 v1=[1,1,0]), λ2=1.0 (方向 v2=[1,-1,0])
        const matA = [
            1.5, 0.5, 0.0,
            0.5, 1.5, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 相似对角阵 Lambda = [[2.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]
        const matLambda = [
            2.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 左画布：标准对称剪切空间
        this.drawDeformedSpaceWithEigenAxes(dual.left.scene, matA, this.leftObjects, 0.0);
        
        // 右画布：正交旋转 45° 后的对角拉伸空间
        // 随着动画进度 rotT，从 0.0 旋转对齐到对角对齐状态
        this.drawDeformedSpaceWithEigenAxes(dual.right.scene, matA, this.rightObjects, this.rotT);
        
        // 计算旋转角度的代数公式
        const theta = this.rotT * 45;
        const cos = Math.cos(this.rotT * 45 * Math.PI / 180);
        const sin = Math.sin(this.rotT * 45 * Math.PI / 180);
        
        const latex = `
        A = \\begin{pmatrix} 1.5 & 0.5 & 0 \\\\ 0.5 & 1.5 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix} [\\text{正交特征骨架斜歪}], \\quad
        Q = \\begin{pmatrix} 
        \\cos${theta.toFixed(0)}° & -\\sin${theta.toFixed(0)}° & 0 \\\\ 
        \\sin${theta.toFixed(0)}° & \\cos${theta.toFixed(0)}° & 0 \\\\ 
        0 & 0 & 1 
        \\end{pmatrix}
        \\\\
        Q^T A Q = \\begin{pmatrix} 
        ${(1.5+0.5*Math.sin(2*this.rotT*45*Math.PI/180)).toFixed(2)} & ${(0.5*Math.cos(2*this.rotT*45*Math.PI/180)).toFixed(2)} & 0 \\\\
        ${(0.5*Math.cos(2*this.rotT*45*Math.PI/180)).toFixed(2)} & ${(1.5-0.5*Math.sin(2*this.rotT*45*Math.PI/180)).toFixed(2)} & 0 \\\\
        0 & 0 & 1
        \\end{pmatrix}
        \\\\
        \\text{对齐后 } (\\theta=45°) \\rightarrow Q^T A Q = \\Lambda = \\begin{pmatrix} 2 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix} [\\text{纯轴拉伸}]
        `;
        this.app.renderMath('math-formula', latex);
        
        this.app.buildLegend([
            { symbol: "A", themeColor: "blue", title: "对称矩阵形变 (左)", desc: "网格在 45° 偏斜的特征方向上进行拉伸。" },
            { symbol: "v₁", themeColor: "blue", title: "特征主轴 1 (λ₁ = 2.0)", desc: "方向为 (1, 1, 0) 的拉伸主对称轴。" },
            { symbol: "v₂", themeColor: "pink", title: "特征主轴 2 (λ₂ = 1.0)", desc: "方向为 (1, -1, 0) 的拉伸主对称轴。" },
            { symbol: "QᵀAQ", themeColor: "green", title: "旋转拉直对角化 (右)", desc: `正交矩阵 Q 将空间刚性旋转 ${theta.toFixed(0)}°，完美拉直特征向量到 X，Y 轴！` }
        ]);
    }
    
    runDiagonalizationRotation() {
        if (this.isRotating) return;
        this.isRotating = true;
        
        const startTime = performance.now();
        const duration = 1500;
        
        const anim = (time) => {
            if (this.currentTab !== 'diagonalization') return;
            
            let progress = (time - startTime) / duration;
            if (progress >= 1.0) progress = 1.0;
            
            // 缓动
            this.rotT = progress;
            
            this.rebuildDiagonalization3D();
            
            if (progress < 1.0) {
                requestAnimationFrame(anim);
            } else {
                this.isRotating = false;
            }
        };
        requestAnimationFrame(anim);
    }
    
    // ==========================================
    // 3D 带有特征向量画线形变
    // ==========================================
    drawDeformedSpaceWithEigenAxes(scene, mat, objectList, rotTProgress) {
        // 先构建刚性旋转矩阵 Q (由于对角化是在做变量替换，B = Q^T A Q)
        // 在右侧，我们要演示把 A 对应的倾斜空间刚性旋转 rotTProgress * 45°
        const theta = rotTProgress * 45 * Math.PI / 180;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        
        // 刚性旋转矩阵
        const Q = [
            cos, -sin, 0.0,
            sin, cos, 0.0,
            0.0, 0.0, 1.0
        ];
        
        // 复合形变矩阵：Q^T * A
        // 我们要让右侧的网格经历 Q^T 的刚性旋转后，特征主轴对齐
        const QT = [
            cos, sin, 0.0,
            -sin, cos, 0.0,
            0.0, 0.0, 1.0
        ];
        const compositeMat = MathUtils.matMulMat3(QT, mat);
        
        // 1. 绘制形变网格
        this.drawDeformedSpace(scene, compositeMat, objectList);
        
        // 2. 绘制高亮的三维特征主轴
        // 原始 A 矩阵的特征向量为：
        // ev1 = [1/sqrt(2), 1/sqrt(2), 0] -> 约 [0.707, 0.707, 0]
        // ev2 = [1/sqrt(2), -1/sqrt(2), 0] -> 约 [0.707, -0.707, 0]
        const ev1 = [0.707, 0.707, 0.0];
        const ev2 = [0.707, -0.707, 0.0];
        
        // 在旋转后的坐标系下，特征向量方向变为：
        const rotatedEv1 = MathUtils.matMulVec(QT, ev1);
        const rotatedEv2 = MathUtils.matMulVec(QT, ev2);
        
        // 绘制特征直线（贯穿空间的粗亮线条）
        const drawAxisLine = (dirArr, colorHex) => {
            const dir = new THREE.Vector3(...dirArr).normalize();
            const start = dir.clone().multiplyScalar(-5);
            const end = dir.clone().multiplyScalar(5);
            
            const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
            const matLine = new THREE.LineBasicMaterial({
                color: colorHex, linewidth: 4.5
            });
            const line = new THREE.Line(geom, matLine);
            scene.add(line);
            objectList.push(line);
        };
        
        drawAxisLine(rotatedEv1, 0x3b82f6); // 蓝色主轴
        drawAxisLine(rotatedEv2, 0xf43f5e); // 粉色主轴
    }
    
    drawDeformedSpace(scene, mat, objectList) {
        const origin = new THREE.Vector3(0,0,0);
        const transE1 = MathUtils.matMulVec(mat, [1.5, 0, 0]);
        const transE2 = MathUtils.matMulVec(mat, [0, 1.5, 0]);
        const transE3 = MathUtils.matMulVec(mat, [0, 0, 1.5]);
        
        const a1 = this.createVector3D(origin, transE1, 0x555555); // 灰底代表网格轴
        const a2 = this.createVector3D(origin, transE2, 0x555555);
        const a3 = this.createVector3D(origin, transE3, 0x555555);
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

    createVector3D(origin, dirArr, hexColor) {
        const dir = new THREE.Vector3(dirArr[0], dirArr[1], dirArr[2]);
        const length = Math.max(dir.length(), 0.1);
        const normDir = dir.clone().normalize();
        const arrow = new THREE.ArrowHelper(normDir, origin, length, hexColor, 0.35, 0.15);
        arrow.line.material.linewidth = 3.0;
        return arrow;
    }
    
    // ==========================================
    // 2D 拖拽特征捕捉挑战
    // ==========================================
    draw() {
        if (this.currentTab !== "eigen_hunt") return;
        
        const canvas = this.app.canvas2d.canvas;
        const ctx = this.app.canvas2d.ctx;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0,0,w,h);
        
        const scale = 50;
        const centerX = w / 2;
        const centerY = h / 2;
        const project = (x,y) => [centerX + x*scale, centerY - y*scale];
        
        // 1. 绘制网格
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
        
        // 2. 绘制特征直线
        if (this.eigenResults.isReal) {
            const ev1 = this.eigenResults.eigVecs[0];
            const ev2 = this.eigenResults.eigVecs[1];
            
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = this.isAligned1 ? 2.5 : 1.2;
            ctx.strokeStyle = this.isAligned1 ? '#ffffff' : this.colors.eigen1;
            ctx.beginPath();
            const pS1 = project(-ev1[0]*10, -ev1[1]*10); const pE1 = project(ev1[0]*10, ev1[1]*10);
            ctx.moveTo(pS1[0], pS1[1]); ctx.lineTo(pE1[0], pE1[1]); ctx.stroke();
            
            ctx.lineWidth = this.isAligned2 ? 2.5 : 1.2;
            ctx.strokeStyle = this.isAligned2 ? '#ffffff' : this.colors.eigen2;
            ctx.beginPath();
            const pS2 = project(-ev2[0]*10, -ev2[1]*10); const pE2 = project(ev2[0]*10, ev2[1]*10);
            ctx.moveTo(pS2[0], pS2[1]); ctx.lineTo(pE2[0], pE2[1]); ctx.stroke();
            
            ctx.setLineDash([]);
        }
        
        // 3. 绘制输入 x
        const originPix = project(0,0);
        const xPix = project(this.vecX[0], this.vecX[1]);
        this.drawVector2D(ctx, originPix, xPix, '#ffffff', 3.0, true);
        
        // 4. 绘制输出 Ax
        const Ax = MathUtils.matMulVec2(this.matrix2D, this.vecX);
        const AxPix = project(Ax[0], Ax[1]);
        const isAligned = this.isAligned1 || this.isAligned2;
        
        if (isAligned) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#10b981';
        }
        this.drawVector2D(ctx, originPix, AxPix, isAligned ? '#10b981' : this.colors.vecAx, isAligned ? 4.5 : 3.0, false);
        ctx.shadowBlur = 0;
        
        ctx.font = '12px Fira Code';
        ctx.fillStyle = '#ffffff'; ctx.fillText("x (Drag)", xPix[0]+8, xPix[1]-8);
        ctx.fillStyle = isAligned ? '#10b981' : this.colors.vecAx;
        ctx.fillText("Ax", AxPix[0]+8, AxPix[1]-8);
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
        
        this.checkAlignment();
        this.updateEigenFormula();
        this.updateEigenLegend();
        this.draw();
    }
    
    checkAlignment() {
        if (!this.eigenResults.isReal) return;
        
        const len = Math.sqrt(this.vecX[0]*this.vecX[0] + this.vecX[1]*this.vecX[1]);
        const normX = [this.vecX[0]/len, this.vecX[1]/len];
        const ev1 = this.eigenResults.eigVecs[0];
        const ev2 = this.eigenResults.eigVecs[1];
        
        const dot1 = Math.abs(normX[0]*ev1[0] + normX[1]*ev1[1]);
        const dot2 = Math.abs(normX[0]*ev2[0] + normX[1]*ev2[1]);
        
        const threshold = Math.cos(3.5 * Math.PI / 180); // 3.5度吸附
        this.isAligned1 = dot1 > threshold;
        this.isAligned2 = dot2 > threshold;
        
        if (this.isAligned1) {
            const sign = (this.vecX[0]*ev1[0] + this.vecX[1]*ev1[1]) >= 0 ? 1 : -1;
            this.vecX = [ev1[0]*len*sign, ev1[1]*len*sign];
        } else if (this.isAligned2) {
            const sign = (this.vecX[0]*ev2[0] + this.vecX[1]*ev2[1]) >= 0 ? 1 : -1;
            this.vecX = [ev2[0]*len*sign, ev2[1]*len*sign];
        }
    }
    
    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.app.canvas2d.canvas.style.cursor = 'default';
        }
    }
    
    drawVector2D(ctx, from, to, color, thickness, hasHandle) {
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = thickness;
        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
        
        const angle = Math.atan2(to[1]-from[1], to[0]-from[0]);
        const head = 11;
        ctx.beginPath(); ctx.moveTo(to[0], to[1]);
        ctx.lineTo(to[0]-head*Math.cos(angle-Math.PI/6), to[1]-head*Math.sin(angle-Math.PI/6));
        ctx.lineTo(to[0]-head*Math.cos(angle+Math.PI/6), to[1]-head*Math.sin(angle+Math.PI/6));
        ctx.closePath(); ctx.fill();
        
        if (hasHandle) {
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = this.isDragging ? '#ffffff' : 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.arc(to[0], to[1], 8, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
        }
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
        this.clearDualObjects();
        const canvas = this.app.canvas2d.canvas;
        canvas.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
    }
}
