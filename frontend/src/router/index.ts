import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { roles: ['admin', 'supervisor', 'salesman'] },
  },
  {
    path: '/companies',
    name: 'Companies',
    component: () => import('@/views/CompaniesView.vue'),
    meta: { roles: ['admin', 'supervisor', 'salesman'] },
  },
  {
    path: '/companies/:id',
    name: 'CompanyDetail',
    component: () => import('@/views/CompanyDetailView.vue'),
    meta: { roles: ['admin', 'supervisor', 'salesman'] },
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { roles: ['admin', 'supervisor', 'salesman'] },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('@/views/StatisticsView.vue'),
    meta: { roles: ['admin', 'supervisor', 'salesman'] },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { roles: ['admin'] },
  },
  {
    path: '/supervisor',
    name: 'Supervisor',
    component: () => import('@/views/SupervisorView.vue'),
    meta: { roles: ['admin', 'supervisor'] },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let authChecked = false;

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Only try to fetch user once per session
  if (!authChecked) {
    authChecked = true;
    await authStore.fetchMe();
  }

  if (to.meta.public) {
    if (authStore.isAuthenticated && to.name === 'Login') {
      const role = authStore.userRole;
      if (role === 'admin') return next('/admin');
      if (role === 'supervisor') return next('/supervisor');
      return next('/dashboard');
    }
    return next();
  }

  if (!authStore.isAuthenticated) {
    return next('/login');
  }

  const allowedRoles = to.meta.roles as string[] | undefined;
  if (allowedRoles && !allowedRoles.includes(authStore.userRole!)) {
    return next('/dashboard');
  }

  next();
});

export default router;
