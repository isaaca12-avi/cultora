import { http } from "./api";

export const adminApi = {
  me: () => http.get("/admin/me").then((r) => r.data),
  dashboard: () => http.get("/admin/dashboard").then((r) => r.data),

  rbac: {
    permissions: () => http.get("/admin/rbac/permissions").then((r) => r.data),
    roles: () => http.get("/admin/rbac/roles").then((r) => r.data),
  },

  users: {
    list: (params) => http.get("/admin/users", { params }).then((r) => r.data),
    get: (uid) => http.get(`/admin/users/${uid}`).then((r) => r.data),
    create: (payload) => http.post("/admin/users", payload).then((r) => r.data),
    setRole: (uid, role) => http.put(`/admin/users/${uid}/role`, { role }).then((r) => r.data),
    setStatus: (uid, status, reason) =>
      http.put(`/admin/users/${uid}/status`, { status, reason }).then((r) => r.data),
  },

  agents: {
    list: (params) => http.get("/admin/agents", { params }).then((r) => r.data),
    setStatus: (uid, status, note) =>
      http.put(`/admin/agents/${uid}/status`, { status, note }).then((r) => r.data),
    verify: (uid, verified) =>
      http.put(`/admin/agents/${uid}/verify`, { verified }).then((r) => r.data),
  },

  forum: {
    list: (params) => http.get("/admin/forum/topics", { params }).then((r) => r.data),
    update: (tid, payload) => http.put(`/admin/forum/topics/${tid}`, payload).then((r) => r.data),
    remove: (tid) => http.delete(`/admin/forum/topics/${tid}`).then((r) => r.data),
  },

  convocatorias: {
    list: (params) => http.get("/admin/convocatorias", { params }).then((r) => r.data),
    get: (cid) => http.get(`/admin/convocatorias/${cid}`).then((r) => r.data),
    create: (payload) => http.post("/admin/convocatorias", payload).then((r) => r.data),
    update: (cid, payload) => http.put(`/admin/convocatorias/${cid}`, payload).then((r) => r.data),
    setStatus: (cid, status, publish_at) =>
      http.put(`/admin/convocatorias/${cid}/status`, { status, publish_at }).then((r) => r.data),
    duplicate: (cid) => http.post(`/admin/convocatorias/${cid}/duplicate`).then((r) => r.data),
  },

  resources: {
    list: (params) => http.get("/admin/resources", { params }).then((r) => r.data),
    create: (payload) => http.post("/admin/resources", payload).then((r) => r.data),
    update: (rid, payload) => http.put(`/admin/resources/${rid}`, payload).then((r) => r.data),
    remove: (rid) => http.delete(`/admin/resources/${rid}`).then((r) => r.data),
  },

  spaces: {
    list: (params) => http.get("/admin/spaces", { params }).then((r) => r.data),
    create: (payload) => http.post("/admin/spaces", payload).then((r) => r.data),
    update: (sid, payload) => http.put(`/admin/spaces/${sid}`, payload).then((r) => r.data),
    remove: (sid) => http.delete(`/admin/spaces/${sid}`).then((r) => r.data),
  },

  analytics: () => http.get("/admin/analytics").then((r) => r.data),

  config: {
    get: () => http.get("/admin/config").then((r) => r.data),
    set: (key, values) => http.put("/admin/config", { key, values }).then((r) => r.data),
  },

  activity: {
    list: (params) => http.get("/admin/activity", { params }).then((r) => r.data),
  },

  search: (q) => http.get("/admin/search", { params: { q } }).then((r) => r.data),

  agentDetail: (uid) => http.get(`/admin/agents/${uid}`).then((r) => r.data),
  topicDetail: (tid) => http.get(`/admin/forum/topics/${tid}`).then((r) => r.data),
  resourceDetail: (rid) => http.get(`/admin/resources/${rid}`).then((r) => r.data),
  spaceDetail: (sid) => http.get(`/admin/spaces/${sid}`).then((r) => r.data),

  roles: {
    listAll: () => http.get("/admin/rbac/roles/all").then((r) => r.data),
    permissions: () => http.get("/admin/rbac/permissions").then((r) => r.data),
    create: (payload) => http.post("/admin/rbac/roles", payload).then((r) => r.data),
    update: (key, payload) => http.put(`/admin/rbac/roles/${key}`, payload).then((r) => r.data),
    remove: (key) => http.delete(`/admin/rbac/roles/${key}`).then((r) => r.data),
  },

  userPermsOverride: (uid, permissions) =>
    http.put(`/admin/users/${uid}/permissions`, { permissions }).then((r) => r.data),

  notifications: {
    list: (params) => http.get("/admin/notifications", { params }).then((r) => r.data),
    unreadCount: () => http.get("/admin/notifications/unread-count").then((r) => r.data),
    read: (nid) => http.post(`/admin/notifications/${nid}/read`).then((r) => r.data),
    dismiss: (nid) => http.post(`/admin/notifications/${nid}/dismiss`).then((r) => r.data),
    markAllRead: () => http.post("/admin/notifications/mark-all-read").then((r) => r.data),
  },

  motor: {
    kb: {
      list: (params) => http.get("/admin/motor/kb/documents", { params }).then((r) => r.data),
      get: (did) => http.get(`/admin/motor/kb/documents/${did}`).then((r) => r.data),
      create: (payload) => http.post("/admin/motor/kb/documents", payload).then((r) => r.data),
      update: (did, payload) => http.put(`/admin/motor/kb/documents/${did}`, payload).then((r) => r.data),
      authorize: (did, is_authoritative) => http.put(`/admin/motor/kb/documents/${did}/authorize`, { is_authoritative }).then((r) => r.data),
      remove: (did) => http.delete(`/admin/motor/kb/documents/${did}`).then((r) => r.data),
      search: (payload) => http.post("/admin/motor/kb/search", payload).then((r) => r.data),
      stats: () => http.get("/admin/motor/kb/stats").then((r) => r.data),
      extractFiles: (files) => {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        return http.post("/admin/motor/kb/extract-files", fd).then((r) => r.data);
      },
    },
    rules: {
      list: (goal_key) => http.get("/admin/motor/rules", { params: goal_key ? { goal_key } : {} }).then((r) => r.data),
      create: (payload) => http.post("/admin/motor/rules", payload).then((r) => r.data),
      update: (rid, payload) => http.put(`/admin/motor/rules/${rid}`, payload).then((r) => r.data),
      remove: (rid) => http.delete(`/admin/motor/rules/${rid}`).then((r) => r.data),
    },
    questions: (goal_key) => http.get(`/admin/motor/questions/${goal_key}`).then((r) => r.data),
    simulate: (payload) => http.post("/admin/motor/simulate", payload).then((r) => r.data),
    status: () => http.get("/admin/motor/status").then((r) => r.data),
  },

  changePassword: (current_password, new_password) =>
    http.post("/admin/me/change-password", { current_password, new_password }).then((r) => r.data),
};
