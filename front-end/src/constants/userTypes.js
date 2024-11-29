export const USER_TYPES = {
    STUDENT: 'STUDENT',
    TEACHER: 'TEACHER',
};

// 定义每种用户类型的路由配置
export const USER_ROUTES = {
    [USER_TYPES.STUDENT]: [
        { path: '/wallet', icon: 'fas fa-user', label: 'Wallet' },
        { path: '/student_courses', icon: 'fas fa-book', label: 'My Courses' },
        { path: '/student_register_courses', icon: 'fas fa-book', label: 'Register Course' },
    ],
    [USER_TYPES.TEACHER]: [
        { path: '/teacher_courses', icon: 'fas fa-chalkboard-teacher', label: 'Teaching Courses' },
        { path: '/teacher_register_courses', icon: 'fas fa-book', label: 'Register Course' },
    ]
};

// 定义每种用户类型的默认首页路由
export const DEFAULT_ROUTES = {
    [USER_TYPES.STUDENT]: '/student_courses',
    [USER_TYPES.TEACHER]: '/teacher_courses'
};
