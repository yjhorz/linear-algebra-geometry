/**
 * 考研线性代数核心代数计算工具库 (全大纲多维版本)
 * (Math Utilities for Linear Algebra Visualizer)
 */

export const MathUtils = {
    // ==========================================
    // 向量基础运算 (Vector Operations)
    // ==========================================
    
    vecAdd(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1], (v1[2] !== undefined ? v1[2] + v2[2] : 0)];
    },
    
    vecSub(v1, v2) {
        return [v1[0] - v2[0], v1[1] - v2[1], (v1[2] !== undefined ? v1[2] - v2[2] : 0)];
    },
    
    vecScale(v, s) {
        return [v[0] * s, v[1] * s, (v[2] !== undefined ? v[2] * s : 0)];
    },
    
    vecDot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + (v1[2] !== undefined ? v1[2] * v2[2] : 0);
    },
    
    vecCross(v1, v2) {
        return [
            v1[1] * (v2[2] || 0) - (v1[2] || 0) * v2[1],
            (v1[2] || 0) * v2[0] - v1[0] * (v2[2] || 0),
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    },
    
    vecLength(v) {
        const sum = v[0] * v[0] + v[1] * v[1] + (v[2] !== undefined ? v[2] * v[2] : 0);
        return Math.sqrt(sum);
    },
    
    vecNormalize(v) {
        const len = this.vecLength(v);
        if (len < 1e-8) return [0, 0, 0];
        return [v[0] / len, v[1] / len, (v[2] !== undefined ? v[2] / len : 0)];
    },

    // ==========================================
    // 矩阵基础运算 (Matrix Operations)
    // ==========================================
    
    det2(m) {
        // m: [a, b, c, d] -> [[a, b], [c, d]]
        return m[0] * m[3] - m[1] * m[2];
    },
    
    det3(m) {
        // m: 一维数组形式的 3x3 矩阵
        return m[0] * (m[4] * m[8] - m[5] * m[7]) -
               m[1] * (m[3] * m[8] - m[5] * m[6]) +
               m[2] * (m[3] * m[7] - m[4] * m[6]);
    },
    
    matMulVec(m, v) {
        // m: 3x3, v: 3D
        const z = v[2] !== undefined ? v[2] : 0;
        return [
            m[0] * v[0] + m[1] * v[1] + m[2] * z,
            m[3] * v[0] + m[4] * v[1] + m[5] * z,
            m[6] * v[0] + m[7] * v[1] + m[8] * z
        ];
    },
    
    matMulVec2(m, v) {
        // m: 2x2, v: 2D
        return [
            m[0] * v[0] + m[1] * v[1],
            m[2] * v[0] + m[3] * v[1]
        ];
    },

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
    
    // 3x3 矩阵转置 (Transpose)
    transpose3(m) {
        return [
            m[0], m[3], m[6],
            m[1], m[4], m[7],
            m[2], m[5], m[8]
        ];
    },
    
    // 3x3 矩阵伴随 (Adjoint Matrix A*)
    adjoint3(m) {
        const adj = new Array(9);
        
        // 伴随矩阵是余子式转置 A* = C^T
        // 计算每个元素的代数余子式并直接放在转置位置上
        adj[0] = (m[4] * m[8] - m[5] * m[7]); // C_11
        adj[1] = -(m[1] * m[8] - m[2] * m[7]); // C_21 (注意是转置位置)
        adj[2] = (m[1] * m[5] - m[2] * m[4]); // C_31
        
        adj[3] = -(m[3] * m[8] - m[5] * m[6]); // C_12
        adj[4] = (m[0] * m[8] - m[2] * m[6]); // C_22
        adj[5] = -(m[0] * m[5] - m[2] * m[3]); // C_32
        
        adj[6] = (m[3] * m[7] - m[4] * m[6]); // C_13
        adj[7] = -(m[0] * m[7] - m[1] * m[6]); // C_23
        adj[8] = (m[0] * m[4] - m[1] * m[3]); // C_33
        
        return adj;
    },
    
    invertMat3(m) {
        const d = this.det3(m);
        if (Math.abs(d) < 1e-8) return null; // 不可逆
        
        // A^-1 = A* / |A|
        const adj = this.adjoint3(m);
        return adj.map(x => x / d);
    },

    // ==========================================
    // 特征值与特征向量求解 (Eigenvalues & Eigenvectors)
    // ==========================================
    
    solveEigen2(a, b, c, d) {
        // 矩阵 [[a, b], [c, d]]
        const trace = a + d;
        const det = a * d - b * c;
        const discriminant = trace * trace - 4 * det;
        
        if (discriminant < 0) {
            // 复特征值，考研只考实特征值，返回实部方便展示
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
        
        if (Math.abs(c) > 1e-8) {
            v1 = [l1 - d, c];
            v2 = [l2 - d, c];
        } else if (Math.abs(b) > 1e-8) {
            v1 = [b, l1 - a];
            v2 = [b, l2 - a];
        } else {
            v1 = [1, 0];
            v2 = [0, 1];
        }
        
        return {
            eigVals: [l1, l2],
            eigVecs: [this.vecNormalize(v1), this.vecNormalize(v2)],
            isReal: true
        };
    },

    solveSymmetricEigen3(mat) {
        // mat: 一维数组形式的实对称矩阵
        const A = [...mat];
        const V = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]; 
        
        const maxRotations = 50;
        const eps = 1e-8;
        
        for (let iter = 0; iter < maxRotations; iter++) {
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
            
            if (maxVal < eps) break;
            
            const app = A[p * 3 + p];
            const aqq = A[q * 3 + q];
            const apq = A[p * 3 + q];
            
            let phi = 0.5 * Math.atan2(2 * apq, aqq - app);
            const c = Math.cos(phi);
            const s = Math.sin(phi);
            
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
            
            for (let r = 0; r < 3; r++) {
                const vrp = V[r * 3 + p];
                const vrq = V[r * 3 + q];
                V[r * 3 + p] = c * vrp - s * vrq;
                V[r * 3 + q] = s * vrp + c * vrq;
            }
        }
        
        const eigVals = [A[0], A[4], A[8]];
        const eigVecs = [
            [V[0], V[3], V[6]],
            [V[1], V[4], V[7]],
            [V[2], V[5], V[8]]
        ];
        
        return {
            eigVals,
            eigVecs: eigVecs.map(v => this.vecNormalize(v))
        };
    },

    // ==========================================
    // 施密特正交化算法 (Schmidt Orthogonalization)
    // ==========================================
    gramSchmidt(a1, a2, a3) {
        const b1 = [...a1];
        
        const dot21 = this.vecDot(a2, b1);
        const lenSq1 = this.vecDot(b1, b1);
        const proj21 = lenSq1 > 1e-8 ? this.vecScale(b1, dot21 / lenSq1) : [0,0,0];
        const b2 = this.vecSub(a2, proj21);
        
        const dot31 = this.vecDot(a3, b1);
        const proj31 = lenSq1 > 1e-8 ? this.vecScale(b1, dot31 / lenSq1) : [0,0,0];
        
        const dot32 = this.vecDot(a3, b2);
        const lenSq2 = this.vecDot(b2, b2);
        const proj32 = lenSq2 > 1e-8 ? this.vecScale(b2, dot32 / lenSq2) : [0,0,0];
        
        const b3 = this.vecSub(this.vecSub(a3, proj31), proj32);
        
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
        const m = [
            eq1.a, eq1.b, eq1.c,
            eq2.a, eq2.b, eq2.c,
            eq3.a, eq3.b, eq3.c
        ];
        
        const det = this.det3(m);
        
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
        
        const n1 = [eq1.a, eq1.b, eq1.c];
        const n2 = [eq2.a, eq2.b, eq2.c];
        const n3 = [eq3.a, eq3.b, eq3.c];
        
        const checkParallel = (u, du, v, dv) => {
            const cross = this.vecCross(u, v);
            if (this.vecLength(cross) < 1e-4) {
                const ratio = u[0] !== 0 ? v[0]/u[0] : (u[1] !== 0 ? v[1]/u[1] : v[2]/u[2]);
                if (Math.abs(dv - du * ratio) > 1e-3) {
                    return 'parallel_no_solution'; 
                }
                return 'coincident'; 
            }
            return 'intersecting';
        };
        
        const r12 = checkParallel(n1, eq1.d, n2, eq2.d);
        const r13 = checkParallel(n1, eq1.d, n3, eq3.d);
        const r23 = checkParallel(n2, eq2.d, n3, eq3.d);
        
        if (r12 === 'parallel_no_solution' || r13 === 'parallel_no_solution' || r23 === 'parallel_no_solution') {
            return { type: 'parallel', det: 0 };
        }
        
        const lineDir = this.vecNormalize(this.vecCross(n1, n2));
        if (this.vecLength(this.vecCross(n1, n2)) > 1e-4) {
            const det2D = n1[0]*n2[1] - n1[1]*n2[0];
            let p0 = [0, 0, 0];
            if (Math.abs(det2D) > 1e-4) {
                p0 = [
                    (eq1.d*n2[1] - eq2.d*n1[1]) / det2D,
                    (n1[0]*eq2.d - n2[0]*eq1.d) / det2D,
                    0
                ];
            } else {
                const det2D_yz = n1[1]*n2[2] - n1[2]*n2[1];
                if (Math.abs(det2D_yz) > 1e-4) {
                    p0 = [
                        0,
                        (eq1.d*n2[2] - eq2.d*n1[2]) / det2D_yz,
                        (n1[1]*eq2.d - n2[1]*eq1.d) / det2D_yz
                    ];
                }
            }
            
            const distP0ToPlane3 = n3[0]*p0[0] + n3[1]*p0[1] + n3[2]*p0[2] - eq3.d;
            if (Math.abs(distP0ToPlane3) < 1e-3 && Math.abs(this.vecDot(lineDir, n3)) < 1e-4) {
                return {
                    type: 'infinite_line',
                    point: p0,
                    direction: lineDir,
                    det: 0
                };
            } else {
                return {
                    type: 'prism',
                    det: 0,
                    point: p0,
                    direction: lineDir
                };
            }
        }
        
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
