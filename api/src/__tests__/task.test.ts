import request from 'supertest';
import { createTestApp } from './helpers/testApp';
import { createTestAdmin, createTestUser, createTestTask, getAuthToken, getNotificationsForUser, clearNotifications } from './helpers/testData';

const app = createTestApp();

describe('Task Controller', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const { admin, org } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task',
          description: 'Task description',
          status: 'Pending'
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.title).toBe('New Task');
      expect(response.body.task.org_id).toBe(org.id);
      expect(response.body.task.created_by).toBe(admin.id);
    });

    it('should create a task with multiple assignees', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id });
      const member2 = await createTestUser({ org_id: org.id });
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Multi-Assignee Task',
          description: 'Task with multiple assignees',
          status: 'Pending',
          assigned_to: [member1.id, member2.id]
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.assignees).toHaveLength(2);
      expect(response.body.task.assignees.map((a: any) => a.id).sort()).toEqual([member1.id, member2.id].sort());
    });

    it('should fail without title', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Task description'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Title is required');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'New Task'
        });

      expect(response.status).toBe(401);
    });

    it('should fail if user has no organization', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task'
        });

      expect(response.status).toBe(403);
    });

    it('should fail if assigned_to is not in same organization', async () => {
      const { admin, org } = await createTestAdmin();
      const otherUser = await createTestUser();
      const token = getAuthToken(admin);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task',
          assigned_to: [otherUser.id]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('member');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks for organization', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { title: 'Task 1' });
      await createTestTask(org.id, admin.id, { title: 'Task 2' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { title: 'Task 1', status: 'Pending' });
      await createTestTask(org.id, admin.id, { title: 'Task 2', status: 'Completed' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks?status=Pending')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('Pending');
    });

    it('should filter tasks by assigned user', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id });
      await createTestTask(org.id, admin.id, { title: 'Task 1', assigned_to: member.id });
      await createTestTask(org.id, admin.id, { title: 'Task 2' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get(`/api/tasks?assigned_to=${member.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].assignees.some((a: any) => a.id === member.id)).toBe(true);
    });

    it('should not return tasks from other organizations', async () => {
      const { admin: admin1, org: org1 } = await createTestAdmin();
      const { admin: admin2, org: org2 } = await createTestAdmin();
      await createTestTask(org1.id, admin1.id, { title: 'Org1 Task' });
      await createTestTask(org2.id, admin2.id, { title: 'Org2 Task' });
      const token = getAuthToken(admin1);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].title).toBe('Org1 Task');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by id', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id, { title: 'Test Task' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.task.id).toBe(task.id);
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should not return task from another organization', async () => {
      const { admin: admin1, org: org1 } = await createTestAdmin();
      const { admin: admin2, org: org2 } = await createTestAdmin();
      const task = await createTestTask(org2.id, admin2.id);
      const token = getAuthToken(admin1);

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id, { title: 'Original Title' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          status: 'In Progress'
        });

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Updated Title');
      expect(response.body.task.status).toBe('In Progress');
    });

    it('should update task assignees', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id });
      const member2 = await createTestUser({ org_id: org.id });
      const task = await createTestTask(org.id, admin.id, { title: 'Test Task', assigned_to: member1.id });
      const token = getAuthToken(admin);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assigned_to: [member1.id, member2.id]
        });

      expect(response.status).toBe(200);
      expect(response.body.task.assignees).toHaveLength(2);
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .put('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const { admin, org } = await createTestAdmin();
      const task = await createTestTask(org.id, admin.id);
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Task deleted successfully');
    });

    it('should return 404 for non-existent task', async () => {
      const { admin } = await createTestAdmin();
      const token = getAuthToken(admin);

      const response = await request(app)
        .delete('/api/tasks/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('should return task statistics', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestTask(org.id, admin.id, { status: 'Pending' });
      await createTestTask(org.id, admin.id, { status: 'In Progress' });
      await createTestTask(org.id, admin.id, { status: 'Completed' });
      await createTestTask(org.id, admin.id, { status: 'Completed' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(4);
      expect(response.body.stats.pending).toBe(1);
      expect(response.body.stats.inProgress).toBe(1);
      expect(response.body.stats.completed).toBe(2);
    });
  });

  describe('GET /api/tasks/users', () => {
    it('should return users in organization', async () => {
      const { admin, org } = await createTestAdmin();
      await createTestUser({ org_id: org.id, first_name: 'Member', last_name: 'One' });
      await createTestUser({ org_id: org.id, first_name: 'Member', last_name: 'Two' });
      const token = getAuthToken(admin);

      const response = await request(app)
        .get('/api/tasks/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(3); // admin + 2 members
    });
  });

  describe('Task Notifications', () => {
    beforeEach(async () => {
      await clearNotifications();
    });

    it('should notify assignees when task status is changed by another user', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const task = await createTestTask(org.id, admin.id, {
        title: 'Test Task',
        assigned_to: member.id,
        status: 'Pending'
      });
      const token = getAuthToken(admin);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'In Progress' });

      const notifications = await getNotificationsForUser(member.id);
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications.some(n => n.type === 'task_updated')).toBe(true);
    });

    it('should notify creator when task status is changed by assignee', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const task = await createTestTask(org.id, admin.id, {
        title: 'Test Task',
        assigned_to: member.id,
        status: 'Pending'
      });
      const memberToken = getAuthToken(member);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'Completed' });

      const notifications = await getNotificationsForUser(admin.id);
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications.some(n => n.type === 'task_updated')).toBe(true);
    });

    it('should notify previous assignee when task is reassigned', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id, role: 'member', first_name: 'Member', last_name: 'One' });
      const member2 = await createTestUser({ org_id: org.id, role: 'member', first_name: 'Member', last_name: 'Two' });
      const task = await createTestTask(org.id, admin.id, {
        title: 'Test Task',
        assigned_to: member1.id
      });
      const token = getAuthToken(admin);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigned_to: [member2.id] });

      const notifications = await getNotificationsForUser(member1.id);
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications.some(n => n.type === 'task_updated' && n.message.includes('unassigned'))).toBe(true);
    });

    it('should notify new assignee when task is assigned', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const task = await createTestTask(org.id, admin.id, { title: 'Test Task' });
      const token = getAuthToken(admin);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigned_to: [member.id] });

      const notifications = await getNotificationsForUser(member.id);
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications.some(n => n.type === 'task_assigned')).toBe(true);
    });

    it('should notify all assignees when task is created with multiple assignments', async () => {
      const { admin, org } = await createTestAdmin();
      const member1 = await createTestUser({ org_id: org.id, role: 'member' });
      const member2 = await createTestUser({ org_id: org.id, role: 'member' });
      const token = getAuthToken(admin);

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Task',
          assigned_to: [member1.id, member2.id]
        });

      const notifications1 = await getNotificationsForUser(member1.id);
      const notifications2 = await getNotificationsForUser(member2.id);

      expect(notifications1.some(n => n.type === 'task_created')).toBe(true);
      expect(notifications2.some(n => n.type === 'task_created')).toBe(true);
    });

    it('should not notify user when they make the change themselves', async () => {
      const { admin, org } = await createTestAdmin();
      const member = await createTestUser({ org_id: org.id, role: 'member' });
      const task = await createTestTask(org.id, member.id, {
        title: 'Test Task',
        assigned_to: member.id,
        status: 'Pending'
      });
      const memberToken = getAuthToken(member);

      await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: 'Completed' });

      // Member should not get notification for their own change
      const notifications = await getNotificationsForUser(member.id);
      const statusNotifications = notifications.filter(n =>
        n.type === 'task_updated' && n.message.includes('status changed')
      );
      expect(statusNotifications.length).toBe(0);
    });
  });
});
