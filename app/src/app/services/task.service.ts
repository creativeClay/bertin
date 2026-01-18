import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task, TaskStats, CreateTaskRequest, UpdateTaskRequest, TaskStatus, User } from '../models';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: Pagination;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  private tasksSignal = signal<Task[]>([]);
  private statsSignal = signal<TaskStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  private usersSignal = signal<User[]>([]);
  private loadingSignal = signal<boolean>(false);
  private paginationSignal = signal<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });

  readonly tasks = this.tasksSignal.asReadonly();
  readonly stats = this.statsSignal.asReadonly();
  readonly users = this.usersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadTasks(status?: TaskStatus, assignedTo?: number, page: number = 1, limit: number = 10): Observable<TasksResponse> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (assignedTo) params = params.set('assigned_to', assignedTo.toString());
    params = params.set('page', page.toString());
    params = params.set('limit', limit.toString());

    this.loadingSignal.set(true);
    return this.http.get<TasksResponse>(this.apiUrl, { params }).pipe(
      tap(response => {
        this.tasksSignal.set(response.tasks);
        this.paginationSignal.set(response.pagination);
        this.loadingSignal.set(false);
      })
    );
  }

  loadStats(): Observable<{ stats: TaskStats }> {
    return this.http.get<{ stats: TaskStats }>(`${this.apiUrl}/stats`).pipe(
      tap(response => this.statsSignal.set(response.stats))
    );
  }

  loadUsers(): Observable<{ users: User[] }> {
    return this.http.get<{ users: User[] }>(`${this.apiUrl}/users`).pipe(
      tap(response => this.usersSignal.set(response.users))
    );
  }

  getTask(id: number): Observable<{ task: Task }> {
    return this.http.get<{ task: Task }>(`${this.apiUrl}/${id}`);
  }

  createTask(data: CreateTaskRequest): Observable<{ task: Task }> {
    // Don't add locally - Socket.IO will broadcast to all users including creator
    return this.http.post<{ task: Task }>(this.apiUrl, data);
  }

  updateTask(id: number, data: UpdateTaskRequest): Observable<{ task: Task }> {
    // Don't update locally - Socket.IO will broadcast to all users
    return this.http.put<{ task: Task }>(`${this.apiUrl}/${id}`, data);
  }

  deleteTask(id: number): Observable<{ message: string }> {
    // Don't remove locally - Socket.IO will broadcast to all users
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  updateTaskInList(task: Task): void {
    this.tasksSignal.update(tasks => {
      const index = tasks.findIndex(t => t.id === task.id);
      if (index >= 0) {
        return tasks.map(t => t.id === task.id ? task : t);
      }
      return [task, ...tasks];
    });
  }

  removeTaskFromList(taskId: number): void {
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== taskId));
  }

  bulkCreateTasks(file: File): Observable<{
    message: string;
    results: { success: { title: string; id: number }[]; failed: { title: string; reason: string }[] }
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{
      message: string;
      results: { success: { title: string; id: number }[]; failed: { title: string; reason: string }[] }
    }>(`${this.apiUrl}/bulk`, formData);
  }
}
