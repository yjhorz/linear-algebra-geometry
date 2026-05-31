import { MathUtils } from './math-utils.js';

// 导入 6 大学术章节模块
import { Chapter1Basics } from './modules/ch1_basics.js';
import { Chapter2Relations } from './modules/ch2_relations.js';
import { Chapter3Vectors } from './modules/ch3_vectors.js';
import { Chapter4Equations } from './modules/ch4_equations.js';
import { Chapter5Eigen } from './modules/ch5_eigen.js';
import { Chapter6Quadratic } from './modules/ch6_quadratic.js';

/**
 * 考研线性代数几何学习系统 - 顶级生命周期调度器 (App Orchestrator)
 */
class App {
    constructor() {
        this.chapters = {
            "1": Chapter1Basics,
            "2": Chapter2Relations,
            "3": Chapter3Vectors,
            "4": Chapter4Equations,
            "5": Chapter5Eigen,
            "6": Chapter6Quadratic
        };
        
        // 章节下的二级 Tab 架构预设
        this.CHAPTER_TABS = {
            "1": [
                { id: "det", text: "行列式与体积坍缩" },
                { id: "transpose", text: "转置对称矩阵" },
                { id: "inverse_adj", text: "逆矩阵与伴随" }
            ],
            "2": [
                { id: "equivalence", text: "等价关系 (PAQ)" },
                { id: "similarity", text: "相似关系 (P⁻¹AP)" },
                { id: "congruence", text: "矩阵合同 (CᵀAC)" },
                { id: "orthogonality", text: "正交矩阵 (QᵀQ=I)" }
            ],
            "3": [
                { id: "span_rank", text: "张成空间与秩" },
                { id: "basis_coord", text: "基与坐标变换" },
                { id: "equiv_vectors", text: "向量组等价" },
                { id: "orthogonalization", text: "施密特正交化" }
            ],
            "4": [
                { id: "homogeneous", text: "齐次解空间 (核)" },
                { id: "non_homogeneous", text: "非齐次解 (平移)" }
            ],
            "5": [
                { id: "eigen_hunt", text: "特征值对齐游戏" },
                { id: "diagonalization", text: "相似/正交相似对角化" }
            ],
            "6": [
                { id: "quadratic_types", text: "二次曲面与正定" },
                { id: "std_norm", text: "标准化与规范化" },
                { id: "inertia_theorem", text: "合同与惯性定理" }
            ]
        };
        
        this.activeChapterKey = null;
        this.activeTabKey = null;
        this.activeChapterInstance = null;
        
        // 1. 单 3D 渲染器组件
        this.three = {
            container: null, scene: null, camera: null, renderer: null, controls: null, lights: []
        };
        
        // 2. 双 3D 对比渲染组件
        this.dualThree = {
            active: false,
            left: { container: null, scene: null, camera: null, renderer: null, controls: null },
            right: { container: null, scene: null, camera: null, renderer: null, controls: null }
        };
        
        // 3. 单 2D 绘图组件
        this.canvas2d = {
            container: null, canvas: null, ctx: null
        };
        
        // 4. 双 2D 对比绘图组件
        this.dualCanvas2d = {
            active: false,
            left: { canvas: null, ctx: null },
            right: { canvas: null, ctx: null }
        };
        
        this.animationFrameId = null;
        this.init();
    }
    
    init() {
        // 获取 DOM 容器
        this.three.container = document.getElementById('three-container');
        this.canvas2d.container = document.getElementById('canvas-2d-container');
        this.canvas2d.canvas = document.getElementById('main-canvas-2d');
        this.canvas2d.ctx = this.canvas2d.canvas.getContext('2d');
        
        this.dualThree.left.container = document.getElementById('three-left');
        this.dualThree.right.container = document.getElementById('three-right');
        
        this.dualCanvas2d.left.canvas = document.getElementById('canvas-2d-left');
        this.dualCanvas2d.left.ctx = this.dualCanvas2d.left.canvas.getContext('2d');
        this.dualCanvas2d.right.canvas = document.getElementById('canvas-2d-right');
        this.dualCanvas2d.right.ctx = this.dualCanvas2d.right.canvas.getContext('2d');
        
        // 初始化单 3D WebGL 环境
        this.initSingleThree();
        
        // 监听视口缩放
        window.addEventListener('resize', () => this.handleResize());
        
        // 绑定侧边栏导航点击
        this.bindNavigation();
        
        // 默认载入第一章
        this.switchChapter("1");
    }
    
    // 初始化单 3D 渲染环境
    initSingleThree() {
        const w = this.three.container.clientWidth;
        const h = this.three.container.clientHeight;
        
        this.three.scene = new THREE.Scene();
        this.three.scene.background = new THREE.Color(0x060913);
        this.three.scene.fog = new THREE.FogExp2(0x060913, 0.012);
        
        this.three.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.three.camera.position.set(8, 6, 10);
        
        this.three.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.three.renderer.setSize(w, h);
        this.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.three.renderer.shadowMap.enabled = true;
        this.three.container.appendChild(this.three.renderer.domElement);
        
        this.three.controls = new THREE.OrbitControls(this.three.camera, this.three.renderer.domElement);
        this.three.controls.enableDamping = true;
        this.three.controls.dampingFactor = 0.05;
        
        this.setupLights(this.three.scene, this.three.lights);
        
        // 开启循环渲染
        this.animate();
    }
    
    // 初始化双 3D 渲染环境 (仅在需要对比时创建，按需极速分配)
    initDualThree() {
        if (this.dualThree.active) return;
        
        const w = this.dualThree.left.container.clientWidth;
        const h = this.dualThree.left.container.clientHeight;
        
        // 左画布
        this.dualThree.left.scene = new THREE.Scene();
        this.dualThree.left.scene.background = new THREE.Color(0x060913);
        this.dualThree.left.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.dualThree.left.camera.position.set(8, 6, 10);
        this.dualThree.left.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.dualThree.left.renderer.setSize(w, h);
        this.dualThree.left.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.dualThree.left.container.appendChild(this.dualThree.left.renderer.domElement);
        this.dualThree.left.controls = new THREE.OrbitControls(this.dualThree.left.camera, this.dualThree.left.renderer.domElement);
        this.dualThree.left.controls.enableDamping = true;
        this.setupLights(this.dualThree.left.scene, []);
        
        // 右画布
        this.dualThree.right.scene = new THREE.Scene();
        this.dualThree.right.scene.background = new THREE.Color(0x060913);
        this.dualThree.right.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.dualThree.right.camera.position.set(8, 6, 10);
        this.dualThree.right.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.dualThree.right.renderer.setSize(w, h);
        this.dualThree.right.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.dualThree.right.container.appendChild(this.dualThree.right.renderer.domElement);
        this.dualThree.right.controls = new THREE.OrbitControls(this.dualThree.right.camera, this.dualThree.right.renderer.domElement);
        this.dualThree.right.controls.enableDamping = true;
        this.setupLights(this.dualThree.right.scene, []);
        
        this.dualThree.active = true;
    }
    
    destroyDualThree() {
        if (!this.dualThree.active) return;
        
        const cleanup = (obj) => {
            if (obj.renderer) {
                obj.container.removeChild(obj.renderer.domElement);
                obj.renderer.dispose();
            }
            if (obj.controls) obj.controls.dispose();
            obj.scene = null;
            obj.camera = null;
            obj.renderer = null;
            obj.controls = null;
        };
        
        cleanup(this.dualThree.left);
        cleanup(this.dualThree.right);
        this.dualThree.active = false;
    }
    
    setupLights(scene, lightList) {
        const ambient = new THREE.AmbientLight(0xffffff, 0.45);
        scene.add(ambient);
        
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 15, 10);
        scene.add(dir);
        
        const p1 = new THREE.PointLight(0x3b82f6, 1.5, 30);
        p1.position.set(-8, 5, -8);
        scene.add(p1);
        
        const p2 = new THREE.PointLight(0xf43f5e, 1.2, 30);
        p2.position.set(8, -2, 8);
        scene.add(p2);
        
        if (lightList) {
            lightList.push(ambient, dir, p1, p2);
        }
    }
    
    // 主渲染引擎循环
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // 1. 单 3D 控制器与渲染更新
        if (this.three.controls) this.three.controls.update();
        if (this.three.renderer && this.three.scene && this.three.camera && !this.three.container.classList.contains('hidden')) {
            this.three.renderer.render(this.three.scene, this.three.camera);
        }
        
        // 2. 双 3D 对比控制器与双渲染更新
        if (this.dualThree.active && !document.getElementById('three-dual-container').classList.contains('hidden')) {
            if (this.dualThree.left.controls) this.dualThree.left.controls.update();
            if (this.dualThree.right.controls) this.dualThree.right.controls.update();
            this.dualThree.left.renderer.render(this.dualThree.left.scene, this.dualThree.left.camera);
            this.dualThree.right.renderer.render(this.dualThree.right.scene, this.dualThree.right.camera);
        }
        
        // 3. 调用当前活动章节的逐帧动效
        if (this.activeChapterInstance && this.activeChapterInstance.update) {
            this.activeChapterInstance.update();
        }
    }
    
    // ==========================================
    // SPA 路由调度：切换章节与切换 Tab
    // ==========================================
    switchChapter(chapterKey) {
        if (this.activeChapterKey === chapterKey) return;
        
        // 1. 彻底清空卸载当前章节实例
        this.unloadActiveChapter();
        
        this.activeChapterKey = chapterKey;
        const ChapterClass = this.chapters[chapterKey];
        if (!ChapterClass) return;
        
        // 2. 生成顶部二级 Tab 导航项
        const tabList = this.CHAPTER_TABS[chapterKey];
        const tabContainer = document.getElementById('sub-tabs-bar');
        tabContainer.innerHTML = '';
        
        tabList.forEach((tab, index) => {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${index === 0 ? 'active' : ''}`;
            btn.innerText = tab.text;
            btn.setAttribute('data-tab', tab.id);
            btn.addEventListener('click', () => this.switchTab(tab.id));
            tabContainer.appendChild(btn);
        });
        
        // 3. 实例化当前章节类
        this.activeChapterInstance = new ChapterClass({
            app: this,
            three: this.three,
            dualThree: this.dualThree,
            canvas2d: this.canvas2d,
            dualCanvas2d: this.dualCanvas2d,
            renderMath: (id, latex) => this.renderMath(id, latex),
            buildSliders: (sliders) => this.buildSliders(sliders),
            buildLegend: (legends) => this.buildLegend(legends),
            setPanelInfo: (title, desc, insight) => this.setPanelInfo(title, desc, insight),
            setRenderMode: (mode) => this.setRenderMode(mode)
        });
        
        // 4. 默认启动该章节的第一个 Tab
        this.switchTab(tabList[0].id);
        
        // 5. 侧边栏高亮切换
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('data-chapter') === chapterKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    switchTab(tabId) {
        this.activeTabKey = tabId;
        
        // 高亮顶部 Tab 按钮
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 调度章节实例的子 Tab 生命周期
        if (this.activeChapterInstance && this.activeChapterInstance.initTab) {
            // 清理场景中上个Tab放置的杂余物体，保证洁净度
            this.clearSceneObjects();
            this.activeChapterInstance.initTab(tabId);
        }
    }
    
    unloadActiveChapter() {
        if (!this.activeChapterInstance) return;
        
        if (this.activeChapterInstance.destroy) {
            this.activeChapterInstance.destroy();
        }
        
        this.clearSceneObjects();
        this.destroyDualThree();
        
        // 清理面板 DOM
        document.getElementById('controls-container').innerHTML = '';
        document.getElementById('mapping-legend').innerHTML = '';
        
        this.activeChapterInstance = null;
        this.activeChapterKey = null;
        this.activeTabKey = null;
    }
    
    clearSceneObjects() {
        // 清理单 3D 场景中用户临时创建的物体，保留光照
        if (this.three.scene) {
            const toRemove = [];
            this.three.scene.traverse(child => {
                if (child.isMesh || child.isLine || child.isGridHelper || child.isGroup || child.isArrowHelper) {
                    toRemove.push(child);
                }
            });
            toRemove.forEach(obj => {
                this.three.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
        }
        
        // 清理双 3D 场景中的临时物体
        const clearDual = (dualObj) => {
            if (dualObj.scene) {
                const toRemove = [];
                dualObj.scene.traverse(child => {
                    if (child.isMesh || child.isLine || child.isGridHelper || child.isGroup || child.isArrowHelper) {
                        toRemove.push(child);
                    }
                });
                toRemove.forEach(obj => {
                    dualObj.scene.remove(obj);
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                        else obj.material.dispose();
                    }
                });
            }
        };
        
        if (this.dualThree.active) {
            clearDual(this.dualThree.left);
            clearDual(this.dualThree.right);
        }
        
        // 清除 2D canvas 绘图区
        this.canvas2d.ctx.clearRect(0, 0, this.canvas2d.canvas.width, this.canvas2d.canvas.height);
        this.dualCanvas2d.left.ctx.clearRect(0, 0, this.dualCanvas2d.left.canvas.width, this.dualCanvas2d.left.canvas.height);
        this.dualCanvas2d.right.ctx.clearRect(0, 0, this.dualCanvas2d.right.canvas.width, this.dualCanvas2d.right.canvas.height);
    }
    
    // 设置渲染画布排版模式
    setRenderMode(mode) {
        const containers = {
            '3d_single': document.getElementById('three-container'),
            '3d_dual': document.getElementById('three-dual-container'),
            '2d_single': this.canvas2d.container,
            '2d_dual': document.getElementById('canvas-2d-dual-container')
        };
        
        // 隐藏所有，显示指定
        Object.values(containers).forEach(el => el.classList.add('hidden'));
        const activeContainer = containers[mode];
        if (activeContainer) {
            activeContainer.classList.remove('hidden');
        }
        
        // 根据模式，按需极速启动 WebGL 双通道
        if (mode === '3d_dual') {
            this.initDualThree();
            this.handleResizeDualThree();
        } else if (mode === '3d_single') {
            this.three.camera.position.set(8, 6, 10);
            this.three.camera.lookAt(0,0,0);
            this.three.controls.target.set(0,0,0);
        } else if (mode === '2d_single') {
            this.handleResize2D();
        } else if (mode === '2d_dual') {
            this.handleResize2DDual();
        }
    }
    
    // ==========================================
    // UI 数据动态注入与同色闪烁高亮绑定
    // ==========================================
    renderMath(elementId, latexStr) {
        const el = document.getElementById(elementId);
        if (el) {
            katex.render(latexStr, el, { throwOnError: false, displayMode: true });
        }
    }
    
    setPanelInfo(title, desc, insightHtml) {
        document.getElementById('chapter-title').innerText = title;
        document.getElementById('chapter-title').style.borderLeft = '4px solid var(--color-blue)';
        document.getElementById('chapter-title').style.paddingLeft = '10px';
        
        // 暂时不硬编码副标题，直接显示描述
        document.getElementById('exam-insight-content').innerHTML = insightHtml;
    }
    
    buildSliders(sliderConfigs) {
        const container = document.getElementById('controls-container');
        container.innerHTML = '';
        
        sliderConfigs.forEach(cfg => {
            const group = document.createElement('div');
            group.className = 'slider-group';
            
            group.innerHTML = `
                <div class="slider-info">
                    <span class="slider-label" style="border-left: 2px solid ${cfg.color || 'var(--color-blue)'}; padding-left: 6px;">
                        ${cfg.label}
                    </span>
                    <span class="slider-value" id="val-${cfg.id}">${cfg.value}</span>
                </div>
                <div class="slider-input-wrapper">
                    <input type="range" 
                           id="input-${cfg.id}" 
                           min="${cfg.min}" 
                           max="${cfg.max}" 
                           step="${cfg.step || 0.1}" 
                           value="${cfg.value}">
                </div>
            `;
            
            container.appendChild(group);
            
            const slider = group.querySelector('input');
            const valueSpan = group.querySelector('.slider-value');
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const formattedVal = Math.round(val * 100) / 100;
                valueSpan.innerText = formattedVal;
                
                if (cfg.onChange) {
                    cfg.onChange(formattedVal);
                }
            });
        });
    }
    
    buildLegend(legendConfigs) {
        const container = document.getElementById('mapping-legend');
        container.innerHTML = '';
        
        legendConfigs.forEach(cfg => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const tag = document.createElement('div');
            tag.className = `legend-tag bg-${cfg.themeColor}`;
            tag.style.setProperty('--theme-color', `var(--color-${cfg.themeColor})`);
            tag.innerText = cfg.symbol;
            
            const desc = document.createElement('div');
            desc.className = 'legend-desc';
            desc.innerHTML = `<strong>${cfg.title}</strong>：${cfg.desc}`;
            
            item.appendChild(tag);
            item.appendChild(desc);
            
            item.addEventListener('mouseenter', () => {
                item.classList.add('pulse-highlight');
                item.style.setProperty('--theme-color', `var(--color-${cfg.themeColor})`);
                if (cfg.onHoverIn) cfg.onHoverIn();
            });
            
            item.addEventListener('mouseleave', () => {
                item.classList.remove('pulse-highlight');
                if (cfg.onHoverOut) cfg.onHoverOut();
            });
            
            container.appendChild(item);
        });
    }
    
    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const chapterKey = btn.getAttribute('data-chapter');
                this.switchChapter(chapterKey);
            });
        });
    }
    
    // ==========================================
    // 视口动态拉伸事件分发
    // ==========================================
    handleResize() {
        const activeContainer = document.querySelector('.canvas-container:not(.hidden)');
        if (!activeContainer) return;
        
        const modeId = activeContainer.id;
        if (modeId === 'three-container') {
            this.handleResizeThree();
        } else if (modeId === 'three-dual-container') {
            this.handleResizeDualThree();
        } else if (modeId === 'canvas-2d-container') {
            this.handleResize2D();
        } else if (modeId === 'canvas-2d-dual-container') {
            this.handleResize2DDual();
        }
    }
    
    handleResizeThree() {
        const w = this.three.container.clientWidth;
        const h = this.three.container.clientHeight;
        this.three.camera.aspect = w / h;
        this.three.camera.updateProjectionMatrix();
        this.three.renderer.setSize(w, h);
    }
    
    handleResizeDualThree() {
        if (!this.dualThree.active) return;
        const w = this.dualThree.left.container.clientWidth;
        const h = this.dualThree.left.container.clientHeight;
        
        this.dualThree.left.camera.aspect = w / h;
        this.dualThree.left.camera.updateProjectionMatrix();
        this.dualThree.left.renderer.setSize(w, h);
        
        this.dualThree.right.camera.aspect = w / h;
        this.dualThree.right.camera.updateProjectionMatrix();
        this.dualThree.right.renderer.setSize(w, h);
    }
    
    handleResize2D() {
        const w = this.canvas2d.container.clientWidth;
        const h = this.canvas2d.container.clientHeight;
        this.canvas2d.canvas.width = w;
        this.canvas2d.canvas.height = h;
        if (this.activeChapterInstance && this.activeChapterInstance.draw) {
            this.activeChapterInstance.draw();
        }
    }
    
    handleResize2DDual() {
        const parent = document.getElementById('canvas-2d-dual-container');
        const subLeft = parent.querySelector('.sub-canvas-2d');
        const w = subLeft.clientWidth;
        const h = subLeft.clientHeight;
        
        this.dualCanvas2d.left.canvas.width = w;
        this.dualCanvas2d.left.canvas.height = h;
        this.dualCanvas2d.right.canvas.width = w;
        this.dualCanvas2d.right.canvas.height = h;
        
        if (this.activeChapterInstance && this.activeChapterInstance.draw) {
            this.activeChapterInstance.draw();
        }
    }
}

// 启动系统
window.addEventListener('DOMContentLoaded', () => {
    window.AppInstance = new App();
});
