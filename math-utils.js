/**
 * 考研线性代数核心代数计算工具库
 * (Math Utilities for Linear Algebra Visualizer)
 */

export const MathUtils = {
    // ==========================================
    // 向量基础运算 (Vector Operations)
    // ==========================================
    
    // 向量相加
    vecAdd(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    },
    
    // 向量相减
    vecSub(v1, v2) {
        return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
    },
    
    // 向量数乘
    vecScale(v, s) {
        return [v[0] * s, v[1] * s, v[2] * s];
    },
    
    // 向量内积 (点积)
    vecDot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + (v1[2] !== undefined ? v1[2] * v2[2] : 0);
    },
    
    // 向量外积 (叉积 - 仅限3D)
    vecCross(v1, v2) {
        return [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    },
    
    // 向量长度
    vecLength(v) {
        const sum = v[0] * v[0] + v[1] * v[1] + (v[2] !== undefined ? v[2] * v[2] : 0);
        return Math.sqrt(sum);
    },
    
    // 向量单位化
    vecNormalize(v) {
        const len = this.vecLength(v);
        if (len < 1e-8) return [0, 0, 0];
        return [v[0] / len, v[1] / len, (v[2] !== undefined ? v[2] / len : 0)];
    },

    // ==========================================
    // 矩阵运算 (Matrix Operations)
    // ==========================================
    
    // 2x2 行列式
    det2(m) {
        // m: [a, b, c, d] 表示 [ [a, b], [c, d] ]
        return m[0] * m[3] - m[1] * m[2];
    },
    
    // 3x3 行列式 (Sarrus法则)
    det3(m) {
        // m: 9个元素的一维数组，按行排列：
        // [ m0, m1, m2,
        //   m3, m4, m5,
        //   m6, m7, m8 ]
        return m[0] * (m[4] * m[8] - m[5] * m[7]) -
               m[1] * (m[3] * m[8] - m[5] * m[6]) +
               m[2] * (m[3] * m[7] - m[4] * m[6]);
    },
    
    // 矩阵乘以向量 (3D)
    matMulVec(m, v) {
        // m: 3x3 矩阵，一维排列
        // v: 3D 向量
        const z = v[2] !== undefined ? v[2] : 0;
        return [
            m[0] * v[0] + m[1] * v[1] + m[2] * z,
            m[3] * v[0] + m[4] * v[1] + m[5] * z,
            m[6] * v[0] + m[7] * v[1] + m[8] * z
        ];
    },
    
    // 2x2 矩阵乘以 2D 向量
    matMulVec2(m, v) {
        // m: [m0, m1, m2, m3] -> [[m0, m1], [m2, m3]]
        return [
            m[0] * v[0] + m[1] * v[1],
            m[2] * v[0] + m[3] * v[1]
        ];
    },

    // 3x3 矩阵相乘 (C = A * B)
    matMulMat3(a, b) {
        const c = new Array(9).fill(0);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                c[i * 3 + j] = a[i * 3 + 0] * b[0 * 3 + j] +
                              a[i * 3 + 1] * b[1 * 3 + j] +
                              a[i * 3 + 2] * b[2 * 3 + j];
            }
        }
        return c;
    },
    
    // 3x3 矩阵求逆
    invertMat3(m) {
        const d = this.det3(m);
        if (Math.abs(d) < 1e-8) return null; // 不可逆
        
        const inv = new Array(9);
        inv[0] = (m[4] * m[8] - m[5] * m[7]) / d;
        inv[1] = (m[2] * m[7] - m[1] * m[8]) / d;
        inv[2] = (m[1] * m[5] - m[2] * m[4]) / d;
        inv[3] = (m[5] * m[6] - m[3] * m[8]) / d;
        inv[4] = (m[0] * m[8] - m[2] * m[6]) / d;
        inv[5] = (m[2] * m[3] - m[0] * m[5]) / d;
        inv[6] = (m[3] * m[7] - m[4] * m[6]) / d;
        inv[7] = (m[1] * m[6] - m[0] * m[7]) / d;
        inv[8] = (m[0] * m[4] - m[1] * m[3]) / d;
        
        return inv;
    },

    // ==========================================
    // 特征值与特征向量求解 (Eigenvalues & Eigenvectors)
    // ==========================================
    
    // 2x2 实对称/非对称矩阵特征值与特征向量求解
    solveEigen2(a, b, c, d) {
        // 矩阵 [[a, b], [c, d]]
        const trace = a + d;
        const det = a * d - b * c;
        const discriminant = trace * trace - 4 * det;
        
        if (discriminant < 0) {
            // 复特征值，考研主要考察实对称矩阵，我们返回实部
            return {
                eigVals: [trace / 2, trace / 2],
                eigVecs: [[1, 0], [0, 1]],
                isReal: false
            };
        }
        
        const root = Math.sqrt(discriminant);
        const l1 = (trace + root) / 2;
        const l2 = (trace - root) / 2;
        
        let v1, v2;
        
        // 特征向量求解 (Av = lv) -> (A - lI)v = 0
        if (Math.abs(c) > 1e-8) {
            v1 = [l1 - d, c];
            v2 = [l2 - d, c];
        } else if (Math.abs(b) > 1e-8) {
            v1 = [b, l1 - a];
            v2 = [b, l2 - a];
        } else {
            // 对角矩阵
            v1 = [1, 0];
            v2 = [0, 1];
        }
        
        return {
            eigVals: [l1, l2],
            eigVecs: [this.vecNormalize(v1), this.vecNormalize(v2)],
            isReal: true
        };
    },

    // 3x3 实对称矩阵的雅可比(Jacobi)旋转法求解特征值与特征向量
    // 非常稳定且适合 3D 二次曲面主轴对角化
    solveSymmetricEigen3(mat) {
        // mat: 9个元素的一维数组，必须是对称矩阵：mat[1]=mat[3], mat[2]=mat[6], mat[5]=mat[7]
        // 复制矩阵避免副作用
        const A = [...mat];
        const V = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]; // 特征向量矩阵，初始为单位矩阵
        
        const maxRotations = 50;
        const eps = 1e-8;
        
        for (let iter = 0; iter < maxRotations; iter++) {
            // 1. 寻找非对角线上绝对值最大的元素 A[p][q]
            let maxVal = 0;
            let p = -1, q = -1;
            
            for (let i = 0; i < 3; i++) {
                for (let j = i + 1; j < 3; j++) {
                    const idx = i * 3 + j;
                    if (Math.abs(A[idx]) > maxVal) {
                        maxVal = Math.abs(A[idx]);
                        p = i;
                        q = j;
                    }
                }
            }
            
            // 如果最大的非对角元素已经足够小，则退出
            if (maxVal < eps) break;
            
            // 2. 计算旋转角 theta
            const app = A[p * 3 + p];
            const aqq = A[q * 3 + q];
            const apq = A[p * 3 + q];
            
            let phi = 0.5 * Math.atan2(2 * apq, aqq - app);
            const c = Math.cos(phi);
            const s = Math.sin(phi);
            
            // 3. 更新 A 矩阵
            // A_new = J^T * A * J
            const Ap = [...A];
            
            A[p * 3 + p] = c * c * app - 2 * s * c * apq + s * s * aqq;
            A[q * 3 + q] = s * s * app + 2 * s * c * apq + c * c * aqq;
            A[p * 3 + q] = 0;
            A[q * 3 + p] = 0;
            
            for (let r = 0; r < 3; r++) {
                if (r !== p && r !== q) {
                    A[r * 3 + p] = c * Ap[r * 3 + p] - s * Ap[r * 3 + q];
                    A[p * 3 + r] = A[r * 3 + p];
                    
                    A[r * 3 + q] = s * Ap[r * 3 + p] + c * Ap[r * 3 + q];
                    A[q * 3 + r] = A[r * 3 + q];
                }
            }
            
            // 4. 更新特征向量矩阵 V (V = V * J)
            for (let r = 0; r < 3; r++) {
                const vrp = V[r * 3 + p];
                const vrq = V[r * 3 + q];
                V[r * 3 + p] = c * vrp - s * vrq;
                V[r * 3 + q] = s * vrp + c * vrq;
            }
        }
        
        // 提取对角线上的特征值
        const eigVals = [A[0], A[4], A[8]];
        // 提取列向量作为特征向量
        const eigVecs = [
            [V[0], V[3], V[6]], // e1
            [V[1], V[4], V[7]], // e2
            [V[2], V[5], V[8]]  // e3
        ];
        
        // 归一化特征向量
        const normalizedVecs = eigVecs.map(v => this.vecNormalize(v));
        
        return {
            eigVals,
            eigVecs: normalizedVecs
        };
    },

    // ==========================================
    // 施密特正交化算法 (Schmidt Orthogonalization)
    // ==========================================
    gramSchmidt(a1, a2, a3) {
        // step 1: b1 = a1
        const b1 = [...a1];
        
        // step 2: b2 = a2 - proj_b1(a2)
        const dot21 = this.vecDot(a2, b1);
        const lenSq1 = this.vecDot(b1, b1);
        const proj21 = lenSq1 > 1e-8 ? this.vecScale(b1, dot21 / lenSq1) : [0,0,0];
        const b2 = this.vecSub(a2, proj21);
        
        // step 3: b3 = a3 - proj_b1(a3) - proj_b2(a3)
        const dot31 = this.vecDot(a3, b1);
        const proj31 = lenSq1 > 1e-8 ? this.vecScale(b1, dot31 / lenSq1) : [0,0,0];
        
        const dot32 = this.vecDot(a3, b2);
        const lenSq2 = this.vecDot(b2, b2);
        const proj32 = lenSq2 > 1e-8 ? this.vecScale(b2, dot32 / lenSq2) : [0,0,0];
        
        const b3 = this.vecSub(this.vecSub(a3, proj31), proj32);
        
        // 单位化 (e1, e2, e3)
        const e1 = this.vecNormalize(b1);
        const e2 = this.vecNormalize(b2);
        const e3 = this.vecNormalize(b3);
        
        return {
            b: [b1, b2, b3],
            e: [e1, e2, e3],
            projections: {
                proj21,
                proj31,
                proj32
            }
        };
    },

    // ==========================================
    // 3D 平面求交点/交线算法 (Equations Solver)
    // ==========================================
    solve3Planes(eq1, eq2, eq3) {
        // eq: {a, b, c, d} -> ax + by + cz = d
        const m = [
            eq1.a, eq1.b, eq1.c,
            eq2.a, eq2.b, eq2.c,
            eq3.a, eq3.b, eq3.c
        ];
        
        const d = [eq1.d, eq2.d, eq3.d];
        const det = this.det3(m);
        
        // 唯一解
        if (Math.abs(det) > 1e-6) {
            const mX = [
                eq1.d, eq1.b, eq1.c,
                eq2.d, eq2.b, eq2.c,
                eq3.d, eq3.b, eq3.c
            ];
            const mY = [
                eq1.a, eq1.d, eq1.c,
                eq2.a, eq2.d, eq2.c,
                eq3.a, eq3.d, eq3.c
            ];
            const mZ = [
                eq1.a, eq1.b, eq1.d,
                eq2.a, eq2.b, eq2.d,
                eq3.a, eq3.b, eq3.d
            ];
            
            return {
                type: 'unique',
                point: [this.det3(mX) / det, this.det3(mY) / det, this.det3(mZ) / det],
                det
            };
        }
        
        // 行列式为0: 无解或无穷多解
        // 我们利用法向量重合度和秩的判别
        const n1 = [eq1.a, eq1.b, eq1.c];
        const n2 = [eq2.a, eq2.b, eq2.c];
        const n3 = [eq3.a, eq3.b, eq3.c];
        
        // 检查是否有平行平面但常数项不同 -> 无解
        const checkParallel = (u, du, v, dv) => {
            const cross = this.vecCross(u, v);
            if (this.vecLength(cross) < 1e-4) {
                // 方向平行
                const ratio = u[0] !== 0 ? v[0]/u[0] : (u[1] !== 0 ? v[1]/u[1] : v[2]/u[2]);
                if (Math.abs(dv - du * ratio) > 1e-3) {
                    return 'parallel_no_solution'; // 严格平行无解
                }
                return 'coincident'; // 重合
            }
            return 'intersecting';
        };
        
        const r12 = checkParallel(n1, eq1.d, n2, eq2.d);
        const r13 = checkParallel(n1, eq1.d, n3, eq3.d);
        const r23 = checkParallel(n2, eq2.d, n3, eq3.d);
        
        if (r12 === 'parallel_no_solution' || r13 === 'parallel_no_solution' || r23 === 'parallel_no_solution') {
            return { type: 'parallel', det: 0 };
        }
        
        // 检查是否三平面交于一线（无穷多解）
        // 如果两两不平行，但行列式为0，说明法向量共面。
        // 这对应两种情况：三面交于一线，或两两交线互相平行（三棱柱，无解）。
        const lineDir = this.vecNormalize(this.vecCross(n1, n2));
        if (this.vecLength(this.vecCross(n1, n2)) > 1e-4) {
            // 平面1与平面2交于一条线。
            // 找这条线上的一点
            // 令 z = 0, 解二阶线性方程组
            const det2D = n1[0]*n2[1] - n1[1]*n2[0];
            let p0 = [0, 0, 0];
            if (Math.abs(det2D) > 1e-4) {
                p0 = [
                    (eq1.d*n2[1] - eq2.d*n1[1]) / det2D,
                    (n1[0]*eq2.d - n2[0]*eq1.d) / det2D,
                    0
                ];
            } else {
                // z不为0，令 x = 0
                const det2D_yz = n1[1]*n2[2] - n1[2]*n2[1];
                if (Math.abs(det2D_yz) > 1e-4) {
                    p0 = [
                        0,
                        (eq1.d*n2[2] - eq2.d*n1[2]) / det2D_yz,
                        (n1[1]*eq2.d - n2[1]*eq1.d) / det2D_yz
                    ];
                }
            }
            
            // 检验平面3是否穿过这条交线：即该点 p0 是否在面3上，且线方向与面3法向量垂直
            const distP0ToPlane3 = n3[0]*p0[0] + n3[1]*p0[1] + n3[2]*p0[2] - eq3.d;
            if (Math.abs(distP0ToPlane3) < 1e-3 && Math.abs(this.vecDot(lineDir, n3)) < 1e-4) {
                return {
                    type: 'infinite_line',
                    point: p0,
                    direction: lineDir,
                    det: 0
                };
            } else {
                // 两两交线平行但互不重合（三棱柱形状）
                return {
                    type: 'prism',
                    det: 0,
                    lines: [
                        { p: p0, d: lineDir }, // P1 ∩ P2
                        // 其他交线方向相同，位置不同
                    ]
                };
            }
        }
        
        // 全重合面（无穷多解，自由未知量为2）
        if (r12 === 'coincident' && r13 === 'coincident') {
            return {
                type: 'infinite_plane',
                plane: eq1,
                det: 0
            };
        }
        
        return { type: 'no_solution', det: 0 };
    }
};
