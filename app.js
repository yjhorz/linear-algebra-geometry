import { MathUtils } from './math-utils.js';

// 导入各个具体教学模块
import { DeterminantModule } from './modules/determinant.js';
import { TransformModule } from './modules/transform.js';
import { EquationsModule } from './modules/equations.js';
import { VectorModule } from './modules/vector.js';
import { EigenModule } from './modules/eigen.js';
import { OrthogonalModule } from './modules/orthogonal.js';
import { QuadraticModule } from './modules/quadratic.js';

/**
 * 考研线性代数几何学习系统 - 全局SPA调度核心 (App Orchestrator)
 */
class App {
    constructor() {
        this.modules = {
            determinant: DeterminantModule,
            transform: TransformModule,
            equations: EquationsModule,
            vector: VectorModule,
            eigen: EigenModule,
            orthogonal: OrthogonalModule,
            quadratic: QuadraticModule
        };
        
        this.activeModuleKey = null;
        this.activeModuleInstance = null;
        
        // WebGL (Three.js) 全局组件
        this.three = {
            container: null,
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            animationFrameId: null,
            lights: []
        };
        
        // 2D Canvas 全局组件
        this.canvas2d = {
            container: null,
            canvas: null,
            ctx: null
        };
        
        this.init();
    }
    
    init() {
        // 1. 获取 DOM 容器
        this.three.container = document.getElementById('three-container');
        this.canvas2d.container = document.getElementById('canvas-2d-container');
        this.canvas2d.canvas = document.getElementById('main-canvas-2d');
        this.canvas2d.ctx = this.canvas2d.canvas.getContext('2d');
        
        // 2. 初始化 Three.js 环境 (重用同一个 WebGL 容器，效率最高)
        this.initThreeEnvironment();
        
        // 3. 监听窗口缩放
        window.addEventListener('resize', () => this.handleResize());
        
        // 4. 绑定侧边栏导航点击事件
        this.bindNavigation();
        
        // 5. 默认启动第一个模块：行列式几何
        this.switchModule('determinant');
    }
    
    initThreeEnvironment() {
        const width = this.three.container.clientWidth;
        const height = this.three.container.clientHeight;
        
        // 创建场景
        this.three.scene = new THREE.Scene();
        this.three.scene.background = new THREE.Color(0x080b11); // 太空暗黑蓝底色
        
        // 雾气效果，增加3D空间深度感
        this.three.scene.fog = new THREE.FogExp2(0x080b11, 0.015);
        
        // 创建相机
        this.three.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.three.camera.position.set(8, 6, 10);
        
        // 创建渲染器，开启抗锯齿，使用更高分辨率的像素比
        this.three.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.three.renderer.setSize(width, height);
        this.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.three.renderer.shadowMap.enabled = true;
        this.three.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.three.container.appendChild(this.three.renderer.domElement);
        
        // 创建轨道控制器 (OrbitControls)
        this.three.controls = new THREE.OrbitControls(this.three.camera, this.three.renderer.domElement);
        this.three.controls.enableDamping = true; // 开启阻尼滑动感
        this.three.controls.dampingFactor = 0.05;
        this.three.controls.maxDistance = 50;
        this.three.controls.minDistance = 2;
        
        // 添加全局灯光体系
        this.initLights();
        
        // 开启主 3D 渲染循环
        this.animate();
    }
    
    initLights() {
        // 环境光，提供温和的基础底色
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.three.scene.add(ambientLight);
        this.three.lights.push(ambientLight);
        
        // 主方向光源（模拟斜上方太阳光，用于投影）
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 15, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 40;
        const d = 15;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.three.scene.add(dirLight);
        this.three.lights.push(dirLight);
        
        // 点光源一（霓虹蓝色微光）
        const pointLight1 = new THREE.PointLight(0x3b82f6, 1.5, 30);
        pointLight1.position.set(-8, 5, -8);
        this.three.scene.add(pointLight1);
        this.three.lights.push(pointLight1);
        
        // 点光源二（霓虹粉色微光）
        const pointLight2 = new THREE.PointLight(0xf43f5e, 1.2, 30);
        pointLight2.position.set(8, -2, 8);
        this.three.scene.add(pointLight2);
        this.three.lights.push(pointLight2);
    }
    
    animate() {
        this.three.animationFrameId = requestAnimationFrame(() => this.animate());
        
        // 1. 轨道控制器平滑更新
        if (this.three.controls) {
            this.three.controls.update();
        }
        
        // 2. 调用当前活动模块的每帧更新逻辑
        if (this.activeModuleInstance && this.activeModuleInstance.update) {
            this.activeModuleInstance.update();
        }
        
        // 3. 渲染 3D 画面
        if (this.three.renderer && this.three.scene && this.three.camera) {
            this.three.renderer.render(this.three.scene, this.three.camera);
        }
    }
    
    switchModule(moduleKey) {
        if (this.activeModuleKey === moduleKey) return;
        
        // 1. 卸载当前处于激活状态的模块
        this.unloadActiveModule();
        
        this.activeModuleKey = moduleKey;
        const ModuleClass = this.modules[moduleKey];
        if (!ModuleClass) return;
        
        // 2. 隐藏/展示 2D/3D 画布容器
        const is2D = ModuleClass.is2DMode || false;
        if (is2D) {
            this.three.container.classList.add('hidden');
            this.canvas2d.container.classList.remove('hidden');
            this.handleResize2D();
        } else {
            this.canvas2d.container.classList.add('hidden');
            this.three.container.classList.remove('hidden');
            // 每次返回3D，重置相机到默认优雅位置
            this.three.camera.position.set(8, 6, 10);
            this.three.camera.lookAt(0, 0, 0);
            this.three.controls.target.set(0, 0, 0);
        }
        
        // 3. 更新侧边栏高亮状态
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('data-module') === moduleKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 4. 初始化新模块实例
        // 传递全局的 Three/Canvas 上下文与代数工具，供子模块自由调用
        this.activeModuleInstance = new ModuleClass({
            three: this.three,
            canvas2d: this.canvas2d,
            renderMath: (id, latex) => this.renderMath(id, latex),
            buildSliders: (sliders) => this.buildSliders(sliders),
            buildLegend: (legends) => this.buildLegend(legends),
            setPanelInfo: (title, desc, insight) => this.setPanelInfo(title, desc, insight)
        });
        
        if (this.activeModuleInstance.init) {
            this.activeModuleInstance.init();
        }
    }
    
    unloadActiveModule() {
        if (!this.activeModuleInstance) return;
        
        // 1. 释放模块自身的特定资源和事件绑定
        if (this.activeModuleInstance.destroy) {
            this.activeModuleInstance.destroy();
        }
        
        // 2. 清理 Three.js 场景中模块所添加的全部网格物体，保留基础光照
        const toRemove = [];
        this.three.scene.traverse(child => {
            if (child.isMesh || child.isLine || child.isGridHelper || child.isGroup || child.isArrowHelper) {
                // 如果不是基础光照，则加入清理列表
                toRemove.push(child);
            }
        });
        
        toRemove.forEach(obj => {
            this.three.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        // 3. 清理 2D 绘图区
        this.canvas2d.ctx.clearRect(0, 0, this.canvas2d.canvas.width, this.canvas2d.canvas.height);
        
        // 4. 清理控制器 DOM 容器
        document.getElementById('controls-container').innerHTML = '';
        document.getElementById('mapping-legend').innerHTML = '';
        
        this.activeModuleInstance = null;
    }
    
    // ==========================================
    // UI 信息流注入工具方法
    // ==========================================
    
    // 使用 KaTeX 渲染公式
    renderMath(elementId, latexStr) {
        const el = document.getElementById(elementId);
        if (el) {
            try {
                katex.render(latexStr, el, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (err) {
                el.innerHTML = latexStr;
                console.error("KaTeX error: ", err);
            }
        }
    }
    
    // 设置模块介绍与考研视点
    setPanelInfo(title, desc, insightHtml) {
        document.getElementById('module-title').innerText = title;
        document.getElementById('module-desc').innerText = desc;
        document.getElementById('exam-insight-content').innerHTML = insightHtml;
    }
    
    // 动态生成滑块控制器
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
            
            // 绑定事件
            const slider = group.querySelector('input');
            const valueSpan = group.querySelector('.slider-value');
            
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                // 格式化输出
                const formattedVal = Math.round(val * 100) / 100;
                valueSpan.innerText = formattedVal;
                
                if (cfg.onChange) {
                    cfg.onChange(formattedVal);
                }
            });
        });
    }
    
    // 动态构建代数-几何映射图例
    buildLegend(legendConfigs) {
        const container = document.getElementById('mapping-legend');
        container.innerHTML = '';
        
        legendConfigs.forEach(cfg => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            // 映射标签
            const tag = document.createElement('div');
            tag.className = `legend-tag bg-${cfg.themeColor}`;
            tag.style.setProperty('--theme-color', `var(--color-${cfg.themeColor})`);
            tag.innerText = cfg.symbol;
            
            // 映射描述
            const desc = document.createElement('div');
            desc.className = 'legend-desc';
            desc.innerHTML = `<strong>${cfg.title}</strong>：${cfg.desc}`;
            
            item.appendChild(tag);
            item.appendChild(desc);
            
            // 绑定交互反馈：鼠标悬停在图例卡片上，触发全局对应的高亮样式
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
    
    // ==========================================
    // 视口改变事件管理
    // ==========================================
    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const moduleKey = btn.getAttribute('data-module');
                this.switchModule(moduleKey);
            });
        });
    }
    
    handleResize() {
        const is2D = this.modules[this.activeModuleKey].is2DMode || false;
        if (is2D) {
            this.handleResize2D();
        } else {
            this.handleResizeThree();
        }
    }
    
    handleResizeThree() {
        const width = this.three.container.clientWidth;
        const height = this.three.container.clientHeight;
        
        this.three.camera.aspect = width / height;
        this.three.camera.updateProjectionMatrix();
        
        this.three.renderer.setSize(width, height);
    }
    
    handleResize2D() {
        const width = this.canvas2d.container.clientWidth;
        const height = this.canvas2d.container.clientHeight;
        
        this.canvas2d.canvas.width = width;
        this.canvas2d.canvas.height = height;
        
        // 重新调用活动模块的2D绘制
        if (this.activeModuleInstance && this.activeModuleInstance.draw) {
            this.activeModuleInstance.draw();
        }
    }
}

// 页面加载完成后自动运行
window.addEventListener('DOMContentLoaded', () => {
    window.AppInstance = new App();
});
