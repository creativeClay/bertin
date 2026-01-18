import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { environment } from '../../environments/environment';
import { Task, TaskStats } from '../models';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  const mockTask: Task = {
    id: 1,
    title: 'Test Task',
    description: 'Test description',
    status: 'Pending',
    due_date: null,
    assigned_to: null,
    created_by: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockStats: TaskStats = {
    total: 10,
    pending: 3,
    inProgress: 4,
    completed: 3
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TaskService]
    });

    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadTasks', () => {
    it('should load all tasks', () => {
      service.loadTasks().subscribe(response => {
        expect(response.tasks).toEqual([mockTask]);
        expect(service.tasks()).toEqual([mockTask]);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks`);
      expect(req.request.method).toBe('GET');
      req.flush({ tasks: [mockTask] });
    });

    it('should filter tasks by status', () => {
      service.loadTasks('Pending').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks?status=Pending`);
      expect(req.request.method).toBe('GET');
      req.flush({ tasks: [mockTask] });
    });

    it('should filter tasks by assigned user', () => {
      service.loadTasks(undefined, 1).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks?assigned_to=1`);
      expect(req.request.method).toBe('GET');
      req.flush({ tasks: [mockTask] });
    });

    it('should set loading state', () => {
      expect(service.loading()).toBe(false);

      service.loadTasks().subscribe();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks`);
      req.flush({ tasks: [] });
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadStats', () => {
    it('should load task statistics', () => {
      service.loadStats().subscribe(response => {
        expect(response.stats).toEqual(mockStats);
        expect(service.stats()).toEqual(mockStats);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/stats`);
      expect(req.request.method).toBe('GET');
      req.flush({ stats: mockStats });
    });
  });

  describe('loadUsers', () => {
    it('should load users', () => {
      const mockUsers = [
        { id: 1, username: 'user1', email: 'user1@test.com', role: 'admin' as const }
      ];

      service.loadUsers().subscribe(response => {
        expect(response.users).toEqual(mockUsers);
        expect(service.users()).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/users`);
      expect(req.request.method).toBe('GET');
      req.flush({ users: mockUsers });
    });
  });

  describe('getTask', () => {
    it('should get task by id', () => {
      service.getTask(1).subscribe(response => {
        expect(response.task).toEqual(mockTask);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ task: mockTask });
    });
  });

  describe('createTask', () => {
    it('should create a new task and add to list', () => {
      const newTask = { title: 'New Task' };

      service.createTask(newTask).subscribe(response => {
        expect(response.task).toEqual(mockTask);
        expect(service.tasks()).toContainEqual(mockTask);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTask);
      req.flush({ task: mockTask });
    });
  });

  describe('updateTask', () => {
    it('should update task and update list', () => {
      // First add a task
      service.createTask({ title: 'Test' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/tasks`).flush({ task: mockTask });

      const updatedTask = { ...mockTask, title: 'Updated Task' };

      service.updateTask(1, { title: 'Updated Task' }).subscribe(response => {
        expect(response.task.title).toBe('Updated Task');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ task: updatedTask });
    });
  });

  describe('deleteTask', () => {
    it('should delete task and remove from list', () => {
      // First add a task
      service.createTask({ title: 'Test' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/tasks`).flush({ task: mockTask });
      expect(service.tasks()).toContainEqual(mockTask);

      service.deleteTask(1).subscribe(response => {
        expect(response.message).toBe('Task deleted');
        expect(service.tasks()).not.toContainEqual(mockTask);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/tasks/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Task deleted' });
    });
  });

  describe('updateTaskInList', () => {
    it('should update existing task in list', () => {
      // First add a task
      service.createTask({ title: 'Test' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/tasks`).flush({ task: mockTask });

      const updatedTask = { ...mockTask, title: 'Updated' };
      service.updateTaskInList(updatedTask);

      expect(service.tasks()[0].title).toBe('Updated');
    });

    it('should add new task if not in list', () => {
      const newTask: Task = { ...mockTask, id: 999 };
      service.updateTaskInList(newTask);

      expect(service.tasks()).toContainEqual(newTask);
    });
  });

  describe('removeTaskFromList', () => {
    it('should remove task from list by id', () => {
      // First add a task
      service.createTask({ title: 'Test' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/tasks`).flush({ task: mockTask });
      expect(service.tasks()).toHaveLength(1);

      service.removeTaskFromList(1);
      expect(service.tasks()).toHaveLength(0);
    });
  });
});
